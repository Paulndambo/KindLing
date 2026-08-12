import { useState, useCallback, useEffect, useRef } from "react";
import {
  synthesizeSpeech,
  splitIntoSpeechChunks,
  warmUpTts,
  TTS_CHUNK_MAX_LEN,
} from "../services/tts";
import { ai } from "../services/gemini";
import {
  unlockAudio,
  enqueueAudioBlob,
  stopAudioPlayback,
  whenAudioQueueIdle,
  setAudioPipelineOpen,
} from "../utils/audio";

/**
 * Gemini neural TTS only — progressive chunks for faster time-to-first-audio.
 * No browser SpeechSynthesis fallback (too robotic for this product).
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const generationRef = useRef(0);

  const cleanup = useCallback(() => {
    setAudioPipelineOpen(false);
    stopAudioPlayback();
  }, []);

  const stopSpeaking = useCallback(() => {
    generationRef.current += 1;
    cleanup();
    setIsSpeaking(false);
    setIsLoadingVoice(false);
  }, [cleanup]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      cleanup();
    };
  }, [cleanup]);

  /**
   * Call from a click handler to unlock audio + warm the Gemini TTS path.
   */
  const prepareAudio = useCallback(async () => {
    await unlockAudio();
    warmUpTts();
  }, []);

  /**
   * Synthesize one chunk, splitting smaller and retrying if the API returns
   * empty / truncated audio.
   */
  const synthesizeChunkResilient = useCallback(async (chunkText) => {
    let blob = await synthesizeSpeech(chunkText);
    if (blob) return blob;

    // Retry as smaller pieces so a long sentence isn't wholly dropped
    if (chunkText.length > 60) {
      const halves = splitIntoSpeechChunks(chunkText, Math.ceil(chunkText.length / 2));
      const parts = [];
      for (const half of halves) {
        const part = await synthesizeSpeech(half);
        if (part) parts.push(part);
      }
      // Prefer first successful piece chain: enqueue separately via caller
      // by returning null and letting caller use split — simpler: merge not possible.
      // Instead re-split and return multi via special path:
      if (parts.length === 1) return parts[0];
      if (parts.length > 1) return { __multi: parts };
    }
    return null;
  }, []);

  /**
   * Progressive Gemini TTS: first short chunk plays ASAP; later chunks
   * synthesize while earlier audio is still playing.
   */
  const speakNeural = useCallback(
    async (text, generation) => {
      if (!ai) return false;

      const chunks = splitIntoSpeechChunks(text, TTS_CHUNK_MAX_LEN);
      if (!chunks.length) return false;

      setAudioPipelineOpen(true);

      // Prefetch the first few chunks for lower latency
      const prefetch = Math.min(3, chunks.length);
      const promises = chunks.map((chunk, idx) =>
        idx < prefetch ? synthesizeChunkResilient(chunk) : null
      );

      let enqueuedAny = false;
      let started = false;
      let failedChunks = 0;

      const enqueueResult = async (result) => {
        if (!result) return false;
        if (result.__multi) {
          let any = false;
          for (const part of result.__multi) {
            if (generation !== generationRef.current) return false;
            await enqueueAudioBlob(part);
            any = true;
          }
          return any;
        }
        await enqueueAudioBlob(result);
        return true;
      };

      try {
        for (let i = 0; i < chunks.length; i += 1) {
          if (generation !== generationRef.current) {
            return enqueuedAny;
          }

          if (!promises[i]) {
            promises[i] = synthesizeChunkResilient(chunks[i]);
          }
          // Keep 2 chunks ahead synthesizing
          if (i + 1 < chunks.length && !promises[i + 1]) {
            promises[i + 1] = synthesizeChunkResilient(chunks[i + 1]);
          }
          if (i + 2 < chunks.length && !promises[i + 2]) {
            promises[i + 2] = synthesizeChunkResilient(chunks[i + 2]);
          }

          let result = null;
          try {
            result = await promises[i];
          } catch (err) {
            console.warn(`TTS chunk ${i} failed:`, err);
          }

          if (generation !== generationRef.current) {
            return enqueuedAny;
          }

          if (!result) {
            failedChunks += 1;
            // Last-ditch: try even smaller fragments of this chunk
            const tiny = splitIntoSpeechChunks(chunks[i], 70);
            let recovered = false;
            for (const piece of tiny) {
              if (generation !== generationRef.current) return enqueuedAny;
              try {
                const blob = await synthesizeSpeech(piece);
                if (blob) {
                  await enqueueAudioBlob(blob);
                  enqueuedAny = true;
                  recovered = true;
                  if (!started) {
                    started = true;
                    setIsLoadingVoice(false);
                    setIsSpeaking(true);
                  }
                }
              } catch (err) {
                console.warn("Tiny TTS piece failed:", err);
              }
            }
            if (!recovered) {
              console.warn(
                `Dropped TTS chunk ${i}/${chunks.length}:`,
                chunks[i].slice(0, 80)
              );
            }
            continue;
          }

          try {
            const ok = await enqueueResult(result);
            if (ok) {
              enqueuedAny = true;
              if (!started) {
                started = true;
                setIsLoadingVoice(false);
                setIsSpeaking(true);
              }
            }
          } catch (err) {
            failedChunks += 1;
            console.warn("Chunk playback failed:", err);
          }
        }
      } finally {
        // Allow idle detection once every chunk has been enqueued (or failed)
        setAudioPipelineOpen(false);
      }

      if (!enqueuedAny) return false;

      await whenAudioQueueIdle();
      if (generation === generationRef.current) {
        setIsSpeaking(false);
        setIsLoadingVoice(false);
        if (failedChunks > 0) {
          console.warn(
            `TTS finished with ${failedChunks} failed chunk(s) of ${chunks.length}`
          );
        }
      }
      return true;
    },
    [synthesizeChunkResilient]
  );

  const speak = useCallback(
    async (text) => {
      if (!text?.trim()) return;

      await unlockAudio();

      const generation = ++generationRef.current;
      cleanup();

      setIsSpeaking(true);
      setIsLoadingVoice(true);

      if (!ai) {
        console.warn("Gemini TTS unavailable — set VITE_GEMINI_API_KEY");
        setIsSpeaking(false);
        setIsLoadingVoice(false);
        return;
      }

      try {
        const ok = await speakNeural(text, generation);
        if (generation !== generationRef.current) return;
        if (!ok) {
          setIsSpeaking(false);
          setIsLoadingVoice(false);
        }
      } catch (err) {
        console.warn("Gemini TTS failed:", err);
        setAudioPipelineOpen(false);
        if (generation === generationRef.current) {
          setIsSpeaking(false);
          setIsLoadingVoice(false);
        }
      }
    },
    [cleanup, speakNeural]
  );

  return {
    isSpeaking,
    isLoadingVoice,
    speak,
    stopSpeaking,
    prepareAudio,
  };
}

/**
 * Speech-to-text via the Web Speech API.
 */
export function useSpeechRecognition(onResult) {
  const [isListening, setIsListening] = useState(false);

  const toggleListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      onResult?.(event.results[0][0].transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [isListening, onResult]);

  return { isListening, toggleListening };
}

/**
 * Convert raw PCM (16-bit LE mono) into a playable WAV Blob.
 * Gemini TTS returns 24 kHz PCM by default.
 */
export function pcmToWavBlob(pcmBytes, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  // Ensure even byte length for 16-bit samples (odd lengths truncate last sample)
  let pcmView =
    pcmBytes instanceof Uint8Array ? pcmBytes : new Uint8Array(pcmBytes);
  if (pcmView.byteLength % 2 === 1) {
    const padded = new Uint8Array(pcmView.byteLength + 1);
    padded.set(pcmView);
    pcmView = padded;
  }

  const dataSize = pcmView.byteLength;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  return new Blob([new Uint8Array(header), pcmView], { type: "audio/wav" });
}

/** Decode a base64 string into a Uint8Array. */
export function base64ToBytes(base64) {
  const clean = String(base64).replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Infer sample rate from mime type when present (e.g. audio/L16;rate=24000).
 */
export function sampleRateFromMime(mimeType, fallback = 24000) {
  if (!mimeType) return fallback;
  const match = /rate=(\d+)/i.exec(mimeType);
  return match ? Number(match[1]) : fallback;
}

/** Shared AudioContext — must be resumed during a user gesture for autoplay. */
let sharedAudioContext = null;
let activeSources = new Set();
let queueNextTime = 0;
let queueIdleResolvers = [];
/** True while TTS is still synthesizing/enqueuing more audio. */
let pipelineOpen = false;
/** Sequential HTMLAudioElement fallback chain. */
let elementQueue = Promise.resolve();
let elementAudio = null;

export function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new Ctx();
    queueNextTime = 0;
  }
  return sharedAudioContext;
}

/**
 * Call during a click/toggle so later TTS playback is allowed.
 */
export async function unlockAudio() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx.state === "running";
  } catch {
    return false;
  }
}

function isQueueIdle() {
  return activeSources.size === 0 && !pipelineOpen && !elementAudio;
}

function notifyQueueIdle() {
  if (!isQueueIdle()) return;
  const resolvers = queueIdleResolvers;
  queueIdleResolvers = [];
  resolvers.forEach((resolve) => resolve());
}

/**
 * Mark that more TTS audio may still be enqueued (prevents premature "idle"
 * between chunks while the next chunk is still synthesizing).
 */
export function setAudioPipelineOpen(open) {
  pipelineOpen = Boolean(open);
  if (!pipelineOpen) notifyQueueIdle();
}

export function stopAudioPlayback() {
  pipelineOpen = false;

  for (const source of activeSources) {
    try {
      source.onended = null;
      source.stop();
    } catch {
      /* already stopped */
    }
    try {
      source.disconnect();
    } catch {
      /* ignore */
    }
  }
  activeSources.clear();
  queueNextTime = 0;

  if (elementAudio) {
    try {
      elementAudio.onended = null;
      elementAudio.onerror = null;
      elementAudio.pause();
      elementAudio.src = "";
    } catch {
      /* ignore */
    }
    elementAudio = null;
  }
  elementQueue = Promise.resolve();

  notifyQueueIdle();
}

/**
 * Schedule a WAV blob to play after whatever is already queued (gapless-ish).
 * Returns immediately after scheduling — does not wait for playback to finish.
 */
export async function enqueueAudioBlob(blob) {
  const ctx = getAudioContext();
  if (!ctx) {
    // Element fallback: queue so chunks play back-to-back without cutting
    const run = async () => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      elementAudio = audio;
      try {
        await new Promise((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            if (elementAudio === audio) elementAudio = null;
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            if (elementAudio === audio) elementAudio = null;
            reject(new Error("HTMLAudioElement failed to play"));
          };
          audio.play().catch(reject);
        });
      } finally {
        if (elementAudio === audio) elementAudio = null;
        notifyQueueIdle();
      }
    };
    elementQueue = elementQueue.then(run, run);
    await elementQueue;
    return { method: "element" };
  }

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const arrayBuffer = await blob.arrayBuffer();
  // slice() copies so the buffer is detach-safe for decodeAudioData
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  if (!audioBuffer.duration || audioBuffer.length === 0) {
    throw new Error("Decoded audio buffer is empty");
  }

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  // Small crossfade gap prevention: schedule tightly after previous end
  const startAt = Math.max(ctx.currentTime + 0.015, queueNextTime);
  queueNextTime = startAt + audioBuffer.duration;

  activeSources.add(source);
  source.onended = () => {
    activeSources.delete(source);
    try {
      source.disconnect();
    } catch {
      /* ignore */
    }
    notifyQueueIdle();
  };

  source.start(startAt);
  return { method: "webaudio", source, endsAt: queueNextTime };
}

/**
 * Resolves when every scheduled source has finished AND the TTS pipeline
 * is no longer producing chunks.
 */
export function whenAudioQueueIdle() {
  if (isQueueIdle()) return Promise.resolve();
  return new Promise((resolve) => {
    queueIdleResolvers.push(resolve);
  });
}

/**
 * Play a single blob immediately (clears any queue first).
 */
export async function playAudioBlob(blob, { onEnded, onError } = {}) {
  stopAudioPlayback();

  try {
    setAudioPipelineOpen(true);
    await enqueueAudioBlob(blob);
    setAudioPipelineOpen(false);
    whenAudioQueueIdle().then(() => onEnded?.());
    return { method: "queue", stop: () => stopAudioPlayback() };
  } catch (err) {
    setAudioPipelineOpen(false);
    onError?.(err);
    throw err;
  }
}

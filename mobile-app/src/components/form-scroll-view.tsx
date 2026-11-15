import { useCallback, useEffect, useRef } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, type ScrollViewInstance, type ScrollViewProps } from 'react-native';

/** Keeps native inputs visible after focus changes and keyboard-driven resizing. */
export function FormScrollView({ onFocus, onBlur, onLayout, onKeyboardDidShow, ...props }: ScrollViewProps) {
  const scroll = useRef<ScrollViewInstance>(null);
  const focusedInput = useRef<ReturnType<typeof TextInput.State.currentlyFocusedInput>>(null);
  const frame = useRef<number | null>(null);

  const revealInput = useCallback(() => {
    if (Platform.OS === 'web') return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = focusedInput.current;
      // Mounted screens must not scroll in response to another screen's keyboard.
      if (input && input === TextInput.State.currentlyFocusedInput() && Keyboard.isVisible()) {
        scroll.current?.scrollResponderScrollNativeHandleToKeyboard(input, 20, true);
      }
    });
  }, []);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  return (
    <ScrollView
      ref={scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...props}
      onFocus={(event) => {
        focusedInput.current = TextInput.State.currentlyFocusedInput();
        revealInput();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focusedInput.current = null;
        onBlur?.(event);
      }}
      onLayout={(event) => { revealInput(); onLayout?.(event); }}
      onKeyboardDidShow={(event) => { revealInput(); onKeyboardDidShow?.(event); }}
    />
  );
}

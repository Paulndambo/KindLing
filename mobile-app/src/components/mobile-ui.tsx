import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type ScrollViewProps, type TextProps, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Radius } from '@/constants/brand';
import { FormScrollView } from '@/components/form-scroll-view';

export function AppScreen({ children, scroll = false, contentStyle, ...scrollProps }: PropsWithChildren<{ scroll?: boolean; contentStyle?: ViewStyle } & ScrollViewProps>) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.fill} enabled={Platform.OS !== 'web'} behavior="padding" keyboardVerticalOffset={insets.top}>
        {scroll ? (
          <FormScrollView style={styles.fill} contentContainerStyle={[styles.content, contentStyle]} {...scrollProps}>
            {children}
          </FormScrollView>
        ) : <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function BrandMark({ size = 42 }: { size?: number }) {
  return <Image accessibilityLabel="Kindling" source={require('@/assets/images/kindling-mark.png')} resizeMode="contain" style={{ width: size, height: size }} />;
}

export function Heading({ children, style, ...props }: TextProps) {
  return <Text accessibilityRole="header" style={[styles.heading, style]} {...props}>{children}</Text>;
}

export function BodyText({ children, style, ...props }: TextProps) {
  return <Text style={[styles.body, style]} {...props}>{children}</Text>;
}

export function Button({ children, variant = 'primary', busy = false, style, disabled, ...props }: PropsWithChildren<PressableProps & { variant?: 'primary' | 'secondary' | 'plain'; busy?: boolean }>) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} style={(state) => [styles.button, variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : styles.plain, state.pressed && styles.pressed, disabled && styles.disabled, typeof style === 'function' ? style(state) : style]} {...props}>
      {busy ? <ActivityIndicator color={variant === 'primary' ? '#fff' : Brand.pine} /> : typeof children === 'string' ? <Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryText, variant === 'plain' && styles.plainText]}>{children}</Text> : children}
    </Pressable>
  );
}

export function Field({ label, hint, error, style, onFocus, onBlur, ...props }: { label: string; hint?: string; error?: string } & import('react-native').TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#7C8781" selectionColor={Brand.teal} style={[styles.input, focused && styles.inputFocused, error && styles.inputError, style]} accessibilityLabel={label} autoCapitalize="none" onFocus={(event) => { setFocused(true); onFocus?.(event); }} onBlur={(event) => { setFocused(false); onBlur?.(event); }} {...props} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <View style={styles.sectionTitle}><Text accessibilityRole="header" style={styles.sectionText}>{children}</Text>{action}</View>;
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.parchment },
  card: { backgroundColor: Brand.card, borderRadius: Radius.card, padding: 20, borderWidth: 1, borderColor: Brand.line },
  muted: { color: Brand.muted },
  row: { flexDirection: 'row', alignItems: 'center' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.parchment },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 24 },
  fill: { flex: 1 },
  heading: { color: Brand.ink, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -1 },
  body: { color: Brand.muted, fontSize: 15, lineHeight: 23 },
  button: { minHeight: 54, paddingHorizontal: 20, borderRadius: Radius.control, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: Brand.pine },
  secondary: { backgroundColor: Brand.card, borderWidth: 1, borderColor: Brand.line },
  plain: { minHeight: 44, paddingHorizontal: 8 },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  secondaryText: { color: Brand.pine },
  plainText: { color: Brand.teal },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  field: { gap: 7 },
  label: { color: Brand.ink, fontSize: 13, fontWeight: '600' },
  input: { minHeight: 54, paddingHorizontal: 16, backgroundColor: Brand.card, borderColor: Brand.line, borderWidth: 1, borderRadius: Radius.control, color: Brand.ink, fontSize: 16 },
  inputError: { borderColor: Brand.error },
  inputFocused: { borderColor: Brand.teal },
  error: { color: Brand.error, fontSize: 14, lineHeight: 20 },
  hint: { color: Brand.muted, fontSize: 13, lineHeight: 18 },
  sectionTitle: { flexDirection: 'row', flexShrink: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionText: { color: Brand.ink, fontSize: 18, fontWeight: '600', letterSpacing: -0.3, flexShrink: 1 },
});

import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps, type ScrollViewProps, type TextProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

export function AppScreen({ children, scroll = false, contentStyle, ...scrollProps }: PropsWithChildren<{ scroll?: boolean; contentStyle?: ViewStyle } & ScrollViewProps>) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, contentStyle]} {...scrollProps}>
          {children}
        </ScrollView>
      ) : <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>}
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
    <Pressable accessibilityRole="button" disabled={disabled || busy} style={(state) => [styles.button, variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : styles.plain, (state.pressed || busy) && styles.pressed, typeof style === 'function' ? style(state) : style]} {...props}>
      {busy ? <ActivityIndicator color={variant === 'primary' ? '#fff' : Brand.pine} /> : typeof children === 'string' ? <Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryText, variant === 'plain' && styles.plainText]}>{children}</Text> : children}
    </Pressable>
  );
}

export function Field({ label, hint, error, ...props }: { label: string; hint?: string; error?: string } & import('react-native').TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#87918B" style={[styles.input, error && styles.inputError]} accessibilityLabel={label} autoCapitalize="none" {...props} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <View style={styles.sectionTitle}><Text accessibilityRole="header" style={styles.sectionText}>{children}</Text>{action}</View>;
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.parchment },
  card: { backgroundColor: Brand.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: Brand.line },
  muted: { color: Brand.muted },
  row: { flexDirection: 'row', alignItems: 'center' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.parchment },
  content: { padding: 20, paddingBottom: 36, gap: 18 },
  fill: { flex: 1 },
  heading: { color: Brand.pine, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
  body: { color: Brand.muted, fontSize: 16, lineHeight: 24 },
  button: { minHeight: 52, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: Brand.pine },
  secondary: { backgroundColor: Brand.card, borderWidth: 1, borderColor: Brand.line },
  plain: { minHeight: 44, paddingHorizontal: 8 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryText: { color: Brand.pine },
  plainText: { color: Brand.teal },
  pressed: { opacity: 0.75 },
  field: { gap: 7 },
  label: { color: Brand.ink, fontSize: 14, fontWeight: '700' },
  input: { minHeight: 52, paddingHorizontal: 14, backgroundColor: Brand.card, borderColor: Brand.line, borderWidth: 1, borderRadius: 14, color: Brand.ink, fontSize: 16 },
  inputError: { borderColor: Brand.error },
  error: { color: Brand.error, fontSize: 14, lineHeight: 20 },
  hint: { color: Brand.muted, fontSize: 13, lineHeight: 18 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionText: { color: Brand.pine, fontSize: 19, fontWeight: '700' },
});

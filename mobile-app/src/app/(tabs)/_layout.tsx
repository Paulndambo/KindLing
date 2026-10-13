import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

export default function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: Brand.pine,
      tabBarInactiveTintColor: Brand.muted,
      tabBarStyle: { height: 62 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: '#fff', borderTopColor: '#E4E7E2', elevation: 12 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 1 },
      tabBarItemStyle: { paddingTop: 1 },
      tabBarHideOnKeyboard: true,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="⌂" /> }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="▤" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="○" /> }} />
    </Tabs>
  );
}

function TabGlyph({ color, glyph }: { color: ColorValue; glyph: string }) {
  return <Text style={{ color, fontSize: 20, lineHeight: 23 }}>{glyph}</Text>;
}

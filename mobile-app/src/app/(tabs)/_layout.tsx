import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavigationIcon } from '@/components/navigation-icon';

import { Brand } from '@/constants/brand';

export default function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.pine,
        tabBarInactiveTintColor: Brand.muted,
        tabBarStyle: {
          height: 66 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: '#FFFFFF',
          borderTopColor: Brand.line,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIconWrap focused={focused}>
              <NavigationIcon name="home" color={color} />
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, focused }) => (
            <TabIconWrap focused={focused}>
              <NavigationIcon name="learn" color={color} />
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: 'Assessments',
          tabBarIcon: ({ color, focused }) => (
            <TabIconWrap focused={focused}>
              <NavigationIcon name="assessments" color={color} />
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIconWrap focused={focused}>
              <NavigationIcon name="profile" color={color} />
            </TabIconWrap>
          ),
        }}
      />
    </Tabs>
  );
}

function TabIconWrap({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    minWidth: 52,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: Brand.tealPale,
  },
});

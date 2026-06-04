import { Redirect, Tabs } from 'expo-router';
import { Image, Platform, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { ms, s } from '@/lib/responsive';
import { useAuthStore } from '@/store/auth';
import { colors } from '@/theme';

const tabIcons = {
  home: require('@/assets/images/brand/home.png'),
  register: require('@/assets/images/brand/register.png'),
  calendar: require('@/assets/images/brand/calender.png'),
  billing: require('@/assets/images/brand/billing.png'),
  reports: require('@/assets/images/brand/reports.png'),
} as const;

type IconKey = keyof typeof tabIcons;

function TabIcon({ name, color }: { name: IconKey; color: string }) {
  return (
    <Image
      source={tabIcons[name]}
      style={[styles.icon, { tintColor: color }]}
      resizeMode="contain"
    />
  );
}

function TabLabel({ focused, color, label }: { focused: boolean; color: string; label: string }) {
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.label,
        { color, fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_400Regular' },
      ]}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  // Non-owner Doctors only see Home + Calendar (their own appointments).
  // Owner Doctors, Assistants, Admins, and SystemAdmins see the full clinic-wide tabs.
  const isRestrictedDoctor = user?.role === 'DOCTOR' && !user.is_owner;
  const showClinicWideTabs = !isRestrictedDoctor;

  // Content height of the tab bar (above the system gesture bar / home indicator).
  const tabContentHeight = Platform.OS === 'ios' ? 56 : 56;
  const tabBarHeight = tabContentHeight + insets.bottom;
  const tabBarPaddingBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.neutral[300],
        tabBarButton: HapticTab,
        tabBarStyle: [
          styles.tabBar,
          { height: tabBarHeight, paddingBottom: tabBarPaddingBottom },
        ],
        tabBarItemStyle: styles.tabBarItem,
      }}>
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          tabBarLabel: ({ focused, color }) => (
            <TabLabel focused={focused} color={color} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="register"
        options={{
          title: 'Register',
          href: showClinicWideTabs ? '/register' : null,
          tabBarIcon: ({ color }) => <TabIcon name="register" color={color} />,
          tabBarLabel: ({ focused, color }) => (
            <TabLabel focused={focused} color={color} label="Register" />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
          tabBarLabel: ({ focused, color }) => (
            <TabLabel focused={focused} color={color} label="Calendar" />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Billing',
          href: showClinicWideTabs ? '/billing' : null,
          tabBarIcon: ({ color }) => <TabIcon name="billing" color={color} />,
          tabBarLabel: ({ focused, color }) => (
            <TabLabel focused={focused} color={color} label="Billing" />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          href: showClinicWideTabs ? '/reports' : null,
          tabBarIcon: ({ color }) => <TabIcon name="reports" color={color} />,
          tabBarLabel: ({ focused, color }) => (
            <TabLabel focused={focused} color={color} label="Reports" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background.base,
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabBarItem: {
    gap: 2,
  },
  icon: {
    width: s(24),
    height: s(24),
  },
  label: {
    fontSize: ms(11),
    marginTop: 2,
  },
});

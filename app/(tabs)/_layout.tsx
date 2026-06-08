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

  // Non-owner Doctors get the full clinic-day tabs EXCEPT Reports
  // (Home, Register, Calendar, Billing — but no Reports).
  // Owner Doctors, Assistants, Admins, and SystemAdmins see all five tabs.
  const isRestrictedDoctor = user?.role === 'DOCTOR' && !user.is_owner;
  const canSeeReports = !isRestrictedDoctor;

  // Content height of the tab bar (above the system gesture bar / home indicator).
  // SYSTEM_BAR_CLEARANCE adds a visible gap above the phone's nav/gesture bar
  // so labels never sit flush against the system UI on any device.
  const SYSTEM_BAR_CLEARANCE = 14;
  const tabContentHeight = Platform.OS === 'ios' ? 56 : 56;
  const tabBarPaddingBottom = insets.bottom + SYSTEM_BAR_CLEARANCE;
  const tabBarHeight = tabContentHeight + tabBarPaddingBottom;

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
          href: canSeeReports ? '/reports' : null,
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

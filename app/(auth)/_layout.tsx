import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="check-email" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="reset-success" />
    </Stack>
  );
}

import { Stack } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../../stores/authStore';
import { theme } from '../../../constants/theme';

export default function MiscLayout() {
  const { signOut } = useAuthStore();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontWeight: '700',
          color: theme.colors.textPrimary,
          fontSize: theme.fontSize.lg,
        },
        headerRight: () => (
          <TouchableOpacity onPress={signOut} style={{ marginRight: 16 }}>
            <Text style={{ color: theme.colors.danger, fontSize: 14 }}>Sign out</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Tools' }} />
      <Stack.Screen name="vendors" options={{ title: 'Vendors' }} />
      <Stack.Screen name="users" options={{ title: 'Users' }} />
      <Stack.Screen name="company" options={{ title: 'Company Settings' }} />
    </Stack>
  );
}

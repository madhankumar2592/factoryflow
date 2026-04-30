import { Tabs } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { theme } from '../../constants/theme';

export default function SupervisorLayout() {
  const { signOut } = useAuthStore();

  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <TouchableOpacity onPress={signOut} style={{ marginRight: 16 }}>
            <Text style={{ color: theme.colors.danger, fontSize: 14 }}>Sign out</Text>
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="inbound-dc"
        options={{
          title: 'Inbound DC',
          tabBarLabel: 'Inbound',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📥</Text>,
        }}
      />
      <Tabs.Screen
        name="production-log"
        options={{
          title: 'Production Log',
          tabBarLabel: 'Production',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚙️</Text>,
        }}
      />
      <Tabs.Screen
        name="outbound-dc"
        options={{
          title: 'Outbound DC',
          tabBarLabel: 'Outbound',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📤</Text>,
        }}
      />
    </Tabs>
  );
}

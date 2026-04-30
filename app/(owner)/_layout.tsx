import { Tabs } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { theme } from '../../constants/theme';

export default function OwnerLayout() {
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
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="inbound-dcs"
        options={{
          title: 'Inbound DCs',
          tabBarLabel: 'Inbound',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📥</Text>,
        }}
      />
      <Tabs.Screen
        name="production-logs"
        options={{
          title: 'Production Logs',
          tabBarLabel: 'Production',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚙️</Text>,
        }}
      />
      <Tabs.Screen
        name="outbound-dcs"
        options={{
          title: 'Outbound DCs',
          tabBarLabel: 'Outbound',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📤</Text>,
        }}
      />
      <Tabs.Screen
        name="misc"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚙️</Text>,
          headerShown: false,
        }}
      />

      {/* Hide old top-level suppliers screen (moved into misc/) */}
      <Tabs.Screen name="suppliers" options={{ href: null }} />

      {/* Hide misc sub-screens from tab bar — managed by the nested Stack */}
      <Tabs.Screen name="misc/index" options={{ href: null }} />
      <Tabs.Screen name="misc/suppliers" options={{ href: null }} />
      <Tabs.Screen name="misc/users" options={{ href: null }} />
    </Tabs>
  );
}

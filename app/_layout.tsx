import { useEffect } from 'react';
import { Stack, useRouter, useSegments, useNavigationContainerRef } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const { user, profile, setUser, loadProfile } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && profile && inAuth) {
      if (profile.role === 'owner') {
        router.replace('/(owner)');
      } else {
        router.replace('/(supervisor)');
      }
    }
  }, [user, profile, segments, navigationRef.isReady()]);

  return <SafeAreaProvider><Stack screenOptions={{ headerShown: false }} /></SafeAreaProvider>;
}

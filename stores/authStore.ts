import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
  setUser: (user: any) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,

  setUser: (user) => set({ user }),

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ user: data.user });
      await get().loadProfile();
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  loadProfile: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .single();
    if (error) throw error;
    set({ profile: data });
  },
}));

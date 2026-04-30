import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export interface SignUpCompany {
  name: string;
  gstin?: string;
  address?: string;
  phone?: string;
}

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (company: SignUpCompany, fullName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
  setUser: (user: any) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,

  setUser: (user) => set({ user }),

  signUp: async (company, fullName, email, password) => {
    set({ loading: true });
    try {
      // 1. Create the company row (anon INSERT policy allows this)
      const { data: co, error: coErr } = await supabase
        .from('companies')
        .insert({
          name:    company.name.trim(),
          gstin:   company.gstin?.trim()   || null,
          address: company.address?.trim() || null,
          phone:   company.phone?.trim()   || null,
        })
        .select('id')
        .single();
      if (coErr) throw coErr;

      // 2. Create the owner auth account — trigger auto-creates the profile
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_id: co.id,
            role:       'owner',
            full_name:  fullName.trim(),
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        set({ user: data.user });
        await get().loadProfile();
      }
    } finally {
      set({ loading: false });
    }
  },

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    const { data, error } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    set({ profile: data });
  },
}));

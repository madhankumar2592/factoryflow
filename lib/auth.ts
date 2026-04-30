import { supabase } from './supabase';

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, companies(*)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

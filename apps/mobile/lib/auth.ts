import { supabase } from "./supabase";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
}

export async function signIn({ email, password }: AuthCredentials): Promise<AuthError | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { message: error.message } : null;
}

export async function signUp({
  email,
  password,
}: AuthCredentials): Promise<AuthError | null> {
  const { error } = await supabase.auth.signUp({ email, password });
  return error ? { message: error.message } : null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function resetPassword(email: string): Promise<AuthError | null> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return error ? { message: error.message } : null;
}

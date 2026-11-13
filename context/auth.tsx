import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database, UserRole } from '../lib/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  saveRole: (role: UserRole) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

export type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from DB
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile:', error.message);
      }
      setProfile(data ?? null);
    } catch (e) {
      console.warn('Unexpected error fetching profile:', e);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Get initial session from AsyncStorage via Supabase
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!isMounted) return;
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        if (!isMounted) return;
        setSession(s);
        if (s?.user) {
          fetchProfile(s.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      setSession(data.session);
      await fetchProfile(data.user.id);
    }
    return { error };
  };

  const signUp = async ({ email, password, fullName }: SignUpParams) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (!error && data.user) {
      setSession(data.session);
      await fetchProfile(data.user.id);
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const saveRole = async (role: UserRole): Promise<{ error: Error | null }> => {
    const userId = session?.user?.id;
    if (!userId) return { error: new Error('No authenticated user') };

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (!error) {
      await fetchProfile(userId);
    }
    return { error: error ? new Error(error.message) : null };
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        saveRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

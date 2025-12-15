import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  checkActiveSession,
  setActiveSession,
  removeActiveSession
} from '@/utils/supabaseUtils';
import { UserProfile } from '@/types/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  incrementCreditsUsed: () => Promise<boolean>;
  canGenerateMetadata: boolean;
  forceSignOut: (email: string) => Promise<void>;
  getRandomApiKey: () => string;
  apiKey: string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [canGenerateMetadata, setCanGenerateMetadata] = useState<boolean>(false);

  // ✅ API key now comes from environment variable
  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GEMINI_API_KEY || ''
  );

  const navigate = useNavigate();

  // ✅ Safe API key getter (Netlify-friendly)
  const getRandomApiKey = (): string => {
    return import.meta.env.VITE_GEMINI_API_KEY;
  };

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        setTimeout(() => {
          fetchUserProfile(currentSession.user.id);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (profile) {
      setCanGenerateMetadata(true);
    } else {
      setCanGenerateMetadata(false);
    }
  }, [profile]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setProfile(data as UserProfile);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const forceSignOut = async (email: string) => {
    try {
      const { error } = await supabase.functions.invoke(
        'remove_active_session_by_email',
        {
          body: { user_email: email }
        }
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error in forceSignOut:', error);
      throw error;
    }
  };

  const checkUserActiveSession = async (email: string): Promise<boolean> => {
    return await checkActiveSession(email);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const isActiveSession = await checkUserActiveSession(email);
      if (isActiveSession) {
        const confirmForceLogout = window.confirm(
          'This account is already logged in elsewhere. Force logout and continue?'
        );

        if (!confirmForceLogout) {
          toast.error('Login cancelled');
          return;
        }

        await forceSignOut(email);
        toast.success('Previous session terminated');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data?.user) {
        const sessionId =
          data.session?.access_token.slice(-10) || Date.now().toString();
        await setActiveSession(data.user.id, email, sessionId);
      }

      toast.success('Signed in successfully');
      navigate('/');
    } catch (error) {
      console.error('Error signing in:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign in');
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      toast.success('Signed up successfully! Check your email.');
    } catch (error) {
      console.error('Error signing up:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign up');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        await removeActiveSession(user.id);
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign out');
    }
  };

  const incrementCreditsUsed = async (): Promise<boolean> => {
    if (!user || !profile) return false;
    return true;
  };

  useEffect(() => {
    const updateSessionActivity = async () => {
      if (user && session) {
        const sessionId =
          session.access_token.slice(-10) || Date.now().toString();
        await setActiveSession(user.id, user.email || '', sessionId);
      }
    };

    const intervalId = setInterval(updateSessionActivity, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [user, session]);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (user) {
        await removeActiveSession(user.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () =>
      window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  const value = {
    session,
    user,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    incrementCreditsUsed,
    canGenerateMetadata,
    forceSignOut,
    getRandomApiKey,
    apiKey
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

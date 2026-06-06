import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const onboarded = await AsyncStorage.getItem('tally_onboarded');
        setHasOnboarded(!!onboarded);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const onboarded = await AsyncStorage.getItem('tally_onboarded');
        setHasOnboarded(!!onboarded);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('tally_onboarded', '1');
    setHasOnboarded(true);
  };

  return { user, loading, hasOnboarded, signOut, completeOnboarding };
}

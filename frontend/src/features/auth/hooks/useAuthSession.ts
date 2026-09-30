import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { normalizeUnknownError } from '../../../shared/api/errors';
import type { AuthPortal, CurrentUser } from '../../../shared/types/auth';
import { portalAcceptsRole } from '../../../shared/types/auth';
import { fetchCurrentUser } from '../api/currentUser';
import { supabase } from '../api/supabase';

export function useAuthSession(selectedPortal: AuthPortal | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const acceptSession = useCallback(async (nextSession: Session | null) => {
    if (!nextSession) {
      setSession(null);
      setCurrentUser(null);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    try {
      const verifiedUser = await fetchCurrentUser(nextSession.access_token);
      if (selectedPortal && !portalAcceptsRole(selectedPortal, verifiedUser.role)) {
        await supabase?.auth.signOut();
        setSession(null);
        setCurrentUser(null);
        setAuthError(
          selectedPortal === 'patient'
            ? '환자 계정이 아닙니다. 관리자 유형을 선택해 로그인해 주세요.'
            : '승인된 관리자 또는 의료진 계정이 아닙니다. 환자 유형을 선택해 로그인해 주세요.',
        );
        return;
      }
      setSession(nextSession);
      setCurrentUser(verifiedUser);
      setAuthError('');
    } catch (error) {
      await supabase?.auth.signOut();
      setSession(null);
      setCurrentUser(null);
      setAuthError(normalizeUnknownError(error).message);
    } finally {
      setAuthLoading(false);
    }
  }, [selectedPortal]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => acceptSession(data.session))
      .catch(() => {
        setSession(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void acceptSession(nextSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [acceptSession]);


  const signOut = async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setCurrentUser(null);
    setAuthError('');
  };

  return { session, currentUser, authLoading, authError, signOut, clearAuthError: () => setAuthError('') };
}

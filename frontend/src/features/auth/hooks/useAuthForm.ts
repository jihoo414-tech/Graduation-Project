import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../api/supabase';
import { authErrorMessage } from '../api/authErrors';
import { useBrowserHistoryState } from '../../../shared/hooks/useBrowserHistoryState';

type Mode = 'login' | 'signup';

export function useAuthForm(initialMessage = '') {
  const { value: mode, navigate: setMode } = useBrowserHistoryState<Mode>('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setMessage('');

    try {
      const response = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName.trim() } },
          });

      if (response.error) {
        setMessage(authErrorMessage(response.error, mode));
        return;
      }

      if (mode === 'signup' && !response.data.session) {
        setMessage('가입 확인 메일을 보냈습니다. 메일 인증 후 로그인해 주세요.');
        return;
      }

      setMessage('');
    } catch (error) {
      setMessage(authErrorMessage(error, mode));
    } finally {
      setSubmitting(false);
    }
  };


  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setMessage('');
  };

  return {
    mode,
    email,
    setEmail,
    fullName,
    setFullName,
    password,
    setPassword,
    message,
    submitting,
    submit,
    switchMode,
  };
}

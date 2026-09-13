import { useState, type FormEvent } from 'react';
import { supabase } from '../api/supabase';
import { authErrorMessage } from '../api/authErrors';

type Mode = 'login' | 'signup';

export function useAuthForm() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setMessage('');

    try {
      const response =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

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

  return { mode, email, setEmail, password, setPassword, message, submitting, submit, switchMode };
}

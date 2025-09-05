'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import AuthForm from '../../components/AuthForm';

const SignupPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  if (user) {
    return null; // Will redirect
  }

  return <AuthForm mode={mode} onToggleMode={toggleMode} />;
};

export default SignupPage;

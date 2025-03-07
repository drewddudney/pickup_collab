'use client';

import { redirect } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    redirect('/home');
  } else {
    redirect('/login');
  }
}


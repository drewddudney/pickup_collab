'use client';

import { ReactNode } from 'react';
import { AnimatedBalls } from '@/components/auth/AnimatedBalls';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* AnimatedBalls is rendered once here and persists across auth page navigation */}
      <AnimatedBalls />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
} 
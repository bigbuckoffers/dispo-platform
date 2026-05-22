'use client';
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setupApiAuth } from '@/lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  useEffect(() => {
    setupApiAuth(getToken);
  }, [getToken]);
  return <>{children}</>;
}

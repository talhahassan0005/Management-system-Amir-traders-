"use client";

import React from 'react';
import { SessionProvider } from 'next-auth/react';

interface Props {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: Props) {
  // Minimal wrapper to provide NextAuth session context to client components
  return <SessionProvider>{children}</SessionProvider>;
}

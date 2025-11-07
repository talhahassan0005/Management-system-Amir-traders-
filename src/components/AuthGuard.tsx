"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode; // optional skeleton or spinner
}

/**
 * Client-side auth guard. Adds a second layer of protection (in addition to middleware)
 * so that every page explicitly checks authentication. If unauthenticated, redirects
 * to /login with callbackUrl preserving the original path.
 */
// NOTE: Public path logic moved to RootAuthWrapper. This guard now assumes
// it is only rendered on protected routes. Keep fallback logic minimal.

export default function AuthGuard({ children, fallback = null }: AuthGuardProps) {
  const { status } = useSession();
  const router = useRouter();
  const [initiated, setInitiated] = useState(false);

  useEffect(() => {
    // Mark component as mounted to avoid redirect flashes
    setInitiated(true);
  }, []);

  useEffect(() => {
    if (!initiated) return;
    const pathname = window.location.pathname;
    if (status === "unauthenticated") {
      const callbackUrl = encodeURIComponent(pathname + window.location.search);
      router.replace(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [status, initiated, router]);

  // Render children immediately while session is loading so the page UI
  // isn't replaced by a blocking full-screen loader. We still perform
  // the redirect to /login when the session is unauthenticated.
  // Only show the fallback while actively redirecting an unauthenticated user.
  if (status === 'unauthenticated' && initiated) {
    // If unauthenticated after initial mount, show fallback while redirecting.
    return <>{fallback}</>;
  }

  // For status === 'loading' or 'authenticated', render children immediately.
  return <>{children}</>;
}

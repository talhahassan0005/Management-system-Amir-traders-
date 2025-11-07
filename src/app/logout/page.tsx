"use client";
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function LogoutPage() {
  useEffect(() => {
    // Trigger sign out immediately and go back to login on the current origin
    // Use an absolute URL that preserves the current origin (including port)
    // to avoid redirects to a different host/port (e.g. NEXTAUTH_URL mismatch).
    signOut({ callbackUrl: `${window.location.origin}/login` });
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm text-center border border-gray-200">
        <p className="text-gray-700">Signing you out…</p>
        <p className="text-xs text-gray-500 mt-2">If nothing happens, <a href="/login" className="text-blue-600 underline">click here</a>.</p>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import LoadingSpinner from "@/components/LoadingSpinner";
import React from "react";

function isPublicPath(pathname: string) {
  const publicPrefixes = [
    "/login",
    "/api/auth",
    "/robots.txt",
    "/sitemap.xml",
    "/_next",
    "/public",
    "/images",
    "/favicon.ico",
  ];
  return publicPrefixes.some((p) => pathname === p || pathname.startsWith(p));
}

export default function RootAuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  if (isPublicPath(pathname)) {
    // Don't apply AuthGuard on public routes (e.g., /login)
    return <>{children}</>;
  }

  return (
    <AuthGuard fallback={<LoadingSpinner className="py-16" text="Checking session..." />}> 
      {children}
    </AuthGuard>
  );
}

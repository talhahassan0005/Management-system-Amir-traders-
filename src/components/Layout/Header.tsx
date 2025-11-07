"use client";

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Menu, Bell, User, PlusCircle, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleAvatarClick = () => {
    if (status === 'authenticated') {
      setOpen((v) => !v);
    } else {
      // redirect to login, preserve current path
      const path = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(path)}`);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 print:hidden">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={onMenuClick}
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Quick create: Store */}
          <Link
            href="/store"
            className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            title="Create or manage stores"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>New Store</span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications removed per request */}

          {/* User menu */}
          <div className="flex items-center space-x-3" ref={menuRef}>
            <div className="hidden md:block text-right">
              {status === 'loading' ? (
                <>
                  <p className="text-sm font-medium text-gray-900">Loading…</p>
                  <p className="text-xs text-gray-500">Checking session</p>
                </>
              ) : status === 'authenticated' ? (
                <>
                  <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'User'}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-900">Guest</p>
                  <p className="text-xs text-gray-500">Not signed in</p>
                </>
              )}
            </div>

            <button
              onClick={handleAvatarClick}
              aria-haspopup="true"
              aria-expanded={open}
              className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {status === 'authenticated' && session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image as string} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-blue-600" />
              )}
              <ChevronDown className="w-3 h-3 text-gray-600 ml-1" />
            </button>

            {/* Dropdown */}
            {open && status === 'authenticated' && (
              <div className="absolute right-4 mt-12 w-44 bg-white border rounded shadow-lg py-2 z-50" role="menu">
                <button
                  onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  role="menuitem"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

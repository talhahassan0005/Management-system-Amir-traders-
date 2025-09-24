'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Bell, User, PlusCircle } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery] = useState('');

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
          
          {/* Search removed as requested */}

          {/* Quick create: Store */}
          <Link
            href="/store"
            className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            title="Create or manage stores"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>New Store</span>
          </Link>
          <Link
            href="/store-stock"
            className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            title="View store-wise stock"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Store Stock</span>
          </Link>
          <Link
            href="/storein"
            className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            title="Add stock to a store"
          >
            <PlusCircle className="w-4 h-4 text-green-600" />
            <span>Store In</span>
          </Link>
          <Link
            href="/storeout"
            className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            title="Reduce stock from a store"
          >
            <PlusCircle className="w-4 h-4 text-red-600" />
            <span>Store Out</span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

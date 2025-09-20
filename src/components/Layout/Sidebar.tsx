'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  Database,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Product', href: '/product', icon: Package },
  { name: 'Stock Lookup', href: '/stock-lookup', icon: BarChart3 },
  { name: 'Sale', href: '/sale', icon: ShoppingCart },
  { name: 'Purchase', href: '/purchase', icon: Package },
  { name: 'Payment', href: '/payment', icon: DollarSign },
  { name: 'Receipt', href: '/receipt', icon: FileText },
  { name: 'Customer', href: '/customer', icon: Users },
  { name: 'Supplier', href: '/supplier', icon: Users },
  { name: 'Receipt Cheque', href: '/receipt-cheque', icon: FileText },
  { name: 'Paid Cheque', href: '/paid-cheque', icon: CheckCircle },
  { name: 'Production', href: '/production', icon: Settings },
  { name: 'Due Cheque', href: '/due-cheque', icon: AlertCircle },
  { name: 'Ledger Report', href: '/ledger-report', icon: BarChart3 },
  { name: 'Stock Report', href: '/stock-report', icon: BarChart3 },
  { name: 'Cheque Report', href: '/cheque-report', icon: BarChart3 },
  { name: 'DB Status', href: '/db-status', icon: Database },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col print:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
          <h1 className="text-xl font-bold text-white">Management System</h1>
          <button
            className="lg:hidden text-white hover:text-gray-200"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 space-y-2">
            {navigation.map((item) => {
              const cleanHref = item.href.split('#')[0];
              const isActive = pathname === cleanHref;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}

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
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Product', href: '/product', icon: Package },
  { name: 'Stock Lookup', href: '/stock-lookup', icon: BarChart3 },
  { name: 'Sale', href: '/sale', icon: ShoppingCart },
  { name: 'Sale Return', href: '/sale-return', icon: RotateCcw },
  { name: 'Purchase', href: '/purchase', icon: Package },
  { name: 'Purchase Return', href: '/purchase-return', icon: RotateCcw },
  { name: 'Store IN', href: '/storein', icon: ArrowDownToLine },
  { name: 'Store OUT', href: '/storeout', icon: ArrowUpFromLine },
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
  { name: 'Reports', href: '/reports', icon: BarChart3 },
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
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 bg-gradient-to-r from-blue-500 to-blue-600 flex-shrink-0 shadow-lg">
          <div className="flex items-center space-x-2 sm:space-x-3 sidebar-header">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full p-1 shadow-md flex-shrink-0">
              <img 
                src="/Logo.png" 
                alt="Amir Traders Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 
              className="text-white font-bold tracking-wide uppercase"
              style={{ 
                fontSize: 'clamp(1rem, 4vw, 1.25rem)',
                margin: 0,
                padding: 0
              }}
            >
              Amir Traders
            </h1>
          </div>
          <button
            className="lg:hidden text-white hover:text-gray-200 transition-colors duration-200"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 bg-gray-50">
          <div className="px-3 space-y-1">
            {navigation.map((item) => {
              const cleanHref = item.href.split('#')[0];
              const isActive = pathname === cleanHref;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-md'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className={`w-5 h-5 mr-3 transition-all duration-200 ${
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                  }`} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}

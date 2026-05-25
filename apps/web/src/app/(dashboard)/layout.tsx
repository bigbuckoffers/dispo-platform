'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Home, Zap, BarChart3, ShoppingBag, Bell, Settings, ChevronLeft, ChevronRight, MessageSquare, TrendingUp } from 'lucide-react';
import { AuthProvider } from '@/components/AuthProvider';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/deals', icon: Home, label: 'Deals' },
  { href: '/dashboard/buyers', icon: Users, label: 'Buyers' },
  { href: '/dashboard/matching', icon: Zap, label: 'AI Matching' },
  { href: '/dashboard/dispo', icon: MessageSquare, label: 'Dispo' },
  { href: '/dashboard/marketplace', icon: ShoppingBag, label: 'Marketplace' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const currentPage = NAV_ITEMS.find(n => n.href !== '/dashboard' && pathname.startsWith(n.href))?.label
    ?? (pathname === '/dashboard' ? 'Dashboard' : '');

  return (
    <AuthProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden" style={{fontFamily:"'DM Sans', 'Inter', sans-serif"}}>
        {/* Sidebar */}
        <motion.aside animate={{ width: collapsed ? 64 : 220 }} transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-shrink-0 bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
          {/* Logo */}
          <div className="h-14 flex items-center px-4 border-b border-gray-100">
            {!collapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center shadow-sm">
                  <Zap size={14} className="text-white" />
                </div>
                <span className="font-bold text-gray-900 text-sm tracking-tight">DispoAI</span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center mx-auto shadow-sm">
                <Zap size={14} className="text-white" />
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 px-2 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}>
                  <item.icon size={16} className="flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="p-3 border-t border-gray-100 space-y-2">
            {!collapsed && (
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition">
                <UserButton afterSignOutUrl="/" />
                <span className="text-xs text-gray-400 font-medium">Account</span>
              </div>
            )}
            <button onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </div>
        </motion.aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{currentPage}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
                <Bell size={16} />
              </button>
              <div className="w-px h-5 bg-gray-200" />
              <a href="/dashboard/settings" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
                <Settings size={16} />
              </a>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}

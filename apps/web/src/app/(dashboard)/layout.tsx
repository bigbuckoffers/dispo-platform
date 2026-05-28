'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Home, Zap, BarChart3, ShoppingBag, Bell, Settings, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { AuthProvider } from '@/components/AuthProvider';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/deals', icon: Home, label: 'Deals' },
  { href: '/dashboard/buyers', icon: Users, label: 'Buyers' },
  { href: '/dashboard/matching', icon: Zap, label: 'AI Matching' },
  { href: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  { href: '/dashboard/dispo', icon: MessageSquare, label: 'Dispo' },
  { href: '/dashboard/marketplace', icon: ShoppingBag, label: 'Marketplace' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AuthProvider>
      <div className="flex h-screen bg-gray-950 overflow-hidden">
        <motion.aside animate={{ width: collapsed ? 64 : 240 }} transition={{ duration: 0.2 }}
          className="flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col z-20">
          <div className="h-16 flex items-center px-4 border-b border-gray-800">
            {!collapsed ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center"><Zap size={14} className="text-white" /></div>
                <span className="font-semibold text-white text-sm">DispoAI</span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center mx-auto"><Zap size={14} className="text-white" /></div>
            )}
          </div>
          <nav className="flex-1 py-4 px-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                  <item.icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-gray-800 space-y-2">
            {!collapsed && <div className="flex items-center gap-2 px-2 py-1.5"><UserButton afterSignOutUrl="/" /><span className="text-xs text-gray-500">Account</span></div>}
            <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800">
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </motion.aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
            <span className="text-sm text-gray-500">{NAV_ITEMS.find(n => pathname.startsWith(n.href))?.label ?? 'Dashboard'}</span>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"><Bell size={18} /></button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}

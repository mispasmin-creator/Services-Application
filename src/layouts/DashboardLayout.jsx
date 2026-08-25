import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Home, Menu } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import { cn } from '../lib/utils';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="sticky top-0 z-30 flex items-center gap-1.5 text-sm mb-4 md:mb-6 bg-transparent py-1 flex-wrap">
      <Link to="/" className="transition-colors shrink-0" style={{ color: '#3b82b0' }}
        onMouseEnter={e => e.currentTarget.style.color='#1e3a5f'}
        onMouseLeave={e => e.currentTarget.style.color='#3b82b0'}>
        <Home size={15} />
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        return (
          <React.Fragment key={name}>
            <ChevronRight size={13} style={{ color: '#bfdbfe' }} className="shrink-0" />
            {isLast ? (
              <span className="font-semibold capitalize" style={{ color: '#162d4a' }}>{name}</span>
            ) : (
              <Link to={routeTo} className="capitalize transition-colors" style={{ color: '#3b82b0' }}
                onMouseEnter={e => e.currentTarget.style.color='#1e3a5f'}
                onMouseLeave={e => e.currentTarget.style.color='#3b82b0'}>
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--surface-3)' }}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/*
        Main content area:
        - Mobile  (< 768px)  : full width, no left padding
        - Tablet+ (≥ 768px)  : pl-[260px] when sidebar expanded
        - Tablet+ collapsed  : pl-[72px]
      */}
      <div className={cn(
        'transition-all duration-300 min-h-screen flex flex-col w-full',
        'md:pl-[240px]',
        collapsed && 'md:pl-[72px]'
      )}>

        {/* ── Page content ── */}
        <main className="flex-1 w-full px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-6 lg:py-6">
          <div className="w-full">

            {/* ── Mobile hamburger — inline, no sticky, no bg, no border ── */}
            <div className="md:hidden flex items-center gap-2 mb-3">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0f766e] transition-all hover:bg-slate-200 shrink-0"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[5px]"
                  style={{ background: 'linear-gradient(145deg, #2dd4bf 0%, #14b8a6 55%, #0f766e 100%)' }}
                >
                  <img src="/logo.png" alt="Logo" width={12} height={12} className="object-contain brightness-0 invert" />
                </div>
                <span className="text-[13px] font-black tracking-tight text-[#0f766e] truncate">Service FMS</span>
              </div>
            </div>

            <Breadcrumbs />
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="w-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <footer
          className="py-3 px-4 text-center text-xs font-medium"
          style={{ borderTop: '1px solid rgba(30,58,95,0.10)', color: '#94a3b8' }}
        >
          © 2026 Service FMS Enterprise. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;

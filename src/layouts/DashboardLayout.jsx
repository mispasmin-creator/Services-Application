import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import { cn } from '../lib/utils';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center gap-1.5 text-sm mb-6">
      <Link to="/" className="transition-colors" style={{ color: '#7a9445' }}
        onMouseEnter={e => e.currentTarget.style.color='#4a5c2a'}
        onMouseLeave={e => e.currentTarget.style.color='#7a9445'}>
        <Home size={15} />
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        return (
          <React.Fragment key={name}>
            <ChevronRight size={13} style={{ color: '#c6d4a0' }} />
            {isLast ? (
              <span className="font-semibold capitalize" style={{ color: '#3a4820' }}>{name}</span>
            ) : (
              <Link to={routeTo} className="capitalize transition-colors" style={{ color: '#7a9445' }}
                onMouseEnter={e => e.currentTarget.style.color='#4a5c2a'}
                onMouseLeave={e => e.currentTarget.style.color='#7a9445'}>
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
  const location = useLocation();

  return (
    <div className="min-h-screen" style={{ background: '#f4f6ee' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={cn(
        "transition-all duration-300 min-h-screen flex flex-col",
        collapsed ? "pl-20" : "pl-64"
      )}>
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <footer className="py-4 px-8 text-center text-xs font-medium"
          style={{ borderTop: '1px solid rgba(74,92,42,0.12)', color: '#a8c86b' }}>
          © 2026 Service FMS Enterprise. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;

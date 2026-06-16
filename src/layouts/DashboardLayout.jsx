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
    <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
      <Link to="/" className="hover:text-blue-600 transition-colors">
        <Home size={16} />
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <React.Fragment key={name}>
            <ChevronRight size={14} className="text-slate-300" />
            {isLast ? (
              <span className="font-semibold text-slate-900 capitalize">{name}</span>
            ) : (
              <Link to={routeTo} className="hover:text-blue-600 transition-colors capitalize">
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
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <div 
        className={cn(
          "transition-all duration-300 min-h-screen flex flex-col",
          collapsed ? "pl-20" : "pl-64"
        )}
      >
        
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <footer className="py-6 px-8 border-t border-slate-200 text-center text-sm text-slate-500">
          © 2026 Service FMS Enterprise. All rights reserved.
        </footer>
      </div>
    </div>
  );
};


export default DashboardLayout;

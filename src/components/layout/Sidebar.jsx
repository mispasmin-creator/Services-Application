import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Wrench,
  Zap,
  Receipt,
  CreditCard,
  Database,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ClipboardList
} from 'lucide-react';
import { cn } from '../../lib/utils';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';
import { hasPageAccess } from '../../lib/permissions';

const menuItems = [
  { key: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { key: 'Offers', icon: FileText, label: 'Offers', path: '/offers' },
  { key: 'Services', icon: Wrench, label: 'Services', path: '/services' },
  { key: 'Bills', icon: Receipt, label: 'Bills', path: '/bills' },
  { key: 'Payments', icon: CreditCard, label: 'Payments', path: '/payments' },
  { key: 'Tally', icon: Database, label: 'Tally', path: '/tally' },
  { key: 'Utility', icon: Zap, label: 'Utility', path: '/utility' },
  { key: 'Reports', icon: ClipboardList, label: 'Reports', path: '/reports' },
  { key: 'Users', icon: Users, label: 'User Management', path: '/users' },
];

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuthStore();
  const clearData = useDataStore(state => state.clearData);
  const visibleMenuItems = menuItems.filter(item => hasPageAccess(user, item.key));

  const handleLogout = () => {
    clearData();
    logout();
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-white text-gray-800 transition-all duration-300 z-50 border-r border-gray-200 shadow-sm",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        {!collapsed && (
          <span className="text-xl font-bold text-gray-900">
            Service FMS
          </span>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="mt-6 px-3 space-y-1">
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-gray-900 text-white shadow-lg shadow-gray-900/10" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon size={20} className={cn("shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-6 left-0 w-full px-3 space-y-4">
        {/* Logged in User Profile Info */}
        <div className={cn(
          "flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl",
          collapsed && "justify-center p-2"
        )}>
          <div className="relative shrink-0">
            <img 
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} 
              alt="User avatar" 
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm object-cover"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">{user?.role}</p>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-4 px-3 py-3 w-full rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all group cursor-pointer",
            collapsed && "justify-center"
          )}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
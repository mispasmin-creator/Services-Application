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
  Menu
} from 'lucide-react';
import { cn } from '../../lib/utils';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FileText, label: 'Offers', path: '/offers' },
  { icon: Wrench, label: 'Services', path: '/services' },
  { icon: Receipt, label: 'Bills', path: '/bills' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: Database, label: 'Tally', path: '/tally' },
  { icon: Zap, label: 'Utility', path: '/utility' },
  { icon: Users, label: 'User Management', path: '/users' },
];

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuthStore();
  const clearData = useDataStore(state => state.clearData);

  const handleLogout = () => {
    clearData();
    logout();
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-white text-slate-800 transition-all duration-300 z-50 border-r border-slate-200",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        {!collapsed && (
          <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
            Service FMS
          </span>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="mt-6 px-3 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-200 group",
              isActive 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon size={20} className={cn("shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-6 left-0 w-full px-3 space-y-4">
        {/* Logged in User Profile Info */}
        <div className={cn(
          "flex items-center gap-3 p-2 bg-slate-50 border border-slate-100 rounded-xl",
          collapsed && "justify-center p-1.5"
        )}>
          <div className="relative shrink-0">
            <img 
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} 
              alt="User avatar" 
              className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-xs object-cover"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{user?.role}</p>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-4 px-3 py-3 w-full rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group cursor-pointer",
            collapsed && "justify-center"
          )}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

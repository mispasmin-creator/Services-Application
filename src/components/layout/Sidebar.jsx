import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Wrench, Zap, Receipt,
  CreditCard, Database, Users, LogOut, ChevronLeft,
  ChevronRight, ClipboardList
} from 'lucide-react';
import { cn } from '../../lib/utils';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';
import { hasPageAccess } from '../../lib/permissions';

const menuItems = [
  { key: 'Dashboard',  icon: LayoutDashboard, label: 'Dashboard',       path: '/dashboard' },
  { key: 'Offers',     icon: FileText,         label: 'Offers',          path: '/offers' },
  { key: 'Services',   icon: Wrench,           label: 'Services',        path: '/services' },
  { key: 'Bills',      icon: Receipt,          label: 'Bills',           path: '/bills' },
  { key: 'Tally',      icon: Database,         label: 'Tally',           path: '/tally' },
  { key: 'Utility',    icon: Zap,              label: 'Utility',         path: '/utility' },
  { key: 'Reports',    icon: ClipboardList,    label: 'Reports',         path: '/reports' },
  { key: 'Users',      icon: Users,            label: 'User Management', path: '/users' },
];

/* Logo — bold "S" text icon */
const LogoIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <text x="16" y="25" fontFamily="Arial Black, Arial, sans-serif" fontSize="26" fontWeight="900"
      textAnchor="middle" fill="white" letterSpacing="-1">S</text>
  </svg>
);

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
        "fixed left-0 top-0 h-screen transition-all duration-300 z-50 flex flex-col",
        collapsed ? "w-20" : "w-80"
      )}
      style={{ background: 'linear-gradient(180deg, #0f2444 0%, #1e3a5f 100%)' }}
    >
      {/* ── Logo / Brand ── */}
      <div className={cn(
        "flex items-center border-b px-4 py-4",
        collapsed ? "justify-center" : "justify-between",
        "border-white/10"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#1e3a5f', boxShadow: '0 4px 12px rgba(30,58,95,0.5)' }}>
              <LogoIcon size={22} />
            </div>
            <div>
              <span className="text-white font-bold text-sm tracking-tight block leading-tight">Service FMS</span>
              <span className="text-white/30 text-[10px] font-medium"></span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#1e3a5f', boxShadow: '0 4px 12px rgba(30,58,95,0.5)' }}>
            <LogoIcon size={22} />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center py-2 border-b border-white/10">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 mt-3 px-3 space-y-0.5 overflow-y-auto pb-4">
        {!collapsed && (
          <p className="text-white/25 text-[9px] font-bold uppercase tracking-[0.15em] px-3 mb-3 mt-1">
            
          </p>
        )}
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              isActive
                ? "text-white shadow-lg"
                : "text-white/45 hover:text-white hover:bg-white/8"
            )}
            style={({ isActive }) => isActive ? {
              background: 'linear-gradient(135deg, #2d5282 0%, #3b82b0 100%)',
              boxShadow: '0 4px 14px rgba(30,58,95,0.45)'
            } : {}}
          >
            <item.icon size={18} className={cn("shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── User + Logout ── */}
      <div className="px-3 pb-4 pt-3 border-t border-white/10 space-y-2">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-xl border border-white/10",
          collapsed && "justify-center p-2"
        )} style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="relative shrink-0">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
              alt="avatar"
              className="w-9 h-9 rounded-xl object-cover"
              style={{ border: '2px solid rgba(255,255,255,0.15)' }}
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 rounded-full"
              style={{ borderColor: '#0f2444' }} />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#63b3ed' }}>{user?.role}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 w-full rounded-xl transition-all cursor-pointer",
            "text-white/35 hover:text-red-400 hover:bg-red-500/10",
            collapsed && "justify-center"
          )}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

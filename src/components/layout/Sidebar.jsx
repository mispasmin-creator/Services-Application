import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Wrench, Zap, Receipt,
  Database, Users, LogOut, ChevronLeft, ChevronRight, ClipboardList
} from 'lucide-react';
import { cn } from '../../lib/utils';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';
import { hasPageAccess } from '../../lib/permissions';

const menuItems = [
  { key: 'Dashboard',  icon: LayoutDashboard, label: 'Dashboard',       path: '/dashboard',  section: 'main' },
  { key: 'Offers',     icon: FileText,         label: 'Offers',          path: '/offers',     section: 'main' },
  { key: 'Services',   icon: Wrench,           label: 'Services',        path: '/services',   section: 'main' },
  { key: 'Bills',      icon: Receipt,          label: 'Bills',           path: '/bills',      section: 'finance' },
  { key: 'Tally',      icon: Database,         label: 'Tally',           path: '/tally',      section: 'finance' },
  { key: 'Utility',    icon: Zap,              label: 'Utility',         path: '/utility',    section: 'finance' },
  { key: 'Reports',    icon: ClipboardList,    label: 'Reports',         path: '/reports',    section: 'admin' },
  { key: 'Users',      icon: Users,            label: 'User Management', path: '/users',      section: 'admin' },
];

const LogoIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <text x="16" y="25" fontFamily="Arial Black, Arial, sans-serif" fontSize="26"
      fontWeight="900" textAnchor="middle" fill="white" letterSpacing="-1">S</text>
  </svg>
);

const SectionLabel = ({ label }) => (
  <p className="px-4 pt-5 pb-1.5 text-[9.5px] font-black uppercase tracking-[0.18em]"
    style={{ color: 'rgba(255,255,255,0.22)' }}>
    {label}
  </p>
);

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuthStore();
  const clearData = useDataStore(state => state.clearData);
  const visibleMenuItems = menuItems.filter(item => hasPageAccess(user, item.key));

  const handleLogout = () => { clearData(); logout(); };

  const sections = [
    { key: 'main',    label: 'Main' },
    { key: 'finance', label: 'Finance' },
    { key: 'admin',   label: 'Admin' },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 select-none",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
      style={{
        background: 'linear-gradient(180deg, #080f1e 0%, #0a1628 30%, #0d1f3c 70%, #101e38 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '4px 0 32px rgba(0,0,0,0.35)',
      }}
    >

      {/* ── Brand Header ── */}
      <div className={cn(
        "flex items-center px-4 py-[18px] border-b",
        collapsed ? "justify-center" : "justify-between",
      )} style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5282 100%)',
                boxShadow: '0 4px 16px rgba(30,58,95,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}>
              <LogoIcon size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-[14px] tracking-tight leading-none">Service FMS</p>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase mt-1" style={{ color: '#4a9fd4' }}>Enterprise</p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5282 100%)',
              boxShadow: '0 4px 16px rgba(30,58,95,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}>
            <LogoIcon size={24} />
          </div>
        )}

        {!collapsed && (
          <button onClick={() => setCollapsed(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <button onClick={() => setCollapsed(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto pb-4 mt-2"
        style={{ scrollbarWidth: 'none' }}>

        {sections.map(section => {
          const items = visibleMenuItems.filter(i => i.section === section.key);
          if (!items.length) return null;
          return (
            <div key={section.key}>
              {!collapsed && <SectionLabel label={section.label} />}
              {collapsed && <div className="h-3" />}

              <div className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")}>
                {items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className="block relative"
                  >
                    {({ isActive }) => (
                      <div className={cn(
                        "relative flex items-center rounded-[10px] transition-all duration-200 overflow-hidden",
                        collapsed ? "justify-center w-full py-3" : "gap-3.5 px-3.5 py-[11px]",
                        isActive ? "text-white" : "group"
                      )}
                        style={isActive ? {
                          background: 'linear-gradient(135deg, rgba(45,82,130,0.9) 0%, rgba(59,130,176,0.7) 100%)',
                          boxShadow: '0 4px 20px rgba(30,58,95,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                        } : {}}>

                        {/* Active left accent bar */}
                        {isActive && !collapsed && (
                          <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                            style={{ background: 'linear-gradient(180deg, #63b3ed, #3b82b0)' }} />
                        )}

                        {/* Hover bg for inactive */}
                        {!isActive && (
                          <div className="absolute inset-0 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                            style={{ background: 'rgba(255,255,255,0.055)' }} />
                        )}

                        <item.icon
                          size={20}
                          className={cn("shrink-0 relative z-10 transition-all duration-200",
                            collapsed ? "mx-auto" : "ml-1",
                            isActive ? "text-white" : "text-white/40 group-hover:text-white/80"
                          )}
                        />

                        {!collapsed && (
                          <span className={cn(
                            "text-[13.5px] font-semibold tracking-[-0.01em] relative z-10 transition-colors duration-200",
                            isActive ? "text-white" : "text-white/50 group-hover:text-white/85"
                          )}>
                            {item.label}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User Card + Logout ── */}
      <div className="px-3 pb-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

        {/* User card */}
        <div className={cn(
          "flex items-center rounded-[12px] border mb-2 transition-all",
          collapsed ? "justify-center p-2.5" : "gap-3 p-3",
        )} style={{
          background: 'rgba(255,255,255,0.04)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          <div className="relative shrink-0">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
              alt="avatar"
              className="rounded-[10px] object-cover"
              style={{ width: 36, height: 36, border: '2px solid rgba(255,255,255,0.12)' }}
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full border-[2px]"
              style={{ background: '#34d399', borderColor: '#080f1e' }} />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-white truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] font-bold tracking-widest uppercase mt-0.5" style={{ color: '#4a9fd4' }}>{user?.role}</p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className={cn(
            "flex items-center w-full rounded-[10px] transition-all duration-150 cursor-pointer group",
            collapsed ? "justify-center py-2.5 px-0" : "gap-3 px-3.5 py-2.5",
          )}
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="text-[13px] font-semibold">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

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

const LogoIcon = ({ size = 28 }) => (
  <img
    src="/logo.png"
    alt="logo"
    width={size}
    height={size}
    style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
  />
);

const UserAvatar = ({ user }) => (
  <div className="relative shrink-0">
    <div className="rounded-[12px] p-[2px]" style={{ background: 'linear-gradient(135deg, #9dbb63, #3a4820)' }}>
      <img
        src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
        alt="avatar"
        className="rounded-[10px] object-cover block"
        style={{ width: 36, height: 36, background: '#fff' }}
      />
    </div>
    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#34d399' }} />
      <span className="relative inline-flex rounded-full h-3 w-3 border-2" style={{ background: '#34d399', borderColor: '#f2f5ec' }} />
    </span>
  </div>
);

const SectionLabel = ({ label }) => (
  <p className="px-4 pt-5 pb-1.5 text-[11px] font-black uppercase tracking-[0.18em]"
    style={{ color: '#94a3b8' }}>
    {label}
  </p>
);

const sections = [
  { key: 'main',    label: '' },
  { key: 'finance', label: '' },
  { key: 'admin',   label: '' },
];

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuthStore();
  const clearData = useDataStore(state => state.clearData);
  const visibleMenuItems = menuItems.filter(item => hasPageAccess(user, item.key));
  const handleLogout = () => { clearData(); logout(); };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 select-none",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f5f7f0 100%)',
        borderRight: '1.5px solid #d0dbb5',
        boxShadow: '4px 0 24px rgba(74,92,42,0.08)',
      }}
    >

      {/* ── Brand Header ── */}
      <div className={cn(
        "flex items-center px-4 py-[18px] border-b",
        collapsed ? "justify-center" : "justify-between",
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shrink-0 overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #4a5c2a 0%, #3a4820 55%, #2c3818 100%)',
                boxShadow: '0 6px 16px rgba(58,72,32,0.4), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -6px 10px rgba(0,0,0,0.15)',
              }}>
              <div className="absolute inset-0 rounded-[12px]" style={{ border: '1px solid rgba(255,255,255,0.12)' }} />
              <LogoIcon size={22} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-[16px] tracking-tight leading-none" style={{ color: '#3a4820' }}>Service FMS</p>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase mt-1.5" style={{ color: '#7a9445' }}>Facility Management</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="relative w-[40px] h-[40px] rounded-[12px] flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #4a5c2a 0%, #3a4820 55%, #2c3818 100%)',
              boxShadow: '0 6px 16px rgba(58,72,32,0.4), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -6px 10px rgba(0,0,0,0.15)',
            }}>
            <div className="absolute inset-0 rounded-[12px]" style={{ border: '1px solid rgba(255,255,255,0.12)' }} />
            <LogoIcon size={22} />
          </div>
        )}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f2f5ec'; e.currentTarget.style.color = '#3a4820'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2.5 border-b" style={{ borderColor: '#d0dbb5' }}>
          <button onClick={() => setCollapsed(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f2f5ec'; e.currentTarget.style.color = '#3a4820'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto pb-4 mt-1" style={{ scrollbarWidth: 'none' }}>
        {sections.map(section => {
          const items = visibleMenuItems.filter(i => i.section === section.key);
          if (!items.length) return null;
          return (
            <div key={section.key}>
              {!collapsed && <SectionLabel label={section.label} />}
              {collapsed && <div className="h-3" />}

              <div className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")}>
                {items.map(item => (
                  <NavLink key={item.path} to={item.path} title={collapsed ? item.label : undefined} className="block">
                    {({ isActive }) => (
                      <div className={cn(
                        "relative flex items-center rounded-[10px] transition-all duration-200 overflow-hidden cursor-pointer",
                        collapsed ? "justify-center py-3 w-full" : "gap-4 px-4 py-[12px]",
                      )}
                        style={isActive ? {
                          background: 'linear-gradient(135deg, #e8edda 0%, #d0dbb5 100%)',
                          boxShadow: '0 2px 10px rgba(74,92,42,0.12)',
                        } : {}}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f2f5ec'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* Active left bar */}
                        {isActive && !collapsed && (
                          <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                            style={{ background: 'linear-gradient(180deg, #3a4820, #7a9445)' }} />
                        )}

                        <item.icon
                          size={22}
                          className="shrink-0 transition-colors duration-150"
                          style={{
                            color: isActive ? '#3a4820' : '#94a3b8',
                            marginLeft: !collapsed ? '4px' : '0',
                            marginRight: collapsed ? 'auto' : '0',
                            marginLeft: collapsed ? 'auto' : (isActive ? '4px' : '4px'),
                          }}
                        />

                        {!collapsed && (
                          <span className="text-[15px] font-semibold tracking-[-0.01em] transition-colors duration-150"
                            style={{ color: isActive ? '#3a4820' : '#64748b' }}>
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
      <div className="px-3 pb-4 pt-3 border-t" style={{ borderColor: '#d0dbb5' }}>

        {!collapsed ? (
          <div
            className="flex items-center gap-3 rounded-[14px] border p-2.5 transition-all duration-200"
            style={{ background: '#f2f5ec', borderColor: '#d0dbb5' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(74,92,42,0.16)'; e.currentTarget.style.borderColor = '#b9c890'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#d0dbb5'; }}
          >
            <UserAvatar user={user} />

            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold truncate leading-tight" style={{ color: '#3a4820' }}>{user?.name}</p>
              <span className="inline-block mt-1 px-2 py-[1px] rounded-full text-[10px] font-black tracking-wider uppercase"
                style={{ background: '#e2e8cf', color: '#5c7031' }}>
                {user?.role}
              </span>
            </div>

            <button onClick={handleLogout} title="Logout"
              className="shrink-0 w-8 h-8 rounded-[9px] flex items-center justify-center transition-all duration-150 cursor-pointer"
              style={{ color: '#94a3b8' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <UserAvatar user={user} />
            <button onClick={handleLogout} title="Logout"
              className="w-8 h-8 rounded-[9px] flex items-center justify-center transition-all duration-150 cursor-pointer"
              style={{ color: '#94a3b8' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

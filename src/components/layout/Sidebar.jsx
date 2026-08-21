import React, { useMemo, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Wrench,
  Zap,
  Receipt,
  Database,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  UserCircle2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';
import { hasPageAccess } from '../../lib/permissions';

// ─── Constants ──────────────────────────────────────────────────────────────

const MENU_ITEMS = [
  { key: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', section: 'main' },
  { key: 'Offers',    icon: FileText,        label: 'Offers',    path: '/offers',    section: 'main' },
  { key: 'Services',  icon: Wrench,          label: 'Services',  path: '/services',  section: 'main' },
  { key: 'Bills',     icon: Receipt,         label: 'Bills',     path: '/bills',     section: 'finance' },
  { key: 'Tally',     icon: Database,        label: 'Tally',     path: '/tally',     section: 'finance' },
  { key: 'Utility',   icon: Zap,             label: 'Utility',   path: '/utility',   section: 'finance' },
  { key: 'Reports',   icon: ClipboardList,   label: 'Reports',   path: '/reports',   section: 'admin' },
  { key: 'Users',     icon: Users,           label: 'User Management', path: '/users', section: 'admin' },
];

const SECTIONS = [
  { key: 'main',    label: '' },
  { key: 'finance', label: '' },
  { key: 'admin',   label: '' },
];

// ─── Sub‑Components (memoized) ─────────────────────────────────────────────

const Logo = React.memo(({ size = 28 }) => (
  <img
    src="/logo.png"
    alt="Service FMS Logo"
    width={size}
    height={size}
    className="object-contain brightness-0 invert"
  />
));
Logo.displayName = 'Logo';

const UserAvatar = React.memo(({ user }) => {
  return (
    <div className="relative shrink-0">
      <div
        className="rounded-[12px] p-[2px]"
        style={{ background: 'linear-gradient(135deg, #9dbb63, #3a4820)' }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white"
          title={`${user?.name || 'User'} avatar`}
        >
          <UserCircle2 className="h-6 w-6 text-[#3a4820]" strokeWidth={1.75} />
        </div>
      </div>
      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[#f2f5ec] bg-emerald-400" />
      </span>
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';

const SectionLabel = React.memo(({ label }) => (
  <p className="px-4 pb-1.5 pt-5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
    {label}
  </p>
));
SectionLabel.displayName = 'SectionLabel';

const MenuItem = React.memo(({ item, isCollapsed, isActive }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      title={isCollapsed ? item.label : undefined}
      className="block"
      aria-current={isActive ? 'page' : undefined}
    >
      {({ isActive: active }) => (
        <div
          className={cn(
            'relative flex cursor-pointer items-center overflow-hidden rounded-[10px] transition-all duration-200',
            isCollapsed ? 'w-full justify-center py-3' : 'gap-4 px-4 py-[12px]',
            active
              ? 'bg-gradient-to-br from-[#e8edda] to-[#d0dbb5] shadow-sm'
              : 'hover:bg-[#f2f5ec]'
          )}
        >
          {active && !isCollapsed && (
            <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-[#3a4820] to-[#7a9445]" />
          )}
          <Icon
            size={22}
            className="shrink-0 transition-colors duration-150"
            style={{ color: active ? '#3a4820' : '#94a3b8' }}
          />
          {!isCollapsed && (
            <span
              className="text-[15px] font-semibold tracking-[-0.01em] transition-colors duration-150"
              style={{ color: active ? '#3a4820' : '#64748b' }}
            >
              {item.label}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );
});
MenuItem.displayName = 'MenuItem';

// ─── Main Sidebar Component ──────────────────────────────────────────────

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuthStore();
  const clearData = useDataStore((state) => state.clearData);

  // Memoize filtered menu items based on user permissions
  const visibleMenuItems = useMemo(
    () => MENU_ITEMS.filter((item) => hasPageAccess(user, item.key)),
    [user]
  );

  const handleLogout = useCallback(() => {
    clearData();
    logout();
  }, [clearData, logout]);

  const toggleCollapse = useCallback(
    () => setCollapsed((prev) => !prev),
    [setCollapsed]
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-screen select-none flex-col transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f5f7f0 100%)',
        borderRight: '1.5px solid #d0dbb5',
        boxShadow: '4px 0 24px rgba(74,92,42,0.08)',
      }}
    >
      {/* ── Brand Header ── */}
      <div
        className={cn(
          'flex items-center border-b border-[#d0dbb5] px-4 py-[18px]',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px]">
              <div
                className="absolute inset-0 rounded-[12px]"
                style={{
                  background:
                    'linear-gradient(145deg, #4a5c2a 0%, #3a4820 55%, #2c3818 100%)',
                  boxShadow:
                    '0 6px 16px rgba(58,72,32,0.4), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -6px 10px rgba(0,0,0,0.15)',
                }}
              />
              <div className="absolute inset-0 rounded-[12px] border border-white/20" />
              <Logo size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[16px] font-black leading-none tracking-tight text-[#3a4820]">
                Service FMS
              </p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7a9445]" />
            </div>
          </div>
        ) : (
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px]">
            <div
              className="absolute inset-0 rounded-[12px]"
              style={{
                background:
                  'linear-gradient(145deg, #4a5c2a 0%, #3a4820 55%, #2c3818 100%)',
                boxShadow:
                  '0 6px 16px rgba(58,72,32,0.4), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -6px 10px rgba(0,0,0,0.15)',
              }}
            />
            <div className="absolute inset-0 rounded-[12px] border border-white/20" />
            <Logo size={22} />
          </div>
        )}

        {!collapsed && (
          <button
            onClick={toggleCollapse}
            aria-label="Collapse sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-[#f2f5ec] hover:text-[#3a4820]"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center border-b border-[#d0dbb5] py-2.5">
          <button
            onClick={toggleCollapse}
            aria-label="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-[#f2f5ec] hover:text-[#3a4820]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto pb-4 pt-1" style={{ scrollbarWidth: 'none' }}>
        {SECTIONS.map((section) => {
          const items = visibleMenuItems.filter((i) => i.section === section.key);
          if (items.length === 0) return null;

          return (
            <div key={section.key}>
              {!collapsed && <SectionLabel label={section.label} />}
              {collapsed && <div className="h-3" />}

              <div className={cn('space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
                {items.map((item) => (
                  <MenuItem
                    key={item.path}
                    item={item}
                    isCollapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User Card & Logout ── */}
      <div className="border-t border-[#d0dbb5] px-3 pb-4 pt-3">
        {!collapsed ? (
          <div
            className="flex items-center gap-3 rounded-[14px] border border-[#d0dbb5] bg-[#f2f5ec] p-2.5 transition-all duration-200 hover:border-[#b9c890] hover:shadow-md"
          >
            <UserAvatar user={user} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold leading-tight text-[#3a4820]">
                {user?.name || 'Guest'}
              </p>
              <span className="mt-1 inline-block rounded-full bg-[#e2e8cf] px-2 py-[1px] text-[10px] font-black uppercase tracking-wider text-[#5c7031]">
                {user?.role || 'N/A'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              aria-label="Logout"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[9px] text-slate-400 transition-all duration-150 hover:bg-red-100 hover:text-red-500"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <UserAvatar user={user} />
            <button
              onClick={handleLogout}
              aria-label="Logout"
              className="flex h-8 w-8 items-center justify-center rounded-[9px] text-slate-400 transition-all duration-150 hover:bg-red-100 hover:text-red-500"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default React.memo(Sidebar);
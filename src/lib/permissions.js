// Pages shown in the sidebar / guarded by routing. "Dashboard" is always accessible.
export const PAGES = [
  { key: 'Dashboard', label: 'Dashboard' },
  { key: 'Offers', label: 'Offers' },
  { key: 'Services', label: 'Services' },
  { key: 'Bills', label: 'Bills' },
  { key: 'Payments', label: 'Payments' },
  { key: 'Tally', label: 'Tally' },
  { key: 'Utility', label: 'Utility' },
  { key: 'Reports', label: 'Reports' },
  { key: 'Users', label: 'User Management' },
];

// Tabs available within each page that has multiple stages/views.
export const PAGE_TABS = {
  Offers: [
    { id: 'active', label: 'Active Offers' },
    { id: 'history', label: 'History' },
  ],
  Services: [
    { id: 'active', label: 'Active Services' },
    { id: 'history', label: 'History' },
  ],
  Bills: [
    { id: 'active', label: 'Active Bills' },
    { id: 'history', label: 'History' },
  ],
  Payments: [
    { id: 'active', label: 'Active Payments' },
    { id: 'history', label: 'History' },
  ],
  Tally: [
    { id: 'audit', label: 'Audit Stage' },
    { id: 'rectify', label: 'Rectify Stage' },
    { id: 'tally', label: 'Tally Entry' },
    { id: 'completed', label: 'Completed' },
  ],
  Utility: [
    { id: 'create', label: 'Utility Entries' },
    { id: 'approval', label: 'Payment Approval' },
    { id: 'payment', label: 'Tally Entry' },
    { id: 'completed', label: 'Completed' },
  ],
  Reports: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pending', label: 'Pending Work' },
  ],
};

const isAdmin = (user) => user?.role?.toLowerCase() === 'admin';

// Admins always have full access. A blank/missing/"All" Pages value also means full access,
// so existing user rows in the sheet keep working once the Pages column is introduced.
export const hasPageAccess = (user, pageKey) => {
  if (pageKey === 'Dashboard') return true;
  if (!user) return false;
  if (isAdmin(user)) return true;

  const raw = (user.pages || '').trim();
  if (!raw || raw.toLowerCase() === 'all') return true;

  const list = raw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
  return list.includes(pageKey.toLowerCase());
};

// Returns the subset of `tabsArray` the user may see for `pageKey`.
// If the user has no restriction recorded for this specific page, all tabs are shown.
export const getAllowedTabs = (user, pageKey, tabsArray) => {
  if (!user || isAdmin(user)) return tabsArray;

  const raw = (user.tabs || '').trim();
  if (!raw || raw.toLowerCase() === 'all') return tabsArray;

  const list = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  const prefix = `${pageKey.toLowerCase()}:`;
  const pageTokens = list.filter((t) => t.startsWith(prefix));
  if (pageTokens.length === 0) return tabsArray;

  const allowedIds = pageTokens.map((t) => t.slice(prefix.length));
  const filtered = tabsArray.filter((t) => allowedIds.includes(t.id.toLowerCase()));
  return filtered.length > 0 ? filtered : tabsArray;
};

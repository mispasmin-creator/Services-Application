import React from 'react';
import {
  Wrench, CheckCircle2, IndianRupee, FileText,
  Clock, TrendingUp, Activity, Receipt,
  Database, ArrowUpRight, AlertCircle, BarChart3,
  CreditCard, Building2, Users, Zap
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency } from '../lib/utils';

/* ── Palette ── */
const NAV  = '#1e3a5f';
const NAV2 = '#2d5282';
const NAV3 = '#3b82b0';
const PIE_COLORS = ['#1e3a5f', '#2d5282', '#3b82b0', '#f59e0b', '#10b981', '#ef4444'];

/* ── KPI card ── */
const KpiCard = ({ title, value, sub, icon: Icon, grad, shadow, badge, badgeColor }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 relative overflow-hidden group"
    style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07), 0 8px 24px rgba(30,58,95,0.05)' }}>
    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.07]"
      style={{ background: grad }} />
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{value}</h3>
        {sub && <p className="text-xs text-gray-400 mt-1.5 font-medium">{sub}</p>}
      </div>
      <div className="p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform duration-200"
        style={{ background: grad, boxShadow: `0 6px 18px ${shadow}` }}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
    {badge && (
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5">
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", badgeColor)}>
          <ArrowUpRight size={11} />{badge}
        </span>
      </div>
    )}
  </div>
);

/* ── Mini progress bar ── */
const ProgressRow = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-600">{label}</span>
        <span className="font-bold text-gray-900">{value} <span className="text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { services, utilities, offers, loading } = useDataStore();

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-gray-100 rounded-full" />
          <div className="absolute inset-0 w-14 h-14 border-4 rounded-full border-t-transparent animate-spin"
            style={{ borderColor: NAV, borderTopColor: 'transparent' }} />
        </div>
        <p className="text-sm font-semibold animate-pulse" style={{ color: NAV3 }}>Loading dashboard...</p>
      </div>
    );
  }

  /* ── Metrics ── */
  const totalServices    = services.length;
  const totalOffers      = offers.length;
  const completedSrv     = services.filter(s => s.status === 'Completed').length;
  const paymentPendingSrv= services.filter(s => !s.paymentProof).length;
  const billPendingSrv   = services.filter(s => !s.billCopy).length;
  const tallyPendingSrv  = services.filter(s => s.billCopy && s.status !== 'Completed').length;

  const totalAmount      = services.reduce((s, r) => s + (r.amount || 0), 0);
  const totalTDS         = services.reduce((s, r) => s + (r.tdsAmount || 0), 0);
  const netPayable       = totalAmount - totalTDS;

  const completionRate   = totalServices > 0 ? Math.round((completedSrv / totalServices) * 100) : 0;

  /* ── Status distribution for pie ── */
  const statusGroups = [
    { name: 'Service Created', value: services.filter(s => s.status === 'Service Created').length },
    { name: 'Work Started',    value: services.filter(s => s.status === 'Work Started').length },
    { name: 'Bill Received',   value: services.filter(s => s.status === 'Bill Received').length },
    { name: 'Payment Pending', value: services.filter(s => s.status === 'Payment Pending').length },
    { name: 'Tally Pending',   value: services.filter(s => s.status === 'Tally Pending').length },
    { name: 'Completed',       value: completedSrv },
  ].filter(d => d.value > 0);

  /* ── Monthly expense chart (last 6 months) ── */
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const k = monthNames[d.getMonth()];
    monthMap[k] = { name: k, amount: 0, count: 0, net: 0 };
  }
  services.forEach(s => {
    if (!s.timestamp) return;
    const d = new Date(s.timestamp.split(' ')[0]);
    if (isNaN(d)) return;
    const k = monthNames[d.getMonth()];
    if (monthMap[k]) {
      monthMap[k].amount += s.amount || 0;
      monthMap[k].net    += (s.amount || 0) - (s.tdsAmount || 0);
      monthMap[k].count  += 1;
    }
  });
  const chartData = Object.values(monthMap);

  /* ── Vendor-wise ── */
  const vendorMap = {};
  services.forEach(s => {
    if (!s.vendor) return;
    vendorMap[s.vendor] = (vendorMap[s.vendor] || 0) + (s.amount || 0);
  });
  const topVendors = Object.entries(vendorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));

  /* ── Recent services ── */
  const recentServices = [...services]
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 6);

  const getStatusColor = (s) => ({
    'Completed':       'bg-emerald-100 text-emerald-700 border border-emerald-200',
    'Tally Pending':   'bg-purple-100 text-purple-700 border border-purple-200',
    'Payment Pending': 'bg-rose-100 text-rose-700 border border-rose-200',
    'Bill Received':   'bg-indigo-100 text-indigo-700 border border-indigo-200',
    'Work Started':    'bg-blue-100 text-blue-700 border border-blue-200',
  }[s] || 'bg-gray-100 text-gray-700 border border-gray-200');

  /* ── Date greeting ── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-7">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{today}</p>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: NAV }}>{greeting} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your business overview — live from Google Sheets.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-blue-100 bg-blue-50">
            <div className="w-2 h-2 rounded-full animate-pulse bg-emerald-500" />
            <span className="text-xs font-bold text-blue-700">Live Sync</span>
          </div>
          <div className="px-4 py-2 text-white rounded-xl text-sm font-bold shadow-lg"
            style={{ background: `linear-gradient(135deg, ${NAV}, ${NAV2})`, boxShadow: `0 4px 14px rgba(30,58,95,0.35)` }}>
            {completionRate}% Complete
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Services" value={totalServices}
          sub={`${offers.length} offers raised`}
          icon={Wrench}
          grad={`linear-gradient(135deg, ${NAV}, ${NAV2})`}
          shadow="rgba(30,58,95,0.35)"
          badge={`${completedSrv} completed`}
          badgeColor="bg-emerald-50 text-emerald-700" />

        <KpiCard title="Total Billed" value={formatCurrency(totalAmount)}
          sub={`Net after TDS: ${formatCurrency(netPayable)}`}
          icon={IndianRupee}
          grad="linear-gradient(135deg, #0d9488, #0f766e)"
          shadow="rgba(13,148,136,0.30)"
          badge={`TDS: ${formatCurrency(totalTDS)}`}
          badgeColor="bg-teal-50 text-teal-700" />

        <KpiCard title="Bills Pending" value={billPendingSrv}
          sub={`${totalServices - billPendingSrv} bills uploaded`}
          icon={Receipt}
          grad="linear-gradient(135deg, #f59e0b, #d97706)"
          shadow="rgba(245,158,11,0.30)"
          badge={`${totalServices - billPendingSrv} done`}
          badgeColor="bg-amber-50 text-amber-700" />

        <KpiCard title="Tally Pending" value={tallyPendingSrv}
          sub={`${completedSrv} entries tallied`}
          icon={Database}
          grad="linear-gradient(135deg, #7c3aed, #5b21b6)"
          shadow="rgba(124,58,237,0.28)"
          badge={`${completedSrv} completed`}
          badgeColor="bg-purple-50 text-purple-700" />
      </div>

      {/* ── Workflow Pipeline ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6"
        style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} style={{ color: NAV }} />
          <h3 className="font-bold text-gray-900">Service Workflow Pipeline</h3>
          <span className="ml-auto text-xs text-gray-400 font-medium">{totalServices} total services</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Created',         val: services.filter(s => s.status === 'Service Created').length,  color: '#6b7280', bg: '#f9fafb' },
            { label: 'Work Started',    val: services.filter(s => s.status === 'Work Started').length,     color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Bill Received',   val: services.filter(s => s.status === 'Bill Received').length,    color: '#6366f1', bg: '#eef2ff' },
            { label: 'Pay Pending',     val: services.filter(s => s.status === 'Payment Pending').length,  color: '#ef4444', bg: '#fef2f2' },
            { label: 'Tally Pending',   val: services.filter(s => s.status === 'Tally Pending').length,    color: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'Completed',       val: completedSrv,                                                  color: '#10b981', bg: '#ecfdf5' },
          ].map((step, i) => (
            <div key={step.label} className="rounded-xl p-3.5 text-center relative" style={{ background: step.bg }}>
              {i < 5 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-4 h-4 rounded-full bg-white border-2 flex items-center justify-center hidden lg:flex"
                  style={{ borderColor: step.color }}>
                  <span style={{ color: step.color, fontSize: '8px', fontWeight: 900 }}>›</span>
                </div>
              )}
              <div className="text-2xl font-extrabold mb-1 tracking-tight" style={{ color: step.color }}>{step.val}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Expense Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6"
          style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Monthly Expense Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Total recorded: <span className="font-bold text-gray-700">{formatCurrency(totalAmount)}</span></p>
            </div>
            <span className="px-3 py-1 rounded-lg text-[10px] font-bold border bg-blue-50 border-blue-100 text-blue-700">Last 6 Months</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={NAV} stopOpacity={0.20} />
                  <stop offset="95%" stopColor={NAV} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="navGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={NAV3} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={NAV3} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
              <Tooltip formatter={(v, n) => [formatCurrency(v), n === 'amount' ? 'Gross' : 'Net']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #dbeafe', boxShadow: '0 10px 24px rgba(30,58,95,0.12)', backgroundColor: 'white', fontSize: 12 }} />
              <Area type="monotone" dataKey="amount" stroke={NAV}  strokeWidth={2.5} fillOpacity={1} fill="url(#navGrad)"  name="amount" />
              <Area type="monotone" dataKey="net"    stroke={NAV3} strokeWidth={2}   fillOpacity={1} fill="url(#navGrad2)" name="net"    strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3">
            {[{ c: NAV, label: 'Gross Amount', dash: false }, { c: NAV3, label: 'Net (after TDS)', dash: true }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="h-0.5 w-6 rounded-full" style={{ background: l.c, borderStyle: l.dash ? 'dashed' : 'solid' }} />
                <span className="text-[11px] font-semibold text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6"
          style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>
          <h3 className="font-bold text-gray-900 mb-4">Status Breakdown</h3>
          {statusGroups.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusGroups} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    paddingAngle={3} dataKey="value">
                    {statusGroups.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #dbeafe', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {statusGroups.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-gray-600 font-medium truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top Vendors Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6"
          style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={15} style={{ color: NAV }} />
            <h3 className="font-bold text-gray-900">Top Vendors by Amount</h3>
          </div>
          {topVendors.length > 0 ? (
            <div className="space-y-3">
              {topVendors.map((v, i) => (
                <div key={v.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700 truncate max-w-[120px]" title={v.name}>{v.name}</span>
                    <span className="font-bold text-gray-900">{formatCurrency(v.amount)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((v.amount / topVendors[0].amount) * 100)}%`, background: `linear-gradient(90deg, ${NAV}, ${NAV3})` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center mt-8">No vendor data</p>
          )}
        </div>

        {/* Workflow Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6"
          style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={15} style={{ color: NAV }} />
            <h3 className="font-bold text-gray-900">Stage Progress</h3>
          </div>
          <div className="space-y-4">
            <ProgressRow label="Payment Done"   value={services.filter(s => !!s.paymentProof).length} max={totalServices} color={`linear-gradient(90deg, #10b981, #059669)`} />
            <ProgressRow label="Bill Uploaded"  value={services.filter(s => !!s.billCopy).length}     max={totalServices} color={`linear-gradient(90deg, ${NAV2}, ${NAV3})`} />
            <ProgressRow label="Tally Complete" value={completedSrv}                                   max={totalServices} color={`linear-gradient(90deg, #8b5cf6, #7c3aed)`} />
            <ProgressRow label="Offers → Services" value={totalServices} max={Math.max(totalOffers, totalServices)} color={`linear-gradient(90deg, #f59e0b, #d97706)`} />
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold">{totalOffers} offers raised</span>
            <span className="font-semibold">{totalServices} services created</span>
          </div>
        </div>

        {/* Recent Services */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.07)' }}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Activity size={14} style={{ color: NAV }} />
            <h3 className="font-bold text-gray-900 text-sm">Recent Services</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentServices.map(s => (
              <div key={s.sheetRowIndex} className="px-5 py-3 hover:bg-blue-50/40 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{s.id}</p>
                    <p className="text-xs text-gray-400 font-medium truncate mt-0.5">{s.vendor || s.firmName || '—'} · {s.location || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(s.amount)}</p>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", getStatusColor(s.status))}>
                      {s.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {recentServices.length === 0 && (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">No services yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

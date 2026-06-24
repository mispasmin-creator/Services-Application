import React from 'react';
import { 
  Users, 
  Wrench, 
  CheckCircle2, 
  IndianRupee, 
  FileWarning, 
  Building2, 
  Clock, 
  TrendingUp,
  Activity,
  Zap,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency } from '../lib/utils';
import WorkflowVisualizer from '../components/dashboard/WorkflowVisualizer';

const COLORS = ['#4a5c2a', '#7a9445', '#d97706', '#7c3aed'];

const statConfigs = [
  { gradient: 'linear-gradient(135deg,#4a5c2a,#5d7234)', shadow: 'rgba(74,92,42,0.35)' },
  { gradient: 'linear-gradient(135deg,#0d9488,#0f766e)', shadow: 'rgba(13,148,136,0.30)' },
  { gradient: 'linear-gradient(135deg,#d97706,#b45309)', shadow: 'rgba(217,119,6,0.30)' },
  { gradient: 'linear-gradient(135deg,#7c3aed,#5b21b6)', shadow: 'rgba(124,58,237,0.28)' },
];

const StatCard = ({ title, value, icon: Icon, subtitle, trend, trendValue, colorIdx = 0 }) => {
  const cfg = statConfigs[colorIdx % statConfigs.length];
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpRight size={14} className="text-emerald-600" />;
    if (trend === 'down') return <ArrowDownRight size={14} className="text-red-600" />;
    return <Minus size={14} className="text-gray-400" />;
  };
  const getTrendColor = () => {
    if (trend === 'up') return 'text-emerald-600 bg-emerald-50';
    if (trend === 'down') return 'text-red-600 bg-red-50';
    return 'text-gray-400 bg-gray-50';
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 -translate-y-8 translate-x-8"
        style={{ background: cfg.gradient }} />
      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1.5 font-medium truncate">{subtitle}</p>
          )}
        </div>
        <div className="p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 shrink-0"
          style={{ background: cfg.gradient, boxShadow: `0 8px 20px ${cfg.shadow}` }}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          <span className={cn(
            "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
            getTrendColor()
          )}>
            {getTrendIcon()}
            {trendValue}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">vs last month</span>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { services, utilities, offers, loading } = useDataStore();

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 rounded-full border-t-transparent animate-spin"
            style={{ borderColor: '#4a5c2a', borderTopColor: 'transparent' }}></div>
        </div>
        <p className="font-medium text-sm animate-pulse" style={{ color: '#7a9445' }}>Loading dashboard overview...</p>
      </div>
    );
  }

  // 1. Total Pending (Services + Utilities not Completed)
  const totalPendingServices = services.filter(s => s.status !== 'Completed').length;
  const totalPendingUtilities = utilities.filter(u => u.status !== 'Completed').length;
  const totalPending = totalPendingServices + totalPendingUtilities;

  // 2. Total Completed (Services + Utilities Completed)
  const totalCompletedServices = services.filter(s => s.status === 'Completed').length;
  const totalCompletedUtilities = utilities.filter(u => u.status === 'Completed').length;
  const totalCompleted = totalCompletedServices + totalCompletedUtilities;

  // 3. Payment Pending (Services and Utilities waiting for payment approval/release)
  const paymentPendingServices = services.filter(s => s.status === 'Payment Pending').length;
  const paymentPendingUtilities = utilities.filter(u => u.status === 'Approval' || u.status === 'Approved' || u.status === 'Payment Approved').length;
  const paymentPending = paymentPendingServices + paymentPendingUtilities;

  // 4. Utility Pending
  const utilityPending = utilities.filter(u => u.status !== 'Completed').length;

  // Compute total expenses
  const totalServiceExpenses = services.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalUtilityExpenses = utilities.reduce((sum, u) => sum + (u.amount || 0), 0);
  const totalExpenses = totalServiceExpenses + totalUtilityExpenses;

  // Calculate trends (mock data - would be calculated from actual data in production)
  const trends = {
    pending: { value: '+12%', trend: 'up' },
    completed: { value: '+8%', trend: 'up' },
    payment: { value: '-5%', trend: 'down' },
    utility: { value: '+3%', trend: 'up' }
  };

  // Group expenses by month for the chart
  const monthlyExpenses = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mName = monthNames[d.getMonth()];
    monthlyExpenses[mName] = { name: mName, expense: 0, services: 0, utilities: 0 };
  }

  services.forEach(s => {
    if (!s.timestamp) return;
    const dateObj = new Date(s.timestamp.split(' ')[0]);
    if (isNaN(dateObj.getTime())) return;
    const mName = monthNames[dateObj.getMonth()];
    if (monthlyExpenses[mName]) {
      monthlyExpenses[mName].expense += s.amount || 0;
      monthlyExpenses[mName].services += 1;
    }
  });

  utilities.forEach(u => {
    if (!u.timestamp) return;
    const dateObj = new Date(u.timestamp.split(' ')[0]);
    if (isNaN(dateObj.getTime())) return;
    const mName = monthNames[dateObj.getMonth()];
    if (monthlyExpenses[mName]) {
      monthlyExpenses[mName].expense += u.amount || 0;
      monthlyExpenses[mName].utilities += 1;
    }
  });

  const chartData = Object.values(monthlyExpenses);

  // Pie chart for status distribution
  const pieData = [
    { name: 'Completed', value: totalCompleted },
    { name: 'In Progress', value: services.filter(s => s.status === 'Work Started' || s.status === 'Service Created').length },
    { name: 'Bill Processing', value: services.filter(s => s.status === 'Bill Received' || s.status === 'Work Completed').length },
    { name: 'Payment Pending', value: paymentPending }
  ].filter(item => item.value > 0);

  // Recent combined services and utilities
  const recentActivities = [
    ...services.map(s => ({ ...s, type: 'Service' })),
    ...utilities.map(u => ({ ...u, type: 'Utility', vendor: u.payTo, checker: u.personName, location: u.department }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

  // Calculate completion rate
  const totalItems = services.length + utilities.length;
  const completionRate = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  // Get status badge color
  const getStatusColor = (status) => {
    const statusMap = {
      'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Payment Pending': 'bg-red-100 text-red-700 border-red-200',
      'Bill Received': 'bg-blue-100 text-blue-700 border-blue-200',
      'Work Started': 'bg-amber-100 text-amber-700 border-amber-200',
      'Service Created': 'bg-gray-100 text-gray-700 border-gray-200',
      'Approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Approval': 'bg-amber-100 text-amber-700 border-amber-200',
      'Paid': 'bg-blue-100 text-blue-700 border-blue-200',
      'Tally Pending': 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time insights from your business operations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: '#f2f5ea', borderColor: '#c6d4a0' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4a5c2a' }}></div>
            <span className="text-xs font-semibold" style={{ color: '#4a5c2a' }}>Live</span>
          </div>
          <div className="px-4 py-2 text-white rounded-xl text-sm font-bold shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4a5c2a 0%, #5d7234 100%)', boxShadow: '0 4px 14px rgba(74,92,42,0.35)' }}>
            {completionRate}% Complete
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard colorIdx={0}
          title="Total Pending"
          value={totalPending}
          icon={Clock}
          subtitle={`${totalPendingServices} Services · ${totalPendingUtilities} Utilities`}
          trend={trends.pending.trend}
          trendValue={trends.pending.value}
        />
        <StatCard colorIdx={1}
          title="Total Completed"
          value={totalCompleted}
          icon={CheckCircle2}
          subtitle={`${totalCompletedServices} Services · ${totalCompletedUtilities} Utilities`}
          trend={trends.completed.trend}
          trendValue={trends.completed.value}
        />
        <StatCard colorIdx={2}
          title="Payment Pending"
          value={paymentPending}
          icon={IndianRupee}
          subtitle={`${paymentPendingServices} services awaiting payment`}
          trend={trends.payment.trend}
          trendValue={trends.payment.value}
        />
        <StatCard colorIdx={3}
          title="Utility Pending"
          value={utilityPending}
          icon={Zap}
          subtitle="Office & utility expenses"
          trend={trends.utility.trend}
          trendValue={trends.utility.value}
        />
      </div>

      {/* Interactive Workflow Pipelines */}
      <WorkflowVisualizer 
        offers={offers} 
        services={services} 
        utilities={utilities} 
        loading={loading} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900">Expense Overview</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Total recorded: {formatCurrency(totalExpenses)}</p>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#4a5c2a' }}></div>
                <span className="text-[10px] font-semibold" style={{ color: '#4a5c2a' }}>Expenses</span>
              </div>
              <span className="rounded-lg px-3 py-1 text-[10px] font-semibold border"
                style={{ background: '#f2f5ea', borderColor: '#c6d4a0', color: '#5d7234' }}>
                Last 6 Months
              </span>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4a5c2a" stopOpacity={0.22}/>
                    <stop offset="95%" stopColor="#4a5c2a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eedd" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#7a9445', fontSize: 11, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#7a9445', fontSize: 11, fontWeight: 600}} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Expense']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #c6d4a0',
                    boxShadow: '0 10px 24px rgba(74,92,42,0.12)',
                    backgroundColor: 'white'
                  }}
                />
                <Area type="monotone" dataKey="expense" stroke="#4a5c2a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6">Status Distribution</h3>
          <div className="h-64 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid #e5e7eb',
                      backgroundColor: 'white'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>
          <div className="space-y-2.5 mt-4">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full transition-transform group-hover:scale-110" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs text-gray-600 font-medium">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-full">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Table Preview */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">Recent Activity</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Latest services and utility expenses</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
            <Activity size={14} className="text-gray-400" />
            <span>Updated live from Google Sheets</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vendor/Payee</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentActivities.map((act, index) => (
                <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border"
                      style={act.type === 'Service'
                        ? { background: '#f2f5ea', color: '#4a5c2a', borderColor: '#c6d4a0' }
                        : { background: 'linear-gradient(135deg,#4a5c2a,#5d7234)', color: 'white', borderColor: '#4a5c2a' }
                      }>
                      {act.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono font-semibold text-gray-900">{act.id}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">{act.vendor || act.payTo || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{act.location || act.department || '—'}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(act.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold border",
                      getStatusColor(act.status)
                    )}>
                      {act.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentActivities.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                        <Activity size={20} className="text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">No recent activity found</p>
                      <p className="text-xs text-gray-300">Start by adding your first service or utility entry</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
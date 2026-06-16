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
  Loader2
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
  Cell
} from 'recharts';
import useDataStore from '../store/useDataStore';
import { cn, formatCurrency } from '../lib/utils';
import WorkflowVisualizer from '../components/dashboard/WorkflowVisualizer';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-2 font-medium">{subtitle}</p>
        )}
      </div>
      <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", color)}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { services, utilities, offers, loading } = useDataStore();

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-medium text-sm animate-pulse">Loading dashboard overview...</p>
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

  // Group expenses by month for the chart
  const monthlyExpenses = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Pre-fill last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mName = monthNames[d.getMonth()];
    monthlyExpenses[mName] = { name: mName, expense: 0, services: 0 };
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
    }
  });

  const chartData = Object.values(monthlyExpenses);

  // Pie chart for status distribution
  const pieData = [
    { name: 'Completed', value: totalCompleted },
    { name: 'Pending Work', value: services.filter(s => s.status === 'Work Started' || s.status === 'Service Created').length },
    { name: 'Bill Processing', value: services.filter(s => s.status === 'Bill Received' || s.status === 'Work Completed').length },
    { name: 'Payment Pending', value: paymentPending }
  ].filter(item => item.value > 0);

  // Recent combined services and utilities
  const recentActivities = [
    ...services.map(s => ({ ...s, type: 'Service' })),
    ...utilities.map(u => ({ ...u, type: 'Utility', vendor: u.payTo, checker: u.personName, location: u.department }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500">Overall control center with real-time Google Sheets metrics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Pending" 
          value={totalPending} 
          icon={Clock} 
          color="bg-amber-500"
          subtitle={`${totalPendingServices} Services & ${totalPendingUtilities} Utilities`}
        />
        <StatCard 
          title="Total Completed" 
          value={totalCompleted} 
          icon={CheckCircle2} 
          color="bg-emerald-600"
          subtitle={`${totalCompletedServices} Services & ${totalCompletedUtilities} Utilities`}
        />
        <StatCard 
          title="Payment Pending" 
          value={paymentPending} 
          icon={IndianRupee} 
          color="bg-red-500"
          subtitle={`${paymentPendingServices} Services & ${paymentPendingUtilities} Utilities`}
        />
        <StatCard 
          title="Utility Pending" 
          value={utilityPending} 
          icon={Zap} 
          color="bg-blue-600"
          subtitle={`Recurring office & utility expenses`}
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
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900">Expense Overview</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Total recorded: {formatCurrency(totalExpenses)}</p>
            </div>
            <span className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500 font-medium">
              Last 6 Months
            </span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Expense']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="expense" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Status Breakdown</h3>
          <div className="h-64 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm">No data available</p>
            )}
          </div>
          <div className="space-y-3 mt-4">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs text-slate-600">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Recent Services & Utility Expenses</h3>
          <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
            <Activity size={14} />
            <span>Updated Live</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reference No</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor/Payee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location/Dept</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentActivities.map((act, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                      act.type === 'Service' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-purple-50 text-purple-600 border border-purple-100"
                    )}>
                      {act.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{act.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{act.vendor || act.payTo}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{act.location}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(act.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold",
                      act.status === 'Completed' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {act.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentActivities.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                    No recent activity found. Click on the sidebar to add records.
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

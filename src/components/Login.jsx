import React, { useState } from 'react';
import { Shield, Zap, BarChart3, Lock, User } from 'lucide-react';

const LogoMark = ({ size = 40 }) => (
  <img src="/logo.png" alt="logo" width={size} height={size} style={{ objectFit: 'contain' }} />
);

/* Animated floating orbs for left panel */
const Orb = ({ style }) => (
  <div className="absolute rounded-full pointer-events-none" style={style} />
);

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const apiUrl = import.meta.env.VITE_APPSCRIPT_URL;
      const response = await fetch(`${apiUrl}?sheet=Login`);
      const result = await response.json();

      if (!result.success || !result.data || result.data.length < 2)
        throw new Error('Invalid response or empty database.');

      const headers     = result.data[0];
      const nameIdx     = headers.indexOf('Name');
      const usernameIdx = headers.indexOf('Username');
      const passwordIdx = headers.indexOf('Password');
      const roleIdx     = headers.indexOf('Role');
      const firmNameIdx = headers.indexOf('Firm Name');
      const pagesIdx    = headers.indexOf('Pages');
      const tabsIdx     = headers.indexOf('Tabs');

      if (usernameIdx === -1 || passwordIdx === -1)
        throw new Error('Database missing Username or Password column.');

      const matchedRow = result.data.slice(1).find(r =>
        String(r[usernameIdx]) === username && String(r[passwordIdx]) === password
      );

      if (matchedRow) {
        onLogin({
          name:     nameIdx !== -1     ? matchedRow[nameIdx]     : username,
          username: matchedRow[usernameIdx],
          role:     roleIdx !== -1     ? matchedRow[roleIdx]     : 'User',
          firmName: firmNameIdx !== -1 ? matchedRow[firmNameIdx] : '',
          pages:    pagesIdx !== -1    ? matchedRow[pagesIdx]    : 'All',
          tabs:     tabsIdx !== -1     ? matchedRow[tabsIdx]     : 'All',
          email:    `${matchedRow[usernameIdx]}@servicefms.com`,
          avatar:   `https://api.dicebear.com/7.x/avataaars/svg?seed=${matchedRow[usernameIdx]}`,
        });
      } else {
        setError('Invalid username or password. Please try again.');
      }
    } catch (err) {
      setError('Connection failed. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{
      background: 'linear-gradient(135deg, #060e1f 0%, #0a1628 30%, #0f2444 65%, #162d4a 100%)'
    }}>

      {/* ── Decorative orbs ── */}
      <Orb style={{ top: '-8rem', left: '-8rem', width: '36rem', height: '36rem',
        background: 'radial-gradient(circle, rgba(30,58,95,0.7) 0%, transparent 70%)', filter: 'blur(1px)' }} />
      <Orb style={{ bottom: '-6rem', right: '30%', width: '28rem', height: '28rem',
        background: 'radial-gradient(circle, rgba(59,130,176,0.25) 0%, transparent 70%)' }} />
      <Orb style={{ top: '20%', right: '10%', width: '20rem', height: '20rem',
        background: 'radial-gradient(circle, rgba(99,179,237,0.12) 0%, transparent 70%)' }} />

      {/* ════════════ LEFT PANEL ════════════ */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] p-14 relative z-10"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5282 100%)', boxShadow: '0 8px 32px rgba(30,58,95,0.7), inset 0 1px 0 rgba(255,255,255,0.12)' }}>
              <LogoMark size={30} color="white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2"
              style={{ borderColor: '#060e1f' }} />
          </div>
          <div>
            <span className="text-white font-extrabold text-base tracking-tight block leading-tight">Service FMS</span>
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#63b3ed' }}>Enterprise</span>
          </div>
        </div>

        {/* Main pitch */}
        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-7"
              style={{ background: 'rgba(99,179,237,0.10)', border: '1px solid rgba(99,179,237,0.22)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold" style={{ color: '#90cdf4' }}>Live sync · Google Sheets</span>
            </div>

            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-[-0.03em] mb-5">
              Manage smarter,<br />
              <span style={{
                background: 'linear-gradient(90deg, #63b3ed, #93c5fd, #818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>grow faster.</span>
            </h1>

            <p className="text-white/40 text-[15px] leading-relaxed max-w-sm">
              Services, bills, payments and tally — all unified in a single real-time platform.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { icon: Shield, label: 'Role-based access control', sub: 'Granular page & tab permissions' },
              { icon: Zap,    label: 'Real-time Google Sheets sync', sub: 'No delay, no refresh needed' },
              { icon: BarChart3, label: 'Complete audit trail', sub: 'Bills, tally and payment history' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3.5 p-3.5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(99,179,237,0.12)' }}>
                  <Icon size={16} style={{ color: '#63b3ed' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex gap-8 pt-2">
            {[
              { v: '9+',    l: 'Modules' },
              { v: '100%',  l: 'Live Sync' },
              { v: '99.9%', l: 'Uptime' },
            ].map(({ v, l }) => (
              <div key={l}>
                <div className="text-2xl font-black text-white tracking-tight">{v}</div>
                <div className="text-[10px] font-semibold mt-0.5 uppercase tracking-widest" style={{ color: '#63b3ed' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>© 2026 Service FMS Enterprise. All rights reserved.</p>
      </div>

      {/* ════════════ RIGHT PANEL — FORM ════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5282)', boxShadow: '0 6px 20px rgba(30,58,95,0.5)' }}>
              <LogoMark size={26} color="white" />
            </div>
            <span className="text-white font-extrabold text-lg">Service FMS</span>
          </div>

          {/* Glass card */}
          <div style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '24px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,1)',
            border: '1px solid rgba(255,255,255,0.5)',
            overflow: 'hidden',
          }}>

            {/* Top accent stripe */}
            <div style={{
              height: '3px',
              background: 'linear-gradient(90deg, #0f2444 0%, #1e3a5f 25%, #3b82b0 50%, #63b3ed 75%, #818cf8 100%)',
            }} />

            <div className="p-9">

              {/* Avatar / logo mark */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative mb-4">
                  <div className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5282 100%)',
                      boxShadow: '0 12px 32px rgba(30,58,95,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}>
                    <LogoMark size={44} color="white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: '#ecfdf5', border: '2px solid white' }}>
                    <Lock size={10} style={{ color: '#059669' }} />
                  </div>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#0c1a2e' }}>Welcome back</h2>
                <p className="text-[13px] mt-1 font-medium" style={{ color: '#94a3b8' }}>Sign in to Service FMS</p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
                  <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-[9px] font-black">!</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#be123c' }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Username field */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.1em] mb-2"
                    style={{ color: '#1e3a5f' }}>Username</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: '#94a3b8' }} />
                    <input
                      type="text" required disabled={isLoading}
                      value={username} onChange={e => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all disabled:opacity-50"
                      style={{ border: '1.5px solid #e2e8f0', background: '#f8faff', color: '#0f172a', outline: 'none' }}
                      onFocus={e => { e.target.style.borderColor = '#1e3a5f'; e.target.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.10)'; e.target.style.background = 'white'; e.target.previousSibling.style.color = '#1e3a5f'; }}
                      onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8faff'; e.target.previousSibling.style.color = '#94a3b8'; }}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.1em] mb-2"
                    style={{ color: '#1e3a5f' }}>Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: '#94a3b8' }} />
                    <input
                      type="password" required disabled={isLoading}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all disabled:opacity-50"
                      style={{ border: '1.5px solid #e2e8f0', background: '#f8faff', color: '#0f172a', outline: 'none' }}
                      onFocus={e => { e.target.style.borderColor = '#1e3a5f'; e.target.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.10)'; e.target.style.background = 'white'; e.target.previousSibling.style.color = '#1e3a5f'; }}
                      onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8faff'; e.target.previousSibling.style.color = '#94a3b8'; }}
                    />
                  </div>
                </div>

                {/* Remember + forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: '#1e3a5f' }} />
                    <span className="text-xs font-medium" style={{ color: '#64748b' }}>Remember me</span>
                  </label>
                  <a href="#" className="text-xs font-bold transition-colors"
                    style={{ color: '#1e3a5f' }}
                    onMouseEnter={e => e.currentTarget.style.color='#3b82b0'}
                    onMouseLeave={e => e.currentTarget.style.color='#1e3a5f'}>
                    Forgot password?
                  </a>
                </div>

                {/* Submit */}
                <button
                  type="submit" disabled={isLoading}
                  className="w-full py-3.5 rounded-xl text-white text-sm font-bold tracking-wide transition-all active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #0f2444 0%, #1e3a5f 45%, #2d5282 100%)',
                    boxShadow: '0 8px 28px rgba(30,58,95,0.48), inset 0 1px 0 rgba(255,255,255,0.12)',
                    marginTop: '8px',
                  }}
                  onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.boxShadow = '0 12px 36px rgba(30,58,95,0.60), inset 0 1px 0 rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(30,58,95,0.48), inset 0 1px 0 rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/8 to-transparent pointer-events-none" />
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 mt-7">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #e2e8f0)' }} />
                <span className="text-[11px] font-semibold px-2" style={{ color: '#cbd5e1' }}>Secure Login</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #e2e8f0, transparent)' }} />
              </div>

              {/* Footer note */}
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <Lock size={11} style={{ color: '#94a3b8' }} />
                <p className="text-[11px] text-center" style={{ color: '#94a3b8' }}>
                  Contact your <span className="font-bold" style={{ color: '#1e3a5f' }}>system administrator</span> for access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

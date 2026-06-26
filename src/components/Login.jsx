import React, { useState } from 'react';

/* Bold "S" logo — navy color for light bg, white for dark bg */
const LogoSVG = ({ size = 56, color = "#1e3a5f" }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
    <text x="28" y="43" fontFamily="Arial Black, Arial, sans-serif" fontSize="46" fontWeight="900"
      textAnchor="middle" fill={color} letterSpacing="-2">S</text>
  </svg>
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

      if (!result.success || !result.data || result.data.length < 2) {
        throw new Error('Invalid response or empty database.');
      }

      const headers = result.data[0];
      const nameIdx      = headers.indexOf('Name');
      const usernameIdx  = headers.indexOf('Username');
      const passwordIdx  = headers.indexOf('Password');
      const roleIdx      = headers.indexOf('Role');
      const firmNameIdx  = headers.indexOf('Firm Name');
      const pagesIdx     = headers.indexOf('Pages');
      const tabsIdx      = headers.indexOf('Tabs');

      if (usernameIdx === -1 || passwordIdx === -1) {
        throw new Error('Database is missing Username or Password column.');
      }

      const rows = result.data.slice(1);
      const matchedUserRow = rows.find(row =>
        String(row[usernameIdx]) === username &&
        String(row[passwordIdx]) === password
      );

      if (matchedUserRow) {
        onLogin({
          name:      nameIdx !== -1      ? matchedUserRow[nameIdx]     : username,
          username:  matchedUserRow[usernameIdx],
          role:      roleIdx !== -1      ? matchedUserRow[roleIdx]     : 'User',
          firmName:  firmNameIdx !== -1  ? matchedUserRow[firmNameIdx] : '',
          pages:     pagesIdx !== -1     ? matchedUserRow[pagesIdx]    : 'All',
          tabs:      tabsIdx !== -1      ? matchedUserRow[tabsIdx]     : 'All',
          email:     `${matchedUserRow[usernameIdx]}@servicefms.com`,
          avatar:    `https://api.dicebear.com/7.x/avataaars/svg?seed=${matchedUserRow[usernameIdx]}`,
        });
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0f2444 40%, #1e3a5f 100%)' }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-14 relative overflow-hidden"
        style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #63b3ed, transparent)' }} />
        <div className="absolute bottom-10 right-0 w-96 h-96 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #3b82b0, transparent)' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5282)', boxShadow: '0 8px 24px rgba(30,58,95,0.6)' }}>
            <LogoSVG size={28} color="white" />
          </div>
          <div>
            <span className="text-white font-bold text-base tracking-tight block">Service FMS</span>
            <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#63b3ed' }}>Enterprise</span>
          </div>
        </div>

        {/* Main text */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(99,179,237,0.12)', border: '1px solid rgba(99,179,237,0.25)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#63b3ed' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#90cdf4' }}>Live • Synced with Google Sheets</span>
          </div>
          <h1 className="text-[2.6rem] font-extrabold text-white leading-tight mb-5 tracking-tight">
            Your business,<br />
            <span style={{ color: '#63b3ed' }}>organized.</span>
          </h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-sm">
            Manage offers, services, bills, payments and utilities — all in one platform, updated in real-time.
          </p>

          {/* Mini stats */}
          <div className="flex gap-4 mt-10">
            {[
              { label: 'Modules', value: '9+' },
              { label: 'Live Sync', value: '100%' },
              { label: 'Uptime', value: '99.9%' },
            ].map(s => (
              <div key={s.label} className="flex flex-col">
                <span className="text-2xl font-extrabold text-white">{s.value}</span>
                <span className="text-[10px] font-medium mt-0.5" style={{ color: '#63b3ed' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/15 text-xs relative z-10">© 2026 Service FMS Enterprise. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5282)' }}>
              <LogoSVG size={26} color="white" />
            </div>
            <span className="text-white font-bold text-lg">Service FMS</span>
          </div>

          {/* Card */}
          <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'white' }}>

            {/* Top gradient bar */}
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #162d4a, #1e3a5f, #3b82b0, #2d5282)' }} />

            <div className="p-9">
              {/* Logo + heading */}
              <div className="flex flex-col items-center mb-7">
                <div className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', boxShadow: '0 4px 16px rgba(30,58,95,0.15)', border: '1.5px solid #bfdbfe' }}>
                  <LogoSVG size={42} />
                </div>
                <h2 className="text-[1.5rem] font-extrabold tracking-tight" style={{ color: '#0f172a' }}>Welcome back</h2>
                <p className="text-[13px] mt-1" style={{ color: '#94a3b8' }}>Sign in to your Service FMS account</p>
              </div>

              {/* Error banner */}
              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm text-center font-medium"
                  style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#1e3a5f' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-4 py-3 rounded-xl text-sm disabled:opacity-50 transition-all"
                    style={{ border: '1.5px solid #bfdbfe', background: '#f8faff', color: '#0f172a', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = '#1e3a5f'; e.target.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.12)'; e.target.style.background = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8faff'; }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#1e3a5f' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-xl text-sm disabled:opacity-50 transition-all"
                    style={{ border: '1.5px solid #bfdbfe', background: '#f8faff', color: '#0f172a', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = '#1e3a5f'; e.target.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.12)'; e.target.style.background = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8faff'; }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: '#1e3a5f' }} />
                    <span className="text-xs" style={{ color: '#64748b' }}>Remember me</span>
                  </label>
                  <a href="#" className="text-xs font-semibold" style={{ color: '#1e3a5f' }}>
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl text-white text-sm font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  style={{
                    background: 'linear-gradient(135deg, #162d4a 0%, #1e3a5f 50%, #2d5282 100%)',
                    boxShadow: '0 8px 24px rgba(30,58,95,0.45)'
                  }}
                  onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.boxShadow = '0 10px 28px rgba(30,58,95,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(30,58,95,0.45)'; e.currentTarget.style.transform = 'none'; }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign In →'}
                </button>
              </form>

              <div className="flex items-center gap-3 mt-7">
                <div className="flex-1 h-px" style={{ background: '#dbeafe' }} />
                <span className="text-[11px] font-medium" style={{ color: '#94a3b8' }}>Need access?</span>
                <div className="flex-1 h-px" style={{ background: '#dbeafe' }} />
              </div>
              <p className="text-center text-xs mt-3" style={{ color: '#94a3b8' }}>
                Contact your <span className="font-semibold" style={{ color: '#1e3a5f' }}>system administrator</span> to get an account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';

const LogoMark = ({ size = 48 }) => (
  <img src="/logo.png" alt="logo" width={size} height={size} style={{ objectFit: 'contain' }} />
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f2f5ec]">
      <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 sm:p-10">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-10">
             <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br from-[#3a4820] to-[#4a5c2a] shadow-lg shadow-[#4a5c2a]/30">
               <LogoMark size={36} />
             </div>
             <h2 className="text-2xl font-black text-gray-900 tracking-tight">Service FMS</h2>
             <p className="text-sm font-semibold text-gray-500 mt-1 uppercase tracking-widest"></p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold text-center">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Username</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" required disabled={isLoading}
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#4a5c2a]/20 focus:border-[#4a5c2a] transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password" required disabled={isLoading}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#4a5c2a]/20 focus:border-[#4a5c2a] transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full py-4 mt-2 bg-gradient-to-r from-[#3a4820] to-[#4a5c2a] hover:from-[#2c3618] hover:to-[#3a4820] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#4a5c2a]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign In to Account'}
            </button>
          </form>

          {/* Footer Note */}
          <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-center gap-2">
            <Lock size={12} className="text-gray-400" />
            <p className="text-xs font-medium text-gray-500">
              Contact your <span className="font-bold text-gray-700">administrator</span> for access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

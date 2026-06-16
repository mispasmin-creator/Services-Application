import React, { useState } from 'react';

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
      
      // Match headers exactly to find indices
      const nameIdx = headers.indexOf('Name');
      const usernameIdx = headers.indexOf('Username');
      const passwordIdx = headers.indexOf('Password');
      const roleIdx = headers.indexOf('Role');
      const firmNameIdx = headers.indexOf('Firm Name');

      if (usernameIdx === -1 || passwordIdx === -1) {
        throw new Error('Database is missing Username or Password column.');
      }

      // Skip header, search user rows
      const rows = result.data.slice(1);
      const matchedUserRow = rows.find(row => 
        String(row[usernameIdx]) === username && 
        String(row[passwordIdx]) === password
      );

      if (matchedUserRow) {
        const userData = {
          name: nameIdx !== -1 ? matchedUserRow[nameIdx] : username,
          username: matchedUserRow[usernameIdx],
          role: roleIdx !== -1 ? matchedUserRow[roleIdx] : 'User',
          firmName: firmNameIdx !== -1 ? matchedUserRow[firmNameIdx] : '',
          email: `${matchedUserRow[usernameIdx]}@servicefms.com`, // Default derived email
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${matchedUserRow[usernameIdx]}`,
        };
        onLogin(userData);
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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-xl p-10 rounded-2xl border border-white/20 shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
            Service FMS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Sign in to access your dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-2 rounded-lg text-sm text-center animate-pulse">
              {error}
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                disabled={isLoading}
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-white/10 bg-white/5 placeholder-gray-400 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all sm:text-sm disabled:opacity-50"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-white/10 bg-white/5 placeholder-gray-400 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all sm:text-sm disabled:opacity-50"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all shadow-lg hover:shadow-purple-500/25 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

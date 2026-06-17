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
      const pagesIdx = headers.indexOf('Pages');
      const tabsIdx = headers.indexOf('Tabs');

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
          pages: pagesIdx !== -1 ? matchedUserRow[pagesIdx] : 'All',
          tabs: tabsIdx !== -1 ? matchedUserRow[tabsIdx] : 'All',
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white shadow-2xl rounded-2xl p-10 border border-gray-200">
        <div>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gray-900 flex items-center justify-center">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-center text-3xl font-bold text-gray-900 tracking-tight">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                disabled={isLoading}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all sm:text-sm disabled:opacity-50 disabled:bg-gray-50"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all sm:text-sm disabled:opacity-50 disabled:bg-gray-50"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-gray-900 hover:text-gray-700 transition-colors">
                Forgot password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
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

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="#" className="font-medium text-gray-900 hover:text-gray-700 transition-colors">
                Contact admin
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 
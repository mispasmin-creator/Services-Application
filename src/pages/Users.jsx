import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Mail, Shield, UserCircle, 
  MoreHorizontal, Loader2, AlertCircle, X, 
  Save, Edit2, Lock, ShieldAlert, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../components/ui';
import useAuthStore from '../store/useAuthStore';
import useDataStore from '../store/useDataStore';
import { cn } from '../lib/utils';

const Users = () => {
  const { user: currentUser } = useAuthStore();
  const { firms, fetchData: fetchMasterData } = useDataStore();
  const [users, setUsers] = useState([]);
  const availableFirms = firms && firms.length > 0 ? firms : ['Pmmpl', 'Rkl', 'Purab'];
  const [headers, setHeaders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Form State
  const [formUser, setFormUser] = useState({
    rowIndex: null,
    name: '',
    username: '',
    password: '',
    role: 'User',
    firmName: 'All'
  });

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const apiUrl = import.meta.env.VITE_APPSCRIPT_URL;
      const response = await fetch(`${apiUrl}?sheet=Login`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const sheetHeaders = result.data[0];
        setHeaders(sheetHeaders);
        
        const nameIdx = sheetHeaders.indexOf('Name');
        const usernameIdx = sheetHeaders.indexOf('Username');
        const roleIdx = sheetHeaders.indexOf('Role');
        const passwordIdx = sheetHeaders.indexOf('Password');
        const firmNameIdx = sheetHeaders.indexOf('Firm Name');

        const mappedUsers = result.data.slice(1).map((row, index) => ({
          id: `USR-${index + 1}`,
          // row index in spreadsheet = array index starting after slice (index) + 1 (skipped header) + 1 (1-based counting) = index + 2
          sheetRowIndex: index + 2, 
          name: nameIdx !== -1 ? String(row[nameIdx]) : '',
          username: usernameIdx !== -1 ? String(row[usernameIdx]) : '',
          role: roleIdx !== -1 ? String(row[roleIdx]) : 'User',
          password: passwordIdx !== -1 ? String(row[passwordIdx]) : '',
          firmName: firmNameIdx !== -1 ? String(row[firmNameIdx]) : 'All',
          email: usernameIdx !== -1 ? `${row[usernameIdx]}@servicefms.com` : 'no-email',
        }));

        setUsers(mappedUsers);
      } else {
        throw new Error("Unable to parse user data.");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load user accounts. Please verify your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchMasterData();
    }
  }, [isAdmin, fetchMasterData]);

  const handleOpenAddModal = () => {
    setModalMode('add');
    setFormUser({ rowIndex: null, name: '', username: '', password: '', role: 'User', firmName: 'All' });
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setModalMode('edit');
    setFormUser({
      rowIndex: user.sheetRowIndex,
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
      firmName: user.firmName || 'All'
    });
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Basic validations
    if (!formUser.name || !formUser.username || !formUser.password || !formUser.role || !formUser.firmName) {
      setSaveError('All fields are required.');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const apiUrl = import.meta.env.VITE_APPSCRIPT_URL;
      
      // Construct row array based on precise header order retrieved earlier
      const rowDataArray = headers.map(header => {
        if (header === 'Name') return formUser.name;
        if (header === 'Username') return formUser.username;
        if (header === 'Password') return formUser.password;
        if (header === 'Role') return formUser.role;
        if (header === 'Firm Name') return formUser.firmName;
        return ''; // For unused columns if any
      });

      // Prepare request body
      const params = new URLSearchParams();
      params.append('sheetName', 'Login');
      
      if (modalMode === 'add') {
        params.append('action', 'insert');
        params.append('rowData', JSON.stringify(rowDataArray));
      } else {
        params.append('action', 'update');
        params.append('rowIndex', formUser.rowIndex);
        params.append('rowData', JSON.stringify(rowDataArray));
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Note: Fetch redirects will be automatically followed. Apps Script usually responds with JSON
      const result = await response.json();

      if (result.success) {
        setIsModalOpen(false);
        await fetchUsers(); // Refresh grid after modification
      } else {
        throw new Error(result.error || 'Failed to process transaction.');
      }
    } catch (err) {
      console.error('Save operation error:', err);
      setSaveError('Failed to save changes. Make sure the user credentials provided are correct.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render Block for Restricted Access
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100 shadow-sm">
          <ShieldAlert size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600 max-w-md mb-8">
          Only administrators are authorized to access, create, or modify configurations on this module.
        </p>
        <a 
          href="/dashboard" 
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium shadow-lg shadow-slate-900/10 transition-all active:scale-95 flex items-center gap-2"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && users.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-medium">Loading user ecosystem...</p>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-red-500 gap-3">
        <AlertCircle size={40} className="opacity-50" />
        <h3 className="text-xl font-bold text-slate-800">System Outage</h3>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
        <button 
          onClick={fetchUsers} 
          className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium shadow-md hover:bg-slate-800 active:scale-95 transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">Provision access, manage credential profiles, and control platform authorization tiers.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 font-semibold"
        >
          <Plus size={18} />
          <span>Invite User</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Filter members by identity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* User Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group relative overflow-hidden">
            
            {/* Operations Dropdown / Edit button */}
            <button 
              onClick={() => handleOpenEditModal(user)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
              title="Edit configuration"
            >
              <Edit2 size={16} />
            </button>
            
            {/* Context Marker Stripe */}
            <div className={`absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5 ${user.role.toLowerCase() === 'admin' ? 'bg-indigo-600' : 'bg-cyan-500'}`} />

            <div className="flex items-center gap-4 mb-6 mt-2">
              <div className="relative">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                  alt={user.name}
                  className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-0.5 shadow-inner object-cover"
                />
                {user.role.toLowerCase() === 'admin' && (
                  <div className="absolute -top-2 -right-2 bg-indigo-600 text-white p-1 rounded-lg shadow-md border-2 border-white">
                    <Shield size={10} fill="currentColor" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-lg truncate">
                  {user.name}
                </h3>
                <p className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-0.5 uppercase tracking-wider">
                  @{user.username}
                </p>
              </div>
            </div>

            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                  <Mail size={14} />
                </div>
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                  <Lock size={14} />
                </div>
                <span className="font-mono text-xs text-slate-400">••••••••</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                  <Building2 size={14} />
                </div>
                <span className="font-medium text-slate-800">{user.firmName || 'All'}</span>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-dashed border-slate-200 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Privileges</span>
                <span className="text-sm font-bold text-slate-800">{user.role}</span>
              </div>
              <Badge variant={user.role.toLowerCase() === 'admin' ? 'info' : 'default'} className="font-bold">
                {user.role.toLowerCase() === 'admin' ? 'Full Admin' : 'Verified User'}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && !isLoading && (
        <div className="text-center py-20 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl">
          <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm border border-slate-100 mb-4 text-slate-300">
            <UserCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Zero results mapped</h3>
          <p className="text-slate-500 mt-1">Refine your search filters or parameters.</p>
        </div>
      )}

      {/* Modal Implementation with Framer Motion */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {modalMode === 'add' ? 'Invite New User' : 'Edit Platform Member'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Update permissions and credentials</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form content */}
              <form onSubmit={handleSave} className="p-6 space-y-5">
                {saveError && (
                  <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-3.5 rounded-xl flex items-start gap-2.5">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Display Name</label>
                  <input 
                    type="text" 
                    required
                    disabled={isSaving}
                    value={formUser.name}
                    onChange={e => setFormUser({...formUser, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-60 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Username</label>
                    <input 
                      type="text" 
                      required
                      disabled={isSaving}
                      value={formUser.username}
                      onChange={e => setFormUser({...formUser, username: e.target.value})}
                      placeholder="johnd"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-60 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Authentication</label>
                    <input 
                      type="text" 
                      required
                      disabled={isSaving}
                      value={formUser.password}
                      onChange={e => setFormUser({...formUser, password: e.target.value})}
                      placeholder="Secure password"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-60 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Authorization Access</label>
                  <select
                    disabled={isSaving}
                    value={formUser.role}
                    onChange={e => setFormUser({...formUser, role: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-60 font-medium appearance-none"
                  >
                    <option value="User">User (Standard Operations)</option>
                    <option value="Admin">Admin (Global Root Privileges)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={14} className="text-blue-500" />
                    <span>Assign Firms *</span>
                  </label>
                  
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 max-h-48 overflow-y-auto">
                    {/* "All" Checkbox */}
                    <label className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-100/60 rounded-xl transition-colors cursor-pointer select-none">
                      <input
                        type="checkbox"
                        disabled={isSaving}
                        checked={formUser.firmName === 'All'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormUser({ ...formUser, firmName: 'All' });
                          } else {
                            setFormUser({ ...formUser, firmName: '' });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-slate-350 focus:ring-blue-500/30 cursor-pointer"
                      />
                      <span className="text-sm font-bold text-slate-800">All (Access to All Firms)</span>
                    </label>

                    {/* Divider */}
                    <div className="border-t border-slate-200/60 my-1" />

                    {/* Available Firms List */}
                    <div className="grid grid-cols-2 gap-2">
                      {availableFirms.map((firm) => {
                        const isChecked = formUser.firmName === 'All' || 
                          formUser.firmName.split(',').map(f => f.trim().toLowerCase()).includes(firm.toLowerCase());
                        
                        return (
                          <label 
                            key={firm} 
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 border border-transparent hover:border-slate-200 hover:bg-white rounded-xl transition-all cursor-pointer select-none text-xs font-semibold text-slate-700",
                              isChecked && "bg-blue-50/40 border-blue-100 text-blue-800"
                            )}
                          >
                            <input
                              type="checkbox"
                              disabled={isSaving || formUser.firmName === 'All'}
                              checked={isChecked}
                              onChange={(e) => {
                                const currentFirms = formUser.firmName && formUser.firmName !== 'All'
                                  ? formUser.firmName.split(',').map(f => f.trim()).filter(Boolean)
                                  : [];
                                
                                let newFirmsList;
                                if (e.target.checked) {
                                  newFirmsList = [...currentFirms, firm];
                                } else {
                                  newFirmsList = currentFirms.filter(f => f.toLowerCase() !== firm.toLowerCase());
                                }
                                
                                // Join and update
                                setFormUser({ ...formUser, firmName: newFirmsList.join(', ') });
                              }}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-350 focus:ring-blue-500/20 cursor-pointer"
                            />
                            <span className="truncate">{firm}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2 transition-all disabled:opacity-70"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Committing Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>{modalMode === 'add' ? 'Authorize User' : 'Sync Updates'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;

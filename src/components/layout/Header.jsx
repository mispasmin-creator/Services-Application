import React from 'react';
import { Search, Bell, Moon, Sun, Plus, ChevronDown } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const Header = () => {
  const { user } = useAuthStore();
  const [isDark, setIsDark] = React.useState(false);

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search services, vendors, bills..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 font-medium">
          <Plus size={18} />
          <span>Quick Add</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

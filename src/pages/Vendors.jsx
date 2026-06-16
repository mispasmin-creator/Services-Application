import React from 'react';
import { Plus, Search, Mail, Phone, Globe, MoreHorizontal } from 'lucide-react';
import useDataStore from '../store/useDataStore';
import { Badge } from '../components/ui';

const Vendors = () => {
  const { vendors } = useDataStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Management</h1>
          <p className="text-slate-500">View and manage your service providers.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 font-medium">
          <Plus size={18} />
          <span>Add New Vendor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
            <button className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreHorizontal size={18} />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">
                {vendor.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{vendor.name}</h3>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{vendor.id}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={16} className="text-slate-400" />
                <span>{vendor.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={16} className="text-slate-400" />
                <span>{vendor.contact}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Globe size={16} className="text-slate-400" />
                <span>{vendor.location}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GST Number</span>
                <span className="text-sm font-semibold text-slate-700">{vendor.gst}</span>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Vendors;

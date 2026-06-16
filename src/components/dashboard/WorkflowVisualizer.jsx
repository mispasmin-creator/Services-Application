import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Wrench, Receipt, CreditCard, 
  Database, CheckCircle2, Zap, ArrowRight, 
  ExternalLink, Loader2, AlertCircle, PlayCircle
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

const WorkflowVisualizer = ({ offers = [], services = [], utilities = [], loading = false }) => {
  const navigate = useNavigate();
  const [workflowType, setWorkflowType] = useState('main'); // 'main' or 'utility'
  const [activeStep, setActiveStep] = useState(null); // Selected step ID to show list below

  // 1. MAIN BUSINESS WORKFLOW CLASSIFICATION
  const mainFlowData = {
    offer: {
      id: 'offer',
      label: 'Offer',
      description: 'Quotation review',
      icon: FileText,
      color: 'blue',
      items: offers.filter(o => o.status === 'Pending' || o.status === 'Approved'),
      targetPath: '/offers',
      actionLabel: 'Review Offer'
    },
    service: {
      id: 'service',
      label: 'Service',
      description: 'Active execution',
      icon: Wrench,
      color: 'indigo',
      items: services.filter(s => ['Service Created', 'Work Started', 'Work Completed'].includes(s.status)),
      targetPath: '/services',
      actionLabel: 'Edit Timeline'
    },
    bill: {
      id: 'bill',
      label: 'Bill',
      description: 'Awaiting verification',
      icon: Receipt,
      color: 'purple',
      items: services.filter(s => s.status === 'Bill Received'),
      targetPath: '/bills',
      actionLabel: 'Verify Bill'
    },
    payment: {
      id: 'payment',
      label: 'Payment',
      description: 'Payment release',
      icon: CreditCard,
      color: 'amber',
      items: services.filter(s => s.status === 'Payment Pending'),
      targetPath: '/payments',
      actionLabel: 'Release Payment'
    },
    tally: {
      id: 'tally',
      label: 'Tally',
      description: 'Accounting entry',
      icon: Database,
      color: 'pink',
      items: services.filter(s => s.status === 'Tally Pending'),
      targetPath: '/tally',
      actionLabel: 'Record Tally'
    },
    completed: {
      id: 'completed',
      label: 'Completed',
      description: 'Fully accounted',
      icon: CheckCircle2,
      color: 'emerald',
      items: services.filter(s => s.status === 'Completed'),
      targetPath: '/services',
      actionLabel: 'View Details'
    }
  };

  const mainFlowOrder = ['offer', 'service', 'bill', 'payment', 'tally', 'completed'];

  // 2. UTILITY FLOW CLASSIFICATION
  const utilityFlowData = {
    utilBill: {
      id: 'utilBill',
      label: 'Utility Bill',
      description: 'Uploaded invoices',
      icon: Zap,
      color: 'purple',
      items: utilities.filter(u => u.status === 'Bill Received'),
      targetPath: '/utility',
      actionLabel: 'Review Bill'
    },
    utilPayment: {
      id: 'utilPayment',
      label: 'Payment',
      description: 'Release funds',
      icon: CreditCard,
      color: 'amber',
      items: utilities.filter(u => u.status === 'Approved'),
      targetPath: '/payments',
      actionLabel: 'Pay Utility'
    },
    utilTally: {
      id: 'utilTally',
      label: 'Tally',
      description: 'Accounting voucher',
      icon: Database,
      color: 'pink',
      items: utilities.filter(u => u.status === 'Paid'),
      targetPath: '/tally',
      actionLabel: 'Record Tally'
    },
    utilCompleted: {
      id: 'utilCompleted',
      label: 'Completed',
      description: 'Vouchers recorded',
      icon: CheckCircle2,
      color: 'emerald',
      items: utilities.filter(u => u.status === 'Completed'),
      targetPath: '/utility',
      actionLabel: 'View Details'
    }
  };

  const utilityFlowOrder = ['utilBill', 'utilPayment', 'utilTally', 'utilCompleted'];

  // Get current active workflow details
  const isMain = workflowType === 'main';
  const flowOrder = isMain ? mainFlowOrder : utilityFlowOrder;
  const flowData = isMain ? mainFlowData : utilityFlowData;

  // Handle flow switch - reset active step
  const handleFlowSwitch = (type) => {
    setWorkflowType(type);
    setActiveStep(null);
  };

  // Get list of items for selected stage
  const selectedStage = activeStep ? flowData[activeStep] : null;
  const stageItems = selectedStage ? selectedStage.items : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
      
      {/* Title & Flow Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Interactive Business Pipelines</h3>
          <p className="text-xs text-slate-500 font-medium">Click on any pipeline stage to view, analyze and resolve active bottlenecks.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => handleFlowSwitch('main')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              isMain ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Main Workflow
          </button>
          <button
            onClick={() => handleFlowSwitch('utility')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              !isMain ? "bg-white text-purple-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Utility Flow
          </button>
        </div>
      </div>

      {/* Stepper Pipeline */}
      {loading ? (
        <div className="h-28 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-slate-400" size={24} />
          <span className="text-xs text-slate-400 font-medium">Calculating pipeline metrics...</span>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-center gap-2 min-w-[800px] justify-between px-1">
            {flowOrder.map((stepKey, idx) => {
              const step = flowData[stepKey];
              const StepIcon = step.icon;
              const count = step.items.length;
              const isSelected = activeStep === step.id;
              
              // Colors configuration
              const colorMaps = {
                blue: { border: 'hover:border-blue-300', active: 'border-blue-600 bg-blue-50/50 shadow-blue-50/50', badge: 'bg-blue-100 text-blue-800' },
                indigo: { border: 'hover:border-indigo-300', active: 'border-indigo-600 bg-indigo-50/50 shadow-indigo-50/50', badge: 'bg-indigo-100 text-indigo-800' },
                purple: { border: 'hover:border-purple-300', active: 'border-purple-600 bg-purple-50/50 shadow-purple-50/50', badge: 'bg-purple-100 text-purple-800' },
                amber: { border: 'hover:border-amber-300', active: 'border-amber-600 bg-amber-50/50 shadow-amber-50/50', badge: count > 0 ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-amber-100 text-amber-800' },
                pink: { border: 'hover:border-pink-300', active: 'border-pink-600 bg-pink-50/50 shadow-pink-50/50', badge: 'bg-pink-100 text-pink-800' },
                emerald: { border: 'hover:border-emerald-300', active: 'border-emerald-600 bg-emerald-50/50 shadow-emerald-50/50', badge: 'bg-emerald-100 text-emerald-800' }
              };
              
              const colors = colorMaps[step.color] || colorMaps.blue;

              return (
                <React.Fragment key={step.id}>
                  {/* Step Card */}
                  <button
                    onClick={() => setActiveStep(isSelected ? null : step.id)}
                    className={cn(
                      "flex-1 text-left p-4 rounded-2xl border transition-all cursor-pointer group select-none relative",
                      isSelected 
                        ? cn("border-2 shadow-md", colors.active)
                        : cn("bg-white border-slate-200 shadow-2xs hover:shadow-xs", colors.border)
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        isSelected ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-800"
                      )}>
                        <StepIcon size={18} />
                      </div>
                      
                      {/* Bottleneck indicator badge */}
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-bold",
                        colors.badge
                      )}>
                        {count}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{step.label}</h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{step.description}</p>
                    </div>
                  </button>

                  {/* Connector Arrow */}
                  {idx < flowOrder.length - 1 && (
                    <div className="text-slate-300 flex items-center shrink-0">
                      <ArrowRight size={16} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Step Detail Panel */}
      {selectedStage && (
        <div className="border border-slate-150 rounded-2xl bg-slate-50/50 overflow-hidden transition-all duration-300">
          <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <selectedStage.icon size={16} className="text-slate-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{selectedStage.label} List</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {stageItems.length} active records
              </span>
            </div>
            <button 
              onClick={() => setActiveStep(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Close Panel
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            {stageItems.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase bg-white">
                    <th className="px-5 py-3">Reference No</th>
                    <th className="px-5 py-3">Vendor / Payee</th>
                    <th className="px-5 py-3">Firm Name</th>
                    <th className="px-5 py-3">Work Description</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {stageItems.map((item, index) => {
                    const vendorName = item.vendor || item.payTo || 'N/A';
                    const desc = item.description || item.remarks || '—';
                    const dateVal = item.date || item.billDate || item.timestamp?.split(' ')[0] || '—';
                    
                    return (
                      <tr key={index} className="hover:bg-slate-50/50 text-xs transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{item.id}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">{dateVal}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-700">{vendorName}</td>
                        <td className="px-5 py-3 text-slate-600">{item.firmName || item.department || 'All'}</td>
                        <td className="px-5 py-3 text-slate-500 max-w-xs truncate" title={desc}>{desc}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => navigate(selectedStage.targetPath)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-all border border-blue-100 cursor-pointer"
                          >
                            <span>{selectedStage.actionLabel}</span>
                            <ExternalLink size={10} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2 bg-white">
                <AlertCircle className="mx-auto text-slate-300" size={32} />
                <p className="text-sm font-semibold">No pending items at this stage!</p>
                <p className="text-xs text-slate-300">All items have been processed and moved forward in the pipeline.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowVisualizer;

import React from 'react';
import { cn } from '../../lib/utils';

export const Badge = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

export const Card = ({ children, className, title, description, footer }) => {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {(title || description) && (
        <div className="p-6 border-b border-slate-200">
          {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && <div className="p-4 bg-slate-50 border-t border-slate-200">{footer}</div>}
    </div>
  );
};

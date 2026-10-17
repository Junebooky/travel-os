'use client';

import React from 'react';
import { useTravel } from '@/context/TravelContext';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export default function ToastContainer() {
  const { toasts } = useTravel();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none max-w-md mx-auto"
    >
      {toasts.map((toast) => {
        let Icon = Info;
        let style = 'bg-slate-900/95 border-slate-700 text-slate-100';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          style = 'bg-emerald-950/95 border-emerald-600/70 text-emerald-100 shadow-emerald-950/40';
        } else if (toast.type === 'error') {
          Icon = AlertTriangle;
          style = 'bg-rose-950/95 border-rose-600/70 text-rose-100 shadow-rose-950/40';
        }

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border shadow-lg backdrop-blur-md text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto ${style}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}

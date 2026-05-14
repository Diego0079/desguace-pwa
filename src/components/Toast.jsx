import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => { onClose(); }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: { bg: 'bg-green-900/90', border: 'border-green-500', icon: <CheckCircle className="w-6 h-6 text-green-400" />, text: 'text-green-400' },
    error: { bg: 'bg-red-900/90', border: 'border-red-500', icon: <XCircle className="w-6 h-6 text-red-400" />, text: 'text-red-400' },
    warning: { bg: 'bg-yellow-900/90', border: 'border-yellow-500', icon: <AlertTriangle className="w-6 h-6 text-yellow-400" />, text: 'text-yellow-400' },
    info: { bg: 'bg-zinc-900/90', border: 'border-zinc-500', icon: <Info className="w-6 h-6 text-zinc-400" />, text: 'text-zinc-400' },
  };

  const s = styles[type] || styles.success;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
      <div className={`flex items-center gap-3 px-5 py-3 rounded-lg border-l-4 shadow-2xl shadow-black/50 backdrop-blur-sm ${s.bg} ${s.border}`}>
        {s.icon}
        <span className={`font-black uppercase tracking-wider text-sm ${s.text}`}>{message}</span>
      </div>
    </div>
  );
}
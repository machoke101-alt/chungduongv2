
import React, { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';

interface CopyableCodeProps {
  code: string;
  label?: string;
  className?: string;
  onCopy?: () => void;
}

const CopyableCode: React.FC<CopyableCodeProps> = ({ code, label, className = "", onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(code);
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`group relative flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${className}`}
      title={`Bấm để sao chép: ${code}`}
    >
      {label || code}
      {copied ? (
        <CheckCircle2 size={12} className="text-emerald-400 animate-in zoom-in" />
      ) : (
        <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
      )}
      
      {copied && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[8px] font-black uppercase rounded shadow-xl animate-in slide-in-from-bottom-1 fade-in">
          Đã chép!
        </div>
      )}
    </button>
  );
};

export default CopyableCode;

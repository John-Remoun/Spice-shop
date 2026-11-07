import { Crown, Sparkles } from 'lucide-react';

interface WelcomeBadgeProps {
  className?: string;
  variant?: 'compact' | 'expanded';
}

export function WelcomeBadge({ className = '', variant = 'compact' }: WelcomeBadgeProps) {
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-[#172E21] via-[#1F3D2C] to-[#2B2313] border border-[#D4A344]/40 shadow-sm text-xs font-bold text-[#F4EFE6] select-none hover:border-[#D4A344] transition-all group ${className}`}
        dir="rtl"
      >
        <span className="w-5 h-5 rounded-lg bg-[#D4A344]/20 border border-[#D4A344]/60 flex items-center justify-center shrink-0 shadow-inner">
          <Crown size={12} className="text-[#F2C94C] group-hover:rotate-12 transition-transform" />
        </span>
        <span className="font-display tracking-wide font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FFFDF5] to-[#E8D5B5]">
          QUEEN ONE
        </span>
        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/70 px-1.5 py-0.5 rounded-md border border-emerald-800/40">
          نظام ذكي
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden p-4 rounded-3xl bg-gradient-to-r from-[#122319] via-[#1A3324] to-[#1F271B] border border-[#D4A344]/35 shadow-lg flex items-center justify-between gap-4 text-[#F4EFE6] ${className}`}
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4A344]/25 to-emerald-600/30 border border-[#D4A344] flex items-center justify-center shadow-[0_0_20px_rgba(212,163,68,0.25)] shrink-0">
          <Crown size={24} className="text-[#F2C94C] animate-bounce" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#FFFDF5] via-[#E8D5B5] to-[#D4A344]">
              QUEEN ONE
            </h2>
            <span className="text-[10px] font-bold text-[#D4A344] bg-[#D4A344]/15 px-2 py-0.5 rounded-full border border-[#D4A344]/30">
              Smart ERP
            </span>
          </div>
          <p className="text-xs text-emerald-300/80 font-medium mt-0.5">
            نظام إدارة وتصنيع العطور ومستحضرات التجميل والمخزون
          </p>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#C3B89E] bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
        <Sparkles size={14} className="text-[#D4A344]" />
        <span>مرحباً بك في مساحة عملك</span>
      </div>
    </div>
  );
}

export default WelcomeBadge;


import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Server, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface WelcomeLoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number; // minimum time in ms to show the welcome splash (default 1800ms)
}

const STAGES = [
  { text: 'جاري إيقاظ الخادم السحابي وتأمين الاتصال...', progress: 25, icon: Server },
  { text: 'الاتصال بقاعدة البيانات واسترجاع السجلات...', progress: 50, icon: Database },
  { text: 'تحميل بيانات المواد الخام والتركيبات والمخزون...', progress: 75, icon: Sparkles },
  { text: 'مزامنة لوحة التحكم وإعداد واجهة التشغيل...', progress: 92, icon: ShieldCheck },
  { text: 'اكتمل الإعداد بنجاح! مرحباً بك في QUEEN ONE ✨', progress: 100, icon: Crown },
];

export default function WelcomeLoadingScreen({ onComplete, minDuration = 1800 }: WelcomeLoadingScreenProps) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isDone, setIsDone] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showExit, setShowExit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    // Stage advance interval for smooth progression while waiting for server response
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          const next = prev + Math.floor(Math.random() * 8) + 4;
          return Math.min(next, 90);
        }
        return prev;
      });
    }, 800);

    // Wake-up ping to backend
    const checkServer = async () => {
      try {
        await apiClient.get('/health', { timeout: 60000 });
      } catch {
        // Fallback: try root health if /api/health had any issue
        try {
          await apiClient.get('/settings', { timeout: 60000 });
        } catch (e) {
          console.warn('Backend wake-up ping error, proceeding anyway:', e);
        }
      }

      if (cancelled) return;

      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        if (cancelled) return;
        clearInterval(interval);
        setCurrentStageIdx(4);
        setProgress(100);
        setIsDone(true);

        setTimeout(() => {
          if (cancelled) return;
          setShowExit(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 600);
        }, 500);
      }, remainingTime);
    };

    checkServer();

    // Safety timeout in case server takes longer than 50 seconds
    const safetyTimer = setTimeout(() => {
      if (!isDone) {
        setHasError(true);
      }
    }, 50000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(safetyTimer);
    };
  }, [minDuration, onComplete]);

  // Update stage index based on progress
  useEffect(() => {
    if (progress >= 95) setCurrentStageIdx(4);
    else if (progress >= 70) setCurrentStageIdx(3);
    else if (progress >= 45) setCurrentStageIdx(2);
    else if (progress >= 25) setCurrentStageIdx(1);
    else setCurrentStageIdx(0);
  }, [progress]);

  const CurrentIcon = STAGES[currentStageIdx].icon;

  if (showExit) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#09140E] via-[#0E1F15] to-[#08120D] text-[#F4EFE6] select-none"
        dir="rtl"
      >
        {/* Ambient Botanical Glow Orbs */}
        <div className="absolute top-1/4 -right-20 w-80 h-80 sm:w-96 sm:h-96 bg-emerald-600/15 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-1/4 -left-20 w-80 h-80 sm:w-96 sm:h-96 bg-[#D4A344]/15 rounded-full blur-[100px] pointer-events-none animate-pulse-glow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Floating Subtle Sparks Background */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(212,163,68,0.08)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

        {/* Central Master Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-lg mx-4 px-6 py-8 sm:px-10 sm:py-10 rounded-3xl bg-[#142319]/80 backdrop-blur-2xl border border-[#D4A344]/30 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.8)] text-center flex flex-col items-center"
        >
          {/* Glowing Animated Outer Aura */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 via-[#D4A344]/30 to-teal-500/20 rounded-3xl blur-xl opacity-75 -z-10 animate-pulse" />

          {/* Golden Crown Emblem */}
          <div className="relative mb-5 flex items-center justify-center">
            {/* Spinning decorative ring */}
            <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-dashed border-[#D4A344]/40 animate-[spin_12s_linear_infinite]" />
            <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#D4A344]/20 to-emerald-500/20 blur-md animate-pulse" />
            
            {/* Core Badge */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1C3224] via-[#15271C] to-[#0D1A12] border-2 border-[#D4A344] shadow-[0_0_30px_rgba(212,163,68,0.35)] flex items-center justify-center">
              <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-[#F2C94C] drop-shadow-[0_2px_10px_rgba(242,201,76,0.6)] animate-bounce" />
              <Sparkles className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[#FFF2B2] animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          </div>

          {/* System Title */}
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#FFFDF5] via-[#E8D5B5] to-[#D4A344] drop-shadow-sm mb-1.5">
            QUEEN ONE
          </h1>

          <p className="text-xs sm:text-sm font-bold text-emerald-400/90 tracking-wide mb-3 flex items-center gap-1.5 justify-center">
            <span>نظام إدارة وتصنيع العطور ومستحضرات التجميل</span>
          </p>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#D4A344]/10 text-[#E8D5B5] border border-[#D4A344]/30 shadow-inner mb-6">
            <Sparkles size={12} className="text-[#D4A344]" />
            <span>Smart Cloud Intelligence Platform</span>
          </span>

          {/* Progress Bar Container */}
          <div className="w-full space-y-2.5">
            <div className="flex items-center justify-between text-xs px-1 font-semibold text-[#C3B89E]">
              <span className="flex items-center gap-1.5">
                <CurrentIcon size={14} className="text-[#D4A344] animate-pulse" />
                <span className="text-[11px] sm:text-xs truncate max-w-[260px] sm:max-w-xs transition-all">
                  {STAGES[currentStageIdx].text}
                </span>
              </span>
              <span className="font-mono text-xs font-black text-[#F4EFE6] ltr:font-mono">
                {progress}%
              </span>
            </div>

            {/* Glowing High-End Progress Bar */}
            <div className="relative w-full h-3 bg-[#0A140E] rounded-full p-0.5 border border-emerald-500/25 overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-[#10B981] to-[#D4A344] relative overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.4 }}
              >
                {/* Fast animated shimmer highlight wave */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-fast" />
              </motion.div>
            </div>
          </div>

          {/* Cloud spin-up info note */}
          <div className="mt-5 pt-4 border-t border-[#D4A344]/15 w-full flex items-center justify-between text-[11px] text-[#A8A296]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>جاري التحميل السحابي التلقائي...</span>
            </span>
            <span className="text-gray-400 font-mono text-[10px]">
              STACK © 2026
            </span>
          </div>

          {/* Timeout retry button if server took abnormally long */}
          {hasError && !isDone && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <RefreshCw size={12} className="animate-spin" />
              <span>الخادم يستغرق وقتاً أطول، اضغط لإعادة المحاولة</span>
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

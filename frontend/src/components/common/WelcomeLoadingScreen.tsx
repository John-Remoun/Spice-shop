import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface WelcomeLoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number; // minimum time in ms to show the welcome splash (default 1800ms)
}

export default function WelcomeLoadingScreen({ onComplete, minDuration = 1800 }: WelcomeLoadingScreenProps) {
  const [progress, setProgress] = useState(15);
  const [isDone, setIsDone] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showExit, setShowExit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    // Smooth simulated progress while waiting for the cloud backend
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          const next = prev + Math.floor(Math.random() * 8) + 4;
          return Math.min(next, 90);
        }
        return prev;
      });
    }, 700);

    // Wake-up ping to backend
    const checkServer = async () => {
      try {
        await apiClient.get('/health', { timeout: 60000 });
      } catch {
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
        setProgress(100);
        setIsDone(true);

        setTimeout(() => {
          if (cancelled) return;
          setShowExit(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 500);
        }, 400);
      }, remainingTime);
    };

    checkServer();

    // Safety timeout
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

  if (showExit) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 bg-[#F5F2EB] select-none"
        dir="rtl"
      >
        {/* Calm Harmonious Green Card on Plain Beige Background */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md px-8 py-10 sm:px-10 sm:py-12 rounded-3xl bg-[#243B2C] border border-[#35523F] shadow-[0_20px_50px_rgba(36,59,44,0.18)] text-center flex flex-col items-center gap-7"
        >
          {/* 1. System Name */}
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-wider text-[#FAF7EF] drop-shadow-sm">
            QUEEN ONE
          </h1>

          {/* 2. Loading Bar */}
          <div className="w-full">
            <div className="relative w-full h-3 bg-[#17271D] rounded-full p-0.5 border border-[#3A5944] overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-[#5E9C76] to-[#D4A344] relative overflow-hidden shadow-[0_0_12px_rgba(94,156,118,0.4)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.4 }}
              >
                {/* Fast animated shimmer highlight wave */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer-fast" />
              </motion.div>
            </div>
          </div>

          {/* 3. STACK Copyright Notice - Prominent, Clear & Centered */}
          <p className="text-xs sm:text-sm font-extrabold text-[#E2DAC5] tracking-wide pt-1">
            جميع الحقوق محفوظة لـ STACK © 2026
          </p>

          {/* Fallback retry button if server took abnormally long */}
          {hasError && !isDone && (
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <RefreshCw size={12} className="animate-spin" />
              <span>الخادم يستغرق وقتاً، اضغط لإعادة المحاولة</span>
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

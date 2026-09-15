import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Leaf, User, Lock, Sparkles, AlertCircle, KeyRound, Mail, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { apiClient } from '@/lib/api-client';
import { Footer } from '@/components/Footer';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { data: settings } = useSettings();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // OTP Forgot Password State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const storeName = settings?.storeName || t('app.name');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!otpEmail || !otpEmail.trim()) {
      setOtpMsg({ type: 'error', text: t('settings.validEmailRequired') });
      return;
    }
    setOtpLoading(true);
    setOtpMsg(null);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email: otpEmail });
      setOtpMsg({ type: 'success', text: res.data.message || t('settings.otpSentSuccess') });
      setOtpStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.message || t('settings.otpSendFailed');
      setOtpMsg({ type: 'error', text: msg });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpMsg({ type: 'error', text: t('settings.otpRequired') });
      return;
    }
    if (!otpNewPassword || otpNewPassword.length < 6) {
      setOtpMsg({ type: 'error', text: t('settings.newPasswordMinLength') });
      return;
    }
    setOtpLoading(true);
    setOtpMsg(null);
    try {
      const res = await apiClient.post('/auth/reset-password-otp', {
        email: otpEmail,
        otpCode,
        newPassword: otpNewPassword,
      });
      setOtpMsg({ type: 'success', text: res.data.message || t('settings.passwordChangedSuccess') });
      setTimeout(() => {
        setShowOtpModal(false);
        setOtpStep(1);
        setOtpCode('');
        setOtpNewPassword('');
        setOtpMsg(null);
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || t('settings.otpVerifyFailed');
      setOtpMsg({ type: 'error', text: msg });
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-brand-sand dark:bg-[#0D1510] overflow-hidden transition-colors duration-300">
      {/* Dynamic Animated Ambient Background Orbs (Desktop only to prevent mobile overflow & lag) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden md:block">
        <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-[#7A9171]/30 dark:bg-emerald-800/35 rounded-full blur-3xl pointer-events-none animate-ambient-1" />
        <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] bg-[#D4A344]/25 dark:bg-amber-700/30 rounded-full blur-3xl pointer-events-none animate-ambient-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-emerald-500/10 dark:bg-emerald-900/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Floating Animated Botanical Icons */}
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-16 left-16 text-brand-sage/40 dark:text-brand-sage/30 pointer-events-none"
        >
          <Leaf size={48} />
        </motion.div>
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -12, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-20 right-20 text-brand-ochre/35 dark:text-brand-ochre/25 pointer-events-none"
        >
          <Sparkles size={56} />
        </motion.div>
      </div>

      {/* Form Container Wrapper */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 py-6 relative z-10 w-full max-w-md mx-auto">
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-10 w-full bg-white/85 dark:bg-[#162219]/90 backdrop-blur-xl border border-brand-sage/30 dark:border-[#253928] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5 sm:space-y-6"
        >
        {/* Header Icon & Store Name */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-[#F5EFE0] mb-1 shadow-md border border-emerald-500/30">
            <Leaf size={34} className="text-[#F5EFE0]" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-forest dark:text-[#E4EFE3]">
            {storeName}
          </h1>
          <p className="text-xs text-brand-sage dark:text-brand-sage/90">
            {t('app.subtitle')}
          </p>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-forest dark:text-[#D5E2D3] mb-1.5">
              {t('auth.email')}
            </label>
            <div className="relative">
              <User size={18} className="absolute rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto top-1/2 -translate-y-1/2 text-brand-sage dark:text-brand-sage/80" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2.5 rounded-xl border border-brand-sage/30 dark:border-[#253928] bg-white/70 dark:bg-[#0E1711] text-brand-forest dark:text-[#E2ECE0] text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest dark:focus:ring-brand-sage transition-all placeholder:text-brand-sage/50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-brand-forest dark:text-[#D5E2D3]">
                {t('auth.password')}
              </label>
              <button
                type="button"
                onClick={() => {
                  setOtpEmail(email);
                  setShowOtpModal(true);
                }}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto top-1/2 -translate-y-1/2 text-brand-sage dark:text-brand-sage/80" />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2.5 rounded-xl border border-brand-sage/30 dark:border-[#253928] bg-white/70 dark:bg-[#0E1711] text-brand-forest dark:text-[#E2ECE0] text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest dark:focus:ring-brand-sage transition-all placeholder:text-brand-sage/50"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-60 transition-all rounded-xl"
        >
          {submitting ? (
            <span>{t('common.loading')}</span>
          ) : (
            <>
              <Sparkles size={18} />
              <span>{t('auth.login')}</span>
            </>
          )}
        </button>
        </motion.form>
      </div>

      {/* OTP Password Reset Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131E17] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-[#263A2A] space-y-4 animate-in fade-in zoom-in-95 text-right rtl:text-right ltr:text-left">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#263A2A] pb-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <KeyRound size={20} />
                <h3 className="text-sm font-bold text-gray-900 dark:text-[#F5EFE0]">
                  {t('settings.resetPasswordOtpTitle')}
                </h3>
              </div>
              <button onClick={() => setShowOtpModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {otpMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  otpMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {otpMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{otpMsg.text}</span>
              </div>
            )}

            {otpStep === 1 ? (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600 dark:text-[#E8E1CE]">
                  {t('settings.enterEmailOtpDesc')}
                </p>
                <div>
                  <label className="block text-gray-700 dark:text-[#E8E1CE] mb-1 font-bold">{t('auth.email')}</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#263A2A] bg-white dark:bg-brand-slate text-sm font-semibold"
                  />
                </div>
                <button
                  disabled={otpLoading || !otpEmail}
                  onClick={handleSendOtp}
                  className="btn-primary w-full py-2.5 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
                >
                  {otpLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  <span>{t('settings.sendOtpBtn')}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600 dark:text-[#E8E1CE]">
                  {t('settings.otpSentDesc')} ({otpEmail}):
                </p>
                <div>
                  <label className="block text-gray-700 dark:text-[#E8E1CE] mb-1 font-bold">{t('settings.otpCodeLabel')}</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.trim())}
                    className="w-full px-3 py-2.5 rounded-xl border border-amber-400 text-center font-mono font-bold text-lg tracking-widest bg-white dark:bg-brand-slate text-amber-900 dark:text-amber-100"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-[#E8E1CE] mb-1 font-bold">{t('settings.newPasswordLabel')}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={otpNewPassword}
                    onChange={(e) => setOtpNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#263A2A] bg-white dark:bg-brand-slate text-sm font-semibold"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setOtpStep(1)}
                    className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-[#D5C7A3] hover:bg-gray-100 dark:hover:bg-[#1A281E] rounded-xl border border-gray-200"
                  >
                    {t('settings.changeEmail')}
                  </button>
                  <button
                    disabled={otpLoading || !otpCode || !otpNewPassword}
                    onClick={handleVerifyOtpAndReset}
                    className="btn-primary flex-1 py-2.5 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
                  >
                    {otpLoading && <Loader2 size={14} className="animate-spin" />}
                    <span>{t('settings.confirmResetPasswordBtn')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Footer */}
      <div className="w-full relative z-10">
        <Footer />
      </div>
    </div>
  );
}

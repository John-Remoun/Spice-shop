import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Store,
  CheckCircle2,
  UserCheck,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  Mail,
  Phone,
  KeyRound,
  X,
  Loader2,
  Key,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';

interface SettingsData {
  storeName: string;
  logoUrl?: string;
  defaultCurrency: string;
  defaultLowStockThresholdPct: number;
  supportEmail?: string;
  whatsappSenderPhone?: string;
}

interface UserAccount {
  _id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  createdBy?: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();

  // Store Settings state (Only Store Name as requested)
  const [storeSuccessMsg, setStoreSuccessMsg] = useState(false);
  const [storeName, setStoreName] = useState('Spice shop');

  // Profile Update state
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [userPhone, setUserPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // OTP Forgot Password Modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpEmail, setOtpEmail] = useState(user?.email || '');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Accounts Management state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addUserErrorMsg, setAddUserErrorMsg] = useState<string | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserAccount | null>(null);
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  const { data: settings } = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: async () => (await apiClient.get<SettingsData>('/settings')).data,
  });

  const { data: userAccounts = [] } = useQuery<UserAccount[]>({
    queryKey: ['users'],
    queryFn: async () => (await apiClient.get<UserAccount[]>('/users')).data,
  });

  const {
    paginatedItems: visibleUsers,
    currentPage: usersPage,
    totalPages: usersTotalPages,
    goToPage: goToUsersPage,
    totalItems: usersTotalItems,
  } = usePagination(userAccounts, 5);

  useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName || 'Spice shop');
    }
  }, [settings]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setUserEmail(user.email || '');
      setUserPhone(user.phone || '');
    }
  }, [user]);

  // Update Store Settings (Only Store/Factory Name)
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      return (
        await apiClient.put('/settings', {
          storeName,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setStoreSuccessMsg(true);
      setTimeout(() => setStoreSuccessMsg(false), 3000);
    },
  });

  // Update Personal Profile (Mandatory currentPassword check)
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      setProfileErrorMsg(null);
      if (!currentPassword) {
        throw new Error(t('settings.currentPasswordRequired'));
      }
      return (
        await apiClient.put<{ id: string; fullName: string; email: string; phone?: string; role: string }>('/users/profile', {
          fullName,
          email: userEmail || undefined,
          phone: userPhone || undefined,
          currentPassword,
          newPassword: newPassword || undefined,
        })
      ).data;
    },
    onSuccess: (data) => {
      setProfileSuccessMsg(true);
      setCurrentPassword('');
      setNewPassword('');
      if (data) {
        updateUser({ fullName: data.fullName, email: data.email, phone: data.phone });
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setTimeout(() => setProfileSuccessMsg(false), 3000);
    },
    onError: (err: any) => {
      setProfileErrorMsg(err.response?.data?.message || err.message || t('settings.profileUpdateFailed'));
    },
  });

  // Handle OTP Forgot Password Step 1: Send OTP
  const handleSendOtp = async () => {
    if (!otpEmail || !otpEmail.includes('@')) {
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

  // Handle OTP Forgot Password Step 2: Verify OTP & Reset Password
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
      }, 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message || t('settings.otpVerifyFailed');
      setOtpMsg({ type: 'error', text: msg });
    } finally {
      setOtpLoading(false);
    }
  };

  // Create New User Account
  const createUserMutation = useMutation({
    mutationFn: async () => {
      setAddUserErrorMsg(null);
      return (
        await apiClient.post('/users', {
          fullName: newUserFullName,
          email: newUserEmail || undefined,
          phone: newUserPhone || undefined,
          password: newUserPassword,
          role: 'SUPER_ADMIN',
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddUserOpen(false);
      setNewUserFullName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserPassword('');
      setAddUserErrorMsg(null);
    },
    onError: (err: any) => {
      setAddUserErrorMsg(err.response?.data?.message || t('settings.addUserFailed'));
    },
  });

  // Delete User Account
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteUserTarget(null);
    },
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl text-brand-forest dark:text-brand-sand flex items-center gap-2">
          <SettingsIcon className="text-emerald-600" /> {t('nav.settings')}
        </h1>
        <p className="text-sm text-brand-sage">{t('settings.subtitle')}</p>
      </div>

      {/* CARD 1: Store Settings */}
      <div className="card-botanical space-y-4">
        <h2 className="font-display text-lg text-brand-forest dark:text-brand-sand flex items-center gap-2 border-b border-brand-sage/20 pb-3">
          <Store size={20} /> {t('settings.storeCardTitle')}
        </h2>

        {storeSuccessMsg && (
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-organic text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{t('settings.settingsUpdated')}</span>
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-brand-sage mb-1 font-semibold">{t('settings.storeNameLabel')}</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            disabled={updateSettingsMutation.isPending}
            onClick={() => updateSettingsMutation.mutate()}
            className="btn-primary py-2.5 px-6 text-sm font-bold disabled:opacity-50"
          >
            {updateSettingsMutation.isPending ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>

      {/* CARD 2: Personal Profile */}
      <div className="card-botanical space-y-4">
        <div className="flex items-center justify-between border-b border-brand-sage/20 pb-3">
          <h2 className="font-display text-lg text-brand-forest dark:text-brand-sand flex items-center gap-2">
            <UserCheck size={20} /> {t('settings.profileCardTitle')}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (user?.email) setOtpEmail(user.email);
              setShowOtpModal(true);
            }}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            <KeyRound size={14} />
            <span>{t('settings.resetPasswordOtpLink')}</span>
          </button>
        </div>

        {profileSuccessMsg && (
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-organic text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{t('settings.profileUpdated')}</span>
          </div>
        )}

        {profileErrorMsg && (
          <div className="p-3 bg-rose-100 text-rose-800 rounded-organic text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{profileErrorMsg}</span>
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-brand-sage mb-1 font-semibold">{t('settings.fullNameLabel')}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-brand-sage mb-1 font-semibold">{t('settings.profileEmailLabel')}</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70"
              />
            </div>
            <div>
              <label className="block text-brand-sage mb-1 font-semibold">{t('settings.phoneLabel')}</label>
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-brand-sage/10">
            <div>
              <label className="block text-brand-sage mb-1 font-bold text-amber-700 dark:text-amber-400">
                {t('settings.currentPasswordLabel')} *
              </label>
              <input
                type="password"
                placeholder={t('settings.currentPasswordPlaceholder')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-organic border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20"
              />
            </div>
            <div>
              <label className="block text-brand-sage mb-1 font-semibold">{t('settings.newPasswordLabel')}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-organic border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            disabled={!currentPassword || updateProfileMutation.isPending}
            onClick={() => updateProfileMutation.mutate()}
            className="btn-primary py-2.5 px-6 text-sm font-bold disabled:opacity-50"
          >
            {updateProfileMutation.isPending ? t('common.loading') : t('settings.updateProfileBtn')}
          </button>
        </div>
      </div>

      {/* CARD 3: User Accounts Management */}
      <div className="card-botanical space-y-6">
        <div className="flex items-center justify-between border-b border-brand-sage/20 pb-3">
          <h2 className="font-display text-lg text-brand-forest dark:text-brand-sand flex items-center gap-2">
            <Users size={20} /> {t('settings.usersCardTitle')}
          </h2>
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="btn-primary text-xs flex items-center gap-1 px-3.5 py-2 font-bold"
          >
            <Plus size={14} /> {t('settings.addUserBtn')}
          </button>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-brand-sage/20 text-brand-forest dark:text-brand-sand">
                <th className="py-2.5 px-2 text-start">{t('settings.colFullNameLogin')}</th>
                <th className="py-2.5 px-2 text-start">{t('settings.colEmail')}</th>
                <th className="py-2.5 px-2 text-start">{t('common.phone')}</th>
                <th className="py-2.5 px-2 text-start">{t('settings.colRole')}</th>
                <th className="py-2.5 px-2 text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((account) => {
                const isSelf = account._id === user?.id;
                return (
                  <tr key={account._id} className="border-b border-brand-sage/10 hover:bg-brand-sage/5">
                    <td className="py-2.5 px-2 font-semibold">{account.fullName} {isSelf && t('common.you')}</td>
                    <td className="py-2.5 px-2 text-brand-sage">{account.email || '—'}</td>
                    <td className="py-2.5 px-2 text-brand-sage">{account.phone || '—'}</td>
                    <td className="py-2.5 px-2">
                      <span className="px-2 py-0.5 rounded-full bg-brand-forest/10 text-brand-forest dark:text-brand-sand font-bold text-[11px]">
                        {account.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-end">
                      {!isSelf && (
                        <button
                          onClick={() => setDeleteUserTarget(account)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={usersPage}
          totalPages={usersTotalPages}
          onPageChange={goToUsersPage}
          totalItems={usersTotalItems}
          itemsPerPage={5}
        />
      </div>

      {/* OTP Password Reset Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131E17] w-full max-w-md rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-[#263A2A] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#263A2A] pb-3">
              <div className="flex items-center gap-2 text-amber-600">
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
                className={`p-2.5 rounded-xl text-xs font-semibold ${
                  otpMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {otpMsg.text}
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
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#263A2A] bg-white dark:bg-brand-slate text-sm font-semibold"
                  />
                </div>
                <button
                  disabled={otpLoading || !otpEmail}
                  onClick={handleSendOtp}
                  className="btn-primary w-full py-2.5 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
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
                    className="w-full px-3 py-2 rounded-xl border border-amber-400 text-center font-mono font-bold text-lg tracking-widest bg-white dark:bg-brand-slate text-amber-900 dark:text-amber-100"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-[#E8E1CE] mb-1 font-bold">{t('settings.newPasswordLabel')}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={otpNewPassword}
                    onChange={(e) => setOtpNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#263A2A] bg-white dark:bg-brand-slate text-sm font-semibold"
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
                    className="btn-primary flex-1 py-2.5 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
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

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="font-display text-xl text-brand-forest dark:text-brand-sand font-bold">
              {t('settings.addUserModalTitle')}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-brand-sage mb-1 font-semibold">{t('settings.usernameForLogin')}</label>
                <input
                  type="text"
                  placeholder={t('settings.usernamePlaceholder')}
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70"
                />
              </div>
              <div>
                <label className="block text-brand-sage mb-1 font-semibold">{t('settings.emailOptional')}</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70"
                />
              </div>
              <div>
                <label className="block text-brand-sage mb-1 font-semibold">{t('settings.phoneOptional')}</label>
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70"
                />
              </div>
              <div>
                <label className="block text-brand-sage mb-1 font-semibold">{t('settings.userPasswordLabel')}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70"
                />
              </div>

              {addUserErrorMsg && (
                <div className="p-2 bg-red-100 text-red-800 rounded text-xs flex items-center gap-1 font-semibold">
                  <AlertCircle size={14} /> {addUserErrorMsg}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsAddUserOpen(false)} className="px-4 py-2 rounded-xl border border-brand-sage/30 text-sm">
                {t('common.cancel')}
              </button>
              <button
                disabled={!newUserFullName || !newUserPassword || createUserMutation.isPending}
                onClick={() => createUserMutation.mutate()}
                className="btn-primary text-sm font-bold disabled:opacity-50"
              >
                {createUserMutation.isPending ? t('common.loading') : t('settings.saveUser')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUserTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-sand dark:bg-brand-olive border border-brand-sage/30 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="font-display text-xl text-rose-600 dark:text-rose-400 font-bold">
              {t('common.confirmDeleteTitle')}
            </h2>
            <p className="text-sm text-brand-forest dark:text-brand-sand">
              {t('settings.deleteUserConfirm')} ({deleteUserTarget.fullName})
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteUserTarget(null)} className="px-4 py-2 rounded-xl border border-brand-sage/30 text-sm">
                {t('common.cancel')}
              </button>
              <button
                disabled={deleteUserMutation.isPending}
                onClick={() => deleteUserMutation.mutate(deleteUserTarget._id)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-sm font-semibold disabled:opacity-50"
              >
                {deleteUserMutation.isPending ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

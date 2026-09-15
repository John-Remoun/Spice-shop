import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Droplet,
  Package,
  FlaskConical,
  ShoppingBag,
  Factory,
  Receipt,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Languages,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Menu,
  X,
  Leaf,
} from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { Footer } from '@/components/Footer';

export default function AppShell() {
  const { t, i18n } = useTranslation();
  const { mode, toggle } = useThemeStore();
  const { data: settings } = useSettings();
  const { user, logout } = useAuth();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesDropdownOpen, setResourcesDropdownOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const isResourcesActive =
    location.pathname.startsWith('/raw-materials') || location.pathname.startsWith('/packaging');

  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBF9] dark:bg-[#121814] text-gray-900 dark:text-[#F4EFE6] transition-colors duration-300">
      {/* Dynamic Ambient Background Orbs — hidden on mobile to eliminate GPU lag */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 hidden md:block">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-400/10 dark:bg-[#D4A344]/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Top Floating Glassmorphism Navbar */}
      <header className="sticky top-0 z-40 bg-[#FCFAF5]/90 dark:bg-[#1C241F]/95 backdrop-blur-xl border-b border-[#E3DCB9] dark:border-[#2D3830] shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Left: Brand Logo & Factory Name */}
            <div className="flex items-center gap-2.5 min-w-0 shrink">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shadow-sm object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-[#F5EFE0] flex items-center justify-center shadow-md border border-emerald-500/30 shrink-0">
                  <Leaf size={18} className="text-[#F5EFE0]" />
                </div>
              )}
              <div className="min-w-0">
                <span className="font-display text-sm sm:text-base font-extrabold text-gray-900 dark:text-[#F5EFE0] block tracking-tight truncate max-w-[110px] sm:max-w-xs">
                  {settings?.storeName ?? t('app.name')}
                </span>
                {user && (
                  <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-[#E6DCB8] font-semibold flex items-center gap-1 truncate">
                    <UserIcon size={10} /> {user.fullName}
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Center: Horizontal Nav Links */}
            <nav className="hidden lg:flex items-center gap-1 bg-[#F3EEDC]/70 dark:bg-[#1A281E] p-1.5 rounded-2xl border border-[#E3DCB9] dark:border-[#263A2A]">
              {/* POS Sales / Cashier (Primary First Link) */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-[#F5EFE0] shadow-sm border border-emerald-600/30'
                      : 'text-gray-700 dark:text-[#E8E1CE] hover:bg-white dark:hover:bg-[#263A2A]'
                  }`
                }
              >
                <Receipt size={15} />
                <span>{t('nav.sales')}</span>
              </NavLink>

              {/* Dashboard */}
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-[#F5EFE0] shadow-sm border border-emerald-600/30'
                      : 'text-gray-700 dark:text-[#E8E1CE] hover:bg-white dark:hover:bg-[#263A2A]'
                  }`
                }
              >
                <LayoutDashboard size={15} />
                <span>{t('nav.dashboard')}</span>
              </NavLink>

              {/* Resources Dropdown (Raw Materials & Packaging) */}
              <div className="relative">
                <button
                  onClick={() => setResourcesDropdownOpen(!resourcesDropdownOpen)}
                  onBlur={() => setTimeout(() => setResourcesDropdownOpen(false), 200)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isResourcesActive
                      ? 'bg-emerald-100 dark:bg-[#1F3324] text-emerald-800 dark:text-[#F5EFE0] border border-emerald-500/30'
                      : 'text-gray-700 dark:text-[#E8E1CE] hover:bg-white dark:hover:bg-[#263A2A]'
                  }`}
                >
                  <Droplet size={15} className="text-amber-500 dark:text-amber-400" />
                  <span>{t('nav.resources')}</span>
                  <ChevronDown size={14} className={`transition-transform ${resourcesDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {resourcesDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-[#131E17] rounded-xl p-1.5 shadow-xl border border-gray-100 dark:border-[#263A2A] z-50 space-y-1"
                    >
                      <NavLink
                        to="/raw-materials"
                        onClick={() => setResourcesDropdownOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-[#1A2A1E] text-emerald-700 dark:text-[#F5EFE0] font-bold'
                              : 'text-gray-700 dark:text-[#E8E1CE] hover:bg-gray-50 dark:hover:bg-[#1A281E]'
                          }`
                        }
                      >
                        <Droplet size={14} className="text-amber-500 dark:text-amber-400" />
                        <span>{t('nav.rawMaterials')}</span>
                      </NavLink>

                      <NavLink
                        to="/packaging"
                        onClick={() => setResourcesDropdownOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-[#1A2A1E] text-emerald-700 dark:text-[#F5EFE0] font-bold'
                              : 'text-gray-700 dark:text-[#E8E1CE] hover:bg-gray-50 dark:hover:bg-[#1A281E]'
                          }`
                        }
                      >
                        <Package size={14} className="text-blue-500 dark:text-blue-400" />
                        <span>{t('nav.packaging')}</span>
                      </NavLink>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Formulas */}
              <NavLink
                to="/formulas"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-[#F5EFE0] shadow-sm border border-emerald-600/30'
                      : 'text-gray-700 dark:text-[#E8E1CE] hover:bg-white dark:hover:bg-[#263A2A]'
                  }`
                }
              >
                <FlaskConical size={15} />
                <span>{t('nav.formulas')}</span>
              </NavLink>

              {/* Finished Products */}
              <NavLink
                to="/finished-products"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-[#F5EFE0] shadow-sm border border-emerald-600/30'
                      : 'text-gray-700 dark:text-[#E8E1CE] hover:bg-white dark:hover:bg-[#263A2A]'
                  }`
                }
              >
                <ShoppingBag size={15} />
                <span>{t('nav.finishedProducts')}</span>
              </NavLink>

              {/* Production */}
              <NavLink
                to="/production"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-[#F5EFE0] shadow-sm border border-emerald-600/30'
                      : 'text-gray-700 dark:text-[#E8E1CE] hover:bg-white dark:hover:bg-[#263A2A]'
                  }`
                }
              >
                <Factory size={15} />
                <span>{t('nav.production')}</span>
              </NavLink>

              {/* Settings */}
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-[#F5EFE0] shadow-sm border border-emerald-600/30'
                      : 'text-gray-700 dark:text-[#E8E1CE] hover:bg-white dark:hover:bg-[#263A2A]'
                  }`
                }
              >
                <SettingsIcon size={15} />
                <span>{t('nav.settings')}</span>
              </NavLink>
            </nav>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100/80 dark:bg-[#1A281E] hover:bg-gray-200/80 dark:hover:bg-[#263A2A] rounded-xl text-xs font-bold text-gray-700 dark:text-[#F5EFE0] border border-gray-200/50 dark:border-[#263A2A] transition-all"
                title="Switch Language"
              >
                <Languages size={15} className="text-emerald-600 dark:text-[#E6DCB8]" />
                <span>{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
              </button>

              {/* Dark / Light Mode Toggle */}
              <button
                onClick={toggle}
                className="p-2 bg-gray-100/80 dark:bg-[#1A281E] hover:bg-gray-200/80 dark:hover:bg-[#263A2A] rounded-xl text-gray-700 dark:text-[#F5EFE0] border border-gray-200/50 dark:border-[#263A2A] transition-all"
                title={mode === 'light' ? t('common.darkMode') : t('common.lightMode')}
              >
                {mode === 'light' ? (
                  <Moon size={16} className="text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Sun size={16} className="text-amber-400" />
                )}
              </button>

              {/* Logout Button */}
              {user && (
                <button
                  onClick={logout}
                  className="p-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl text-rose-600 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/30 transition-all"
                  title={t('auth.logout')}
                >
                  <LogOut size={16} />
                </button>
              )}

              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 bg-gray-100 dark:bg-[#1A281E] rounded-xl text-gray-700 dark:text-[#F5EFE0]"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-white/95 dark:bg-[#131E17]/95 border-b border-gray-200 dark:border-[#263A2A] px-4 py-3 space-y-2 overflow-hidden"
            >
              <NavLink
                to="/"
                end
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-[#1A281E]"
              >
                <Receipt size={16} />
                <span>{t('nav.sales')}</span>
              </NavLink>

              <NavLink
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-[#1A281E]"
              >
                <LayoutDashboard size={16} />
                <span>{t('nav.dashboard')}</span>
              </NavLink>

              <NavLink
                to="/raw-materials"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-[#1A281E]"
              >
                <Droplet size={16} className="text-amber-500 dark:text-amber-400" />
                <span>{t('nav.rawMaterials')}</span>
              </NavLink>

              <NavLink
                to="/packaging"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-[#1A281E]"
              >
                <Package size={16} className="text-blue-500 dark:text-blue-400" />
                <span>{t('nav.packaging')}</span>
              </NavLink>

              <NavLink
                to="/formulas"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-[#1A281E]"
              >
                <FlaskConical size={16} />
                <span>{t('nav.formulas')}</span>
              </NavLink>

              <NavLink
                to="/finished-products"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-[#1A281E]"
              >
                <ShoppingBag size={16} />
                <span>{t('nav.finishedProducts')}</span>
              </NavLink>

              <NavLink
                to="/production"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-[#1A281E]"
              >
                <Factory size={16} />
                <span>{t('nav.production')}</span>
              </NavLink>

              <NavLink
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-[#E8E1CE] hover:bg-emerald-50 dark:hover:bg-[#1A281E]"
              >
                <SettingsIcon size={16} />
                <span>{t('nav.settings')}</span>
              </NavLink>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10"
      >
        <Outlet />
      </motion.main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

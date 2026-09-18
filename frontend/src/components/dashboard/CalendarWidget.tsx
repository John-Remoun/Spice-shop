import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Mail,
  Trash2,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Coins,
  Receipt,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface DailySnapshotSummary {
  date: string;
  totalRevenue: number;
  totalPaidRevenue?: number;
  totalInvoicedRevenue?: number;
  totalProfit: number;
  totalSalesCount: number;
  totalProductionBatches: number;
}

interface InvoiceBreakdown {
  saleId: string;
  receiptNumber: string;
  total: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
  grossMargin: number;
  customerName: string;
  customerPhone: string;
  soldAt: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface ExpenseItem {
  _id: string;
  description: string;
  amount: number;
  date: string;
}

interface DayDetailData {
  date: string;
  totalRevenue: number;         // Primary (totalPaidRevenue)
  totalPaidRevenue?: number;
  totalInvoicedRevenue?: number;
  totalRemainingDebt?: number;
  totalProfit: number;
  totalExpenses: number;
  totalSalesCount: number;
  totalProductionBatches: number;
  totalQuantityProduced: number;
  invoicesBreakdown: InvoiceBreakdown[];
  expenses: ExpenseItem[];
}

export const CalendarWidget: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [snapshots, setSnapshots] = useState<DailySnapshotSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Fixed Expenses State
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);

  // Selected Day Modal
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Send Report State
  const [sendingReport, setSendingReport] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clear Logs Modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      const [snapshotsRes, expensesRes] = await Promise.all([
        apiClient.get(`/reports/calendar-snapshots?year=${year}&month=${month}`),
        apiClient.get(`/expenses?year=${year}&month=${month}`),
      ]);
      setSnapshots(snapshotsRes.data || []);
      setExpenses(expensesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch month calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthData();
  }, [year, month]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount || Number(expenseAmount) <= 0) return;

    setAddingExpense(true);
    try {
      const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
      await apiClient.post('/expenses', {
        description: expenseDesc.trim(),
        amount: Number(expenseAmount),
        date: todayDateStr,
      });

      setExpenseDesc('');
      setExpenseAmount('');
      fetchMonthData();
      setAlertMsg({ type: 'success', text: t('reports.expensesAdded') });
    } catch (err: any) {
      console.error('Failed to add expense:', err);
      setAlertMsg({ type: 'error', text: err.response?.data?.message || t('reports.expensesAddFailed') });
    } finally {
      setAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await apiClient.delete(`/expenses/${id}`);
      fetchMonthData();
      setAlertMsg({ type: 'success', text: t('reports.expensesDeleted') });
    } catch (err) {
      console.error('Failed to delete expense:', err);
      setAlertMsg({ type: 'error', text: t('reports.expensesDeleteFailed') });
    }
  };

  const handleDateClick = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/reports/daily-snapshot/${dateStr}`);
      setDayDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch day detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSendMonthlyReport = async () => {
    setSendingReport(true);
    setAlertMsg(null);
    try {
      const res = await apiClient.post('/reports/send-monthly-report', { year, month });
      setAlertMsg({
        type: 'success',
        text: res.data.message || t('reports.monthReportSent'),
      });
    } catch (err: any) {
      console.error('Send monthly report error:', err);
      const msg = err.response?.data?.message || t('reports.monthReportFailed');
      setAlertMsg({ type: 'error', text: msg });
    } finally {
      setSendingReport(false);
    }
  };

  const handleSendDailyReport = async (dateStr: string) => {
    setSendingReport(true);
    setAlertMsg(null);
    try {
      const res = await apiClient.post('/reports/send-daily-report', { date: dateStr });
      setAlertMsg({
        type: 'success',
        text: res.data.message || `${t('reports.dailyReportSent')} (${dateStr})`,
      });
    } catch (err: any) {
      console.error('Send daily report error:', err);
      const msg = err.response?.data?.message || t('reports.dailyReportFailed');
      setAlertMsg({ type: 'error', text: msg });
    } finally {
      setSendingReport(false);
    }
  };

  const handleClearMonthRecords = async () => {
    setClearingLogs(true);
    try {
      const res = await apiClient.delete('/reports/clear-month-records', {
        data: { year, month },
      });
      setAlertMsg({ type: 'success', text: res.data.message || t('reports.monthRecordsCleared') });
      setShowClearModal(false);
      fetchMonthData();
    } catch (err) {
      console.error('Clear month records error:', err);
      setAlertMsg({ type: 'error', text: t('reports.monthRecordsClearFailed') });
    } finally {
      setClearingLogs(false);
    }
  };

  const prevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  const today = () => setCurrentDate(new Date());

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const daysMap = new Map<string, DailySnapshotSummary>();
  snapshots.forEach((s) => daysMap.set(s.date, s));

  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonthName = isAr ? monthNamesAr[month - 1] : monthNamesEn[month - 1];

  const daysHeader = isAr
    ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
  const totalMonthExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      {alertMsg && (
        <div
          className={`p-3.5 rounded-xl flex items-center justify-between text-xs transition-all ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-[#E8E1CE]'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="p-0.5 hover:bg-black/5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Fixed Expenses Widget */}
      <div className="bg-[#FCFAF5]/90 dark:bg-[#1C241F]/95 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-[#E3DCB9] dark:border-[#2D3830] space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#263A2A] pb-2.5">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <Coins className="w-4 h-4" />
            <h3 className="text-xs font-extrabold text-gray-900 dark:text-[#F5EFE0]">
              {t('reports.fixedExpensesTitle')} {currentMonthName} {year}
            </h3>
          </div>
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200/60 dark:border-rose-900/30">
            {t('reports.totalExpenses')} {totalMonthExpenses.toLocaleString()} {t('common.currency')}
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input
            type="text"
            placeholder={t('reports.expenseReasonPlaceholder')}
            value={expenseDesc}
            onChange={(e) => setExpenseDesc(e.target.value)}
            className="sm:col-span-7 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#263A2A] bg-white dark:bg-[#17241C] text-gray-900 dark:text-[#F5EFE0] focus:ring-1 focus:ring-emerald-500 outline-none"
          />
          <input
            type="number"
            step="any"
            placeholder={t('reports.expenseAmountPlaceholder')}
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            className="sm:col-span-3 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#263A2A] bg-white dark:bg-[#17241C] text-gray-900 dark:text-[#F5EFE0] focus:ring-1 focus:ring-emerald-500 outline-none"
          />
          <button
            type="submit"
            disabled={addingExpense}
            className="sm:col-span-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all disabled:opacity-50"
          >
            {addingExpense ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{t('common.add')}</span>
          </button>
        </form>

        {/* Expenses List */}
        {expenses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {expenses.map((exp, idx) => (
              <div
                key={exp._id}
                className="flex items-center justify-between p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-gray-800 dark:text-gray-200 block truncate">{exp.description}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{exp.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-extrabold text-rose-700 dark:text-rose-400 font-mono">
                    {exp.amount} {t('common.currency')}
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(exp._id)}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Calendar Card */}
      <div className="bg-[#FCFAF5]/90 dark:bg-[#1C241F]/95 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-[#E3DCB9] dark:border-[#2D3830]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-[#263A2A]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-[#1D2E21] rounded-lg text-emerald-600 dark:text-[#E8E1CE]">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-gray-900 dark:text-[#F5EFE0] leading-tight">
                  {t('reports.calendarTitle')}
                </h2>
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-[#D5C7A3] font-medium">
                {currentMonthName} {year}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleSendMonthlyReport}
              disabled={sendingReport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-[#F5EFE0] text-[11px] font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 border border-emerald-600/30"
            >
              {sendingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              <span>{t('reports.sendMonthReport')}</span>
            </button>

            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-300 text-[11px] font-semibold rounded-lg border border-rose-200 dark:border-rose-900/30 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>{t('reports.clearMonthRecords')}</span>
            </button>

            {/* Month Nav Buttons */}
            <div className="flex items-center bg-gray-100 dark:bg-[#1A281E] p-0.5 rounded-lg border border-gray-200/50 dark:border-[#263A2A]" dir="ltr">
              <button
                onClick={prevMonth}
                title={t('reports.prevMonth')}
                className="p-1 hover:bg-white dark:hover:bg-[#263A2A] rounded text-gray-600 dark:text-[#E8E1CE] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={today}
                className="px-2.5 py-0.5 text-[11px] font-bold text-gray-700 dark:text-[#F5EFE0] hover:bg-white dark:hover:bg-[#263A2A] rounded"
              >
                {t('reports.today')}
              </button>
              <button
                onClick={nextMonth}
                title={t('reports.nextMonth')}
                className="p-1 hover:bg-white dark:hover:bg-[#263A2A] rounded text-gray-600 dark:text-[#E8E1CE] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={`grid grid-cols-7 gap-1.5 transition-opacity duration-200 ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
          {/* Weekday Headers */}
          {daysHeader.map((d, idx) => (
            <div
              key={idx}
              className="text-center py-1 text-[11px] font-bold text-gray-400 dark:text-[#D5C7A3] uppercase tracking-tight"
            >
              {d}
            </div>
          ))}

          {/* Empty Lead Cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-14 bg-gray-50/20 dark:bg-[#1A281E]/30 rounded-lg" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
            const monthStr = month < 10 ? `0${month}` : `${month}`;
            const fullDateStr = `${year}-${monthStr}-${dayStr}`;

            const snap = daysMap.get(fullDateStr);
            const isToday = fullDateStr === todayStr;
            const hasSales = snap && snap.totalRevenue > 0;

            return (
              <button
                key={fullDateStr}
                onClick={() => handleDateClick(fullDateStr)}
                className={`h-14 p-1.5 rounded-lg border text-right flex flex-col justify-between transition-all relative overflow-hidden group ${
                  isToday
                    ? 'border-emerald-600 bg-emerald-50/80 dark:bg-[#1F3324] ring-1 ring-emerald-500/30'
                    : 'border-[#E8E2CF] dark:border-[#263A2A] bg-[#FAF7EE]/60 dark:bg-[#17241C] hover:border-[#B5CBBE] dark:hover:border-[#38523C] hover:bg-emerald-50/40 dark:hover:bg-[#203325]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-700 dark:text-[#E8E1CE] group-hover:text-emerald-600 dark:group-hover:text-[#F5EFE0]'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {snap && snap.totalProductionBatches > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title={`${snap.totalProductionBatches} batch`} />
                  )}
                </div>

                {hasSales ? (
                  <div className="w-full text-right">
                    <div className="text-[10px] font-extrabold text-emerald-600 dark:text-[#E6DCB8] truncate leading-tight">
                      {snap.totalRevenue >= 1000 ? `${(snap.totalRevenue / 1000).toFixed(1)}k` : snap.totalRevenue} {t('common.currency')}
                    </div>
                  </div>
                ) : (
                  <div className="text-[9px] text-gray-300 dark:text-[#2E4233]">
                    —
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 md:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#16251C] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2E4835] overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-[#F5EFE0] flex items-center justify-between border-b border-[#2E4835] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-700/60 border border-emerald-400/30 flex items-center justify-center text-emerald-200">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#F5EFE0]">{t('reports.dayReportTitle')}</h3>
                  <p className="text-[11px] font-mono font-bold text-emerald-200/90">{selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setDayDetail(null);
                }}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-[#F5EFE0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {loadingDetail ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-500 mb-2" />
                  <span className="text-xs font-semibold">{t('common.loading')}</span>
                </div>
              ) : dayDetail ? (
                <>
                  {/* Action Bar for Sending Daily Report */}
                  <div className="flex items-center justify-between gap-2 bg-emerald-50/70 dark:bg-[#1A281E] p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      {t('reports.performanceReportFor')} {selectedDate}:
                    </span>
                    <button
                      onClick={() => handleSendDailyReport(selectedDate)}
                      disabled={sendingReport}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                    >
                      {sendingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      <span>{t('reports.sendReportByEmail')}</span>
                    </button>
                  </div>

                  {/* Summary Stat Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-2.5 bg-emerald-50/80 dark:bg-[#1A2A1E] border border-emerald-200/70 dark:border-[#263A2A] rounded-xl text-center shadow-sm">
                      <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                      <div className="text-[10px] text-gray-500 dark:text-[#D5C7A3] font-semibold">المحصّل (الإيرادات)</div>
                      <div className="text-xs font-extrabold text-emerald-700 dark:text-[#E6DCB8] mt-0.5">
                        {(dayDetail.totalPaidRevenue ?? dayDetail.totalRevenue).toLocaleString()} {t('common.currency')}
                      </div>
                      {dayDetail.totalInvoicedRevenue && dayDetail.totalInvoicedRevenue > (dayDetail.totalPaidRevenue ?? dayDetail.totalRevenue) && (
                        <div className="text-[9px] text-gray-400 mt-0.5">من {dayDetail.totalInvoicedRevenue.toLocaleString()} {t('common.currency')}</div>
                      )}
                    </div>

                    <div className="p-2.5 bg-amber-50/80 dark:bg-[#2A231E] border border-amber-200/70 dark:border-[#3A2E26] rounded-xl text-center shadow-sm">
                      <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                      <div className="text-[10px] text-gray-500 dark:text-[#D5C7A3] font-semibold">المتبقي (الآجل)</div>
                      <div className="text-xs font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">
                        {(dayDetail.totalRemainingDebt ?? 0).toLocaleString()} {t('common.currency')}
                      </div>
                    </div>

                    <div className="p-2.5 bg-teal-50/80 dark:bg-[#1A2A1E] border border-teal-200/70 dark:border-[#263A2A] rounded-xl text-center shadow-sm">
                      <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400 mx-auto mb-1" />
                      <div className="text-[10px] text-gray-500 dark:text-[#D5C7A3] font-semibold">{t('reports.netProfit')}</div>
                      <div className="text-xs font-extrabold text-teal-700 dark:text-[#E6DCB8] mt-0.5">
                        {dayDetail.totalProfit.toLocaleString()} {t('common.currency')}
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-50/80 dark:bg-[#1A2A1E] border border-blue-200/70 dark:border-[#263A2A] rounded-xl text-center shadow-sm">
                      <Package className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                      <div className="text-[10px] text-gray-500 dark:text-[#D5C7A3] font-semibold">{t('reports.batchesProduced')}</div>
                      <div className="text-xs font-extrabold text-blue-700 dark:text-[#F5EFE0] mt-0.5">
                        {dayDetail.totalProductionBatches}
                      </div>
                    </div>

                    <div className="p-2.5 bg-purple-50/80 dark:bg-[#1A2A1E] border border-purple-200/70 dark:border-[#263A2A] rounded-xl text-center shadow-sm col-span-2 sm:col-span-1">
                      <ShoppingCart className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                      <div className="text-[10px] text-gray-500 dark:text-[#D5C7A3] font-semibold">{t('reports.salesCount')}</div>
                      <div className="text-xs font-extrabold text-purple-700 dark:text-[#F5EFE0] mt-0.5">
                        {dayDetail.totalSalesCount}
                      </div>
                    </div>
                  </div>

                  {/* Invoices Breakdown Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-gray-900 dark:text-[#F5EFE0] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-emerald-600" />
                        <span>{t('reports.dailyInvoicesDetails')}</span>
                      </span>
                      <span className="text-[10px] font-normal text-gray-400">
                        {dayDetail.invoicesBreakdown?.length || 0} {t('reports.invoiceSuffix')}
                      </span>
                    </h4>

                    {dayDetail.invoicesBreakdown && dayDetail.invoicesBreakdown.length > 0 ? (
                      <div className="border border-gray-200/70 dark:border-[#263A2A] rounded-xl overflow-x-auto shadow-sm">
                        <table className="w-full text-xs text-right whitespace-nowrap">
                          <thead className="bg-gray-100/80 dark:bg-[#1A281E] text-gray-700 dark:text-[#D5C7A3] font-extrabold border-b border-gray-200/70 dark:border-[#263A2A]">
                            <tr>
                              <th className="p-2 text-center">#</th>
                              <th className="p-2 text-center">{t('reports.dateTime')}</th>
                              <th className="p-2 text-center">الإجمالي</th>
                              <th className="p-2 text-center">المحصّل</th>
                              <th className="p-2 text-center">المتبقي</th>
                              <th className="p-2 text-center">الحالة</th>
                              <th className="p-2">{t('reports.customerName')}</th>
                              <th className="p-2">{t('reports.phoneNumber')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-[#263A2A] text-gray-700 dark:text-[#E8E1CE]">
                            {dayDetail.invoicesBreakdown.map((inv, idx) => {
                              const d = new Date(inv.soldAt);
                              const timeStr = d.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                              const paidVal = inv.paidAmount !== undefined ? inv.paidAmount : (inv.paymentStatus === 'UNPAID' ? 0 : inv.total);
                              const remainingVal = inv.remainingAmount !== undefined ? inv.remainingAmount : Math.max(0, inv.total - paidVal);

                              let statusBadge = (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  مدفوع ✅
                                </span>
                              );

                              if (inv.paymentStatus === 'UNPAID' || remainingVal >= inv.total) {
                                statusBadge = (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                    غير مدفوع ❌
                                  </span>
                                );
                              } else if (inv.paymentStatus === 'PARTIAL' || remainingVal > 0) {
                                statusBadge = (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    جزئي ⏳
                                  </span>
                                );
                              }

                              const isExpanded = expandedSaleId === inv.saleId;
                              return (
                                <React.Fragment key={inv.saleId}>
                                  <tr
                                    onClick={() => setExpandedSaleId(isExpanded ? null : inv.saleId)}
                                    className="hover:bg-emerald-50/40 dark:hover:bg-[#1A281E]/60 transition-colors cursor-pointer"
                                    title="اضغط لعرض بنود الفاتورة"
                                  >
                                    <td className="p-2 text-center font-bold">{idx + 1}</td>
                                    <td className="p-2 text-center font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                      {timeStr}
                                    </td>
                                    <td className="p-2 text-center font-extrabold text-gray-900 dark:text-[#F5EFE0]">
                                      {inv.total.toLocaleString()} {t('common.currency')}
                                    </td>
                                    <td className="p-2 text-center font-extrabold text-emerald-600 dark:text-[#E6DCB8]">
                                      {paidVal.toLocaleString()} {t('common.currency')}
                                    </td>
                                    <td className={`p-2 text-center font-extrabold ${remainingVal > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                                      {remainingVal.toLocaleString()} {t('common.currency')}
                                    </td>
                                    <td className="p-2 text-center">{statusBadge}</td>
                                    <td className="p-2 font-semibold text-gray-900 dark:text-[#F5EFE0]">{inv.customerName}</td>
                                    <td className="p-2 font-mono text-[11px] text-gray-500">{inv.customerPhone}</td>
                                  </tr>
                                  {isExpanded && inv.items && inv.items.length > 0 && (
                                    <tr className="bg-emerald-50/20 dark:bg-[#16221A] border-b border-emerald-100 dark:border-emerald-950">
                                      <td colSpan={8} className="p-2.5 sm:p-3">
                                        <div className="bg-white/80 dark:bg-[#1A2A1E] rounded-xl p-3 border border-emerald-200/50 dark:border-[#2E4835] space-y-2">
                                          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                            <span>تفاصيل محتويات الفاتورة ({inv.receiptNumber}):</span>
                                            <span className="text-[10px] text-gray-400 font-normal">إجمالي الهامش: {inv.grossMargin?.toFixed(2)} {t('common.currency')}</span>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            {inv.items.map((it, iIdx) => (
                                              <div key={iIdx} className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-brand-sage/10 text-xs flex justify-between items-center">
                                                <span className="font-semibold text-gray-800 dark:text-[#E8E1CE] truncate max-w-[130px]">{it.productName}</span>
                                                <span className="font-mono font-bold text-emerald-700 dark:text-[#E6DCB8]">
                                                  {it.quantity} {it.unit ? it.unit : ''} × {it.unitPrice.toFixed(2)} = {it.totalPrice.toFixed(2)}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-gray-50/50 dark:bg-[#1A281E]/40 rounded-xl text-gray-400 dark:text-[#9AA89C] text-xs">
                        {t('reports.noSalesThisDay')}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-gray-400 dark:text-[#9AA89C] text-xs">{t('reports.noDataRecorded')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Snapshots Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131E17] w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-[#263A2A] space-y-3">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-[#F5EFE0]">
                {t('reports.clearMonthModalTitle')} {currentMonthName} {year}
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-[#E8E1CE] leading-relaxed">
              {t('reports.clearMonthConfirmMsg')} ({currentMonthName} {year})
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-[#D5C7A3] hover:bg-gray-100 dark:hover:bg-[#1A281E] rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleClearMonthRecords}
                disabled={clearingLogs}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {clearingLogs && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>{t('reports.clearAllNow')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export interface InvoiceItem {
  receiptNumber: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  customerName?: string;
  customerPhone?: string;
  soldAt: Date | string;
}

export interface ExpenseItem {
  description: string;
  amount: number;
  date: string;
}

export interface ReportEmailData {
  storeName: string;
  periodTitle: string; // e.g. "تقرير شهر سبتمبر 2026" or "التقرير اليومي (2026-09-13)"
  salesTableTitle: string; // "تفاصيل عمليات البيع الشهرية" or "تفاصيل عمليات البيع اليومية"
  dateStr: string;
  totalPaidRevenue: number;     // الإيرادات المحصلة فعلياً
  totalInvoicedRevenue: number; // إجمالي قيمة الفواتير
  totalRemainingDebt: number;   // إجمالي المتبقي (آجل)
  totalRealizedGrossMargin?: number;
  totalUnrealizedGrossMargin?: number;
  totalRealizedProfit: number;  // صافي الربح المحصل
  totalInvoicedProfit: number;  // صافي الربح الكلي للفواتير
  totalExpenses: number;
  totalSalesCount: number;
  totalProductionBatches: number;
  totalQuantityProduced: number;
  invoices: InvoiceItem[];
  expenses: ExpenseItem[];
  currencySymbol: string;
}

export function generateReportHtml(data: ReportEmailData): string {
  const {
    storeName,
    periodTitle,
    salesTableTitle,
    dateStr,
    totalPaidRevenue,
    totalInvoicedRevenue,
    totalRemainingDebt,
    totalRealizedGrossMargin,
    totalUnrealizedGrossMargin,
    totalRealizedProfit,
    totalInvoicedProfit,
    totalExpenses,
    totalSalesCount,
    totalProductionBatches,
    totalQuantityProduced,
    invoices,
    expenses,
    currencySymbol,
  } = data;

  const isMonthlyReport = periodTitle.includes('شهري') || periodTitle.includes('شهر') || totalUnrealizedGrossMargin !== undefined;

  const fmtCurrency = (val: number) => {
    return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const invoiceRows = invoices.length > 0
    ? invoices.map((inv, idx) => {
        const d = new Date(inv.soldAt);
        const timeStr = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const dateFormatted = d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const name = inv.customerName || 'عميل نقدي';
        const phone = inv.customerPhone || '—';

        let statusBadge = `<span style="background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-block;">مدفوع بالكامل</span>`;
        if (inv.remainingAmount <= 0) {
          statusBadge = `<span style="background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-block;">مدفوع بالكامل</span>`;
        } else if (inv.paidAmount > 0) {
          statusBadge = `<span style="background-color: #fef9c3; color: #854d0e; border: 1px solid #fef08a; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-block;">سداد دفعة</span>`;
        } else {
          statusBadge = `<span style="background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-block;">غير مدفوع</span>`;
        }

        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 8px; font-weight: 700; color: #111827; text-align: center;">${idx + 1}</td>
            <td style="padding: 10px 8px; color: #4b5563; text-align: center; direction: ltr; font-size: 11px;">${dateFormatted} ${timeStr}</td>
            <td style="padding: 10px 8px; font-weight: 800; color: #1f2937; text-align: center;">${fmtCurrency(inv.total)} ${currencySymbol}</td>
            <td style="padding: 10px 8px; font-weight: 800; color: #059669; text-align: center;">${fmtCurrency(inv.paidAmount)} ${currencySymbol}</td>
            <td style="padding: 10px 8px; font-weight: 800; color: ${inv.remainingAmount > 0 ? '#dc2626' : '#6b7280'}; text-align: center;">${fmtCurrency(inv.remainingAmount)} ${currencySymbol}</td>
            <td style="padding: 10px 8px; text-align: center;">${statusBadge}</td>
            <td style="padding: 10px 8px; font-weight: 700; color: #1f2937;">${name}</td>
            <td style="padding: 10px 8px; color: #6b7280; font-family: monospace; font-size: 11px;">${phone}</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="8" style="padding: 20px; text-align: center; color: #9ca3af; font-size: 13px;">لا توجد فواتير مبيعات مسجلة في هذا الشهر</td></tr>`;

  const expenseRows = expenses.length > 0
    ? expenses.map((exp, idx) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 12px; font-weight: 700; color: #dc2626; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-weight: 700; color: #1f2937;">${exp.description}</td>
          <td style="padding: 10px 12px; font-weight: 800; color: #dc2626; text-align: center;">${fmtCurrency(exp.amount)} ${currencySymbol}</td>
          <td style="padding: 10px 12px; color: #6b7280; text-align: center; font-family: monospace; font-size: 12px;">${exp.date}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #9ca3af; font-size: 13px;">لا توجد مصاريف ثابتة مسجلة في هذا الشهر</td></tr>`;

  // Section 1: KPI Cards Grid
  let kpiCardsHtml = '';
  if (isMonthlyReport) {
    const realizedMargin = totalRealizedGrossMargin ?? totalRealizedProfit;
    const unrealizedMargin = totalUnrealizedGrossMargin ?? 0;

    kpiCardsHtml = `
      <!-- Row 1: Green Cards -->
      <tr>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #047857; font-weight: 700; margin-bottom: 6px;">💵 الإيرادات المحصلة (نقداً)</div>
            <div style="font-size: 22px; font-weight: 800; color: #065f46; letter-spacing: -0.5px;">${fmtCurrency(totalPaidRevenue)} ${currencySymbol}</div>
            <div style="font-size: 11px; color: #059669; margin-top: 4px; font-weight: 600;">من إجمالي فواتير بقيمة ${fmtCurrency(totalInvoicedRevenue)} ${currencySymbol}</div>
          </div>
        </td>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #047857; font-weight: 700; margin-bottom: 6px;">💵 صافي الربح المحصّل (الفعلي)</div>
            <div style="font-size: 22px; font-weight: 800; color: #065f46; letter-spacing: -0.5px;">${fmtCurrency(realizedMargin)} ${currencySymbol}</div>
            <div style="font-size: 11px; color: #059669; margin-top: 4px; font-weight: 600;">المحسوب بناءً على الكاش المحصّل فقط</div>
          </div>
        </td>
      </tr>

      <!-- Row 2: Amber/Yellow Cards -->
      <tr>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #b45309; font-weight: 700; margin-bottom: 6px;">⏳ المتبقي غير المدفوع (آجل)</div>
            <div style="font-size: 22px; font-weight: 800; color: #92400e; letter-spacing: -0.5px;">${fmtCurrency(totalRemainingDebt)} ${currencySymbol}</div>
            <div style="font-size: 11px; color: #d97706; margin-top: 4px; font-weight: 600;">مستحقات على العملاء لم تُحصل بعد</div>
          </div>
        </td>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #b45309; font-weight: 700; margin-bottom: 6px;">⏳ صافي الربح غير المحصل (آجل)</div>
            <div style="font-size: 22px; font-weight: 800; color: #92400e; letter-spacing: -0.5px;">${fmtCurrency(unrealizedMargin)} ${currencySymbol}</div>
            <div style="font-size: 11px; color: #d97706; margin-top: 4px; font-weight: 600;">أرباح متوقعة عند سداد باقي الآجل</div>
          </div>
        </td>
      </tr>

      <!-- Row 3: Expenses (Red) & Production (Purple) -->
      <tr>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #fef2f2; border: 1.5px solid #fecaca; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #b91c1c; font-weight: 700; margin-bottom: 6px;">💸 المصاريف الثابتة</div>
            <div style="font-size: 22px; font-weight: 800; color: #991b1b; letter-spacing: -0.5px;">${fmtCurrency(totalExpenses)} ${currencySymbol}</div>
            <div style="font-size: 11px; color: #dc2626; margin-top: 4px; font-weight: 600;">${expenses.length} بند مصروفات</div>
          </div>
        </td>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #7e22ce; font-weight: 700; margin-bottom: 6px;">🏭 دفعات الإنتاج</div>
            <div style="font-size: 22px; font-weight: 800; color: #6b21a8; letter-spacing: -0.5px;">${totalProductionBatches} دفعة</div>
            <div style="font-size: 11px; color: #9333ea; margin-top: 4px; font-weight: 600;">${Number(totalQuantityProduced).toLocaleString()} كمية مصنعة</div>
          </div>
        </td>
      </tr>
    `;
  } else {
    // Daily report fallback cards
    kpiCardsHtml = `
      <tr>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; text-align: center;">
            <div style="font-size: 12px; color: #047857; font-weight: 700; margin-bottom: 4px;">💵 المحصل (الإيرادات)</div>
            <div style="font-size: 20px; font-weight: 800; color: #065f46;">${fmtCurrency(totalPaidRevenue)} ${currencySymbol}</div>
          </div>
        </td>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; text-align: center;">
            <div style="font-size: 12px; color: #b45309; font-weight: 700; margin-bottom: 4px;">⏳ المتبقي (الآجل)</div>
            <div style="font-size: 20px; font-weight: 800; color: #92400e;">${fmtCurrency(totalRemainingDebt)} ${currencySymbol}</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; text-align: center;">
            <div style="font-size: 12px; color: #15803d; font-weight: 700; margin-bottom: 4px;">📈 صافي الأرباح</div>
            <div style="font-size: 20px; font-weight: 800; color: #166534;">${fmtCurrency(totalRealizedProfit)} ${currencySymbol}</div>
          </div>
        </td>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; text-align: center;">
            <div style="font-size: 12px; color: #1d4ed8; font-weight: 700; margin-bottom: 4px;">🧾 إجمالي قيمة الفواتير</div>
            <div style="font-size: 20px; font-weight: 800; color: #1e40af;">${fmtCurrency(totalInvoicedRevenue)} ${currencySymbol}</div>
            <div style="font-size: 11px; color: #2563eb; margin-top: 2px;">${totalSalesCount} عملية بيع (ربح كلي متوقع: ${fmtCurrency(totalInvoicedProfit)} ${currencySymbol})</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding: 6px;">
          <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 14px; text-align: center;">
            <div style="font-size: 12px; color: #7e22ce; font-weight: 700; margin-bottom: 4px;">🏭 دفعات الإنتاج</div>
            <div style="font-size: 20px; font-weight: 800; color: #6b21a8;">${totalProductionBatches} دفعة</div>
            <div style="font-size: 11px; color: #9333ea; margin-top: 2px;">${Number(totalQuantityProduced).toLocaleString()} كمية مصنعة</div>
          </div>
        </td>
        <td width="50%" style="padding: 6px;"></td>
      </tr>
    `;
  }

  const fixedExpensesSection = (isMonthlyReport || expenses.length > 0)
    ? `
      <tr>
        <td style="padding: 0 24px 24px 24px;">
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <h2 style="margin: 0 0 14px 0; font-size: 16px; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 8px;">
              <span>💸 المصاريف الثابتة المسجلة للشهر (${expenses.length} بند)</span>
            </h2>

            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background-color: #f9fafb; border-bottom: 1.5px solid #e5e7eb; text-align: right;">
                  <th style="padding: 10px 12px; color: #374151; text-align: center; font-weight: 800;">#</th>
                  <th style="padding: 10px 12px; color: #374151; font-weight: 800;">سبب المصروف</th>
                  <th style="padding: 10px 12px; color: #374151; text-align: center; font-weight: 800;">المبلغ</th>
                  <th style="padding: 10px 12px; color: #374151; text-align: center; font-weight: 800;">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                ${expenseRows}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${periodTitle} - ${storeName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #111827; direction: rtl; text-align: right;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="740" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #064e3b 0%, #065f46 60%, #022c22 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #f5efe0;">${storeName}</h1>
              <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.95; font-weight: 600; color: #a7f3d0;">${periodTitle}</p>
              <div style="display: inline-block; margin-top: 12px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); padding: 5px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #ffffff;">
                📅 ${dateStr}
              </div>
            </td>
          </tr>

          <!-- Section 1: KPI Cards Grid -->
          <tr>
            <td style="padding: 24px 24px 16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${kpiCardsHtml}
              </table>
            </td>
          </tr>

          <!-- Section 2: Invoices Table -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <h2 style="margin: 0 0 14px 0; font-size: 16px; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 8px;">
                  <span>🧾 ${salesTableTitle} (${invoices.length} فاتورة)</span>
                </h2>

                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; border-collapse: collapse; font-size: 12px;">
                  <thead>
                    <tr style="background-color: #f9fafb; border-bottom: 1.5px solid #e5e7eb; text-align: right;">
                      <th style="padding: 10px 8px; color: #374151; text-align: center; font-weight: 800;">#</th>
                      <th style="padding: 10px 8px; color: #374151; text-align: center; font-weight: 800;">التاريخ والوقت</th>
                      <th style="padding: 10px 8px; color: #374151; text-align: center; font-weight: 800;">إجمالي الفاتورة</th>
                      <th style="padding: 10px 8px; color: #374151; text-align: center; font-weight: 800;">المحصّل</th>
                      <th style="padding: 10px 8px; color: #374151; text-align: center; font-weight: 800;">المتبقي</th>
                      <th style="padding: 10px 8px; color: #374151; text-align: center; font-weight: 800;">الحالة</th>
                      <th style="padding: 10px 8px; color: #374151; font-weight: 800;">اسم العميل</th>
                      <th style="padding: 10px 8px; color: #374151; font-weight: 800;">رقم التليفون</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${invoiceRows}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>

          <!-- Section 3: Fixed Expenses Table -->
          ${fixedExpensesSection}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
              تم إرسال هذا التقرير تلقائياً من نظام <strong>${storeName} ERP</strong>.<br>
              © ${new Date().getFullYear()} جميع الحقوق محفوظة لـ STACK.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

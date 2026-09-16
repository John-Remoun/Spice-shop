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

  const invoiceRows = invoices.length > 0
    ? invoices.map((inv, idx) => {
        const d = new Date(inv.soldAt);
        const timeStr = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const dateFormatted = d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const name = inv.customerName || 'عميل نقدي';
        const phone = inv.customerPhone || 'غير متوفر';

        let statusBadge = `<span style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-block;">مدفوعة ✅</span>`;
        if (inv.paymentStatus === 'UNPAID' || inv.remainingAmount >= inv.total) {
          statusBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-block;">غير مدفوع ❌</span>`;
        } else if (inv.paymentStatus === 'PARTIAL' || inv.remainingAmount > 0) {
          statusBadge = `<span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-block;">جزئي ⏳</span>`;
        }

        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 10px; font-weight: 700; color: #111827; text-align: center;">${idx + 1}</td>
            <td style="padding: 10px 10px; color: #4b5563; text-align: center; direction: ltr; font-size: 12px;">${dateFormatted} ${timeStr}</td>
            <td style="padding: 10px 10px; font-weight: 800; color: #1f2937; text-align: center;">${inv.total.toLocaleString()} ${currencySymbol}</td>
            <td style="padding: 10px 10px; font-weight: 800; color: #059669; text-align: center;">${inv.paidAmount.toLocaleString()} ${currencySymbol}</td>
            <td style="padding: 10px 10px; font-weight: 800; color: ${inv.remainingAmount > 0 ? '#dc2626' : '#6b7280'}; text-align: center;">${inv.remainingAmount.toLocaleString()} ${currencySymbol}</td>
            <td style="padding: 10px 10px; text-align: center;">${statusBadge}</td>
            <td style="padding: 10px 10px; font-weight: 600; color: #1f2937;">${name}</td>
            <td style="padding: 10px 10px; color: #6b7280; font-family: monospace; font-size: 12px;">${phone}</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="8" style="padding: 16px; text-align: center; color: #9ca3af;">لا توجد فواتير بيع مسجلة خلال هذه الفترة.</td></tr>`;

  const expenseRows = expenses.length > 0
    ? expenses.map((exp, idx) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 12px; font-weight: 700; color: #dc2626; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #1f2937;">${exp.description}</td>
          <td style="padding: 10px 12px; font-weight: 800; color: #dc2626; text-align: center;">${exp.amount.toLocaleString()} ${currencySymbol}</td>
          <td style="padding: 10px 12px; color: #6b7280; text-align: center; font-family: monospace;">${exp.date}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #9ca3af;">لا توجد مصاريف ثابتة مسجلة خلال هذه الفترة.</td></tr>`;

  const fixedExpensesSection = expenses.length > 0
    ? `
      <tr>
        <td style="padding: 0 24px 24px 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827; border-bottom: 2px solid #dc2626; padding-bottom: 8px; display: inline-block;">
            💸 المصاريف الثابتة المسجلة (${expenses.length})
          </h2>

          <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb; text-align: right;">
                <th style="padding: 10px 12px; color: #374151; text-align: center;">#</th>
                <th style="padding: 10px 12px; color: #374151;">سبب المصروف</th>
                <th style="padding: 10px 12px; color: #374151; text-align: center;">المبلغ</th>
                <th style="padding: 10px 12px; color: #374151; text-align: center;">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRows}
            </tbody>
          </table>
        </td>
      </tr>
    `
    : `
      <tr>
        <td style="padding: 0 24px 24px 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827; border-bottom: 2px solid #dc2626; padding-bottom: 8px; display: inline-block;">
            💸 المصاريف الثابتة المسجلة (0)
          </h2>
          <div style="padding: 16px; text-align: center; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; color: #6b7280; font-size: 13px;">
            لا توجد مصاريف ثابتة مسجلة لهذه الفترة.
          </div>
        </td>
      </tr>
    `;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${periodTitle} - ${storeName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="720" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">${storeName}</h1>
              <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.95; font-weight: 600;">${periodTitle} 📊</p>
              <div style="display: inline-block; margin-top: 12px; background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                📅 ${dateStr}
              </div>
            </td>
          </tr>

          <!-- Summary Grid -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827; border-bottom: 2px solid #10b981; padding-bottom: 8px; display: inline-block;">
                ملخص الأداء المالي والتحصيل
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; text-align: center;">
                      <div style="font-size: 12px; color: #047857; font-weight: 700; margin-bottom: 4px;">💵 الإيرادات المحصلة (نقداً)</div>
                      <div style="font-size: 22px; font-weight: 800; color: #065f46;">${totalPaidRevenue.toLocaleString()} ${currencySymbol}</div>
                      <div style="font-size: 11px; color: #059669; margin-top: 2px;">من إجمالي فواتير بقيمة ${totalInvoicedRevenue.toLocaleString()} ${currencySymbol}</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; text-align: center;">
                      <div style="font-size: 12px; color: #b45309; font-weight: 700; margin-bottom: 4px;">⏳ المتبقي غير المدفوع (آجل)</div>
                      <div style="font-size: 22px; font-weight: 800; color: #92400e;">${totalRemainingDebt.toLocaleString()} ${currencySymbol}</div>
                      <div style="font-size: 11px; color: #d97706; margin-top: 2px;">مستحقات على العملاء لم تُصل بعد</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; text-align: center;">
                      <div style="font-size: 12px; color: #15803d; font-weight: 700; margin-bottom: 4px;">📈 صافي الربح المحصّل (الفعلي)</div>
                      <div style="font-size: 22px; font-weight: 800; color: #166534;">${totalRealizedProfit.toLocaleString()} ${currencySymbol}</div>
                      <div style="font-size: 11px; color: #16a34a; margin-top: 2px;">المحسوب بناءً على الكاش المحصّل فقط</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; text-align: center;">
                      <div style="font-size: 12px; color: #1d4ed8; font-weight: 700; margin-bottom: 4px;">🧾 إجمالي قيمة الفواتير</div>
                      <div style="font-size: 22px; font-weight: 800; color: #1e40af;">${totalInvoicedRevenue.toLocaleString()} ${currencySymbol}</div>
                      <div style="font-size: 11px; color: #2563eb; margin-top: 2px;">${totalSalesCount} عملية بيع (ربح كلي متوقع: ${totalInvoicedProfit.toLocaleString()} ${currencySymbol})</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px; text-align: center;">
                      <div style="font-size: 12px; color: #b91c1c; font-weight: 700; margin-bottom: 4px;">💸 المصاريف الثابتة</div>
                      <div style="font-size: 20px; font-weight: 800; color: #991b1b;">${totalExpenses.toLocaleString()} ${currencySymbol}</div>
                      <div style="font-size: 11px; color: #dc2626; margin-top: 2px;">${expenses.length} بند مصروفات</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 14px; text-align: center;">
                      <div style="font-size: 12px; color: #7e22ce; font-weight: 700; margin-bottom: 4px;">🏭 دفعات الإنتاج</div>
                      <div style="font-size: 20px; font-weight: 800; color: #6b21a8;">${totalProductionBatches} دفعة</div>
                      <div style="font-size: 11px; color: #9333ea; margin-top: 2px;">${totalQuantityProduced.toLocaleString()} كمية مصنعة</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invoices Table -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827; border-bottom: 2px solid #059669; padding-bottom: 8px; display: inline-block;">
                🧾 ${salesTableTitle} (${invoices.length})
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb; text-align: right;">
                    <th style="padding: 10px 8px; color: #374151; text-align: center;">#</th>
                    <th style="padding: 10px 8px; color: #374151; text-align: center;">التاريخ والوقت</th>
                    <th style="padding: 10px 8px; color: #374151; text-align: center;">إجمالي الفاتورة</th>
                    <th style="padding: 10px 8px; color: #374151; text-align: center;">المحّصل</th>
                    <th style="padding: 10px 8px; color: #374151; text-align: center;">المتبقي</th>
                    <th style="padding: 10px 8px; color: #374151; text-align: center;">الحالة</th>
                    <th style="padding: 10px 8px; color: #374151;">اسم العميل</th>
                    <th style="padding: 10px 8px; color: #374151;">رقم التليفون</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Fixed Expenses Table -->
          ${fixedExpensesSection}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">
              تم إرسال هذا التقرير بطلب مباشر من <strong>${storeName} ERP</strong>.<br>
              © ${new Date().getFullYear()} ${storeName}. جميع الحقوق محفوظة.
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

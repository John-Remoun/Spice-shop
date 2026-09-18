import { BrevoClient } from '@getbrevo/brevo';
import User, { IUser } from '../models/User';
import Setting from '../models/Setting';
import Sale, { ISale } from '../models/Sale';
import ProductionBatch, { IProductionBatch } from '../models/ProductionBatch';
import Expense, { IExpense } from '../models/Expense';
import { generateReportHtml } from '../utils/dailyReportTemplate';
import { formatToDateStr, getDayRange, getMonthRange } from '../utils/dateUtils';

/**
 * Core function to send transactional emails via Brevo HTTP API (Port 443).
 * Sender: name: 'Spice Shop', email: process.env.EMAIL_USER || 'pssystem74@gmail.com'
 */
export async function sendEmail(recipients: string[], subject: string, htmlContent: string) {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (process.env.EMAIL_USER || '').trim();

  if (!apiKey) {
    throw new Error('مفتاح BREVO_API_KEY غير معرف في متغيرات البيئة (Environment Variables) على Render');
  }

  if (!senderEmail) {
    throw new Error('بريد المرسل EMAIL_USER غير معرف في متغيرات البيئة على Render');
  }

  const validRecipients = recipients.filter((e) => e && e.trim() && e.includes('@'));
  if (validRecipients.length === 0) {
    throw new Error('لم يتم العثور على أي بريد إلكتروني صالح للمستلمين');
  }

  try {
    const client = new BrevoClient({ apiKey });

    console.log(`[Brevo HTTP API] Dispatching email to ${validRecipients.length} recipient(s):`, validRecipients);
    
    const response = await client.transactionalEmails.sendTransacEmail({
      sender: {
        name: 'Spice Shop',
        email: senderEmail,
      },
      to: validRecipients.map((email) => ({ email: email.trim() })),
      subject,
      htmlContent,
    });

    console.log(`[Brevo HTTP API] ✅ Email successfully delivered via Brevo API!`);
    return response;
  } catch (sdkError: any) {
    console.warn(`[Brevo API] BrevoClient failed (${sdkError.message}), attempting direct HTTP POST fallback...`);
    
    // Direct Brevo HTTP API POST over Port 443
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Spice Shop', email: senderEmail },
        to: validRecipients.map((email) => ({ email: email.trim() })),
        subject,
        htmlContent,
      }),
    });

    const data: any = await res.json();
    if (res.ok) {
      console.log(`[Brevo HTTP API] ✅ Email successfully delivered! MessageId: ${data?.messageId}`);
      return data;
    }

    throw new Error(`فشل إرسال البريد الإلكتروني عبر Brevo API: ${data?.message || JSON.stringify(data)}`);
  }
}

/**
 * Sends OTP 6-digit verification code to the target user's email address via Brevo HTTP API.
 */
export async function sendOtpEmail(toEmail: string, otpCode: string) {
  if (!toEmail) return;
  console.log(`[OTP Email] Dispatching 6-digit OTP (${otpCode}) to: ${toEmail}`);
  await sendEmail(
    [toEmail],
    `كود التحقق الخاص بك لإعادة تعيين كلمة السر: ${otpCode}`,
    `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 25px; background-color: #f9f9f9; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h2 style="color: #15803d; margin-top: 0;">كود التحقق لإعادة تعيين كلمة السر (OTP)</h2>
        <p style="font-size: 15px; color: #374151;">لقد طلبت إعادة تعيين كلمة السر الخاصة بحسابك. كود التحقق الخاص بك هو:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #15803d; background: #e6f4ea; padding: 18px; text-align: center; border-radius: 10px; margin: 20px 0; border: 1px solid #a7f3d0;">
          ${otpCode}
        </div>
        <p style="font-size: 13px; color: #6b7280;">هذا الكود صالح لمدة 10 دقائق. إذا لم تطلب هذا الكود، يرجى تجاهل هذه الرسالة.</p>
      </div>
    `
  );
}

/**
 * Fetches all registered user email addresses ONLY from MongoDB database.
 * Explicitly excludes system/admin emails specified by user: e2989633@gmail.com and pssystem74@gmail.com
 */
export async function getRecipientEmails(): Promise<string[]> {
  const EXCLUDED_EMAILS = ['e2989633@gmail.com', 'pssystem74@gmail.com'];

  const allUsers: IUser[] = await User.find({
    email: { $exists: true, $ne: '' },
  });

  const recipientList: string[] = [];

  for (const u of allUsers) {
    if (u.email && u.email.trim() && u.email.includes('@')) {
      const emailLower = u.email.trim().toLowerCase();
      if (!EXCLUDED_EMAILS.includes(emailLower)) {
        recipientList.push(emailLower);
      }
    }
  }

  const recipients = Array.from(new Set(recipientList));
  console.log(`[Report Recipient List] ${recipients.length} registered user email(s) found in MongoDB (after exclusions):`, recipients);
  return recipients;
}

/**
 * Generates and dispatches Daily Report email to ALL registered users in MongoDB via Brevo HTTP API.
 */
export async function sendDailyReportEmail(targetDate: Date = new Date()) {
  const dYear = targetDate.getFullYear();
  const dMonth = targetDate.getMonth() + 1;
  const dDay = targetDate.getDate();
  const monthStr = dMonth < 10 ? `0${dMonth}` : `${dMonth}`;
  const dayStr = dDay < 10 ? `0${dDay}` : `${dDay}`;
  const dateStr = `${dYear}-${monthStr}-${dayStr}`;

  const startOfDay = new Date(dYear, dMonth - 1, dDay, 0, 0, 0, 0);
  const endOfDay = new Date(dYear, dMonth - 1, dDay, 23, 59, 59, 999);

  const setting = await Setting.findOne();
  const storeName = setting?.storeName || 'Spice shop';

  const sales: ISale[] = await Sale.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ createdAt: 1 });

  let totalInvoicedRevenue = 0;
  let totalPaidRevenue = 0;
  let totalRemainingDebt = 0;
  let totalInvoicedGrossMargin = 0;
  let totalRealizedGrossMargin = 0;

  const invoices = sales.map((s) => {
    const total = s.total || 0;
    const paidAmount = s.paidAmount !== undefined ? s.paidAmount : (s.paymentStatus === 'UNPAID' ? 0 : total);
    const remainingAmount = s.remainingAmount !== undefined ? s.remainingAmount : Math.max(0, total - paidAmount);
    const grossMargin = s.grossMargin || 0;

    const marginRatio = total > 0 ? grossMargin / total : 0;
    const realizedMargin = paidAmount * marginRatio;

    totalInvoicedRevenue += total;
    totalPaidRevenue += paidAmount;
    totalRemainingDebt += remainingAmount;
    totalInvoicedGrossMargin += grossMargin;
    totalRealizedGrossMargin += realizedMargin;

    return {
      receiptNumber: s.receiptNumber,
      total,
      paidAmount,
      remainingAmount,
      paymentStatus: s.paymentStatus || (remainingAmount >= total ? 'UNPAID' : (remainingAmount > 0 ? 'PARTIAL' : 'PAID')),
      customerName: s.customerName || 'عميل نقدي',
      customerPhone: s.customerPhone || 'غير متوفر',
      soldAt: s.createdAt,
    };
  });

  const batches: IProductionBatch[] = await ProductionBatch.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  let totalQuantityProduced = 0;
  for (const b of batches) {
    totalQuantityProduced += b.quantityProduced || 0;
  }

  const expenses: IExpense[] = await Expense.find({ date: dateStr }).sort({ createdAt: 1 });
  let totalExpenses = 0;
  const formattedExpenses = expenses.map((e) => {
    totalExpenses += e.amount || 0;
    return {
      description: e.description || 'مصروف ثابت',
      amount: e.amount || 0,
      date: e.date || dateStr,
    };
  });

  const totalRealizedProfit = totalRealizedGrossMargin - totalExpenses;
  const totalInvoicedProfit = totalInvoicedGrossMargin - totalExpenses;

  const recipients = await getRecipientEmails();
  if (recipients.length === 0) {
    return { success: false, message: 'لم يتم العثور على أي بريد إلكتروني للمستخدمين لإرسال التقرير', recipients: [] };
  }

  const html = generateReportHtml({
    storeName,
    periodTitle: `التقرير اليومي (${dateStr})`,
    salesTableTitle: 'تفاصيل عمليات البيع اليومية',
    dateStr,
    totalPaidRevenue,
    totalInvoicedRevenue,
    totalRemainingDebt,
    totalRealizedProfit,
    totalInvoicedProfit,
    totalExpenses,
    totalSalesCount: sales.length,
    totalProductionBatches: batches.length,
    totalQuantityProduced,
    invoices,
    expenses: formattedExpenses,
    currencySymbol: 'ج.م',
  });

  try {
    await sendEmail(
      recipients,
      `التقرير اليومي - ${storeName} (${dateStr})`,
      html
    );
    console.log(`[Daily Report] Sent successfully via Brevo HTTP API to all registered users: ${recipients.join(', ')}`);
    return { success: true, recipients };
  } catch (error: any) {
    console.error('[Daily Report] Error sending email via Brevo API:', error.message || error);
    return { success: false, error: error.message || String(error), recipients };
  }
}

/**
 * Generates and dispatches Monthly Report email to ALL registered users in MongoDB via Brevo HTTP API.
 */
export async function sendMonthlyReportEmail(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month - 1, daysInMonth, 23, 59, 59, 999);

  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const periodLabel = `شهـر ${monthStr}/${year}`;

  const setting = await Setting.findOne();
  const storeName = setting?.storeName || 'Spice shop';

  const sales: ISale[] = await Sale.find({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
  }).sort({ createdAt: 1 });

  let totalInvoicedRevenue = 0;
  let totalPaidRevenue = 0;
  let totalRemainingDebt = 0;
  let totalInvoicedGrossMargin = 0;
  let totalRealizedGrossMargin = 0;

  const invoices = sales.map((s) => {
    const total = s.total || 0;
    const paidAmount = s.paidAmount !== undefined ? s.paidAmount : (s.paymentStatus === 'UNPAID' ? 0 : total);
    const remainingAmount = s.remainingAmount !== undefined ? s.remainingAmount : Math.max(0, total - paidAmount);
    const grossMargin = s.grossMargin || 0;

    const marginRatio = total > 0 ? grossMargin / total : 0;
    const realizedMargin = paidAmount * marginRatio;

    totalInvoicedRevenue += total;
    totalPaidRevenue += paidAmount;
    totalRemainingDebt += remainingAmount;
    totalInvoicedGrossMargin += grossMargin;
    totalRealizedGrossMargin += realizedMargin;

    return {
      receiptNumber: s.receiptNumber,
      total,
      paidAmount,
      remainingAmount,
      paymentStatus: s.paymentStatus || (remainingAmount >= total ? 'UNPAID' : (remainingAmount > 0 ? 'PARTIAL' : 'PAID')),
      customerName: s.customerName || 'عميل نقدي',
      customerPhone: s.customerPhone || 'غير متوفر',
      soldAt: s.createdAt,
    };
  });

  const batches: IProductionBatch[] = await ProductionBatch.find({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
  });

  let totalQuantityProduced = 0;
  for (const b of batches) {
    totalQuantityProduced += b.quantityProduced || 0;
  }

  const expenses: IExpense[] = await Expense.find({ year, month }).sort({ createdAt: 1 });
  let totalExpenses = 0;
  const formattedExpenses = expenses.map((e) => {
    totalExpenses += e.amount || 0;
    return {
      description: e.description || 'مصروف ثابت',
      amount: e.amount || 0,
      date: e.date || periodLabel,
    };
  });

  const totalRealizedProfit = totalRealizedGrossMargin - totalExpenses;
  const totalInvoicedProfit = totalInvoicedGrossMargin - totalExpenses;

  const recipients = await getRecipientEmails();
  if (recipients.length === 0) {
    return { success: false, message: 'لم يتم العثور على أي بريد إلكتروني للمستخدمين لإرسال التقرير', recipients: [] };
  }

  const html = generateReportHtml({
    storeName,
    periodTitle: `التقرير الشهري الشامل - ${periodLabel}`,
    salesTableTitle: 'تفاصيل عمليات البيع الشهرية',
    dateStr: `${periodLabel} (1 - ${daysInMonth})`,
    totalPaidRevenue,
    totalInvoicedRevenue,
    totalRemainingDebt,
    totalRealizedProfit,
    totalInvoicedProfit,
    totalExpenses,
    totalSalesCount: sales.length,
    totalProductionBatches: batches.length,
    totalQuantityProduced,
    invoices,
    expenses: formattedExpenses,
    currencySymbol: 'ج.م',
  });

  try {
    await sendEmail(
      recipients,
      `التقرير الشهري الشامل - ${storeName} (${periodLabel})`,
      html
    );
    console.log(`[Monthly Report] Sent successfully via Brevo HTTP API to all registered users: ${recipients.join(', ')}`);
    return { success: true, recipients };
  } catch (error: any) {
    console.error('[Monthly Report] Error sending email via Brevo API:', error.message || error);
    return { success: false, error: error.message || String(error), recipients };
  }
}

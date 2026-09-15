import nodemailer from 'nodemailer';
import dns from 'dns';
import User, { IUser } from '../models/User';
import Setting from '../models/Setting';
import Sale, { ISale } from '../models/Sale';
import ProductionBatch, { IProductionBatch } from '../models/ProductionBatch';
import Expense, { IExpense } from '../models/Expense';
import { generateReportHtml } from '../utils/dailyReportTemplate';

// Force IPv4 DNS resolution globally in Node
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

export interface MailOptions {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends email directly using Gmail SMTP (e2989633@gmail.com) with App Password.
 * Tries Port 465 SSL, Port 587 TLS, and Native Gmail Service with family:4 to prevent Render IPv6 socket timeouts.
 */
export async function sendEmail(toEmail: string, subject: string, htmlContent: string): Promise<nodemailer.SentMessageInfo> {
  const user = (process.env.SMTP_USER || 'e2989633@gmail.com').trim();
  const pass = (process.env.SMTP_PASS || 'gghydzifodnylkvi').trim().replace(/^["']|["']$/g, '');
  const from = process.env.EMAIL_FROM || `Spice shop <${user}>`;

  if (!user || !pass) {
    throw new Error('بيانات SMTP_USER و SMTP_PASS غير معرفة في متغيرات البيئة');
  }

  // Strategy 1: Gmail Port 465 SSL with forced IPv4 family
  try {
    console.log(`[Email Service] Attempting SSL Port 465 to ${toEmail}...`);
    const t1 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      family: 4,
      connectionTimeout: 7000,
      greetingTimeout: 7000,
      socketTimeout: 7000,
      tls: { rejectUnauthorized: false },
    } as any);

    const info = await t1.sendMail({ from, to: toEmail, subject, html: htmlContent });
    console.log(`[Email Service] ✅ Email successfully sent via SSL Port 465! MessageId: ${info.messageId}`);
    return info;
  } catch (err1: any) {
    console.warn(`[Email Service] ⚠️ SSL Port 465 failed: ${err1.message}. Trying STARTTLS Port 587...`);
  }

  // Strategy 2: Gmail Port 587 STARTTLS with forced IPv4 family
  try {
    console.log(`[Email Service] Attempting STARTTLS Port 587 to ${toEmail}...`);
    const t2 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      family: 4,
      connectionTimeout: 7000,
      greetingTimeout: 7000,
      socketTimeout: 7000,
      tls: { rejectUnauthorized: false },
    } as any);

    const info = await t2.sendMail({ from, to: toEmail, subject, html: htmlContent });
    console.log(`[Email Service] ✅ Email successfully sent via STARTTLS Port 587! MessageId: ${info.messageId}`);
    return info;
  } catch (err2: any) {
    console.warn(`[Email Service] ⚠️ STARTTLS Port 587 failed: ${err2.message}. Trying Native Gmail Service...`);
  }

  // Strategy 3: Nodemailer native service 'gmail'
  try {
    console.log(`[Email Service] Attempting Native Gmail Service to ${toEmail}...`);
    const t3 = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 8000,
    });

    const info = await t3.sendMail({ from, to: toEmail, subject, html: htmlContent });
    console.log(`[Email Service] ✅ Email successfully sent via Native Gmail Service! MessageId: ${info.messageId}`);
    return info;
  } catch (err3: any) {
    console.error(`[Email Service] ❌ All Gmail SMTP send attempts failed:`, err3.message || err3);
    throw new Error(`فشل الاتصال بسيرفر إيميل جيمييل (${user}): ${err3.message || String(err3)}`);
  }
}

/**
 * Sends OTP 6-digit verification code to the target user's email address.
 */
export async function sendOtpEmail(toEmail: string, otpCode: string) {
  if (!toEmail) return;
  console.log(`[OTP Email] Dispatching OTP code ${otpCode} to recipient: ${toEmail}`);
  await sendEmail(
    toEmail,
    `كود التحقق الخاص بك لإعادة تعيين كلمة السر: ${otpCode}`,
    `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 25px; background-color: #f9f9f9; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h2 style="color: #15803d; margin-top: 0;">كود التحقق لإعادة تعيين كلمة السر (OTP)</h2>
        <p style="font-size: 15px; color: #374151;">لقد طلبت إعادة تعيين كلمة السر الخاصة بحسابك. كود التحقق الخاص بك هو:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #15803d; background: #e6f4ea; padding: 18px; text-align: center; border-radius: 10px; margin: 20px 0; border: 1px solid #a7f3d0;">
          ${otpCode}
        </div>
        <p style="font-size: 13px; color: #6b7280;">هذا الكود صالح لمدة 15 دقيقة. إذا لم تطلب هذا الكود، يرجى تجاهل هذه الرسالة.</p>
      </div>
    `
  );
}

/**
 * Fetches all registered user emails from MongoDB database to include in daily and monthly reports.
 */
export async function getRecipientEmails(): Promise<string[]> {
  const setting = await Setting.findOne();
  const allUsers: IUser[] = await User.find({
    email: { $exists: true, $ne: '' },
  });
  
  const recipientList: string[] = [];
  
  // 1. Collect all registered users who have an email address
  for (const u of allUsers) {
    if (u.email && u.email.trim() && u.email.includes('@')) {
      recipientList.push(u.email.trim().toLowerCase());
    }
  }

  // 2. Support Email from Global Settings
  if (setting?.supportEmail && setting.supportEmail.trim() && setting.supportEmail.includes('@')) {
    recipientList.push(setting.supportEmail.trim().toLowerCase());
  }

  // 3. System SMTP User Email
  if (process.env.SMTP_USER && process.env.SMTP_USER.trim() && process.env.SMTP_USER.includes('@')) {
    recipientList.push(process.env.SMTP_USER.trim().toLowerCase());
  }

  const recipients = Array.from(new Set(recipientList));
  console.log(`[Report Recipient List] Sending report email to ${recipients.length} registered user email(s):`, recipients);
  return recipients;
}

/**
 * Generates and dispatches the Daily Report email to ALL registered users in MongoDB.
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

  // Sales for target day
  const sales: ISale[] = await Sale.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ createdAt: 1 });

  let totalRevenue = 0;
  let totalGrossMargin = 0;

  const invoices = sales.map((s) => {
    totalRevenue += s.total || 0;
    totalGrossMargin += s.grossMargin || 0;
    return {
      receiptNumber: s.receiptNumber,
      total: s.total,
      customerName: s.customerName || 'عميل نقدي',
      customerPhone: s.customerPhone || 'غير متوفر',
      soldAt: s.createdAt,
    };
  });

  // Production Batches
  const batches: IProductionBatch[] = await ProductionBatch.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  let totalQuantityProduced = 0;
  for (const b of batches) {
    totalQuantityProduced += b.quantityProduced || 0;
  }

  // Fetch all fixed expenses for the month
  const expenses: IExpense[] = await Expense.find({ year: dYear, month: dMonth }).sort({ createdAt: 1 });
  let totalExpenses = 0;
  for (const e of expenses) {
    totalExpenses += e.amount;
  }

  const totalProfit = totalGrossMargin - totalExpenses;

  const recipients = await getRecipientEmails();
  if (recipients.length === 0) {
    return { success: false, message: 'لم يتم العثور على أي بريد إلكتروني للمستخدمين لإرسال التقرير', recipients: [] };
  }

  const html = generateReportHtml({
    storeName,
    periodTitle: `التقرير اليومي (${dateStr})`,
    salesTableTitle: 'تفاصيل عمليات البيع اليومية',
    dateStr,
    totalRevenue,
    totalProfit,
    totalExpenses,
    totalSalesCount: sales.length,
    totalProductionBatches: batches.length,
    totalQuantityProduced,
    invoices,
    expenses,
    currencySymbol: 'ج.م',
  });

  try {
    await sendEmail(
      recipients.join(', '),
      `التقرير اليومي - ${storeName} (${dateStr})`,
      html
    );
    console.log(`[Daily Report] Email successfully sent to all registered users: ${recipients.join(', ')}`);
    return { success: true, recipients };
  } catch (error: any) {
    console.error('[Daily Report] Error sending email via SMTP:', error.message || error);
    return { success: false, error: error.message || String(error), recipients };
  }
}

/**
 * Generates and dispatches the Monthly Report email to ALL registered users in MongoDB.
 */
export async function sendMonthlyReportEmail(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month - 1, daysInMonth, 23, 59, 59, 999);

  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const periodLabel = `شهـر ${monthStr}/${year}`;

  const setting = await Setting.findOne();
  const storeName = setting?.storeName || 'Spice shop';

  // Sales for target month
  const sales: ISale[] = await Sale.find({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
  }).sort({ createdAt: 1 });

  let totalRevenue = 0;
  let totalGrossMargin = 0;

  const invoices = sales.map((s) => {
    totalRevenue += s.total || 0;
    totalGrossMargin += s.grossMargin || 0;
    return {
      receiptNumber: s.receiptNumber,
      total: s.total,
      customerName: s.customerName || 'عميل نقدي',
      customerPhone: s.customerPhone || 'غير متوفر',
      soldAt: s.createdAt,
    };
  });

  // Production Batches
  const batches: IProductionBatch[] = await ProductionBatch.find({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
  });

  let totalQuantityProduced = 0;
  for (const b of batches) {
    totalQuantityProduced += b.quantityProduced || 0;
  }

  // Expenses for target month
  const expenses: IExpense[] = await Expense.find({ year, month }).sort({ createdAt: 1 });
  let totalExpenses = 0;
  for (const e of expenses) {
    totalExpenses += e.amount;
  }

  const totalProfit = totalGrossMargin - totalExpenses;

  const recipients = await getRecipientEmails();
  if (recipients.length === 0) {
    return { success: false, message: 'لم يتم العثور على أي بريد إلكتروني للمستخدمين لإرسال التقرير', recipients: [] };
  }

  const html = generateReportHtml({
    storeName,
    periodTitle: `التقرير الشهري الشامل - ${periodLabel}`,
    salesTableTitle: 'تفاصيل عمليات البيع الشهرية',
    dateStr: `${periodLabel} (1 - ${daysInMonth})`,
    totalRevenue,
    totalProfit,
    totalExpenses,
    totalSalesCount: sales.length,
    totalProductionBatches: batches.length,
    totalQuantityProduced,
    invoices,
    expenses,
    currencySymbol: 'ج.م',
  });

  try {
    await sendEmail(
      recipients.join(', '),
      `التقرير الشهري الشامل - ${storeName} (${periodLabel})`,
      html
    );
    console.log(`[Monthly Report] Email successfully sent to all registered users: ${recipients.join(', ')}`);
    return { success: true, recipients };
  } catch (error: any) {
    console.error('[Monthly Report] Error sending email via SMTP:', error.message || error);
    return { success: false, error: error.message || String(error), recipients };
  }
}

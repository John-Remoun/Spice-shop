import nodemailer from 'nodemailer';
import User, { IUser } from '../models/User';
import Setting from '../models/Setting';
import Sale, { ISale } from '../models/Sale';
import ProductionBatch, { IProductionBatch } from '../models/ProductionBatch';
import Expense, { IExpense } from '../models/Expense';
import { generateReportHtml } from '../utils/dailyReportTemplate';

// Helper functions to get environment variables
const getEmailUser = () => (process.env.EMAIL_USER || process.env.SMTP_USER || 'e2989633@gmail.com').trim();
const getEmailPass = () => (process.env.EMAIL_APP_PASS || process.env.SMTP_PASS || 'gghydzifodnylkvi').trim().replace(/^["']|["']$/g, '');

/**
 * 1. Creates Nodemailer Transporter strictly using:
 * - host: 'smtp.gmail.com'
 * - port: 465
 * - secure: true
 * - family: 4 (Forces IPv4 DNS lookup to prevent cloud hosting DNS/IPv6 timeouts)
 * - auth: EMAIL_USER and EMAIL_APP_PASS from process.env
 */
export function createTransporter() {
  const user = getEmailUser();
  const pass = getEmailPass();

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4, // CRITICAL: Fixes DNS / socket connection timeouts on cloud hosts like Render
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    },
  } as any);
}

export interface MailOptions {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Core function to dispatch email via Nodemailer
 */
export async function sendEmail(mailOptions: MailOptions): Promise<nodemailer.SentMessageInfo> {
  const user = getEmailUser();
  const defaultFrom = process.env.EMAIL_FROM || `Spice shop <${user}>`;
  const transporter = createTransporter();

  console.log(`[Email Service] Sending email from ${user} to ${mailOptions.to}...`);

  const info = await transporter.sendMail({
    from: mailOptions.from || defaultFrom,
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html,
  });

  console.log(`[Email Service] ✅ Email delivered! MessageId: ${info.messageId}`);
  return info;
}

/**
 * 2. OTP Sending Function:
 * Sends clean 6-digit OTP email to recipient (valid for 10 minutes).
 */
export async function sendOtpEmail(toEmail: string, otpCode: string) {
  if (!toEmail) return;
  console.log(`[OTP Email] Dispatching 6-digit OTP (${otpCode}) to: ${toEmail}`);
  await sendEmail({
    to: toEmail,
    subject: `كود التحقق الخاص بك لإعادة تعيين كلمة السر: ${otpCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 25px; background-color: #f9f9f9; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h2 style="color: #15803d; margin-top: 0;">كود التحقق لإعادة تعيين كلمة السر (OTP)</h2>
        <p style="font-size: 15px; color: #374151;">لقد طلبت إعادة تعيين كلمة السر الخاصة بحسابك. كود التحقق الخاص بك هو:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #15803d; background: #e6f4ea; padding: 18px; text-align: center; border-radius: 10px; margin: 20px 0; border: 1px solid #a7f3d0;">
          ${otpCode}
        </div>
        <p style="font-size: 13px; color: #6b7280;">هذا الكود صالح لمدة 10 دقائق. إذا لم تطلب هذا الكود، يرجى تجاهل هذه الرسالة.</p>
      </div>
    `,
  });
}

/**
 * Helper to fetch all valid registered user email addresses from MongoDB.
 */
export async function getRecipientEmails(): Promise<string[]> {
  const setting = await Setting.findOne();
  const allUsers: IUser[] = await User.find({
    email: { $exists: true, $ne: '' },
  });

  const recipientList: string[] = [];

  for (const u of allUsers) {
    if (u.email && u.email.trim() && u.email.includes('@')) {
      recipientList.push(u.email.trim().toLowerCase());
    }
  }

  if (setting?.supportEmail && setting.supportEmail.trim() && setting.supportEmail.includes('@')) {
    recipientList.push(setting.supportEmail.trim().toLowerCase());
  }

  const sysUser = getEmailUser();
  if (sysUser && sysUser.includes('@')) {
    recipientList.push(sysUser.trim().toLowerCase());
  }

  const recipients = Array.from(new Set(recipientList));
  console.log(`[Report Recipient List] ${recipients.length} user email(s) found in MongoDB:`, recipients);
  return recipients;
}

/**
 * 3. Report Sending Functions:
 * Fetches all registered users from MongoDB and sends the report to all valid emails.
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

  const batches: IProductionBatch[] = await ProductionBatch.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  let totalQuantityProduced = 0;
  for (const b of batches) {
    totalQuantityProduced += b.quantityProduced || 0;
  }

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
    await sendEmail({
      to: recipients.join(', '),
      subject: `التقرير اليومي - ${storeName} (${dateStr})`,
      html,
    });
    console.log(`[Daily Report] Sent successfully to ${recipients.length} user(s):`, recipients);
    return { success: true, recipients };
  } catch (error: any) {
    console.error('[Daily Report] Error sending email:', error.message || error);
    return { success: false, error: error.message || String(error), recipients };
  }
}

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

  const batches: IProductionBatch[] = await ProductionBatch.find({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
  });

  let totalQuantityProduced = 0;
  for (const b of batches) {
    totalQuantityProduced += b.quantityProduced || 0;
  }

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
    await sendEmail({
      to: recipients.join(', '),
      subject: `التقرير الشهري الشامل - ${storeName} (${periodLabel})`,
      html,
    });
    console.log(`[Monthly Report] Sent successfully to ${recipients.length} user(s):`, recipients);
    return { success: true, recipients };
  } catch (error: any) {
    console.error('[Monthly Report] Error sending email:', error.message || error);
    return { success: false, error: error.message || String(error), recipients };
  }
}

import nodemailer from 'nodemailer';
import dns from 'dns';
import User, { IUser } from '../models/User';
import Setting from '../models/Setting';
import Sale, { ISale } from '../models/Sale';
import ProductionBatch, { IProductionBatch } from '../models/ProductionBatch';
import Expense, { IExpense } from '../models/Expense';
import { generateReportHtml } from '../utils/dailyReportTemplate';

// Force IPv4 first in Node's DNS resolver
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Resolves hostname to IPv4 address using Google Public DNS (8.8.8.8) and Cloudflare DNS (1.1.1.1).
 */
async function resolveHostIp(hostname: string): Promise<string> {
  if (!hostname || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return hostname || '142.251.168.109';
  }

  try {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    const addresses = await resolver.resolve4(hostname);
    if (addresses && addresses.length > 0) {
      return addresses[0];
    }
  } catch (err: any) {
    console.warn(`[DNS] Public DNS resolution for ${hostname} failed:`, err.message || err);
  }

  return new Promise((resolve) => {
    dns.lookup(hostname, { family: 4 }, (err, address) => {
      if (!err && address) {
        resolve(address);
      } else {
        resolve(hostname === 'smtp.gmail.com' ? '142.251.168.109' : hostname);
      }
    });
  });
}

export interface MailOptions {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends email using HTTPS API (Resend / Brevo) or Nodemailer SMTP with 3.5s timeouts.
 * HTTPS API is 100% immune to Render datacenter IP blocks by Google Gmail SMTP.
 */
export async function sendMailWithFallback(mailOptions: MailOptions): Promise<any> {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/[^a-zA-Z0-9]/g, '');
  const rawHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const defaultFrom = process.env.EMAIL_FROM || `Spice shop <${user || 'e2989633@gmail.com'}>`;
  const senderEmail = mailOptions.from || defaultFrom;

  // 1. Resend HTTPS API (Port 443 - Recommended for Cloud Deployments like Render)
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendApiKey) {
    try {
      console.log('[Email Service] Dispatching via Resend HTTPS API...');
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderEmail.includes('resend.dev') ? senderEmail : 'Spice shop <onboarding@resend.dev>',
          to: mailOptions.to.split(',').map((e) => e.trim()),
          subject: mailOptions.subject,
          html: mailOptions.html,
        }),
      });
      const data: any = await res.json();
      if (res.ok) {
        console.log('[Email Service] ✅ Email delivered via Resend HTTPS API! ID:', data?.id);
        return data;
      }
      console.warn('[Email Service] ⚠️ Resend HTTPS API returned error:', data);
    } catch (err: any) {
      console.warn('[Email Service] ⚠️ Resend HTTPS API failed:', err.message || err);
    }
  }

  // 2. Brevo (Sendinblue) HTTPS API (Port 443)
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  if (brevoApiKey) {
    try {
      console.log('[Email Service] Dispatching via Brevo HTTPS API...');
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Spice shop', email: user || 'e2989633@gmail.com' },
          to: mailOptions.to.split(',').map((e) => ({ email: e.trim() })),
          subject: mailOptions.subject,
          htmlContent: mailOptions.html,
        }),
      });
      const data: any = await res.json();
      if (res.ok) {
        console.log('[Email Service] ✅ Email delivered via Brevo HTTPS API! MessageId:', data?.messageId);
        return data;
      }
      console.warn('[Email Service] ⚠️ Brevo HTTPS API returned error:', data);
    } catch (err: any) {
      console.warn('[Email Service] ⚠️ Brevo HTTPS API failed:', err.message || err);
    }
  }

  // 3. SMTP Transporters (Nodemailer with 3.5s socket timeout)
  if (!user || !pass) {
    throw new Error('بيانات SMTP_USER و SMTP_PASS غير معرفة في بيئة السيرفر (Environment Variables)');
  }

  const resolvedIp = await resolveHostIp(rawHost);

  const configs = [
    // 3a. Direct IPv4 SSL Port 465
    {
      name: 'Resolved IPv4 SSL (Port 465)',
      options: {
        host: resolvedIp,
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 3500,
        greetingTimeout: 3500,
        socketTimeout: 3500,
        tls: {
          servername: rawHost,
          rejectUnauthorized: false,
        },
      },
    },
    // 3b. Direct IPv4 TLS Port 587
    {
      name: 'Resolved IPv4 TLS (Port 587)',
      options: {
        host: resolvedIp,
        port: 587,
        secure: false,
        auth: { user, pass },
        connectionTimeout: 3500,
        greetingTimeout: 3500,
        socketTimeout: 3500,
        tls: {
          servername: rawHost,
          rejectUnauthorized: false,
        },
      },
    },
    // 3c. Domain Gmail SSL Port 465
    {
      name: 'Domain Gmail SSL (Port 465)',
      options: {
        host: rawHost,
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 3500,
        greetingTimeout: 3500,
        socketTimeout: 3500,
        tls: { rejectUnauthorized: false },
      },
    },
  ];

  let lastError: any = null;

  for (const c of configs) {
    try {
      console.log(`[Email Service] Attempting delivery via ${c.name}...`);
      const transporter = nodemailer.createTransport(c.options as any);
      const info = await transporter.sendMail({
        from: senderEmail,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
      });
      console.log(`[Email Service] ✅ Email delivered via ${c.name}, MessageId: ${info.messageId}`);
      return info;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Email Service] ⚠️ ${c.name} failed:`, err.message || err);
    }
  }

  throw new Error(
    `تمنع سيرفرات Render اتصال Gmail SMTP المباشر (${lastError?.message || 'Connection Timeout'}). أضف مفتاح RESEND_API_KEY أو BREVO_API_KEY مجاناً في Render لتفعيل الإرسال السريع بنسبة 100% خلال 0.3 ثانية.`
  );
}

export async function sendOtpEmail(toEmail: string, otpCode: string) {
  if (!toEmail) return;
  try {
    console.log(`[OTP Email] Dispatching OTP code to ${toEmail}...`);
    await sendMailWithFallback({
      to: toEmail,
      subject: `كود التحقق الخاص بك لإعادة تعيين كلمة السر: ${otpCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #15803d;">كود التحقق لإعادة تعيين كلمة السر (OTP)</h2>
          <p style="font-size: 14px; color: #333;">لقد طلبت إعادة تعيين كلمة السر الخاصة بحسابك. كود التحقق الخاص بك هو:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #15803d; background: #e6f4ea; padding: 15px; text-align: center; border-radius: 8px; margin: 15px 0;">
            ${otpCode}
          </div>
          <p style="font-size: 12px; color: #777;">هذا الكود صالح لمدة 15 دقيقة. إذا لم تطلب هذا الكود، يرجى تجاهل هذه الرسالة.</p>
        </div>
      `,
    });
  } catch (err: any) {
    console.error(`[OTP Email Error] Failed to send OTP email to ${toEmail}:`, err.message || err);
  }
}

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
  console.log(`[Report Recipient List] Sending report email to ${recipients.length} recipient(s):`, recipients);
  return recipients;
}

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
    return { success: false, message: 'لم يتم العثور على بريد إلكتروني لإرسال التقرير', recipients: [] };
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
    await sendMailWithFallback({
      to: recipients.join(', '),
      subject: `التقرير اليومي - ${storeName} (${dateStr})`,
      html,
    });
    console.log(`[Daily Report] Email successfully sent to ${recipients.join(', ')}`);
    return { success: true, recipients };
  } catch (error: any) {
    console.error('[Daily Report] Error sending email via SMTP:', error.message || error);
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
    return { success: false, message: 'لم يتم العثور على بريد إلكتروني لإرسال التقرير', recipients: [] };
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
    await sendMailWithFallback({
      to: recipients.join(', '),
      subject: `التقرير الشهري الشامل - ${storeName} (${periodLabel})`,
      html,
    });
    console.log(`[Monthly Report] Email successfully sent to ${recipients.join(', ')}`);
    return { success: true, recipients };
  } catch (error: any) {
    console.error('[Monthly Report] Error sending email via SMTP:', error.message || error);
    return { success: false, error: error.message || String(error), recipients };
  }
}

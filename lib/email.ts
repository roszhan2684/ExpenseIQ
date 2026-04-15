import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER ?? 'roszhan23@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? '';

export function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendPasswordChangeOTP(to: string, otp: string, firstName: string) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"ExpenseIQ" <${GMAIL_USER}>`,
    to,
    subject: 'Verify your password change — ExpenseIQ',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 32px 32px 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">ExpenseIQ</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="margin: 0 0 8px; font-size: 20px; color: #18181b;">Hi ${firstName}!</h2>
              <p style="margin: 0 0 24px; color: #71717a; font-size: 15px;">Someone requested a password change. Use the code below to confirm. It expires in <strong>10 minutes</strong>.</p>
              <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 42px; font-weight: 800; letter-spacing: 10px; color: #7c3aed; font-family: monospace;">${otp}</span>
              </div>
              <p style="margin: 0; color: #a1a1aa; font-size: 13px; text-align: center;">If you didn't request this, your password was not changed.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendPasswordResetOTP(to: string, otp: string, firstName: string) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"ExpenseIQ" <${GMAIL_USER}>`,
    to,
    subject: 'Reset your password — ExpenseIQ',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 32px 32px 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">ExpenseIQ</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="margin: 0 0 8px; font-size: 20px; color: #18181b;">Hi ${firstName}!</h2>
              <p style="margin: 0 0 24px; color: #71717a; font-size: 15px;">We received a request to reset your password. Use the code below — it expires in <strong>10 minutes</strong>.</p>
              <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 42px; font-weight: 800; letter-spacing: 10px; color: #7c3aed; font-family: monospace;">${otp}</span>
              </div>
              <p style="margin: 0; color: #a1a1aa; font-size: 13px; text-align: center;">If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendOTPEmail(to: string, otp: string, firstName: string) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"ExpenseIQ" <${GMAIL_USER}>`,
    to,
    subject: 'Your ExpenseIQ verification code',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 32px 32px 24px; text-align: center;">
              <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; line-height: 48px;">$</div>
              <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">ExpenseIQ</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="margin: 0 0 8px; font-size: 20px; color: #18181b;">Hi ${firstName}!</h2>
              <p style="margin: 0 0 24px; color: #71717a; font-size: 15px;">Use the code below to verify your account. It expires in <strong>10 minutes</strong>.</p>
              <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 42px; font-weight: 800; letter-spacing: 10px; color: #7c3aed; font-family: monospace;">${otp}</span>
              </div>
              <p style="margin: 0; color: #a1a1aa; font-size: 13px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div style="border-top: 1px solid #f4f4f5; padding: 16px 32px; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">© ${new Date().getFullYear()} ExpenseIQ. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

import { env } from '../config/env.js';

export interface OtpProvider { send(phone: string, code: string): Promise<void> }

/** Default provider: prints the OTP in the server log. Used for every message while OTP_MODE=fake. */
export class ConsoleOtpProvider implements OtpProvider {
  async send(phone: string, code: string) {
    console.log(`[OTP] ${phone} -> ${code}  (mode: ${env.OTP_MODE})`);
  }
}

/** MSG91: set OTP_PROVIDER=msg91, OTP_MODE=real, MSG91_AUTH_KEY and MSG91_TEMPLATE_ID. */
export class Msg91OtpProvider implements OtpProvider {
  async send(phone: string, code: string) {
    if (!env.MSG91_AUTH_KEY) throw new Error('MSG91_AUTH_KEY missing');
    const res = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: env.MSG91_AUTH_KEY },
      body: JSON.stringify({ template_id: env.MSG91_TEMPLATE_ID, mobile: phone.replace('+', ''), otp: code }),
    });
    if (!res.ok) throw new Error(`MSG91 failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
}

/** Twilio: set OTP_PROVIDER=twilio, OTP_MODE=real, TWILIO_SID, TWILIO_TOKEN and TWILIO_FROM. */
export class TwilioOtpProvider implements OtpProvider {
  async send(phone: string, code: string) {
    if (!env.TWILIO_SID || !env.TWILIO_TOKEN) throw new Error('Twilio credentials missing');
    const auth = Buffer.from(`${env.TWILIO_SID}:${env.TWILIO_TOKEN}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, From: env.TWILIO_FROM ?? '', Body: `Your Shyam Timber OTP is ${code}. Valid for 5 minutes.` }),
    });
    if (!res.ok) throw new Error(`Twilio failed: ${res.status}`);
  }
}

export const otpProvider: OtpProvider =
  env.OTP_PROVIDER === 'msg91' ? new Msg91OtpProvider()
  : env.OTP_PROVIDER === 'twilio' ? new TwilioOtpProvider()
  : new ConsoleOtpProvider();

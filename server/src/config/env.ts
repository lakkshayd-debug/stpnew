import 'dotenv/config';
import { z } from 'zod';

/** Accepts true/false, 1/0, yes/no, on/off from the environment. */
const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase())));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),

  // ---- auth ----
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  COOKIE_SECURE: bool.default(false),

  // ---- urls ----
  CLIENT_URL: z.string().default('http://localhost:5173'),
  /** Extra comma-separated origins allowed to call the API with cookies. */
  ALLOWED_ORIGINS: z.string().optional(),
  PUBLIC_URL: z.string().default('http://localhost:4000'),

  // ---- storage ----
  UPLOAD_DIR: z.string().default('./uploads'),
  /** local = disk, db = images stored in Postgres (works on free hosting), s3 = stub */
  STORAGE_DRIVER: z.enum(['local', 'db', 's3']).default('local'),

  // ---- OTP ----
  /** fake = fixed test codes below (no SMS bill), real = random code sent by the SMS gateway */
  OTP_MODE: z.enum(['fake', 'real']).default('fake'),
  OTP_PROVIDER: z.enum(['console', 'msg91', 'twilio']).default('console'),
  /** The one phone number that holds the OWNER role. */
  OWNER_PHONE: z.string().default('+916385340555'),
  OWNER_NAME: z.string().default('Shyam'),
  /** Fixed OTP for the owner number while OTP_MODE=fake. */
  OWNER_OTP: z.string().regex(/^\d{6}$/).default('782751'),
  /** Fixed OTP for every other number while OTP_MODE=fake. */
  CUSTOMER_OTP: z.string().regex(/^\d{6}$/).default('123455'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  TWILIO_SID: z.string().optional(),
  TWILIO_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),

  // ---- misc ----
  SEED_DEMO: bool.default(true),
  REFERRAL_IP_THRESHOLD: z.coerce.number().default(3),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isDev = env.NODE_ENV === 'development';
/** True while fixed test OTPs are in use (no SMS gateway needed). */
export const isFakeOtp = env.OTP_MODE === 'fake';

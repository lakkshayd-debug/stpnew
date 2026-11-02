/**
 * Integration tests. Need a reachable Postgres and OTP_MODE=fake (owner 782751 / others 123455).
 *   DATABASE_URL=...shyam_timber_test npx prisma migrate deploy && npm test -w server
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loginAs, resetDb, ensureOwner, agent } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

beforeAll(async () => { await resetDb(); await ensureOwner(); });
afterAll(() => prisma.$disconnect());

describe('auth + referral signup', () => {
  it('rejects an invalid phone number', async () => {
    await agent().post('/api/v1/auth/otp/request').send({ phone: '12345' }).expect(400);
  });

  it('asks for a profile for a new user, then creates the account and the referral', async () => {
    const { res: first } = await loginAs('9876543210');
    expect(first.status).toBe(400);
    expect(first.body.error.details.needsProfile).toBe(true);

    const { a, res } = await loginAs('9876543210', { name: 'Arun', area: 'PORUR', customerType: 'HOMEOWNER' });
    expect(res.status).toBe(200);
    expect(res.body.user.referralCode).toMatch(/^SHYAM-[A-Z0-9]{6}$/);

    const me = await a.get('/api/v1/me').expect(200);
    expect(me.body.user.phone).toBe('+919876543210');

    const code = res.body.user.referralCode as string;
    const { res: r2 } = await loginAs('9876543211', { name: 'Friend', area: 'MANGADU', customerType: 'CARPENTER', referralCode: code });
    expect(r2.status).toBe(200);

    const ref = await prisma.referral.findFirstOrThrow({ where: { referee: { phone: '+919876543211' } } });
    expect(ref.status).toBe('JOINED');

    const summary = await a.get('/api/v1/referrals').expect(200);
    expect(summary.body.referrals).toHaveLength(1);
    expect(summary.body.code).toBe(code);
  });

  it('rejects an unknown referral code', async () => {
    const { res } = await loginAs('9876543212', { name: 'X', area: 'OTHER', customerType: 'BUILDER', referralCode: 'SHYAM-NOPE00' });
    expect(res.status).toBe(400);
  });

  it('rejects a wrong OTP and protects admin routes', async () => {
    const a = agent();
    await a.post('/api/v1/auth/otp/request').send({ phone: '9876543210' });
    await a.post('/api/v1/auth/otp/verify').send({ phone: '9876543210', code: '000000' }).expect(401);

    const { a: customer } = await loginAs('9876543210');
    await customer.get('/api/v1/admin/analytics').expect(403);

    const { a: owner } = await loginAs('6385340555');
    await owner.get('/api/v1/admin/analytics').expect(200);
  });

  it('refreshes and logs out', async () => {
    const { a } = await loginAs('9876543210');
    await a.post('/api/v1/auth/refresh').expect(200);
    await a.post('/api/v1/auth/logout').expect(200);
    await a.get('/api/v1/me').expect(401);
  });
});

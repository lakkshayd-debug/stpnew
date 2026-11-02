import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loginAs, resetDb, ensureOwner } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

let postId: string;
beforeAll(async () => {
  await resetDb();
  const owner = await ensureOwner();
  postId = (await prisma.post.create({
    data: { authorId: owner.id, title: 'Test plywood', description: 'A description for the test post', category: 'Plywood' },
  })).id;
});
afterAll(() => prisma.$disconnect());

describe('comment moderation', () => {
  it('keeps a pending comment private, blocks links, notifies on approve and reply', async () => {
    const { a: alice } = await loginAs('9800000001', { name: 'Alice', area: 'PORUR', customerType: 'HOMEOWNER' });
    const { a: bob } = await loginAs('9800000002', { name: 'Bob', area: 'PORUR', customerType: 'CARPENTER' });

    await alice.post(`/api/v1/posts/${postId}/comments`).send({ body: 'check www.spam.com' }).expect(400);

    const c = await alice.post(`/api/v1/posts/${postId}/comments`).send({ body: 'Is 8x4 available?' }).expect(201);
    expect(c.body.status).toBe('PENDING');
    expect((await alice.get(`/api/v1/posts/${postId}/comments`)).body).toHaveLength(1);
    expect((await bob.get(`/api/v1/posts/${postId}/comments`)).body).toHaveLength(0);

    const { a: owner } = await loginAs('6385340555');
    expect((await owner.get('/api/v1/admin/comments?status=PENDING')).body).toHaveLength(1);
    await owner.post(`/api/v1/admin/comments/${c.body.id}/reply`).send({ body: 'x' }).expect(403);
    await owner.post(`/api/v1/admin/comments/${c.body.id}/approve`).expect(200);
    expect((await bob.get(`/api/v1/posts/${postId}/comments`)).body).toHaveLength(1);
    await owner.post(`/api/v1/admin/comments/${c.body.id}/reply`).send({ body: 'Yes, in stock' }).expect(200);

    const notes = await alice.get('/api/v1/notifications').expect(200);
    expect(notes.body.items.map((n: { type: string }) => n.type)).toEqual(expect.arrayContaining(['COMMENT_APPROVED', 'COMMENT_REPLIED']));

    const c2 = await bob.post(`/api/v1/posts/${postId}/comments`).send({ body: 'Rate please?' }).expect(201);
    await owner.post(`/api/v1/admin/comments/${c2.body.id}/reject`).expect(200);
    expect((await alice.get(`/api/v1/posts/${postId}/comments`)).body).toHaveLength(1);
    await owner.delete(`/api/v1/admin/comments/${c2.body.id}`).expect(200);
  });

  it('confirms a purchase, creates rewards, redeems once, and audits', async () => {
    const { a: owner } = await loginAs('6385340555');
    const alice = await prisma.user.findUniqueOrThrow({ where: { phone: '+919800000001' } });

    const { res } = await loginAs('9800000003', { name: 'Carl', area: 'MANGADU', customerType: 'BUILDER', referralCode: alice.referralCode });
    const ref = await prisma.referral.findUniqueOrThrow({ where: { refereeId: res.body.user.id } });

    const small = await owner.post(`/api/v1/admin/referrals/${ref.id}/confirm-purchase`).send({ invoiceNo: 'INV-T0', amount: 1000 }).expect(200);
    expect(small.body.qualifying).toBe(false);
    expect(small.body.rewards).toHaveLength(0);
    await owner.post(`/api/v1/admin/referrals/${ref.id}/confirm-purchase`).send({ invoiceNo: 'INV-T1', amount: 7500 }).expect(409);

    const { res: res2 } = await loginAs('9800000004', { name: 'Dina', area: 'PORUR', customerType: 'HOMEOWNER', referralCode: alice.referralCode });
    const ref2 = await prisma.referral.findUniqueOrThrow({ where: { refereeId: res2.body.user.id } });
    const ok = await owner.post(`/api/v1/admin/referrals/${ref2.id}/confirm-purchase`).send({ invoiceNo: 'INV-T2', amount: 7500 }).expect(200);
    expect(ok.body.qualifying).toBe(true);
    expect(ok.body.rewards).toHaveLength(2);

    const rewardId = ok.body.rewards[0] as string;
    await owner.post(`/api/v1/admin/rewards/${rewardId}/use`).send({ invoiceNo: 'INV-T3' }).expect(200);
    await owner.post(`/api/v1/admin/rewards/${rewardId}/use`).send({ invoiceNo: 'INV-T4' }).expect(400);
    expect(await prisma.auditLog.count({ where: { action: 'REWARD_USED' } })).toBe(1);
  });
});

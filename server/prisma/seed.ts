import { PrismaClient, type PostType, type ReferralStatus, type RewardType, type RewardStatus } from '@prisma/client';
import { DEFAULT_REWARD_SETTINGS, DEFAULT_SHOP_SETTINGS } from '../src/domain/defaults.js';

const prisma = new PrismaClient();
const OWNER_PHONE = process.env.OWNER_PHONE ?? '+916385340555';   // the only OWNER account
const SEED_DEMO = (process.env.SEED_DEMO ?? 'true').toLowerCase() !== 'false';
const days = (n: number) => new Date(Date.now() + n * 86400000);
const img = (seed: string) => `https://picsum.photos/seed/${seed}/900/700`;

async function main() {
  await prisma.setting.upsert({ where: { key: 'rewards' }, update: {}, create: { key: 'rewards', value: DEFAULT_REWARD_SETTINGS } });
  await prisma.setting.upsert({ where: { key: 'shop' }, update: {}, create: { key: 'shop', value: DEFAULT_SHOP_SETTINGS } });

  // The owner account is always created / repaired, even when demo data is off.
  const owner = await prisma.user.upsert({
    where: { phone: OWNER_PHONE },
    update: { role: 'OWNER' },
    create: { phone: OWNER_PHONE, name: 'Shyam', role: 'OWNER', referralCode: 'SHYAM-OWNER1', area: 'PORUR' },
  });
  // any stale owner from an earlier phone number becomes a normal customer
  await prisma.user.updateMany({ where: { role: 'OWNER', phone: { not: OWNER_PHONE } }, data: { role: 'CUSTOMER' } });

  if (!SEED_DEMO) {
    console.log(`Seed complete (owner only). Owner phone: ${OWNER_PHONE}`);
    return;
  }

  const customers = [
    { name: 'Arun Kumar', phone: '+919000000001', area: 'PORUR', customerType: 'HOMEOWNER', code: 'SHYAM-ARUN01' },
    { name: 'Murugan', phone: '+919000000002', area: 'VALASARAVAKKAM', customerType: 'CARPENTER', code: 'SHYAM-MURU02' },
    { name: 'Priya Interiors', phone: '+919000000003', area: 'RAMAPURAM', customerType: 'INTERIOR_DESIGNER', code: 'SHYAM-PRIY03' },
    { name: 'Selvam Builders', phone: '+919000000004', area: 'POONAMALLEE', customerType: 'BUILDER', code: 'SHYAM-SELV04' },
    { name: 'Kavitha', phone: '+919000000005', area: 'MANGADU', customerType: 'HOMEOWNER', code: 'SHYAM-KAVI05' },
    { name: 'Ravi Contractor', phone: '+919000000006', area: 'KUNDRATHUR', customerType: 'CONTRACTOR', code: 'SHYAM-RAVI06' },
  ] as const;

  const u: Record<string, { id: string }> = {};
  for (const c of customers) {
    u[c.code] = await prisma.user.upsert({
      where: { phone: c.phone }, update: {},
      create: { name: c.name, phone: c.phone, area: c.area, customerType: c.customerType, referralCode: c.code },
    });
  }
  const A = u['SHYAM-ARUN01']!, M = u['SHYAM-MURU02']!, P = u['SHYAM-PRIY03']!, S = u['SHYAM-SELV04']!, K = u['SHYAM-KAVI05']!, R = u['SHYAM-RAVI06']!;

  const mkRef = (referrerId: string, refereeId: string, status: ReferralStatus) =>
    prisma.referral.upsert({ where: { refereeId }, update: {}, create: { referrerId, refereeId, status } });
  const r1 = await mkRef(A.id, M.id, 'REWARDED');
  await mkRef(A.id, P.id, 'JOINED');
  await mkRef(A.id, S.id, 'JOINED');
  const r2 = await mkRef(M.id, K.id, 'REWARDED');
  await mkRef(K.id, R.id, 'JOINED');

  await prisma.purchaseConfirmation.upsert({ where: { invoiceNo: 'INV-1001' }, update: {},
    create: { referralId: r1.id, customerId: M.id, invoiceNo: 'INV-1001', amount: 12500, qualifying: true, confirmedBy: owner.id } });
  await prisma.purchaseConfirmation.upsert({ where: { invoiceNo: 'INV-1002' }, update: {},
    create: { referralId: r2.id, customerId: K.id, invoiceNo: 'INV-1002', amount: 8200, qualifying: true, confirmedBy: owner.id } });

  const rewards: { userId: string; type: RewardType; title: string; amount: number; status: RewardStatus; expiresAt: Date; usedInvoice?: string; sourceRefId?: string }[] = [
    { userId: M.id, type: 'WELCOME', title: 'Welcome reward', amount: 250, status: 'USED', expiresAt: days(60), usedInvoice: 'INV-1001', sourceRefId: r1.id },
    { userId: A.id, type: 'REFERRER', title: 'Referral reward: Murugan', amount: 400, status: 'AVAILABLE', expiresAt: days(75), sourceRefId: r1.id },
    { userId: K.id, type: 'WELCOME', title: 'Welcome reward', amount: 250, status: 'AVAILABLE', expiresAt: days(80), sourceRefId: r2.id },
    { userId: M.id, type: 'REFERRER', title: 'Referral reward: Kavitha', amount: 400, status: 'EXPIRED', expiresAt: days(-5), sourceRefId: r2.id },
  ];
  if ((await prisma.reward.count()) === 0) {
    for (const r of rewards) await prisma.reward.create({ data: { ...r, usedAt: r.usedInvoice ? new Date() : null } });
  }

  const posts: { title: string; description: string; category: string; type: PostType; price?: number; priceUnit?: string; pinned?: boolean }[] = [
    { title: 'Commercial Plywood 710 Grade, 18mm', description: 'ISI 710 grade BWP commercial plywood in 8x4 ft sheets. Ideal for wardrobes, kitchen cabinets and partitions. Termite treated with uniform thickness. Bulk pricing for carpenters and contractors. (Sample listing)', category: 'Plywood', type: 'NEW_ARRIVAL', price: 95, priceUnit: 'sq ft', pinned: true },
    { title: 'Marine Plywood (BWP), 19mm', description: 'Boiling water proof marine ply for kitchens, bathrooms and outdoor use. Phenolic resin bonded and 72-hour boil tested - the right choice for Chennai humidity. (Sample listing)', category: 'Plywood', type: 'NEW_ARRIVAL', price: 165, priceUnit: 'sq ft' },
    { title: 'Block Board, 19mm', description: 'Lightweight, warp resistant block board with seasoned pine core. Great for long shelves, doors and table tops where plywood may bend. (Sample listing)', category: 'Boards', type: 'NEW_ARRIVAL', price: 110, priceUnit: 'sq ft' },
    { title: 'Burma Teak Wood Planks', description: 'Premium Burma teak, seasoned and ready for doors, windows and furniture. Rich golden brown grain, naturally termite resistant. Cut to size on request. (Sample listing)', category: 'Timber', type: 'NEW_ARRIVAL', price: 5800, priceUnit: 'cu ft' },
    { title: 'Laminates 1mm', description: '1mm decorative laminates in 200+ designs - glossy, matte, textured wood grains and solid colours. Visit the Porur store to browse the full catalogue. (Sample listing)', category: 'Laminates', type: 'NEW_ARRIVAL', price: 1150, priceUnit: 'sheet' },
    { title: 'Flush Doors (solid core)', description: 'Solid core flush doors in 30mm and 32mm, standard sizes 7x3 and 7x3.5 ft. Ready for laminate or veneer finishing. Custom sizes available. (Sample listing)', category: 'Doors', type: 'NEW_ARRIVAL', price: 3900, priceUnit: 'door' },
    { title: 'Hardwood Sal Timber Beams', description: 'Strong, dense Sal wood beams for roofing, door frames and structural work. Available in 3x4, 4x4 and 4x6 sections. (Sample listing)', category: 'Timber', type: 'NEW_ARRIVAL', price: 2700, priceUnit: 'cu ft' },
    { title: 'MDF Boards 18mm', description: 'Smooth MDF boards for CNC cutting, modular furniture and painted finishes. Interior and exterior grades in stock. (Sample listing)', category: 'Boards', type: 'NEW_ARRIVAL', price: 68, priceUnit: 'sq ft' },
    { title: 'Veneer sheets', description: 'Natural wood veneers in teak, walnut, oak and ash. Add a premium real wood look to doors, wall panels and furniture. (Sample listing)', category: 'Veneer', type: 'NEW_ARRIVAL', price: 42, priceUnit: 'sq ft' },
    { title: 'Tip: How to choose between BWR and BWP plywood for kitchens', description: 'BWR (Boiling Water Resistant) handles occasional moisture and is fine for bedroom wardrobes and wall units. BWP (Boiling Water Proof / marine) uses phenolic resin and survives constant moisture, so use BWP for kitchen base units, under the sink and bathroom vanities. Always check the ISI mark and ask us for a sample before you buy. (Sample post)', category: 'Plywood', type: 'TIP' },
    { title: 'Festival offer: 5% off on bulk plywood orders above Rs.50,000', description: 'This festive season get 5% off on all plywood orders above Rs.50,000. Valid for carpenters, contractors and homeowners. Offer valid till stocks last - mention this post at the counter. (Sample offer)', category: 'Plywood', type: 'OFFER', pinned: true },
    { title: 'New stock of teak and laminates arrived', description: 'Fresh stock of Burma teak planks and the latest laminate catalogue has arrived at our Porur store. Walk in to see samples. We open at 9 am. (Sample announcement)', category: 'General', type: 'ANNOUNCEMENT' },
  ];

  if ((await prisma.post.count()) === 0) {
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i]!;
      const created = await prisma.post.create({
        data: {
          authorId: owner.id, title: p.title, description: p.description, category: p.category, type: p.type,
          price: p.price ?? null, priceLabel: p.price ? 'from' : null, priceUnit: p.priceUnit ?? null,
          pinned: p.pinned ?? false, isSample: true, shareCount: (i * 3) % 7,
          createdAt: new Date(Date.now() - (posts.length - i) * 2 * 86400000),
          images: { create: [0, 1].map((n) => ({ url: img(`shyam${i}-${n}`), alt: `${p.title} sample photo ${n + 1}`, order: n })) },
        },
      });
      for (const l of [A, M, P, K].slice(0, (i % 4) + 1)) await prisma.like.create({ data: { userId: l.id, postId: created.id } });
      if (i < 3) {
        await prisma.comment.create({ data: { postId: created.id, authorId: A.id, body: 'Is this available in 8x4 size?', status: 'APPROVED', ownerReply: 'Yes, 8x4 and 7x4 are in stock.', ownerRepliedAt: new Date(), moderatedAt: new Date() } });
        await prisma.comment.create({ data: { postId: created.id, authorId: M.id, body: 'What is the bulk rate for 50 sheets?', status: 'PENDING' } });
      }
    }
    const first = await prisma.post.findFirstOrThrow();
    await prisma.savedPost.create({ data: { userId: A.id, postId: first.id } });
  }

  if ((await prisma.notification.count()) === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: A.id, type: 'REWARD_EARNED', title: 'You earned Rs.400', body: 'Murugan made their first purchase. Rs.400 credit added to your wallet.', link: '/refer' },
        { userId: A.id, type: 'REFERRAL_JOINED', title: 'Priya Interiors joined with your code', body: 'You will earn Rs.400 after their first qualifying purchase.', link: '/refer' },
        { userId: K.id, type: 'REWARD_EARNED', title: 'You earned Rs.250', body: 'Welcome reward added. Use it on your next bill.', link: '/refer' },
      ],
    });
  }
  console.log(`Seed complete. Owner: ${OWNER_PHONE}. Demo customers: +919000000001 ... +919000000006 (set SEED_DEMO=false to skip demo data).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { getShopSettings } from '../services/settings.service.js';

/** Server-rendered Open Graph share page: GET /p/:id?ref=CODE (WhatsApp previews). */
export const shareRouter = Router();

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

shareRouter.get('/p/:id', async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id }, include: { images: { orderBy: { order: 'asc' }, take: 1 } } });
    if (!post) return res.status(404).send('Post not found');
    const shop = await getShopSettings();
    const ref = typeof req.query.ref === 'string' ? req.query.ref.replace(/[^A-Z0-9-]/gi, '').toUpperCase() : '';
    const joinUrl = `${env.CLIENT_URL}/join${ref ? `?ref=${ref}` : ''}`;
    const postUrl = `${env.CLIENT_URL}/post/${post.id}${ref ? `?ref=${ref}` : ''}`;
    const img = post.images[0]?.url ?? `${env.CLIENT_URL}/icons/og-default.png`;
    const price = post.price ? `${post.priceLabel ?? ''} Rs.${Number(post.price).toLocaleString('en-IN')}${post.priceUnit ? '/' + post.priceUnit : ''}` : '';
    const desc = `${price ? price + ' · ' : ''}${post.description.slice(0, 150)}`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(post.title)} · ${esc(shop.name)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(shop.name)}">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(postUrl)}">
<meta name="twitter:card" content="summary_large_image">
<style>
body{margin:0;font-family:Inter,system-ui,sans-serif;background:#F6EFE3;color:#4A2F1B;line-height:1.5}
main{max-width:520px;margin:0 auto;padding:16px}
img{width:100%;border-radius:16px;aspect-ratio:4/3;object-fit:cover}
h1{font-family:Georgia,serif;font-size:24px;margin:12px 0 4px}
.btn{display:block;text-align:center;padding:14px;border-radius:12px;font-weight:600;text-decoration:none;margin-top:12px;min-height:44px;box-sizing:border-box}
.p{background:#4A2F1B;color:#fff}.g{background:#2F5D3A;color:#fff}.o{border:2px solid #4A2F1B;color:#4A2F1B}
.price{color:#2F5D3A;font-weight:700;font-size:20px;margin:4px 0}
.ref{background:rgba(201,153,58,.15);border:1px solid #C9993A;padding:10px;border-radius:12px;margin-top:12px}
.shop{font-weight:700}
</style></head>
<body><main>
<p class="shop">${esc(shop.name)} · Porur, Chennai</p>
<img src="${esc(img)}" alt="${esc(post.title)}">
<h1>${esc(post.title)}</h1>
${price ? `<p class="price">${esc(price)}</p>` : ''}
<p>${esc(post.description.slice(0, 300))}${post.description.length > 300 ? '…' : ''}</p>
${ref ? `<div class="ref">🎁 Join with referral code <b>${esc(ref)}</b> and get a welcome reward on your first purchase.</div>` : ''}
<a class="btn p" href="${esc(joinUrl)}">Join to see more</a>
<a class="btn g" href="https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I am interested in "${post.title}" that I saw on your app.`)}">Enquire on WhatsApp</a>
<a class="btn o" href="${esc(postUrl)}">Open in the app</a>
</main></body></html>`);
  } catch (e) {
    next(e);
  }
});

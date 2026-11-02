export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
export const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
export const fmtDate = (d: string | Date, lng = 'en') =>
  new Date(d).toLocaleDateString(lng === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Share links point at the server-rendered OG page so WhatsApp previews work. */
export const shareUrl = (postId: string, ref?: string) =>
  `${import.meta.env.VITE_API_URL ?? ''}/p/${postId}${ref ? `?ref=${ref}` : ''}`;

export async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** Stable per-browser id, used for referral fraud signals. */
export function deviceId() {
  let id = localStorage.getItem('st_device');
  if (!id) { id = (crypto.randomUUID?.() ?? String(Math.random())).slice(0, 36); localStorage.setItem('st_device', id); }
  return id;
}

export function isOpenNow(hours: { day: string; open: string; close: string; closed: boolean }[]) {
  const d = new Date();
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  const h = hours.find((x) => x.day === today);
  if (!h || h.closed) return { open: false, opens: null as string | null, closes: null as string | null };
  const now = d.getHours() * 60 + d.getMinutes();
  const [oh = 9, om = 0] = h.open.split(':').map(Number);
  const [ch = 20, cm = 0] = h.close.split(':').map(Number);
  const fmt = (hh: number, mm: number) => `${hh % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${hh < 12 ? 'am' : 'pm'}`;
  return { open: now >= oh * 60 + om && now < ch * 60 + cm, opens: fmt(oh, om), closes: fmt(ch, cm) };
}

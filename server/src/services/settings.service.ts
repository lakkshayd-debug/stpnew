import { prisma } from '../lib/prisma.js';
import { DEFAULT_REWARD_SETTINGS, DEFAULT_SHOP_SETTINGS } from '../domain/defaults.js';
import type { RewardSettings, ShopSettings } from '../../../shared/types.js';

async function get<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? ({ ...fallback, ...(row.value as object) } as T) : fallback;
}
export const getRewardSettings = () => get<RewardSettings>('rewards', DEFAULT_REWARD_SETTINGS);
export const getShopSettings = () => get<ShopSettings>('shop', DEFAULT_SHOP_SETTINGS);
export const setSetting = (key: 'rewards' | 'shop', value: object) =>
  prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });

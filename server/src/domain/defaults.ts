import type { RewardSettings, ShopSettings } from '../../../shared/types.js';

export const DEFAULT_REWARD_SETTINGS: RewardSettings = {
  welcomeAmount: 250,
  welcomeMinPurchase: 5000,
  referrerAmount: 400,
  qualifyingMinPurchase: 5000,
  milestones: [
    { count: 3, bonus: 300, badge: null },
    { count: 5, bonus: 600, badge: 'SILVER' },
    { count: 10, bonus: 1500, badge: 'GOLD' },
  ],
  expiryDays: 90,
  maxBillPercent: 10,
};

const weekday = (day: string) => ({ day, open: '09:00', close: '20:00', closed: false });
export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  name: 'Shyam Timber and Plywoods',
  address: 'Old No.98, 35A/107, New, Kundrathur Main Rd, Ramanatheswarar Nagar, Porur, Chennai, Tamil Nadu 600125',
  phone: '+919342194431',
  whatsapp: '+919342194431',
  website: 'https://shyamtimber.co.in',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Shyam+Timber+and+Plywoods+Kundrathur+Main+Road+Porur+Chennai',
  hours: [weekday('Mon'), weekday('Tue'), weekday('Wed'), weekday('Thu'), weekday('Fri'), weekday('Sat'), { day: 'Sun', open: '09:00', close: '14:00', closed: false }],
};

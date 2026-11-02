export type Role = 'OWNER' | 'CUSTOMER';
export type Area = 'PORUR' | 'VALASARAVAKKAM' | 'POONAMALLEE' | 'RAMAPURAM' | 'MANGADU' | 'KUNDRATHUR' | 'OTHER';
export type CustomerType = 'HOMEOWNER' | 'CARPENTER' | 'CONTRACTOR' | 'INTERIOR_DESIGNER' | 'BUILDER';
export type PostType = 'NEW_ARRIVAL' | 'OFFER' | 'TIP' | 'PROJECT' | 'ANNOUNCEMENT';
export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReferralStatus = 'JOINED' | 'PURCHASED' | 'REWARDED' | 'FLAGGED';
export type RewardType = 'WELCOME' | 'REFERRER' | 'MILESTONE';
export type RewardStatus = 'AVAILABLE' | 'USED' | 'EXPIRED';
export type NotificationType =
  | 'NEW_POST' | 'COMMENT_APPROVED' | 'COMMENT_REPLIED' | 'REFERRAL_JOINED' | 'REWARD_EARNED' | 'REWARD_EXPIRING' | 'SYSTEM';

export const AREAS: Area[] = ['PORUR', 'VALASARAVAKKAM', 'POONAMALLEE', 'RAMAPURAM', 'MANGADU', 'KUNDRATHUR', 'OTHER'];
export const CUSTOMER_TYPES: CustomerType[] = ['HOMEOWNER', 'CARPENTER', 'CONTRACTOR', 'INTERIOR_DESIGNER', 'BUILDER'];
export const POST_TYPES: PostType[] = ['NEW_ARRIVAL', 'OFFER', 'TIP', 'PROJECT', 'ANNOUNCEMENT'];
export const CATEGORIES = ['Plywood', 'Timber', 'Laminates', 'Doors', 'Boards', 'Veneer', 'Hardware', 'General'] as const;

export interface UserDTO {
  id: string; name: string; phone: string; role: Role; area: Area | null; customerType: CustomerType | null;
  referralCode: string; badges: string[]; createdAt: string;
}
export interface PostImageDTO { id: string; url: string; alt: string | null; order: number }
export interface PostDTO {
  id: string; title: string; description: string; category: string; type: PostType; price: number | null;
  priceLabel: string | null; priceUnit: string | null; pinned: boolean; isSample: boolean; createdAt: string;
  images: PostImageDTO[]; likeCount: number; commentCount: number; liked: boolean; saved: boolean;
}
export interface CommentDTO {
  id: string; postId: string; body: string; status: CommentStatus; createdAt: string;
  author: { id: string; name: string; role: Role }; ownerReply: string | null; ownerRepliedAt: string | null;
}
export interface RewardDTO {
  id: string; type: RewardType; title: string; amount: number; status: RewardStatus; expiresAt: string;
  usedInvoice: string | null; usedAt: string | null; createdAt: string;
}
export interface ReferralDTO {
  id: string; status: ReferralStatus; createdAt: string;
  referee: { id: string; name: string; area: Area | null };
  purchase: { invoiceNo: string; amount: number; confirmedAt: string } | null;
}
export interface RewardSettings {
  welcomeAmount: number; welcomeMinPurchase: number; referrerAmount: number; qualifyingMinPurchase: number;
  milestones: { count: number; bonus: number; badge: string | null }[];
  expiryDays: number; maxBillPercent: number;
}
export interface ShopSettings {
  name: string; address: string; phone: string; whatsapp: string; website: string; mapsUrl: string;
  hours: { day: string; open: string; close: string; closed: boolean }[];
}
export interface Paginated<T> { items: T[]; nextCursor: string | null }
export interface ApiError { error: { code: string; message: string; details?: unknown } }

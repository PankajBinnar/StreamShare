export type Role = 'USER' | 'ADMIN';
export type Category = 'VIDEO' | 'MUSIC' | 'GAMING' | 'PRODUCTIVITY';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'YEARLY';
export type ListingStatus = 'ACTIVE' | 'SOLD' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  avatarUrl?: string | null;
  isBanned?: boolean;
  createdAt?: string;
  _count?: {
    listings?: number;
    buyerConversations?: number;
    sellerConversations?: number;
  };
}

export interface Listing {
  id: string;
  ownerId: string;
  owner?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    createdAt?: string;
  };
  platformName: string;
  category: Category;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  slotsAvailable: number;
  description: string;
  terms?: string | null;
  status: ListingStatus;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    conversations?: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  content: string;
  imageUrl?: string | null;
  messageType?: 'TEXT' | 'IMAGE' | string;
  isRead: boolean;
  isFlagged: boolean;
  flaggedReason?: string | null;
  flaggedAt?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId?: string;
  sellerId?: string;
  listing: {
    id: string;
    platformName: string;
    price: number;
    currency: string;
    status: ListingStatus;
  };
  counterpart?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  buyer?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    email?: string;
    isBanned?: boolean;
  };
  seller?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    email?: string;
    isBanned?: boolean;
  };
  lastMessage?: Message | null;
  unreadCount?: number;
  lastMessageAt: string;
  createdAt: string;
  messages?: Message[];
  flaggedCount?: number;
  _count?: {
    messages?: number;
  };
}

export interface AuditLog {
  id: string;
  adminId: string;
  admin?: {
    id: string;
    username: string;
    email: string;
  };
  action: string;
  targetType: string;
  targetId?: string;
  ipAddress: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}


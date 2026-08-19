export type MainTab = 'home' | 'therapists' | 'booking' | 'about' | 'message' | 'admin';

export type TherapistCategory = 'Classic' | 'Deluxe' | 'Luxury';

export interface Therapist {
  id: string;
  name: string;
  category: TherapistCategory;
  experienceYears: number;
  rating: number;
  reviewsCount: number;
  price: number;
  durationMinutes: number;
  specialty: string;
  status: 'available' | 'off_duty' | 'pending';
  verified: boolean;
  isRecommended?: boolean;
  avatarUrl: string;
  bio: string;
  language: string;
  badgeLabel?: string;
}

export interface SpaService {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: string;
  price: number;
  imageUrl: string;
  popular?: boolean;
}

export interface Booking {
  id: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  serviceId: string;
  serviceName: string;
  therapistId: string;
  therapistName: string;
  therapistCategory: TherapistCategory;
  date: string;
  time: string;
  duration: string;
  fullAddress: string;
  houseFlatNo: string;
  floor: string;
  city: string;
  state: string;
  pincode: string;
  notes?: string;
  serviceLocation?: 'home' | 'hotel';
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  servicePrice: number;
  visitFee: number;
  totalPayable: number;
  paymentOption: 'pay_now' | 'pay_after';
  paymentMethod: 'online' | 'cash' | 'card';
  paymentStatus?: 'PENDING_VERIFICATION' | 'PAID';
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalOrders: number;
  lastVisit?: string;
  upcomingVisit?: string;
  avatarUrl?: string;
  status: 'Regular' | 'High Value' | 'New';
}

export interface ClientReview {
  id: string;
  clientName: string;
  isTrusted: boolean;
  rating: number;
  quote: string;
  date: string;
}

export interface ContactSettings {
  whatsappNumber: string;
  callNumber: string;
  contactEmail: string;
  instagramUrl: string;
  googleReviewUrl: string;
  brandName: string;
  brandLogoUrl: string;
  heroDesktopImageUrl: string;
  heroLaptopImageUrl: string;
  experienceHomeImageUrl: string;
  experienceHotelImageUrl: string;
  experienceTherapistImageUrl: string;
}

export interface ClientNotificationMessage {
  id: string;
  clientName?: string;
  clientPhone?: string;
  serviceNote?: string;
  messageText: string;
  timestamp: string;
  read: boolean;
  source: 'Message Tab' | 'Home Page' | 'Chatbot';
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'booking' | 'message' | 'system' | 'service' | 'therapist';
  relatedId?: string;
}

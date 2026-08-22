import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Booking, Therapist, Customer, SpaService, MainTab, ContactSettings, ClientNotificationMessage, AdminNotification } from '../types';
import {
  Bell,
  Search,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  UserCheck,
  Edit2,
  Trash2,
  ChevronDown,
  Check,
  X,
  Mail,
  Phone,
  MessageCircle,
  MessageSquare,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Save,
  Settings,
  Zap,
  Sparkles,
  AlertCircle,
  Download,
  LogOut,
  Lock,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ThumbnailImage, CardImage } from './ResponsiveImage';

const API_BASE = '/api';

interface AdminViewProps {
  bookings: Booking[];
  therapists: Therapist[];
  customers: Customer[];
  services: SpaService[];
  contactSettings?: ContactSettings;
  clientMessages?: ClientNotificationMessage[];
  adminNotifications?: AdminNotification[];
  isAdminAuthed?: boolean;
  onAdminLogin?: (pin: string) => Promise<string | null>;
  onAdminLogout?: () => void;
  onChangeAdminPin?: (currentPin: string, newPin: string) => Promise<string | null>;
  onClearOldData?: () => Promise<string | null>;
  pinChangeNotice?: string | null;
  onUpdateContactSettings?: (settings: ContactSettings) => Promise<string | null> | void;
  onMarkMessageAsRead?: (id: string) => void;
  onDeleteClientMessage?: (id: string) => void;
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  onAddNotification?: (title: string, message: string, type: AdminNotification['type'], relatedId?: string) => void;
  onUpdateBookingStatus: (id: string, status: Booking['status']) => void;
  onUpdatePaymentStatus?: (id: string, paymentStatus: Booking['paymentStatus']) => void;
  onAssignTherapist?: (id: string, therapistId: string, therapistName: string) => void;
  onToggleTherapistStatus: (id: string) => void;
  onAddTherapist: (therapist: Therapist) => void;
  onUpdateTherapist?: (therapist: Therapist) => void;
  onDeleteTherapist?: (id: string) => void;
  onAddService?: (service: SpaService) => void;
  onUpdateService?: (service: SpaService) => void;
  onDeleteService?: (id: string) => void;
  onAddBooking: (booking: Booking) => Promise<{ booking?: Booking; error?: string }>;
  setActiveTab: (tab: MainTab) => void;
}

const REVENUE_DATA = [
  { name: 'Mon', revenue: 1800 },
  { name: 'Tue', revenue: 2400 },
  { name: 'Wed', revenue: 1900 },
  { name: 'Thu', revenue: 3200 },
  { name: 'Fri', revenue: 2800 },
  { name: 'Sat', revenue: 4500 },
  { name: 'Sun', revenue: 3800 },
];

const LIST_PAGE_SIZE = 25;
const NOTIF_PAGE_SIZE = 40;

const AdminPagination: React.FC<{ page: number; pageSize: number; total: number; onChange: (page: number) => void }> = ({
  page,
  pageSize,
  total,
  onChange,
}) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-3 pb-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3.5 py-1.5 rounded-xl border border-[#c4c8bf] text-xs font-semibold text-[#52634f] hover:bg-[#efeee8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        ← Prev
      </button>
      <span className="text-[11px] text-[#747871] font-medium">Page {page} of {pages} · {total} total</span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className="px-3.5 py-1.5 rounded-xl border border-[#c4c8bf] text-xs font-semibold text-[#52634f] hover:bg-[#efeee8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        Next →
      </button>
    </div>
  );
};

export const AdminView: React.FC<AdminViewProps> = ({
  bookings,
  therapists,
  customers,
  services,
  contactSettings = {
    whatsappNumber: '6260104019',
    callNumber: '6260104019',
    contactEmail: 'premiumspaindore@gmail.com',
    instagramUrl: 'https://instagram.com',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    brandName: 'Premium Spa',
    brandLogoUrl: 'https://placehold.co/300x180/F9F5EC/C5A059?text=LOGO',
    heroDesktopImageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80',
    heroLaptopImageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80',
    experienceHomeImageUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80',
    experienceHotelImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    experienceTherapistImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
  },
  clientMessages = [],
  adminNotifications = [],
  isAdminAuthed = false,
  onAdminLogin,
  onAdminLogout,
  onChangeAdminPin,
  onClearOldData,
  pinChangeNotice,
  onUpdateContactSettings,
  onMarkMessageAsRead,
  onDeleteClientMessage,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onDeleteNotification,
  onAddNotification,
  onUpdateBookingStatus,
  onUpdatePaymentStatus,
  onAssignTherapist,
  onToggleTherapistStatus,
  onAddTherapist,
  onUpdateTherapist,
  onDeleteTherapist,
  onAddService,
  onUpdateService,
  onDeleteService,
  onAddBooking,
  setActiveTab,
}) => {
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'bookings' | 'client_data' | 'customers' | 'therapists' | 'services' | 'messages' | 'settings'>('dashboard');

  // Admin Login Gate State
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim() || !onAdminLogin) return;
    setLoginLoading(true);
    setLoginError(null);
    const error = await onAdminLogin(pinInput.trim());
    setLoginLoading(false);
    if (error) {
      setLoginError(error);
      setPinInput('');
    } else {
      setPinInput('');
    }
  };

  // Upload image to Supabase Storage via API
  const uploadImage = useCallback(async (
    file: File,
    entityType: 'service' | 'therapist' | 'site_setting' | 'hero',
    entityId: string,
    entityField: string,
    imageType?: 'service' | 'therapist' | 'hero' | 'logo' | 'general'
  ): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    formData.append('entityField', entityField);
    if (imageType) formData.append('imageType', imageType);
    
    try {
      const res = await fetch(`${API_BASE}/admin/images/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }
      return data.primaryUrl || data.urls?.full || data.urls?.card || data.urls?.original || null;
    } catch (err) {
      console.error('[AdminView] Image upload failed:', err);
      return null;
    }
  }, []);

  // Client Data Automatic Synthesis & Search / Filter
  const [clientSearch, setClientSearch] = useState('');
  const [clientFilterSource, setClientFilterSource] = useState<'all' | 'Booking' | 'Contact Form' | 'Concierge Inquiry'>('all');

  const clientRecords = React.useMemo(() => {
    const recordsMap = new Map<string, {
      id: string;
      name: string;
      phone: string;
      email: string;
      serviceBooked: string;
      date: string;
      totalSpent: number;
      status: string;
      source: 'Booking' | 'Contact Form' | 'Concierge Inquiry' | 'Manual Customer';
    }>();

    // 1. Auto-save & process all Bookings
    bookings.forEach(b => {
      const key = (b.customerMobile || b.customerName).toLowerCase().replace(/\s+/g, '');
      const existing = recordsMap.get(key);
      if (existing) {
        existing.totalSpent += (b.totalPayable || 0);
        if (!existing.serviceBooked.includes(b.serviceName)) {
          existing.serviceBooked = `${existing.serviceBooked}, ${b.serviceName}`;
        }
        existing.status = b.status;
      } else {
        recordsMap.set(key, {
          id: `CLI-BKG-${b.id}`,
          name: b.customerName,
          phone: b.customerMobile,
          email: b.customerEmail || `${b.customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          serviceBooked: b.serviceName,
          date: `${b.date}, ${b.time}`,
          totalSpent: b.totalPayable || 0,
          status: b.status,
          source: 'Booking',
        });
      }
    });

    // 2. Auto-save & process Contact Requests / Concierge Messages
    clientMessages.forEach(m => {
      const name = m.clientName || 'Client Visitor';
      const phone = m.clientPhone || 'N/A';
      const key = (phone !== 'N/A' ? phone : name).toLowerCase().replace(/\s+/g, '');
      if (!recordsMap.has(key)) {
        recordsMap.set(key, {
          id: `CLI-MSG-${m.id}`,
          name,
          phone,
          email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          serviceBooked: m.serviceNote || m.messageText,
          date: m.timestamp,
          totalSpent: 0,
          status: m.read ? 'Inquiry Handled' : 'New Inquiry',
          source: m.source === 'Message Tab' ? 'Concierge Inquiry' : 'Contact Form',
        });
      }
    });

    // 3. Auto-save & process Customers catalog
    customers.forEach(c => {
      const key = (c.phone || c.name).toLowerCase().replace(/\s+/g, '');
      if (!recordsMap.has(key)) {
        recordsMap.set(key, {
          id: `CLI-CUST-${c.id}`,
          name: c.name,
          phone: c.phone,
          email: c.email,
          serviceBooked: 'Spa Service Customer',
          date: c.upcomingVisit || c.lastVisit || 'Registered Client',
          totalSpent: c.totalOrders * 2200,
          status: c.status === 'New' ? 'New Client' : 'Active Client',
          source: 'Manual Customer',
        });
      }
    });

    return Array.from(recordsMap.values());
  }, [bookings, clientMessages, customers]);

  const filteredClientRecords = React.useMemo(() => {
    return clientRecords.filter(r => {
      const matchesSearch =
        r.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        r.phone.toLowerCase().includes(clientSearch.toLowerCase()) ||
        r.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
        r.serviceBooked.toLowerCase().includes(clientSearch.toLowerCase());

      const matchesSource = clientFilterSource === 'all' || r.source === clientFilterSource;
      return matchesSearch && matchesSource;
    });
  }, [clientRecords, clientSearch, clientFilterSource]);

  const handleExportClientDataCSV = () => {
    const headers = ['Client ID', 'Client Name', 'Phone Number', 'Email', 'Service Booked / Inquiry Note', 'Date / Time', 'Total Amount Spent (INR)', 'Status', 'Record Source'];

    const csvRows = [
      headers.join(','),
      ...filteredClientRecords.map(rec => [
        `"${rec.id}"`,
        `"${rec.name.replace(/"/g, '""')}"`,
        `"${rec.phone.replace(/"/g, '""')}"`,
        `"${rec.email.replace(/"/g, '""')}"`,
        `"${rec.serviceBooked.replace(/"/g, '""')}"`,
        `"${rec.date.replace(/"/g, '""')}"`,
        `"${rec.totalSpent}"`,
        `"${rec.status}"`,
        `"${rec.source}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Spa_Client_Data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Contact Settings Form State
  const [waNumberInput, setWaNumberInput] = useState(contactSettings.whatsappNumber);
  const [callNumberInput, setCallNumberInput] = useState(contactSettings.callNumber);
  const [contactEmailInput, setContactEmailInput] = useState(contactSettings.contactEmail);
  const [instaUrlInput, setInstaUrlInput] = useState(contactSettings.instagramUrl);
  const [googleReviewUrlInput, setGoogleReviewUrlInput] = useState(contactSettings.googleReviewUrl || 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4');
  const [brandNameInput, setBrandNameInput] = useState(contactSettings.brandName || 'Premium Spa');
  const [brandLogoInput, setBrandLogoInput] = useState(contactSettings.brandLogoUrl || 'https://placehold.co/300x180/F9F5EC/C5A059?text=LOGO');
  const [heroDesktopInput, setHeroDesktopInput] = useState(contactSettings.heroDesktopImageUrl || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80');
  const [heroLaptopInput, setHeroLaptopInput] = useState(contactSettings.heroLaptopImageUrl || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80');
  const [experienceHomeInput, setExperienceHomeInput] = useState(contactSettings.experienceHomeImageUrl || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80');
  const [experienceHotelInput, setExperienceHotelInput] = useState(contactSettings.experienceHotelImageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80');
  const [experienceTherapistInput, setExperienceTherapistInput] = useState(contactSettings.experienceTherapistImageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80');
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Change Admin PIN State
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSavedToast, setPinSavedToast] = useState(false);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinSaving) return;
    if (newPinInput !== confirmPinInput) {
      setPinError('New PIN and confirm PIN do not match.');
      return;
    }
    setPinSaving(true);
    setPinError(null);
    try {
      const result = await onChangeAdminPin?.(currentPinInput, newPinInput);
      if (result) {
        setPinError(result);
      } else {
        setPinSavedToast(true);
        setTimeout(() => setPinSavedToast(false), 3500);
        setCurrentPinInput('');
        setNewPinInput('');
        setConfirmPinInput('');
      }
    } catch {
      setPinError('Failed to change PIN. Please try again.');
    } finally {
      setPinSaving(false);
    }
  };

  const handleSettingsImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
    entityField: string,
    imageType: 'hero' | 'logo' | 'general' = 'general'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('jpeg') && !file.type.includes('jpg') && !file.type.includes('png') && !file.type.includes('webp')) {
      return;
    }
    
    // Show loading state
    setter('uploading...');
    
    const url = await uploadImage(file, 'site_setting', 'site-settings', entityField, imageType);
    if (url) {
      setter(url);
    } else {
      setter(''); // Reset on failure
    }
  };

  const handleSaveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settingsSaving) return;
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      const result = await onUpdateContactSettings?.({
        whatsappNumber: waNumberInput.trim(),
        callNumber: callNumberInput.trim(),
        contactEmail: contactEmailInput.trim(),
        instagramUrl: instaUrlInput.trim(),
        googleReviewUrl: googleReviewUrlInput.trim(),
        brandName: brandNameInput.trim() || 'Premium Spa',
        brandLogoUrl: brandLogoInput.trim() || 'https://placehold.co/300x180/F9F5EC/C5A059?text=LOGO',
        heroDesktopImageUrl: heroDesktopInput.trim() || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80',
        heroLaptopImageUrl: heroLaptopInput.trim() || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80',
        experienceHomeImageUrl: experienceHomeInput.trim() || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80',
        experienceHotelImageUrl: experienceHotelInput.trim() || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        experienceTherapistImageUrl: experienceTherapistInput.trim() || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
      });
      if (result) {
        setSettingsError(result);
      } else {
        setSettingsSavedToast(true);
        setTimeout(() => setSettingsSavedToast(false), 3000);
      }
    } catch {
      setSettingsError('Failed to save settings. Please try again.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const unreadMessagesCount = clientMessages.filter(m => !m.read).length;
  const unreadNotificationsCount = adminNotifications.filter(n => !n.read).length;

  // Real Notifications Drawer & Broadcast
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);

  // Quick Direct Add Name state for Therapists (Feature 1 requirement)
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState<'Classic' | 'Deluxe' | 'Luxury'>('Deluxe');
  const [quickPrice] = useState<number>(2999);
  const [quickSpecialty, setQuickSpecialty] = useState('Full Body Spa & Therapy');
  const [quickAddToast, setQuickAddToast] = useState<string | null>(null);

  const handleQuickDirectAddTherapist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    const newT: Therapist = {
      id: `th-${Date.now()}`,
      name: quickName.trim(),
      category: quickCategory,
      price: Number(quickPrice) || 2999,
      experienceYears: 5,
      rating: 5.0,
      reviewsCount: 1,
      durationMinutes: 60,
      specialty: quickSpecialty.trim() || 'Full Body Spa',
      status: 'available',
      verified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      bio: `Professional ${quickCategory} therapist specialized in ${quickSpecialty}.`,
      language: 'English, Hindi',
    };

    onAddTherapist(newT);
    setQuickAddToast(`Added "${newT.name}" directly to therapist list!`);
    setTimeout(() => setQuickAddToast(null), 3500);
    setQuickName('');
  };

  // Services CRUD State (Feature 2 requirement)
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<SpaService | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<SpaService | null>(null);

  const [sName, setSName] = useState('');
  const [sCategory, setSCategory] = useState('Relaxation Massage');
  const [sDuration, setSDuration] = useState('1H');
  const [sPrice, setSPrice] = useState(2999);
  const [sDescription, setSDescription] = useState('');
  const [sImageUrl, setSImageUrl] = useState('https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80');
  // While an image upload is in flight the form must not be submittable — this
  // guarantees a base64 data-URL preview can never be persisted to the DB.
  const [isUploadingServiceImage, setIsUploadingServiceImage] = useState(false);
  const [sPopular, setSPopular] = useState(false);

  const handleOpenAddServiceModal = () => {
    setEditingService(null);
    setSName('');
    setSCategory('Relaxation Massage');
    setSDuration('1H');
    setSPrice(2999);
    setSDescription('Therapeutic bodywork that releases muscle tension, promotes circulation, and restores mental clarity.');
    setSImageUrl('https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80');
    setSPopular(false);
    setShowServiceModal(true);
  };

  const handleOpenEditServiceModal = (s: SpaService) => {
    setEditingService(s);
    setSName(s.name);
    setSCategory(s.category);
    setSDuration(s.duration);
    setSPrice(s.price);
    setSDescription(s.description);
    setSImageUrl(s.imageUrl);
    setSPopular(!!s.popular);
    setShowServiceModal(true);
  };

  // Service image file selection handler
  const handleServiceImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show immediate preview while uploading
    const previousUrl = sImageUrl;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);

    setIsUploadingServiceImage(true);
    try {
      // Upload to Supabase Storage in background
      const entityId = editingService?.id || `srv-${Date.now()}`;
      const url = await uploadImage(file, 'service', entityId, 'imageUrl', 'service');
      if (url) {
        setSImageUrl(url);
      } else {
        setSImageUrl(previousUrl); // never leave a data URL in the submit path
      }
    } finally {
      setIsUploadingServiceImage(false);
    }
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return;

    if (editingService) {
      const updated: SpaService = {
        ...editingService,
        name: sName.trim(),
        category: sCategory.trim(),
        duration: sDuration.trim(),
        price: Number(sPrice) || 1999,
        description: sDescription.trim(),
        imageUrl: sImageUrl.trim() || 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80',
        popular: sPopular,
      };
      onUpdateService?.(updated);
    } else {
      const newS: SpaService = {
        id: `srv-${Date.now()}`,
        name: sName.trim(),
        category: sCategory.trim(),
        duration: sDuration.trim(),
        price: Number(sPrice) || 1999,
        description: sDescription.trim(),
        imageUrl: sImageUrl.trim() || 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80',
        popular: sPopular,
      };
      onAddService?.(newS);
    }

    setShowServiceModal(false);
  };

  const handleConfirmDeleteService = () => {
    if (serviceToDelete) {
      onDeleteService?.(serviceToDelete.id);
      setServiceToDelete(null);
    }
  };

  // Filters
  const [bookingFilter, setBookingFilter] = useState<string>('All');
  const [therapistCategoryFilter, setTherapistCategoryFilter] = useState<string>('All');

  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state (large lists are sliced client-side to avoid DOM bloat/hangs)
  const [bookingsPage, setBookingsPage] = useState(1);
  const [clientsPage, setClientsPage] = useState(1);
  const [messagesPage, setMessagesPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [notifPage, setNotifPage] = useState(1);

  React.useEffect(() => { setBookingsPage(1); }, [bookingFilter, searchQuery]);
  React.useEffect(() => { setClientsPage(1); }, [clientSearch, clientFilterSource]);
  React.useEffect(() => { setCustomersPage(1); }, [searchQuery]);
  React.useEffect(() => {
    setBookingsPage(1);
    setClientsPage(1);
    setMessagesPage(1);
    setCustomersPage(1);
    setNotifPage(1);
  }, [adminSubTab]);

  const slicePage = <T,>(items: T[], page: number, pageSize: number): T[] => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  // Add Client Booking Modal State (Requirement 2)
  const [showAddClientBookingModal, setShowAddClientBookingModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('04:00 PM');
  const [bookingStatus, setBookingStatus] = useState<Booking['status']>('Confirmed');
  const [bookingAmount, setBookingAmount] = useState<number>(1499);
  const [bookingToast, setBookingToast] = useState<string | null>(null);

  const handleOpenAddClientBookingModal = () => {
    setNewClientName('');
    setNewClientPhone('');
    setSelectedTherapistId(therapists[0]?.id || '');
    const firstSrv = services[0];
    setSelectedServiceId(firstSrv?.id || '');
    setBookingAmount(firstSrv?.price || 1499);
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTime('04:00 PM');
    setBookingStatus('Confirmed');
    setShowAddClientBookingModal(true);
  };

  const handleAdminCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const matchedT = therapists.find(t => t.id === selectedTherapistId);
    const matchedS = services.find(s => s.id === selectedServiceId);

    const createdBooking: Booking = {
      id: `B${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: newClientName.trim(),
      customerMobile: newClientPhone.trim(),
      serviceId: matchedS?.id || 'srv-1',
      serviceName: matchedS?.name || (matchedS as any)?.title || 'Spa Massage Treatment',
      therapistId: matchedT?.id || 'th-unassigned',
      therapistName: matchedT?.name || 'Unassigned Therapist',
      therapistCategory: matchedT?.category || 'Deluxe',
      date: bookingDate || new Date().toISOString().split('T')[0],
      time: bookingTime.trim() || '04:00 PM',
      duration: matchedS?.duration || '1H',
      fullAddress: 'Client Location (Added by Admin)',
      houseFlatNo: '',
      floor: '',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
      status: bookingStatus,
      servicePrice: Number(bookingAmount) || matchedS?.price || 1499,
      visitFee: 0,
      totalPayable: Number(bookingAmount) || matchedS?.price || 1499,
      paymentOption: 'pay_after',
      paymentMethod: 'cash',
      paymentStatus: 'PENDING_VERIFICATION',
      createdAt: 'Just now',
    };

    const result = await onAddBooking(createdBooking);
    if (result.error) {
      setBookingToast(`Failed to add booking: ${result.error}`);
      setTimeout(() => setBookingToast(null), 4000);
      return;
    }
    const persistedBooking = result.booking || createdBooking;

    onAddNotification?.(
      'Client Booking Added',
      `Admin registered booking for ${persistedBooking.customerName} (${persistedBooking.serviceName})`,
      'booking',
      persistedBooking.id
    );

    setBookingToast(`Client "${persistedBooking.customerName}" booking added successfully!`);
    setTimeout(() => setBookingToast(null), 3500);
    setShowAddClientBookingModal(false);
  };

  // Therapist CRUD Modal State
  const [showTherapistModal, setShowTherapistModal] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);

  // Clear Old Data State
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [clearDataNotice, setClearDataNotice] = useState<string | null>(null);
  const [clearDataError, setClearDataError] = useState<string | null>(null);

  const handleConfirmClearOldData = async () => {
    if (!onClearOldData || clearingData) return;
    setClearingData(true);
    setClearDataError(null);
    const error = await onClearOldData();
    setClearingData(false);
    setShowClearDataConfirm(false);
    if (error) {
      setClearDataNotice(null);
      setClearDataError(error);
    } else {
      setClearDataError(null);
      setClearDataNotice('Old bookings deleted successfully. Today\'s bookings are untouched.');
      setTimeout(() => setClearDataNotice(null), 5000);
    }
  };

  // Lock body scroll while any admin modal is open
  React.useEffect(() => {
    const anyModalOpen = showTherapistModal || showServiceModal || showAddClientBookingModal;
    if (!anyModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showTherapistModal, showServiceModal, showAddClientBookingModal]);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Classic' | 'Deluxe' | 'Luxury'>('Deluxe');
  const [formPrice, setFormPrice] = useState(2999);
  const [formExp, setFormExp] = useState(5);
  const [formSpecialty, setFormSpecialty] = useState('Full Body Spa & Wellness');
  const [formStatus, setFormStatus] = useState<'available' | 'off_duty'>('available');
  const [formAvatarUrl, setFormAvatarUrl] = useState('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80');
  // While an image upload is in flight the form must not be submittable — this
  // guarantees a base64 data-URL preview can never be persisted to the DB.
  const [isUploadingTherapistImage, setIsUploadingTherapistImage] = useState(false);
  const [formBio, setFormBio] = useState('Professional certified home spa specialist in Indore.');
  const [formLanguage, setFormLanguage] = useState('English, Hindi');
  const [formVerified, setFormVerified] = useState(true);

  // Delete Confirmation State
  const [therapistToDelete, setTherapistToDelete] = useState<Therapist | null>(null);

  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<Customer | null>(null);

  // Helper to reset and open Add Modal
  const handleOpenAddTherapistModal = () => {
    setEditingTherapist(null);
    setFormName('');
    setFormCategory('Deluxe');
    setFormPrice(2999);
    setFormExp(5);
    setFormSpecialty('Full Body Spa & Wellness');
    setFormStatus('available');
    setFormAvatarUrl('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80');
    setFormBio('Professional certified home spa specialist in Indore.');
    setFormLanguage('English, Hindi');
    setFormVerified(true);
    setShowTherapistModal(true);
  };

  // Helper to open Edit Modal with therapist details
  const handleOpenEditTherapistModal = (t: Therapist) => {
    setEditingTherapist(t);
    setFormName(t.name);
    setFormCategory(t.category);
    setFormPrice(t.price);
    setFormExp(t.experienceYears);
    setFormSpecialty(t.specialty);
    setFormStatus(t.status === 'pending' ? 'available' : t.status);
    setFormAvatarUrl(t.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80');
    setFormBio(t.bio || 'Professional certified home spa specialist in Indore.');
    setFormLanguage(t.language || 'English, Hindi');
    setFormVerified(t.verified);
    setShowTherapistModal(true);
  };

  // Category selection handler with price recommendation
  const handleCategoryChange = (cat: 'Classic' | 'Deluxe' | 'Luxury') => {
    setFormCategory(cat);
    if (!editingTherapist) {
      if (cat === 'Classic') setFormPrice(1499);
      else if (cat === 'Deluxe') setFormPrice(2999);
      else if (cat === 'Luxury') setFormPrice(4999);
    }
  };

  // Image file selection handler - uploads to Supabase Storage
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show immediate preview while uploading
    const previousUrl = formAvatarUrl;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setFormAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);

    setIsUploadingTherapistImage(true);
    try {
      // Upload to Supabase Storage in background
      const entityId = editingTherapist?.id || `th-${Date.now()}`;
      const url = await uploadImage(file, 'therapist', entityId, 'avatarUrl', 'therapist');
      if (url) {
        setFormAvatarUrl(url);
      } else {
        setFormAvatarUrl(previousUrl); // never leave a data URL in the submit path
      }
    } finally {
      setIsUploadingTherapistImage(false);
    }
  };

  // Submit handler (Add / Edit)
  const handleSaveTherapist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingTherapist) {
      const updated: Therapist = {
        ...editingTherapist,
        name: formName.trim(),
        category: formCategory,
        price: Number(formPrice),
        experienceYears: Number(formExp),
        specialty: formSpecialty,
        status: formStatus,
        avatarUrl: formAvatarUrl.trim() || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        bio: formBio,
        language: formLanguage,
        verified: formVerified,
      };
      onUpdateTherapist?.(updated);
    } else {
      const newT: Therapist = {
        id: `th-${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        price: Number(formPrice),
        experienceYears: Number(formExp),
        rating: 5.0,
        reviewsCount: 1,
        durationMinutes: 60,
        specialty: formSpecialty,
        status: formStatus,
        verified: formVerified,
        avatarUrl: formAvatarUrl.trim() || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        bio: formBio,
        language: formLanguage,
      };
      onAddTherapist(newT);
    }

    setShowTherapistModal(false);
  };

  // Delete therapist confirmation
  const handleConfirmDeleteTherapist = () => {
    if (therapistToDelete) {
      onDeleteTherapist?.(therapistToDelete.id);
      setTherapistToDelete(null);
    }
  };

  // Filtered Bookings
  const filteredBookings = React.useMemo(() => {
    return bookings.filter(b => {
      const matchesFilter = bookingFilter === 'All' || b.status.toLowerCase() === bookingFilter.toLowerCase();
      const matchesSearch = b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            b.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [bookings, bookingFilter, searchQuery]);

  // Filtered Therapists
  const filteredTherapists = React.useMemo(() => {
    return therapists.filter(t => {
      const matchesCategory = therapistCategoryFilter === 'All' || t.category.toLowerCase() === therapistCategoryFilter.toLowerCase();
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [therapists, therapistCategoryFilter, searchQuery]);

  // Filtered Customers
  const filteredCustomers = React.useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [customers, searchQuery]);

  const visibleBookings = React.useMemo(() => slicePage(filteredBookings, bookingsPage, LIST_PAGE_SIZE), [filteredBookings, bookingsPage]);
  const visibleClientRecords = React.useMemo(() => slicePage(filteredClientRecords, clientsPage, LIST_PAGE_SIZE), [filteredClientRecords, clientsPage]);
  const visibleMessages = React.useMemo(() => slicePage(clientMessages, messagesPage, LIST_PAGE_SIZE), [clientMessages, messagesPage]);
  const visibleCustomers = React.useMemo(() => slicePage(filteredCustomers, customersPage, LIST_PAGE_SIZE), [filteredCustomers, customersPage]);
  const visibleNotifications = React.useMemo(() => slicePage(adminNotifications, notifPage, NOTIF_PAGE_SIZE), [adminNotifications, notifPage]);

  // Admin JWT Login Gate - shown until backend auth verifies the PIN
  if (!isAdminAuthed) {
    return (
      <div className="min-h-[90vh] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#e9e8e3] shadow-xl p-7 sm:p-9 space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#52634f]/10 text-[#52634f] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="font-serif text-2xl text-[#1b1c19]">Management Console</h1>
            <p className="text-xs text-[#747871]">Enter your admin PIN to access the live dashboard.</p>
          </div>

          {pinChangeNotice && (
            <div className="p-3 bg-[#d5e8cf] border border-[#22c55e] text-[#3b4b38] text-xs font-semibold rounded-2xl flex items-center space-x-2 animate-fade-in">
              <Check className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
              <span>{pinChangeNotice}</span>
            </div>
          )}

          {loginError && (
            <div className="p-3 bg-[#ffdad6] border border-[#ba1a1a]/40 text-[#ba1a1a] text-xs font-semibold rounded-2xl flex items-center space-x-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-[#444841] block mb-1.5">Admin PIN / Password</label>
              <input
                type="password"
                autoFocus
                placeholder="Enter admin PIN"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                className="w-full px-4 py-3 rounded-2xl border border-[#c4c8bf] text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#52634f]"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading || !pinInput.trim()}
              className="w-full py-3.5 bg-[#52634f] hover:bg-[#3b4b38] text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md disabled:opacity-60 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{loginLoading ? 'VERIFYING...' : 'Login to Console'}</span>
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setActiveTab('home')}
              className="text-[11px] text-[#747871] hover:text-[#1b1c19] underline cursor-pointer"
            >
              ← Back to Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md md:max-w-5xl lg:max-w-7xl mx-auto space-y-6 pb-28 animate-fade-in">
      {/* Admin Top Header */}
      <div className="flex items-center justify-between border-b border-[#e9e8e3] pb-4 relative">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#52634f]">
            MANAGEMENT CONSOLE
          </span>
          <h1 className="font-serif text-2xl text-[#1b1c19] leading-tight">Welcome back, Admin</h1>
          <p className="text-xs text-[#747871]">Here is a summary of today's serene operations.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNotificationsDrawer(prev => !prev)}
            className={`relative p-2.5 rounded-2xl transition-all cursor-pointer ${
              showNotificationsDrawer ? 'bg-[#52634f] text-white shadow-md' : 'bg-[#efeee8] text-[#444841] hover:bg-[#e4e2dd]'
            }`}
            title="Toggle Notifications Center"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#ba1a1a] text-white rounded-full min-w-[18px] text-center shadow-xs border border-white">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
          <button
            onClick={onAdminLogout}
            className="p-2.5 rounded-2xl bg-[#efeee8] text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white transition-all cursor-pointer"
            title="Logout of Admin Console"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Real Notification Drawer Popover */}
        {showNotificationsDrawer && (
          <div className="absolute top-16 right-0 z-50 w-80 md:w-96 bg-white rounded-3xl border border-[#e4e2dd] shadow-2xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#efeee8] pb-2.5">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#52634f]" />
                <h3 className="font-semibold text-sm text-[#1b1c19]">Live Admin Alerts</h3>
                <span className="bg-[#52634f] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadNotificationsCount} Unread
                </span>
              </div>
              <button
                onClick={() => setShowNotificationsDrawer(false)}
                className="text-[#747871] hover:text-[#1b1c19] p-1 rounded-full hover:bg-[#efeee8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#747871]">Real-time system events</span>
              {unreadNotificationsCount > 0 && (
                <button
                  onClick={() => onMarkAllNotificationsAsRead?.()}
                  className="text-[11px] text-[#52634f] font-bold hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {adminNotifications.length === 0 ? (
                <p className="text-xs text-center text-[#747871] py-6">No alerts or notifications yet.</p>
              ) : (
                visibleNotifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-2xl border transition-all text-xs space-y-1 ${
                      !n.read ? 'bg-[#f7f9f6] border-[#52634f]/40 shadow-2xs' : 'bg-white border-[#efeee8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center space-x-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          n.type === 'booking' ? 'bg-[#22c55e]' : n.type === 'message' ? 'bg-[#3b82f6]' : 'bg-[#c5a059]'
                        }`} />
                        <h4 className="font-bold text-[#1b1c19] text-xs leading-snug">{n.title}</h4>
                      </div>
                      <span className="text-[9px] text-[#747871] font-medium flex-shrink-0">{n.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#444841] leading-relaxed pl-3.5">{n.message}</p>
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      {!n.read && (
                        <button
                          onClick={() => onMarkNotificationAsRead?.(n.id)}
                          className="text-[10px] text-[#52634f] font-bold hover:underline cursor-pointer"
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteNotification?.(n.id)}
                        className="text-[10px] text-[#ba1a1a] hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-1">
              <AdminPagination page={notifPage} pageSize={NOTIF_PAGE_SIZE} total={adminNotifications.length} onChange={setNotifPage} />
            </div>

            <div className="pt-2 border-t border-[#efeee8] text-center">
              <button
                onClick={() => {
                  setAdminSubTab('messages');
                  setShowNotificationsDrawer(false);
                }}
                className="w-full py-2 bg-[#52634f] text-white text-xs font-semibold rounded-xl hover:bg-[#3b4b38] transition-colors cursor-pointer"
              >
                Go to Messages & Notification Hub →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Sub Navigation Tabs */}
      <div className="flex items-center space-x-1 bg-[#efeee8] p-1 rounded-2xl border border-[#e4e2dd] overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'bookings', label: `Bookings (${bookings.length})` },
          { id: 'client_data', label: `Client Data (${clientRecords.length})` },
          { id: 'therapists', label: `Therapists (${therapists.length})` },
          {
            id: 'messages',
            label: unreadMessagesCount > 0 ? `Messages (${unreadMessagesCount} New)` : 'Messages',
            badge: unreadMessagesCount > 0,
          },
          { id: 'settings', label: 'Contact Settings ⚙️' },
          { id: 'customers', label: 'Customers' },
          { id: 'services', label: 'Services' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdminSubTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer relative ${
              adminSubTab === tab.id
                ? 'bg-white text-[#3b4b38] shadow-2xs font-bold md:bg-[#4A604A] md:text-white md:shadow-sm md:font-medium'
                : 'text-[#747871] hover:text-[#1b1c19]'
            } ${tab.badge && adminSubTab !== tab.id ? 'text-[#22c55e] font-bold' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. DASHBOARD SUB-VIEW */}
      {adminSubTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {/* Card 1: Total Bookings */}
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm md:hover:shadow-md md:hover:-translate-y-0.5 transition-all duration-300 space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#d5e8cf]/60 text-[#3b4b38] flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#747871] tracking-wider block">
                  TOTAL BOOKINGS
                </span>
                <span className="font-serif text-2xl text-[#1b1c19] font-normal block">1,240</span>
              </div>
            </div>

            {/* Card 2: Today's Bookings */}
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm md:hover:shadow-md md:hover:-translate-y-0.5 transition-all duration-300 space-y-2 relative">
              <span className="absolute top-3 right-3 bg-[#d5e8cf] text-[#3b4b38] text-[9px] font-bold px-2 py-0.5 rounded-full">
                +12%
              </span>
              <div className="w-8 h-8 rounded-full bg-[#52634f]/10 text-[#52634f] flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#747871] tracking-wider block">
                  TODAY'S BOOKINGS
                </span>
                <span className="font-serif text-2xl text-[#1b1c19] font-normal block">42</span>
              </div>
            </div>

            {/* Card 3: Pending */}
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm md:hover:shadow-md md:hover:-translate-y-0.5 transition-all duration-300 space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#747871] tracking-wider block">
                  PENDING
                </span>
                <span className="font-serif text-2xl text-[#1b1c19] font-normal block">
                  {bookings.filter(b => b.status === 'Pending').length || 15}
                </span>
              </div>
            </div>

            {/* Card 4: Today's Revenue */}
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm md:hover:shadow-md md:hover:-translate-y-0.5 transition-all duration-300 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#52634f] text-white flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#747871] tracking-wider block">
                  TODAY'S REVENUE
                </span>
                <span className="font-serif text-xl text-[#1b1c19] font-normal block">
                  ₹{bookings.filter(b => b.status !== 'Cancelled').reduce((sum, b) => sum + (b.totalPayable || 0), 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Data Maintenance: Clear Old Data */}
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-serif text-base text-[#1b1c19] flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-[#ba1a1a] flex-shrink-0" />
                <span>Data Maintenance</span>
              </h3>
              <p className="text-[11px] text-[#747871] mt-0.5">Permanently delete all booking records before today. Today's bookings stay untouched.</p>
            </div>
            <button
              type="button"
              onClick={() => { setClearDataNotice(null); setClearDataError(null); setShowClearDataConfirm(true); }}
              disabled={clearingData}
              className="px-4 py-2.5 rounded-xl bg-[#ffdad6] hover:bg-[#ffcdd0] disabled:opacity-50 disabled:cursor-not-allowed text-[#ba1a1a] text-xs font-semibold flex-shrink-0 cursor-pointer transition-colors flex items-center justify-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Old Data</span>
            </button>
          </div>

          {clearDataNotice && (
            <div className="p-3 bg-[#d5e8cf] border border-[#22c55e] text-[#3b4b38] rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
              <span>{clearDataNotice}</span>
            </div>
          )}

          {clearDataError && (
            <div className="p-3 bg-[#ffdad6] border border-[#ba1a1a]/40 text-[#ba1a1a] text-xs font-semibold rounded-2xl flex items-center space-x-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{clearDataError}</span>
            </div>
          )}

          {/* Change Admin PIN */}
          <div className="bg-white rounded-2xl p-4 md:p-6 border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm md:mt-6 space-y-4">
            <div>
              <h3 className="font-serif text-lg text-[#1b1c19] flex items-center space-x-2">
                <Lock className="w-4 h-4 text-[#52634f]" />
                <span>Change Admin PIN</span>
              </h3>
              <p className="text-[11px] text-[#747871]">You will be signed out after changing and must log in again with the new PIN. New PIN must be at least 12 characters spanning at least three of: lowercase, uppercase, digits, symbols.</p>
            </div>

            {pinSavedToast && (
              <div className="p-3 bg-[#d5e8cf] border border-[#22c55e] text-[#3b4b38] rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-bounce">
                <Check className="w-4 h-4 text-[#22c55e]" />
                <span>PIN changed successfully! You will be redirected to sign in again.</span>
              </div>
            )}

            {pinError && (
              <div className="p-3 bg-[#ffdad6] border border-[#ba1a1a]/40 text-[#ba1a1a] text-xs font-semibold rounded-2xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#444841] block mb-1.5">Current PIN</label>
                <input
                  type="password"
                  value={currentPinInput}
                  onChange={(e) => { setCurrentPinInput(e.target.value); if (pinError) setPinError(null); }}
                  placeholder="Enter current admin PIN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#444841] block mb-1.5">New PIN</label>
                <input
                  type="password"
                  value={newPinInput}
                  onChange={(e) => { setNewPinInput(e.target.value); if (pinError) setPinError(null); }}
                  placeholder="Min 12 characters, 3+ character types"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#444841] block mb-1.5">Confirm New PIN</label>
                <input
                  type="password"
                  value={confirmPinInput}
                  onChange={(e) => { setConfirmPinInput(e.target.value); if (pinError) setPinError(null); }}
                  placeholder="Re-enter new PIN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>
              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={pinSaving || !currentPinInput.trim() || !newPinInput.trim() || !confirmPinInput.trim()}
                  className="px-6 py-2.5 bg-[#52634f] hover:bg-[#3b4b38] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-full shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  {pinSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>{pinSaving ? 'Updating...' : 'Update PIN'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}{adminSubTab === 'bookings' && (
        <div className="space-y-4 px-1 sm:px-0 animate-fade-in">
          {/* Top Header Card with Add Client Booking Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e9e8e3] shadow-xs">
            <div>
              <h2 className="font-serif text-xl text-[#1b1c19]">Bookings & Client Management</h2>
              <p className="text-xs text-[#747871]">Add client bookings, assign therapist, select service & slot</p>
            </div>
            <button
              onClick={handleOpenAddClientBookingModal}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#52634f] hover:bg-[#3b4b38] text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Client Booking</span>
            </button>
          </div>

          {bookingToast && (
            <div className="p-3 bg-[#d5e8cf] text-[#3b4b38] text-xs font-bold rounded-2xl flex items-center space-x-2 animate-fade-in shadow-xs">
              <Check className="w-4 h-4 text-[#22c55e]" />
              <span>{bookingToast}</span>
            </div>
          )}

          {/* Search bar & filters */}
          <div className="space-y-2.5">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#747871] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search bookings, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto py-1 no-scrollbar w-full">
              {['All', 'Pending', 'Confirmed', 'Cancelled'].map(f => (
                <button
                  key={f}
                  onClick={() => setBookingFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    bookingFilter === f
                      ? 'bg-[#52634f] text-white shadow-xs'
                      : 'bg-[#efeee8] text-[#444841] hover:bg-[#e4e2dd]'
                  }`}
                >
                  {f} {f === 'All' ? `(${bookings.length})` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Booking Cards List */}
          <div className="space-y-3">
            {visibleBookings.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#e9e8e3] text-[#747871] text-xs">
                No bookings found matching your search.
              </div>
            ) : (
              visibleBookings.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-xs space-y-3">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#efeee8] pb-2">
                  <div className="flex items-center justify-between sm:justify-start space-x-2">
                    <span className="text-[11px] font-bold text-[#747871] font-mono">#{b.id}</span>
                    <span className="text-[10px] text-[#747871] bg-[#efeee8] px-2 py-0.5 rounded font-medium">
                      📅 {b.date}, {b.time}
                    </span>
                  </div>
                  <span
                    className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-center self-start sm:self-auto ${
                      b.status === 'Confirmed'
                        ? 'bg-[#d5e8cf] text-[#3b4b38]'
                        : b.status === 'Cancelled'
                        ? 'bg-[#ffdad6] text-[#ba1a1a]'
                        : 'bg-[#efeee8] text-[#52634f]'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="font-semibold text-base text-[#1b1c19] break-words">{b.customerName}</h4>
                    <span className="font-bold text-[#3b4b38] text-sm">₹{b.totalPayable?.toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#52634f]">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="font-semibold text-[#1b1c19]">Service:</span>
                      <span className="truncate">{b.serviceName}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="font-semibold text-[#1b1c19]">Therapist:</span>
                      <span className="truncate">{b.therapistName}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="font-semibold text-[#1b1c19]">Phone:</span>
                      <span className="truncate font-mono">{b.customerMobile}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="font-semibold text-[#1b1c19]">Email:</span>
                      <span className="truncate">{b.customerEmail || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-1 rounded-xl bg-[#fbf9f4] border border-[#e4e2dd] p-3 text-xs text-[#52634f]">
                    <p className="leading-relaxed">
                      <span className="font-semibold text-[#1b1c19]">Address: </span>
                      {b.fullAddress || 'N/A'}
                    </p>
                    {(b.houseFlatNo || b.floor || b.pincode || b.notes) && (
                      <p className="leading-relaxed">
                        {b.houseFlatNo && <span><span className="font-semibold text-[#1b1c19]">House/Room:</span> {b.houseFlatNo} </span>}
                        {b.floor && <span><span className="font-semibold text-[#1b1c19]">Floor:</span> {b.floor} </span>}
                        {b.pincode && <span><span className="font-semibold text-[#1b1c19]">Pincode:</span> {b.pincode} </span>}
                        {b.notes && <span><span className="font-semibold text-[#1b1c19]">Notes:</span> {b.notes}</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment Status & Therapist Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#efeee8]">
                  <div className="flex items-center justify-between gap-2 bg-[#fbf9f4] px-3 py-2 rounded-xl border border-[#e4e2dd]">
                    <div className="flex items-center space-x-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[#52634f]" />
                      <span className="text-[11px] font-semibold text-[#1b1c19]">Payment:</span>
                    </div>
                    {b.paymentStatus === 'PAID' ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#22c55e] bg-[#d5e8cf]/60 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onUpdatePaymentStatus?.(b.id, 'PAID')}
                        className="text-[10px] font-bold text-[#b45309] bg-[#fef3c7] hover:bg-[#fde68a] px-2 py-1 rounded-full flex items-center space-x-1 cursor-pointer"
                        title="Mark payment as verified"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Pending Verify</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-[#fbf9f4] px-3 py-2 rounded-xl border border-[#e4e2dd]">
                    <div className="flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#52634f]" />
                      <span className="text-[11px] font-semibold text-[#1b1c19]">Therapist:</span>
                    </div>
                    <select
                      value={b.therapistId || ''}
                      onChange={(e) => {
                        const t = therapists.find(x => x.id === e.target.value);
                        onAssignTherapist?.(b.id, e.target.value, t?.name || 'Unassigned Therapist');
                      }}
                      className="text-[11px] font-semibold text-[#1b1c19] bg-white border border-[#c4c8bf] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#52634f] max-w-[150px]"
                    >
                      {therapists.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-[#efeee8]">
                  {b.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => onUpdateBookingStatus(b.id, 'Cancelled')}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#c4c8bf] text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 cursor-pointer text-center"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => onUpdateBookingStatus(b.id, 'Confirmed')}
                        className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#52634f] text-white text-xs font-semibold hover:bg-[#3b4b38] cursor-pointer text-center shadow-xs"
                      >
                        Accept & Confirm
                      </button>
                    </>
                  )}
                  {b.status === 'Confirmed' && (
                    <button
                      onClick={() => onUpdateBookingStatus(b.id, 'Completed')}
                      className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#d5e8cf] text-[#3b4b38] text-xs font-bold hover:bg-[#b9ccb3] cursor-pointer text-center"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
              ))
            )}
          </div>

          <AdminPagination page={bookingsPage} pageSize={LIST_PAGE_SIZE} total={filteredBookings.length} onChange={setBookingsPage} />

          {/* Floating + button */}
          <button
            onClick={handleOpenAddClientBookingModal}
            className="fixed bottom-6 right-5 w-12 h-12 rounded-full bg-[#52634f] text-white shadow-lg flex items-center justify-center hover:bg-[#3b4b38] transition-transform active:scale-95 z-30 cursor-pointer md:hidden"
            title="Add New Client Booking"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* CLIENT DATA & CRM DATABASE SUB-VIEW */}
      {adminSubTab === 'client_data' && (
        <div className="space-y-5 animate-fade-in px-1 sm:px-0">
          {/* Top Header & Export CSV Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-serif text-xl text-[#1b1c19]">Client Data Database</h2>
                <span className="bg-[#4A604A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Auto-Saved
                </span>
              </div>
              <p className="text-xs text-[#747871] mt-0.5">
                Automated customer store capturing all bookings, contact requests, and concierge inquiries.
              </p>
            </div>

            <button
              onClick={handleExportClientDataCSV}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#4A604A] hover:bg-[#3b4b38] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all duration-200 cursor-pointer flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export Client Data (CSV)</span>
            </button>
          </div>

          {/* Metric Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#747871] tracking-wider block">Total Clients</span>
              <p className="text-lg sm:text-xl font-bold text-[#1b1c19] mt-1">{clientRecords.length}</p>
              <span className="text-[10px] text-[#52634f] font-medium">Auto-synchronized</span>
            </div>
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#747871] tracking-wider block">Total Client Revenue</span>
              <p className="text-lg sm:text-xl font-bold text-[#3b4b38] mt-1">
                ₹{clientRecords.reduce((acc, r) => acc + (typeof r.totalSpent === 'number' ? r.totalSpent : 0), 0).toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-[#22c55e] font-medium">+100% Verified</span>
            </div>
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#747871] tracking-wider block">Active Booked</span>
              <p className="text-lg sm:text-xl font-bold text-[#1b1c19] mt-1">
                {clientRecords.filter(r => r.source === 'Booking').length}
              </p>
              <span className="text-[10px] text-[#52634f] font-medium">Bookings captured</span>
            </div>
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#747871] tracking-wider block">Inquiries & Leads</span>
              <p className="text-lg sm:text-xl font-bold text-[#1b1c19] mt-1">
                {clientRecords.filter(r => r.source !== 'Booking').length}
              </p>
              <span className="text-[10px] text-[#747871] font-medium">Contact & Chat inquiries</span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#e9e8e3] md:border-stone-200/80">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#747871] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Search client name, phone, email..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#e4e2dd] focus:outline-none focus:ring-2 focus:ring-[#52634f] bg-[#fbf9f4]"
              />
            </div>

            <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <span className="text-xs font-semibold text-[#747871] whitespace-nowrap hidden sm:inline">Filter Source:</span>
              {(['all', 'Booking', 'Contact Form', 'Concierge Inquiry'] as const).map(src => (
                <button
                  key={src}
                  onClick={() => setClientFilterSource(src)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    clientFilterSource === src
                      ? 'bg-[#4A604A] text-white shadow-xs'
                      : 'bg-[#efeee8] text-[#747871] hover:text-[#1b1c19]'
                  }`}
                >
                  {src === 'all' ? 'All Sources' : src}
                </button>
              ))}
            </div>
          </div>

          {/* Client Data Mobile Cards View (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredClientRecords.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-[#747871] border border-[#e9e8e3] text-xs">
                No client records found matching your search.
              </div>
            ) : (
              visibleClientRecords.map((rec, idx) => (
                <div key={`mob-${rec.id}-${idx}`} className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-xs space-y-3">
                  {/* Top Row: Avatar, Name, Email, Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-[#efeee8] pb-2.5">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#52634f]/10 text-[#52634f] flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {rec.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-[#1b1c19] truncate">{rec.name}</h4>
                        <p className="text-[11px] text-[#747871] truncate">{rec.email}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                      rec.status === 'Confirmed' || rec.status === 'Completed'
                        ? 'bg-[#d5e8cf] text-[#3b4b38]'
                        : rec.status === 'Pending' || rec.status === 'New Inquiry'
                        ? 'bg-[#ffdad6] text-[#ba1a1a]'
                        : 'bg-[#efeee8] text-[#747871]'
                    }`}>
                      {rec.status}
                    </span>
                  </div>

                  {/* Body Details */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#747871] font-medium">Phone:</span>
                      <span className="font-mono font-semibold text-[#1b1c19]">{rec.phone}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-[#747871] font-medium flex-shrink-0 mr-2">Service / Note:</span>
                      <span className="text-right font-medium text-[#1b1c19] line-clamp-2">{rec.serviceBooked}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#747871] font-medium">Date / Time:</span>
                      <span className="text-[#747871]">{rec.date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#747871] font-medium">Total Spent:</span>
                      <span className="font-bold text-[#3b4b38]">₹{typeof rec.totalSpent === 'number' ? rec.totalSpent.toLocaleString('en-IN') : rec.totalSpent}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#747871] font-medium">Source:</span>
                      <span className="text-[10px] text-[#52634f] font-semibold bg-[#efeee8] px-2 py-0.5 rounded-md">
                        {rec.source}
                      </span>
                    </div>
                  </div>

                  {/* Contact Buttons */}
                  {rec.phone && rec.phone !== 'N/A' && (
                    <div className="flex items-center gap-2 pt-2.5 border-t border-[#efeee8]">
                      <a
                        href={`https://wa.me/${rec.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center space-x-1.5 bg-[#16B543] text-white py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                      <a
                        href={`tel:${rec.phone.replace(/\s+/g, '')}`}
                        className="flex-1 flex items-center justify-center space-x-1.5 bg-[#52634f] text-white py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Client</span>
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Client Data Desktop Table View (>= md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#e9e8e3] md:border-stone-200/80 shadow-xs md:shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fbf9f4] border-b border-[#e9e8e3] text-[#747871] uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Client Name & Details</th>
                    <th className="py-3.5 px-4">Phone Number</th>
                    <th className="py-3.5 px-4">Service Booked / Inquiry</th>
                    <th className="py-3.5 px-4">Date / Time</th>
                    <th className="py-3.5 px-4">Total Spent</th>
                    <th className="py-3.5 px-4">Status & Source</th>
                    <th className="py-3.5 px-4 text-right">Quick Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efeee8]">
                  {filteredClientRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#747871]">
                        No client records found matching your search.
                      </td>
                    </tr>
                  ) : (
                    visibleClientRecords.map((rec, idx) => (
                      <tr key={`${rec.id}-${idx}`} className="hover:bg-[#fbf9f4] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#52634f]/10 text-[#52634f] flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {rec.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#1b1c19]">{rec.name}</p>
                              <p className="text-[11px] text-[#747871]">{rec.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-[#1b1c19]">
                          {rec.phone}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-xs font-medium text-[#1b1c19] line-clamp-2">{rec.serviceBooked}</p>
                        </td>
                        <td className="py-3.5 px-4 text-[#747871] whitespace-nowrap">
                          {rec.date}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#3b4b38] whitespace-nowrap">
                          ₹{typeof rec.totalSpent === 'number' ? rec.totalSpent.toLocaleString('en-IN') : rec.totalSpent}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rec.status === 'Confirmed' || rec.status === 'Completed'
                                ? 'bg-[#d5e8cf] text-[#3b4b38]'
                                : rec.status === 'Pending' || rec.status === 'New Inquiry'
                                ? 'bg-[#ffdad6] text-[#ba1a1a]'
                                : 'bg-[#efeee8] text-[#747871]'
                            }`}>
                              {rec.status}
                            </span>
                            <span className="block text-[10px] text-[#747871]">
                              via {rec.source}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {rec.phone && rec.phone !== 'N/A' && (
                              <>
                                <a
                                  href={`https://wa.me/${rec.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-[#16B543] text-white rounded-lg hover:opacity-90 transition-opacity"
                                  title="WhatsApp Client"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`tel:${rec.phone.replace(/\s+/g, '')}`}
                                  className="p-1.5 bg-[#52634f] text-white rounded-lg hover:opacity-90 transition-opacity"
                                  title="Call Client"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <AdminPagination page={clientsPage} pageSize={LIST_PAGE_SIZE} total={filteredClientRecords.length} onChange={setClientsPage} />
        </div>
      )}

      {/* 4. THERAPISTS SUB-VIEW */}
      {adminSubTab === 'therapists' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-[#1b1c19]">Manage Therapists</h2>
              <p className="text-xs text-[#747871]">Add names directly to list or open detailed modal</p>
            </div>
            <button
              onClick={handleOpenAddTherapistModal}
              className="px-3.5 py-1.5 bg-[#52634f] hover:bg-[#3b4b38] text-white text-xs font-semibold rounded-full flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Full Form</span>
            </button>
          </div>

          {/* Quick Direct Add Name Bar (Requirement 1) */}
          <div className="bg-gradient-to-r from-[#f7f9f6] to-[#edf3eb] rounded-2xl p-4 border border-[#d2dec0] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs text-[#1b1c19] flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-[#52634f]" />
                <span>Quick Direct Add Therapist Name to List</span>
              </h3>
              <span className="text-[10px] bg-[#52634f] text-white px-2 py-0.5 rounded-full font-bold">Fast Add</span>
            </div>

            {quickAddToast && (
              <div className="p-2 bg-[#d5e8cf] text-[#3b4b38] text-xs font-bold rounded-xl flex items-center space-x-1.5 animate-fade-in">
                <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>{quickAddToast}</span>
              </div>
            )}

            <form onSubmit={handleQuickDirectAddTherapist} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Therapist Name (e.g. Ananya Sharma)..."
                value={quickName}
                onChange={e => setQuickName(e.target.value)}
                className="px-3 py-2 bg-white border border-[#c5c7c1]/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                required
              />
              <select
                value={quickCategory}
                onChange={e => setQuickCategory(e.target.value as any)}
                className="px-3 py-2 bg-white border border-[#c5c7c1]/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
              >
                <option value="Deluxe">Deluxe Tier (₹2,999)</option>
                <option value="Classic">Classic Tier (₹1,499)</option>
                <option value="Luxury">Luxury Tier (₹4,999)</option>
              </select>
              <input
                type="text"
                placeholder="Specialty (e.g. Aromatherapy)"
                value={quickSpecialty}
                onChange={e => setQuickSpecialty(e.target.value)}
                className="px-3 py-2 bg-white border border-[#c5c7c1]/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#52634f] hover:bg-[#3b4b38] text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>⚡ Direct Add Name</span>
              </button>
            </form>
          </div>

          {/* Search bar & Category filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#747871] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by name, specialty, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto py-1 no-scrollbar">
              {['All', 'Classic', 'Deluxe', 'Luxury'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setTherapistCategoryFilter(cat)}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    therapistCategoryFilter === cat
                      ? 'bg-[#52634f] text-white shadow-xs'
                      : 'bg-[#efeee8] text-[#444841] hover:bg-[#e4e2dd]'
                  }`}
                >
                  {cat} {cat === 'All' ? `(${therapists.length})` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Therapists Cards List */}
          <div className="space-y-3">
            {filteredTherapists.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#e9e8e3] text-[#747871]">
                <UserCheck className="w-8 h-8 mx-auto mb-2 text-[#a3a79e]" />
                <p className="text-sm font-medium">No therapists found</p>
                <p className="text-xs text-[#a3a79e] mt-1">Try adjusting search or filters, or add a new therapist.</p>
              </div>
            ) : (
              filteredTherapists.map(t => (
                <div key={t.id} className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#efeee8] flex-shrink-0 relative border border-[#e4e2dd]">
                      <ThumbnailImage
                        src={t.avatarUrl}
                        alt={t.name}
                        size={48}
                        className="w-full h-full object-cover"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          t.status === 'available' ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'
                        }`}
                        title={t.status === 'available' ? 'Available' : 'Off Duty'}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-semibold text-sm text-[#1b1c19] truncate">{t.name}</h4>
                        {t.verified && (
                          <span className="text-[10px] font-bold text-[#22c55e] bg-[#d5e8cf]/60 px-1.5 py-0.2 rounded-full flex-shrink-0" title="Verified Professional">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#747871] truncate">
                        {t.category} Tier • {t.experienceYears} Yrs Exp • ₹{t.price.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-[#52634f] font-medium truncate mt-0.5">
                        {t.specialty}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={() => onToggleTherapistStatus(t.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                        t.status === 'available'
                          ? 'bg-[#d5e8cf] text-[#3b4b38] hover:bg-[#c2e0b8]'
                          : 'bg-[#efeee8] text-[#747871] hover:bg-[#e4e2dd]'
                      }`}
                      title="Click to toggle Available / Off Duty status"
                    >
                      {t.status === 'available' ? 'Available' : 'Off Duty'}
                    </button>

                    <button
                      onClick={() => handleOpenEditTherapistModal(t)}
                      className="p-2 rounded-xl bg-[#efeee8] text-[#444841] hover:bg-[#52634f] hover:text-white transition-colors cursor-pointer"
                      title="Edit Therapist Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setTherapistToDelete(t)}
                      className="p-2 rounded-xl bg-[#ffdad6]/60 text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white transition-colors cursor-pointer"
                      title="Delete Therapist Profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. CUSTOMERS SUB-VIEW */}
      {adminSubTab === 'customers' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-[#1b1c19]">Customers</h2>
              <p className="text-xs text-[#747871]">Manage your client base</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#747871] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-[#c4c8bf] text-xs focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            {visibleCustomers.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#e9e8e3] text-[#747871] text-xs">
                No customers found matching your search.
              </div>
            ) : (
              visibleCustomers.map(c => (
              <div key={c.id} className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#efeee8] flex items-center justify-center font-bold text-[#52634f]">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#1b1c19]">{c.name}</h4>
                      <p className="text-xs text-[#747871]">{c.phone}</p>
                    </div>
                  </div>
                  {c.status === 'New' && (
                    <span className="bg-[#efeee8] text-[#52634f] text-[10px] font-bold px-2 py-0.5 rounded-full">New</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 bg-[#fbf9f4] p-2.5 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#747871] block">TOTAL ORDERS</span>
                    <span className="font-bold text-[#1b1c19]">{c.totalOrders}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#747871] block">LAST VISIT</span>
                    <span className="text-[#1b1c19]">{c.lastVisit || c.upcomingVisit || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#747871] pt-1">
                  <span className="truncate">{c.email}</span>
                  <button
                    onClick={() => setSelectedCustomerHistory(c)}
                    className="text-[#52634f] font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                  >
                    <span>View History</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              ))
            )}
          </div>

          <AdminPagination page={customersPage} pageSize={LIST_PAGE_SIZE} total={filteredCustomers.length} onChange={setCustomersPage} />
        </div>
      )}

      {/* 5. SERVICES SUB-VIEW (Requirement 2) */}
      {adminSubTab === 'services' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-[#1b1c19]">Catalog Services</h2>
              <p className="text-xs text-[#747871]">Edit service name, duration, price, description, and photo</p>
            </div>
            <button
              onClick={handleOpenAddServiceModal}
              className="px-3.5 py-1.5 bg-[#52634f] hover:bg-[#3b4b38] text-white text-xs font-semibold rounded-full flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Service</span>
            </button>
          </div>

          <div className="space-y-3">
            {services.map(s => (
              <div key={s.id} className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#efeee8] flex-shrink-0 border border-[#e4e2dd] relative">
                    <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                    {s.popular && (
                      <span className="absolute top-1 left-1 bg-[#c5a059] text-white text-[8px] font-bold px-1 rounded-sm">
                        ★ Popular
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-sm text-[#1b1c19]">{s.name}</h4>
                      <span className="text-[10px] bg-[#d5e8cf]/70 text-[#3b4b38] font-bold px-2 py-0.5 rounded-full">
                        {s.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#747871] line-clamp-2">{s.description}</p>
                    <div className="flex items-center space-x-3 text-xs text-[#52634f] font-medium pt-0.5">
                      <span>⏱ Duration: {s.duration}</span>
                      <span>•</span>
                      <span className="font-bold text-[#1b1c19]">₹{s.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#f0efe8] w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleOpenEditServiceModal(s)}
                    className="px-3 py-1.5 rounded-xl bg-[#efeee8] text-[#444841] hover:bg-[#52634f] hover:text-white transition-colors cursor-pointer text-xs font-semibold flex items-center space-x-1"
                    title="Edit Service"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => setServiceToDelete(s)}
                    className="p-1.5 rounded-xl bg-[#ffdad6]/60 text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white transition-colors cursor-pointer"
                    title="Delete Service"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. MESSAGES & NOTIFICATION CENTER SUB-VIEW */}
      {adminSubTab === 'messages' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#e9e8e3] pb-3">
            <div>
              <h2 className="font-serif text-xl text-[#1b1c19]">Notification Center & Live Messages</h2>
              <p className="text-xs text-[#747871]">Real-time client inquiries sent from Home Page / Chatbot</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#d5e8cf] text-[#3b4b38] text-xs font-bold shadow-2xs">
              {unreadMessagesCount} New
            </span>
          </div>

          {clientMessages.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#e9e8e3] text-[#747871]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#a3a79e]" />
              <p className="text-sm font-medium">No client messages yet</p>
              <p className="text-xs text-[#a3a79e] mt-1">When clients send inquiries from Chatbot or Home Page, they appear here live.</p>
            </div>
          ) : (
            <>
            <div className="space-y-3">
              {visibleMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`bg-white rounded-2xl p-4 border transition-all ${
                    !msg.read ? 'border-[#52634f] shadow-sm bg-[#fcfdfa]' : 'border-[#e9e8e3]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#52634f]/10 text-[#52634f] flex items-center justify-center font-bold text-xs">
                        {msg.clientName ? msg.clientName.charAt(0) : 'C'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-sm text-[#1b1c19]">{msg.clientName || 'Anonymous Visitor'}</h4>
                          {!msg.read && (
                            <span className="bg-[#52634f] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                              NEW
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#747871] block">{msg.timestamp} • via {msg.source || 'Chatbot'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {!msg.read && (
                        <button
                          onClick={() => onMarkMessageAsRead?.(msg.id)}
                          className="px-2 py-1 rounded-xl bg-[#d5e8cf]/60 text-[#3b4b38] hover:bg-[#52634f] hover:text-white transition-colors cursor-pointer text-[10px] font-bold flex items-center space-x-1"
                          title="Mark as Read"
                        >
                          <Check className="w-3 h-3" />
                          <span>Read</span>
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteClientMessage?.(msg.id)}
                        className="p-1.5 rounded-xl bg-[#ffdad6]/60 text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white transition-colors cursor-pointer"
                        title="Delete Alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Message content */}
                  <div className="mt-3 p-3 bg-[#fbf9f4] rounded-xl border border-[#efeee8] text-xs space-y-1">
                    <p className="text-[#1b1c19] font-medium leading-relaxed">{msg.messageText}</p>
                    {msg.clientPhone && (
                      <p className="text-[11px] text-[#52634f] font-semibold">Contact: {msg.clientPhone}</p>
                    )}
                  </div>

                  {/* Quick Action buttons */}
                  <div className="flex items-center space-x-2 pt-3">
                    <a
                      href={`https://wa.me/${(msg.clientPhone || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#16B543] hover:bg-[#129a38] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`tel:${(msg.clientPhone || '').replace(/\s+/g, '')}`}
                      className="px-3 py-1.5 bg-[#52634f] hover:bg-[#3b4b38] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Client</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <AdminPagination page={messagesPage} pageSize={LIST_PAGE_SIZE} total={clientMessages.length} onChange={setMessagesPage} />
            </>
          )}
        </div>
      )}

      {/* 7. CONTACT SETTINGS SUB-VIEW */}
      {adminSubTab === 'settings' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h2 className="font-serif text-xl text-[#1b1c19]">Dynamic Contact Info Settings</h2>
            <p className="text-xs text-[#747871]">Update business numbers and social links. Changes reflect live on the Home Page.</p>
          </div>

          {settingsSavedToast && (
            <div className="p-3 bg-[#d5e8cf] border border-[#22c55e] text-[#3b4b38] rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-bounce">
              <Check className="w-4 h-4 text-[#22c55e]" />
              <span>Contact settings updated successfully! Live on Home Page now.</span>
            </div>
          )}

          {settingsError && (
            <div className="p-3 bg-[#ffdad6] border border-[#ba1a1a] text-[#7f1d1d] rounded-2xl text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-[#ba1a1a]" />
              <span>{settingsError}</span>
            </div>
          )}

          <form onSubmit={handleSaveContactSettings} className="bg-white rounded-2xl p-5 border border-[#e9e8e3] shadow-xs space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-1">
                <MessageCircle className="w-4 h-4 text-[#16B543]" />
                <span>WhatsApp Business Number</span>
              </label>
              <input
                type="text"
                required
                value={waNumberInput}
                onChange={(e) => setWaNumberInput(e.target.value)}
                placeholder="e.g. 6260104019"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
              />
              <span className="text-[10px] text-[#747871] mt-1 block">Used for direct WhatsApp chat button on Home Page.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-1">
                <Phone className="w-4 h-4 text-[#22C55E]" />
                <span>Calling Phone Number</span>
              </label>
              <input
                type="text"
                required
                value={callNumberInput}
                onChange={(e) => setCallNumberInput(e.target.value)}
                placeholder="e.g. 6260104019"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
              />
              <span className="text-[10px] text-[#747871] mt-1 block">Used for 'Call Now' direct dialing button on Home Page.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-1">
                <Mail className="w-4 h-4 text-[#52634f]" />
                <span>Contact Email</span>
              </label>
              <input
                type="email"
                value={contactEmailInput}
                onChange={(e) => setContactEmailInput(e.target.value)}
                placeholder="e.g. premiumspaindore@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
              />
              <span className="text-[10px] text-[#747871] mt-1 block">Shown as the mailto contact in the Home Page footer.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-1">
                <ImageIcon className="w-4 h-4 text-[#ee2a7b]" />
                <span>Instagram Profile Link / Handle</span>
              </label>
              <input
                type="text"
                required
                value={instaUrlInput}
                onChange={(e) => setInstaUrlInput(e.target.value)}
                placeholder="e.g. https://instagram.com/my_spa_official"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
              />
              <span className="text-[10px] text-[#747871] mt-1 block">Used for Instagram social link button on Home Page.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-1">
                <Settings className="w-4 h-4 text-[#52634f]" />
                <span>Brand Name</span>
              </label>
              <input
                type="text"
                value={brandNameInput}
                onChange={(e) => setBrandNameInput(e.target.value)}
                placeholder="Premium Spa"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
              />
              <span className="text-[10px] text-[#747871] mt-1 block">This changes the visible business name in the header and brand text.</span>
            </div>

<div>
              <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-1">
                <ImageIcon className="w-4 h-4 text-[#C5A059]" />
                <span>Brand Logo (JPG / PNG / Placeholder)</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <img src={brandLogoInput} alt="Brand logo preview" className="w-16 h-16 object-contain rounded-xl border border-[#e9e8e3] bg-[#fbf9f4]" />
                  <label className="inline-flex items-center space-x-2 px-3 py-2 bg-[#efeee8] hover:bg-[#e4e2dd] text-[#3b4b38] rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload JPG</span>
                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => handleSettingsImageUpload(e, setBrandLogoInput, 'brandLogoUrl', 'logo')} />
                  </label>
                </div>
                <input
                  type="text"
                  value={brandLogoInput}
                  onChange={(e) => setBrandLogoInput(e.target.value)}
                  placeholder="https://...logo.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
                <p className="text-[10px] text-[#747871] italic">📐 Recommended: Square 1:1 (e.g., 300×300px). Used in header & footer.</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-1">
                <ImageIcon className="w-4 h-4 text-[#52634f]" />
                <span>Hero Image - Desktop / Laptop</span>
              </label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={heroDesktopInput} alt="Desktop hero preview" className="w-20 h-14 object-cover rounded-xl border border-[#e9e8e3] bg-[#fbf9f4]" />
                    <label className="inline-flex items-center space-x-2 px-3 py-2 bg-[#efeee8] hover:bg-[#e4e2dd] text-[#3b4b38] rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Desktop Hero</span>
                      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => handleSettingsImageUpload(e, setHeroDesktopInput, 'heroDesktopImageUrl', 'hero')} />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={heroDesktopInput}
                    onChange={(e) => setHeroDesktopInput(e.target.value)}
                    placeholder="Desktop hero image URL"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={heroLaptopInput} alt="Laptop hero preview" className="w-20 h-14 object-cover rounded-xl border border-[#e9e8e3] bg-[#fbf9f4]" />
                    <label className="inline-flex items-center space-x-2 px-3 py-2 bg-[#efeee8] hover:bg-[#e4e2dd] text-[#3b4b38] rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Laptop Hero</span>
                      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => handleSettingsImageUpload(e, setHeroLaptopInput, 'heroLaptopImageUrl', 'hero')} />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={heroLaptopInput}
                    onChange={(e) => setHeroLaptopInput(e.target.value)}
                    placeholder="Laptop hero image URL"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#747871] italic">📐 Recommended: Landscape ~16:9 (Desktop 1600×900px, Laptop 1400×788px). Full-width hero banner.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-1">
                <ImageIcon className="w-4 h-4 text-[#52634f]" />
                <span>Choose Your Experience — Section Images</span>
              </label>
              <div className="space-y-3">
                {/* Home Service */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={experienceHomeInput} alt="Home Service preview" className="w-20 h-14 object-cover rounded-xl border border-[#e9e8e3] bg-[#fbf9f4]" />
                    <label className="inline-flex items-center space-x-2 px-3 py-2 bg-[#efeee8] hover:bg-[#e4e2dd] text-[#3b4b38] rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Home Service</span>
                      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => handleSettingsImageUpload(e, setExperienceHomeInput, 'experienceHomeImageUrl', 'hero')} />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={experienceHomeInput}
                    onChange={(e) => setExperienceHomeInput(e.target.value)}
                    placeholder="Home service image URL"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                  />
                </div>
                {/* Hotel Service */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={experienceHotelInput} alt="Hotel Service preview" className="w-20 h-14 object-cover rounded-xl border border-[#e9e8e3] bg-[#fbf9f4]" />
                    <label className="inline-flex items-center space-x-2 px-3 py-2 bg-[#efeee8] hover:bg-[#e4e2dd] text-[#3b4b38] rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Hotel Service</span>
                      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => handleSettingsImageUpload(e, setExperienceHotelInput, 'experienceHotelImageUrl', 'hero')} />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={experienceHotelInput}
                    onChange={(e) => setExperienceHotelInput(e.target.value)}
                    placeholder="Hotel service image URL"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                  />
                </div>
                {/* Book Therapist */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={experienceTherapistInput} alt="Book Therapist preview" className="w-20 h-14 object-cover rounded-xl border border-[#e9e8e3] bg-[#fbf9f4]" />
                    <label className="inline-flex items-center space-x-2 px-3 py-2 bg-[#efeee8] hover:bg-[#e4e2dd] text-[#3b4b38] rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Book Therapist</span>
                      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => handleSettingsImageUpload(e, setExperienceTherapistInput, 'experienceTherapistImageUrl', 'hero')} />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={experienceTherapistInput}
                    onChange={(e) => setExperienceTherapistInput(e.target.value)}
                    placeholder="Book therapist image URL"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#747871] italic">📐 Recommended: Landscape 4:3 (800×600px). Used in 3-card grid on Home page.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-1">
                <svg className="w-4 h-4 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Google Business Profile Review URL</span>
              </label>
              <input
                type="text"
                required
                value={googleReviewUrlInput}
                onChange={(e) => setGoogleReviewUrlInput(e.target.value)}
                placeholder="e.g. https://g.page/r/your-google-review-link or https://search.google.com/local/writereview?placeid=..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
              />
              <span className="text-[10px] text-[#747871] mt-1 block">Connected to the '+ Add Review' button on the Home Page. Redirects clients directly to write a Google review.</span>
            </div>

            <div className="pt-2 border-t border-[#efeee8] flex justify-end">
              <button
                type="submit"
                disabled={settingsSaving}
                className="px-6 py-2.5 bg-[#52634f] hover:bg-[#3b4b38] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-full shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
              >
                {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{settingsSaving ? 'Saving...' : 'Save Contact Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CLEAR OLD DATA CONFIRMATION MODAL */}
      {showClearDataConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-[#e9e8e3] shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-xl text-[#1b1c19]">Clear Old Data?</h3>
              <p className="text-xs text-[#747871] px-2">
                This will permanently delete all bookings before today. Continue?
              </p>
              <p className="text-[11px] text-[#747871] px-2 pt-1">
                Today's bookings, revenue and all dashboard stats will update automatically.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearDataConfirm(false)}
                disabled={clearingData}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold bg-[#efeee8] text-[#444841] hover:bg-[#e4e2dd] disabled:opacity-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearOldData}
                disabled={clearingData}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold bg-[#ba1a1a] text-white hover:bg-[#9a1313] disabled:opacity-50 cursor-pointer transition-colors shadow-xs flex items-center justify-center space-x-1"
              >
                {clearingData ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{clearingData ? 'Deleting...' : 'Delete Old Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT THERAPIST MODAL */}
      {showTherapistModal && typeof document !== 'undefined' && createPortal((
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-stretch justify-center p-0 sm:items-center sm:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowTherapistModal(false)}
        >
          <div
            className="bg-white w-full h-[100dvh] max-w-none rounded-none overflow-hidden border-0 shadow-2xl relative flex flex-col sm:h-auto sm:max-h-[calc(100vh-48px)] sm:max-w-[420px] sm:rounded-3xl sm:border sm:border-[#e9e8e3] md:max-w-[480px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowTherapistModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-[#efeee8] text-[#747871] hover:text-[#1b1c19] hover:bg-[#e4e2dd] transition-colors z-20 cursor-pointer"
              aria-label="Close therapist form"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleSaveTherapist} className="flex flex-col min-h-0 flex-1">
              <div className="overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar flex-1">
                <div className="pr-12">
                  <h3 className="font-serif text-xl text-[#1b1c19]">
                    {editingTherapist ? 'Edit Therapist Profile' : 'Add New Therapist'}
                  </h3>
                  <p className="text-xs text-[#747871] mt-0.5">Profile photo, pricing tier & duty details</p>
                </div>
              {/* Profile Image & Upload */}
              <div>
                <label className="text-xs font-semibold text-[#444841] block mb-1.5">Profile Photo</label>
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-[#efeee8] border border-[#c4c8bf] flex-shrink-0">
                    <img src={formAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#efeee8] hover:bg-[#e4e2dd] text-[#3b4b38] rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      value={formAvatarUrl}
                      onChange={(e) => setFormAvatarUrl(e.target.value)}
                      placeholder="Or enter Image URL..."
                      className="w-full px-3 py-1.5 rounded-xl border border-[#c4c8bf] text-[11px] focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                    />
                    <p className="text-[10px] text-[#747871] italic">📐 Recommended: Square 1:1 (400×400px) or Portrait 3:4 (300×400px). Used in therapist cards.</p>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-[#444841] block mb-1">Therapist Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#444841] block mb-1">Category Tier</label>
                  <select
                    value={formCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                  >
                    <option value="Classic">Classic Tier</option>
                    <option value="Deluxe">Deluxe Tier</option>
                    <option value="Luxury">Luxury Tier</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#444841] block mb-1">Session Rate (₹)</label>
                  <input
                    type="number"
                    required
                    min={499}
                    max={20000}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                  />
                </div>
              </div>

              {/* Experience & Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#444841] block mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={40}
                    value={formExp}
                    onChange={(e) => setFormExp(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#444841] block mb-1">Duty Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                  >
                    <option value="available">Available</option>
                    <option value="off_duty">Off Duty</option>
                  </select>
                </div>
              </div>

              {/* Specialty */}
              <div>
                <label className="text-xs font-semibold text-[#444841] block mb-1">Specialty & Techniques</label>
                <input
                  type="text"
                  value={formSpecialty}
                  onChange={(e) => setFormSpecialty(e.target.value)}
                  placeholder="e.g. Swedish & Aromatherapy, Deep Tissue"
                  className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                />
              </div>

              {/* Languages */}
              <div>
                <label className="text-xs font-semibold text-[#444841] block mb-1">Languages Spoken</label>
                <input
                  type="text"
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  placeholder="e.g. English, Hindi"
                  className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                />
              </div>

              {/* Verified Switch & Bio */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="formVerified"
                  checked={formVerified}
                  onChange={(e) => setFormVerified(e.target.checked)}
                  className="rounded text-[#52634f] focus:ring-[#52634f]"
                />
                <label htmlFor="formVerified" className="text-xs font-medium text-[#1b1c19] cursor-pointer">
                  Mark as Verified Therapist
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#444841] block mb-1">Bio / Short Description</label>
                <textarea
                  rows={2}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="Brief summary of experience and client care approach..."
                  className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                />
              </div>

              </div>

              {/* Sticky footer actions */}
              <div className="border-t border-[#e9e8e3] bg-white/95 backdrop-blur-xs px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
                <div>
                  <span className="text-[10px] text-[#747871] uppercase font-bold block">SESSION RATE</span>
                  <span className="font-serif text-xl font-bold text-[#1b1c19]">₹{formPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowTherapistModal(false)}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#747871] hover:bg-[#efeee8] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingTherapistImage}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#52634f] hover:bg-[#3b4b38] text-white shadow-md cursor-pointer transition-colors flex items-center space-x-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isUploadingTherapistImage ? 'Uploading image…' : editingTherapist ? 'Update Profile' : 'Add Therapist'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {/* DELETE CONFIRMATION MODAL */}
      {therapistToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-[#e9e8e3] shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-xl text-[#1b1c19]">Delete Therapist?</h3>
              <p className="text-xs text-[#747871] px-2">
                Are you sure you want to permanently remove <strong className="text-[#1b1c19]">{therapistToDelete.name}</strong> from the therapists database? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setTherapistToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold bg-[#efeee8] text-[#444841] hover:bg-[#e4e2dd] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTherapist}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold bg-[#ba1a1a] text-white hover:bg-[#9a1313] cursor-pointer transition-colors shadow-xs flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER HISTORY MODAL */}
      {selectedCustomerHistory && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 border border-[#e9e8e3]">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-xl text-[#1b1c19]">{selectedCustomerHistory.name}'s History</h3>
              <button onClick={() => setSelectedCustomerHistory(null)} className="text-[#747871] hover:text-[#1b1c19]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-[#747871] space-y-2">
              <p>Email: {selectedCustomerHistory.email}</p>
              <p>Phone: {selectedCustomerHistory.phone}</p>
              <p>Total Bookings: {selectedCustomerHistory.totalOrders}</p>
              <div className="bg-[#fbf9f4] p-3 rounded-xl border border-[#e4e2dd]">
                <span className="font-bold text-[#1b1c19] block mb-1">Recent Booking Log</span>
                <span>Deep Tissue - Completed (₹2,999)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE ADD / EDIT MODAL (Requirement 2) */}
      {showServiceModal && typeof document !== 'undefined' && createPortal((
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-stretch justify-center p-0 sm:items-center sm:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowServiceModal(false)}
        >
          <div
            className="bg-white w-full h-[100dvh] max-w-none rounded-none overflow-hidden border-0 shadow-2xl relative flex flex-col sm:h-auto sm:max-h-[calc(100vh-48px)] sm:max-w-[420px] sm:rounded-3xl sm:border sm:border-[#e9e8e3] md:max-w-[520px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowServiceModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-[#efeee8] text-[#747871] hover:text-[#1b1c19] hover:bg-[#e4e2dd] transition-colors z-20 cursor-pointer"
              aria-label="Close service form"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleSaveService} className="flex flex-col min-h-0 flex-1">
              <div className="overflow-y-auto p-4 sm:p-5 space-y-3.5 no-scrollbar flex-1">
                <div className="flex items-center space-x-2 pr-12">
                  <Sparkles className="w-5 h-5 text-[#52634f] flex-shrink-0" />
                  <h3 className="font-serif text-xl text-[#1b1c19]">
                    {editingService ? 'Edit Catalog Service' : 'Add New Spa Service'}
                  </h3>
                </div>
              {/* Service Name */}
              <div>
                <label className="text-xs font-semibold text-[#444841] block mb-1">Service Title / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swedish Relaxation Body Therapy"
                  value={sName}
                  onChange={e => setSName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                />
              </div>

              {/* Category & Duration */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#444841] block mb-1">Category</label>
                  <select
                    value={sCategory}
                    onChange={e => setSCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                  >
                    <option value="Relaxation Massage">Relaxation Massage</option>
                    <option value="Therapeutic Massage">Therapeutic Massage</option>
                    <option value="Energy Healing">Energy Healing</option>
                    <option value="Reflexology">Reflexology</option>
                    <option value="Luxury Wellness">Luxury Wellness</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#444841] block mb-1">Duration Tag</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1H, 45M, 1H 30M"
                    value={sDuration}
                    onChange={e => setSDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                  />
                </div>
              </div>

              {/* Price & Popular Tag */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#444841] block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={499}
                    max={50000}
                    value={sPrice}
                    onChange={e => setSPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-xl bg-[#fbf9f4] border border-[#efeee8]">
                    <input
                      type="checkbox"
                      checked={sPopular}
                      onChange={e => setSPopular(e.target.checked)}
                      className="rounded text-[#52634f] focus:ring-[#52634f]"
                    />
                    <span className="text-xs font-semibold text-[#1b1c19]">★ Featured / Popular</span>
                  </label>
                </div>
              </div>

              {/* Service Description */}
              <div>
                <label className="text-xs font-semibold text-[#444841] block mb-1">Description</label>
                <textarea
                  required
                  rows={2.5}
                  placeholder="Detailed description of techniques, benefits, and experience..."
                  value={sDescription}
                  onChange={e => setSDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                />
              </div>

              {/* Image URL & Presets */}
              <div>
                <label className="text-xs font-semibold text-[#444841] block mb-1">Service Photo Image URL</label>
                <div className="space-y-2">
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={sImageUrl}
                    onChange={e => setSImageUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                  />
                  <label className="inline-flex items-center space-x-2 px-3 py-2 bg-[#efeee8] hover:bg-[#e4e2dd] text-[#3b4b38] rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleServiceImageFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-[#747871] italic">📐 Recommended: Landscape 4:3 (800×600px). Used in service cards grid.</p>
                </div>

                {/* Preset image selector */}
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] text-[#747871] font-semibold block">Or select a preset high-res photo:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { name: 'Aroma', url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80' },
                      { name: 'Deep Tissue', url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80' },
                      { name: 'Reiki', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80' },
                      { name: 'Hot Stone', url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80' },
                    ].map(p => (
                      <button
                        type="button"
                        key={p.name}
                        onClick={() => setSImageUrl(p.url)}
                        className={`h-10 rounded-lg overflow-hidden relative border transition-all cursor-pointer ${
                          sImageUrl === p.url ? 'ring-2 ring-[#52634f] border-transparent' : 'border-[#e4e2dd]'
                        }`}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              </div>

              {/* Sticky footer actions */}
              <div className="border-t border-[#e9e8e3] bg-white/95 backdrop-blur-xs px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
                <div>
                  <span className="text-[10px] text-[#747871] uppercase font-bold block">SESSION RATE</span>
                  <span className="font-serif text-xl font-bold text-[#1b1c19]">₹{sPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#747871] hover:bg-[#efeee8] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingServiceImage}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#52634f] hover:bg-[#3b4b38] text-white shadow-md cursor-pointer transition-colors flex items-center space-x-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isUploadingServiceImage ? 'Uploading image…' : editingService ? 'Save Changes' : 'Create Service'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {/* SERVICE DELETE CONFIRMATION MODAL */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-[#e9e8e3] shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-xl text-[#1b1c19]">Delete Service?</h3>
              <p className="text-xs text-[#747871] px-2">
                Are you sure you want to delete <strong className="text-[#1b1c19]">{serviceToDelete.name}</strong> from catalog?
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold bg-[#efeee8] text-[#444841] hover:bg-[#e4e2dd] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteService}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold bg-[#ba1a1a] text-white hover:bg-[#9a1313] cursor-pointer transition-colors shadow-xs flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CLIENT BOOKING MODAL (Requirement 2) */}
      {showAddClientBookingModal && typeof document !== 'undefined' && createPortal((
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-stretch justify-center p-0 sm:items-center sm:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAddClientBookingModal(false)}
        >
          <div
            className="bg-white w-full h-[100dvh] max-w-none rounded-none overflow-hidden border-0 shadow-2xl relative flex flex-col sm:h-auto sm:max-h-[calc(100vh-48px)] sm:max-w-[420px] sm:rounded-3xl sm:border sm:border-[#e9e8e3] md:max-w-[520px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAddClientBookingModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-[#efeee8] text-[#747871] hover:text-[#1b1c19] hover:bg-[#e4e2dd] transition-colors z-20 cursor-pointer"
              aria-label="Close booking form"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleAdminCreateBooking} className="flex flex-col min-h-0 flex-1 text-left">
              <div className="overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar flex-1">
                <div className="pr-12">
                  <h3 className="font-serif text-xl text-[#1b1c19]">Add Client Booking</h3>
                  <p className="text-xs text-[#747871] mt-0.5">Enter client details, select therapist (optional), service & slot</p>
                </div>
              {/* Client Name */}
              <div>
                <label className="text-xs font-semibold text-[#1b1c19] block mb-1">
                  Client / Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Mehta"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>

              {/* Contact Phone (Optional) */}
              <div>
                <label className="text-xs font-semibold text-[#1b1c19] block mb-1">
                  Contact Phone Number <span className="text-xs font-normal text-[#747871]">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 6260104019"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>

              {/* Select Therapist (Optional) */}
              <div>
                <label className="text-xs font-semibold text-[#1b1c19] block mb-1">
                  Select Therapist <span className="text-xs font-normal text-[#747871]">(Optional)</span>
                </label>
                <select
                  value={selectedTherapistId}
                  onChange={(e) => setSelectedTherapistId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                >
                  <option value="">-- None / Assign Therapist Later --</option>
                  {therapists.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category} Tier - ₹{t.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Service */}
              <div>
                <label className="text-xs font-semibold text-[#1b1c19] block mb-1">
                  Service Treatment
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    const foundS = services.find(s => s.id === e.target.value);
                    if (foundS) {
                      setBookingAmount(foundS.price);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title || s.name} ({s.duration} - ₹{s.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1b1c19] block mb-1">Booking Date</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1b1c19] block mb-1">Time Slot</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 04:00 PM"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                  />
                </div>
              </div>

              {/* Status & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1b1c19] block mb-1">Booking Status</label>
                  <select
                    value={bookingStatus}
                    onChange={(e) => setBookingStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1b1c19] block mb-1">Total Payable (₹)</label>
                  <input
                    type="number"
                    required
                    value={bookingAmount}
                    onChange={(e) => setBookingAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                  />
                </div>
              </div>

              </div>

              {/* Sticky footer actions */}
              <div className="border-t border-[#e9e8e3] bg-white/95 backdrop-blur-xs px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
                <div>
                  <span className="text-[10px] text-[#747871] uppercase font-bold block">TOTAL PAYABLE</span>
                  <span className="font-serif text-xl font-bold text-[#1b1c19]">₹{bookingAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddClientBookingModal(false)}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#747871] hover:bg-[#efeee8] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#52634f] hover:bg-[#3b4b38] text-white shadow-md cursor-pointer transition-colors flex items-center space-x-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Booking</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};

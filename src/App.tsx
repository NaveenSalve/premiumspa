import React, { Suspense, lazy, useState, useEffect, useCallback, useRef } from 'react';
import { MainTab, Therapist, SpaService, Booking, Customer, ContactSettings, ClientNotificationMessage, AdminNotification } from './types';
import {
  INITIAL_SERVICES,
  INITIAL_THERAPISTS,
} from './data/mockData';
import { api, ApiError, formatTimestamp } from './api/client';
import { Header } from './components/Header';
import { BottomNav, LotusServiceIcon } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { TherapistsView } from './components/TherapistsView';
import { BookingView } from './components/BookingView';
import { AboutView } from './components/AboutView';
import { MessageView } from './components/MessageView';
import { X } from 'lucide-react';

const AdminView = lazy(() => import('./components/AdminView').then((module) => ({ default: module.AdminView })));

const mapEnquiryToMessage = (e: any): ClientNotificationMessage => ({
  id: e.id,
  clientName: e.name,
  clientPhone: e.mobile,
  serviceNote: e.message,
  messageText: e.message,
  timestamp: formatTimestamp(e.createdAt),
  read: (e.status || '').toLowerCase() !== 'new',
  source: 'Message Tab',
});

const mapContactToMessage = (c: any): ClientNotificationMessage => ({
  id: c.id,
  clientName: c.name,
  clientPhone: c.phone,
  serviceNote: c.message,
  messageText: c.message,
  timestamp: formatTimestamp(c.createdAt),
  read: (c.status || '').toLowerCase() === 'read',
  source: 'Home Page',
});

// Canonical defaults for the DB-backed site settings. The server seeds these
// into the site_settings table on first boot; the client uses the same values
// for instant first paint before the public /api/settings response arrives.
const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
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
};

// F-11: the API bounds every list response (default 50, hard cap 100). The
// admin panel still shows the full dataset by paging through every page. This
// keeps the UI identical while no single response is ever unbounded.
const ADMIN_PAGE_SIZE = 100;
const ADMIN_PAGE_CAP = 200; // hard stop (20k rows) to guard against runaway loops

async function fetchAllAdminPages(path: string): Promise<any[]> {
  const all: any[] = [];
  for (let offset = 0; ; offset += ADMIN_PAGE_SIZE) {
    const page = await api<any[]>(`${path}?limit=${ADMIN_PAGE_SIZE}&offset=${offset}`, { authed: true });
    all.push(...page);
    if (page.length < ADMIN_PAGE_SIZE || offset >= ADMIN_PAGE_CAP * ADMIN_PAGE_SIZE) break;
  }
  return all;
}

const getInitialTab = (): MainTab => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.toLowerCase();
    if (path === '/admin' || path === '/admin/' || path.startsWith('/admin')) {
      return 'admin';
    }
  }
  return 'home';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>(getInitialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [services, setServices] = useState<SpaService[]>(INITIAL_SERVICES);
  const [therapists, setTherapists] = useState<Therapist[]>(INITIAL_THERAPISTS);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [clientMessages, setClientMessages] = useState<ClientNotificationMessage[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [adminAuthed, setAdminAuthed] = useState<boolean>(false);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [selectedService, setSelectedService] = useState<SpaService | null>(null);
  const isAdminPollInFlight = useRef(false);
  const isCatalogPollInFlight = useRef(false);

  // Auto clear toast notification after 4.5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Keep URL in sync with tab and handle browser popstate (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/admin' || path === '/admin/' || path.startsWith('/admin')) {
        setActiveTab('admin');
      } else {
        setActiveTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Scroll to top whenever active tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  // Load public catalog (services + therapists + site settings) from the API.
  // Site settings are the DB-backed source of truth; the localStorage cache only
  // provides instant first paint and is always overridden by this response.
  const loadCatalog = useCallback(async () => {
    if (isCatalogPollInFlight.current) return;
    isCatalogPollInFlight.current = true;
    try {
      const [srv, th, settings] = await Promise.all([
        api<SpaService[]>('/services'),
        api<Therapist[]>('/therapists'),
        api<Record<string, string>>('/settings'),
      ]);
      setServices(srv);
      setTherapists(th);
      if (settings) {
        setContactSettings(prev => ({ ...DEFAULT_CONTACT_SETTINGS, ...prev, ...settings }));
        try {
          localStorage.setItem('spa_contact_settings', JSON.stringify(settings));
        } catch {
          // ignore quota/security errors
        }
      }
    } catch {
      // keep current fallback data when the API is unavailable
    } finally {
      isCatalogPollInFlight.current = false;
    }
  }, []);

  // Load auth-protected admin data from the API
  const loadAdminData = useCallback(async () => {
    if (isAdminPollInFlight.current) return;
    isAdminPollInFlight.current = true;
    try {
      const [b, c, n, enq, con] = await Promise.all([
        fetchAllAdminPages('/bookings'),
        fetchAllAdminPages('/customers'),
        fetchAllAdminPages('/notifications'),
        fetchAllAdminPages('/enquiries'),
        fetchAllAdminPages('/contact'),
      ]);
      setBookings(b);
      setCustomers(c);
      setAdminNotifications(n);
      setClientMessages([
        ...enq.map(mapEnquiryToMessage),
        ...con.map(mapContactToMessage),
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAdminAuthed(false);
      }
    } finally {
      isAdminPollInFlight.current = false;
    }
  }, []);

  // Initial load: fetch catalog and restore admin session from the httpOnly cookie
  useEffect(() => {
    loadCatalog();
    api('/auth/me', { authed: true })
      .then(() => {
        setAdminAuthed(true);
        loadAdminData();
      })
      .catch(() => {
        // no active admin session
      });
  }, [loadCatalog, loadAdminData]);

  // Catalog polling keeps services/therapists in sync across devices without
  // hammering the API on every render or every admin update.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadCatalog();
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [loadCatalog]);

  // Admin data polling remains available, but with a slower cadence to avoid
  // constant re-fetch loops when the admin console is open.
  useEffect(() => {
    if (!adminAuthed) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAdminData();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [adminAuthed, loadAdminData]);

  // ---- Auth handlers ----
  const handleAdminLogin = async (pin: string): Promise<string | null> => {
    try {
      await api<{ token: string }>('/auth/login', { method: 'POST', body: { pin } });
      setPinChangeNotice(null);
      setAdminAuthed(true);
      void loadAdminData();
      void loadCatalog();
      return null;
    } catch (err: any) {
      return err?.message || 'Login failed. Please try again.';
    }
  };

  const handleAdminLogout = () => {
    api('/auth/logout', { method: 'POST' }).catch(() => {});
    setAdminAuthed(false);
    setBookings([]);
    setCustomers([]);
    setAdminNotifications([]);
    setClientMessages([]);
    setActiveTab('home');
  };

  const [pinChangeNotice, setPinChangeNotice] = useState<string | null>(null);

  const handleChangeAdminPin = async (currentPin: string, newPin: string): Promise<string | null> => {
    try {
      await api('/admin/change-pin', { method: 'POST', body: { currentPin, newPin }, authed: true });
      setPinChangeNotice('Admin PIN changed successfully. Please sign in with your new PIN.');
      setAdminAuthed(false);
      setBookings([]);
      setCustomers([]);
      setAdminNotifications([]);
      setClientMessages([]);
      return null;
    } catch (err: any) {
      return err?.message || 'Failed to change PIN. Please try again.';
    }
  };

  const handleClearOldData = async (): Promise<string | null> => {
    try {
      await api('/admin/bookings/old', { method: 'DELETE', authed: true });
      await loadAdminData();
      return null;
    } catch (err: any) {
      return err?.message || 'Failed to clear old data. Please try again.';
    }
  };

  // ---- Contact settings (DB-backed; localStorage is only an offline cache) ----
  const [contactSettings, setContactSettings] = useState<ContactSettings>(() => {
    try {
      const saved = localStorage.getItem('spa_contact_settings');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ContactSettings>;
        return { ...DEFAULT_CONTACT_SETTINGS, ...parsed };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONTACT_SETTINGS;
  });

  const handleUpdateContactSettings = async (newSettings: ContactSettings): Promise<string | null> => {
    try {
      const res = await api<{ settings: ContactSettings }>('/admin/settings', {
        method: 'PATCH',
        body: newSettings,
        authed: true,
      });
      const merged = res.settings || { ...DEFAULT_CONTACT_SETTINGS, ...contactSettings, ...newSettings };
      setContactSettings(merged);
      try {
        localStorage.setItem('spa_contact_settings', JSON.stringify(merged));
      } catch {
        // ignore
      }
      return null;
    } catch (err: any) {
      return err?.message || 'Failed to save settings. Please try again.';
    }
  };

  // ---- Notification handlers ----
  const handleAddNotification = async (
    title: string,
    message: string,
    type: AdminNotification['type'] = 'system',
    relatedId?: string
  ) => {
    if (!adminAuthed) return;
    try {
      await api('/notifications', {
        method: 'POST',
        body: { title, message, type, relatedId },
        authed: true,
      });
      await loadAdminData();
    } catch {
      // ignore
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    setAdminNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await api(`/notifications/${id}`, { method: 'PATCH', body: { read: true }, authed: true });
    } catch {
      // ignore
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const unread = adminNotifications.filter(n => !n.read);
    setAdminNotifications(prev => prev.map(n => ({ ...n, read: true })));
    for (const n of unread) {
      try {
        await api(`/notifications/${n.id}`, { method: 'PATCH', body: { read: true }, authed: true });
      } catch {
        // ignore
      }
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setAdminNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await api(`/notifications/${id}`, { method: 'DELETE', authed: true });
    } catch {
      // ignore
    }
  };

  // ---- Service CRUD handlers ----
  const handleAddService = async (newService: SpaService) => {
    try {
      await api('/services', { method: 'POST', body: newService, authed: true });
      await loadCatalog();
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to add service');
    }
  };

  const handleUpdateService = async (updatedService: SpaService) => {
    try {
      await api(`/services/${updatedService.id}`, { method: 'PATCH', body: updatedService, authed: true });
      await loadCatalog();
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to update service');
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await api(`/services/${id}`, { method: 'DELETE', authed: true });
      await loadCatalog();
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to delete service');
    }
  };

  // ---- Therapist handlers ----
  const handleToggleTherapistStatus = async (id: string) => {
    const target = therapists.find(t => t.id === id);
    if (!target) return;
    const next: Therapist['status'] = target.status === 'available' ? 'off_duty' : 'available';
    setTherapists(prev => prev.map(t => t.id === id ? { ...t, status: next } : t));
    try {
      await api(`/therapists/${id}`, {
        method: 'PATCH',
        body: { status: next, availability: next === 'available' },
        authed: true,
      });
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to update therapist status');
      loadCatalog();
    }
  };

  const handleAddTherapist = async (newTherapist: Therapist) => {
    try {
      await api('/therapists', { method: 'POST', body: newTherapist, authed: true });
      await loadCatalog();
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to add therapist');
    }
  };

  const handleUpdateTherapist = async (updatedTherapist: Therapist) => {
    try {
      await api(`/therapists/${updatedTherapist.id}`, { method: 'PATCH', body: updatedTherapist, authed: true });
      await loadCatalog();
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to update therapist');
    }
  };

  const handleDeleteTherapist = async (id: string) => {
    try {
      await api(`/therapists/${id}`, { method: 'DELETE', authed: true });
      await loadCatalog();
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to delete therapist');
    }
  };

  const handleRateTherapist = async (therapistId: string, userRating: number) => {
    const target = therapists.find(t => t.id === therapistId);
    if (!target) return;
    const newCount = target.reviewsCount + 1;
    const newAvg = Number(((target.rating * target.reviewsCount + userRating) / newCount).toFixed(1));
    setTherapists(prev => prev.map(t => t.id === therapistId ? { ...t, rating: newAvg, reviewsCount: newCount } : t));
    try {
      await api(`/therapists/${therapistId}`, { method: 'PATCH', body: { rating: newAvg }, authed: true });
    } catch {
      loadCatalog();
    }
  };

  // ---- Booking handlers ----
  const handleAddBooking = async (newBooking: Booking): Promise<{ booking?: Booking; error?: string }> => {
    try {
      const res = await api<{ success: boolean; booking: Booking }>('/bookings', {
        method: 'POST',
        body: newBooking,
        authed: adminAuthed,
      });
      if (adminAuthed) {
        await loadAdminData();
      } else {
        setBookings(prev => [res.booking || newBooking, ...prev]);
      }
      return { booking: res.booking || newBooking };
    } catch (err: any) {
      return { error: err?.message || 'Booking failed. Please try again.' };
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: Booking['status']) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    try {
      await api(`/bookings/${id}`, { method: 'PATCH', body: { status }, authed: true });
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to update booking status');
    }
  };

  const handleUpdatePaymentStatus = async (id: string, paymentStatus: Booking['paymentStatus']) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, paymentStatus } : b));
    try {
      await api(`/bookings/${id}`, { method: 'PATCH', body: { paymentStatus }, authed: true });
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to update payment status');
    }
  };

  const handleAssignTherapist = async (id: string, therapistId: string, therapistName: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, therapistId, therapistName } : b));
    try {
      await api(`/bookings/${id}`, { method: 'PATCH', body: { therapistId, therapistName }, authed: true });
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to assign therapist');
    }
  };

  // ---- Client message / enquiry handlers ----
  const handleSendClientNotificationMessage = async (
    messageText: string,
    clientName?: string,
    clientPhone?: string,
    serviceNote?: string,
    source: 'Message Tab' | 'Home Page' | 'Chatbot' = 'Chatbot'
  ) => {
    try {
      await api('/enquiries', {
        method: 'POST',
        body: {
          name: clientName || 'Client Visitor',
          mobile: clientPhone || 'N/A',
          message: messageText,
        },
      });
      if (adminAuthed) {
        await loadAdminData();
      } else {
        setClientMessages(prev => [{
          id: `enq-${Date.now()}`,
          clientName: clientName || 'Client Visitor',
          clientPhone: clientPhone || 'Provided in chat note',
          serviceNote: serviceNote || messageText,
          messageText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
          source,
        }, ...prev]);
      }
    } catch {
      // enquiry persistence failure should not block the chat conversation
    }
  };

  const handleMarkMessageAsRead = async (id: string) => {
    const kind = id.startsWith('contact') ? 'contact' : 'enquiries';
    setClientMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    try {
      await api(`/${kind}/${id}`, {
        method: 'PATCH',
        body: { status: kind === 'contact' ? 'Read' : 'Handled' },
        authed: true,
      });
    } catch {
      // ignore
    }
  };

  const handleDeleteClientMessage = async (id: string) => {
    const kind = id.startsWith('contact') ? 'contact' : 'enquiries';
    setClientMessages(prev => prev.filter(m => m.id !== id));
    try {
      await api(`/${kind}/${id}`, { method: 'DELETE', authed: true });
    } catch {
      // ignore
    }
  };

  const changeTab = useCallback((targetTab: MainTab) => {
    setActiveTab(targetTab);
    if (typeof window !== 'undefined') {
      if (targetTab === 'admin') {
        if (window.location.pathname !== '/admin') {
          window.history.pushState(null, '', '/admin');
        }
      } else {
        if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') {
          window.history.pushState(null, '', '/');
        }
      }
    }
  }, []);

  // Navigation handler
  const handleTabChange = (tab: MainTab) => {
    if (tab === 'booking') {
      if (selectedTherapist || selectedService) {
        changeTab('booking');
      } else {
        changeTab('therapists');
        setToastMessage('Please select a therapist to book your massage.');
      }
    } else {
      changeTab(tab);
    }
  };

  const handleSelectService = (service: SpaService) => {
    setSelectedService(service);
    const matchingTherapist = therapists.find(t => t.specialty.toLowerCase().includes(service.name.toLowerCase()));
    if (matchingTherapist) setSelectedTherapist(matchingTherapist);
    setActiveTab('booking');
  };

  const handleSelectTherapist = (therapist: Therapist) => {
    setSelectedTherapist(therapist);
    setActiveTab('booking');
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] selection:bg-[#d5e8cf] relative">
      {/* Sticky Header - hidden on Admin view */}
      {activeTab !== 'admin' && (
        <Header
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          contactSettings={contactSettings}
        />
      )}

        {/* Luxury Glassmorphism Toast Alert Banner */}
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-[#162016]/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35)] border border-[#c5a059] flex items-center justify-between space-x-2.5 animate-fade-in ring-1 ring-[#c5a059]/30">
            <div className="flex items-center justify-center space-x-2.5 text-center flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c5a059]/30 to-[#8c6d2d]/20 text-[#e6c687] border border-[#c5a059]/60 flex items-center justify-center flex-shrink-0 shadow-sm">
                <LotusServiceIcon size={17} strokeWidth={2} className="text-[#e6c687]" />
              </div>
              <p className="text-xs font-semibold text-[#fbf9f4] leading-snug text-center">
                {toastMessage}
              </p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#c5a059] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Views */}
        <main className="min-h-[calc(100vh-120px)]">
          {activeTab === 'home' && (
            <HomeView
              services={services}
              therapists={therapists}
              contactSettings={contactSettings}
              setActiveTab={handleTabChange}
              onSelectService={handleSelectService}
              onSelectTherapist={handleSelectTherapist}
            />
          )}

          {activeTab === 'therapists' && (
            <TherapistsView
              therapists={therapists}
              contactSettings={contactSettings}
              setActiveTab={handleTabChange}
              onSelectTherapist={handleSelectTherapist}
              onRateTherapist={handleRateTherapist}
            />
          )}

          {activeTab === 'booking' && (
            <BookingView
              selectedTherapist={selectedTherapist}
              selectedService={selectedService}
              therapists={therapists}
              services={services}
              onAddBooking={handleAddBooking}
              contactSettings={contactSettings}
              setActiveTab={handleTabChange}
            />
          )}

          {activeTab === 'about' && (
            <AboutView setActiveTab={handleTabChange} />
          )}

          {activeTab === 'message' && (
            <MessageView
              contactSettings={contactSettings}
              onSendClientNotificationMessage={handleSendClientNotificationMessage}
            />
          )}

          {activeTab === 'admin' && (
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-[#fbf9f4] px-4">
                <div className="text-center space-y-2">
                  <LotusServiceIcon size={30} strokeWidth={1.8} className="mx-auto text-[#52634f]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#747871]">Loading console</p>
                </div>
              </div>
            }>
              <AdminView
                bookings={bookings}
                therapists={therapists}
                customers={customers}
                services={services}
                contactSettings={contactSettings}
                clientMessages={clientMessages}
                adminNotifications={adminNotifications}
                isAdminAuthed={adminAuthed}
                onAdminLogin={handleAdminLogin}
                onAdminLogout={handleAdminLogout}
                onChangeAdminPin={handleChangeAdminPin}
                onClearOldData={handleClearOldData}
                pinChangeNotice={pinChangeNotice}
                onUpdateContactSettings={handleUpdateContactSettings}
                onMarkMessageAsRead={handleMarkMessageAsRead}
                onDeleteClientMessage={handleDeleteClientMessage}
                onMarkNotificationAsRead={handleMarkNotificationAsRead}
                onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
                onDeleteNotification={handleDeleteNotification}
                onAddNotification={handleAddNotification}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
                onAssignTherapist={handleAssignTherapist}
                onToggleTherapistStatus={handleToggleTherapistStatus}
                onAddTherapist={handleAddTherapist}
                onUpdateTherapist={handleUpdateTherapist}
                onDeleteTherapist={handleDeleteTherapist}
                onAddService={handleAddService}
                onUpdateService={handleUpdateService}
                onDeleteService={handleDeleteService}
                onAddBooking={handleAddBooking}
                setActiveTab={handleTabChange}
              />
            </Suspense>
          )}
        </main>

        {/* Sticky Bottom Nav Bar - hidden on Admin view */}
        {activeTab !== 'admin' && activeTab !== 'booking' && (
          <BottomNav
            activeTab={activeTab}
            setActiveTab={handleTabChange}
          />
        )}
    </div>
  );
}

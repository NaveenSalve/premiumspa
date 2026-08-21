import React, { useState, useEffect } from 'react';
import { Therapist, SpaService, Booking, MainTab, TherapistCategory, ContactSettings } from '../types';
import { ArrowLeft, Calendar, Clock, Home as HomeIcon, ShieldCheck, Zap, CheckCircle, Info, MapPin, Timer, Lock, UserCheck, Star, Sparkles, Check, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { buildWhatsAppBookingUrl } from '../config';
import { ThumbnailImage, CardImage } from './ResponsiveImage';

interface BookingViewProps {
  selectedTherapist: Therapist | null;
  selectedService: SpaService | null;
  therapists: Therapist[];
  services: SpaService[];
  onAddBooking: (booking: Booking) => Promise<{ booking?: Booking; error?: string }>;
  contactSettings: ContactSettings;
  setActiveTab: (tab: MainTab) => void;
}

const TIME_CATEGORIES = [
  {
    name: 'Morning',
    slots: ['09:00 AM', '10:00 AM', '11:00 AM'],
  },
  {
    name: 'Afternoon',
    slots: ['12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'],
  },
  {
    name: 'Evening',
    slots: ['05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'],
  },
];

const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

// Booking availability and the same-day cut-off are evaluated in the business
// timezone (Asia/Kolkata, matching the backend), never the browser's local zone.
const kolkataParts = (d: Date, opts: Intl.DateTimeFormatOptions): Record<string, string> => {
  const out: Record<string, string> = {};
  new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIME_ZONE, ...opts }).formatToParts(d).forEach((p) => {
    if (p.type !== 'literal') out[p.type] = p.value;
  });
  return out;
};

const kolkataDateLabel = (d: Date): string => {
  const p = kolkataParts(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
};

const kolkataDateKey = (d: Date): string => {
  const p = kolkataParts(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
};

const kolkataNowMinutes = (): number => {
  const p = kolkataParts(new Date(), { hour: '2-digit', minute: '2-digit', hour12: false });
  let h = Number(p.hour || 0);
  if (h === 24) h = 0;
  return h * 60 + Number(p.minute || 0);
};

const slotToMinutes = (t: string): number => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(t);
  if (!m) return -1;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3] === 'PM' && h !== 12) h += 12;
  if (m[3] === 'AM' && h === 12) h = 0;
  return h * 60 + min;
};

// Helper to generate next 7 days starting from today (Asia/Kolkata)
const generateNext7Days = () => {
  const dates: string[] = [];
  const [y, m, d] = kolkataDateKey(new Date()).split('-').map(Number);
  for (let i = 0; i < 7; i++) {
    dates.push(kolkataDateLabel(new Date(Date.UTC(y, m - 1, d + i, 12))));
  }
  return dates;
};

export const BookingView: React.FC<BookingViewProps> = ({
  selectedTherapist,
  selectedService,
  therapists,
  services,
  onAddBooking,
  contactSettings,
  setActiveTab,
}) => {
  const NEXT_7_DAYS = generateNext7Days();

  const visibleServices = services.filter((s) => s.visible !== false);

  // Selected Therapist & Service states
  const [activeTherapist, setActiveTherapist] = useState<Therapist>(
    () => selectedTherapist || therapists[0]
  );
  const [activeService, setActiveService] = useState<SpaService>(
    () => selectedService || services[0]
  );

  // Therapist category filter tab & accordion picker state
  const [selectedTherapistCategory, setSelectedTherapistCategory] = useState<'All' | 'Classic' | 'Deluxe' | 'Luxury'>('All');
  const [showTherapistPicker, setShowTherapistPicker] = useState<boolean>(false);
  const [showServicePicker, setShowServicePicker] = useState<boolean>(false);

  // Synchronize when props change
  useEffect(() => {
    if (selectedTherapist) {
      setActiveTherapist(selectedTherapist);
    }
  }, [selectedTherapist]);

  useEffect(() => {
    if (selectedService) {
      setActiveService(selectedService);
    }
  }, [selectedService]);

  // Date, Time & Duration state
  const [date, setDate] = useState(NEXT_7_DAYS[0]);
  const [time, setTime] = useState('01:00 PM');
  const [duration, setDuration] = useState<'60 Mins' | '90 Mins' | '120 Mins'>('60 Mins');

  // Refresh the same-day slot cut-off while the form stays open (business time).
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const isToday = date === kolkataDateLabel(new Date());
  const nowMinutes = kolkataNowMinutes();
  useEffect(() => {
    if (isToday && slotToMinutes(time) < nowMinutes) {
      const firstValid = TIME_CATEGORIES.flatMap((c) => c.slots).find((s) => slotToMinutes(s) >= nowMinutes);
      if (firstValid) setTime(firstValid);
    }
  }, [isToday, nowMinutes, time, nowTick]);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [serviceLocation, setServiceLocation] = useState<'home' | 'hotel'>('home');
  const [locality, setLocality] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [houseFlatNo, setHouseFlatNo] = useState('');
  const [floor, setFloor] = useState('');
  const [pincode, setPincode] = useState('452001');
  const [notes, setNotes] = useState('');

  // Payment Options
  const paymentOption = 'pay_now';
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');

  // Confirmation state
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lock body scroll when confirmation modal is open
  useEffect(() => {
    if (confirmedBooking) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [confirmedBooking]);

  // Proportional Duration Pricing Logic based on chosen Therapist's 60-min base price
  const basePrice = activeTherapist.price || activeService.price || 999;
  let servicePrice = basePrice;
  if (duration === '90 Mins') {
    servicePrice = Math.round(basePrice * 1.5);
  } else if (duration === '120 Mins') {
    servicePrice = basePrice * 2;
  }

  // Summary Card breakdown calculations
  const visitFee = 200; // Extra Fixed Advance Fee for Therapist Travel / Conveyance (Aane Jaane Ka Charge)
  const totalServicePrice = servicePrice;
  const grandTotal = totalServicePrice + visitFee; // Total booking value including fixed travel fee
  const payAfterService = totalServicePrice; // Remaining Service Fee to pay directly after service

  const durationOptions = [
    { label: '60 Mins', tag: `Standard (₹${basePrice.toLocaleString()})` },
    { label: '90 Mins', tag: `+50% Extra (+₹${Math.round(basePrice * 0.5).toLocaleString()})` },
    { label: '120 Mins', tag: `Double (+₹${basePrice.toLocaleString()})` },
  ];

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Please enter your full name.');
      return;
    }
    const digitsOnly = mobileNumber.replace(/[^0-9]/g, '');
    if (!digitsOnly || digitsOnly.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!locality.trim() || !fullAddress.trim()) {
      setFormError(serviceLocation === 'hotel' ? 'Please fill in the hotel name and area.' : 'Please fill in your locality/area and street address.');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

    const locationLabel = serviceLocation === 'hotel' ? 'Hotel Service' : 'Home Service';
    const roomLabel = serviceLocation === 'hotel' ? 'Room' : 'House/Flat';
    const completeAddress = [
      `[${locationLabel}]`,
      houseFlatNo.trim() ? `${roomLabel}: ${houseFlatNo.trim()}` : '',
      floor.trim() ? `Floor: ${floor.trim()}` : '',
      fullAddress.trim(),
      locality.trim(),
      `Pincode: ${pincode || '452001'}`,
      'Indore, Madhya Pradesh',
    ].filter(Boolean).join(', ');

    const newBooking: Booking = {
      id: bookingId,
      customerName: fullName.trim(),
      customerMobile: mobileNumber.trim(),
      serviceId: activeService.id,
      serviceName: activeService.name,
      therapistId: activeTherapist.id,
      therapistName: activeTherapist.name,
      therapistCategory: activeTherapist.category as TherapistCategory,
      date,
      time,
      duration,
      fullAddress: completeAddress,
      houseFlatNo,
      floor,
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: pincode || '452001',
      notes: serviceLocation === 'hotel' ? `[Hotel Service] ${notes || ''}`.trim() : notes,
      serviceLocation,
      status: 'Pending',
      servicePrice: totalServicePrice,
      visitFee,
      totalPayable: grandTotal,
      paymentOption,
      paymentMethod,
      paymentStatus: 'PENDING_VERIFICATION',
      createdAt: new Date().toISOString(),
    };

    const waWin = window.open('', '_blank');
    try {
      const result = await onAddBooking(newBooking);
      if (result.error) {
        if (waWin) waWin.close();
        setFormError(result.error);
        setSubmitting(false);
        return;
      }
      const confirmed = result.booking || newBooking;
      if (waWin) waWin.location.href = buildWhatsAppBookingUrl(confirmed, contactSettings.whatsappNumber);
      setConfirmedBooking(confirmed);
    } catch (err: any) {
      if (waWin) waWin.close();
      setFormError(err?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-[640px] mx-auto space-y-5 pb-28 animate-fade-in">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveTab('therapists')}
          className="p-2 rounded-full hover:bg-[#efeee8] text-[#444841] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-xl text-[#1b1c19]">Secure Booking</h1>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Intro Header */}
      <div className="space-y-1">
        <h2 className="font-serif text-2xl text-[#1b1c19]">Complete Your Booking</h2>
        <p className="text-xs text-[#747871]">
          Exclusive luxury spa & wellness services delivered across Indore (M.P.).
        </p>
      </div>

      {/* INDORE SERVICE BADGE */}
      <div className="bg-[#52634f]/10 border border-[#52634f]/30 p-3 rounded-2xl flex items-center space-x-2.5 text-xs text-[#3b4b38]">
        <MapPin className="w-4 h-4 text-[#52634f] flex-shrink-0" />
        <div>
          <span className="font-bold block">Service Location: Indore, MP</span>
          <span className="text-[11px] text-[#747871]">Doorstep service available in all Indore areas</span>
        </div>
      </div>

      {/* STEP 1: SELECT SERVICE & THERAPIST */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e9e8e3] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#efeee8] pb-3">
          <div className="flex items-center space-x-2 text-[#3b4b38]">
            <UserCheck className="w-5 h-5 text-[#52634f]" />
            <h3 className="font-serif text-lg text-[#1b1c19]">1. Select Treatment & Therapist</h3>
          </div>
          <span className="bg-[#d5e8cf] text-[#3b4b38] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Step 1 of 3
          </span>
        </div>

        {/* 1A. Therapy Treatment Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#1b1c19] flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-[#52634f]" />
              <span>Choose Therapy Treatment:</span>
            </label>
            <button
              type="button"
              onClick={() => setShowServicePicker(prev => !prev)}
              className="text-xs font-bold text-[#52634f] hover:text-[#3b4b38] flex items-center space-x-1 cursor-pointer bg-[#f0f4ee] hover:bg-[#d5e8cf] px-2.5 py-1 rounded-lg transition-colors border border-[#d5e8cf]"
            >
              <span>{showServicePicker ? 'Close Tab' : 'Select Therapy'}</span>
              {showServicePicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Current Selected Therapy Summary Card */}
          <div
            onClick={() => setShowServicePicker(prev => !prev)}
            className="p-3 rounded-2xl border border-[#52634f]/30 bg-[#f0f4ee]/80 flex items-center justify-between cursor-pointer hover:border-[#52634f] transition-all shadow-2xs"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-[#c4c8bf] flex-shrink-0">
                <img src={activeService.imageUrl} alt={activeService.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-xs sm:text-sm text-[#1b1c19]">{activeService.name}</h4>
                  <span className="bg-[#52634f] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {activeService.duration}
                  </span>
                </div>
                <p className="text-[11px] text-[#454843] line-clamp-1 mt-0.5">
                  {activeService.description}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold text-[#52634f] underline flex items-center space-x-1 flex-shrink-0 ml-2">
              <span>{showServicePicker ? 'Hide Options' : 'Change'}</span>
            </span>
          </div>

          {/* Expandable Therapy Picker Panel */}
          {showServicePicker && (
            <div className="pt-2 space-y-2.5 bg-[#fbf9f4] p-3 rounded-2xl border border-[#e4e2dd] animate-fade-in">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#747871]">
                <span>SELECT THERAPY TREATMENT:</span>
                <span className="text-[#52634f] font-semibold">{visibleServices.length} Treatments Available</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-0.5">
                {visibleServices.map(s => {
                  const isSelected = activeService.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setActiveService(s);
                        setShowServicePicker(false);
                      }}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                        isSelected
                          ? 'border-[#52634f] bg-[#f0f4ee] shadow-xs ring-1 ring-[#52634f]'
                          : 'border-[#e9e8e3] bg-white hover:border-[#52634f]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#efeee8] border border-[#e9e8e3] flex-shrink-0">
                        <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-[#1b1c19] truncate">{s.name}</h4>
                          <span className="text-[10px] font-extrabold text-[#52634f] bg-[#d5e8cf] px-1.5 py-0.5 rounded-md">
                            {s.duration}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#747871] line-clamp-1 mt-0.5">{s.description}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <button
                            type="button"
                            className={`py-0.5 px-2 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                              isSelected ? 'bg-[#52634f] text-white' : 'bg-[#efeee8] text-[#3b4b38] hover:bg-[#d5e8cf]'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 1B. Therapist Selector with Classic, Deluxe & Luxury Category Tabs */}
        <div className="space-y-3 pt-3 border-t border-[#efeee8]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#1b1c19] flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-[#52634f]" />
              <span>Choose Your Therapist:</span>
            </label>
            <button
              type="button"
              onClick={() => setShowTherapistPicker(prev => !prev)}
              className="text-xs font-bold text-[#52634f] hover:text-[#3b4b38] flex items-center space-x-1 cursor-pointer bg-[#f0f4ee] hover:bg-[#d5e8cf] px-2.5 py-1 rounded-lg transition-colors border border-[#d5e8cf]"
            >
              <span>{showTherapistPicker ? 'Close Tab' : 'Select Therapist'}</span>
              {showTherapistPicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Current Selected Therapist Summary Card */}
          <div
            onClick={() => setShowTherapistPicker(prev => !prev)}
            className="p-3 rounded-2xl border border-[#52634f]/30 bg-[#f0f4ee]/80 flex items-center justify-between cursor-pointer hover:border-[#52634f] transition-all shadow-2xs"
          >
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-white border border-[#c4c8bf] flex-shrink-0">
                <ThumbnailImage
                  src={activeTherapist.avatarUrl}
                  alt={activeTherapist.name}
                  size={44}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-xs text-[#1b1c19]">{activeTherapist.name}</h4>
                  <span className="bg-[#52634f] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {activeTherapist.category}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-[#454843] mt-0.5">
                  <span className="flex items-center space-x-0.5 text-[#D4AF37] font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{activeTherapist.rating}</span>
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-[#1b1c19]">₹{activeTherapist.price.toLocaleString()}</span>
                  <span>•</span>
                  <span>{activeTherapist.experienceYears}+ yrs exp</span>
                </div>
              </div>
            </div>

            <span className="text-[11px] font-bold text-[#52634f] underline flex items-center space-x-1">
              <span>{showTherapistPicker ? 'Hide Options' : 'Change'}</span>
            </span>
          </div>

          {/* Expandable Therapist Picker Panel with Category Tabs */}
          {showTherapistPicker && (
            <div className="pt-2 space-y-3 bg-[#fbf9f4] p-3 rounded-2xl border border-[#e4e2dd] animate-fade-in">
              {/* Category Filter Tabs: All, Classic, Deluxe, Luxury */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#747871]">
                  <span>CATEGORY TABS:</span>
                  <span className="text-[#52634f] font-semibold">{selectedTherapistCategory} Tier</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['All', 'Classic', 'Deluxe', 'Luxury'] as const).map(cat => {
                    const isCatSelected = selectedTherapistCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedTherapistCategory(cat)}
                        className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center transition-all cursor-pointer ${
                          isCatSelected
                            ? 'bg-[#52634f] text-white shadow-xs'
                            : 'bg-white text-[#3b4b38] border border-[#c4c8bf] hover:bg-[#d5e8cf]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Therapist Cards List Filtered by Category */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 max-h-[320px] overflow-y-auto pr-0.5">
                {therapists
                  .filter(t => selectedTherapistCategory === 'All' || t.category.toLowerCase() === selectedTherapistCategory.toLowerCase())
                  .map(t => {
                    const isSelected = activeTherapist.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setActiveTherapist(t);
                          setShowTherapistPicker(false);
                        }}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col items-center text-center space-y-1.5 ${
                          isSelected
                            ? 'border-[#52634f] bg-[#f0f4ee] shadow-xs ring-1 ring-[#52634f]'
                            : 'border-[#e9e8e3] bg-white hover:border-[#52634f]'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#52634f] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#efeee8] border border-[#e9e8e3] flex-shrink-0">
                          <CardImage
                            src={t.avatarUrl}
                            alt={t.name}
                            className="w-full h-full object-cover"
                            aspectRatio="square"
                          />
                        </div>
                        <div className="w-full">
                          <h4 className="font-semibold text-xs text-[#1b1c19] truncate">{t.name}</h4>
                          <span className="text-[9px] font-extrabold text-[#3b4b38] uppercase block mt-0.5 bg-[#d5e8cf] rounded-md py-0.5 px-1">
                            {t.category}
                          </span>
                          <div className="flex items-center justify-center space-x-1 text-[10px] font-bold text-[#D4AF37] mt-1">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>{t.rating}</span>
                            <span className="text-[#1b1c19] font-semibold text-[10px] ml-1">₹{t.price.toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`w-full py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#52634f] text-white' : 'bg-[#efeee8] text-[#3b4b38] hover:bg-[#d5e8cf]'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date, Time & Duration Selection Box */}
      <div className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-xs space-y-4">
        {/* 1. DATE SELECTION */}
        <div>
          <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-[#52634f]" />
            <span>Select Date (Next 7 Days)</span>
          </label>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
            {NEXT_7_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  date === d
                    ? 'bg-[#52634f] text-white shadow-xs border border-[#3b4b38]'
                    : 'bg-[#f0f4ee] border border-[#d5e8cf] text-[#3b4b38] hover:bg-[#d5e8cf]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 2. TIME SLOTS */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-[#52634f]" />
            <span>Select Preferred Time Slot</span>
          </label>

          {TIME_CATEGORIES.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#747871] uppercase tracking-wider block">
                {cat.name} Slots
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {cat.slots.map((t) => {
                  const isPastToday = isToday && slotToMinutes(t) !== -1 && slotToMinutes(t) < nowMinutes;
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={isPastToday}
                      onClick={() => setTime(t)}
                      className={`py-1.5 px-2 rounded-full text-[11px] font-semibold text-center transition-all ${
                        isPastToday
                          ? 'cursor-not-allowed bg-[#f0f4ee] border border-[#e4e2dd] text-[#b9bdb4]'
                          : time === t
                            ? 'bg-[#52634f] text-white shadow-xs border border-[#3b4b38] cursor-pointer'
                            : 'bg-[#f0f4ee] border border-[#d5e8cf] text-[#3b4b38] hover:bg-[#d5e8cf] cursor-pointer'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 3. DURATION SELECTION WITH AUTOMATIC DYNAMIC ADJUSTMENT */}
        <div>
          <label className="text-xs font-semibold text-[#1b1c19] flex items-center space-x-1.5 mb-2">
            <Timer className="w-3.5 h-3.5 text-[#52634f]" />
            <span>Select Duration (Auto-adjusts Price)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {durationOptions.map((dur) => (
              <button
                key={dur.label}
                type="button"
                onClick={() => setDuration(dur.label as '60 Mins' | '90 Mins' | '120 Mins')}
                className={`py-1.5 px-2 h-[42px] rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  duration === dur.label
                    ? 'bg-[#52634f] text-white shadow-xs border border-[#3b4b38]'
                    : 'bg-[#f0f4ee] border border-[#d5e8cf] text-[#3b4b38] hover:bg-[#d5e8cf]'
                }`}
              >
                <span className="text-xs font-bold leading-tight">{dur.label}</span>
                <span className={`text-[9px] font-semibold ${
                  duration === dur.label ? 'text-[#e6c687]' : 'text-[#52634f]'
                }`}>
                  {dur.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Booking Form */}
      <form onSubmit={handleSubmitBooking} className="space-y-5">
        {/* Customer & Location Details */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-[#3b4b38]">
            <HomeIcon className="w-4 h-4" />
            <h3 className="font-semibold text-sm">Customer & Location Details</h3>
          </div>

          <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-[#e9e8e3] shadow-xs">
            {/* Service Location Toggle: Home / Hotel */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setServiceLocation('home')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  serviceLocation === 'home'
                    ? 'border-[#52634f] bg-[#f0f4ee] text-[#3b4b38] ring-1 ring-[#52634f]'
                    : 'border-[#e9e8e3] bg-white text-[#747871] hover:border-[#52634f]'
                }`}
              >
                <HomeIcon className="w-4 h-4" />
                <span>Home Service</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceLocation('hotel')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  serviceLocation === 'hotel'
                    ? 'border-[#52634f] bg-[#f0f4ee] text-[#3b4b38] ring-1 ring-[#52634f]'
                    : 'border-[#e9e8e3] bg-white text-[#747871] hover:border-[#52634f]'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Hotel Service</span>
              </button>
            </div>

            {/* Row 1: Full Name | Mobile Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#444841] block mb-0.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-[42px] px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#444841] block mb-0.5">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="6260104019"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full h-[42px] px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>
            </div>

            {/* Row 2: Locality / Area | Street Address / Landmark */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#444841] block mb-0.5">
                  {serviceLocation === 'hotel' ? 'Hotel Name' : 'Locality / Area'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={serviceLocation === 'hotel' ? 'e.g. Taj Hotel, Sayaji' : 'e.g. Vijay Nagar, Saket'}
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full h-[42px] px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs bg-white text-[#1b1c19] focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#444841] block mb-0.5">
                  {serviceLocation === 'hotel' ? 'Hotel Area / Landmark' : 'Street Address / Landmark'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={serviceLocation === 'hotel' ? 'e.g. AB Road, Near C21 Mall' : 'e.g. Near C21 Mall, Plot 42'}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full h-[42px] px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>
            </div>

            {/* Row 3: House/Flat No | Floor */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#444841] block mb-0.5">
                  {serviceLocation === 'hotel' ? 'Room No' : 'House/Flat No'}
                </label>
                <input
                  type="text"
                  placeholder={serviceLocation === 'hotel' ? 'e.g. Room 1205' : 'e.g. Flat 302'}
                  value={houseFlatNo}
                  onChange={(e) => setHouseFlatNo(e.target.value)}
                  className="w-full h-[42px] px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#444841] block mb-0.5">Floor</label>
                <input
                  type="text"
                  placeholder="e.g. 3rd Floor"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full h-[42px] px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>
            </div>

            {/* Row 4: City/Pincode | Additional Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-0.5">
              <div className="flex flex-col justify-center space-y-1 bg-[#fbf9f4] px-3 py-2 rounded-xl border border-[#e4e2dd] h-[42px]">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="bg-[#f0f4ee] border border-[#d5e8cf] text-[#3b4b38] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <MapPin className="w-2.5 h-2.5 text-[#52634f]" />
                      <span>Indore, MP</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <label className="text-[10px] font-semibold text-[#747871]">Pincode:</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-16 px-1.5 py-0.5 bg-white rounded-md border border-[#c4c8bf] text-[11px] font-bold text-[#1b1c19] text-center focus:outline-none focus:ring-1 focus:ring-[#52634f]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Additional Notes (Optional...)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-[42px] px-3 py-2 rounded-xl border border-[#c4c8bf] text-xs focus:outline-none focus:ring-2 focus:ring-[#52634f]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY CARD BREAKDOWN */}
        <div className="bg-white rounded-2xl p-4.5 border border-[#e9e8e3] shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-[#efeee8] pb-2.5">
            <h3 className="font-semibold text-base text-[#1b1c19]">Summary Breakdown</h3>
            <span className="bg-[#f0f4ee] text-[#3b4b38] border border-[#d5e8cf] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {duration} Session
            </span>
          </div>

          {/* Highlighted Advance Banner */}
          <div className="bg-[#f0f4ee] border border-[#d5e8cf] p-3 rounded-xl flex items-center justify-between text-xs shadow-2xs">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-[#22c55e] fill-[#22c55e]" />
              <span className="font-bold text-[#3b4b38]">₹200 Travel Advance (Pay via WhatsApp/UPI)</span>
            </div>
            <span className="text-[11px] font-semibold text-[#52634f]">
              Rest ₹{payAfterService.toLocaleString()} After Service
            </span>
          </div>

          {/* Price Breakdown Calculation */}
          <div className="space-y-2 text-xs pt-1">
            <div className="flex justify-between text-[#444841]">
              <span>Therapy Treatment Price ({duration})</span>
              <span className="font-semibold text-[#1b1c19]">₹{totalServicePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[#444841]">
              <span className="flex items-center space-x-1">
                <span>Therapist Travel / Visiting Fee</span>
                <span className="text-[10px] text-[#52634f] font-bold">(Fixed Extra)</span>
              </span>
              <span className="font-bold text-[#22c55e]">+ ₹200</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-[#747871] pt-1">
              <span>Total Booking Amount</span>
              <span className="font-bold text-[#1b1c19]">₹{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Breakdown Cards */}
          <div className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#e4e2dd] space-y-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#1b1c19]">
              <Info className="w-4 h-4 text-[#52634f]" />
              <span>Payment Structure & Travel Advance</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-[#e9e8e3] shadow-2xs">
                <span className="font-bold text-[#3b4b38] block text-[11px]">Travel Advance (Due)</span>
                <span className="text-xs text-[#22c55e] font-extrabold block mt-0.5">₹200 (Fixed Extra)</span>
                <span className="text-[10px] text-[#747871] block">Therapist travel & conveyance</span>
              </div>
            </div>
          </div>

          {/* Payment Method Radio */}
          <div className="bg-[#fbf9f4] p-3 rounded-xl border border-[#e4e2dd] flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 cursor-pointer font-semibold text-[#1b1c19]">
              <input
                type="radio"
                name="payMethod"
                checked={paymentMethod === 'online'}
                onChange={() => setPaymentMethod('online')}
                className="accent-[#52634f]"
              />
              <span>Pay Online</span>
            </label>
            <span className="text-[10px] text-[#747871] font-medium">UPI / GPay / PhonePe / Cards</span>
          </div>

          {/* Form Validation Error Alert */}
          {formError && (
            <div className="bg-[#ffdad6] border border-[#ba1a1a]/40 text-[#ba1a1a] p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Prominent Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-[#52634f] via-[#3b4b38] to-[#2b3a28] hover:from-[#3b4b38] hover:to-[#1e281b] active:scale-[0.99] text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#c5a059]/40 disabled:opacity-60 disabled:cursor-wait"
          >
            <Lock className="w-4 h-4 text-[#c5a059]" />
            <span>{submitting ? 'SUBMITTING APPOINTMENT...' : 'PAY ₹200 ADVANCE & BOOK APPOINTMENT'}</span>
          </button>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center space-x-4 text-[10px] text-[#52634f] font-semibold pt-1">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3b4b38]" />
              <span>100% Verified Therapists</span>
            </span>
            <span className="flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5 text-[#eab308] fill-[#eab308]" />
              <span>Instant Confirmation</span>
            </span>
          </div>
        </div>

        {/* Booking Policy */}
        <div className="bg-[#efeee8] p-4 rounded-2xl border border-[#e4e2dd] text-xs text-[#444841] space-y-1">
          <div className="flex items-center space-x-1.5 font-bold text-[#1b1c19]">
            <Info className="w-4 h-4 text-[#52634f]" />
            <span>Indore Booking Policy</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#747871]">
            Free cancellation up to 24 hours before the scheduled time in Indore. The ₹200 advance secures therapist availability at your doorstep.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('message')}
            className="text-[11px] font-semibold text-[#52634f] hover:underline pt-1 inline-block cursor-pointer"
          >
            Need Help? Contact Support
          </button>
        </div>
      </form>

      {/* CONFIRMATION MODAL */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto space-y-5 text-center shadow-xl border border-[#e9e8e3] animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-[#d5e8cf] text-[#3b4b38] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#b45309]">
                BOOKING REQUESTED
              </span>
              <h3 className="font-serif text-2xl text-[#1b1c19]">Appointment Request Received</h3>
              <p className="text-xs text-[#747871]">
                Booking Reference: <span className="font-bold text-[#1b1c19]">{confirmedBooking.id}</span>
              </p>
            </div>

            <div className="bg-[#fbf9f4] p-3.5 rounded-2xl border border-[#e4e2dd] text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#747871]">Therapist:</span>
                <span className="font-semibold text-[#1b1c19]">{confirmedBooking.therapistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747871]">Treatment:</span>
                <span className="font-semibold text-[#1b1c19]">{confirmedBooking.serviceName} ({confirmedBooking.duration})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747871]">Date & Time:</span>
                <span className="font-semibold text-[#1b1c19]">{confirmedBooking.date}, {confirmedBooking.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747871]">Treatment Rate:</span>
                <span className="font-semibold text-[#1b1c19]">₹{confirmedBooking.servicePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#747871]">Therapist Travel Fee:</span>
                <span className="font-bold text-[#22c55e]">+ ₹200 (Fixed Extra)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747871]">Total Booking Amount:</span>
                <span className="font-bold text-[#1b1c19]">₹{confirmedBooking.totalPayable.toLocaleString()}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[#747871] pt-1">
                Your booking request is recorded. We will confirm availability and share advance payment instructions on WhatsApp/phone shortly.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={buildWhatsAppBookingUrl(confirmedBooking, contactSettings.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#1fb958] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer flex items-center justify-center space-x-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send Booking on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setConfirmedBooking(null);
                  setActiveTab('home');
                }}
                className="w-full py-2.5 bg-[#efeee8] hover:bg-[#e4e2dd] text-[#444841] rounded-full text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

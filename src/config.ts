export const buildWhatsAppBookingUrl = (booking: {
  id: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  serviceName: string;
  duration: string;
  therapistName: string;
  date: string;
  time: string;
  fullAddress?: string;
  houseFlatNo?: string;
  floor?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  servicePrice?: number;
  visitFee?: number;
  totalPayable: number;
  paymentMethod?: 'online' | 'cash' | 'card';
  paymentStatus?: string;
  serviceLocation?: 'home' | 'hotel';
}, whatsappNumber: string) => {
  const targetNumber = whatsappNumber.replace(/[^0-9]/g, '') || '6260104019';
  const message = [
    '*New Spa Booking Request*',
    '',
    `*Booking ID:* ${booking.id}`,
    `*Name:* ${booking.customerName}`,
    `*Mobile:* ${booking.customerMobile}`,
    booking.customerEmail ? `*Email:* ${booking.customerEmail}` : '',
    `*Service:* ${booking.serviceName} (${booking.duration})`,
    `*Service Type:* ${booking.serviceLocation === 'hotel' ? 'Hotel Service' : 'Home Service'}`,
    `*Therapist:* ${booking.therapistName}`,
    `*Date & Time:* ${booking.date}, ${booking.time}`,
    '',
    '*Customer Location*',
    booking.fullAddress ? `*Address:* ${booking.fullAddress}` : '',
    booking.houseFlatNo ? `*House/Flat/Room:* ${booking.houseFlatNo}` : '',
    booking.floor ? `*Floor:* ${booking.floor}` : '',
    booking.city ? `*Locality/City:* ${booking.city}` : '',
    booking.state ? `*State:* ${booking.state}` : '',
    booking.pincode ? `*Pincode:* ${booking.pincode}` : '',
    booking.notes ? `*Notes:* ${booking.notes}` : '',
    '',
    '*Payment Details*',
    typeof booking.servicePrice === 'number' ? `*Therapy Price:* Rs. ${booking.servicePrice.toLocaleString()}` : '',
    typeof booking.visitFee === 'number' ? `*Travel Advance:* Rs. ${booking.visitFee.toLocaleString()}` : '',
    `*Total Amount:* Rs. ${booking.totalPayable.toLocaleString()}`,
    booking.paymentMethod ? `*Payment Method:* ${booking.paymentMethod}` : '',
    booking.paymentStatus ? `*Payment Status:* ${booking.paymentStatus}` : '',
  ].filter(Boolean).join('\n');
  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;
};

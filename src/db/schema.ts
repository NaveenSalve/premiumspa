import { pgTable, text, integer, boolean, timestamp, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Site settings — small key/value store for admin-editable public display
// settings (WhatsApp/call numbers, social links, brand name/logo, hero images).
// Keys are validated against a server-side allowlist, so no secret/private
// configuration can ever be created or exposed through this table.
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminUsers = pgTable('admin_users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('admin').notNull(),
  // F-03: bumped on logout so previously-issued JWTs are revoked server-side.
  // Embedded in the JWT as `sessionVersion` and checked on every verify.
  sessionVersion: integer('session_version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  totalOrders: integer('total_orders').default(1).notNull(),
  upcomingVisit: text('upcoming_visit'),
  status: text('status').default('New').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // S5: phone is the customer identity key — the booking flow upserts the
  // customers table by phone (see server.ts create booking), so duplicate
  // phone rows would split one person's order history across records.
  // Data audit showed 0 duplicates; the unique index enforces it going forward.
  uniqueIndex('uniq_customers_phone').on(table.phone),
  index('idx_customers_created_at').on(table.createdAt),
  check('chk_customers_total_orders_positive', sql`${table.totalOrders} >= 1`),
]);

export const services = pgTable('services', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(),
  duration: text('duration').notNull(),
  category: text('category').notNull(),
  image: text('image').notNull(),
  visible: boolean('visible').default(true).notNull(),
  popular: boolean('popular').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  check('chk_services_price_nonneg', sql`${table.price} >= 0`),
]);

export const therapists = pgTable('therapists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tier: text('tier').notNull(), // Classic, Deluxe, Luxury
  category: text('category').notNull(),
  rating: text('rating').notNull(),
  experience: text('experience').notNull(),
  specialties: text('specialties').notNull(), // string array or string
  bio: text('bio').notNull(),
  image: text('image').notNull(),
  availability: boolean('availability').default(true).notNull(),
  status: text('status').default('Active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  customerName: text('customer_name').notNull(),
  customerMobile: text('customer_mobile').notNull(),
  customerEmail: text('customer_email'),
  // F-12: real foreign keys. service_id is mandatory and RESTRICTED (a service
  // with booking history cannot be deleted). therapist_id is optional and set to
  // NULL on therapist deletion so booking history survives (name is denormalized).
  serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  serviceName: text('service_name').notNull(),
  therapistId: text('therapist_id').references(() => therapists.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  therapistName: text('therapist_name'),
  therapistTier: text('therapist_tier'),
  date: text('date').notNull(),
  time: text('time').notNull(),
  duration: text('duration').notNull(),
  address: text('address').notNull(),
  locality: text('locality').notNull(),
  landmark: text('landmark'),
  houseDetails: text('house_details'),
  notes: text('notes'),
  serviceAmount: integer('service_amount').notNull(),
  travelAdvance: integer('travel_advance').default(200).notNull(),
  totalAmount: integer('total_amount').notNull(),
  paymentStatus: text('payment_status').default('PENDING_VERIFICATION').notNull(),
  paymentProofUtr: text('payment_proof_utr'),
  status: text('status').default('Pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Hard double-booking guard: only ONE non-cancelled booking may exist per
  // therapist/date/time. Under concurrent requests this forces the loser to
  // a unique violation which the booking handler turns into 409/Conflict.
  uniqueIndex('uniq_bookings_active_therapist_slot')
    .on(table.therapistId, table.date, table.time)
    .where(sql`${table.status} <> 'Cancelled'`),
  index('idx_bookings_customer_mobile').on(table.customerMobile),
  index('idx_bookings_status').on(table.status),
  index('idx_bookings_payment_status').on(table.paymentStatus),
  index('idx_bookings_created_at').on(table.createdAt),
  check('chk_bookings_service_amount_nonneg', sql`${table.serviceAmount} >= 0`),
  check('chk_bookings_travel_advance_nonneg', sql`${table.travelAdvance} >= 0`),
  check('chk_bookings_total_amount_nonneg', sql`${table.totalAmount} >= 0`),
  check('chk_bookings_status_valid', sql`${table.status} IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')`),
  check('chk_bookings_payment_status_valid', sql`${table.paymentStatus} IN ('PENDING_VERIFICATION', 'PAID', 'REFUND_REQUESTED', 'REFUNDED', 'FAILED')`),
]);

export const enquiries = pgTable('enquiries', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mobile: text('mobile').notNull(),
  message: text('message').notNull(),
  status: text('status').default('New').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_enquiries_status').on(table.status),
  index('idx_enquiries_created_at').on(table.createdAt),
]);

export const contactMessages = pgTable('contact_messages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  message: text('message').notNull(),
  status: text('status').default('Unread').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_contact_status').on(table.status),
  index('idx_contact_created_at').on(table.createdAt),
]);

export const adminNotifications = pgTable('admin_notifications', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  time: text('time').notNull(),
  read: boolean('read').default(false).notNull(),
  relatedId: text('related_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_notifications_read').on(table.read),
  index('idx_notifications_created_at').on(table.createdAt),
]);

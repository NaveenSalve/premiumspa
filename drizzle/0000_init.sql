CREATE TABLE "admin_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"time" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"related_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"customer_mobile" text NOT NULL,
	"customer_email" text,
	"service_id" text NOT NULL,
	"service_name" text NOT NULL,
	"therapist_id" text,
	"therapist_name" text,
	"therapist_tier" text,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"duration" text NOT NULL,
	"address" text NOT NULL,
	"locality" text NOT NULL,
	"landmark" text,
	"house_details" text,
	"notes" text,
	"service_amount" integer NOT NULL,
	"travel_advance" integer DEFAULT 200 NOT NULL,
	"total_amount" integer NOT NULL,
	"payment_status" text DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	"payment_proof_utr" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'Unread' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"total_orders" integer DEFAULT 1 NOT NULL,
	"upcoming_visit" text,
	"status" text DEFAULT 'New' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mobile" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'New' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"duration" text NOT NULL,
	"category" text NOT NULL,
	"image" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "therapists" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"category" text NOT NULL,
	"rating" text NOT NULL,
	"experience" text NOT NULL,
	"specialties" text NOT NULL,
	"bio" text NOT NULL,
	"image" text NOT NULL,
	"availability" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

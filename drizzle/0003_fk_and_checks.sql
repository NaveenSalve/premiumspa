-- F-12 / DB review: add real foreign keys + CHECK constraints to bookings.
--
-- Pre-steps (data integrity, no history is ever deleted):
--   1) Therapist refs: therapist_id is nullable, so orphan rows are safely
--      reset to NULL (booking history + denormalized name are preserved) and
--      the new FK (ON DELETE SET NULL) is satisfiable.
--   2) Service refs: service_id is NOT NULL, so orphans cannot be cleared
--      without losing history. Fail the migration with a clear, actionable
--      message instead of a cryptic FK error so an operator can resolve them.
UPDATE "bookings" SET "therapist_id" = NULL
  WHERE "therapist_id" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "therapists" t WHERE t.id = "bookings"."therapist_id");
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "bookings" b
    LEFT JOIN "services" s ON s.id = b."service_id"
    WHERE s.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot add FK: bookings reference services that no longer exist (orphan service_id rows). '
      'Restore the deleted services or re-point those bookings, then re-run migrations.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_therapist_id_therapists_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "chk_bookings_service_amount_nonneg" CHECK ("bookings"."service_amount" >= 0);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "chk_bookings_travel_advance_nonneg" CHECK ("bookings"."travel_advance" >= 0);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "chk_bookings_total_amount_nonneg" CHECK ("bookings"."total_amount" >= 0);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "chk_bookings_status_valid" CHECK ("bookings"."status" IN ('Pending', 'Confirmed', 'Completed', 'Cancelled'));--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "chk_bookings_payment_status_valid" CHECK ("bookings"."payment_status" IN ('PENDING_VERIFICATION', 'PAID', 'REFUND_REQUESTED', 'REFUNDED', 'FAILED'));--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "chk_customers_total_orders_positive" CHECK ("customers"."total_orders" >= 1);--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "chk_services_price_nonneg" CHECK ("services"."price" >= 0);
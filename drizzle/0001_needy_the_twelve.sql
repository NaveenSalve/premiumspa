CREATE INDEX "idx_notifications_read" ON "admin_notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "admin_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_bookings_active_therapist_slot" ON "bookings" USING btree ("therapist_id","date","time") WHERE "bookings"."status" <> 'Cancelled';--> statement-breakpoint
CREATE INDEX "idx_bookings_customer_mobile" ON "bookings" USING btree ("customer_mobile");--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bookings_payment_status" ON "bookings" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "idx_bookings_created_at" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_contact_status" ON "contact_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contact_created_at" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_customers_phone" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_customers_created_at" ON "customers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_enquiries_status" ON "enquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_enquiries_created_at" ON "enquiries" USING btree ("created_at");
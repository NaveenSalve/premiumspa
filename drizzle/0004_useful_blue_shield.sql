DROP INDEX "idx_customers_phone";--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_customers_phone" ON "customers" USING btree ("phone");
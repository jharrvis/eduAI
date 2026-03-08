ALTER TABLE "class_meetings" ADD COLUMN "end_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_meetings" ADD COLUMN "duration_minutes" integer DEFAULT 90;--> statement-breakpoint
UPDATE "class_meetings"
SET "duration_minutes" = COALESCE("duration_minutes", 90);--> statement-breakpoint
UPDATE "class_meetings"
SET "end_date" = COALESCE(
  "end_date",
  "scheduled_date" + (COALESCE("duration_minutes", 90) || ' minutes')::interval
);--> statement-breakpoint
ALTER TABLE "class_meetings" ALTER COLUMN "duration_minutes" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "class_meetings" ALTER COLUMN "end_date" SET NOT NULL;

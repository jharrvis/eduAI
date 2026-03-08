CREATE TABLE "class_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"meeting_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "material_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "meeting_id" uuid;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "start_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "end_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "meeting_id" uuid;--> statement-breakpoint
ALTER TABLE "class_meetings" ADD CONSTRAINT "class_meetings_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_meeting_id_class_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."class_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_meeting_id_class_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."class_meetings"("id") ON DELETE set null ON UPDATE no action;
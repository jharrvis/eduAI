CREATE TABLE "majors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "majors_code_unique" UNIQUE("code"),
	CONSTRAINT "majors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "major_id" uuid;--> statement-breakpoint
WITH distinct_majors AS (
  SELECT DISTINCT BTRIM("major") AS major_name
  FROM "student_profiles"
  WHERE "major" IS NOT NULL AND BTRIM("major") <> ''
),
ordered_majors AS (
  SELECT major_name, ROW_NUMBER() OVER (ORDER BY major_name) AS rn
  FROM distinct_majors
)
INSERT INTO "majors" ("code", "name")
SELECT 'MJR-' || LPAD(rn::text, 3, '0'), major_name
FROM ordered_majors
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "student_profiles" AS sp
SET "major_id" = m."id"
FROM "majors" AS m
WHERE sp."major_id" IS NULL
  AND sp."major" IS NOT NULL
  AND BTRIM(sp."major") <> ''
  AND m."name" = BTRIM(sp."major");--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_major_id_majors_id_fk" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("id") ON DELETE set null ON UPDATE no action;

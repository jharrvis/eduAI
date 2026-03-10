CREATE INDEX "assignments_material_id_idx" ON "assignments" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "assignments_meeting_id_idx" ON "assignments" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "class_meetings_class_id_idx" ON "class_meetings" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_meetings_scheduled_date_idx" ON "class_meetings" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "enrollments_user_id_idx" ON "enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "enrollments_class_id_idx" ON "enrollments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "enrollments_user_role_idx" ON "enrollments" USING btree ("user_id","role_in_class");--> statement-breakpoint
CREATE INDEX "enrollments_user_class_role_idx" ON "enrollments" USING btree ("user_id","class_id","role_in_class");--> statement-breakpoint
CREATE INDEX "materials_class_id_idx" ON "materials" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "materials_meeting_id_idx" ON "materials" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "materials_class_scheduled_idx" ON "materials" USING btree ("class_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "submissions_assignment_id_idx" ON "submissions" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "submissions_student_id_idx" ON "submissions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "submissions_assignment_student_idx" ON "submissions" USING btree ("assignment_id","student_id");
import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/lib/auth-schema";

export const roleInClassEnum = pgEnum("role_in_class", ["TEACHER", "STUDENT"]);
export const submissionStatusEnum = pgEnum("submission_status", [
  "PENDING",
  "GRADED",
  "REVISION",
]);

export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  academicYear: text("academic_year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const enrollments = pgTable("enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  roleInClass: roleInClassEnum("role_in_class").notNull(),
});

export const studentProfiles = pgTable("student_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  nim: text("nim").notNull().unique(),
  major: text("major"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const materials = pgTable("materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  instructions: text("instructions"),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  aiPromptContext: text("ai_prompt_context"),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  assignmentId: uuid("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  answerText: text("answer_text"),
  fileUrl: text("file_url"),
  aiFeedback: text("ai_feedback"),
  aiScore: integer("ai_score"),
  finalGrade: integer("final_grade"),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
  status: submissionStatusEnum("status").default("PENDING").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const materialEmbeddings = pgTable("material_embeddings", {
  id: uuid("id").defaultRandom().primaryKey(),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  chunkContent: text("chunk_content").notNull(),
});

export const userAcademicRelations = relations(user, ({ one, many }) => ({
  enrollments: many(enrollments),
  submissions: many(submissions),
  chatMessages: many(chatMessages),
  studentProfile: one(studentProfiles, {
    fields: [user.id],
    references: [studentProfiles.userId],
  }),
}));

export const classesRelations = relations(classes, ({ many }) => ({
  enrollments: many(enrollments),
  materials: many(materials),
  chatMessages: many(chatMessages),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(user, {
    fields: [enrollments.userId],
    references: [user.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(user, {
    fields: [studentProfiles.userId],
    references: [user.id],
  }),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  class: one(classes, {
    fields: [materials.classId],
    references: [classes.id],
  }),
  assignments: many(assignments),
  embeddings: many(materialEmbeddings),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  material: one(materials, {
    fields: [assignments.materialId],
    references: [materials.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(user, {
    fields: [submissions.studentId],
    references: [user.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(user, {
    fields: [chatMessages.userId],
    references: [user.id],
  }),
  class: one(classes, {
    fields: [chatMessages.classId],
    references: [classes.id],
  }),
}));

export const materialEmbeddingsRelations = relations(materialEmbeddings, ({ one }) => ({
  material: one(materials, {
    fields: [materialEmbeddings.materialId],
    references: [materials.id],
  }),
}));

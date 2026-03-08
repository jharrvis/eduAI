# Plan: LMS Core Class Features Update

## Context
The current LMS has basic class/enrollment management but lacks:
- Class status (active/inactive) and access period control
- A formal "Jadwal Pertemuan" (meeting schedule) system
- Better enrollment search UI (by name/NIM)
- Teacher ability to attach materials and assignments to specific meetings
- Student schedule view with date-locked content access

This plan implements all requested Admin, Teacher, and Student features around the class/meeting system.

---

## Phase 1: Database Schema Changes

**File: `lib/schema.ts`**

### 1a. Modify `classes` table — add 3 fields:
```ts
isActive: boolean("is_active").default(true).notNull(),
startDate: timestamp("start_date", { withTimezone: true }),
endDate:   timestamp("end_date",   { withTimezone: true }),
```

### 1b. New `class_meetings` table:
```ts
export const classMeetings = pgTable("class_meetings", {
  id:            uuid("id").defaultRandom().primaryKey(),
  classId:       uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  meetingNumber: integer("meeting_number").notNull(),
  title:         text("title").notNull(),
  description:   text("description"),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 1c. Modify `materials` table — add optional meetingId:
```ts
meetingId: uuid("meeting_id").references(() => classMeetings.id, { onDelete: "set null" }),
```
Keep existing `scheduledAt` — when a material is assigned to a meeting, `scheduledAt` is auto-set from `meeting.scheduledDate`.

### 1d. Modify `assignments` table — make materialId optional, add meetingId:
```ts
materialId: uuid("material_id").references(() => materials.id, { onDelete: "cascade" }),  // remove .notNull()
meetingId:  uuid("meeting_id").references(() => classMeetings.id, { onDelete: "cascade" }),
```

### 1e. Add Drizzle relations for `classMeetings`:
```ts
export const classMeetingsRelations = relations(classMeetings, ({ one, many }) => ({
  class:    one(classes, { fields: [classMeetings.classId], references: [classes.id] }),
  materials: many(materials),
  assignments: many(assignments),
}));
// Also update classesRelations, materialsRelations, assignmentsRelations
```

### Migration:
Run `npm run db:generate` then `npm run db:migrate`.

---

## Phase 2: New & Updated Server Actions

### 2a. New file: `app/actions/class-meetings.ts`
```ts
getMeetings(classId: string)          // ADMIN/TEACHER/STUDENT — returns meetings ordered by scheduledDate
createMeeting(data)                   // ADMIN/TEACHER — single meeting
createMeetingsBulk(classId, config)   // ADMIN/TEACHER — generate weekly/biweekly schedule
updateMeeting(id, data)               // ADMIN/TEACHER
deleteMeeting(id)                     // ADMIN/TEACHER
```
`createMeetingsBulk` config:
```ts
{ type: "WEEKLY" | "BIWEEKLY" | "CUSTOM", startDate, count?, customDates? }
```

### 2b. Update `app/actions/classes.ts`:
- `createClass` / `updateClass` accept `isActive`, `startDate`, `endDate`
- `ClassWithMembers` type gains these fields

### 2c. Update `app/actions/materials.ts`:
- `createMaterial` / `updateMaterial` accept optional `meetingId`
- When `meetingId` provided, auto-set `scheduledAt = meeting.scheduledDate`
- Student access filter: `scheduledAt <= now` (unchanged logic, still works)

### 2d. Update `app/actions/assignments.ts`:
- `createAssignment` / `updateAssignment` accept optional `meetingId`
- `materialId` becomes optional in the insert

---

## Phase 3: Admin UI Updates

### 3a. `app/admin/classes/page.tsx` — 3 improvements:

**Create/Edit modal** — add fields:
- `isActive` toggle (checkbox/switch)
- `startDate` (datetime-local input)
- `endDate` (datetime-local input)
- Show status badge on class cards

**Enrollment modal** — add search input:
- Add `teacherSearch` and `studentSearch` state strings
- Filter displayed teachers/students using `useMemo` filtering by name or NIM
- Search input at top of each list panel

**Meeting Schedule modal** — new modal triggered by "Atur Jadwal" button per class:
- Two tabs: "Buat Jadwal Otomatis" and "Tambah Manual"
- Auto tab: `startDate`, `count` (e.g. 16 pertemuan), `type` (Mingguan/Dua Mingguan)
- Manual tab: list of existing meetings (edit title/date inline), add single meeting
- Delete individual meeting with confirmation

### 3b. No new pages needed for admin — all handled via modals.

---

## Phase 4: Teacher UI Updates

### 4a. `app/teacher/classes/page.tsx` — add meetings panel:
- Each class card has an expandable "Jadwal Pertemuan" section (toggle button)
- Shows list of meetings sorted by date
- Each meeting row shows: number, title, date, material count, assignment count
- "Lihat Detail" link per meeting → navigate to new page

### 4b. New page: `app/teacher/classes/[classId]/meetings/[meetingId]/page.tsx`
Meeting detail page for teacher:
- Header: meeting title, date, description
- Left: Materials assigned to this meeting (list + CRUD inline)
  - "Tambah Materi" button → modal with title, content, fileUrl
  - On create: material is saved with `meetingId` and `scheduledAt = meeting.scheduledDate`
  - Edit/delete existing materials
- Right: Assignments for this meeting (list + CRUD inline)
  - "Buat Tugas" button → modal with title, instructions, dueDate
  - On create: assignment saved with `meetingId`
  - Edit/delete

> Alternative simpler approach: integrate into teacher classes page as side panel rather than separate route. **Recommended: use separate route** for better UX on mobile and cleaner code.

### 4c. Update teacher layout nav:
- "Kelas" nav item already exists; ensure it points to `/teacher/classes`
- No new nav items needed; meeting detail is reached by clicking from classes page

### 4d. `app/teacher/materials/page.tsx` — add meetingId:
- Add "Pertemuan" dropdown in create/edit form (fetches meetings for selected class)
- Show meeting title column in materials list

### 4e. `app/teacher/assignments/page.tsx` — add meetingId:
- Add "Pertemuan" dropdown in create assignment form
- Show meeting context in assignment list

---

## Phase 5: Student UI Updates

### 5a. New page: `app/student/classes/page.tsx`
- Lists all enrolled classes with status (active/inactive), dates
- Each class card → click to expand or navigate to meeting schedule

### 5b. New page: `app/student/classes/[classId]/page.tsx`
Class detail/meeting schedule for student:
- Shows all meetings sorted by scheduledDate
- Each meeting:
  - If `scheduledDate > now`: locked (grayed out, shows "Tersedia pada [date]")
  - If `scheduledDate <= now`: unlocked (shows materials and assignments)
- Clicking unlocked meeting expands to show materials (with file links) and assignments (with submit form)

### 5c. Update student layout nav (`app/student/layout.tsx`):
- Add "Kelas" nav item → `/student/classes`

### 5d. `app/student/materials/page.tsx` — add meeting context:
- Show meeting name/number per material (if linked to meeting)
- Still filter by `scheduledAt <= now`

### 5e. `app/student/assignments/page.tsx` — minimal update:
- Show meeting context per assignment

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `lib/schema.ts` | Add classMeetings table, modify classes/materials/assignments |
| `app/actions/classes.ts` | Add isActive/startDate/endDate support |
| `app/actions/materials.ts` | Add meetingId support |
| `app/actions/assignments.ts` | Add meetingId, make materialId optional |
| `app/actions/class-meetings.ts` | **NEW** - full CRUD + bulk generation |
| `app/admin/classes/page.tsx` | Add status fields, search enrollment, meeting modal |
| `app/teacher/classes/page.tsx` | Add meetings panel |
| `app/teacher/classes/[classId]/meetings/[meetingId]/page.tsx` | **NEW** - meeting detail |
| `app/teacher/materials/page.tsx` | Add meetingId field |
| `app/teacher/assignments/page.tsx` | Add meetingId field |
| `app/student/layout.tsx` | Add "Kelas" nav item |
| `app/student/classes/page.tsx` | **NEW** - enrolled classes list |
| `app/student/classes/[classId]/page.tsx` | **NEW** - meeting schedule with lock |

---

## Existing Utilities to Reuse

- `requireRole()` from `app/actions/_auth.ts` — all new actions use this
- `db` from `lib/db.ts` — Drizzle client
- `revalidatePath()` pattern — revalidate relevant paths after mutations
- `FileUpload` component from `app/components/file-upload.tsx` — for material creation in meeting detail
- `app-card`, `app-btn-primary`, `app-input`, `app-btn-ghost` — existing Tailwind utility classes
- `useTransition()` pattern — used in all client pages for async server actions

---

## Verification

1. **Run migrations**: `npm run db:generate && npm run db:migrate`
2. **Admin flow**:
   - Create class with isActive=true, startDate, endDate
   - Assign teachers (search by name) and students (search by NIM)
   - Generate weekly meeting schedule (e.g. 14 meetings from start date)
   - Verify meetings appear in list, edit one date
3. **Teacher flow**:
   - Login as teacher → Classes → click on a class → expand Jadwal Pertemuan
   - Navigate to a meeting → add material → add assignment
   - Verify material has correct scheduledDate from meeting
4. **Student flow**:
   - Login as student → Kelas → select class → see meeting schedule
   - Future meetings show as locked; past meetings show as unlocked with materials
   - Submit assignment from unlocked meeting
5. **Access control**:
   - Ensure students cannot access materials before meeting.scheduledDate
   - Ensure teachers cannot manage classes they're not enrolled in

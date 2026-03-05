"use server";

import {
  enrollUsers as enrollUsersInClass,
  getClassEnrollments as getMembersByClass,
  removeEnrollment as removeEnrollmentFromClass,
} from "@/app/actions/classes";

export async function enrollUsers(
  classId: string,
  userIds: string[],
  roleInClass: "TEACHER" | "STUDENT",
) {
  return enrollUsersInClass(classId, userIds, roleInClass);
}

export async function removeEnrollment(classId: string, userId: string) {
  return removeEnrollmentFromClass(classId, userId);
}

export async function getClassEnrollments(classId: string) {
  return getMembersByClass(classId);
}


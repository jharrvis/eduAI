import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "admin" | "student";

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Class {
  id: string;
  name: string;
  schedule: string;
  students: string[]; // User IDs
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface Material {
  id: string;
  classId: string;
  title: string;
  content: string;
  summary?: string;
  quiz?: QuizQuestion[];
}

export interface Assignment {
  id: string;
  materialId: string;
  studentId: string;
  submission: string;
  grade?: number;
}

interface StoreState {
  currentUser: User | null;
  users: User[];
  classes: Class[];
  materials: Material[];
  assignments: Assignment[];

  login: (userId: string) => void;
  logout: () => void;

  addClass: (cls: Class) => void;
  addMaterial: (material: Material) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  addAssignment: (assignment: Assignment) => void;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
}

const initialUsers: User[] = [
  { id: "admin1", name: "Dr. Budi (Dosen)", role: "admin" },
  { id: "student1", name: "Andi (Mahasiswa)", role: "student" },
  { id: "student2", name: "Siti (Mahasiswa)", role: "student" },
];

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      currentUser: null,
      users: initialUsers,
      classes: [
        {
          id: "c1",
          name: "Pemrograman Web",
          schedule: "Senin, 08:00",
          students: ["student1", "student2"],
        },
        {
          id: "c2",
          name: "Kecerdasan Buatan",
          schedule: "Rabu, 10:00",
          students: ["student1"],
        },
      ],
      materials: [
        {
          id: "m1",
          classId: "c1",
          title: "Pengenalan HTML & CSS",
          content:
            "HTML adalah bahasa markup standar untuk dokumen yang dirancang untuk ditampilkan di peramban internet. CSS adalah bahasa lembar gaya yang digunakan untuk menjelaskan tampilan dan format dokumen yang ditulis dalam bahasa markup.",
        },
      ],
      assignments: [],

      login: (userId) =>
        set((state) => ({
          currentUser: state.users.find((u) => u.id === userId) || null,
        })),
      logout: () => set({ currentUser: null }),

      addClass: (cls) => set((state) => ({ classes: [...state.classes, cls] })),
      addMaterial: (material) =>
        set((state) => ({ materials: [...state.materials, material] })),
      updateMaterial: (id, updates) =>
        set((state) => ({
          materials: state.materials.map((m) =>
            m.id === id ? { ...m, ...updates } : m,
          ),
        })),
      addAssignment: (assignment) =>
        set((state) => ({ assignments: [...state.assignments, assignment] })),
      updateAssignment: (id, updates) =>
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === id ? { ...a, ...updates } : a,
          ),
        })),
    }),
    {
      name: "eduai-storage",
    },
  ),
);

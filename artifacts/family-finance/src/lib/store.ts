import { create } from "zustand";

interface AuthState {
  currentMemberId: number | null;
  familyId: number;
  setMemberId: (id: number | null) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const stored = localStorage.getItem("currentMemberId");
  return {
    currentMemberId: stored ? parseInt(stored, 10) : null,
    familyId: 1, // Fixed for demo
    setMemberId: (id) => {
      if (id === null) {
        localStorage.removeItem("currentMemberId");
      } else {
        localStorage.setItem("currentMemberId", id.toString());
      }
      set({ currentMemberId: id });
    },
  };
});

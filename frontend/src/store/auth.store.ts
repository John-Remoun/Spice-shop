import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'superadmin' | 'staff';
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
      clear: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'botanica_auth_storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

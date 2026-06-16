import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      login: (userData) => set({ user: userData, isLoggedIn: true }),
      logout: () => set({ user: null, isLoggedIn: false }),
    }),
    {
      name: 'auth-storage', // Unique key for localStorage
    }
  )
);

export default useAuthStore;

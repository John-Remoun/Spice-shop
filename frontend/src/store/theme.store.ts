import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
  set: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      toggle: () => {
        const next = get().mode === 'light' ? 'dark' : 'light';
        applyThemeClass(next);
        set({ mode: next });
      },
      set: (mode) => {
        applyThemeClass(mode);
        set({ mode });
      },
    }),
    {
      name: 'botanica_theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeClass(state.mode);
      },
    }
  )
);

function applyThemeClass(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  if (mode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

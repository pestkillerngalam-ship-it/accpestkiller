import { create } from 'zustand';

export type PageView = 'dashboard' | 'customers' | 'invoices' | 'expenses' | 'reports' | 'settings';

interface UserState {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AppState {
  isAuthenticated: boolean;
  user: UserState | null;
  token: string | null;
  activePage: PageView;
  sidebarOpen: boolean;
  setAuth: (user: UserState, token: string) => void;
  logout: () => void;
  setActivePage: (page: PageView) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  activePage: 'dashboard',
  sidebarOpen: false,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ isAuthenticated: true, user, token });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    set({ isAuthenticated: false, user: null, token: null });
  },
  setActivePage: (page) => set({ activePage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

export function initializeStore() {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAppStore.getState().setAuth(user, token);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
}

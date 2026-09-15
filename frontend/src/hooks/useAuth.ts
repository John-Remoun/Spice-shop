import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, AuthUser } from '@/store/auth.store';

/**
 * On first mount, silently attempts /auth/refresh so a returning user with
 * a still-valid httpOnly refresh cookie is re-authenticated without having
 * to log in again. `booting` gates the router so protected routes don't
 * flash a login screen while this resolves.
 */
export function useAuthBootstrap() {
  const [booting, setBooting] = useState(() => {
    // If session is restored from localStorage, we don't block the router!
    const store = useAuthStore.getState();
    return !(store.accessToken && store.user);
  });
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const store = useAuthStore.getState();
        if (store.accessToken && store.user) {
          // Session is already active from localStorage — verify in background
          const me = await apiClient.get<AuthUser>('/auth/me').catch(() => null);
          if (cancelled) return;
          if (me?.data) setSession(store.accessToken, me.data);
        } else {
          // No session — attempt refresh cookie
          const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh');
          if (cancelled) return;
          useAuthStore.getState().setAccessToken(data.accessToken);
          const me = await apiClient.get<AuthUser>('/auth/me').catch(() => null);
          if (me?.data) setSession(data.accessToken, me.data);
        }
      } catch {
        // No valid refresh cookie — keep existing session if present
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  return { booting };
}

export function useAuth() {
  const { accessToken, user, setSession, updateUser, clear } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await apiClient.post<{ accessToken: string; user: AuthUser }>('/auth/login', {
        email,
        password,
      });
      setSession(data.accessToken, data.user);
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    await apiClient.post('/auth/logout').catch(() => null);
    clear();
  }, [clear]);

  return { user, isAuthenticated: Boolean(accessToken && user), login, logout, updateUser };
}

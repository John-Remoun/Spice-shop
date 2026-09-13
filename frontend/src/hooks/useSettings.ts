import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AppSettings {
  storeName: string;
  logoUrl?: string;
  defaultCurrency: string;
  vapidPublicKey?: string;
}

/**
 * Loads the Super-Admin-editable App Settings (store name, logo, currency).
 * Cached by React Query; call `queryClient.invalidateQueries(['settings'])`
 * after a settings save so branding updates propagate across the UI
 * immediately without a full reload.
 */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await apiClient.get<AppSettings>('/settings');
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

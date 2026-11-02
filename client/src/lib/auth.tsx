import { createContext, useContext, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/api/hooks';
import { api } from '@/api/client';
import type { UserDTO } from '@shared/types';

interface Ctx { user: UserDTO | null; loading: boolean; isOwner: boolean; logout: () => Promise<void>; refresh: () => void }
const AuthCtx = createContext<Ctx>({ user: null, loading: true, isOwner: false, logout: async () => undefined, refresh: () => undefined });

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useMe();
  const user = me.data?.user ?? null;
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); qc.clear(); };
  return (
    <AuthCtx.Provider value={{
      user, loading: me.isLoading, isOwner: user?.role === 'OWNER', logout,
      refresh: () => void qc.invalidateQueries({ queryKey: ['me'] }),
    }}>
      {children}
    </AuthCtx.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthCtx);

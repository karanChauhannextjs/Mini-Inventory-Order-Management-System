import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { getMe, login as loginApi, logout as logoutApi, register as registerApi } from '@/api';
import {
  clearAuthSession,
  getStoredUser,
  getToken,
  setAuthSession,
} from '@/lib/auth-storage';
import { queryKeys } from '@/lib/query-keys';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const token = getToken();

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => (await getMe()).data,
    enabled: Boolean(token),
    retry: false,
  });

  const user = meQuery.data ?? (token && !meQuery.isError ? getStoredUser() : null);
  const isBootstrapping = Boolean(token) && meQuery.isLoading && !meQuery.isError;

  useEffect(() => {
    if (meQuery.isError && token) {
      clearAuthSession();
      qc.removeQueries({ queryKey: queryKeys.me });
    }
  }, [meQuery.isError, token, qc]);

  const applySession = useCallback(
    (session) => {
      setAuthSession(session.token, session.user);
      qc.setQueryData(queryKeys.me, session.user);
    },
    [qc]
  );

  const loginMutation = useMutation({
    mutationFn: (payload) => loginApi(payload),
    onSuccess: (res) => {
      applySession(res.data);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload) => registerApi(payload),
    onSuccess: (res) => {
      applySession(res.data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutApi(),
    onSettled: () => {
      clearAuthSession();
      qc.clear();
    },
  });

  const value = useMemo(
    () => ({
      user: user ?? null,
      token,
      isAuthenticated: Boolean(token && user && !meQuery.isError),
      isBootstrapping,
      login: loginMutation.mutateAsync,
      register: registerMutation.mutateAsync,
      logout: logoutMutation.mutateAsync,
      loginPending: loginMutation.isPending,
      registerPending: registerMutation.isPending,
      logoutPending: logoutMutation.isPending,
    }),
    [
      user,
      token,
      isBootstrapping,
      loginMutation,
      registerMutation,
      logoutMutation,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

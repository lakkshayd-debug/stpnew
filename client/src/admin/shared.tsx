import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export const useAdmin = <T,>(path: string, enabled = true) =>
  useQuery({ queryKey: ['admin', path], queryFn: () => api<T>(`/admin${path}`), enabled });

export function useAdminMutation<V = void>(fn: (v: V) => Promise<unknown>, invalidate: string[] = ['admin']) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate.forEach((k) => void qc.invalidateQueries({ queryKey: [k] })) });
}

export const Stat = ({ label, value, gold = false }: { label: string; value: string | number; gold?: boolean }) => (
  <div className={`card p-4 ${gold ? 'border-brass bg-brass/10' : ''}`}>
    <p className="text-sm text-teak dark:text-sawdust">{label}</p>
    <p className={`text-2xl font-serif font-bold ${gold ? 'text-brass' : ''}`}>{value}</p>
  </div>
);

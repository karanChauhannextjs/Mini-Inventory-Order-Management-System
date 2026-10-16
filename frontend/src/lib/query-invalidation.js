import { queryKeys } from '@/lib/query-keys';

/** Refetch list queries after catalog mutations (active + inactive matchers). */
export async function invalidateProducts(qc) {
  await qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
  await qc.invalidateQueries({ queryKey: queryKeys.dashboard, refetchType: 'all' });
}

export async function invalidateCategories(qc) {
  await qc.invalidateQueries({ queryKey: ['categories'], refetchType: 'all' });
}

export async function invalidateCustomers(qc) {
  await qc.invalidateQueries({ queryKey: ['customers'], refetchType: 'all' });
}

/** Orders affect stock (pending reservation, confirm/cancel). Always refresh products too. */
export async function invalidateOrders(qc, { orderId } = {}) {
  const tasks = [
    qc.invalidateQueries({ queryKey: ['orders'], refetchType: 'all' }),
    qc.invalidateQueries({ queryKey: queryKeys.dashboard, refetchType: 'all' }),
    qc.invalidateQueries({ queryKey: ['products'], refetchType: 'all' }),
  ];
  if (orderId) {
    tasks.push(qc.invalidateQueries({ queryKey: queryKeys.order(orderId), refetchType: 'all' }));
  }
  await Promise.all(tasks);
}

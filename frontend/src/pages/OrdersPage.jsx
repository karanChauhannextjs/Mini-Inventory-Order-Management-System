import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, MoreHorizontal, Plus } from 'lucide-react';
import { deleteOrder, getOrders } from '@/api';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import EmptyListBanner from '@/components/EmptyListBanner';
import DataTable from '@/components/DataTable';
import OrderStatusControl from '@/components/OrderStatusControl';
import PageHeader from '@/components/PageHeader';
import TablePagination from '@/components/TablePagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ClearableInput from '@/components/ClearableInput';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { invalidateOrders } from '@/lib/query-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { notifyError, notifySuccess } from '@/lib/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { tableEmptyMessage } from '@/lib/list-empty';
import { formatDate, money } from '@/utils/format';

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const debouncedSearch = useDebounce(searchInput.trim());
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const params = useMemo(
    () => ({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(status && { status }),
      ...(debouncedSearch && { search: debouncedSearch }),
    }),
    [page, status, debouncedSearch]
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => getOrders(params),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteOrder(id),
    onSuccess: async (res, orderId) => {
      notifySuccess(res.message || 'Order deleted');
      setDeleteTarget(null);
      await invalidateOrders(qc, { orderId });
    },
    onError: (err) => notifyError(err.message),
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: '_id',
        header: 'Order',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">#{row.original._id.slice(-8).toUpperCase()}</span>
        ),
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => row.original.customer?.name ?? '—',
      },
      {
        id: 'items',
        header: 'Lines',
        cell: ({ row }) => row.original.items?.length ?? 0,
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total',
        cell: ({ row }) => money(row.original.totalAmount),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <OrderStatusControl
            compact
            orderId={row.original._id}
            status={row.original.status}
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/orders/${row.original._id}`} className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View
                </Link>
              </DropdownMenuItem>
              {row.original.status !== 'Confirmed' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() =>
                      setDeleteTarget({
                        id: row.original._id,
                        label: `#${row.original._id.slice(-8).toUpperCase()}`,
                      })
                    }
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };
  const hasFilters = Boolean(debouncedSearch || status);
  const listEmpty = data?.isEmpty === true && !hasFilters;
  const ordersEmptyMessage = tableEmptyMessage(data?.message, {
    filtered: hasFilters,
    fallback: {
      empty: 'No orders yet. Create your first order to get started.',
      filtered: 'No orders match your search or filters.',
    },
  });

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Search orders, update status, or view full order details"
        actions={
          <Button asChild>
            <Link to="/orders/new"><Plus className="h-4 w-4" />New order</Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-2 pt-6">
          <ClearableInput
            placeholder="Customer name or order id"
            wrapperClassName="max-w-sm w-full"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClear={() => setSearchInput('')}
          />
          <Select
            value={status || 'all'}
            onValueChange={(v) => setStatus(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Confirmed">Completed (Confirmed)</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!isLoading && listEmpty && (
        <EmptyListBanner title="No orders yet" description={data?.message} />
      )}

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            emptyMessage={ordersEmptyMessage}
          />
          <TablePagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={PAGE_SIZE}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete order?"
        description={
          deleteTarget
            ? `Order ${deleteTarget.label} will be permanently removed. Confirmed orders must be cancelled first.`
            : ''
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Package, Phone, User } from 'lucide-react';
import { getOrder } from '@/api';
import DataTable from '@/components/DataTable';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { queryKeys } from '@/lib/query-keys';
import { formatDate, money } from '@/utils/format';

function orderShortId(id) {
  return id ? `#${id.slice(-8).toUpperCase()}` : '—';
}

export default function OrderDetailPage() {
  const { id } = useParams();

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.order(id),
    queryFn: async () => (await getOrder(id)).data,
    enabled: Boolean(id),
  });

  const lineColumns = [
    {
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => <span className="font-medium">{row.original.productName}</span>,
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.sku}</span>,
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      cell: ({ row }) => <span className="tabular-nums">{row.original.quantity}</span>,
    },
    {
      accessorKey: 'unitPrice',
      header: 'Unit price',
      cell: ({ row }) => <span className="tabular-nums">{money(row.original.unitPrice)}</span>,
    },
    {
      accessorKey: 'lineTotal',
      header: 'Line total',
      cell: ({ row }) => <span className="tabular-nums font-medium">{money(row.original.lineTotal)}</span>,
    },
  ];

  const itemCount = order?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground" asChild>
          <Link to="/orders">
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
        </Button>
      </div>

      <PageHeader
        title={isLoading ? 'Order details' : `Order ${orderShortId(order?._id)}`}
        description={
          isLoading
            ? 'Loading order information…'
            : order
              ? `Created ${formatDate(order.createdAt)}${order.updatedAt ? ` · Updated ${formatDate(order.updatedAt)}` : ''}`
              : 'Order not found'
        }
      />

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-sm text-destructive">{error?.message || 'Could not load this order.'}</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/orders">Back to orders</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {order && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <span className="text-sm text-muted-foreground">
              {order.items.length} line{order.items.length === 1 ? '' : 's'} · {itemCount} unit{itemCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-semibold leading-tight">{order.customer?.name ?? '—'}</p>
                {order.customer?.email && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {order.customer.email}
                  </p>
                )}
                {order.customer?.phone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {order.customer.phone}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Line items</span>
                  <span className="font-medium tabular-nums">{order.items.length}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Total quantity</span>
                  <span className="font-medium tabular-nums">{itemCount}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Status</span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/[0.03]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Order total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{money(order.totalAmount)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Prices frozen at order time</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
              <p className="text-sm text-muted-foreground">
                Product names, SKU, and prices are saved on this order and won&apos;t change if the catalog is updated.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable columns={lineColumns} data={order.items} emptyMessage="No items on this order." />
              <Separator />
              <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">
                  {itemCount} unit{itemCount === 1 ? '' : 's'} across {order.items.length} product
                  {order.items.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">Grand total</span>
                  <span className="text-xl font-semibold tabular-nums">{money(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="font-mono text-xs text-muted-foreground">Order ID: {order._id}</p>
        </div>
      )}
    </div>
  );
}

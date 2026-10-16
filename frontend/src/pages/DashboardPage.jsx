import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboard } from '@/api';
import DataTable from '@/components/DataTable';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStatsSkeleton } from '@/components/DashboardSkeleton';
import { queryKeys } from '@/lib/query-keys';
import { formatDate, money } from '@/utils/format';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => (await getDashboard()).data,
  });

  const columns = [
    {
      accessorKey: '_id',
      header: 'Order',
      cell: ({ row }) => (
        <Link to={`/orders/${row.original._id}`} className="font-mono text-sm font-medium text-primary hover:underline">
          #{row.original._id.slice(-6)}
        </Link>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => row.original.customer?.name ?? '—',
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total',
      cell: ({ row }) => money(row.original.totalAmount),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of inventory, orders, and confirmed sales" />

      {isLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total products', value: data?.totalProducts },
            { label: 'Total orders', value: data?.totalOrders },
            { label: 'Total stock (units)', value: data?.totalStock },
            { label: 'Sales (confirmed)', value: money(data?.totalSales ?? 0), highlight: true },
          ].map((stat) => (
            <Card key={stat.label} className={stat.highlight ? 'border-primary/30 bg-primary/5' : ''}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value ?? '—'}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Latest activity across the store</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/orders">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <DataTable
            columns={columns}
            data={data?.recentOrders ?? []}
            loading={isLoading}
            emptyMessage="No orders yet. Create one from the Orders page."
          />
        </CardContent>
      </Card>
    </div>
  );
}

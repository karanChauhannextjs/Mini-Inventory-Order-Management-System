import { Badge } from '@/components/ui/badge';

const variantMap = {
  Active: 'success',
  Inactive: 'muted',
  Pending: 'warning',
  Confirmed: 'success',
  Cancelled: 'destructive',
};

const labelMap = {
  Confirmed: 'Completed',
};

export default function OrderStatusBadge({ status }) {
  const label = labelMap[status] || status;
  return <Badge variant={variantMap[status] || 'secondary'}>{label}</Badge>;
}

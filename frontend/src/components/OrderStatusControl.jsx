import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { updateOrderStatus } from '@/api';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { invalidateOrders } from '@/lib/query-invalidation';
import { notifySuccess } from '@/lib/toast';

const STATUS_LABELS = {
  Pending: 'Pending',
  Confirmed: 'Completed (Confirmed)',
  Cancelled: 'Cancelled',
};

function optionsForStatus(current) {
  if (current === 'Cancelled') return [];
  if (current === 'Confirmed') return ['Cancelled'];
  return ['Confirmed', 'Cancelled'];
}

function statusHint(from, to) {
  if (to === 'Confirmed') return 'Stock will be deducted from inventory when you confirm.';
  if (to === 'Cancelled' && from === 'Pending') {
    return 'No stock changes — this order was never completed.';
  }
  if (to === 'Cancelled' && from === 'Confirmed') {
    return 'Stock for this order will be returned to inventory.';
  }
  return '';
}

export default function OrderStatusControl({ orderId, status, compact = false }) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  const mutation = useMutation({
    mutationFn: (next) => updateOrderStatus(orderId, next),
    onSuccess: async (res) => {
      notifySuccess(res.message || 'Order status updated');
      await invalidateOrders(qc, { orderId });
      setConfirmOpen(false);
      setPendingStatus(null);
    },
  });

  const targets = optionsForStatus(status);

  function requestStatusChange(next) {
    if (next === status) return;
    setPendingStatus(next);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (mutation.isPending) return;
    setConfirmOpen(false);
    setPendingStatus(null);
  }

  function applyStatusChange() {
    if (!pendingStatus) return;
    mutation.mutate(pendingStatus);
  }

  const confirmDialog = (
    <Dialog open={confirmOpen} onOpenChange={(open) => !open && closeConfirm()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update order status?</DialogTitle>
          <DialogDescription className="space-y-2 pt-1">
            <span className="block">
              Change from <strong>{STATUS_LABELS[status]}</strong> to{' '}
              <strong>{pendingStatus ? STATUS_LABELS[pendingStatus] : '—'}</strong>.
            </span>
            {pendingStatus && (
              <span className="block text-muted-foreground">
                {statusHint(status, pendingStatus)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeConfirm} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={applyStatusChange} disabled={mutation.isPending}>
            {mutation.isPending ? 'Updating…' : 'OK'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (targets.length === 0) {
    return <OrderStatusBadge status={status} />;
  }

  if (compact) {
    return (
      <>
        <Select
          value={status}
          onValueChange={requestStatusChange}
          disabled={mutation.isPending}
        >
          <SelectTrigger className="h-8 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={status}>{STATUS_LABELS[status]}</SelectItem>
            {targets.map((t) => (
              <SelectItem key={t} value={t}>{STATUS_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {confirmDialog}
      </>
    );
  }

  return (
    <div className="space-y-2">
      <OrderStatusBadge status={status} />
      <Select
        value={status}
        onValueChange={requestStatusChange}
        disabled={mutation.isPending}
      >
        <SelectTrigger>
          <SelectValue placeholder="Update status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={status}>{STATUS_LABELS[status]} (current)</SelectItem>
          {targets.map((t) => (
            <SelectItem key={t} value={t}>{STATUS_LABELS[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {confirmDialog}
    </div>
  );
}

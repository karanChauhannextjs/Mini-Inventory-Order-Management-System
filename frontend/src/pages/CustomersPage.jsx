import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from '@/api';
import DataTable from '@/components/DataTable';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import PageHeader from '@/components/PageHeader';
import TablePagination from '@/components/TablePagination';
import ClearableInput from '@/components/ClearableInput';
import DismissibleAlert from '@/components/DismissibleAlert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';
import { invalidateCustomers } from '@/lib/query-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { notifyError, notifySuccess } from '@/lib/toast';
import { FieldError, RequiredLabel } from '@/components/FormHelpers';
import { sanitizePhoneInput, validateCustomerForm } from '@/lib/validation';
import { formatDate } from '@/utils/format';

const blank = { name: '', email: '', phone: '' };
const PAGE_SIZE = 10;

export default function CustomersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim());

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const params = useMemo(
    () => ({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(debouncedSearch && { search: debouncedSearch }),
    }),
    [page, debouncedSearch]
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: () => getCustomers(params),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone ? form.phone : undefined,
      };
      return editId ? updateCustomer(editId, payload) : createCustomer(payload);
    },
    onSuccess: async (res) => {
      notifySuccess(res.message || (editId ? 'Customer updated' : 'Customer created'));
      await invalidateCustomers(qc);
      setOpen(false);
      setFormError('');
    },
    onError: (err) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCustomer(id),
    onSuccess: async (res) => {
      notifySuccess(res.message || 'Customer deleted');
      setDeleteTarget(null);
      await invalidateCustomers(qc);
    },
    onError: (err) => notifyError(err.message),
  });

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone || '—' },
      {
        accessorKey: 'createdAt',
        header: 'Added',
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
              <DropdownMenuItem
                onClick={() => {
                  setEditId(row.original._id);
                  setForm({
                    name: row.original.name,
                    email: row.original.email,
                    phone: row.original.phone || '',
                  });
                  setFormError('');
                  setFieldErrors({});
                  setOpen(true);
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() =>
                  setDeleteTarget({ id: row.original._id, name: row.original.name })
                }
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Debounced search hits the API as you type"
        actions={
          <Button
            onClick={() => {
              setEditId(null);
              setForm(blank);
              setFormError('');
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />Add customer
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <ClearableInput
            placeholder="Search name or email"
            wrapperClassName="max-w-sm w-full"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClear={() => setSearchInput('')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} />
          <TablePagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={PAGE_SIZE}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit customer' : 'New customer'}</DialogTitle>
          </DialogHeader>
          <DismissibleAlert message={formError} onDismiss={() => setFormError('')} />
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const validation = validateCustomerForm(form);
              if (!validation.ok) {
                setFieldErrors(validation.errors);
                setFormError(validation.message);
                notifyError(validation.message);
                return;
              }
              setFormError('');
              setFieldErrors({});
              saveMutation.mutate();
            }}
          >
            <div className="grid gap-2">
              <RequiredLabel>Name</RequiredLabel>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-invalid={!!fieldErrors.name}
              />
              <FieldError message={fieldErrors.name} />
            </div>
            <div className="grid gap-2">
              <RequiredLabel>Email</RequiredLabel>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                aria-invalid={!!fieldErrors.email}
              />
              <FieldError message={fieldErrors.email} />
            </div>
            <div className="grid gap-2">
              <Label>Phone (10 digits, optional)</Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
                aria-invalid={!!fieldErrors.phone}
              />
              <FieldError message={fieldErrors.phone} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete customer?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed. Customers with orders cannot be deleted.`
            : ''
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

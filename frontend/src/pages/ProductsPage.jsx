import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProduct,
  getProducts,
  updateProduct,
} from '@/api';
import DataTable from '@/components/DataTable';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import PageHeader from '@/components/PageHeader';
import TablePagination from '@/components/TablePagination';
import ClearableInput from '@/components/ClearableInput';
import DismissibleAlert from '@/components/DismissibleAlert';
import CategoryFormDialog from '@/components/CategoryFormDialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { invalidateProducts } from '@/lib/query-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { notifySuccess } from '@/lib/toast';
import { FieldError, RequiredLabel } from '@/components/FormHelpers';
import { notifyError } from '@/lib/toast';
import { validateProductForm } from '@/lib/validation';
import { formatDate, money } from '@/utils/format';

const emptyForm = {
  name: '',
  price: '',
  stock: '',
  categoryId: '',
  status: 'Active',
};

function handleNonNegativeDecimalInput(value) {
  if (value === '') return '';
  if (value.startsWith('-')) return null;
  if (!/^\d*\.?\d*$/.test(value)) return null;
  return value;
}

function handleNonNegativeIntegerInput(value) {
  if (value === '') return '';
  if (!/^\d+$/.test(value)) return null;
  return value;
}

const PAGE_SIZE = 10;

function categoryName(product) {
  if (!product?.category) return '—';
  if (typeof product.category === 'object') return product.category.name ?? '—';
  return '—';
}

function resolveCategoryId(category) {
  if (!category) return '';
  if (typeof category === 'string') return category;
  if (typeof category === 'object' && category._id != null) return String(category._id);
  return '';
}

function productToForm(product) {
  return {
    name: product.name ?? '',
    price: String(product.price ?? ''),
    stock: String(product.stock ?? ''),
    categoryId: resolveCategoryId(product.category),
    status: product.status ?? 'Active',
  };
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories({ limit: '200' }),
    queryFn: () => getCategories({ limit: '200' }),
  });

  const categoryOptions = categoriesQuery.data?.data ?? [];

  const editingProductQuery = useQuery({
    queryKey: queryKeys.product(editingId),
    queryFn: async () => (await getProduct(editingId)).data,
    enabled: Boolean(dialogOpen && editingId),
  });

  useEffect(() => {
    if (!dialogOpen || !editingId || !editingProductQuery.data) return;
    setForm(productToForm(editingProductQuery.data));
  }, [dialogOpen, editingId, editingProductQuery.data]);

  const categorySelectOptions = useMemo(() => {
    const options = categoryOptions.map((c) => ({
      _id: String(c._id),
      name: c.name,
    }));
    const selectedId = form.categoryId;
    if (!selectedId) return options;

    if (!options.some((c) => c._id === selectedId)) {
      const fromProduct =
        typeof editingProductQuery.data?.category === 'object'
          ? editingProductQuery.data.category.name
          : null;
      options.push({
        _id: selectedId,
        name: fromProduct || 'Selected category',
      });
    }
    return options;
  }, [categoryOptions, form.categoryId, editingProductQuery.data]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, statusFilter]);

  const queryParams = useMemo(
    () => ({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(categoryFilter && { categoryId: categoryFilter }),
      ...(statusFilter && { status: statusFilter }),
    }),
    [page, debouncedSearch, categoryFilter, statusFilter]
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products(queryParams),
    queryFn: async () => await getProducts(queryParams),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        categoryId: form.categoryId,
        status: form.status,
      };
      if (editingId) return updateProduct(editingId, payload);
      return createProduct(payload);
    },
    onSuccess: async (res) => {
      notifySuccess(res.message || (editingId ? 'Product updated' : 'Product created'));
      await invalidateProducts(qc);
      setDialogOpen(false);
      setFormError('');
    },
    onError: (err) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: async (res) => {
      notifySuccess(res.message || 'Product deleted');
      setDeleteTarget(null);
      await invalidateProducts(qc);
    },
    onError: (err) => notifyError(err.message),
  });

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.sku}</span>,
      },
      { accessorKey: 'price', header: 'Price', cell: ({ row }) => money(row.original.price) },
      { accessorKey: 'stock', header: 'Stock' },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => categoryName(row.original),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.updatedAt)}</span>,
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
                  setEditingId(row.original._id);
                  setForm(productToForm(row.original));
                  setFormError('');
                  setFieldErrors({});
                  setDialogOpen(true);
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
    [deleteMutation]
  );

  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Search updates automatically as you type"
        actions={
          <Button
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setFormError('');
              setFieldErrors({});
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-2 pt-6">
          <ClearableInput
            placeholder="Search name or SKU"
            wrapperClassName="max-w-xs w-full"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClear={() => setSearchInput('')}
          />
          <Select
            value={categoryFilter || 'all'}
            onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            emptyMessage="No products found."
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit product' : 'New product'}</DialogTitle>
          </DialogHeader>
          <DismissibleAlert
            message={formError}
            onDismiss={() => setFormError('')}
          />
          {editingId && editingProductQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading product…</p>
          )}
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const validation = validateProductForm(form);
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
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <RequiredLabel>Price</RequiredLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                  }}
                  onChange={(e) => {
                    const next = handleNonNegativeDecimalInput(e.target.value);
                    if (next === null) return;
                    setForm({ ...form, price: next });
                  }}
                  aria-invalid={!!fieldErrors.price}
                />
                <FieldError message={fieldErrors.price} />
              </div>
              <div className="grid gap-2">
                <RequiredLabel>Stock</RequiredLabel>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === '.' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const next = handleNonNegativeIntegerInput(e.target.value);
                    if (next === null) return;
                    setForm({ ...form, stock: next });
                  }}
                  aria-invalid={!!fieldErrors.stock}
                />
                <FieldError message={fieldErrors.stock} />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <RequiredLabel>Category</RequiredLabel>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-primary"
                  onClick={() => setCategoryDialogOpen(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add category
                </Button>
              </div>
              {categorySelectOptions.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No categories yet.{' '}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => setCategoryDialogOpen(true)}
                  >
                    Create a category
                  </button>{' '}
                  to assign this product.
                </div>
              ) : (
                <Select
                  value={form.categoryId ? form.categoryId : undefined}
                  onValueChange={(v) => setForm({ ...form, categoryId: v })}
                  disabled={editingId && editingProductQuery.isLoading}
                >
                  <SelectTrigger aria-invalid={!!fieldErrors.categoryId}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorySelectOptions.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FieldError message={fieldErrors.categoryId} />
            </div>
            <div className="grid gap-2">
              <RequiredLabel>Status</RequiredLabel>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending || (editingId && editingProductQuery.isLoading)}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSuccess={(category) => {
          if (!category?._id) return;
          const id = String(category._id);
          setForm((prev) => ({ ...prev, categoryId: id }));
          setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
          qc.setQueryData(queryKeys.categories({ limit: '200' }), (old) => {
            if (!old?.data) return old;
            if (old.data.some((c) => String(c._id) === id)) return old;
            return { ...old, data: [...old.data, category] };
          });
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete product?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from the catalog. Products used on orders cannot be deleted.`
            : ''
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

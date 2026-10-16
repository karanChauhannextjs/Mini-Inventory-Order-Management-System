import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '@/api';
import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import TablePagination from '@/components/TablePagination';
import ClearableInput from '@/components/ClearableInput';
import DismissibleAlert from '@/components/DismissibleAlert';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import EmptyListBanner from '@/components/EmptyListBanner';
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
import { invalidateCategories, invalidateProducts } from '@/lib/query-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { notifySuccess } from '@/lib/toast';
import { FieldError, RequiredLabel } from '@/components/FormHelpers';
import { notifyError } from '@/lib/toast';
import { tableEmptyMessage } from '@/lib/list-empty';
import { validateCategoryForm } from '@/lib/validation';
import { formatDate } from '@/utils/format';

const blank = { name: '', description: '' };
const PAGE_SIZE = 10;

export default function CategoriesPage() {
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
    queryKey: queryKeys.categories(params),
    queryFn: () => getCategories(params),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
      };
      return editId ? updateCategory(editId, payload) : createCategory(payload);
    },
    onSuccess: async (res) => {
      notifySuccess(res.message || (editId ? 'Category updated' : 'Category created'));
      await invalidateCategories(qc);
      await invalidateProducts(qc);
      setOpen(false);
      setFormError('');
    },
    onError: (err) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: async (res) => {
      notifySuccess(res.message || 'Category deleted');
      setDeleteTarget(null);
      await invalidateCategories(qc);
      await invalidateProducts(qc);
    },
    onError: (err) => notifyError(err.message),
  });

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => row.original.description || '—',
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
        ),
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
                    description: row.original.description || '',
                  });
                  setFormError('');
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
    [deleteMutation]
  );

  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };
  const hasFilters = Boolean(debouncedSearch);
  const listEmpty = data?.isEmpty === true && !hasFilters;
  const categoriesEmptyMessage = tableEmptyMessage(data?.message, {
    filtered: hasFilters,
    fallback: {
      empty: 'No categories yet. Add a category to organize products.',
      filtered: 'No categories match your search.',
    },
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Manage product categories used in the catalog"
        actions={
          <Button
            onClick={() => {
              setEditId(null);
              setForm(blank);
              setFormError('');
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />Add category
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <ClearableInput
            placeholder="Search categories"
            wrapperClassName="max-w-sm w-full"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClear={() => setSearchInput('')}
          />
        </CardContent>
      </Card>

      {!isLoading && listEmpty && (
        <EmptyListBanner title="No categories yet" description={data?.message} />
      )}

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            emptyMessage={categoriesEmptyMessage}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <DismissibleAlert message={formError} onDismiss={() => setFormError('')} />
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const validation = validateCategoryForm(form);
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
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
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
        title="Delete category?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed. Categories linked to products cannot be deleted.`
            : ''
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

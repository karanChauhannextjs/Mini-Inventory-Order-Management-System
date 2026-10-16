import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createCategory, updateCategory } from '@/api';
import DismissibleAlert from '@/components/DismissibleAlert';
import { FieldError, RequiredLabel } from '@/components/FormHelpers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { invalidateCategories } from '@/lib/query-invalidation';
import { notifyError, notifySuccess } from '@/lib/toast';
import { validateCategoryForm } from '@/lib/validation';

const blank = { name: '', description: '' };

export default function CategoryFormDialog({
  open,
  onOpenChange,
  editId = null,
  initialValues = blank,
  onSuccess,
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(editId ? { ...initialValues } : blank);
    setFormError('');
    setFieldErrors({});
  }, [open, editId, initialValues]);

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
      onSuccess?.(res.data);
      onOpenChange(false);
    },
    onError: (err) => setFormError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
            <RequiredLabel htmlFor="category-form-name">Name</RequiredLabel>
            <Input
              id="category-form-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              aria-invalid={!!fieldErrors.name}
            />
            <FieldError message={fieldErrors.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-form-description">Description (optional)</Label>
            <Input
              id="category-form-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

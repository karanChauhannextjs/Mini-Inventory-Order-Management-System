import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import {
  createOrder,
  getCustomers,
  getOrder,
  getProducts,
  updateOrder,
} from '@/api';
import PageHeader from '@/components/PageHeader';
import PageLoader from '@/components/PageLoader';
import DismissibleAlert from '@/components/DismissibleAlert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { invalidateOrders } from '@/lib/query-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { FieldError, RequiredLabel } from '@/components/FormHelpers';
import { notifyError, notifySuccess } from '@/lib/toast';
import {
  clampLineQuantity,
  getMaxQuantityForLine,
  isProductSelectableOnLine,
  mergeOrderItemsForSubmit,
  validateOrderForm,
} from '@/lib/validation';
import { money } from '@/utils/format';

function emptyLine() {
  return { product: '', quantity: '1' };
}

export default function OrderFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
  const [blocked, setBlocked] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const customersQuery = useQuery({
    queryKey: queryKeys.customers({ limit: '100' }),
    queryFn: () => getCustomers({ limit: '100' }),
  });

  const productsQuery = useQuery({
    queryKey: queryKeys.products({ limit: '100', status: 'Active' }),
    queryFn: () => getProducts({ limit: '100', status: 'Active' }),
  });

  const orderQuery = useQuery({
    queryKey: queryKeys.order(id),
    queryFn: async () => (await getOrder(id)).data,
    enabled: isEdit,
  });

  useEffect(() => {
    if (!orderQuery.data) return;
    if (orderQuery.data.status !== 'Pending') {
      setBlocked('Only pending orders can be edited.');
      return;
    }
    setCustomerId(orderQuery.data.customer._id || orderQuery.data.customer);
    setLines(
      orderQuery.data.items.map((item) => ({
        product: item.product._id || item.product,
        quantity: String(item.quantity),
      }))
    );
  }, [orderQuery.data]);

  const productMap = useMemo(() => {
    const map = {};
    (productsQuery.data?.data || []).forEach((p) => {
      map[p._id] = p;
    });
    return map;
  }, [productsQuery.data]);

  const estimate = useMemo(() => {
    const totals = {};
    lines.forEach((line) => {
      if (!line.product) return;
      const q = parseInt(line.quantity, 10);
      if (!q || q < 1) return;
      totals[line.product] = (totals[line.product] || 0) + q;
    });
    return Object.entries(totals).reduce((sum, [pid, qty]) => {
      const p = productMap[pid];
      return sum + (p ? p.price * qty : 0);
    }, 0);
  }, [lines, productMap]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = mergeOrderItemsForSubmit(lines);
      const payload = { customer: customerId, items };
      if (isEdit) return updateOrder(id, payload);
      return createOrder(payload);
    },
    onSuccess: async (res) => {
      notifySuccess(res.message || (isEdit ? 'Order updated' : 'Order created'));
      await invalidateOrders(qc, { orderId: isEdit ? id : undefined });
      navigate('/orders');
    },
    onError: (err) => setFormError(err.message),
  });

  function updateLine(index, field, value) {
    setLines((prev) => {
      if (field === 'product' && value) {
        const existingIndex = prev.findIndex((row, i) => i !== index && row.product === value);
        if (existingIndex !== -1) {
          const addQty = parseInt(prev[index].quantity, 10) || 1;
          const existingQty = parseInt(prev[existingIndex].quantity, 10) || 0;
          const maxStock = productMap[value]?.stock ?? existingQty + addQty;
          const combinedQty = Math.min(maxStock, existingQty + addQty);

          const next = prev.map((row, i) =>
            i === existingIndex ? { ...row, quantity: String(combinedQty) } : row
          );
          const withoutDuplicate =
            next.length === 1 ? next : next.filter((_, i) => i !== index);

          notifySuccess('Product already on this order — quantities combined into one line.');
          return withoutDuplicate.length > 0 ? withoutDuplicate : [emptyLine()];
        }
      }

      const next = prev.map((row, i) => (i === index ? { ...row, [field]: value } : row));

      if (field === 'product') {
        const maxQty = getMaxQuantityForLine(next, index, productMap);
        const currentQty = parseInt(next[index].quantity, 10);
        if (!maxQty) {
          next[index].quantity = '0';
        } else if (!Number.isInteger(currentQty) || currentQty < 1 || currentQty > maxQty) {
          next[index].quantity = String(Math.min(maxQty, Math.max(1, currentQty || 1)));
        }
      }

      if (field === 'quantity') {
        next[index].quantity = clampLineQuantity(next, index, productMap, value);
      }

      return next;
    });
  }

  const loading = customersQuery.isLoading || productsQuery.isLoading || (isEdit && orderQuery.isLoading);

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit order' : 'New order'}
        description="Each product can only appear once; picking the same product again combines quantities"
        actions={
          <Button variant="outline" asChild>
            <Link to="/orders">Back</Link>
          </Button>
        }
      />

      <DismissibleAlert
        message={blocked || formError}
        onDismiss={() => setFormError('')}
        className="mb-4"
      />

      {loading ? (
        <PageLoader label="Loading order form…" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Order details</CardTitle>
            <CardDescription>Pending orders do not reduce stock until marked completed</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (blocked) return;
                const validation = validateOrderForm(customerId, lines, productMap);
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
              <div className="grid max-w-md gap-2">
                <RequiredLabel>Customer</RequiredLabel>
                <Select value={customerId || undefined} onValueChange={setCustomerId}>
                  <SelectTrigger aria-invalid={!!fieldErrors.customerId}>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customersQuery.data?.data || []).map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name} — {c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={fieldErrors.customerId} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <RequiredLabel>Products</RequiredLabel>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, emptyLine()])}>
                    <Plus className="h-4 w-4" />Add row
                  </Button>
                </div>

                <FieldError message={fieldErrors.items} />

                {lines.map((line, idx) => {
                  const maxQty = getMaxQuantityForLine(lines, idx, productMap);
                  const selectedProduct = line.product ? productMap[line.product] : null;
                  const catalogProducts = productsQuery.data?.data || [];
                  const selectableProducts = catalogProducts.filter((p) =>
                    isProductSelectableOnLine(lines, idx, p._id, productMap)
                  );
                  return (
                  <div
                    key={idx}
                    className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[minmax(0,1fr)_11rem_5.5rem_2.5rem] md:items-start"
                  >
                    <div className="grid gap-1.5 min-w-0">
                      <Label className="text-xs font-medium text-muted-foreground">Product *</Label>
                      <Select value={line.product || undefined} onValueChange={(v) => updateLine(idx, 'product', v)}>
                        <SelectTrigger aria-invalid={!!fieldErrors[`product_${idx}`]}>
                          <SelectValue placeholder="Choose product" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectableProducts.length === 0 ? (
                            <SelectItem value="__unavailable" disabled>
                              No products left for this row
                            </SelectItem>
                          ) : (
                            selectableProducts.map((p) => (
                              <SelectItem key={p._id} value={p._id}>
                                {p.name} ({p.sku}) · {p.stock} in stock
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FieldError message={fieldErrors[`product_${idx}`]} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Quantity *</Label>
                      <Input
                        type="number"
                        className="h-9 tabular-nums"
                        min="1"
                        max={maxQty > 0 ? maxQty : 1}
                        step="1"
                        disabled={!line.product || maxQty < 1}
                        value={line.quantity}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === '.' || e.key === 'e' || e.key === 'E') {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                        aria-invalid={!!fieldErrors[`quantity_${idx}`]}
                      />
                      {selectedProduct ? (
                        <div className="space-y-1 rounded-md border border-dashed border-muted-foreground/25 bg-muted/30 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
                          <div className="flex items-center justify-between gap-2">
                            <span>In stock</span>
                            <span className="font-medium text-foreground">{selectedProduct.stock}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>Max for this line</span>
                            <span className="font-semibold text-foreground">{maxQty}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Select a product to set quantity</p>
                      )}
                      <FieldError message={fieldErrors[`quantity_${idx}`]} />
                    </div>
                    <div className="grid gap-1.5 md:pt-6">
                      <span className="text-xs font-medium text-muted-foreground md:hidden">Unit price</span>
                      <p className="text-sm font-medium tabular-nums">
                        {line.product && productMap[line.product]
                          ? money(productMap[line.product].price)
                          : '—'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() => setLines((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx)))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">Estimated total (current catalog prices)</span>
                <span className="text-lg font-semibold">{money(estimate)}</span>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link to="/orders">Cancel</Link>
                </Button>
                <Button type="submit" disabled={saveMutation.isPending || !!blocked}>
                  {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update order' : 'Create order'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Matches backend `fieldValidators` / Mongoose user & customer email rules */
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^\d{10}$/;

export function isValidEmail(value) {
  if (value === undefined || value === null) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  return EMAIL_RE.test(trimmed);
}

export function sanitizePhoneInput(value) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function firstError(errors) {
  const key = Object.keys(errors)[0];
  return key ? errors[key] : null;
}

export function getProductFormErrors(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Product name is required';
  if (form.price === '' || form.price === null || form.price === undefined) {
    errors.price = 'Price is required';
  } else if (Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
    errors.price = 'Price must be zero or greater';
  }
  if (form.stock === '' || form.stock === null || form.stock === undefined) {
    errors.stock = 'Stock is required';
  } else {
    const stock = Number(form.stock);
    if (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      errors.stock = 'Stock must be a whole number zero or greater';
    }
  }
  if (!form.categoryId?.trim()) errors.categoryId = 'Please select a category';
  if (!form.status) errors.status = 'Status is required';
  return errors;
}

export function validateProductForm(form) {
  const errors = getProductFormErrors(form);
  return { ok: Object.keys(errors).length === 0, errors, message: firstError(errors) };
}

export function getCategoryFormErrors(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Category name is required';
  return errors;
}

export function validateCategoryForm(form) {
  const errors = getCategoryFormErrors(form);
  return { ok: Object.keys(errors).length === 0, errors, message: firstError(errors) };
}

export function getCustomerFormErrors(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Customer name is required';
  if (!form.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Please provide a valid email address';
  }
  if (form.phone?.trim()) {
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length !== 10) errors.phone = 'Phone number must be exactly 10 digits';
    else if (!PHONE_RE.test(digits)) errors.phone = 'Phone number must contain only digits';
  }
  return errors;
}

export function validateCustomerForm(form) {
  const errors = getCustomerFormErrors(form);
  return { ok: Object.keys(errors).length === 0, errors, message: firstError(errors) };
}

export function getLoginFormErrors(form) {
  const errors = {};
  if (!form.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Please provide a valid email address';
  }
  if (!form.password) {
    errors.password = 'Password is required';
  }
  return errors;
}

export function validateLoginForm(form) {
  const errors = getLoginFormErrors(form);
  return { ok: Object.keys(errors).length === 0, errors, message: firstError(errors) };
}

export function getSignupFormErrors(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Name is required';
  if (!form.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Please provide a valid email address';
  }
  if (!form.password) {
    errors.password = 'Password is required';
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm password is required';
  } else if (form.password && form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}

export function validateSignupForm(form) {
  const errors = getSignupFormErrors(form);
  return { ok: Object.keys(errors).length === 0, errors, message: firstError(errors) };
}

export function getLineQuantityUsedElsewhere(lines, lineIndex) {
  const totals = {};
  lines.forEach((line, index) => {
    if (index === lineIndex || !line.product) return;
    const qty = Number(line.quantity);
    if (!Number.isInteger(qty) || qty <= 0) return;
    totals[line.product] = (totals[line.product] || 0) + qty;
  });
  return totals;
}

export function getRemainingStockForLine(lines, lineIndex, productId, productMap) {
  const product = productMap[productId];
  if (!product) return 0;

  const usedElsewhere = getLineQuantityUsedElsewhere(lines, lineIndex)[productId] || 0;
  return Math.max(0, product.stock - usedElsewhere);
}

export function isProductOnAnotherLine(lines, lineIndex, productId) {
  return lines.some((line, index) => index !== lineIndex && line.product === productId);
}

export function isProductSelectableOnLine(lines, lineIndex, productId, productMap) {
  const line = lines[lineIndex];
  if (line?.product === productId) return true;
  if (isProductOnAnotherLine(lines, lineIndex, productId)) return false;

  const product = productMap[productId];
  if (!product || product.stock < 1) return false;
  return true;
}

export function mergeDuplicateOrderLines(lines, productMap = {}) {
  const merged = [];
  const indexByProduct = new Map();

  for (const line of lines) {
    if (!line.product) {
      merged.push({ product: '', quantity: line.quantity || '1' });
      continue;
    }

    const qty = parseInt(line.quantity, 10);
    const safeQty = Number.isInteger(qty) && qty > 0 ? qty : 1;
    const existingIndex = indexByProduct.get(line.product);

    if (existingIndex === undefined) {
      indexByProduct.set(line.product, merged.length);
      merged.push({ product: line.product, quantity: String(safeQty) });
      continue;
    }

    const product = productMap[line.product];
    const maxStock = product?.stock ?? safeQty;
    const combined =
      (parseInt(merged[existingIndex].quantity, 10) || 0) + safeQty;
    merged[existingIndex] = {
      product: line.product,
      quantity: String(Math.min(maxStock, Math.max(1, combined))),
    };
  }

  return merged.length > 0 ? merged : [{ product: '', quantity: '1' }];
}

export function mergeOrderItemsForSubmit(lines) {
  const totals = new Map();

  for (const line of lines) {
    if (!line.product) continue;
    const qty = parseInt(line.quantity, 10);
    if (!Number.isInteger(qty) || qty <= 0) continue;
    totals.set(line.product, (totals.get(line.product) || 0) + qty);
  }

  return Array.from(totals.entries()).map(([product, quantity]) => ({
    product,
    quantity,
  }));
}

export function getMaxQuantityForLine(lines, lineIndex, productMap) {
  const line = lines[lineIndex];
  if (!line?.product) return 0;
  return getRemainingStockForLine(lines, lineIndex, line.product, productMap);
}

export function clampLineQuantity(lines, lineIndex, productMap, rawValue) {
  if (rawValue === '') return '';
  const digitsOnly = String(rawValue).replace(/\D/g, '');
  if (digitsOnly === '') return '';

  const maxQty = getMaxQuantityForLine(lines, lineIndex, productMap);
  let qty = parseInt(digitsOnly, 10);
  if (Number.isNaN(qty) || qty < 1) qty = 1;
  if (maxQty === 0) return '0';
  if (qty > maxQty) qty = maxQty;
  return String(qty);
}

export function getOrderFormErrors(customerId, lines, productMap = {}) {
  const errors = {};
  if (!customerId) errors.customerId = 'Please select a customer';

  const filled = lines.filter((l) => l.product);
  if (filled.length === 0) {
    errors.items = 'Add at least one product line';
  }

  const totalsByProduct = {};
  const seenProducts = new Set();

  lines.forEach((line, index) => {
    const qty = Number(line.quantity);
    if (!line.product) {
      if (line.quantity && line.quantity !== '1') {
        errors[`product_${index}`] = 'Please select a product';
      }
      return;
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      errors[`quantity_${index}`] = 'Quantity must be a positive whole number';
      return;
    }

    if (seenProducts.has(line.product)) {
      errors[`product_${index}`] =
        'This product is already on the order. Use one line and increase quantity instead.';
      return;
    }
    seenProducts.add(line.product);

    totalsByProduct[line.product] = (totalsByProduct[line.product] || 0) + qty;

    const maxQty = getMaxQuantityForLine(lines, index, productMap);
    if (qty > maxQty) {
      const product = productMap[line.product];
      const name = product?.name || 'Product';
      const stock = product?.stock ?? 0;
      errors[`quantity_${index}`] =
        maxQty === 0
          ? `"${name}" has no stock left for this line`
          : `Max ${maxQty} for this line (${stock} in stock across all rows)`;
    }
  });

  Object.entries(totalsByProduct).forEach(([productId, totalQty]) => {
    const product = productMap[productId];
    if (product && totalQty > product.stock) {
      lines.forEach((line, index) => {
        if (line.product === productId && !errors[`quantity_${index}`]) {
          errors[`quantity_${index}`] =
            `Total for "${product.name}" is ${totalQty}; only ${product.stock} in stock`;
        }
      });
    }
  });

  return errors;
}

export function validateOrderForm(customerId, lines, productMap = {}) {
  const errors = getOrderFormErrors(customerId, lines, productMap);
  return { ok: Object.keys(errors).length === 0, errors, message: firstError(errors) };
}

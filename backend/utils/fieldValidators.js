const AppError = require('../middleware/AppError');

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^\d{10}$/;

const requireString = (value, label) => {
  if (value === undefined || value === null || !String(value).trim()) {
    throw new AppError(`${label} is required`, 400);
  }
  return String(value).trim();
};

const validateEmail = (value, label = 'Email') => {
  const email = requireString(value, label).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new AppError('Please provide a valid email address', 400);
  }
  return email;
};

const validateOptionalPhone = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const digits = String(value).replace(/\D/g, '');
  if (!PHONE_RE.test(digits)) {
    throw new AppError('Phone number must be exactly 10 digits', 400);
  }
  return digits;
};

const validateNonNegativeNumber = (value, label, { integer = false } = {}) => {
  if (value === undefined || value === null || value === '') {
    throw new AppError(`${label} is required`, 400);
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new AppError(`${label} must be a number`, 400);
  }
  if (num < 0) {
    throw new AppError(`${label} cannot be negative`, 400);
  }
  if (integer && !Number.isInteger(num)) {
    throw new AppError(`${label} must be a whole number`, 400);
  }
  return num;
};

const validateCategoryPayload = (body) => ({
  name: requireString(body.name, 'Category name'),
  description: body.description?.trim() || '',
});

const validateCustomerPayload = (body, { isUpdate = false } = {}) => {
  const payload = {};

  if (!isUpdate || body.name !== undefined) {
    payload.name = requireString(body.name, 'Customer name');
  }
  if (!isUpdate || body.email !== undefined) {
    payload.email = validateEmail(body.email);
  }
  if (!isUpdate || body.phone !== undefined) {
    const phone = validateOptionalPhone(body.phone);
    if (phone) payload.phone = phone;
    else if (body.phone === '') payload.phone = '';
  }

  return payload;
};

const validateProductPayload = (body, { isUpdate = false } = {}) => {
  const payload = {};

  if (!isUpdate || body.name !== undefined) {
    payload.name = requireString(body.name, 'Product name');
  }
  if (!isUpdate || body.price !== undefined) {
    payload.price = validateNonNegativeNumber(body.price, 'Price');
  }
  if (!isUpdate || body.stock !== undefined) {
    payload.stock = validateNonNegativeNumber(body.stock, 'Stock', { integer: true });
  }
  if (!isUpdate || body.status !== undefined) {
    if (!body.status) {
      throw new AppError('Status is required', 400);
    }
    if (!['Active', 'Inactive'].includes(body.status)) {
      throw new AppError('Status must be Active or Inactive', 400);
    }
    payload.status = body.status;
  }

  return payload;
};

module.exports = {
  validateCategoryPayload,
  validateCustomerPayload,
  validateProductPayload,
  validateEmail,
  validateOptionalPhone,
  requireString,
};

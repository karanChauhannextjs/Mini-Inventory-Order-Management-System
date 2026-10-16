const { randomBytes } = require('crypto');

const abbreviateToken = (token) => {
  const cleaned = String(token).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!cleaned) return '';
  if (cleaned.length <= 3) return cleaned;

  const consonants = cleaned.replace(/[AEIOU]/g, '');
  if (consonants.length >= 3) return consonants.slice(0, 3);
  return cleaned.slice(0, 3);
};

const generateSkuFromName = (name) => {
  const tokens = String(name)
    .trim()
    .split(/[\s_/]+/)
    .filter(Boolean);

  const parts = tokens.map(abbreviateToken).filter(Boolean);
  if (parts.length === 0) return 'PRD';
  return parts.join('-');
};

const randomSkuSuffix = () => randomBytes(3).toString('hex').toUpperCase();

const assignUniqueSku = async (name, Product, ownerId, excludeId = null) => {
  const base = generateSkuFromName(name);
  let candidate = base;
  let suffix = 2;
  const maxSequentialAttempts = 500;

  for (let attempt = 0; attempt < maxSequentialAttempts; attempt += 1) {
    const filter = { sku: candidate, owner: ownerId };
    if (excludeId) filter._id = { $ne: excludeId };

    const exists = await Product.exists(filter);
    if (!exists) return candidate;

    candidate = `${base}-${String(suffix).padStart(3, '0')}`;
    suffix += 1;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `${base}-${randomSkuSuffix()}`;
    const filter = { sku: candidate, owner: ownerId };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Product.exists(filter);
    if (!exists) return candidate;
  }

  return `${base}-${Date.now().toString(36).toUpperCase()}`;
};

module.exports = {
  generateSkuFromName,
  assignUniqueSku,
};

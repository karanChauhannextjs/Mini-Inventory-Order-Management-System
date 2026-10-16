const { generateSkuFromName } = require('../utils/skuGenerator');

describe('generateSkuFromName', () => {
  test('abbreviates multi-word product names', () => {
    expect(generateSkuFromName('Nike T-Shirt')).toBe('NIK-TSH');
  });

  test('handles single-word names', () => {
    expect(generateSkuFromName('Widget')).toBe('WDG');
  });
});

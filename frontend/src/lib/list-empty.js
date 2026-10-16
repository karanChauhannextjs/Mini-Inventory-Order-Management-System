export function tableEmptyMessage(apiMessage, { filtered, fallback }) {
  if (filtered) {
    return fallback?.filtered || 'No results match your search or filters.';
  }
  return apiMessage || fallback?.empty || 'No data yet.';
}

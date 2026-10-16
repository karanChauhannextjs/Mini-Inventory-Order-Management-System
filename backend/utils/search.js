const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const caseInsensitiveRegex = (value) => new RegExp(escapeRegex(value), 'i');

module.exports = {
  escapeRegex,
  caseInsensitiveRegex,
};

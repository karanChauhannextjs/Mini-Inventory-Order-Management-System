const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const parsePositiveInt = (value, fieldName) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return { error: `${fieldName} must be a positive integer` };
  }
  return { value: num };
};

const parsePagination = (query) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;

  return { page, limit, skip: (page - 1) * limit };
};

module.exports = {
  isValidObjectId,
  parsePositiveInt,
  parsePagination,
};

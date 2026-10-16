const AppError = require('../middleware/AppError');

const ownerQuery = (ownerId, extra = {}) => ({
  owner: ownerId,
  ...extra,
});

const findOwnedById = async (Model, id, ownerId, label = 'Resource') => {
  const doc = await Model.findOne(ownerQuery(ownerId, { _id: id }));
  if (!doc) {
    throw new AppError(`${label} not found`, 404);
  }
  return doc;
};

module.exports = {
  ownerQuery,
  findOwnedById,
};

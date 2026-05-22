const mongoose = require('mongoose');

const READ_ONLY_FIELDS = new Set([
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'lastUpdatedAt',
  'documents',
  'media',
  'images',
]);

/**
 * When the frontend re-posts a GET response via FormData, reference fields
 * often arrive as JSON strings of populated documents. Extract a valid ObjectId or skip.
 */
const resolveObjectId = (value) => {
  if (value == null || value === '') return undefined;

  if (typeof value === 'object' && value._id) {
    return mongoose.Types.ObjectId.isValid(value._id) ? String(value._id) : undefined;
  }

  if (typeof value === 'string') {
    if (mongoose.Types.ObjectId.isValid(value) && value.length === 24) {
      return value;
    }
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed._id && mongoose.Types.ObjectId.isValid(parsed._id)) {
        return String(parsed._id);
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
};

/**
 * Returns true if the value looks like a serialized nested document/array
 * from a prior API response (not a simple scalar field).
 */
const isSerializedNestedValue = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
};

/**
 * Pick only allowed scalar fields from multipart/json body for PATCH/PUT updates.
 */
const pickUpdateFields = (body, allowedFields, options = {}) => {
  const { skipFields = [], referenceFields = [] } = options;
  const skip = new Set([...READ_ONLY_FIELDS, ...skipFields]);
  const refs = new Set(referenceFields);
  const result = {};

  for (const field of allowedFields) {
    if (skip.has(field)) continue;
    if (!(field in body)) continue;

    const value = body[field];
    if (value === undefined || value === '') continue;

    if (refs.has(field)) {
      const id = resolveObjectId(value);
      if (id) result[field] = id;
      continue;
    }

    if (isSerializedNestedValue(value)) continue;

    result[field] = value;
  }

  return result;
};

module.exports = {
  pickUpdateFields,
  resolveObjectId,
  isSerializedNestedValue,
  READ_ONLY_FIELDS,
};

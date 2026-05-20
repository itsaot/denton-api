/**
 * Shared OpenAPI fragments for path modules (frontend / codegen friendly).
 */

const idParam = (name = 'id', description = 'MongoDB ObjectId') => [
  { name, in: 'path', required: true, schema: { type: 'string', example: '507f1f77bcf86cd799439011' }, description },
];

const subIdParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string', example: '507f1f77bcf86cd799439012' },
  description,
});

const standardErrorResponses = {
  400: {
    description: 'Validation or bad request',
    content: {
      'application/json': {
        schema: { oneOf: [{ $ref: '#/components/schemas/ValidationErrors' }, { $ref: '#/components/schemas/ErrorMessage' }] },
      },
    },
  },
  401: {
    description: 'Missing or invalid JWT',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorMessage' } } },
  },
  403: {
    description: 'Forbidden (insufficient role)',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorMessage' } } },
  },
  404: {
    description: 'Resource not found',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorMessage' } } },
  },
  500: {
    description: 'Server error',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorMessage' } } },
  },
};

const multipartFrontendNote =
  '**Frontend (multipart):** Use `FormData`. Send numbers and booleans as strings. ' +
  'For nested objects (`rates`, `rental`, `coordinates`), send a JSON string field. ' +
  'File fields: repeat the same key for multiple files (`images`, `documents`, `media`) or use `images[]` per your HTTP client. ' +
  'To remove attachments on update, send `deleteImageIds`, `deleteDocumentIds`, or `deleteMediaIds` as a JSON array string or comma-separated subdocument `_id` values from the last GET response.';

const deleteIdsField = (name, target) => ({
  type: 'string',
  description: `Subdocument _id values to remove from ${target}. JSON array string e.g. ["id1","id2"] or comma-separated.`,
  example: '["507f1f77bcf86cd799439011"]',
});

const binaryFileField = (name, maxItems = 10) => ({
  type: 'array',
  maxItems,
  items: { type: 'string', format: 'binary' },
  description: `Upload up to ${maxItems} files`,
});

module.exports = {
  idParam,
  subIdParam,
  standardErrorResponses,
  multipartFrontendNote,
  deleteIdsField,
  binaryFileField,
};

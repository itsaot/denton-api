const {
  idParam,
  subIdParam,
  standardErrorResponses,
  multipartFrontendNote,
  deleteIdsField,
  binaryFileField,
} = require('../openapi.shared');

const err = standardErrorResponses;

module.exports = {
  '/api/mines': {
    get: {
      operationId: 'listMines',
      tags: ['Mines'],
      summary: 'List mines',
      description: 'Filter by owner, commodity, status, or price range.',
      security: [],
      parameters: [
        { name: 'owner', in: 'query', schema: { type: 'string' }, description: 'Owner user ObjectId' },
        { name: 'commodityType', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['Active', 'Idle', 'Exploration', 'Development'] } },
        { name: 'minPrice', in: 'query', schema: { type: 'number' } },
        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
      ],
      responses: {
        200: {
          description: 'Array of mines',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Mine' } },
            },
          },
        },
        ...err,
      },
    },
    post: {
      operationId: 'createMine',
      tags: ['Mines'],
      summary: 'Create mine',
      description: multipartFrontendNote,
      security: [],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['owner', 'name', 'location', 'commodityType', 'price'],
              properties: {
                owner: { type: 'string', description: 'User ObjectId', example: '507f1f77bcf86cd799439011' },
                name: { type: 'string', example: 'West Rand Mine' },
                location: { type: 'string', example: 'Johannesburg, South Africa' },
                commodityType: { type: 'string', example: 'Gold' },
                price: { type: 'string', description: 'Numeric string', example: '2500000' },
                status: { type: 'string', enum: ['Active', 'Idle', 'Exploration', 'Development'] },
                description: { type: 'string' },
                documents: binaryFileField('documents'),
                media: binaryFileField('media'),
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Created mine',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Mine' } } },
        },
        400: err[400],
        500: err[500],
      },
    },
  },
  '/api/mines/{id}': {
    get: {
      operationId: 'getMineById',
      tags: ['Mines'],
      summary: 'Get mine by ID',
      security: [],
      parameters: idParam(),
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Mine' } } } },
        400: err[400],
        404: err[404],
      },
    },
    put: {
      operationId: 'updateMine',
      tags: ['Mines'],
      summary: 'Update mine',
      description:
        'Update text fields and optionally add or remove attachments in one request.\n\n' + multipartFrontendNote,
      security: [],
      parameters: idParam(),
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                location: { type: 'string' },
                commodityType: { type: 'string' },
                price: { type: 'string' },
                status: { type: 'string', enum: ['Active', 'Idle', 'Exploration', 'Development'] },
                description: { type: 'string' },
                deleteDocumentIds: deleteIdsField('deleteDocumentIds', 'documents'),
                deleteMediaIds: deleteIdsField('deleteMediaIds', 'media'),
                documents: binaryFileField('documents'),
                media: binaryFileField('media'),
              },
            },
          },
        },
      },
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Mine' } } } },
        400: err[400],
        404: err[404],
        500: err[500],
      },
    },
    delete: {
      operationId: 'deleteMine',
      tags: ['Mines'],
      summary: 'Delete mine',
      description: 'Deletes the mine and removes associated files from storage.',
      security: [],
      parameters: idParam(),
      responses: {
        200: {
          description: 'Deleted',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { message: { type: 'string', example: 'Mine deleted successfully' } },
              },
            },
          },
        },
        400: err[400],
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/mines/{id}/documents': {
    patch: {
      operationId: 'addMineDocuments',
      tags: ['Mines'],
      summary: 'Add documents to mine',
      security: [],
      parameters: idParam(),
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['documents'],
              properties: { documents: binaryFileField('documents') },
            },
          },
        },
      },
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Mine' } } } },
        400: err[400],
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/mines/{id}/media': {
    patch: {
      operationId: 'addMineMedia',
      tags: ['Mines'],
      summary: 'Add pictures (media) to mine',
      security: [],
      parameters: idParam(),
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['media'],
              properties: { media: binaryFileField('media') },
            },
          },
        },
      },
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Mine' } } } },
        400: err[400],
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/mines/{id}/documents/{docId}': {
    delete: {
      operationId: 'deleteMineDocument',
      tags: ['Mines'],
      summary: 'Delete a document',
      security: [],
      parameters: [...idParam(), subIdParam('docId', 'Document subdocument _id from mine.documents[]._id')],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteMessageResponse' } } } },
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/mines/{id}/media/{mediaId}': {
    delete: {
      operationId: 'deleteMineMedia',
      tags: ['Mines'],
      summary: 'Delete a picture (media item)',
      security: [],
      parameters: [...idParam(), subIdParam('mediaId', 'Media subdocument _id from mine.media[]._id')],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteMessageResponse' } } } },
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/mines/owner/{ownerId}': {
    get: {
      operationId: 'listMinesByOwner',
      tags: ['Mines'],
      summary: 'List mines by owner',
      security: [],
      parameters: [subIdParam('ownerId', 'Owner user ObjectId')],
      responses: {
        200: {
          content: {
            'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Mine' } } },
          },
        },
        400: err[400],
        500: err[500],
      },
    },
  },
  '/api/mines/search/{query}': {
    get: {
      operationId: 'searchMines',
      tags: ['Mines'],
      summary: 'Search mines by name or location',
      security: [],
      parameters: [{ name: 'query', in: 'path', required: true, schema: { type: 'string' }, example: 'johannesburg' }],
      responses: {
        200: {
          content: {
            'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Mine' } } },
          },
        },
        500: err[500],
      },
    },
  },
};

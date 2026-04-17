const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }];

module.exports = {
  '/api/mines': {
    get: {
      tags: ['Mines'],
      summary: 'List mines',
      security: [],
      parameters: [
        { name: 'owner', in: 'query', schema: { type: 'string' } },
        { name: 'commodityType', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'minPrice', in: 'query', schema: { type: 'number' } },
        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
      ],
      responses: {
        200: {
          description: 'Array of mines',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Mine' } } } },
        },
      },
    },
    post: {
      tags: ['Mines'],
      summary: 'Create mine (multipart)',
      description:
        'Form fields: owner, name, location, commodityType, price, optional status/description. Files: documents[], media[] (max 10 each).',
      security: [],
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['owner', 'name', 'location', 'commodityType', 'price'],
              properties: {
                owner: { type: 'string', description: 'User ObjectId' },
                name: { type: 'string' },
                location: { type: 'string' },
                commodityType: { type: 'string' },
                price: { type: 'string', description: 'Numeric string' },
                status: { type: 'string', enum: ['Active', 'Idle', 'Exploration', 'Development'] },
                description: { type: 'string' },
                documents: { type: 'array', items: { type: 'string', format: 'binary' } },
                media: { type: 'array', items: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
      },
      responses: {
        201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Mine' } } } },
        400: { description: 'Validation' },
        500: { description: 'Upload or server error' },
      },
    },
  },
  '/api/mines/{id}': {
    get: {
      tags: ['Mines'],
      summary: 'Get mine by ID',
      security: [],
      parameters: idParam,
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Mine' } } } },
        400: { description: 'Invalid ID' },
        404: { description: 'Not found' },
      },
    },
    put: {
      tags: ['Mines'],
      summary: 'Update mine (optional new documents/media)',
      security: [],
      parameters: idParam,
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
                status: { type: 'string' },
                description: { type: 'string' },
                documents: { type: 'array', items: { type: 'string', format: 'binary' } },
                media: { type: 'array', items: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
      },
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Mine' } } } },
        400: { description: 'Validation' },
        404: { description: 'Not found' },
      },
    },
    delete: {
      tags: ['Mines'],
      summary: 'Delete mine',
      security: [],
      parameters: idParam,
      responses: {
        200: { description: 'Deleted' },
        400: { description: 'Invalid ID' },
        404: { description: 'Not found' },
      },
    },
  },
  '/api/mines/{id}/documents': {
    patch: {
      tags: ['Mines'],
      summary: 'Append documents',
      security: [],
      parameters: idParam,
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: { documents: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 10 } },
            },
          },
        },
      },
      responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Mine' } } } } },
    },
  },
  '/api/mines/{id}/media': {
    patch: {
      tags: ['Mines'],
      summary: 'Append media',
      security: [],
      parameters: idParam,
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: { media: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 10 } },
            },
          },
        },
      },
      responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Mine' } } } } },
    },
  },
  '/api/mines/{id}/documents/{docId}': {
    delete: {
      tags: ['Mines'],
      summary: 'Remove document by id',
      security: [],
      parameters: [
        ...idParam,
        { name: 'docId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Updated mine' } },
    },
  },
  '/api/mines/{id}/media/{mediaId}': {
    delete: {
      tags: ['Mines'],
      summary: 'Remove media by id',
      security: [],
      parameters: [
        ...idParam,
        { name: 'mediaId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Updated mine' } },
    },
  },
  '/api/mines/owner/{ownerId}': {
    get: {
      tags: ['Mines'],
      summary: 'Mines by owner',
      security: [],
      parameters: [{ name: 'ownerId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Mine' } } } } } },
    },
  },
  '/api/mines/search/{query}': {
    get: {
      tags: ['Mines'],
      summary: 'Search mines (implementation-specific)',
      security: [],
      parameters: [{ name: 'query', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Search results' } },
    },
  },
};

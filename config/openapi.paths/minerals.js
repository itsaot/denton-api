const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }];

module.exports = {
  '/api/minerals/stats': {
    get: {
      tags: ['Minerals'],
      summary: 'Aggregate stats by mineral type',
      security: [],
      responses: {
        200: {
          description: 'stats array',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
  '/api/minerals/minerals-within/{distance}/center/{latlng}/unit/{unit}': {
    get: {
      tags: ['Minerals'],
      summary: 'Minerals within radius of lat,lng',
      security: [],
      parameters: [
        { name: 'distance', in: 'path', required: true, schema: { type: 'number' } },
        { name: 'latlng', in: 'path', required: true, schema: { type: 'string', example: '-26.2,28.0' } },
        { name: 'unit', in: 'path', required: true, schema: { type: 'string', enum: ['mi', 'km'] } },
      ],
      responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralListResponse' } } } } },
    },
  },
  '/api/minerals': {
    get: {
      tags: ['Minerals'],
      summary: 'List minerals (filter, sort, paginate)',
      description:
        'Supports API-style query filters (e.g. pricePerTonne[gte]=100), sort, limit, page, fields.',
      security: [],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'sort', in: 'query', schema: { type: 'string' } },
        { name: 'fields', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralListResponse' } } } },
      },
    },
    post: {
      tags: ['Minerals'],
      summary: 'Create mineral (admin / mineral-manager)',
      security: [{ bearerAuth: [] }],
      description:
        'Multipart: text fields per Mineral model; images[] files; coordinates often as JSON array string; uses field uses as comma-separated string.',
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['name', 'mineralType', 'chemicalFormula', 'description', 'pricePerTonne', 'availableTonnes', 'color', 'createdBy'],
              properties: {
                name: { type: 'string' },
                mineralType: { type: 'string' },
                chemicalFormula: { type: 'string' },
                description: { type: 'string' },
                pricePerTonne: { type: 'string' },
                availableTonnes: { type: 'string' },
                color: { type: 'string' },
                createdBy: { type: 'string' },
                coordinates: { type: 'string', description: 'JSON array [lng, lat]' },
                address: { type: 'string' },
                country: { type: 'string' },
                uses: { type: 'string', description: 'Comma-separated' },
                images: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 10 },
              },
            },
          },
        },
      },
      responses: {
        201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        400: { description: 'Validation' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden role' },
      },
    },
  },
  '/api/minerals/{id}': {
    get: {
      tags: ['Minerals'],
      summary: 'Get mineral',
      security: [],
      parameters: idParam,
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        404: { description: 'Not found' },
      },
    },
    patch: {
      tags: ['Minerals'],
      summary: 'Update mineral',
      security: [{ bearerAuth: [] }],
      parameters: idParam,
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: { type: 'object', additionalProperties: true, properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } } } },
          },
        },
      },
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
    delete: {
      tags: ['Minerals'],
      summary: 'Delete mineral (admin)',
      security: [{ bearerAuth: [] }],
      parameters: idParam,
      responses: { 204: { description: 'No content or JSON body per implementation' }, 401: {}, 403: {} },
    },
  },
  '/api/minerals/{id}/images': {
    patch: {
      tags: ['Minerals'],
      summary: 'Add images',
      security: [{ bearerAuth: [] }],
      parameters: idParam,
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: { type: 'object', properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } } } },
          },
        },
      },
      responses: { 200: { description: 'Updated' } },
    },
  },
  '/api/minerals/{id}/images/{imageId}': {
    delete: {
      tags: ['Minerals'],
      summary: 'Delete image',
      security: [{ bearerAuth: [] }],
      parameters: [
        ...idParam,
        { name: 'imageId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'OK' } },
    },
  },
  '/api/minerals/{id}/images/{imageId}/primary': {
    patch: {
      tags: ['Minerals'],
      summary: 'Set primary image',
      security: [{ bearerAuth: [] }],
      parameters: [
        ...idParam,
        { name: 'imageId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'OK' } },
    },
  },
  '/api/minerals/type/{mineralType}': {
    get: {
      tags: ['Minerals'],
      summary: 'List by mineral type',
      security: [],
      parameters: [{ name: 'mineralType', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Array or wrapped list' } },
    },
  },
  '/api/minerals/search/{query}': {
    get: {
      tags: ['Minerals'],
      summary: 'Search minerals',
      security: [],
      parameters: [{ name: 'query', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Results' } },
    },
  },
};

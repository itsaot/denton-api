const {
  idParam,
  subIdParam,
  standardErrorResponses,
  multipartFrontendNote,
  deleteIdsField,
  binaryFileField,
} = require('../openapi.shared');

const err = standardErrorResponses;

const mineralFormFields = {
  name: { type: 'string', example: 'Gold' },
  mineralType: {
    type: 'string',
    enum: ['metallic', 'non-metallic', 'precious', 'industrial', 'energy', 'gemstone'],
  },
  chemicalFormula: { type: 'string', example: 'Au' },
  description: { type: 'string' },
  pricePerTonne: { type: 'string', example: '65000' },
  availableTonnes: { type: 'string', example: '120' },
  color: { type: 'string', example: 'yellow' },
  hardness: { type: 'string' },
  density: { type: 'string' },
  mohsHardness: { type: 'string' },
  specificGravity: { type: 'string' },
  luster: { type: 'string' },
  crystalSystem: { type: 'string' },
  cleavage: { type: 'string' },
  fracture: { type: 'string' },
  streak: { type: 'string' },
  transparency: { type: 'string' },
  rarity: { type: 'string', enum: ['common', 'uncommon', 'rare', 'very-rare'] },
  miningMethod: { type: 'string' },
  coordinates: {
    type: 'string',
    description: 'JSON array [longitude, latitude]',
    example: '[28.0473,-26.2041]',
  },
  address: { type: 'string' },
  country: { type: 'string' },
  uses: { type: 'string', description: 'Comma-separated list', example: 'jewelry,electronics' },
  createdBy: { type: 'string', description: 'User ObjectId (required on create)' },
};

module.exports = {
  '/api/minerals/stats': {
    get: {
      operationId: 'getMineralStats',
      tags: ['Minerals'],
      summary: 'Aggregate stats by mineral type',
      security: [],
      responses: {
        200: {
          description: 'Grouped statistics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      stats: { type: 'array', items: { type: 'object', additionalProperties: true } },
                    },
                  },
                },
              },
            },
          },
        },
        400: err[400],
      },
    },
  },
  '/api/minerals/minerals-within/{distance}/center/{latlng}/unit/{unit}': {
    get: {
      operationId: 'getMineralsWithinRadius',
      tags: ['Minerals'],
      summary: 'Minerals within radius',
      security: [],
      parameters: [
        { name: 'distance', in: 'path', required: true, schema: { type: 'number' }, example: 50 },
        { name: 'latlng', in: 'path', required: true, schema: { type: 'string' }, example: '-26.2041,28.0473' },
        { name: 'unit', in: 'path', required: true, schema: { type: 'string', enum: ['mi', 'km'] } },
      ],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralListResponse' } } } },
        400: err[400],
      },
    },
  },
  '/api/minerals': {
    get: {
      operationId: 'listMinerals',
      tags: ['Minerals'],
      summary: 'List minerals',
      description: 'Supports filter (e.g. `pricePerTonne[gte]=100`), `sort`, `page`, `limit`, `fields`.',
      security: [],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
        { name: 'sort', in: 'query', schema: { type: 'string', example: '-pricePerTonne' } },
        { name: 'fields', in: 'query', schema: { type: 'string', example: 'name,pricePerTonne,images' } },
      ],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralListResponse' } } } },
        400: err[400],
      },
    },
    post: {
      operationId: 'createMineral',
      tags: ['Minerals'],
      summary: 'Create mineral',
      description: 'Requires role `admin` or `mineral-manager`.\n\n' + multipartFrontendNote,
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: [
                'name',
                'mineralType',
                'chemicalFormula',
                'description',
                'pricePerTonne',
                'availableTonnes',
                'color',
                'createdBy',
                'coordinates',
              ],
              properties: {
                ...mineralFormFields,
                images: binaryFileField('images'),
                documents: binaryFileField('documents'),
              },
            },
          },
        },
      },
      responses: {
        201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        400: err[400],
        401: err[401],
        403: err[403],
        500: err[500],
      },
    },
  },
  '/api/minerals/{id}': {
    get: {
      operationId: 'getMineralById',
      tags: ['Minerals'],
      summary: 'Get mineral by ID',
      security: [],
      parameters: idParam(),
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        404: err[404],
      },
    },
    patch: {
      operationId: 'updateMineral',
      tags: ['Minerals'],
      summary: 'Update mineral',
      description:
        'Update fields and manage images/documents. Requires `admin` or `mineral-manager`.\n\n' +
        multipartFrontendNote,
      security: [{ bearerAuth: [] }],
      parameters: idParam(),
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                ...mineralFormFields,
                deleteImageIds: deleteIdsField('deleteImageIds', 'images'),
                deleteDocumentIds: deleteIdsField('deleteDocumentIds', 'documents'),
                images: binaryFileField('images'),
                documents: binaryFileField('documents'),
              },
            },
          },
        },
      },
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        400: err[400],
        401: err[401],
        403: err[403],
        404: err[404],
      },
    },
    delete: {
      operationId: 'deleteMineral',
      tags: ['Minerals'],
      summary: 'Delete mineral',
      description: 'Admin only. Removes mineral and stored files.',
      security: [{ bearerAuth: [] }],
      parameters: idParam(),
      responses: {
        204: { description: 'Deleted (empty body)' },
        401: err[401],
        403: err[403],
        404: err[404],
      },
    },
  },
  '/api/minerals/{id}/images': {
    patch: {
      operationId: 'addMineralImages',
      tags: ['Minerals'],
      summary: 'Add images',
      security: [{ bearerAuth: [] }],
      parameters: idParam(),
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['images'],
              properties: { images: binaryFileField('images') },
            },
          },
        },
      },
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        400: err[400],
        401: err[401],
        403: err[403],
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/minerals/{id}/images/{imageId}': {
    delete: {
      operationId: 'deleteMineralImage',
      tags: ['Minerals'],
      summary: 'Delete image',
      security: [{ bearerAuth: [] }],
      parameters: [...idParam(), subIdParam('imageId', 'Image _id from mineral.images[]._id')],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        401: err[401],
        403: err[403],
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/minerals/{id}/documents': {
    patch: {
      operationId: 'addMineralDocuments',
      tags: ['Minerals'],
      summary: 'Add documents',
      security: [{ bearerAuth: [] }],
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
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        400: err[400],
        401: err[401],
        403: err[403],
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/minerals/{id}/documents/{docId}': {
    delete: {
      operationId: 'deleteMineralDocument',
      tags: ['Minerals'],
      summary: 'Delete document',
      security: [{ bearerAuth: [] }],
      parameters: [...idParam(), subIdParam('docId', 'Document _id from mineral.documents[]._id')],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        401: err[401],
        403: err[403],
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/minerals/{id}/images/{imageId}/primary': {
    patch: {
      operationId: 'setMineralPrimaryImage',
      tags: ['Minerals'],
      summary: 'Set primary image',
      security: [{ bearerAuth: [] }],
      parameters: [...idParam(), subIdParam('imageId', 'Image _id to mark as primary')],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralSingleResponse' } } } },
        401: err[401],
        403: err[403],
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/minerals/type/{mineralType}': {
    get: {
      operationId: 'listMineralsByType',
      tags: ['Minerals'],
      summary: 'List by mineral type',
      security: [],
      parameters: [
        {
          name: 'mineralType',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['metallic', 'non-metallic', 'precious', 'industrial', 'energy', 'gemstone'],
          },
        },
      ],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralListResponse' } } } },
        500: err[500],
      },
    },
  },
  '/api/minerals/search/{query}': {
    get: {
      operationId: 'searchMinerals',
      tags: ['Minerals'],
      summary: 'Search minerals',
      security: [],
      parameters: [{ name: 'query', in: 'path', required: true, schema: { type: 'string' }, example: 'gold' }],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MineralListResponse' } } } },
        500: err[500],
      },
    },
  },
};

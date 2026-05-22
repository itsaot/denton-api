const {
  idParam,
  subIdParam,
  standardErrorResponses,
  multipartFrontendNote,
  deleteIdsField,
  binaryFileField,
} = require('../openapi.shared');

const err = standardErrorResponses;

const yellowMachineFormFields = {
  owner: { type: 'string', example: '507f1f77bcf86cd799439011' },
  name: { type: 'string', example: 'CAT 320 Excavator' },
  establishmentFee: { type: 'string', example: '5000' },
  brand: { type: 'string', example: 'Caterpillar' },
  age: { type: 'string', example: '8', description: 'Years' },
  mileage: { type: 'string', example: '12500' },
  rentalAvailable: { type: 'string', enum: ['true', 'false'], example: 'true' },
  rentalDuration: { type: 'string', example: '6 months' },
  rental: {
    type: 'string',
    description: 'Alternative to rentalAvailable/rentalDuration — JSON: {"available":true,"duration":"6 months"}',
    example: '{"available":true,"duration":"6 months"}',
  },
  forSale: { type: 'string', enum: ['true', 'false'], example: 'false' },
  rates: {
    type: 'string',
    description: 'JSON object with hourly, daily, weekly, monthly numbers',
    example: '{"hourly":150,"daily":1200,"weekly":7000,"monthly":25000}',
  },
  description: { type: 'string' },
};

module.exports = {
  '/api/yellow-machines': {
    get: {
      operationId: 'listYellowMachines',
      tags: ['Yellow Machines'],
      summary: 'List yellow machines',
      security: [],
      parameters: [
        { name: 'owner', in: 'query', schema: { type: 'string' } },
        { name: 'brand', in: 'query', schema: { type: 'string' } },
        { name: 'forSale', in: 'query', schema: { type: 'boolean' } },
        { name: 'rentalAvailable', in: 'query', schema: { type: 'boolean' } },
        { name: 'minEstablishmentFee', in: 'query', schema: { type: 'number' } },
        { name: 'maxEstablishmentFee', in: 'query', schema: { type: 'number' } },
      ],
      responses: {
        200: {
          description: 'Array of yellow machines',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/YellowMachine' } },
            },
          },
        },
        500: err[500],
      },
    },
    post: {
      operationId: 'createYellowMachine',
      tags: ['Yellow Machines'],
      summary: 'Create yellow machine',
      description: multipartFrontendNote,
      security: [],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['owner', 'name', 'establishmentFee', 'brand'],
              properties: {
                ...yellowMachineFormFields,
                documents: binaryFileField('documents'),
                media: binaryFileField('media'),
              },
            },
          },
        },
      },
      responses: {
        201: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/YellowMachine' } } },
        },
        400: err[400],
        500: err[500],
      },
    },
  },
  '/api/yellow-machines/{id}': {
    get: {
      operationId: 'getYellowMachineById',
      tags: ['Yellow Machines'],
      summary: 'Get yellow machine by ID',
      security: [],
      parameters: idParam(),
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/YellowMachine' } } } },
        404: err[404],
        500: err[500],
      },
    },
    put: {
      operationId: 'updateYellowMachine',
      tags: ['Yellow Machines'],
      summary: 'Update yellow machine',
      description:
        'Update machine details and manage attachments (add via files, remove via delete ids).\n\n' +
        multipartFrontendNote,
      security: [],
      parameters: idParam(),
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                ...yellowMachineFormFields,
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
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/YellowMachine' } } } },
        400: err[400],
        404: err[404],
        500: err[500],
      },
    },
    delete: {
      operationId: 'deleteYellowMachine',
      tags: ['Yellow Machines'],
      summary: 'Delete yellow machine',
      security: [],
      parameters: idParam(),
      responses: {
        200: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { message: { type: 'string', example: 'Yellow machine deleted successfully' } },
              },
            },
          },
        },
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/yellow-machines/{id}/documents': {
    patch: {
      operationId: 'addYellowMachineDocuments',
      tags: ['Yellow Machines'],
      summary: 'Add documents',
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
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/YellowMachine' } } } },
        400: err[400],
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/yellow-machines/{id}/media': {
    patch: {
      operationId: 'addYellowMachineMedia',
      tags: ['Yellow Machines'],
      summary: 'Add pictures (media)',
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
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/YellowMachine' } } } },
        400: err[400],
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/yellow-machines/{id}/documents/{docId}': {
    delete: {
      operationId: 'deleteYellowMachineDocument',
      tags: ['Yellow Machines'],
      summary: 'Delete document',
      security: [],
      parameters: [...idParam(), subIdParam('docId', 'Document _id from machine.documents[]._id')],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteMessageResponse' } } } },
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/yellow-machines/{id}/media/{mediaId}': {
    delete: {
      operationId: 'deleteYellowMachineMedia',
      tags: ['Yellow Machines'],
      summary: 'Delete picture (media)',
      security: [],
      parameters: [...idParam(), subIdParam('mediaId', 'Media _id from machine.media[]._id')],
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteMessageResponse' } } } },
        404: err[404],
        500: err[500],
      },
    },
  },
  '/api/yellow-machines/owner/{ownerId}': {
    get: {
      operationId: 'listYellowMachinesByOwner',
      tags: ['Yellow Machines'],
      summary: 'List machines by owner',
      security: [],
      parameters: [subIdParam('ownerId', 'Owner user ObjectId')],
      responses: {
        200: {
          content: {
            'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/YellowMachine' } } },
          },
        },
        400: err[400],
        500: err[500],
      },
    },
  },
  '/api/yellow-machines/search/{query}': {
    get: {
      operationId: 'searchYellowMachines',
      tags: ['Yellow Machines'],
      summary: 'Search by name, brand, or description',
      security: [],
      parameters: [{ name: 'query', in: 'path', required: true, schema: { type: 'string' }, example: 'caterpillar' }],
      responses: {
        200: {
          content: {
            'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/YellowMachine' } } },
          },
        },
        500: err[500],
      },
    },
  },
};

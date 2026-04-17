const userIdParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }];

module.exports = {
  '/api/user': {
    get: {
      tags: ['Users'],
      summary: 'List users',
      security: [],
      parameters: [
        { name: 'role', in: 'query', schema: { type: 'string' } },
        { name: 'isVerified', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
      ],
      responses: {
        200: {
          description: 'Users without passwords',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } },
        },
      },
    },
    post: {
      tags: ['Users'],
      summary: 'Create user (admin-style CRUD)',
      security: [],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['firstName', 'lastName', 'email', 'password'],
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                password: { type: 'string', minLength: 6 },
                role: { type: 'string' },
                contactNumber: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
        400: { description: 'Validation or duplicate email' },
      },
    },
  },
  '/api/user/{id}': {
    get: {
      tags: ['Users'],
      summary: 'Get user by ID',
      security: [],
      parameters: userIdParam,
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
        400: { description: 'Invalid ID' },
        404: { description: 'Not found' },
      },
    },
    put: {
      tags: ['Users'],
      summary: 'Update user',
      security: [],
      parameters: userIdParam,
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                password: { type: 'string', minLength: 6 },
                role: { type: 'string' },
                contactNumber: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
        400: { description: 'Validation error' },
        404: { description: 'Not found' },
      },
    },
    delete: {
      tags: ['Users'],
      summary: 'Delete user',
      security: [],
      parameters: userIdParam,
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        400: { description: 'Invalid ID' },
        404: { description: 'Not found' },
      },
    },
  },
  '/api/user/{id}/business-details': {
    patch: {
      tags: ['Users'],
      summary: 'Replace businessDetails',
      security: [],
      parameters: userIdParam,
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
      },
      responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
    },
  },
  '/api/user/{id}/preferences': {
    patch: {
      tags: ['Users'],
      summary: 'Replace preferences',
      security: [],
      parameters: userIdParam,
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
      },
      responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
    },
  },
  '/api/user/{id}/verify': {
    patch: {
      tags: ['Users'],
      summary: 'Mark user verified',
      security: [],
      parameters: userIdParam,
      responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
    },
  },
};

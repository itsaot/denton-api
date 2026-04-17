module.exports = {
  '/': {
    get: {
      tags: ['System'],
      summary: 'API welcome',
      security: [],
      responses: { 200: { description: 'Plain text welcome message' } },
    },
  },
  '/api/protected': {
    get: {
      tags: ['System'],
      summary: 'JWT smoke test',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Greeting with first name' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/upload': {
    post: {
      tags: ['System'],
      summary: 'Upload single file (GitHub)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: { file: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Uploaded',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UploadSuccess' } } },
        },
        400: { description: 'No file' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/upload-single': {
    post: {
      tags: ['System'],
      summary: 'Upload single file (middleware pipeline)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: { file: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: {
        200: { description: 'Uploaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/UploadSuccess' } } } },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/upload-multiple': {
    post: {
      tags: ['System'],
      summary: 'Upload up to 5 files',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['files'],
              properties: {
                files: {
                  type: 'array',
                  maxItems: 5,
                  items: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Uploaded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      files: { type: 'array', items: { type: 'object' } },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
      },
    },
  },
};

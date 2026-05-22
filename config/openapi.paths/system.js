const { standardErrorResponses, multipartFrontendNote, binaryFileField } = require('../openapi.shared');

const err = standardErrorResponses;

module.exports = {
  '/': {
    get: {
      operationId: 'getApiWelcome',
      tags: ['System'],
      summary: 'API welcome',
      security: [],
      responses: { 200: { description: 'Plain text welcome message' } },
    },
  },
  '/openapi.json': {
    get: {
      operationId: 'getOpenApiSpec',
      tags: ['System'],
      summary: 'OpenAPI specification (JSON)',
      description: 'Use this URL for frontend codegen (`openapi-typescript`, `openapi-generator`, etc.).',
      security: [],
      responses: {
        200: {
          description: 'OpenAPI 3.0 document',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
  '/api/protected': {
    get: {
      operationId: 'getProtectedSmokeTest',
      tags: ['System'],
      summary: 'JWT smoke test',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Authenticated greeting',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  message: { type: 'string', example: 'Hello Jane, this is a protected route.' },
                },
              },
            },
          },
        },
        401: err[401],
      },
    },
  },
  '/api/upload': {
    post: {
      operationId: 'uploadFile',
      tags: ['System'],
      summary: 'Upload single file',
      description: 'Standalone upload (not attached to a listing). Returns a public URL.\n\n' + multipartFrontendNote,
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
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UploadSuccess' } } } },
        400: err[400],
        401: err[401],
        500: err[500],
      },
    },
  },
  '/api/upload-single': {
    post: {
      operationId: 'uploadFileSinglePipeline',
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
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UploadSuccess' } } } },
        401: err[401],
        500: err[500],
      },
    },
  },
  '/api/upload-multiple': {
    post: {
      operationId: 'uploadFilesMultiple',
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
              properties: { files: binaryFileField('files', 5) },
            },
          },
        },
      },
      responses: {
        200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UploadMultipleSuccess' } } } },
        401: err[401],
        500: err[500],
      },
    },
  },
};

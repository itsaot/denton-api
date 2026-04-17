const cid = [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } }];

module.exports = {
  '/api/messages/conversations': {
    get: {
      tags: ['Messages'],
      summary: 'List my conversations',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Conversation' } } } },
        },
        401: {},
      },
    },
    post: {
      tags: ['Messages'],
      summary: 'Start or resume 1:1 conversation',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['participantId'],
              properties: {
                participantId: { type: 'string' },
                mine: { type: 'string', description: 'Optional mine context' },
              },
            },
          },
        },
      },
      responses: {
        201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Conversation' } } } },
        400: {},
        401: {},
        404: {},
      },
    },
  },
  '/api/messages/conversations/{conversationId}/participants': {
    post: {
      tags: ['Messages'],
      summary: 'Admin adds another admin to the conversation',
      security: [{ bearerAuth: [] }],
      parameters: cid,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['userId'],
              properties: { userId: { type: 'string' } },
            },
          },
        },
      },
      responses: { 200: {}, 400: {}, 403: {}, 404: {} },
    },
  },
  '/api/messages/conversations/{conversationId}/messages': {
    get: {
      tags: ['Messages'],
      summary: 'Messages in conversation',
      security: [{ bearerAuth: [] }],
      parameters: cid,
      responses: {
        200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } },
        401: {},
        404: {},
      },
    },
    post: {
      tags: ['Messages'],
      summary: 'Send message in conversation',
      security: [{ bearerAuth: [] }],
      parameters: cid,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' } } },
          },
        },
      },
      responses: { 201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } } },
    },
  },
  '/api/messages/conversations/{conversationId}/export': {
    get: {
      tags: ['Messages'],
      summary: 'Export chat transcript',
      security: [{ bearerAuth: [] }],
      parameters: [
        ...cid,
        {
          name: 'format',
          in: 'query',
          schema: { type: 'string', enum: ['json', 'txt'], default: 'json' },
        },
      ],
      responses: {
        200: {
          description: 'JSON object or text/plain attachment',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ChatExportJson' } },
            'text/plain': { schema: { type: 'string' } },
          },
        },
        401: {},
        404: {},
      },
    },
  },
  '/api/messages': {
    post: {
      tags: ['Messages'],
      summary: 'Send message (unified)',
      description: 'Either body.conversation + content, or receiver + content (+ optional mine).',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['content'],
              properties: {
                content: { type: 'string' },
                conversation: { type: 'string' },
                receiver: { type: 'string' },
                mine: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } } },
    },
  },
  '/api/messages/thread/{userId}': {
    get: {
      tags: ['Messages'],
      summary: 'DM thread with user (legacy + conversation)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'mine', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } } },
    },
  },
  '/api/messages/mine/{mineId}': {
    get: {
      tags: ['Messages'],
      summary: 'Messages tied to a mine (legacy + threaded)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'mineId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } } },
    },
  },
};

module.exports = {
  '/api/payments/create-intent': {
    post: {
      tags: ['Payments'],
      summary: 'Create Stripe PaymentIntent',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['amount'],
              properties: {
                amount: { type: 'integer', description: 'Amount in smallest currency unit (for example cents).' },
                currency: { type: 'string', example: 'zar', default: 'zar' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentIntentResponse' } } },
        },
        401: {},
        500: {},
      },
    },
  },
  '/api/payments/ozow/initiate': {
    post: {
      tags: ['Payments'],
      summary: 'Create an Ozow payment form payload',
      description:
        'Builds the signed form fields required for an Ozow checkout redirect. The client should POST the returned `formFields` to `gatewayUrl`.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OzowInitiateRequest' },
          },
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OzowInitiateResponse' } } },
        },
        400: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorMessage' } } },
        },
        401: {},
      },
    },
  },
  '/api/payments/ozow/callback/{outcome}': {
    post: {
      tags: ['Payments'],
      summary: 'Receive an Ozow redirect or notify callback',
      parameters: [
        {
          in: 'path',
          name: 'outcome',
          required: true,
          schema: { type: 'string', enum: ['success', 'cancel', 'error', 'notify'] },
        },
      ],
      requestBody: {
        required: false,
        content: {
          'application/x-www-form-urlencoded': {
            schema: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OzowCallbackResponse' } } },
        },
        400: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorMessage' } } },
        },
      },
    },
    get: {
      tags: ['Payments'],
      summary: 'Inspect an Ozow redirect callback through query params',
      parameters: [
        {
          in: 'path',
          name: 'outcome',
          required: true,
          schema: { type: 'string', enum: ['success', 'cancel', 'error', 'notify'] },
        },
      ],
      responses: {
        200: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OzowCallbackResponse' } } },
        },
        400: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorMessage' } } },
        },
      },
    },
  },
  '/api/payments/ozow/status/reference/{transactionReference}': {
    get: {
      tags: ['Payments'],
      summary: 'Check Ozow transaction status by merchant reference',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'transactionReference',
          required: true,
          schema: { type: 'string' },
        },
        {
          in: 'query',
          name: 'isTest',
          required: false,
          schema: { type: 'boolean' },
        },
      ],
      responses: {
        200: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OzowStatusResponse' } } },
        },
        401: {},
        500: {},
      },
    },
  },
  '/api/payments/ozow/status/transaction/{transactionId}': {
    get: {
      tags: ['Payments'],
      summary: 'Check Ozow transaction status by Ozow transaction id',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'transactionId',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OzowStatusResponse' } } },
        },
        401: {},
        500: {},
      },
    },
  },
};

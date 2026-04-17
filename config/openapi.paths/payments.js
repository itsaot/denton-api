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
                amount: { type: 'integer', description: 'Amount in smallest currency unit (e.g. cents)' },
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
};

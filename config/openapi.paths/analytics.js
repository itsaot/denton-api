module.exports = {
  '/api/analytics/user': {
    get: {
      tags: ['Analytics'],
      summary: 'Current user listing and offer stats',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'mine count, offer count, offerStats, mineralOfferStats',
          content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
        },
        401: {},
      },
    },
  },
  '/api/analytics/admin': {
    get: {
      tags: ['Analytics'],
      summary: 'Admin dashboard aggregates',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { content: { 'application/json': { schema: { type: 'object' } } } },
        403: { description: 'Not admin' },
        401: {},
      },
    },
  },
};

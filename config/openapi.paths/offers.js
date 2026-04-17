const oid = { type: 'string', description: 'Mongo ObjectId' };

module.exports = {
  '/api/offers/me': {
    get: {
      tags: ['Offers'],
      summary: 'Offers submitted by current user',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Offer' } } } } },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/offers/received': {
    get: {
      tags: ['Offers'],
      summary: 'Offers on your mines or minerals',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Offer' } } } } },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/offers/mine/{mineId}': {
    get: {
      tags: ['Offers'],
      summary: 'Offers for a mine (owner only)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'mineId', in: 'path', required: true, schema: oid }],
      responses: { 200: {}, 403: {}, 404: {} },
    },
  },
  '/api/offers/mineral/{mineralId}': {
    get: {
      tags: ['Offers'],
      summary: 'Offers for a mineral (listing owner only)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'mineralId', in: 'path', required: true, schema: oid }],
      responses: { 200: {}, 403: {}, 404: {} },
    },
  },
  '/api/offers/mine-owner/{ownerId}': {
    get: {
      tags: ['Offers'],
      summary: 'Offers for mines owned by user',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'ownerId', in: 'path', required: true, schema: oid }],
      responses: { 200: {}, 403: {} },
    },
  },
  '/api/offers/investor/{investorId}': {
    get: {
      tags: ['Offers'],
      summary: 'Offers by investor (self or admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'investorId', in: 'path', required: true, schema: oid }],
      responses: { 200: {}, 403: {} },
    },
  },
  '/api/offers': {
    get: {
      tags: ['Offers'],
      summary: 'List offers (scoped for non-admins)',
      description:
        'Non-admins only see offers they submitted or on their listings. Admins may list all. Query: mine, mineral, investor, status.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'mine', in: 'query', schema: oid },
        { name: 'mineral', in: 'query', schema: oid },
        { name: 'investor', in: 'query', schema: oid },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['Pending', 'Accepted', 'Rejected'] } },
      ],
      responses: { 200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Offer' } } } } } },
    },
    post: {
      tags: ['Offers'],
      summary: 'Create offer (exactly one of mine or mineral)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/OfferCreate' } } },
      },
      responses: {
        201: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Offer' } } } },
        400: { description: 'Validation or business rule' },
        401: {},
        403: { description: 'Role cannot create offers' },
      },
    },
  },
  '/api/offers/{id}': {
    get: {
      tags: ['Offers'],
      summary: 'Get offer (participant or admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: oid }],
      responses: { 200: {}, 403: {}, 404: {} },
    },
    put: {
      tags: ['Offers'],
      summary: 'Update pending offer (investor only)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: oid }],
      requestBody: {
        content: { 'application/json': { schema: { $ref: '#/components/schemas/OfferUpdate' } } },
      },
      responses: { 200: {}, 400: {}, 403: {}, 404: {} },
    },
    delete: {
      tags: ['Offers'],
      summary: 'Delete pending offer',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: oid }],
      responses: { 200: {}, 400: {}, 403: {}, 404: {} },
    },
  },
  '/api/offers/{id}/accept': {
    patch: {
      tags: ['Offers'],
      summary: 'Accept offer (listing owner or admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: oid }],
      responses: { 200: {}, 400: {}, 403: {}, 404: {} },
    },
  },
  '/api/offers/{id}/reject': {
    patch: {
      tags: ['Offers'],
      summary: 'Reject offer (listing owner or admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: oid }],
      responses: { 200: {}, 400: {}, 403: {}, 404: {} },
    },
  },
};

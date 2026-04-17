/**
 * Reusable OpenAPI 3.0 component schemas for Denton API.
 */
module.exports = {
  ErrorMessage: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      status: { type: 'string', example: 'fail' },
    },
  },
  ValidationErrors: {
    type: 'object',
    properties: {
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            msg: { type: 'string' },
            param: { type: 'string' },
            location: { type: 'string' },
          },
        },
      },
    },
  },
  User: {
    type: 'object',
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      contactNumber: { type: 'string' },
      role: {
        type: 'string',
        enum: ['mine_owner', 'mineral-manager', 'investor', 'consultant', 'admin'],
      },
      businessDetails: { type: 'object' },
      preferences: { type: 'object' },
      isVerified: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  AuthResponse: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      firstName: { type: 'string' },
      email: { type: 'string' },
      role: { type: 'string' },
      token: { type: 'string', description: 'JWT bearer token' },
    },
  },
  Mine: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      owner: {
        description: 'Owner user id (string) or populated user object',
        oneOf: [{ type: 'string' }, { type: 'object' }],
      },
      name: { type: 'string' },
      location: { type: 'string' },
      commodityType: { type: 'string' },
      status: {
        type: 'string',
        enum: ['Active', 'Idle', 'Exploration', 'Development'],
      },
      price: { type: 'number' },
      description: { type: 'string' },
      documents: { type: 'array', items: { type: 'object' } },
      media: { type: 'array', items: { type: 'object' } },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Offer: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      mine: { type: 'object', nullable: true },
      mineral: { type: 'object', nullable: true },
      investor: { oneOf: [{ type: 'string' }, { type: 'object' }] },
      amount: { type: 'number' },
      message: { type: 'string' },
      status: { type: 'string', enum: ['Pending', 'Accepted', 'Rejected'] },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  OfferCreate: {
    type: 'object',
    required: ['amount'],
    description: 'Provide exactly one of mine or mineral.',
    properties: {
      mine: { type: 'string', description: 'Mine listing ID' },
      mineral: { type: 'string', description: 'Mineral listing ID' },
      amount: { type: 'number', minimum: 0, exclusiveMinimum: true },
      message: { type: 'string' },
    },
  },
  OfferUpdate: {
    type: 'object',
    properties: {
      amount: { type: 'number' },
      message: { type: 'string' },
    },
  },
  Conversation: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      participants: {
        type: 'array',
        items: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/User' }] },
      },
      mine: { type: 'object', nullable: true },
      createdBy: { type: 'string' },
      lastMessageAt: { type: 'string', format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Message: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      conversation: { type: 'string', nullable: true },
      sender: { oneOf: [{ type: 'string' }, { type: 'object' }] },
      receiver: { type: 'string', nullable: true },
      mine: { type: 'string', nullable: true },
      content: { type: 'string' },
      seen: { type: 'boolean' },
      readBy: { type: 'array', items: { type: 'string' } },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  ChatExportJson: {
    type: 'object',
    properties: {
      exportedAt: { type: 'string', format: 'date-time' },
      conversationId: { type: 'string' },
      messages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            at: { type: 'string', format: 'date-time' },
            sender: { type: 'string' },
            content: { type: 'string' },
          },
        },
      },
    },
  },
  MineralListResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'success' },
      results: { type: 'integer' },
      data: {
        type: 'object',
        properties: {
          minerals: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  MineralSingleResponse: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      data: { type: 'object', properties: { mineral: { type: 'object' } } },
    },
  },
  UploadSuccess: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'success' },
      data: {
        type: 'object',
        properties: {
          fileUrl: { type: 'string', format: 'uri' },
          originalName: { type: 'string' },
          filename: { type: 'string' },
          size: { type: 'integer' },
          mimetype: { type: 'string' },
        },
      },
    },
  },
  PaymentIntentResponse: {
    type: 'object',
    properties: {
      clientSecret: { type: 'string', description: 'Stripe PaymentIntent client secret' },
    },
  },
};

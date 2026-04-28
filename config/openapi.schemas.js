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
  OzowInitiateRequest: {
    type: 'object',
    required: ['amount'],
    properties: {
      amount: { type: 'number', format: 'float', example: 199.99, description: 'Amount in ZAR major units.' },
      transactionReference: { type: 'string', maxLength: 50 },
      bankReference: { type: 'string', maxLength: 20 },
      customer: { type: 'string', maxLength: 100 },
      optional1: { type: 'string', maxLength: 50 },
      optional2: { type: 'string', maxLength: 50 },
      optional3: { type: 'string', maxLength: 50 },
      optional4: { type: 'string', maxLength: 50 },
      optional5: { type: 'string', maxLength: 50 },
      successUrl: { type: 'string', format: 'uri' },
      cancelUrl: { type: 'string', format: 'uri' },
      errorUrl: { type: 'string', format: 'uri' },
      notifyUrl: { type: 'string', format: 'uri' },
      isTest: { type: 'boolean', default: false },
    },
  },
  OzowFormFields: {
    type: 'object',
    properties: {
      SiteCode: { type: 'string' },
      CountryCode: { type: 'string', example: 'ZA' },
      CurrencyCode: { type: 'string', example: 'ZAR' },
      Amount: { type: 'string', example: '199.99' },
      TransactionReference: { type: 'string' },
      BankReference: { type: 'string' },
      Optional1: { type: 'string' },
      Optional2: { type: 'string' },
      Optional3: { type: 'string' },
      Optional4: { type: 'string' },
      Optional5: { type: 'string' },
      Customer: { type: 'string' },
      CancelUrl: { type: 'string', format: 'uri' },
      ErrorUrl: { type: 'string', format: 'uri' },
      SuccessUrl: { type: 'string', format: 'uri' },
      NotifyUrl: { type: 'string', format: 'uri' },
      IsTest: { type: 'string', enum: ['true', 'false'] },
      HashCheck: { type: 'string', description: 'SHA512 request hash sent to Ozow.' },
    },
  },
  OzowInitiateResponse: {
    type: 'object',
    properties: {
      provider: { type: 'string', example: 'ozow' },
      method: { type: 'string', example: 'POST' },
      gatewayUrl: { type: 'string', format: 'uri', example: 'https://pay.ozow.com' },
      transactionReference: { type: 'string' },
      bankReference: { type: 'string' },
      formFields: { $ref: '#/components/schemas/OzowFormFields' },
    },
  },
  OzowCallbackResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'success' },
      provider: { type: 'string', example: 'ozow' },
      outcome: { type: 'string', example: 'notify' },
      verified: { type: 'boolean' },
      callback: {
        type: 'object',
        additionalProperties: true,
      },
      transaction: {
        oneOf: [
          { type: 'array', items: { $ref: '#/components/schemas/OzowTransaction' } },
          { $ref: '#/components/schemas/OzowTransaction' },
          { type: 'null' },
        ],
      },
      confirmationError: { type: 'string', nullable: true },
    },
  },
  OzowStatusResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'success' },
      provider: { type: 'string', example: 'ozow' },
      transaction: {
        oneOf: [
          { type: 'array', items: { $ref: '#/components/schemas/OzowTransaction' } },
          { $ref: '#/components/schemas/OzowTransaction' },
        ],
      },
    },
  },
  OzowTransaction: {
    type: 'object',
    properties: {
      TransactionId: { type: 'string' },
      MerchantCode: { type: 'string' },
      SiteCode: { type: 'string' },
      TransactionReference: { type: 'string' },
      CurrencyCode: { type: 'string', example: 'ZAR' },
      Amount: { type: 'number', format: 'float' },
      Status: { type: 'string', enum: ['Complete', 'Cancelled', 'Error'] },
      StatusMessage: { type: 'string' },
      CreatedDate: { type: 'string', format: 'date-time' },
      PaymentDate: { type: 'string', format: 'date-time' },
    },
  },
};

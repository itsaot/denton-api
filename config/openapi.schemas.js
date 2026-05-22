/**
 * Reusable OpenAPI 3.0 component schemas for Denton API.
 * Structured for frontend TypeScript clients and Swagger UI "Try it out".
 */
module.exports = {
  ErrorMessage: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Mine not found' },
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
      firstName: { type: 'string', example: 'Jane' },
      lastName: { type: 'string', example: 'Doe' },
      email: { type: 'string', format: 'email', example: 'jane@example.com' },
      contactNumber: { type: 'string' },
      role: {
        type: 'string',
        enum: ['mine_owner', 'mineral-manager', 'investor', 'consultant', 'admin'],
      },
      businessDetails: { type: 'object', additionalProperties: true },
      preferences: { type: 'object', additionalProperties: true },
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
      token: { type: 'string', description: 'JWT — store and send as Authorization: Bearer <token>' },
    },
  },
  FileAttachment: {
    type: 'object',
    description: 'Uploaded document or media file stored on GitHub (path is the public URL).',
    properties: {
      _id: { type: 'string', description: 'Use this id in deleteDocumentIds / deleteMediaIds on update' },
      filename: { type: 'string', example: 'report-1715000000000-123456789.pdf' },
      originalName: { type: 'string', example: 'geology-report.pdf' },
      path: { type: 'string', format: 'uri', description: 'Public file URL for download/display' },
      mimetype: { type: 'string', example: 'application/pdf' },
      size: { type: 'integer', example: 245000 },
      uploadedAt: { type: 'string', format: 'date-time' },
    },
  },
  MineralImage: {
    type: 'object',
    properties: {
      _id: { type: 'string', description: 'Use in deleteImageIds on PATCH /api/minerals/{id}' },
      url: { type: 'string', format: 'uri' },
      caption: { type: 'string' },
      isPrimary: { type: 'boolean', default: false },
    },
  },
  GeoPoint: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['Point'], example: 'Point' },
      coordinates: {
        type: 'array',
        items: { type: 'number' },
        minItems: 2,
        maxItems: 2,
        description: '[longitude, latitude]',
        example: [28.0473, -26.2041],
      },
      address: { type: 'string' },
      country: { type: 'string' },
    },
  },
  Mineral: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      name: { type: 'string', example: 'Gold' },
      mineralType: {
        type: 'string',
        enum: ['metallic', 'non-metallic', 'precious', 'industrial', 'energy', 'gemstone'],
      },
      chemicalFormula: { type: 'string', example: 'Au' },
      description: { type: 'string' },
      pricePerTonne: { type: 'number', example: 65000 },
      availableTonnes: { type: 'number', example: 120 },
      hardness: { type: 'number', minimum: 1, maximum: 10 },
      density: { type: 'number' },
      color: { type: 'string' },
      luster: {
        type: 'string',
        enum: ['metallic', 'submetallic', 'vitreous', 'pearly', 'resinous', 'silky', 'greasy', 'adamantine', 'dull'],
      },
      crystalSystem: {
        type: 'string',
        enum: ['cubic', 'tetragonal', 'orthorhombic', 'hexagonal', 'trigonal', 'monoclinic', 'triclinic', 'amorphous'],
      },
      cleavage: { type: 'string', enum: ['perfect', 'good', 'distinct', 'imperfect', 'poor', 'none'] },
      fracture: { type: 'string', enum: ['conchoidal', 'uneven', 'fibrous', 'hackly', 'splintery', 'earthy'] },
      streak: { type: 'string' },
      transparency: { type: 'string', enum: ['transparent', 'translucent', 'opaque'] },
      rarity: { type: 'string', enum: ['common', 'uncommon', 'rare', 'very-rare'] },
      mineLocation: { $ref: '#/components/schemas/GeoPoint' },
      miningMethod: {
        type: 'string',
        enum: ['open-pit', 'underground', 'placer', 'in-situ', 'mountaintop-removal'],
      },
      uses: { type: 'array', items: { type: 'string' } },
      images: { type: 'array', items: { $ref: '#/components/schemas/MineralImage' } },
      documents: { type: 'array', items: { $ref: '#/components/schemas/FileAttachment' } },
      isRadioactive: { type: 'boolean' },
      mohsHardness: { type: 'integer', minimum: 1, maximum: 10 },
      specificGravity: { type: 'number' },
      createdBy: { type: 'string', description: 'User ObjectId' },
      lastUpdatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Mine: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      owner: {
        description: 'Owner user id (string) or populated User',
        oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/User' }],
      },
      name: { type: 'string', example: 'West Rand Mine' },
      location: { type: 'string', example: 'Johannesburg, SA' },
      commodityType: { type: 'string', example: 'Gold' },
      status: {
        type: 'string',
        enum: ['Active', 'Idle', 'Exploration', 'Development'],
      },
      price: { type: 'number', example: 2500000 },
      description: { type: 'string' },
      documents: { type: 'array', items: { $ref: '#/components/schemas/FileAttachment' } },
      media: { type: 'array', items: { $ref: '#/components/schemas/FileAttachment' }, description: 'Pictures / images' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  RentalInfo: {
    type: 'object',
    properties: {
      available: { type: 'boolean', example: true },
      duration: { type: 'string', example: '6 months', description: 'How long the machine is available for rental' },
    },
  },
  MachineRates: {
    type: 'object',
    description: 'Rental or usage rates (currency units as stored by API)',
    properties: {
      hourly: { type: 'number', example: 150 },
      daily: { type: 'number', example: 1200 },
      weekly: { type: 'number', example: 7000 },
      monthly: { type: 'number', example: 25000 },
    },
  },
  YellowMachine: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      owner: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/User' }] },
      name: { type: 'string', example: 'CAT 320 Excavator' },
      establishmentFee: { type: 'number', example: 5000 },
      brand: { type: 'string', example: 'Caterpillar' },
      age: { type: 'number', example: 8, description: 'Machine age in years' },
      mileage: { type: 'number', example: 12500 },
      rental: { $ref: '#/components/schemas/RentalInfo' },
      forSale: { type: 'boolean', example: false },
      rates: { $ref: '#/components/schemas/MachineRates' },
      description: { type: 'string' },
      documents: { type: 'array', items: { $ref: '#/components/schemas/FileAttachment' } },
      media: { type: 'array', items: { $ref: '#/components/schemas/FileAttachment' }, description: 'Machine pictures' },
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
          minerals: { type: 'array', items: { $ref: '#/components/schemas/Mineral' } },
        },
      },
    },
  },
  MineralSingleResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'success' },
      data: {
        type: 'object',
        properties: {
          mineral: { $ref: '#/components/schemas/Mineral' },
        },
      },
    },
  },
  DeleteMessageResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Document deleted successfully' },
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
  UploadMultipleSuccess: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'success' },
      data: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: {
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
          count: { type: 'integer' },
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
      callback: { type: 'object', additionalProperties: true },
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

module.exports = {
  '/api/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register user',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['firstName', 'lastName', 'email', 'password'],
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 1 },
                role: { type: 'string' },
                contactNumber: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Created; verification email sent when SMTP is configured',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  firstName: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  isVerified: { type: 'boolean' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        400: { description: 'User exists or validation error' },
        500: { description: 'Server error' },
      },
    },
  },
  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'JWT issued',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        401: { description: 'Invalid credentials' },
        403: { description: 'Email not verified' },
      },
    },
  },
  '/api/auth/verify-email': {
    get: {
      tags: ['Auth'],
      summary: 'Verify email address',
      security: [],
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: { description: 'Email verified; JWT returned' },
        400: { description: 'Invalid or expired token' },
      },
    },
  },
  '/api/auth/resend-verification': {
    post: {
      tags: ['Auth'],
      summary: 'Resend verification email',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', format: 'email' } },
            },
          },
        },
      },
      responses: { 200: { description: 'Generic success message' } },
    },
  },
  '/api/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Request password reset email',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', format: 'email' } },
            },
          },
        },
      },
      responses: { 200: { description: 'Generic success message (email sent if account exists)' } },
    },
  },
  '/api/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Reset password with token from email',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token', 'password'],
              properties: {
                token: { type: 'string' },
                password: { type: 'string', minLength: 6 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Password updated' },
        400: { description: 'Invalid or expired token' },
      },
    },
  },
};

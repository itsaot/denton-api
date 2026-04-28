const paths = require('./openapi.paths');
const schemas = require('./openapi.schemas');

/** @type {import('swagger-jsdoc').OAS3Definition} */
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Denton Vision Art API',
    version: '1.0.0',
    description:
      'REST API for mines, minerals, offers, conversations, payments, analytics, and users. ' +
      'Protected operations require `Authorization: Bearer <JWT>` (from `POST /api/auth/login` or `POST /api/auth/register`).\n\n' +
      '**Note:** In Express, `GET /api/mines/:id` and `GET /api/minerals/:id` are registered before `.../owner/...`, `.../search/...`, and similar static segments. ' +
      'Call those static paths with the correct URL shape; if the server treats `owner` or `search` as an `:id`, reorder routes in the router.',
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local development' },
    {
      url: '{protocol}://{host}',
      description: 'Configurable',
      variables: {
        protocol: { default: 'http', enum: ['http', 'https'] },
        host: { default: 'localhost:5000' },
      },
    },
  ],
  tags: [
    { name: 'System', description: 'Welcome, JWT check, file uploads' },
    { name: 'Auth', description: 'Register, login, password placeholders' },
    { name: 'Users', description: 'User CRUD and profile patches (`/api/user`)' },
    { name: 'Mines', description: 'Mine listings and assets' },
    { name: 'Minerals', description: 'Mineral catalog and geo queries' },
    { name: 'Offers', description: 'Bids on mines or minerals' },
    { name: 'Messages', description: 'Conversations, DMs, exports' },
    { name: 'Analytics', description: 'User and admin stats' },
    { name: 'Payments', description: 'Stripe and Ozow payment flows' },
  ],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT from auth register/login response',
      },
    },
    schemas,
  },
};

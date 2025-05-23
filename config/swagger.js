const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Denton Vision Art API',
      version: '1.0.0',
      description: 'API documentation for Denton Vision Art platform',
    },
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'], // Swagger looks at route files for annotations
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
// In your main server file (e.g., index.js), you can serve the Swagger UI
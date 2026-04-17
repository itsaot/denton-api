const swaggerJSDoc = require('swagger-jsdoc');
const definition = require('./openapi');

const options = {
  definition,
  apis: [],
};

module.exports = swaggerJSDoc(options);

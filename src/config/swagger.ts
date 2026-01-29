import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Casino API',
      version: '1.0.0',
      description: 'API documentation for the Casino platform',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        hmac: {
          type: 'apiKey',
          in: 'header',
          name: 'X-HMAC-Signature',
          description: 'HMAC-SHA256 signature of the request body',
        },
      },
    },
  },
  apis: ['./src/casino/controllers/*.ts', './src/provider/controllers/*.ts', './src/shared/validators.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);

const path = require('path');

module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      database: 'strapi',
      user: 'strapi',
      password: 'strapi',
      ssl: false,
    },
    useNullAsDefault: true,
    propagateCreateError: false   // Prevent timeout acquiring connection pool probably full error
  },
});

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
  },
});

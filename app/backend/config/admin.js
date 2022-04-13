module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', '68c33f8563a4a1ae90797becc8f36a04'),
  },
});

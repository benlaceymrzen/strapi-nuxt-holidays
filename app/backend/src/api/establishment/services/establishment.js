'use strict';

/**
 * establishment service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::establishment.establishment');

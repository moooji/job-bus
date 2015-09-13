'use strict';

const Dispatcher = require('./lib/dispatcher');
const Consumer = require('./lib/consumer');
const Worker = require('./lib/worker');

/**
 * Creates a qorker
 * @param {string} requestsUrl
 * @param {string} responsesUrl
 * @param {string} region
 * @param {function} delegate
 * @returns {Worker}
 */

function createWorker(requestsUrl, responsesUrl, region, delegate) {
  return new Worker(requestsUrl, responsesUrl, region, delegate);
}

/**
 * Creates a consumer
 * @param {string} responsesUrl
 * @param {string} region
 * @returns {Consumer}
 */

function createConsumer(responsesUrl, region) {
  return new Consumer(responsesUrl, region);
}

/**
 * Creates a dispatcher
 * @param {string} requestsUrl
 * @param {string} region
 * @returns {Dispatcher}
 */

function createDispatcher(requestsUrl, region) {
  return new Dispatcher(requestsUrl, region);
}

module.exports.createWorker = createWorker;
module.exports.createConsumer = createConsumer;
module.exports.createDispatcher = createDispatcher;

'use strict';

const Dispatcher = require('./lib/dispatcher');
const Consumer = require('./lib/consumer');
const Producer = require('./lib/producer');

/**
 * Creates a producer
 * @param {string} requestQueueUrl
 * @param {string} responseQueueUrl
 * @param {string} region
 * @param {function} delegate
 * @returns {Producer}
 */

function createProducer(requestQueueUrl, responseQueueUrl, region, delegate) {
  return new Producer(requestQueueUrl, responseQueueUrl, region, delegate);
}

/**
 * Creates a consumer
 * @param {string} responseQueueUrl
 * @param {string} region
 * @param {function} delegate
 * @returns {Consumer}
 */

function createConsumer(responseQueueUrl, region, delegate) {
  return new Consumer(responseQueueUrl, region, delegate);
}

/**
 * Creates a dispatcher
 * @param {string} requestQueueUrl
 * @param {string} region
 * @returns {Dispatcher}
 */

function createDispatcher(requestQueueUrl, region) {
  return new Dispatcher(requestQueueUrl, region);
}

module.exports.createProducer = createProducer;
module.exports.createConsumer = createConsumer;
module.exports.createDispatcher = createDispatcher;

'use strict';

const Dispatcher = require('./lib/dispatcher');
const Consumer = require('./lib/consumer');
const Producer = require('./lib/producer');
const errors = require('./lib/errors');

/**
 * Factory that creates a dispatcher
 *
 * @param {string} requestQueueUrl - SQS request queue URL
 * @param {object} options - SQS options
 * @returns {Dispatcher}
 */

function createDispatcher(requestQueueUrl, options) {
  return new Dispatcher(requestQueueUrl, options);
}

/**
 * Factory that creates a consumer
 *
 * @param {string} inputQueueUrl - SQS input queue URL
 * @param {function} delegate - Delegate function
 * @param {object} options - SQS options
 * @returns {Consumer}
 */

function createConsumer(inputQueueUrl, delegate, options) {
  return new Consumer(inputQueueUrl, delegate, options);
}

/**
 * Factory that creates a producer
 *
 * @param {string} requestQueueUrl - SQS request queue URL
 * @param {string} responseQueueUrl - SQS response queue URL
 * @param {function} delegate - Delegate function
 * @param {object} options - SQS options
 * @returns {Producer}
 */

function createProducer(requestQueueUrl, responseQueueUrl, delegate, options) {
  return new Producer(requestQueueUrl, responseQueueUrl, delegate, options);
}

module.exports.createProducer = createProducer;
module.exports.createConsumer = createConsumer;
module.exports.createDispatcher = createDispatcher;
module.exports.InvalidArgumentError = errors.InvalidArgumentError;
module.exports.JobError = errors.JobError;
module.exports.SqsError = errors.SqsError;

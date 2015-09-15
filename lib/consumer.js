'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const Bluebird = require('bluebird');
const SqsConsumer = require('sqs-consumer');
const errors = require('./errors');

const InvalidArgumentError = errors.InvalidArgumentError;

util.inherits(Consumer, EventEmitter);

/**
 * Consumer constructor
 * @param {string} responseQueueUrl
 * @param {string} region
 * @param {function} delegate
 * @constructor
 */

function Consumer(responseQueueUrl, region, delegate) {

  if (!_.isString(responseQueueUrl)) {
    throw new InvalidArgumentError('Missing SQS response queue URL');
  }

  if (!_.isString(region)) {
    throw new InvalidArgumentError('Missing SQS region');
  }

  if (!_.isFunction(delegate)) {
    throw new InvalidArgumentError('Missing delegate function');
  }

  // Ensure that delegate is a Promise
  delegate = Bluebird.promisify(delegate);

  this._responseConsumer = SqsConsumer.create({
    queueUrl: responseQueueUrl,
    region: region,
    handleMessage: (request, done) => {
      this._processResponse(delegate, request, done);
    }
  });

  /*
  this._responseConsumer.on('error', (err) => {
    this.emit('error', err);
  });
  */

  this._responseConsumer.start();
  this.emit('info', 'Created consumer');
}

/**
 * Processes one response message.
 * Returns a promise.
 * @param {function} delegate
 * @param {object} message
 * @param {function} done
 * @returns {Promise}
 */

Consumer.prototype._processResponse = function(delegate, message, done) {

  return Bluebird.resolve(message)
    .then((message) => {

      const response = JSON.parse(message.Body);

      if (!isValidJobResponse(response)) {
        throw new InvalidArgumentError('Invalid job response');
      }

      return response.job;
    })
    .then(done)
    .catch(done);
};

/**
 * Check if job response is valid
 * @param {object} response
 * @returns {boolean}
 */

function isValidJobResponse(response) {

  if (!_.isPlainObject(response)) {
    return false;
  }

  if (!_.isPlainObject(response.job)) {
    return false;
  }

  if (!_.isFinite(response.job.revision)) {
    return false;
  }

  if (!_.isString(response.job.id)) {
    return false;
  }

  return _.isPlainObject(response.job.error) || _.isPlainObject(response.job.success);
}

module.exports = Consumer;

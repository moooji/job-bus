'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const Bluebird = require('bluebird');
const SqsProducer = require('sqs-producer');
const SqsConsumer = require('sqs-consumer');
const errors = require('./errors');

const InvalidArgumentError = errors.InvalidArgumentError;
const JobError = errors.JobError;

util.inherits(Producer, EventEmitter);

/**
 * Constructor
 * @param {string} requestQueueUrl
 * @param {string} responseQueueUrl
 * @param {string} region
 * @param {function} delegate
 * @returns {Producer}
 * @constructor
 */

function Producer(requestQueueUrl, responseQueueUrl, region, delegate) {

  if (!_.isString(requestQueueUrl)) {
    throw new InvalidArgumentError('Missing SQS request queue URL');
  }

  if (!_.isString(responseQueueUrl)) {
    throw new InvalidArgumentError('Missing SQS responses queue URL');
  }

  if (!_.isString(region)) {
    throw new InvalidArgumentError('Missing SQS region');
  }

  if (!_.isFunction(delegate)) {
    throw new InvalidArgumentError('Missing delegate');
  }

  if (!_.isFunction(delegate)) {
    throw new InvalidArgumentError('Missing delegate function');
  }

  // Ensure that delegate is a Promise
  delegate = Bluebird.promisify(delegate);

  this._requestConsumer = SqsConsumer.create({
    queueUrl: requestQueueUrl,
    region: region,
    handleMessage: (request, done) => {
      this._processRequest(delegate, request, done);
    }
  });

  this._responseProducer = SqsProducer.create({
    queueUrl: responseQueueUrl,
    region: region
  });

  this._requestConsumer.on('error', (err) => {
    this.emit('error', err);
  });

  this._requestConsumer.start();
  this.emit('info', 'Created producer');
}

/**
 * Publishes a job response
 * @param {object} response
 */

Producer.prototype._publishResponse = function(response) {

  return new Bluebird((resolve, reject) => {

    if (!isValidJobResponse(response)) {
      return reject(new InvalidArgumentError('Invalid job response'));
    }

    const id = response.job.id;
    const body = JSON.stringify(response);

    this._responseProducer.send([{id, body}], (err) => {

      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
};

/**
 * Processes one message and publishes result on service bus.
 * Returns a promise.
 * @param {function} delegate
 * @param {object} message
 * @param {function} done
 * @returns {Promise}
 */

Producer.prototype._processRequest = function(delegate, message, done) {

  let jobId = null;

  return Bluebird.resolve(message)
    .then((message) => {

      const request = JSON.parse(message.Body);

      if (!isValidJobRequest(request)) {
        throw new InvalidArgumentError('Invalid job request');
      }

      jobId = request.job.id;
      return request;
    })
    .then(delegate)
    .then((res) => {

      if (!_.isPlainObject(res)) {
        throw new InvalidArgumentError('Delegate did not return valid result (no object)');
      }

      return {
        job: {
          id: jobId,
          revision: new Date().getTime(),
          success: res
        }
      };
    })
    .catch(JobError, (err) => {

      // This is an (expected) operational error
      // which means that worker tried its best to process the request,
      // but could not successfully deliver a result.
      //
      // No unexpected exception happened and the worker process works
      // like expected. Thus, we will acknowledge the message so that no
      // other worker will try again and send an error response.

      this.emit('error', err);

      return {
        job: {
          id: jobId,
          revision: new Date().getTime(),
          error: {
            message: 'Job failed',
            reason: err.message,
            stack: err.stack
          }
        }
      };
    })
    .then((response) => {
      return this._publishResponse(response);
    })
    .then(done)
    .catch(done);
};

/**
 * Public error type
 * @type {JobError}
 */
Producer.prototype.JobError = JobError;

/**
 * Check if job request is valid
 * @param {object} request
 * @returns {boolean}
 */

function isValidJobRequest(request) {

  if (!_.isPlainObject(request)) {
    return false;
  }

  if (!_.isPlainObject(request.job)) {
    return false;
  }

  if (!_.isPlainObject(request.job.data)) {
    return false;
  }

  return _.isString(request.job.id);
}

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

module.exports = Producer;

'use strict';

const Bluebird = require('bluebird');
const SqsProducer = require('sqs-producer');
const SqsConsumer = require('sqs-consumer');
const errors = require('./errors');

const InvalidArgumentError = errors.InvalidArgumentError;
const JobBusError = errors.JobBusError;
const JobError = errors.JobError;

/**
 * Constructor
 * @param {string} requestsUrl
 * @param {string} responsesUrl
 * @param {string} region
 * @param {function} delegate
 * @returns {Worker}
 * @constructor
 */

function Worker(requestsUrl, responsesUrl, region, delegate) {

  if (!_.isString(requestsUrl)) {
    throw new InvalidArgumentError('Missing SQS request queue URL');
  }

  if (!_.isString(responsesUrl)) {
    throw new InvalidArgumentError('Missing SQS responses queue URL');
  }

  if (!_.isString(region)) {
    throw new InvalidArgumentError('Missing SQS region');
  }

  if (!_.isFunction(delegate)) {
    throw new InvalidArgumentError('Missing delegate');
  }

  this.delegate = delegate;

  this.requestsConsumer = SqsConsumer.create({
    queueUrl: requestsUrl,
    region: region,
    handleMessage: (message, done) => {
      delegate(message, (err, res) => {

        if(err) {
          done(err);
        }
      });
    }
  });

  this.responsesProducer = SqsProducer.create({
    queueUrl: responsesUrl,
    region: region
  });
}


/**
 * Processes one message and publishes result on service bus.
 * Returns a promise.
 * @param {Object} request
 * @returns {Bluebird}
 */

function processRequest(request) {

  const job = request.body.job;

  return Bluebird.resolve(job.data)
    .then(_workerDelegate)
    .then(function(res) {

      if (!_.isPlainObject(res)) {
        throw new JobError('Worker did not return valid result (no object)');
      }

      return {
        job: {
          id: job.id,
          revision: new Date().getTime(),
          success: res
        }
      }
    })
    .catch(JobError, function(err) {

      // This is an (expected) operational error
      // which means that worker tried its best to process the request,
      // but could not successfully deliver a result.
      //
      // No unexpected exception happened and the worker process works
      // like expected. Thus, we will acknowledge the message so that no
      // other worker will try again and send an error response.

      return {
        job: {
          id: job.id,
          revision: new Date().getTime(),
          error: {
            message: 'Job failed',
            reason: err.message,
            stack: err.stack
          }
        }
      }
    })
    .then(responseBus.publish)
    .then(function() {
      return requestBus.acknowledge(request);
    });
}

module.exports = Worker;

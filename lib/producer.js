'use strict';

const util = require('util');
const _ = require('lodash');
const errors = require('./errors');
const Consumer = require('./consumer');
const helpers = require('./helpers');

const InvalidArgumentError = errors.InvalidArgumentError;
const SqsError = errors.SqsError;
const JobError = errors.JobError;

util.inherits(Producer, Consumer);

/**
 * Constructor
 *
 * @param {string} inputQueueUrl - SQS input queue URL
 * @param {string} outputQueueUrl - SQS output queue URL
 * @param {function} delegate - Delegate function
 * @param {object} options - SQS options
 * @constructor
 */

function Producer(inputQueueUrl, outputQueueUrl, delegate, options) {

  if (!_.isString(inputQueueUrl)) {
    throw new InvalidArgumentError('Missing SQS request queue URL');
  }

  if (!_.isString(outputQueueUrl)) {
    throw new InvalidArgumentError('Missing SQS response queue URL');
  }

  this._validateDelegate(delegate);
  this._validateOptions(options);

  this._delegate = delegate;
  this._concurrency = 1;
  this._waitTimeSeconds = options.waitTimeSeconds || 20;
  this._visibilityTimeout = options.visibilityTimeout || 600;
  this._inputQueueUrl = inputQueueUrl;
  this._outputQueueUrl = outputQueueUrl;
  this._sqs = helpers.createSqs(options);
}

Producer.prototype._processJob = function(job) {
  this.emit('debug', `Processing job [${job.id}]`);

  return this._executeDelegate(job)
    .then((res) => {
      const jobSuccess = {
        job: {
          id: job.id,
          revision: new Date().getTime(),
          success: res
        }
      };

      this.emit('job-result', jobSuccess);
      return jobSuccess;
    })
    .catch((err) => {
      if (err instanceof JobError) {
        const jobError = {
          job: {
            id: job.id,
            revision: new Date().getTime(),
            error: {
              message: 'Job failed',
              reason: err.message,
              stack: err.stack
            }
          }
        };

        this.emit('job-result', jobError);
        return jobError;
      }

      throw err;
    })
    .then((response) => this._publishResponse(response));
};

Producer.prototype._publishResponse = function(response) {
  return new Promise((resolve, reject) => {
    const params = {
      QueueUrl: this._outputQueueUrl,
      MessageBody: JSON.stringify(response)
    };

    this._sqs.sendMessage(params, (err) => {
      if (err) {
        reject(new SqsError(err.message, err));
      } else {
        resolve();
      }
    });
  });
};

module.exports = Producer;

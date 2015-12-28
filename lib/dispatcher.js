'use strict';

const _ = require('lodash');
const errors = require('./errors');
const helpers = require('./helpers');

const InvalidArgumentError = errors.InvalidArgumentError;
const SqsError = errors.SqsError;

/**
 * Dispatcher constructor
 *
 * @param {string} outputQueueUrl - SQS output queue URL
 * @param {object} options - SQS options
 * @constructor
 */

function Dispatcher(outputQueueUrl, options) {
  if (!_.isString(outputQueueUrl)) {
    throw new InvalidArgumentError('Missing SQS request queue URL');
  }

  if (!_.isPlainObject(options)) {
    throw new InvalidArgumentError('Missing SQS options');
  }

  this._outputQueueUrl = outputQueueUrl;
  this._sqs = helpers.createSqs(options);
}

/**
 * Publishes a Job
 *
 * @param {object} data - Data
 * @param {string} [id] - ID
 */

Dispatcher.prototype.publishJob = function(data, id) {
  return new Promise((resolve, reject) => {

    if (id && !_.isString(id)) {
      return reject(new InvalidArgumentError('Invalid job id'));
    }

    id = id || helpers.getHash(data);
    const job = {id, data};

    const params = {
      QueueUrl: this._outputQueueUrl,
      MessageBody: JSON.stringify({job})
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

module.exports = Dispatcher;

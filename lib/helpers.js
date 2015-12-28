'use strict';

const _ = require('lodash');
const AWS = require('aws-sdk');
const hash = require('object-hash');
const errors = require('./errors');
const InvalidArgumentError = errors.InvalidArgumentError;

/**
 * Creates new SQS instance, or returns provided one
 *
 * @param {object} options - Options
 * @returns {AWS.SQS} - SQS instance
 */
function createSqs(options) {
  if (!_.isPlainObject(options)) {
    throw new InvalidArgumentError('Invalid AWS options');
  }

  /*
  if (options.sqs && !(options.sqs instanceof AWS.SQS)) {
    throw new InvalidArgumentError('Invalid SQS instance');
  }
  */

  const hasAwsOptions = _.isString(options.region) &&
    _.isString(options.accessKeyId) &&
    _.isString(options.secretAccessKey);

  if (!options.sqs && !hasAwsOptions) {
    throw new InvalidArgumentError('Invalid AWS options');
  }

  return options.sqs || new AWS.SQS({
    region: options.region,
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey
  });
}

/**
 * Creates hash of an object
 *
 * @param {Object} data - Data
 * @returns {String} hash
 */
function getHash(data) {
  return hash(data);
}

module.exports = {
  getHash,
  createSqs
};

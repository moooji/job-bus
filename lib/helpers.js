'use strict';

const _ = require('lodash');
const AWS = require('aws-sdk');
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

module.exports = {
  createSqs
};

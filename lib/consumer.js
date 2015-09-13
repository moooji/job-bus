'use strict';

const Bluebird = require('bluebird');
const SqsConsumer = require('sqs-consumer');
const errors = require('./errors');

const InvalidArgumentError = errors.InvalidArgumentError;
const JobBusError = errors.JobBusError;
const JobError = errors.JobError;

/**
 * Consumer constructor
 * @param {string} responsesUrl
 * @param {string} region
 * @constructor
 */

function Consumer(responsesUrl, region) {

}

module.exports = Consumer;

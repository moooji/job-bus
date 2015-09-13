'use strict';

const _ = require('lodash');
const crypto = require('crypto');
const Bluebird = require('bluebird');
const SqsProducer = require('sqs-producer');
const errors = require('./errors');

const InvalidArgumentError = errors.InvalidArgumentError;

/**
 * Dispatcher constructor
 * @param {string} requestQueueUrl
 * @param {string} region
 * @constructor
 */

function Dispatcher(requestQueueUrl, region) {

  if (!_.isString(requestQueueUrl)) {
    throw new InvalidArgumentError('Missing SQS request queue URL');
  }

  if (!_.isString(region)) {
    throw new InvalidArgumentError('Missing SQS region');
  }

  this.requestProducer = SqsProducer.create({
    queueUrl: requestQueueUrl,
    region: region
  });
}

/**
 * Creates a job
 * @param {Object} data
 * @constructor
 */

Dispatcher.prototype.createJob = function(data) {

  if (!_.isPlainObject(data)) {
    throw new InvalidArgumentError('Invalid job data');
  }

  return new Job(data);
};

/**
 * Publishes a Job
 * @param {Job} job
 */

Dispatcher.prototype.publishJob = function(job) {

  return new Bluebird((resolve, reject) => {

    if (!(job instanceof Job)) {
      return reject(new InvalidArgumentError('Invalid Job'));
    }

    const id = job.id;
    const body = JSON.stringify({job});

    this.requestProducer.send([{id, body}], (err) => {

      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
};

/**
 * Job constructor
 * @param {Object} data
 */

function Job(data) {

  this.data = data;
  this.id = md5(data);
}

/**
 * Creates an MD5 hex hash
 * @param data
 * @returns {String}
 */

function md5(data) {

  if (!_.isPlainObject(data)) {
    throw new InvalidArgumentError('Invalid job data');
  }

  const dataString = JSON.stringify(data);
  const dataBuffer = new Buffer(dataString);
  const hash = crypto.createHash('md5');

  hash.update(dataBuffer);
  return hash.digest('hex');
}

module.exports = Dispatcher;

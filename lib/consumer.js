'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const helpers = require('./helpers');
const errors = require('./errors');

const InvalidArgumentError = errors.InvalidArgumentError;
const SqsError = errors.SqsError;

util.inherits(Consumer, EventEmitter);

/**
 * Consumer constructor
 *
 * @param {string} inputQueueUrl - SQS input queue URL
 * @param {function} delegate - Delegate function
 * @param {object} options - SQS options
 * @constructor
 */

function Consumer(inputQueueUrl, delegate, options) {
  if (!_.isString(inputQueueUrl)) {
    throw new InvalidArgumentError('Missing SQS input queue URL');
  }

  this._validateDelegate(delegate);
  this._validateOptions(options);

  this._isEnabled = false;
  this._delegate = delegate;
  this._concurrency = 1;
  this._waitTimeSeconds = options.waitTimeSeconds || 20;
  this._visibilityTimeout = options.visibilityTimeout || 600;
  this._inputQueueUrl = inputQueueUrl;
  this._sqs = helpers.createSqs(options);
}

Consumer.prototype.start = function() {
  this.emit('debug', 'Starting consumer');
  this._isEnabled = true;
  this._poll();
};

Consumer.prototype.stop = function() {
  this.emit('debug', 'Stopping consumer');
  this._isEnabled = false;
};

Consumer.prototype._poll = function() {
  if (!this._isEnabled) {
    return this.emit('warn', 'Skipping poll - Consumer stopped');
  }

  const params = {
    QueueUrl: this._inputQueueUrl,
    MaxNumberOfMessages: this._concurrency,
    WaitTimeSeconds: this._waitTimeSeconds,
    VisibilityTimeout: this._visibilityTimeout
  };

  this._sqs.receiveMessage(params, (err, res) => {
    if (err) {
      this.emit('sqs-error', err);
    }

    if (!(res && res.Messages && res.Messages.length)) {
      return this._poll();
    }

    const message = _.first(res.Messages);

    this._processMessage(message)
      .then(() => this._poll());
  });
};

Consumer.prototype._processMessage = function(message) {
  this.emit('debug', `Processing message [${message.MessageId}]`);
  const body = JSON.parse(message.Body);

  return this._processJob(body.job)
    .then(() => this._deleteMessage(message))
    .catch((err) => this.emit('delegate-error', err))
    .then(() => this.emit('processed-message'));
};

Consumer.prototype._processJob = function(job) {
  this.emit('debug', `Processing job [${job.id}]`);
  return this._executeDelegate(job);
};

Consumer.prototype._executeDelegate = function(job) {
  return new Promise((resolve, reject) => {
    return this._delegate(job, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

Consumer.prototype._deleteMessage = function(message) {
  return new Promise((resolve, reject) => {
    this.emit('debug', `Deleting message [${message.MessageId}]`);

    const params = {
      QueueUrl: this._inputQueueUrl,
      ReceiptHandle: message.ReceiptHandle
    };

    this._sqs.deleteMessage(params, (err, res) => {
      if (err) {
        reject(new SqsError(err));
      } else {
        resolve(res);
      }
    });
  });
};

Consumer.prototype._validateDelegate = function(delegate) {
  if (!_.isFunction(delegate)) {
    throw new InvalidArgumentError('Missing delegate function');
  }
};

Consumer.prototype._validateOptions = function(options) {
  if (!_.isPlainObject(options)) {
    throw new InvalidArgumentError('Missing SQS options');
  }

  if (options.visibilityTimeout &&
    (options.visibilityTimeout < 0 || options.visibilityTimeout > 43200)) {
    throw new InvalidArgumentError('Invalid Visibility Timeout');
  }

  if (options.waitTimeSeconds &&
    (options.waitTimeSeconds < 0 || options.waitTimeSeconds > 20)) {
    throw new InvalidArgumentError('Invalid Receive Wait Time');
  }

  if (options.concurrency && (options.concurrency > 10 || options.concurrency < 1)) {
    throw new InvalidArgumentError('Invalid Concurrency');
  }
};

module.exports = Consumer;

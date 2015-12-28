'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const jobBus = require('../main');
const Consumer = require('../lib/consumer');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Consumer - Create', () => {

  const sqsOptions = {
    region: 'eu-west-1',
    accessKeyId: 'abc',
    secretAccessKey: 'def'
  };

  const delegate = () => {
  };

  it('should throw InvalidArgumentError if requestQueueUrl is invalid', () => {
    return expect(() => jobBus.createConsumer(123, delegate, sqsOptions))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if options are invalid', () => {
    return expect(() => jobBus.createConsumer('queue', delegate, 'abc'))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if delegate is invalid', () => {
    return expect(() => jobBus.createConsumer('queue', 'abc', sqsOptions))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if visibility timeout is not valid', () => {
    const newOptions = Object.assign({}, sqsOptions, {visibilityTimeout: 100000});

    return expect(() => jobBus.createConsumer('queue', delegate, newOptions))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if receive wait time is not valid', () => {
    const newOptions = Object.assign({}, sqsOptions, {waitTimeSeconds: 200});

    return expect(() => jobBus.createConsumer('queue', delegate, newOptions))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should create a consumer', () => {
    return expect(jobBus.createConsumer('queue', delegate, sqsOptions))
      .to.be.an.instanceof(Consumer);
  });
});

describe('Consumer - Process jobs', () => {

  let sqs = null;
  let consumer = null;
  let delegate = null;

  const data = {a: 123};
  const id = 'job-1';
  const job = {id, data};
  const Body = JSON.stringify({job});
  const MessageId = 'message-1';
  const ReceiptHandle = 'receipt-1';
  const visibilityTimeout = 1200;
  const waitTimeSeconds = 19;
  const inputQueueUrl = 'queue';

  beforeEach(() => {
    sqs = sinon.mock();
    sqs.receiveMessage = sinon.stub().yieldsAsync(null, {
      Messages: [{ReceiptHandle, Body, MessageId}]
    });
    sqs.receiveMessage.onSecondCall().returns();
    sqs.deleteMessage = sinon.stub().yieldsAsync(null, {});
  });

  it('should receive, process and delete a message', (done) => {

    delegate = sinon.stub().yieldsAsync(null, {processed: true});

    consumer = jobBus.createConsumer(inputQueueUrl, delegate, {
      sqs,
      visibilityTimeout,
      waitTimeSeconds,
      accessKeyId: '123',
      secretAccessKey: '456',
      region: 'some-region'
    });

    consumer.on('processed-message', () => {
      consumer.stop();

      try {
        sinon.assert.callOrder(sqs.receiveMessage, delegate, sqs.deleteMessage);
        sinon.assert.calledOnce(sqs.receiveMessage);
        sinon.assert.calledWith(sqs.receiveMessage, {
          MaxNumberOfMessages: 1,
          QueueUrl: inputQueueUrl,
          VisibilityTimeout: visibilityTimeout,
          WaitTimeSeconds: waitTimeSeconds
        });
        sinon.assert.calledOnce(delegate);
        sinon.assert.calledWith(delegate, job);
        sinon.assert.calledOnce(sqs.deleteMessage);
        sinon.assert.calledWith(sqs.deleteMessage, {
          ReceiptHandle,
          QueueUrl: inputQueueUrl
        });
        done();
      } catch (err) {
        done(err);
      }
    });

    consumer.start();
  });

  it('should not delete a message if delegate returned error and emit delegate-error', (done) => {

    const error = new Error('oh noes');
    delegate = sinon.stub().yieldsAsync(error, null);

    consumer = jobBus.createConsumer(inputQueueUrl, delegate, {
      sqs,
      visibilityTimeout,
      waitTimeSeconds,
      accessKeyId: '123',
      secretAccessKey: '456',
      region: 'some-region'
    });

    let emittedError = null;
    consumer.on('delegate-error', (err) => {
      emittedError = err;
    });

    consumer.on('processed-message', () => {
      consumer.stop();

      try {
        sinon.assert.callOrder(sqs.receiveMessage, delegate);
        sinon.assert.calledOnce(sqs.receiveMessage);
        sinon.assert.calledWith(sqs.receiveMessage, {
          MaxNumberOfMessages: 1,
          QueueUrl: inputQueueUrl,
          VisibilityTimeout: visibilityTimeout,
          WaitTimeSeconds: waitTimeSeconds
        });
        sinon.assert.calledOnce(delegate);
        sinon.assert.calledWith(delegate, job);
        sinon.assert.notCalled(sqs.deleteMessage);
        expect(emittedError).to.deep.equal(error);
        done();
      } catch (err) {
        done(err);
      }
    });

    consumer.start();
  });

  it('should emit sqs-error if message cannot be received', (done) => {

    const sqsError = new Error('There is an SQS problem');

    delegate = sinon.stub().yieldsAsync(null, null);
    sqs.receiveMessage = sinon.stub().yieldsAsync(sqsError, null);

    consumer = jobBus.createConsumer(inputQueueUrl, delegate, {
      sqs,
      visibilityTimeout,
      waitTimeSeconds,
      accessKeyId: '123',
      secretAccessKey: '456',
      region: 'some-region'
    });

    consumer.on('sqs-error', (err) => {
      consumer.stop();

      try {
        sinon.assert.callOrder(sqs.receiveMessage);
        sinon.assert.calledOnce(sqs.receiveMessage);
        sinon.assert.calledWith(sqs.receiveMessage, {
          MaxNumberOfMessages: 1,
          QueueUrl: inputQueueUrl,
          VisibilityTimeout: visibilityTimeout,
          WaitTimeSeconds: waitTimeSeconds
        });
        sinon.assert.notCalled(delegate);
        sinon.assert.notCalled(sqs.deleteMessage);
        expect(err.message).to.equal(sqsError.message);
        done();
      } catch (err) {
        done(err);
      }
    });

    consumer.start();
  });
});

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const jobBus = require('../main');
const Producer = require('../lib/producer');

const JobError = jobBus.JobError;

const expect = chai.expect;
chai.use(chaiAsPromised);

const sqsOptions = {
  region: 'eu-west-1',
  accessKeyId: 'abc',
  secretAccessKey: 'def'
};

describe('Producer - Create', () => {

  const inputQueueUrl = 'request-queue';
  const outputQueueUrl = 'response-queue';
  const delegate = () => {};

  it('should throw InvalidArgumentError if inputQueueUrl is invalid', () => {
    return expect(() => jobBus.createProducer(123,
      outputQueueUrl, delegate, sqsOptions))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if outputQueueUrl is invalid', () => {
    return expect(() => jobBus.createProducer(inputQueueUrl,
      123, delegate, sqsOptions))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if options are invalid', () => {
    return expect(() => jobBus.createProducer(inputQueueUrl,
      outputQueueUrl, delegate, 'abc'))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if delegate is invalid', () => {
    return expect(() => jobBus.createProducer(inputQueueUrl,
      outputQueueUrl, 'abc', sqsOptions))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if visibility timeout is not valid', () => {
    const newOptions = Object.assign({}, sqsOptions, {visibilityTimeout: 100000});

    return expect(() => jobBus.createProducer(inputQueueUrl,
      outputQueueUrl, delegate, newOptions))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if receive wait time is not valid', () => {
    const newOptions = Object.assign({}, sqsOptions, {waitTimeSeconds: 200});

    return expect(() => jobBus.createProducer(inputQueueUrl,
      outputQueueUrl, delegate, newOptions))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should create a producer', () => {
    const newOptions = Object.assign({}, sqsOptions, {waitTimeSeconds: 20});

    return expect(jobBus.createProducer(inputQueueUrl,
      outputQueueUrl, delegate, newOptions))
      .to.be.an.instanceof(Producer);
  });
});

describe('Producer - Process jobs', () => {

  let sqs = null;
  let producer = null;
  let delegate = null;

  const data = {a: 123};
  const id = 'job-1';
  const job = {id, data};
  const Body = JSON.stringify({job});
  const MessageId = 'message-1';
  const ReceiptHandle = 'receipt-1';
  const visibilityTimeout = 1200;
  const waitTimeSeconds = 19;
  const inputQueueUrl = 'input-queue';
  const outputQueueUrl = 'output-queue';

  beforeEach(() => {
    sqs = sinon.mock();
    sqs.receiveMessage = sinon.stub().yieldsAsync(null, {
      Messages: [{ReceiptHandle, Body, MessageId}]
    });
    sqs.receiveMessage.onSecondCall().returns();
    sqs.deleteMessage = sinon.stub().yieldsAsync(null, {});
    sqs.sendMessage = sinon.stub().yieldsAsync(null, {});
  });

  it('should receive, process and delete a message, then publish success result', (done) => {

    const jobResult = {processed: true};
    delegate = sinon.stub().yieldsAsync(null, jobResult);

    producer = jobBus.createProducer(inputQueueUrl, outputQueueUrl, delegate, {
      sqs,
      visibilityTimeout,
      waitTimeSeconds,
      accessKeyId: '123',
      secretAccessKey: '456',
      region: 'some-region'
    });

    let success = null;
    producer.on('job-success', (data) => {
      success = data;
    });

    let error = null;
    producer.on('job-error', (data) => {
      error = data;
    });

    producer.on('processed-message', () => {
      producer.stop();

      try {
        sinon.assert.callOrder(sqs.receiveMessage, delegate, sqs.sendMessage, sqs.deleteMessage);
        sinon.assert.calledOnce(sqs.receiveMessage);
        sinon.assert.calledWith(sqs.receiveMessage, {
          MaxNumberOfMessages: 1,
          QueueUrl: inputQueueUrl,
          VisibilityTimeout: visibilityTimeout,
          WaitTimeSeconds: waitTimeSeconds
        });
        sinon.assert.calledOnce(delegate);
        sinon.assert.calledWith(delegate, job);
        sinon.assert.calledOnce(sqs.sendMessage);
        sinon.assert.calledWith(sqs.sendMessage, {
          QueueUrl: outputQueueUrl,
          MessageBody: JSON.stringify(success)
        });
        sinon.assert.calledOnce(sqs.deleteMessage);
        sinon.assert.calledWith(sqs.deleteMessage, {
          ReceiptHandle,
          QueueUrl: inputQueueUrl
        });

        expect(success.job.id).to.deep.equal(id);
        expect(success.job.revision).to.be.most(new Date().getTime());
        expect(success.job.success).to.deep.equal(jobResult);
        expect(success.job.error).to.deep.equal(undefined);
        expect(error).to.equal(null);
        done();
      } catch (err) {
        done(err);
      }
    });

    producer.start();
  });

  it('should receive, process, not delete message on error and not publish result', (done) => {

    delegate = sinon.stub().yieldsAsync(new Error('oh noes'), null);

    producer = jobBus.createProducer(inputQueueUrl, outputQueueUrl, delegate, {
      sqs,
      visibilityTimeout,
      waitTimeSeconds,
      accessKeyId: '123',
      secretAccessKey: '456',
      region: 'some-region'
    });

    let success = null;
    producer.on('job-success', (data) => {
      success = data;
    });

    let error = null;
    producer.on('job-error', (data) => {
      error = data;
    });

    producer.on('processed-message', () => {
      producer.stop();

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
        sinon.assert.notCalled(sqs.sendMessage);
        sinon.assert.notCalled(sqs.deleteMessage);

        expect(success).to.equal(null);
        expect(error).to.equal(null);
        done();
      } catch (err) {
        done(err);
      }
    });

    producer.start();
  });

  it('should receive, process and delete, then publish error result on JobError', (done) => {

    const delegateError = new JobError('Some job error');
    delegate = sinon.stub().yieldsAsync(delegateError, null);

    producer = jobBus.createProducer(inputQueueUrl, outputQueueUrl, delegate, {
      sqs,
      visibilityTimeout,
      waitTimeSeconds,
      accessKeyId: '123',
      secretAccessKey: '456',
      region: 'some-region'
    });

    let success = null;
    producer.on('job-success', (data) => {
      success = data;
    });

    let error = null;
    producer.on('job-error', (data) => {
      error = data;
    });

    producer.on('processed-message', () => {
      producer.stop();

      try {
        sinon.assert.callOrder(sqs.receiveMessage, delegate, sqs.sendMessage, sqs.deleteMessage);
        sinon.assert.calledOnce(sqs.receiveMessage);
        sinon.assert.calledWith(sqs.receiveMessage, {
          MaxNumberOfMessages: 1,
          QueueUrl: inputQueueUrl,
          VisibilityTimeout: visibilityTimeout,
          WaitTimeSeconds: waitTimeSeconds
        });
        sinon.assert.calledOnce(delegate);
        sinon.assert.calledWith(delegate, job);
        sinon.assert.calledOnce(sqs.sendMessage);
        sinon.assert.calledWith(sqs.sendMessage, {
          QueueUrl: outputQueueUrl,
          MessageBody: JSON.stringify(error)
        });
        sinon.assert.calledOnce(sqs.deleteMessage);
        sinon.assert.calledWith(sqs.deleteMessage, {
          ReceiptHandle,
          QueueUrl: inputQueueUrl
        });

        expect(error.job.id).to.deep.equal(id);
        expect(error.job.revision).to.be.most(new Date().getTime());
        expect(error.job.success).to.deep.equal(undefined);
        expect(error.job.error).to.deep.equal({
          message: 'Job failed',
          reason: delegateError.message,
          stack: delegateError.stack
        });
        expect(success).to.equal(null);
        done();
      } catch (err) {
        done(err);
      }
    });

    producer.start();
  });
});

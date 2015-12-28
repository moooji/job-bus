'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const jobBus = require('../main');
const Dispatcher = require('../lib/dispatcher');
const helpers = require('../lib/helpers');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Dispatcher - Create', () => {

  const sqsOptions = {
    region: 'eu-west-1',
    accessKeyId: 'abc',
    secretAccessKey: 'def'
  };

  it('should throw InvalidArgumentError if requestUrl is not a valid string', () => {
    return expect(() => jobBus.createDispatcher(123, sqsOptions))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if region is not a valid string', () => {
    return expect(() => jobBus.createDispatcher('queue', null))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should create a dispatcher', () => {
    return expect(jobBus.createDispatcher('queue', sqsOptions))
      .to.be.an.instanceof(Dispatcher);
  });
});

describe('Dispatcher - Publish job', () => {

  let sqs = null;
  let dispatcher = null;
  const outputQueueUrl = 'queue';

  beforeEach(() => {
    sqs = sinon.mock();
    sqs.sendMessage = sinon.stub().yieldsAsync(null, {});

    dispatcher = jobBus.createDispatcher(outputQueueUrl, {
      sqs,
      accessKeyId: '123',
      secretAccessKey: '456',
      region: 'some-region'
    });
  });

  it('should throw InvalidArgumentError when publishing job with invalid id', () => {
    return expect(dispatcher.publishJob({a: 123}, 123))
      .to.be.rejectedWith(jobBus.InvalidArgumentError);
  });

  it('should publish a job', () => {
    const data = {a: 123};
    const id = helpers.getHash(data);

    const expectedMessage = {
      MessageBody: JSON.stringify({job: {id, data}}),
      QueueUrl: outputQueueUrl
    };

    return expect(dispatcher.publishJob(data))
      .to.eventually.be.fulfilled
      .then(() => {
        sinon.assert.calledOnce(sqs.sendMessage);
        sinon.assert.calledWith(sqs.sendMessage, expectedMessage);
      });
  });

  it('should publish a job with optional id', () => {
    const data = {a: 123};
    const id = 'job-123';

    const expectedMessage = {
      MessageBody: JSON.stringify({job: {id, data}}),
      QueueUrl: outputQueueUrl
    };

    return expect(dispatcher.publishJob(data, id))
      .to.eventually.be.fulfilled
      .then(() => {
        sinon.assert.calledOnce(sqs.sendMessage);
        sinon.assert.calledWith(sqs.sendMessage, expectedMessage);
      });
  });
});

describe('Dispatcher - Publish job error', () => {

  let sqs = null;
  let dispatcher = null;
  const outputQueueUrl = 'queue';

  beforeEach(() => {
    sqs = sinon.mock();
    sqs.sendMessage = sinon.stub().yieldsAsync(new Error('Message too large'), {});

    dispatcher = jobBus.createDispatcher(outputQueueUrl, {
      sqs,
      accessKeyId: '123',
      secretAccessKey: '456',
      region: 'some-region'
    });
  });

  it('should throw SqsError when sendMessage returns error', () => {
    const data = {a: 123};

    return expect(dispatcher.publishJob(data))
      .to.be.rejectedWith(jobBus.SqsError)
      .then(() => {
        sinon.assert.calledOnce(sqs.sendMessage);
      });
  });
});

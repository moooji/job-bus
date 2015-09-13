'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const jobBus = require('../main');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Producer', () => {

  const requestQueueUrl = 'http://www.aws.com';
  const responseQueueUrl = 'http://www.aws.com';
  const region = 'eu-west-1';
  const delegate = () => {};

  it('should throw InvalidArgumentError if requestQueueUrl is not a valid string', () => {
    return expect(() => jobBus.createProducer(123, responseQueueUrl, region, delegate))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if responseQueueUrl is not a valid string', () => {
    return expect(() => jobBus.createProducer(requestQueueUrl, 123, region, delegate))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if region is not a valid string', () => {
    return expect(() => jobBus.createProducer(requestQueueUrl, responseQueueUrl, null, delegate))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if delegate is not a valid function', () => {
    return expect(() => jobBus.createProducer(requestQueueUrl, responseQueueUrl, region, null))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw not InvalidArgumentError if arguments are correct', () => {
    return expect(() => jobBus.createProducer(requestQueueUrl, responseQueueUrl, region, delegate))
      .to.not.throw(jobBus.InvalidArgumentError);
  });
});

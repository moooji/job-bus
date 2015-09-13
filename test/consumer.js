'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const jobBus = require('../main');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Consumer', () => {

  const delegate = () => {};

  it('should throw InvalidArgumentError if requestQueueUrl is not a valid string', () => {
    return expect(() => jobBus.createConsumer(123, 'eu-west-1', delegate))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if region is not a valid string', () => {
    return expect(() => jobBus.createConsumer('http://www.aws.com', null, delegate))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if delegate is not valid function', () => {
    return expect(() => jobBus.createConsumer('http://www.aws.com', 'eu-west-1', null))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should not throw InvalidArgumentError if arguments are correct', () => {
    return expect(() => jobBus.createConsumer('http://www.aws.com', 'eu-west-1', delegate))
      .to.not.throw(jobBus.InvalidArgumentError);
  });
});

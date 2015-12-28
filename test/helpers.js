'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const AWS = require('aws-sdk');
const helpers = require('../lib/helpers');
const errors = require('../lib/errors');

const InvalidArgumentError = errors.InvalidArgumentError;

const expect = chai.expect;
chai.use(chaiAsPromised);

const sqsOptions = {
  region: 'eu-west-1',
  accessKeyId: 'abc',
  secretAccessKey: 'def'
};

describe('Helpers - getHash', () => {

  it('should return a hash for an object', () => {
    return expect(helpers.getHash({a: 123, b: 567}))
      .to.equal('a3c7e7e03a284ba3ab4e913666527b8b3117ebf8');
  });
});

describe('Helpers - createSqs', () => {

  it('should return a new SQS instance', () => {
    return expect(helpers.createSqs(sqsOptions))
      .to.be.an.instanceof(AWS.SQS);
  });

  it('should return supplied SQS instance', () => {
    const sqs = new AWS.SQS(sqsOptions);
    const newOptions = Object.assign(sqsOptions, {sqs});

    return expect(helpers.createSqs(newOptions))
      .to.equal(sqs);
  });

  it('should throw error for missing options', () => {
    return expect(() => helpers.createSqs())
      .to.throw(InvalidArgumentError);
  });

  it('should throw error for invalid options', () => {
    return expect(() => helpers.createSqs({region: 'abc'}))
      .to.throw(InvalidArgumentError);
  });

  it('should ignore other options if SQS instance is supplied', () => {
    const sqs = new AWS.SQS(sqsOptions);

    return expect(() => helpers.createSqs({sqs, region: 123}))
      .to.not.throw(InvalidArgumentError)
      .to.equal(sqs);
  });
});

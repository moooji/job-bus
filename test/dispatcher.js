'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const jobBus = require('../main');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Dispatcher', () => {

  it('should throw InvalidArgumentError if requestUrl is not a valid string', () => {
    return expect(() => jobBus.createDispatcher(123, 'eu-west-1'))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError if region is not a valid string', () => {
    return expect(() => jobBus.createDispatcher('http://www.aws.com', null))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw not InvalidArgumentError if arguments are correct', () => {
    return expect(() => jobBus.createDispatcher('http://www.aws.com', 'eu-west-1'))
      .to.not.throw(jobBus.InvalidArgumentError);
  });
});

describe('Dispatcher - Create and publish job', () => {

  const dispatcher = jobBus.createDispatcher('http://www.aws.com', 'eu-west-1');

  it('should throw InvalidArgumentError when creating Job with invalid data', () => {

    expect(() => dispatcher.createJob(123))
      .to.throw(jobBus.InvalidArgumentError);

    expect(() => dispatcher.createJob(null))
      .to.throw(jobBus.InvalidArgumentError);

    expect(() => dispatcher.createJob('abc'))
      .to.throw(jobBus.InvalidArgumentError);

    expect(() => dispatcher.createJob({a: 123}))
      .to.not.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError when creating Job with invalid id', () => {

    expect(() => dispatcher.createJob({a: 123}))
      .to.not.throw(jobBus.InvalidArgumentError);

    expect(() => dispatcher.createJob({a: 123}, 'abc'))
      .to.not.throw(jobBus.InvalidArgumentError);

    expect(() => dispatcher.createJob({a: 123}, 123))
      .to.throw(jobBus.InvalidArgumentError);
  });

  it('should throw InvalidArgumentError when publishing invalid Job', () => {

    const job = dispatcher.createJob({a: 123});

    expect(dispatcher.publishJob(123))
      .to.be.rejectedWith(jobBus.InvalidArgumentError);

    expect(dispatcher.publishJob(null))
      .to.be.rejectedWith(jobBus.InvalidArgumentError);

    expect(dispatcher.publishJob(job))
      .to.be.eventually.fulfilled
      .then();
  });
});

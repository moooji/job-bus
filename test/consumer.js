'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const jobBus = require('../main');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('Consumer', () => {

  it('should return InvalidArgumentError if options are null', () => {
    return expect(() => jobBus.createConsumer)
      .to.throw(jobBus.InvalidArgumentError);
  });
});

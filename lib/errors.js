'use strict';

const createError = require('custom-error-generator');
const JobError = createError('JobError');
const JobBusError = createError('JobBusError');
const InvalidArgumentError = createError('InvalidArgumentError');

module.exports.JobError = JobError;
module.exports.JobBusError = JobBusError;
module.exports.InvalidArgumentError = InvalidArgumentError;

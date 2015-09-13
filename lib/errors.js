'use strict';

const createError = require('custom-error-generator');
const JobError = createError('JobError');
const InvalidArgumentError = createError('InvalidArgumentError');

module.exports.JobError = JobError;
module.exports.InvalidArgumentError = InvalidArgumentError;

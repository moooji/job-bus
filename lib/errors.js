'use strict';

const createError = require('custom-error-generator');
const JobError = createError('JobError');
const InvalidArgumentError = createError('InvalidArgumentError');
const SqsError = createError('SqsError');

module.exports.JobError = JobError;
module.exports.InvalidArgumentError = InvalidArgumentError;
module.exports.SqsError = SqsError;

'use strict';

const jobBus = require('../main');

const requestsUrl = process.env.JOB_BUS_REQUESTS_SQS_URL;
const responsesUrl = process.env.JOB_BUS_RESPONSES_SQS_URL;
const region = process.env.JOB_BUS_SQS_REGION;

const dispatcher = jobBus.createDispatcher(requestsUrl, region);

const job = dispatcher.createJob({ cow: 'mooo' });
console.log(job);

dispatcher.publishJob(job);
dispatcher.publishJob(job);

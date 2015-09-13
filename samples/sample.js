'use strict';

const Bluebird = require('bluebird');
const jobBus = require('../main');

const requestQueueUrl = process.env.JOB_BUS_REQUESTS_SQS_URL;
const responseQueueUrl = process.env.JOB_BUS_RESPONSES_SQS_URL;
const region = process.env.JOB_BUS_SQS_REGION;

const dispatcher = jobBus.createDispatcher(requestQueueUrl, region);
const producer = jobBus.createProducer(requestQueueUrl, responseQueueUrl, region, onRequest);
const consumer = jobBus.createConsumer(responseQueueUrl, region, onResponse);

const job = dispatcher.createJob({cow: 'mooo'});

dispatcher.publishJob(job);
dispatcher.publishJob(job);

producer.on('error', (err) => {
  console.log('Producer error');
  console.error(err);
});

consumer.on('error', (err) => {
  console.log('Consumer error');
  console.error(err);
});

function onRequest(request, callback) {

  return Bluebird.resolve(request)
    .then((request) => {

      //throw new producer.JobError('oh noes');
      //throw new Error('Super error');

      console.log(request);
      return {bazinga: true};
    })
    .nodeify(callback);
}

function onResponse(response, callback) {

  return Bluebird.resolve(response)
    .then((response) => {

      //throw new worker.JobError('oh noes');
      //throw new Error('Super error');

      console.log(response);
    })
    .nodeify(callback);
}

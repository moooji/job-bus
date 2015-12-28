'use strict';

const jobBus = require('../main');

const requestQueueUrl = process.env.JOB_BUS_REQUESTS_SQS_URL;
const responseQueueUrl = process.env.JOB_BUS_RESPONSES_SQS_URL;
const region = process.env.JOB_BUS_SQS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const options = {region, accessKeyId, secretAccessKey};

const dispatcher = jobBus.createDispatcher(requestQueueUrl, options);
const consumer = jobBus.createConsumer(responseQueueUrl, onResponse, options);
const producer = jobBus.createProducer(requestQueueUrl, responseQueueUrl, onRequest, options);

const JobError = jobBus.JobError;

for (let i = 0; i < 10; i++) {
  const id = `job-${i}`;
  const data = {downloadUrl: 'http://www.cow-images.com'};
  dispatcher.publishJob(data, id);
}

producer.on('debug', (data) => console.log(data));
producer.on('info', (data) => console.log(data));
producer.on('warn', (data) => console.log(data));
//producer.on('error', (err) => console.log(err));

consumer.on('debug', (data) => console.log(data));
consumer.on('info', (data) => console.log(data));
consumer.on('warn', (data) => console.log(data));
//consumer.on('error', (err) => console.log(err));

consumer.start();
producer.start();

function onRequest(job, callback) {
  console.log(job);

  // Generate random job error
  const err = Math.random() < 0.5 ? new JobError('Server offline') : null;
  return callback(err, {imageSize: 300000});
}

function onResponse(job, callback) {
  console.log(job);
  return callback(null, null);
}

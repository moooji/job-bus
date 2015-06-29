"use strict";

var Promise = require("bluebird");
var JobQueue = require("../main");

var q = new JobQueue("bloggsta-blogs", {
    accessKeyId: process.env["AWS_ACCESS_KEY_ID"],
    secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"],
    region: process.env["AWS_SQS_REGION"],
    baseQueueUrl: process.env["AWS_SQS_BASE_QUEUE_URL"]
});

q.registerWorker(worker);
q.registerFinalizer(finalizer);

function worker (job, callback) {

    return Promise.resolve(job)
        .then(function(job){
            console.log("Worker");
            console.log(job);

            return { yeah: true };
        }).nodeify(callback);

}

function finalizer (job, callback) {

    return Promise.resolve(job)
        .then(function(job){
            console.log("Finalizer");
            console.log(job);
        }).nodeify(callback);
}

var job = new q.Job({ test: "mooo" });
console.log(job.id);
job.publish();
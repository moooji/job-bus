"use strict";

var crypto = require("crypto");
var Promise = require("bluebird");
var serviceBus = require("service-bus");
var createError = require("custom-error-generator");
var _ = require("lodash");

var JobError = createError('JobError');
var JobQueueError = createError('JobQueueError');
var InvalidArgumentError = createError('InvalidArgumentError');

/**
 * Job Queue constructor
 * @param {String} name
 * @param {Object} options
 * @returns {{Job: Job, InvalidArgumentError: (Function|*), JobQueueError: (Function|*)}}
 * @constructor
 */
function jobQueue(name, options) {

    validate(name, options);

    var requestUrl = options.baseQueueUrl + name + "-requests";
    var requestBus = serviceBus(requestUrl, options);

    var responseUrl = options.baseQueueUrl + name + "-responses";
    var responseBus = serviceBus(responseUrl, options);

    var _workerDelegate;
    var _finalizerDelegate;


    /**
     * Registers a worker delegate and starts subscription
     * @param {function} delegate
     */
    function registerWorker(delegate) {

        if (!_.isFunction(delegate)) {
           throw new InvalidArgumentError("Invalid worker delegate (not a function)");
        }

        if (_.isFunction(_workerDelegate)) {
            throw new JobQueueError("Worker has already been registered");
        }

        _workerDelegate = Promise.promisify(delegate);

        requestBus.subscribe(onRequests, function (err) {

            if (err) throw err;
            console.log("Worker subscribed to request service bus");
        });
    }

    /**
     * Registers a finalizer delegate and starts subscription
     * @param {function} delegate
     */
    function registerFinalizer(delegate) {

        if (!_.isFunction(delegate)) {
            throw new InvalidArgumentError("Invalid finalizer delegate (not a function)");
        }

        if (_.isFunction(_finalizerDelegate)) {
            throw new JobQueueError("Finalizer has already been registered");
        }

        _finalizerDelegate = Promise.promisify(delegate);

        responseBus.subscribe(onResponses, function (err) {

            if (err) throw err;
            console.log("Finalizer subscribed to responses service bus");
        });
    }

    /**
     * Delegate to handle received requests from service bus
     * @param {[Object]} requests
     * @param {function} done
     */
    function onRequests (requests, done) {

        Promise.resolve(requests)
            .map(processRequest, { concurrency: 1 })
            .then(done)
            .catch(function(err) {

                // This is an unexpected error,
                // which means that something might be wrong with the consumer itself.
                // Thus, we will not acknowledge the message so that this
                // or another consumer can try again.

                console.log(err);
                console.log(err.stack);
                process.exit(1);
            });
    }

    /**
     * Processes one message and publishes result on service bus.
     * Returns a promise.
     * @param {Object} request
     * @returns {Promise}
     */
    function processRequest (request) {

        var job = request.body.job;

        return Promise.resolve(job.data)
            .then(_workerDelegate)
            .then(function(res) {

                if (!_.isPlainObject(res)) {
                    throw new JobError("Worker did not return valid result (no object)");
                }

                return {
                    job: {
                        id: job.id,
                        revision: new Date().getTime(),
                        success: res
                    }
                }
            })
            .catch(JobError, function (err) {

                // This is an (expected) operational error
                // which means that worker tried its best to process the request,
                // but could not successfully deliver a result.
                //
                // No unexpected exception happened and the worker process works
                // like expected. Thus, we will acknowledge the message so that no
                // other worker will try again and send an error response.

                return {
                    job: {
                        id: job.id,
                        revision: new Date().getTime(),
                        error: {
                            message: "Job failed",
                            reason: err.message,
                            stack: err.stack
                        }
                    }
                }
            })
            .then(responseBus.publish)
            .then(function () {
                return requestBus.acknowledge(request);
            });
    }

    /**
     * Delegate to handle received responses from service bus
     * @param {[Object]} responses
     * @param {function} done
     */
    function onResponses (responses, done) {

        Promise.resolve(responses)
            .map(processResponse, { concurrency: 1 })
            .then(done)
            .catch(function(err) {

                // This is an unexpected error,
                // which means that something might be wrong with the consumer itself.
                // Thus, we will not acknowledge the message so that this
                // or another consumer can try again.

                console.error(err);
                process.exit(1);
            });
    }

    /**
     * Processes one response.
     * Returns a promise.
     * @param {Object} response
     * @returns {Promise}
     */
    function processResponse (response) {

        var job = response.body.job;

        return Promise.resolve(job)
            .then(_finalizerDelegate)
            .then(function () {
                return responseBus.acknowledge(response);
            });
    }

    // TODO: Make this a factory
    // const job = jobBus.createJob({});
    // jobBus.publishJob(job);

    /**
     * Job constructor
     * @param {Object} data
     */
    function Job(data) {

        this.data = data;
        this.id = md5(data);
    }

    /**
     * Creates a job
     * @param {Object} data
     * @constructor
     */
    function createJob(data) {

        if (!_.isPlainObject(data)) {
            throw new JobQueueError("Invalid job data");
        }

        return new Job(data);
    }

    /**
     * Publishes a Job
     * @param {Job} job
     */
    function publishJob(job) {

        if (!(job instanceof Job)) {
            throw new JobQueueError("Invalid Job");
        }

        requestBus.publish({
            job: {
                id: job.id,
                data: job.data
            }
        });
    }

    /**
     * Creates an MD5 hex hash
     * @param data
     * @returns {String}
     */
    function md5(data) {

        if (!_.isPlainObject(data)) {
            throw new InvalidArgumentError("Invalid job data");
        }

        var dataString = JSON.stringify(data);
        var dataBuffer = new Buffer(dataString);
        var hash = crypto.createHash('md5');

        hash.update(dataBuffer);
        return hash.digest('hex');
    }

    /**
     * Validates the job queue options
     * @param name
     * @param options
     */
    function validate(name, options) {

        if (!_.isString(name)) {
            throw new InvalidArgumentError("No name provided");
        }

        if (!options) {
            throw new InvalidArgumentError("No options provided");
        }

        if (!options.accessKeyId) {
            throw new InvalidArgumentError("No AWS 'accessKeyId' provided");
        }

        if (!options.secretAccessKey) {
            throw new InvalidArgumentError("No AWS 'secretAccessKey' provided");
        }

        if (!options.baseQueueUrl) {
            throw new InvalidArgumentError("No AWS 'baseQueueUrl' provided");
        }

        if (!options.region) {
            throw new InvalidArgumentError("No AWS 'region' provided");
        }
    }

    return {
        Job: Job,
        createJob: createJob,
        publishJob: publishJob,
        registerWorker: registerWorker,
        registerFinalizer: registerFinalizer,
        InvalidArgumentError: InvalidArgumentError,
        JobQueueError: JobQueueError,
        JobError: JobError
    };
}

module.exports = jobQueue;
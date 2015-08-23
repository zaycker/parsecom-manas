var createTimeSegments = require('cloud/functions/createTimeSegments.js'),
    trueTimeFetch = require('cloud/functions/trueTimeFetch.js'),
    trueDurationFetch = require('cloud/functions/trueDurationFetch.js');

Parse.Cloud.job('createTimeSegments', function(request, status) {
    createTimeSegments.execute().then(function () {
        status.success("segments created");
    });
});

Parse.Cloud.define('trueTimeFetch', function(request, response) {
    var params = request.params;
    trueTimeFetch.execute(params.WorkShopKey, params.StartTime, params.T_offset).then(function (endTime) {
        response.success(endTime);
    });
});

Parse.Cloud.define('trueDurationFetch', function(request, response) {
    var params = request.params;
    trueTimeFetch.execute(params.WorkshopKey, params.StartT, params.EndT).then(function (duration) {
        response.success(duration);
    });
});

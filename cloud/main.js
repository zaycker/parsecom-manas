var createTimeSegments = require('cloud/functions/createTimeSegments.js'),
    toolSet = require('cloud/functions/toolSet.js');

Parse.Cloud.job('createTimeSegments', function(request, status) {
    createTimeSegments.execute().then(function () {
        status.success("segments created");
    });
});

Parse.Cloud.define('trueTimeFetch', function(request, response) {
    var params = request.params;
    toolSet.trueTimeFetch(params.WorkShopKey, params.StartDate, params.StartTime, params.T_offset).then(function (endTime) {
        response.success(endTime);
    });
});

Parse.Cloud.define('trueDurationFetch', function(request, response) {
    var params = request.params;
    toolSet.trueDurationFetch(params.WorkshopKey, params.StartDate, params.StartTime, params.EndDate, params.EndTime).then(function (duration) {
        response.success(duration);
    });
});

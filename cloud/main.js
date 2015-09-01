var createTimeSegments = require('cloud/functions/createTimeSegments.js'),
    fetchFunctions = require('cloud/functions/fetchFunctions.js');

Parse.Cloud.job('createTimeSegments', function(request, status) {
    createTimeSegments.execute(request.params).then(status.success);
});

Parse.Cloud.define('trueTimeFetch', function(request, response) {
    var params = request.params;
    fetchFunctions.trueTimeFetch(params.WorkShopKey, params.StartDate, params.StartTime, params.T_offset)
        .then(response.success);
});

Parse.Cloud.define('trueDurationFetch', function(request, response) {
    var params = request.params;
    fetchFunctions.trueDurationFetch(params.WorkShopKey, params.StartDate, params.StartTime, params.EndDate, params.EndTime)
        .then(response.success);
});

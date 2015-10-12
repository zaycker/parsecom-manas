var Promise = Parse.Promise,
    packageLength = 1000,
    tickLength = 0,
    timeOut = 1000;

cleanSegments().done(createObjects).done(done);

var cleanSegments = function () {
    return _fetchObjectsAndDestroy().done(_isEverythinDestroyed).error(fetchObjectsAndDestroyTimeouted);
};

var _fetchObjectsAndDestroy = function () {
    var limit = packageLength - tickLength,
        query = new Parse.Query(this._objectClass).limit(limit),
        promisesOfObjectsToRemove = [];
    if (!limit) {
        return fetchObjectsAndDestroyTimeouted();
    }
    return query.each(function (timeSegment) {
        tickLength++;
        promisesOfObjectsToRemove.push(timeSegment.destroy());
    }).done(function () {
        return Promise.as(promisesOfObjectsToRemove);
    });
};

var fetchObjectsAndDestroyTimeouted = function () {
    return _wait().done(_fetchObjectsAndDestroy);
};

var _isEverythinDestroyed = function (promisesOfObjectsToRemove) {
    if (promisesOfObjectsToRemove.length === 0) {
        return Promise.as(true);
    }
    return Promise.when(promisesOfObjectsToRemove).done(function () {
        return tickLength < packageLength ? Promise.as(true) : fetchObjectsAndDestroyTimeouted();
    });
};

var _wait = function () {
    return new Promise(function (resolve) {
        tickLength = 0;
        setTimeout(resolve, timeOut);
    });
};

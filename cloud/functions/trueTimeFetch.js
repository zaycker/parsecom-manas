/*global Parse*/

var TimeFetcher = {
    /**
     * @param {String} WorkShopKey
     * @param {Number} StartTime
     * @param {Number} T_offset
     * @return {Parse.Promise}
     */
    trueTimeFetch: function (WorkShopKey, StartTime, T_offset) {
        var returnPromise = new Parse.Promise(),
            queryProcessPromise = new Parse.Promise(),
            self = this;

        queryProcessPromise.then(function (cStartDuration) {
            var cEndDuration = cStartDuration + T_offset,
                query = this._getQueryObject(WorkShopKey);

            query.greaterThan('CDuration', cEndDuration);
            query.ascending('SegmentId');
            query.first().then(function (timeSegment) {
                if (typeof timeSegment !== 'undefined') {
                    returnPromise.resolve(timeSegment.get('EndTime') - (timeSegment.get('CDuration') - cEndDuration));
                }
            });
        });

        var query = this._getQueryObject(WorkShopKey);
        query.lessThanOrEqualTo('BeginTime', StartTime);
        query.greaterThanOrEqualTo('EndTime', StartTime);
        query.first().then(function (timeSegment) {
            if (typeof timeSegment !== 'undefined') {
                self._timeSegmentFound(timeSegment, queryProcessPromise);
            } else {
                self._timeSegmentNotFound(WorkShopKey, StartTime, queryProcessPromise);
            }
        });

        return returnPromise;
    },

    /**
     * @param {Parse.Object} timeSegment
     * @param {Parse.Promise} promise
     * @private
     */
    _timeSegmentFound: function (timeSegment, promise) {
        promise.resolve(timeSegment.get('CDuration') - (timeSegment.get('EndTime') - timeSegment.get('StartTime')));
    },

    /**
     * @param {String} WorkShopKey
     * @param {Number} StartTime
     * @param {Parse.Promise} promise
     * @private
     */
    _timeSegmentNotFound: function (WorkShopKey, StartTime, promise) {
        var query = this._getQueryObject(WorkShopKey);
        query.greaterThanOrEqualTo('BeginTime', StartTime);
        query.ascending('SegmentId');
        query.first().then(function (timeSegment) {
            if (typeof timeSegment !== 'undefined') {
                promise.resolve(timeSegment.get('CDuration') - timeSegment.get('Duration'));
            }
        });
    },

    /**
     * @param {String} [WorkShopKey]
     * @return {Parse.Query}
     * @private
     */
    _getQueryObject: function (WorkShopKey) {
        var TimeSegments = Parse.Object.extend('TimeSegments'),
            query = new Parse.Query(TimeSegments);

        if (typeof WorkShopKey !== 'undefined') {
            query.equalTo('WorkshopKey', WorkShopKey);
        }

        return query;
    }
};

module.exports = exports = {
    varsion: '1.0.0',
    execute: TimeFetcher.trueTimeFetch.bind(TimeFetcher)
};

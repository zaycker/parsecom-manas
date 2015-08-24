/*global Parse*/

var TimeFetcher = {
    /**
     * @param {String} WorkShopKey
     * @param {Number} StartTime
     * @param {Number} T_offset
     * @return {Parse.Promise}
     */
    trueTimeFetch: function (WorkShopKey, StartTime, T_offset) {
        var query = this._getQueryObject(WorkShopKey);
        query.lessThanOrEqualTo('BeginTime', StartTime);
        query.greaterThanOrEqualTo('EndTime', StartTime);
        return query.first().then(function (timeSegment) {
            this._getCStartDuration(WorkShopKey, timeSegment, StartTime).then(function (cStartDuration) {
                return this._processCStartDuration(cStartDuration, WorkShopKey, T_offset);
            }.bind(this));
        }.bind(this));
    },

    /**
     * @param {String} WorkShopKey
     * @param {Parse.Object} timeSegment
     * @param {Number} StartTime
     * @return {Parse.Promise}
     * @private
     */
    _getCStartDuration: function (WorkShopKey, timeSegment, StartTime) {
        if (typeof timeSegment !== 'undefined') {
            var promise = new Parse.Promise();
            promise.resolve(timeSegment.get('CDuration') - (timeSegment.get('EndTime') - StartTime));
            return promise;
        } else {
            var query = this._getQueryObject(WorkShopKey);
            query.greaterThanOrEqualTo('BeginTime', StartTime);
            query.ascending('SegmentId');
            return query.first().then(function (timeSegment) {
                if (typeof timeSegment !== 'undefined') {
                    return timeSegment.get('CDuration') - timeSegment.get('Duration');
                }
            });
        }
    },

    /**
     * @param {Number} cStartDuration
     * @param {String} WorkShopKey
     * @param {Number} T_offset
     * @return {Parse.Promise}
     * @private
     */
    _processCStartDuration: function (cStartDuration, WorkShopKey, T_offset) {
        var cEndDuration = cStartDuration + T_offset,
            query = this._getQueryObject(WorkShopKey);

        query.greaterThan('CDuration', cEndDuration);
        query.ascending('SegmentId');
        return query.first().then(function (timeSegment) {
            if (typeof timeSegment !== 'undefined') {
                return timeSegment.get('EndTime') - (timeSegment.get('CDuration') - cEndDuration);
            }
        });
    },

    /**
     * @param {String} [WorkShopKey]
     * @return {Parse.Query}
     * @private
     */
    _getQueryObject: function (WorkShopKey) {
        var query = new Parse.Query('TimeSegments');

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

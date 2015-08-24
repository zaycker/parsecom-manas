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
            var cStartDuration;
            if (typeof timeSegment !== 'undefined') {
                cStartDuration = this._timeSegmentFound(timeSegment);
            } else {
                cStartDuration = this._timeSegmentNotFound(WorkShopKey, StartTime);
            }

            return this._processCStartDuration(cStartDuration, WorkShopKey, T_offset);
        }.bind(this));
    },

    _processCStartDuration: function (cStartDuration, WorkShopKey, T_offset) {
        var cEndDuration = cStartDuration + T_offset,
            query = this._getQueryObject(WorkShopKey);
console.log(cStartDuration);
        query.greaterThan('CDuration', cEndDuration);
        query.ascending('SegmentId');
        return query.first().then(function (timeSegment) {
            if (typeof timeSegment !== 'undefined') {
                return timeSegment.get('EndTime') - (timeSegment.get('CDuration') - cEndDuration);
            }
        });
    },

    /**
     * @param {Parse.Object} timeSegment
     * @private
     */
    _timeSegmentFound: function (timeSegment) {
        return timeSegment.get('CDuration') - (timeSegment.get('EndTime') - timeSegment.get('StartTime'));
    },

    /**
     * @param {String} WorkShopKey
     * @param {Number} StartTime
     * @private
     */
    _timeSegmentNotFound: function (WorkShopKey, StartTime) {
        var query = this._getQueryObject(WorkShopKey);
        query.greaterThanOrEqualTo('BeginTime', StartTime);
        query.ascending('SegmentId');
        return query.first().then(function (timeSegment) {
            if (typeof timeSegment !== 'undefined') {
                return timeSegment.get('CDuration') - timeSegment.get('Duration');
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

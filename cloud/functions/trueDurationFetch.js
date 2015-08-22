/*global Parse*/

var DurationFetcher = {
    /**
     * @param {String} WorkshopKey
     * @param {Number} StartT
     * @param {Number} EndT
     * @return {Parse.Promise}
     */
    trueDurationFetch: function (WorkshopKey, StartT, EndT) {
        'use strict';

        var returnPromise = new Parse.Promise();

        Parse.Promise.when(
            this._fetchBeginDuration(WorkshopKey, StartT),
            this._fetchEndDuration(WorkshopKey, EndT)
        ).then(function (cStartDuration, cEndDuration) {
            returnPromise.resolve(cEndDuration - cStartDuration);
        });

        return returnPromise;
    },

    /**
     * @param {String} WorkshopKey
     * @param {Number} StartT
     * @return {Parse.Promise}
     * @private
     */
    _fetchBeginDuration: function (WorkshopKey, StartT) {
        'use strict';

        var query = this._getQueryObject(WorkshopKey),
            self = this,
            promise = new Parse.Promise();
        query.lessThanOrEqualTo('BeginTime', StartT);
        query.greaterThanOrEqualTo('EndTime', StartT);
        query.first().then(function (timeSegment) {
            if (typeof timeSegment !== 'undefined') {
                self._timeSegmentForBeginDurationFound(timeSegment, StartT, promise);
            } else {
                self._timeSegmentForBeginDurationNotFound(WorkshopKey, StartT, promise);
            }
        });

        return promise;
    },

    /**
     * @param {String} WorkshopKey
     * @param {Number} EndT
     * @return {Parse.Promise}
     * @private
     */
    _fetchEndDuration: function (WorkshopKey, EndT) {
        'use strict';

        var query = this._getQueryObject(WorkshopKey),
            self = this,
            promise = new Parse.Promise();
        query.lessThanOrEqualTo('BeginTime', EndT);
        query.greaterThanOrEqualTo('EndTime', EndT);
        query.first().then(function (timeSegment) {
            if (typeof timeSegment !== 'undefined') {
                self._timeSegmentForEndDurationFound(timeSegment, EndT, promise);
            } else {
                self._timeSegmentForEndDurationNotFound(WorkshopKey, EndT, promise);
            }
        });

        return promise;
    },

    /**
     * @param {Parse.Object} timeSegment
     * @param {Number} StartT
     * @param {Parse.Promise} promise
     * @private
     */
    _timeSegmentForBeginDurationFound: function (timeSegment, StartT, promise) {
        'use strict';

        promise.resolve(timeSegment.get('CDuration') - (timeSegment.get('EndTime') - StartT));
    },

    /**
     * @param {Parse.Object} timeSegment
     * @param {Number} EndT
     * @param {Parse.Promise} promise
     * @private
     */
    _timeSegmentForEndDurationFound: function (timeSegment, EndT, promise) {
        'use strict';

        promise.resolve(timeSegment.get('CDuration') - (timeSegment.get('EndTime') - EndT));
    },

    /**
     * @param {String} WorkshopKey
     * @param {Number} StartT
     * @param {Parse.Promise} promise
     * @private
     */
    _timeSegmentForBeginDurationNotFound: function (WorkshopKey, StartT, promise) {
        'use strict';

        var query = this._getQueryObject(WorkshopKey);
        query.greaterThanOrEqualTo('BeginTime', StartT);
        query.ascending('SegmentId');
        query.first().then(function (timeSegment) {
            if (typeof timeSegment !== 'undefined') {
                promise.resolve(timeSegment.get('CDuration') - timeSegment.get('Duration'));
            }
        });
    },

    /**
     * @param {String} WorkshopKey
     * @param {Number} EndT
     * @param {Parse.Promise} promise
     * @private
     */
    _timeSegmentForEndDurationNotFound: function (WorkshopKey, EndT, promise) {
        'use strict';

        var query = this._getQueryObject(WorkshopKey);
        query.lessThanOrEqualTo('EndTime', EndT);
        query.descending('SegmentId');
        query.first().then(function (timeSegment) {
            if (typeof timeSegment !== 'undefined') {
                promise.resolve(timeSegment.get('CDuration'));
            }
        });
    },


    /**
     * @param {String} [WorkshopKey]
     * @return {Parse.Query}
     * @private
     */
    _getQueryObject: function (WorkshopKey) {
        'use strict';

        var TimeSegments = Parse.Object.extend('TimeSegments'),
            query = new Parse.Query(TimeSegments);

        if (typeof WorkshopKey !== 'undefined') {
            query.equalTo('WorkshopKey', WorkshopKey);
        }

        return query;
    }
};

module.exports = exports = {
    varsion: '1.0.0',
    execute: DurationFetcher.trueDurationFetch.bind(DurationFetcher)
};

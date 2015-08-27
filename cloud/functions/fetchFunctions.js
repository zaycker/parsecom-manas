/*global Parse*/

var moment = require('moment'),
    utils = require('cloud/functions/utils');

var fetchFunctions = {
    /**
     * @param {string} workShopKey
     * @param {string|Date} startDate
     * @param {number} startTime
     * @param {number} t_offset
     * @return {Parse.Promise}
     */
    trueTimeFetch: function (workShopKey, startDate, startTime, t_offset) {
        'use strict';

        return this._convertDateTimeToCDuration(workShopKey, startDate, startTime).then(function (cStartDuration) {
            return this._convertCDurationToDateTime(workShopKey, cStartDuration + t_offset)
        }.bind(this));
    },

    /**
     * @param {string} workShopKey
     * @param {string|Date} startDate
     * @param {number} startTime
     * @param {string|Date} endDate
     * @param {number} endTime
     * @return {Parse.Promise}
     */
    trueDurationFetch: function (workShopKey, startDate, startTime, endDate, endTime) {
        'use strict';

        return Parse.Promise.when(
            this._convertDateTimeToCDuration(workShopKey, startDate, startTime),
            this._convertDateTimeToCDuration(workShopKey, endDate, endTime)
        ).then(function (cStartDuration, cEndDuration) {
            return cEndDuration - cStartDuration;
        });
    },

    /**
     * @param {string} workShopKey
     * @param {string|Date} date
     * @param {number} time
     * @return {Parse.Promise}
     * @private
     */
    _convertDateTimeToCDuration: function(workShopKey, date, time) {
        'use strict';

        var format = 'YYYY-MM-DD',
            query = new Parse.Query('TimeSegments');

        query.equalTo('WorkshopKey', workShopKey);
        query.equalTo('Date', (typeof date === 'string' ? moment(date, format) : moment(date)).format(format));
        query.ascending('SegmentId');
        return query.find().then(function (results) {
            if (results.length !== 2) {
                var query = new Parse.Query('TimeSegments');
                query.equalTo('WorkshopKey', workShopKey);
                query.lessThan('DateObject', moment(date).toDate());
                query.descending('SegmentId');
                return query.first().then(function (segment) {
                    return segment ? segment.get('BeginTime') : null;
                });
            }

            var promise = new Parse.Promise(),
                s1 = results[0], s2 = results[1];
            if (time >= s1.get('BeginTime') && time <= s1.get('EndTime')) {
                promise.resolve(s1.get('CDuration') - utils.getDurationForPeriod([time, s1.get('EndTime')]));
            } else if (time >= s2.get('BeginTime') && time <= s2.get('EndTime')) {
                promise.resolve(s2.get('CDuration') - utils.getDurationForPeriod([time, s2.get('EndTime')]));
            } else if (time < s1.get('BeginTime')) {
                promise.resolve(s1.get('CDuration') - s1.get('Duration'));
            } else if (time > s1.get('EndTime') && time < s2.get('BeginTime')) {
                promise.resolve(s1.get('CDuration'));
            } else if (time > s2.get('EndTime')) {
                promise.resolve(s2.get('CDuration'));
            } else {
                promise.reject();
            }

            return promise;
        });
    },

    /**
     * @param {string} workShopKey
     * @param {number} cDuration
     * @return {Parse.Promise}
     * @private
     */
    _convertCDurationToDateTime: function (workShopKey, cDuration) {
        'use strict';

        var query = new Parse.Query('TimeSegments');
        query.equalTo('WorkshopKey', workShopKey);
        query.greaterThan('CDuration', cDuration);
        query.ascending('SegmentId');
        return query.first().then(function (segment) {
            return {
                'Date': segment ? segment.get('Date') : null,
                'Time': segment ? this._durationMinutesToHours(utils.getDurationForPeriod([
                    this._durationMinutesToHours(segment.get('CDuration') - cDuration),
                    segment.get('EndTime')
                ])) : null
            }
        }.bind(this));
    },

    /**
     * @param {number} duration
     * @return {string}
     * @private
     */
    _durationMinutesToHours: function (duration) {
        var hours = Math.floor(duration / 60),
            minutes = duration % 60;

        return '' + (hours < 10 ? '0' + hours : hours) + (minutes < 10 ? '0' + minutes : minutes);
    }
};

module.exports = exports = {
    version: '1.0.0',
    trueTimeFetch: fetchFunctions.trueTimeFetch.bind(fetchFunctions),
    trueDurationFetch: fetchFunctions.trueDurationFetch.bind(fetchFunctions)
};

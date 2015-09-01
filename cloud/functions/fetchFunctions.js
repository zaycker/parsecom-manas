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
            switch (results.length) {
                case 2:
                    return this._getCDurationWithLunch(time, results)
                case 1:
                    return this._getCDurationWithoutLunch(time, results);
                default:
                    return this._getCDurationWithNoSegments(workShopKey, date);
            }
        }.bind(this));
    },

    /**
     * @param {number} time
     * @param {Array.<Array.<Parse.Object>>} segments
     * @return {Parse.Promise}
     * @private
     */
    _getCDurationWithLunch: function (time, segments) {
        var s1 = segments[0], s2 = segments[1];

        if (time >= s1.get('BeginTime') && time <= s1.get('EndTime')) {
            return Parse.Promise.as(s1.get('CDuration') - utils.getDurationForPeriod([time, s1.get('EndTime')]));
        } else if (time >= s2.get('BeginTime') && time <= s2.get('EndTime')) {
            return Parse.Promise.as(s2.get('CDuration') - utils.getDurationForPeriod([time, s2.get('EndTime')]));
        } else if (time < s1.get('BeginTime')) {
            return Parse.Promise.as(s1.get('CDuration') - s1.get('Duration'));
        } else if (time > s1.get('EndTime') && time < s2.get('BeginTime')) {
            return Parse.Promise.as(s1.get('CDuration'));
        } else if (time > s2.get('EndTime')) {
            return Parse.Promise.as(s2.get('CDuration'));
        } else {
            return Parse.Promise.error('no interval satisfies comparisons');
        }
    },

    /**
     * @param {number} time
     * @param {Array.<Array.<Parse.Object>>} segments
     * @return {Parse.Promise}
     * @private
     */
    _getCDurationWithoutLunch: function (time, segments) {
        var s1 = segments[0];

        if (time >= s1.get('BeginTime') && time <= s1.get('EndTime')) {
            return Parse.Promise.as(s1.get('CDuration') - utils.getDurationForPeriod([time, s1.get('EndTime')]));
        } else if (time < s1.get('BeginTime')) {
            return Parse.Promise.as(s1.get('CDuration') - s1.get('Duration'));
        } else if (time > s1.get('EndTime')) {
            return Parse.Promise.as(s1.get('CDuration'));
        } else {
            return Parse.Promise.error('no interval satisfies comparisons');
        }
    },

    /**
     * @param {string} workShopKey
     * @param {string|Date} date
     * @return {Parse.Promise}
     * @private
     */
    _getCDurationWithNoSegments: function (workShopKey, date) {
        var query = new Parse.Query('TimeSegments');
        query.equalTo('WorkshopKey', workShopKey);
        query.lessThan('DateObject', moment(date).toDate());
        query.descending('SegmentId');
        return query.first().then(function (segment) {
            return segment ? segment.get('BeginTime') : null;
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

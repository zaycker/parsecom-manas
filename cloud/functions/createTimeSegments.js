/*global module,Parse*/

var moment = require('moment'),
    utils = require('cloud/functions/utils');

var TimeSegmentsManager = {
    /**
     * Collector of CDurations
     * @type {Number}
     * @private
     */
    _cDuration: 0,

    /**
     * Collector of SegmentIds
     * @type {Number}
     * @private
     */
    _segmentId: 0,

    /**
     * @type {Number}
     * @private
     */
    _numberOfDays: 90,

    /**
     * @type {Array.<moment>}
     * @private
     */
    _daysArray: null,

    /**
     * @type {Number}
     * @private
     */
    _batchSize: 1500,

    /**
     * @type {Number}
     * @private
     */
    _timeoutOnLimitExceeded: 60000,

    /**
     * @type {String}
     * @private
     */
    _objectClass: 'TimeSegments',

    /**
     * @type {array}
     * @private
     */
    _buffer: [],

    /**
     * @param duration
     * @return {Number}
     * @private
     */
    _getCDuration: function (duration) {
        'use strict';

        return this._cDuration += duration;
    },

    /**
     * @private
     */
    _resetCDuration: function () {
        'use strict';

        this._cDuration = 0;
    },

    /**
     * @return {Number}
     * @private
     */
    _getSegmentId: function () {
        'use strict';

        return this._segmentId++;
    },

    /**
     * @return {number}
     * @private
     */
    _resetSegmentId: function () {
        'use strict';

        this._segmentId = 0;
    },

    /**
     * @param {Parse.Object} workshop
     * @return {Parse.Promise}
     * @private
     */
    _processWorkshop: function (workshop) {
        'use strict';

        var workshopKey = workshop.get('WorkshopKey'),
            workshopHolidays = workshop.get('Holidays'),
            workshopTimetable = this._getWorkshopTimetable(workshop),
            TimeSegmentsClass = Parse.Object.extend(this._objectClass),
            promise = Parse.Promise.as();

        this._resetCDuration();
        this._resetSegmentId();

        this._getDaysToFill().forEach(function (day) {
            var isHoliday = workshopHolidays.hasOwnProperty(day.format('YYYY-MM-DD')),
                dayName = day.format('ddd').toUpperCase(),
                dayTimeTable = workshopTimetable[dayName];

            if (isHoliday || dayTimeTable.length === 0) {
                return;
            }

            dayTimeTable.forEach(function (period) {
                promise = promise.then(function (day) {
                    var timeSegment = new TimeSegmentsClass(),
                        duration = utils.getDurationForPeriod(period);

                    return timeSegment.save({
                        WorkshopKey: workshopKey,
                        SegmentId: this._getSegmentId(),
                        Date: day.format('YYYY-MM-DD'),
                        DateObject: day.toDate(),
                        BeginTime: period[0],
                        EndTime: period[1],
                        Duration: duration,
                        CDuration: this._getCDuration(duration)
                    });
                }.bind(this, day));
            }, this);
        }, this);

        return promise;
    },

    /**
     * @param {Parse.Object} workshop
     * @return {Array.<Array.<number>>}
     * @private
     */
    _getWorkshopTimetable: function (workshop) {
        'use strict';

        var workshopTimetable = workshop.get('Timetable'),
            workshopLunchbreak = workshop.get('WDATA').LunchBreak,
            timePeriods = {};

        for (var day in workshopTimetable) {
            var dayTimeTable = workshopTimetable[day];

            if (dayTimeTable[0] === 0) {
                timePeriods[day] = [];
                continue;
            }

            if (workshopLunchbreak && workshopLunchbreak.length) {
                timePeriods[day] = [[dayTimeTable[1], workshopLunchbreak[0]], [workshopLunchbreak[1], dayTimeTable[2]]];
            } else {
                timePeriods[day] = [[dayTimeTable[1], dayTimeTable[2]]];
            }
        }

        return timePeriods;
    },

    /**
     * @return {Array.<moment>}
     * @private
     */
    _getDaysToFill: function () {
        'use strict';

        if (!this._daysArray) {
            var currentDate = moment().startOf('day').valueOf(),
                msInDay = 86400000;
            this._daysArray = Array.apply(null, {
                length: this._numberOfDays + 1
            }).map(function (val, index) {
                return moment(currentDate + msInDay * index);
            });
        }

        return this._daysArray;
    },

    /**
     * @private
     * @return {Parse.Promise}
     */
    _fillTimeSegments: function () {
        'use strict';

        var query = new Parse.Query('Workshop');
        return query.each(this._processWorkshop.bind(this));
    },

    /**
     * @private
     * @return {Parse.Promise}
     */
    _cleanTimeSegments: function () {
        'use strict';

        var halfOps = Math.floor(this._batchSize / 2),
            query = new Parse.Query(this._objectClass);

        this._buffer = [];

        query.each(function (timeSegment) {
            this._buffer.push(timeSegment);
            if (--halfOps <= 0) {
                return Parse.Promise.error('HALF_OF_REQUESTS');
            }
        }.bind(this)).then(function () {
            this._delay(0).then(this._destroyTimeSegments.bind(this));
        }.bind(this), function (error) {
            this._delay(error.code === Parse.Error.REQUEST_LIMIT_EXCEEDED ?
                this._timeoutOnLimitExceeded : 0).then(this._destroyTimeSegments.bind(this))
        }.bind(this));
    },

    /**
     * @return {Parse.Promise}
     * @private
     */
    _destroyTimeSegments: function () {
        if (!this._buffer.length) {
            return Parse.Promise.as('destroy complete');
        }
        this._buffer = this._buffer.map(function (timeSegment) {
            return Parse.Promise.is(timeSegment) ? timeSegment : timeSegment.destroy();
        });
        return Parse.Promise.when(this._buffer).then(this._cleanTimeSegments.bind(this), function (error) {
            // TODO: some promises was rejected. and they are immutable. hmmm... we need to restart clean after timeout
            this._delay(error.code === Parse.Error.REQUEST_LIMIT_EXCEEDED ?
                this._timeoutOnLimitExceeded : 0).then(this._destroyTimeSegments.bind(this))
        }.bind(this));
    },

    /**
     * @param {Object} params
     * @public
     * @return {Parse.Promise}
     */
    createTimeSegments: function (params) {
        'use strict';

        var isDayForStart = params.startDays && params.startDays.length ? false : true;

        if (!isDayForStart) {
            isDayForStart = this._checkIsStartDay(params.startDays);
        }

        if (params.numberOfDays) {
            this._numberOfDays = Number(params.numberOfDays);
        }

        if (params.batchSize) {
            this._batchSize = Number(params.batchSize);
        }

        if (params.timeoutOnLimitExceeded) {
            this._timeoutOnLimitExceeded = Number(params.timeoutOnLimitExceeded);
        }

        return isDayForStart ? Parse.Config.get().then(function () {
            return this._cleanTimeSegments().then(this._fillTimeSegments.bind(this), Function.prototype)
                .then(function () {
                    return Parse.Promise.as('TimeSegments successfully created');
                }, Function.prototype);
        }.bind(this)) : Parse.Promise.as('today is not a day for starting CreateTimeSegments');
    },

    /**
     * @param {Array.<string>} startDays
     * @private
     */
    _checkIsStartDay: function (startDays) {
        var today = moment().format('dddd').toLowerCase();
        return startDays.some(function (day) {
            return day.toLowerCase() === today;
        });
    },

    /**
     * @param {Number} timeout
     * @return {Parse.Promise}
     * @private
     */
    _delay: function (timeout) {
        var promise = new Parse.Promise();
        setTimeout(function () {
            promise.resolve();
        }, timeout || 0);
        return promise;
    }
};

module.exports = exports = {
    version: '1.0.0',
    execute: TimeSegmentsManager.createTimeSegments.bind(TimeSegmentsManager)
};

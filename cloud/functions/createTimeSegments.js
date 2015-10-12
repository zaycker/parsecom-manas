/*global module,Parse*/

var moment = require('moment'),
    utils = require('cloud/functions/utils'),
    Promise = Parse.Promise;

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
    _packageLength: 1000,

    /**
     * @type {Number}
     * @private
     */
    _tickLength: 0,

    /**
     * @type {Number}
     * @private
     */
    _timeOut: 1000,

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
            TimeSegmentsClass = Parse.Object.extend('TimeSegments'),
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

        var query = new Parse.Query('TimeSegments');
        return query.each(function (timeSegment) {
            return timeSegment.destroy();
        });
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

        return isDayForStart ? Parse.Config.get().then(function (config) {
            var currentHours = new Date().getHours() + 1;

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







//

//_cleanSegments().done(createObjects).done(done);

_cleanSegments: function () {
    return this._fetchObjectsAndDestroy().done(this._isEverythinDestroyed.bind(this)).error(this._fetchObjectsAndDestroyTimeouted);
},

_fetchObjectsAndDestroy: function () {
    var limit = this._packageLength - this._tickLength,
        query = new Parse.Query(this._objectClass).limit(limit),
        promisesOfObjectsToRemove = [];
    if (!limit) {
        return this._fetchObjectsAndDestroyTimeouted();
    }
    return query.each(function (timeSegment) {
        this._tickLength++;
        promisesOfObjectsToRemove.push(timeSegment.destroy());
    }.bind(this)).done(function () {
        return Promise.as(promisesOfObjectsToRemove);
    });
},

_fetchObjectsAndDestroyTimeouted: function () {
    return this._wait().done(this._fetchObjectsAndDestroy.bind(this));
},

_isEverythinDestroyed: function (promisesOfObjectsToRemove) {
    if (promisesOfObjectsToRemove.length === 0) {
        return Promise.as(true);
    }
    return Promise.when(promisesOfObjectsToRemove).done(function () {
        return this._tickLength < this._packageLength ? Promise.as(true) : this._fetchObjectsAndDestroyTimeouted();
    });
},

_wait: function () {
    return new Promise(function (resolve) {
        tickLength = 0;
        setTimeout(resolve, timeOut);
    });
}





};

module.exports = exports = {
    version: '1.0.0',
    execute: TimeSegmentsManager.createTimeSegments.bind(TimeSegmentsManager)
};

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
     * @type {String}
     * @private
     */
    _objectClass: 'TimeSegments',

    /**
     * @type {Array.<Object>}
     * @private
     */
    _timeSegments: [],

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

            return this._cleanSegments().done(this._createSegments.bind(this)).done(function () {
                return Parse.Promise.as('TimeSegments successfully created');
            });

            //this._cleanTimeSegments().then(this._fillTimeSegments.bind(this), Function.prototype)
            //    .then(function () {
            //        return Parse.Promise.as('TimeSegments successfully created');
            //    }, Function.prototype);
        }.bind(this)) : Parse.Promise.as('today is not a day for starting CreateTimeSegments');
    },


    _createSegments: function () {
        'use strict';

        var query = new Parse.Query('Workshop');
        return query.each(this._generateTimeSegments.bind(this)).done(this._addTimeSegments.bind(this));
    },

    /**
     * @param {Parse.Object} workshop
     * @return {Parse.Promise}
     * @private
     */
    _generateTimeSegments: function (workshop) {
        'use strict';

        var workshopKey = workshop.get('WorkshopKey'),
            workshopHolidays = workshop.get('Holidays'),
            workshopTimetable = this._getWorkshopTimetable(workshop);

        var cDuration = 0;
        var segmentId = 0;

        this._timeSegments = this._timeSegments.concat(this._getDaysToFill().reduce(function (timeSegments, day) {
            var isHoliday = workshopHolidays.hasOwnProperty(day.format('YYYY-MM-DD')),
                dayName = day.format('ddd').toUpperCase(),
                dayTimeTable = workshopTimetable[dayName];

            if (isHoliday || dayTimeTable.length === 0) {
                return timeSegments;
            }

            return timeSegments.concat(dayTimeTable.map(function (period) {
                var duration = utils.getDurationForPeriod(period);

                return {
                    WorkshopKey: workshopKey,
                    SegmentId: segmentId++,
                    Date: day.format('YYYY-MM-DD'),
                    DateObject: day.toDate(),
                    BeginTime: period[0],
                    EndTime: period[1],
                    Duration: duration,
                    CDuration: cDuration += duration
                };
            }));
        }));

        //return this._getDaysToFill().filter(function (day) {
        //    var isHoliday = workshopHolidays.hasOwnProperty(day.format('YYYY-MM-DD')),
        //        dayName = day.format('ddd').toUpperCase(),
        //        dayTimeTable = workshopTimetable[dayName];
        //
        //    return isHoliday || dayTimeTable.length === 0;
        //}).forEach(function (day) {
        //    dayTimeTable.forEach(function (period) {
        //TimeSegmentsClass = Parse.Object.extend(this._objectClass),
        //        promise = promise.then(function (day) {
        //            var timeSegment = new TimeSegmentsClass(),
        //                duration = utils.getDurationForPeriod(period);
        //
        //            return timeSegment.save({
        //                WorkshopKey: workshopKey,
        //                SegmentId: segmentId++,
        //                Date: day.format('YYYY-MM-DD'),
        //                DateObject: day.toDate(),
        //                BeginTime: period[0],
        //                EndTime: period[1],
        //                Duration: duration,
        //                CDuration: cDuration += duration
        //            });
        //        }.bind(this, day));
        //    }, this);
        //}, this);

        //forEach(function (day) {
        //    dayTimeTable.forEach(function (period) {
        //        promise = promise.then(function (day) {
        //            var timeSegment = new TimeSegmentsClass(),
        //                duration = utils.getDurationForPeriod(period);
        //
        //            return timeSegment.save({
        //                WorkshopKey: workshopKey,
        //                SegmentId: segmentId++,
        //                Date: day.format('YYYY-MM-DD'),
        //                DateObject: day.toDate(),
        //                BeginTime: period[0],
        //                EndTime: period[1],
        //                Duration: duration,
        //                CDuration: cDuration += duration
        //            });
        //        }.bind(this, day));
        //    }, this);
        //}, this);

        //return promise;
    },

    _addTimeSegments: function () {
        this._addingTickQueue = this._timeSegments.slice()
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
     * @param {Array.<string>} startDays
     * @private
     */
    _checkIsStartDay: function (startDays) {
        'use strict';

        var today = moment().format('dddd').toLowerCase();
        return startDays.some(function (day) {
            return day.toLowerCase() === today;
        });
    },

    /**
     * @return {Parse.Promise}
     * @private
     */
    _cleanSegments: function () {
        'use strict';

        return this._fetchObjectsAndDestroy().done(this._isEverythinDestroyed.bind(this)).fail(this._fetchObjectsAndDestroyTimeouted.bind(this));
    },

    /**
     * @return {Parse.Promise}
     * @private
     */
    _fetchObjectsAndDestroy: function () {
        'use strict';

        var limit = this._packageLength - this._tickLength,
            query = new Parse.Query(this._objectClass).limit(limit),
            promisesOfObjectsToRemove = [];
        if (limit <= 0) {
            return this._fetchObjectsAndDestroyTimeouted();
        }
        return query.each(function (object) {
            this._tickLength++;
            promisesOfObjectsToRemove.push(object.destroy());
        }.bind(this)).done(function () {
            return Promise.as(promisesOfObjectsToRemove);
        });
    },

    /**
     * @return {Parse.Promise}
     * @private
     */
    _fetchObjectsAndDestroyTimeouted: function () {
        'use strict';

        return this._wait().done(this._fetchObjectsAndDestroy.bind(this));
    },

    /**
     * @param promisesOfObjectsToRemove
     * @return {Parse.Promise}
     * @private
     */
    _isEverythinDestroyed: function (promisesOfObjectsToRemove) {
        'use strict';

        if (promisesOfObjectsToRemove.length === 0) {
            return Promise.as(true);
        }
        return Promise.when(promisesOfObjectsToRemove).done(function () {
            return this._tickLength < this._packageLength ? Promise.as(true) : this._fetchObjectsAndDestroyTimeouted();
        });
    },

    /**
     * @return {Parse.Promise}
     * @private
     */
    _wait: function () {
        'use strict';

        return new Promise(function (resolve) {
            this._tickLength = 0;
            setTimeout(resolve, timeOut);
        }.bind(this));
    }
};

module.exports = exports = {
    version: '1.0.0',
    execute: TimeSegmentsManager.createTimeSegments.bind(TimeSegmentsManager)
};

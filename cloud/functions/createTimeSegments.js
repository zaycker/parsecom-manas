/*global module,Parse*/

var moment = require('moment');

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
     * @param duration
     * @return {Number}
     * @private
     */
    _getCDuration: function (duration) {
        return this._cDuration += duration;
    },

    /**
     * @return {Number}
     * @private
     */
    _getSegmentId: function () {
        return this._segmentId++;
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

        this._getDaysToFill().forEach(function (day) {
            var isHoliday = workshopHolidays.hasOwnProperty(day.format('YYYY-MM-DD')),
                dayName = day.format('ddd').toUpperCase(),
                dayTimeTable = workshopTimetable[dayName];

            if (isHoliday || dayTimeTable.length === 0) {
                return;
            }

            dayTimeTable.forEach(function (period) {
                promise = promise.then(function(day) {
                    var timeSegment = new TimeSegmentsClass(),
                        duration = this._getDurationForPeriod(period);

                    return timeSegment.save({
                        WorkshopKey: workshopKey,
                        SegmentId: this._getSegmentId(),
                        Date: day.format('YYYY-MM-DD'),
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
     * @param {Array.<number>} period
     * @return {number}
     * @private
     */
    _getDurationForPeriod: function (period) {
        var momentedDuration = moment.duration(this._getMomentedTime(period[1]) - this._getMomentedTime(period[0]));
        return momentedDuration.hours() * 60 + momentedDuration.minutes();
    },

    /**
     * @param {Number} time
     * @return {moment}
     * @private
     */
    _getMomentedTime: function (time) {
        var timeString = time.toString();
        return moment((timeString.length === 3 ? '0' : '') + timeString, 'HHmm');
    },

    /**
     * @return {Array.<moment>}
     * @private
     */
    _getDaysToFill: function () {
        'use strict';

        if (!this._daysArray) {
            var currentDate = +new Date(),
                msInDay = 86400000;
            this._daysArray = Array.apply(null, {
                length: this._numberOfDays + 1
            }).map(function (value, index) {
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
     * @public
     * @return {Parse.Promise}
     */
    createTimeSegments: function () {
        'use strict';

        return Parse.Config.get().then(function (config) {
            var currentHours = new Date().getHours() + 1;
            if (config.attributes.environment !== 'development' && currentHours >= 8 && currentHours < 20) {
                return;
            }

            return this._cleanTimeSegments().then(this._fillTimeSegments.bind(this));
        }.bind(this));
    }
};

module.exports = exports = {
    varsion: '1.0.0',
    execute: TimeSegmentsManager.createTimeSegments.bind(TimeSegmentsManager)
};

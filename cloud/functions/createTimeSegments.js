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
            workshopTimetable = workshop.get('Timetable'),
            workshopDurations = this._getWorkDurations(workshop),
            TimeSegmentsClass = Parse.Object.extend('TimeSegments'),
            promise = Parse.Promise.as();

        this._getDaysToFill().forEach(function (day) {
            promise = promise.then(function(day) {
                var isHoliday = workshopHolidays.hasOwnProperty(day.format('YYYY-MM-DD')),
                    dayName = day.format('ddd').toUpperCase(),
                    timeTable = workshopTimetable[dayName];
                if (!isHoliday && timeTable[0] === 1) {
                    var timeSegment = new TimeSegmentsClass();

                    return timeSegment.save({
                        WorkshopKey: workshopKey,
                        SegmentId: this._getSegmentId(),
                        Date: day.format('YYYY-MM-DD'),
                        BeginTime: timeTable[1],
                        EndTime: timeTable[2],
                        Duration: workshopDurations[dayName],
                        CDuration: this._getCDuration(workshopDurations[dayName])
                    });
                }
            }.bind(this, day));
        }, this);

        return promise;
    },

    /**
     * @param {Parse.Object} workshop
     * @return {string, moment}
     * @private
     */
    _getWorkDurations: function (workshop) {
        var workshopTimetable = workshop.get('Timetable'),
            workshopLunchbreak = workshop.get('WDATA').LunchBreak,
            durations = {};

        for (var day in workshopTimetable) {
            var timeTable = workshopTimetable[day];

            if (timeTable[0] === 0) {
                durations[day] = 0;
                continue;
            }

            var durationInSeconds = this._getMomentedTime(timeTable[2]) - this._getMomentedTime(timeTable[1]);

            if (workshopLunchbreak && workshopLunchbreak.length) {
                durationInSeconds -= this._getMomentedTime(workshopLunchbreak[1]) - this._getMomentedTime(workshopLunchbreak[0]);
            }

            var momentedDuration = moment.duration(durationInSeconds);
            durations[day] = momentedDuration.hours() * 60 + momentedDuration.minutes();
        }

        return durations
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

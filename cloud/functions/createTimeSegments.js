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
     * Custom iterator.
     * Cause of limitations of 'find' query and counting objects on parse.com.
     * But there is no limitations for 'skip' in the documentation.
     * TODO: reimplement it with using of series promises. but in tech task we don't need to react on success.
     * @param {string} className
     * @param {function} callback
     * @param {Object} ctx
     * @return {Parse.Promise}
     */
    _iterateOverClass: function (className, callback, ctx) {
        'use strict';

        var classObject = Parse.Object.extend(className),
            query = null,
            batchLimit = 999,
            promise = new Parse.Promise();

        (function next (cursor, promise, ctx) {
            query = new Parse.Query(classObject);
            query.limit(batchLimit);
            query.skip(cursor);
            query.find().then(function (results) {
                results.forEach(callback.bind(ctx));
                if (results.length === batchLimit) {
                    next(cursor + batchLimit, promise, ctx);
                } else {
                    promise.resolve('all ' + className + ' objects iterated');
                }
            });
        })(0, promise, ctx || this);

        return promise;
    },

    /**
     * @param {Parse.Object} workshop
     * @private
     */
    _processWorkshop: function (workshop) {
        'use strict';

        var workshopKey = workshop.get('WorkshopKey'),
            workshopHolidays = workshop.get('Holidays'),
            workshopTimetable = workshop.get('Timetable'),
            workshopLunchbreak = workshop.get('WDATA').lunchbreak,
            TimeSegmentsClass = Parse.Object.extend('TimeSegments');

        this._getDaysToFill().forEach(function (day) {
            var isHoliday = workshopHolidays.indexOf(day.format('YYYY-MM-DD')) > -1,
                timeTable = workshopTimetable[day.format('ddd').toUpperCase()];
            if (!isHoliday && timeTable[0]) {
                var timeSegment = new TimeSegmentsClass(),
                    lunchDuration = workshopLunchbreak && workshopLunchbreak.length ? workshopLunchbreak[1] - workshopLunchbreak[0] : 0,
                    duration = (timeTable[2] - timeTable[1] - lunchDuration) * 60 / 100;

                timeSegment.save({
                    WorkshopKey: workshopKey,
                    SegmentId: this._getSegmentId(),
                    Date: day.format('M/D/YYYY'),
                    BeginTime: timeTable[1],
                    EndTime: timeTable[2],
                    Duration: duration,
                    CDuration: this._getCDuration(duration)
                });
            }
        }, this);
    },

    /**
     * @return {Array.<moment>}
     * @private
     */
    _getDaysToFill: function () {
        'use strict';

        if (!this._daysArray) {
            this._daysArray = Array.apply(null, {
                length: this._numberOfDays + 1
            }).map(function (value, index) {
                return moment().add(index, 'd');
            });
        }

        return this._daysArray;
    },

    /**
     * @private
     */
    _fillTimeSegments: function () {
        'use strict';

        this._iterateOverClass('allWorkshopKeys', this._processWorkshop, this);
    },

    /**
     * @private
     * @return {Parse.Promise}
     */
    _cleanTimeSegments: function () {
        var promise = new Parse.Promise();

        this._iterateOverClass('TimeSegments', function (timeSegment) {
            timeSegment.destroy();
        }, this).then(function () {
            promise.resolve('TimeSegments is empty');
        });

        return promise;
    },

    /**
     * @public
     */
    createTimeSegments: function () {
        'use strict';

        var currentHours = new Date().getHours() + 1;
        if (currentHours >= 8 && currentHours < 20) {
            return;
        }

        this._cleanTimeSegments.then(this._fillTimeSegments);
    }
};

module.exports = exports = {
    varsion: '1.0.0',
    execute: TimeSegmentsManager.createTimeSegments.bind(TimeSegmentsManager)
};

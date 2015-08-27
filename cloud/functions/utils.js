var moment = require('moment');

var Utils = {
    /**
     * @param {Array.<number>} period
     * @return {number}
     * @private
     */
    getDurationForPeriod: function (period) {
        'use strict';

        var momentedDuration = moment.duration(this._getMomentedTime(period[1]) - this._getMomentedTime(period[0]));
        return momentedDuration.hours() * 60 + momentedDuration.minutes();
    },

    /**
     * @param {Number} time
     * @return {moment}
     * @private
     */
    _getMomentedTime: function (time) {
        'use strict';

        var timeString = time.toString();
        return moment((timeString.length === 3 ? '0' : '') + timeString, 'HHmm');
    }
};

module.exports = exports = {
    version: '1.0.0',
    getDurationForPeriod: Utils.getDurationForPeriod.bind(Utils)
};

/*global Parse*/

var toolSet = {
    trueTimeFetch: function (workShopKey, startDate, startTime, t_offset) {
        return this.convertDateTimeToDuration(workShopKey, startDate, startTime).then(function (cStartDuration) {
            return this.convertDurationToDateTime(workShopKey, cStartDuration + t_offset)
        }.bind(this));
    },

    trueDurationFetch: function (workShopKey, startDate, startTime, endDate, endTime) {
        return Parse.Promise.when([
            this.convertDateTimeToDuration(workShopKey, startDate, startTime),
            this.convertDateTimeToDuration(workShopKey, endDate, endTime)
        ]).then(function (cEndDuration, cStartDuration) {
            return cEndDuration - cStartDuration;
        });
    },

    convertDateTimeToDuration: function(workShopKey, date, time) {
        var query = new Parse.Query('TimeSegments');
        query.equalTo('WorkshopKey', workShopKey);
        query.equalTo('Date', moment(date).format('YYYY-MM-DD'));
        return query.find().then(function (results) {
            if (results.length !== 2) {
                var query = new Parse.Query('TimeSegments');
                query.equalTo('WorkshopKey', workShopKey);
                query.greaterThan('DateObject', moment(date).toDate());
                query.ascending('SegmentId');
                return query.first().then(function (segment) {
                    return segment.get('BeginTime');
                });
            }

            var promise = new Parse.Promise(),
                s1 = results[0], s2 = results[1];

            if (time >= s1.get('BeginTime') && time <= s1.get('EndTime')) {
                promise.resolve(s1.get('CDuration') - (s1.get('EndTime') - time)); // TODO: interval
            } else if (time >= s2.get('BeginTime') && time <= s2.get('EndTime')) {
                promise.resolve(s2.get('CDuration') - (s2.get('EndTime') - time)); // TODO: interval
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

    convertDurationToDateTime: function (workShopKey, duration) {
        var query = new Parse.Query('TimeSegments');
        query.equalTo('WorkshopKey', workShopKey);
        query.greaterThan('CDuration', duration);
        query.ascending('SegmentId');
        return query.first().then(function (segment) {
            return [
                segment ? segment.get('Date') : null,
                segment ? segment.get('EndTime') - (segment.get('CDuration') - duration) : null
            ]
        });
    }
};

module.exports = exports = {
    varsion: '1.0.0',
    trueTimeFetch: toolSet.trueTimeFetch.bind(toolSet),
    trueDurationFetch: toolSet.trueDurationFetch.bind(toolSet)
};

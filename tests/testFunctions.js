/**
 * Actually I don't know expected results.
 * That's why here is the only requests and consoled results without any "should" and "equal"
 */

var globalConfig = require('../config/global.json'),
    config = require('./config.json'),
    Parse = require('parse').Parse;

if (!globalConfig || !globalConfig.applications || !config) {
    return;
}

var applicationName = globalConfig.applications._default.link,
    applicationId = globalConfig.applications[applicationName].applicationId,
    javascriptKey = config.javascriptKey,
    TEST_trueTimeFetch = true,
    TEST_trueDurationFetch = true;

Parse.initialize(applicationId, javascriptKey);

var data = [
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"0700","T_offset":120},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"0700","T_offset":240},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"0700","T_offset":1200},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1100","T_offset":120},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1100","T_offset":240},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1100","T_offset":1200},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1330","T_offset":120},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1330","T_offset":240},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1330","T_offset":1200},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1600","T_offset":120},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1600","T_offset":240},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1600","T_offset":1200},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"2000","T_offset":120},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"2000","T_offset":240},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"2000","T_offset":1200},
//no lunch
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"0700","T_offset":120},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"0700","T_offset":240},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"0700","T_offset":1200},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1100","T_offset":120},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1100","T_offset":240},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1100","T_offset":1200},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1330","T_offset":120},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1330","T_offset":240},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1330","T_offset":1200},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1600","T_offset":120},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1600","T_offset":240},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1600","T_offset":1200},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"2000","T_offset":120},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"2000","T_offset":240},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"2000","T_offset":1200}

];

TEST_trueTimeFetch && data.forEach(function (params) {
    Parse.Cloud.run('trueTimeFetch', params, {
        success: function(obj) {
            console.log(JSON.stringify(params), "\n", obj);
        },
        error: function(error) {
            console.log(error);
        }
    });
});


var data2 = [
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"0800","EndDate":"2015-08-31","EndTime":"0800"},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1100","EndDate":"2015-08-31","EndTime":"1600"},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1330","EndDate":"2015-09-03","EndTime":"2000"},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"1600","EndDate":"2015-08-31","EndTime":"1200"},
    {"WorkShopKey":"BLR1001","StartDate":"2015-08-31","StartTime":"2000","EndDate":"2015-08-31","EndTime":"1700"},
    {"WorkShopKey":"BLR1001","StartDate":"2015-09-02","StartTime":"1200","EndDate":"2015-09-04","EndTime":"1200"},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"0800","EndDate":"2015-08-31","EndTime":"0800"},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1100","EndDate":"2015-08-31","EndTime":"1600"},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1330","EndDate":"2015-09-03","EndTime":"2000"},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"1600","EndDate":"2015-08-31","EndTime":"1200"},
    {"WorkShopKey":"BLR1002","StartDate":"2015-08-31","StartTime":"2000","EndDate":"2015-08-31","EndTime":"1700"},
    {"WorkShopKey":"BLR1002","StartDate":"2015-09-02","StartTime":"1200","EndDate":"2015-09-04","EndTime":"1200"}
];

TEST_trueDurationFetch && data2.forEach(function (params) {
    Parse.Cloud.run('trueDurationFetch', params, {
        success: function(obj) {
            console.log(JSON.stringify(params), "\n", obj);
        },
        error: function(error) {
            console.log(error);
        }
    });
});

# parsecom-manas
Parse.com functions set made by implementation of freelance project pseudocode

# Using

Rename `config/global.json.dist` file to `config/global.json` and insert your Parse application name and it's keys to it.

Then you'll be able to use `parse deploy` command from `CloudCode` directory.

# Config

`createTimeSegments` job can be configured with such parameters:

- {Array.<string>} `startDays` - array of strings with days names.
For example: `"startDays": ["monaday", "Friday"]`

- {Number} `numberOfDays` - number of days to generate for each workshop
For example: `"numberOfDays": 10`

# Tests

Also you have an ability to use some sort of tests. But cause it is non-trivial task to mock Parse class (table) there was made
the easiest way of testing by supposition of data which was previously added to the class TimeSegments.

Before using it you have to rename `tests/config.json.dist` to `tests/config.json` and insert there Javascript key of your Parse application.

Also you have to install Parse.com npm package by `npm install parse`.

Then you have to edit array of test data in the `tests/testFunctions.js`.

And at final you can run `npm tests/testFunctions.js` from terminal to see results.

# Notes

P.S. Moment.js method "add" is unworkable on parse.com (w???). There are timestamps used cause I don't want to use external moment.

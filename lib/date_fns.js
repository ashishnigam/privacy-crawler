(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["dateFns"] = factory();
	else
		root["dateFns"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	    distanceInWordsStrict: __webpack_require__(49),
	    format: __webpack_require__(65),
	};
	


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var isDate = __webpack_require__(3);
	var MILLISECONDS_IN_HOUR = 3600000;
	var MILLISECONDS_IN_MINUTE = 60000;
	var DEFAULT_ADDITIONAL_DIGITS = 2;
	var parseTokenDateTimeDelimeter = /[T ]/;
	var parseTokenPlainTime = /:/;
	var parseTokenYY = /^(\d{2})$/;
	var parseTokensYYY = [
	    /^([+-]\d{2})$/,
	    /^([+-]\d{3})$/,
	    /^([+-]\d{4})$/
	];
	var parseTokenYYYY = /^(\d{4})/;
	var parseTokensYYYYY = [
	    /^([+-]\d{4})/,
	    /^([+-]\d{5})/,
	    /^([+-]\d{6})/
	];
	var parseTokenMM = /^-(\d{2})$/;
	var parseTokenDDD = /^-?(\d{3})$/;
	var parseTokenMMDD = /^-?(\d{2})-?(\d{2})$/;
	var parseTokenWww = /^-?W(\d{2})$/;
	var parseTokenWwwD = /^-?W(\d{2})-?(\d{1})$/;
	var parseTokenHH = /^(\d{2}([.,]\d*)?)$/;
	var parseTokenHHMM = /^(\d{2}):?(\d{2}([.,]\d*)?)$/;
	var parseTokenHHMMSS = /^(\d{2}):?(\d{2}):?(\d{2}([.,]\d*)?)$/;
	var parseTokenTimezone = /([Z+-].*)$/;
	var parseTokenTimezoneZ = /^(Z)$/;
	var parseTokenTimezoneHH = /^([+-])(\d{2})$/;
	var parseTokenTimezoneHHMM = /^([+-])(\d{2}):?(\d{2})$/;
	function parse(argument, dirtyOptions) {
	    if (isDate(argument)) {
	        return new Date(argument.getTime());
	    } else if (typeof argument !== 'string') {
	        return new Date(argument);
	    }
	    var options = dirtyOptions || {};
	    var additionalDigits = options.additionalDigits;
	    if (additionalDigits == null) {
	        additionalDigits = DEFAULT_ADDITIONAL_DIGITS;
	    } else {
	        additionalDigits = Number(additionalDigits);
	    }
	    var dateStrings = splitDateString(argument);
	    var parseYearResult = parseYear(dateStrings.date, additionalDigits);
	    var year = parseYearResult.year;
	    var restDateString = parseYearResult.restDateString;
	    var date = parseDate(restDateString, year);
	    if (date) {
	        var timestamp = date.getTime();
	        var time = 0;
	        var offset;
	        if (dateStrings.time) {
	            time = parseTime(dateStrings.time);
	        }
	        if (dateStrings.timezone) {
	            offset = parseTimezone(dateStrings.timezone);
	        } else {
	            offset = new Date(timestamp + time).getTimezoneOffset();
	            offset = new Date(timestamp + time + offset * MILLISECONDS_IN_MINUTE).getTimezoneOffset();
	        }
	        return new Date(timestamp + time + offset * MILLISECONDS_IN_MINUTE);
	    } else {
	        return new Date(argument);
	    }
	}
	function splitDateString(dateString) {
	    var dateStrings = {};
	    var array = dateString.split(parseTokenDateTimeDelimeter);
	    var timeString;
	    if (parseTokenPlainTime.test(array[0])) {
	        dateStrings.date = null;
	        timeString = array[0];
	    } else {
	        dateStrings.date = array[0];
	        timeString = array[1];
	    }
	    if (timeString) {
	        var token = parseTokenTimezone.exec(timeString);
	        if (token) {
	            dateStrings.time = timeString.replace(token[1], '');
	            dateStrings.timezone = token[1];
	        } else {
	            dateStrings.time = timeString;
	        }
	    }
	    return dateStrings;
	}
	function parseYear(dateString, additionalDigits) {
	    var parseTokenYYY = parseTokensYYY[additionalDigits];
	    var parseTokenYYYYY = parseTokensYYYYY[additionalDigits];
	    var token;
	    token = parseTokenYYYY.exec(dateString) || parseTokenYYYYY.exec(dateString);
	    if (token) {
	        var yearString = token[1];
	        return {
	            year: parseInt(yearString, 10),
	            restDateString: dateString.slice(yearString.length)
	        };
	    }
	    token = parseTokenYY.exec(dateString) || parseTokenYYY.exec(dateString);
	    if (token) {
	        var centuryString = token[1];
	        return {
	            year: parseInt(centuryString, 10) * 100,
	            restDateString: dateString.slice(centuryString.length)
	        };
	    }
	    return { year: null };
	}
	function parseDate(dateString, year) {
	    if (year === null) {
	        return null;
	    }
	    var token;
	    var date;
	    var month;
	    var week;
	    if (dateString.length === 0) {
	        date = new Date(0);
	        date.setUTCFullYear(year);
	        return date;
	    }
	    token = parseTokenMM.exec(dateString);
	    if (token) {
	        date = new Date(0);
	        month = parseInt(token[1], 10) - 1;
	        date.setUTCFullYear(year, month);
	        return date;
	    }
	    token = parseTokenDDD.exec(dateString);
	    if (token) {
	        date = new Date(0);
	        var dayOfYear = parseInt(token[1], 10);
	        date.setUTCFullYear(year, 0, dayOfYear);
	        return date;
	    }
	    token = parseTokenMMDD.exec(dateString);
	    if (token) {
	        date = new Date(0);
	        month = parseInt(token[1], 10) - 1;
	        var day = parseInt(token[2], 10);
	        date.setUTCFullYear(year, month, day);
	        return date;
	    }
	    token = parseTokenWww.exec(dateString);
	    if (token) {
	        week = parseInt(token[1], 10) - 1;
	        return dayOfISOYear(year, week);
	    }
	    token = parseTokenWwwD.exec(dateString);
	    if (token) {
	        week = parseInt(token[1], 10) - 1;
	        var dayOfWeek = parseInt(token[2], 10) - 1;
	        return dayOfISOYear(year, week, dayOfWeek);
	    }
	    return null;
	}
	function parseTime(timeString) {
	    var token;
	    var hours;
	    var minutes;
	    token = parseTokenHH.exec(timeString);
	    if (token) {
	        hours = parseFloat(token[1].replace(',', '.'));
	        return hours % 24 * MILLISECONDS_IN_HOUR;
	    }
	    token = parseTokenHHMM.exec(timeString);
	    if (token) {
	        hours = parseInt(token[1], 10);
	        minutes = parseFloat(token[2].replace(',', '.'));
	        return hours % 24 * MILLISECONDS_IN_HOUR + minutes * MILLISECONDS_IN_MINUTE;
	    }
	    token = parseTokenHHMMSS.exec(timeString);
	    if (token) {
	        hours = parseInt(token[1], 10);
	        minutes = parseInt(token[2], 10);
	        var seconds = parseFloat(token[3].replace(',', '.'));
	        return hours % 24 * MILLISECONDS_IN_HOUR + minutes * MILLISECONDS_IN_MINUTE + seconds * 1000;
	    }
	    return null;
	}
	function parseTimezone(timezoneString) {
	    var token;
	    var absoluteOffset;
	    token = parseTokenTimezoneZ.exec(timezoneString);
	    if (token) {
	        return 0;
	    }
	    token = parseTokenTimezoneHH.exec(timezoneString);
	    if (token) {
	        absoluteOffset = parseInt(token[2], 10) * 60;
	        return token[1] === '+' ? -absoluteOffset : absoluteOffset;
	    }
	    token = parseTokenTimezoneHHMM.exec(timezoneString);
	    if (token) {
	        absoluteOffset = parseInt(token[2], 10) * 60 + parseInt(token[3], 10);
	        return token[1] === '+' ? -absoluteOffset : absoluteOffset;
	    }
	    return 0;
	}
	function dayOfISOYear(isoYear, week, day) {
	    week = week || 0;
	    day = day || 0;
	    var date = new Date(0);
	    date.setUTCFullYear(isoYear, 0, 4);
	    var fourthOfJanuaryDay = date.getUTCDay() || 7;
	    var diff = week * 7 + day + 1 - fourthOfJanuaryDay;
	    date.setUTCDate(date.getUTCDate() + diff);
	    return date;
	}
	module.exports = parse;
	


/***/ },
/* 3 */
/***/ function(module, exports) {

	function isDate(argument) {
	    return argument instanceof Date;
	}
	module.exports = isDate;
	


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	var parse = __webpack_require__(2);
	function compareDesc(dirtyDateLeft, dirtyDateRight) {
	    var dateLeft = parse(dirtyDateLeft);
	    var timeLeft = dateLeft.getTime();
	    var dateRight = parse(dirtyDateRight);
	    var timeRight = dateRight.getTime();
	    if (timeLeft > timeRight) {
	        return -1;
	    } else if (timeLeft < timeRight) {
	        return 1;
	    } else {
	        return 0;
	    }
	}
	module.exports = compareDesc;
	


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	var parse = __webpack_require__(2);
	function differenceInMilliseconds(dirtyDateLeft, dirtyDateRight) {
	    var dateLeft = parse(dirtyDateLeft);
	    var dateRight = parse(dirtyDateRight);
	    return dateLeft.getTime() - dateRight.getTime();
	}
	module.exports = differenceInMilliseconds;

/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	var differenceInMilliseconds = __webpack_require__(35);
	function differenceInSeconds(dirtyDateLeft, dirtyDateRight) {
	    var diff = differenceInMilliseconds(dirtyDateLeft, dirtyDateRight) / 1000;
	    return diff > 0 ? Math.floor(diff) : Math.ceil(diff);
	}
	module.exports = differenceInSeconds;
	


/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	var buildDistanceInWordsLocale = __webpack_require__(46);
	var buildFormatLocale = __webpack_require__(47);
	module.exports = {
	    distanceInWords: buildDistanceInWordsLocale(),
	    format: buildFormatLocale()
	};
	


/***/ },
/* 46 */
/***/ function(module, exports) {

	function buildDistanceInWordsLocale() {
	    var distanceInWordsLocale = {
	        lessThanXSeconds: {
	            one: 'less than a second',
	            other: 'less than {{count}} seconds'
	        },
	        xSeconds: {
	            one: '1 second',
	            other: '{{count}} seconds'
	        },
	        halfAMinute: 'half a minute',
	        lessThanXMinutes: {
	            one: 'less than a minute',
	            other: 'less than {{count}} minutes'
	        },
	        xMinutes: {
	            one: '1 minute',
	            other: '{{count}} minutes'
	        },
	        aboutXHours: {
	            one: 'about 1 hour',
	            other: 'about {{count}} hours'
	        },
	        xHours: {
	            one: '1 hour',
	            other: '{{count}} hours'
	        },
	        xDays: {
	            one: '1 day',
	            other: '{{count}} days'
	        },
	        aboutXMonths: {
	            one: 'about 1 month',
	            other: 'about {{count}} months'
	        },
	        xMonths: {
	            one: '1 month',
	            other: '{{count}} months'
	        },
	        aboutXYears: {
	            one: 'about 1 year',
	            other: 'about {{count}} years'
	        },
	        xYears: {
	            one: '1 year',
	            other: '{{count}} years'
	        },
	        overXYears: {
	            one: 'over 1 year',
	            other: 'over {{count}} years'
	        },
	        almostXYears: {
	            one: 'almost 1 year',
	            other: 'almost {{count}} years'
	        }
	    };
	    function localize(token, count, options) {
	        options = options || {};
	        var result;
	        if (typeof distanceInWordsLocale[token] === 'string') {
	            result = distanceInWordsLocale[token];
	        } else if (count === 1) {
	            result = distanceInWordsLocale[token].one;
	        } else {
	            result = distanceInWordsLocale[token].other.replace('{{count}}', count);
	        }
	        if (options.addSuffix) {
	            if (options.comparison > 0) {
	                return 'in ' + result;
	            } else {
	                return result + ' ago';
	            }
	        }
	        return result;
	    }
	    return { localize: localize };
	}
	module.exports = buildDistanceInWordsLocale;
	


/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	var buildFormattingTokensRegExp = __webpack_require__(48);
	function buildFormatLocale() {
	    var months3char = [
	        'Jan',
	        'Feb',
	        'Mar',
	        'Apr',
	        'May',
	        'Jun',
	        'Jul',
	        'Aug',
	        'Sep',
	        'Oct',
	        'Nov',
	        'Dec'
	    ];
	    var monthsFull = [
	        'January',
	        'February',
	        'March',
	        'April',
	        'May',
	        'June',
	        'July',
	        'August',
	        'September',
	        'October',
	        'November',
	        'December'
	    ];
	    var weekdays2char = [
	        'Su',
	        'Mo',
	        'Tu',
	        'We',
	        'Th',
	        'Fr',
	        'Sa'
	    ];
	    var weekdays3char = [
	        'Sun',
	        'Mon',
	        'Tue',
	        'Wed',
	        'Thu',
	        'Fri',
	        'Sat'
	    ];
	    var weekdaysFull = [
	        'Sunday',
	        'Monday',
	        'Tuesday',
	        'Wednesday',
	        'Thursday',
	        'Friday',
	        'Saturday'
	    ];
	    var meridiemUppercase = [
	        'AM',
	        'PM'
	    ];
	    var meridiemLowercase = [
	        'am',
	        'pm'
	    ];
	    var meridiemFull = [
	        'a.m.',
	        'p.m.'
	    ];
	    var formatters = {
	        'MMM': function (date) {
	            return months3char[date.getMonth()];
	        },
	        'MMMM': function (date) {
	            return monthsFull[date.getMonth()];
	        },
	        'dd': function (date) {
	            return weekdays2char[date.getDay()];
	        },
	        'ddd': function (date) {
	            return weekdays3char[date.getDay()];
	        },
	        'dddd': function (date) {
	            return weekdaysFull[date.getDay()];
	        },
	        'A': function (date) {
	            return date.getHours() / 12 >= 1 ? meridiemUppercase[1] : meridiemUppercase[0];
	        },
	        'a': function (date) {
	            return date.getHours() / 12 >= 1 ? meridiemLowercase[1] : meridiemLowercase[0];
	        },
	        'aa': function (date) {
	            return date.getHours() / 12 >= 1 ? meridiemFull[1] : meridiemFull[0];
	        }
	    };
	    var ordinalFormatters = [
	        'M',
	        'D',
	        'DDD',
	        'd',
	        'Q',
	        'W'
	    ];
	    ordinalFormatters.forEach(function (formatterToken) {
	        formatters[formatterToken + 'o'] = function (date, formatters) {
	            return ordinal(formatters[formatterToken](date));
	        };
	    });
	    return {
	        formatters: formatters,
	        formattingTokensRegExp: buildFormattingTokensRegExp(formatters)
	    };
	}
	function ordinal(number) {
	    var rem100 = number % 100;
	    if (rem100 > 20 || rem100 < 10) {
	        switch (rem100 % 10) {
	        case 1:
	            return number + 'st';
	        case 2:
	            return number + 'nd';
	        case 3:
	            return number + 'rd';
	        }
	    }
	    return number + 'th';
	}
	module.exports = buildFormatLocale;
	


/***/ },
/* 48 */
/***/ function(module, exports) {

	var commonFormatterKeys = [
	    'M',
	    'MM',
	    'Q',
	    'D',
	    'DD',
	    'DDD',
	    'DDDD',
	    'd',
	    'E',
	    'W',
	    'WW',
	    'YY',
	    'YYYY',
	    'GG',
	    'GGGG',
	    'H',
	    'HH',
	    'h',
	    'hh',
	    'm',
	    'mm',
	    's',
	    'ss',
	    'S',
	    'SS',
	    'SSS',
	    'Z',
	    'ZZ',
	    'X',
	    'x'
	];
	function buildFormattingTokensRegExp(formatters) {
	    var formatterKeys = [];
	    for (var key in formatters) {
	        if (formatters.hasOwnProperty(key)) {
	            formatterKeys.push(key);
	        }
	    }
	    var formattingTokens = commonFormatterKeys.concat(formatterKeys).sort().reverse();
	    var formattingTokensRegExp = new RegExp('(\\[[^\\[]*\\])|(\\\\)?' + '(' + formattingTokens.join('|') + '|.)', 'g');
	    return formattingTokensRegExp;
	}
	module.exports = buildFormattingTokensRegExp;
	


/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	var compareDesc = __webpack_require__(25);
	var parse = __webpack_require__(2);
	var differenceInSeconds = __webpack_require__(41);
	var enLocale = __webpack_require__(45);
	var MINUTES_IN_DAY = 1440;
	var MINUTES_IN_MONTH = 43200;
	var MINUTES_IN_YEAR = 525600;
	function distanceInWordsStrict(dirtyDateToCompare, dirtyDate, dirtyOptions) {
	    var options = dirtyOptions || {};
	    var comparison = compareDesc(dirtyDateToCompare, dirtyDate);
	    var locale = options.locale;
	    var localize = enLocale.distanceInWords.localize;
	    if (locale && locale.distanceInWords && locale.distanceInWords.localize) {
	        localize = locale.distanceInWords.localize;
	    }
	    var localizeOptions = {
	        addSuffix: Boolean(options.addSuffix),
	        comparison: comparison
	    };
	    var dateLeft, dateRight;
	    if (comparison > 0) {
	        dateLeft = parse(dirtyDateToCompare);
	        dateRight = parse(dirtyDate);
	    } else {
	        dateLeft = parse(dirtyDate);
	        dateRight = parse(dirtyDateToCompare);
	    }
	    var unit;
	    var mathPartial = Math[options.partialMethod ? String(options.partialMethod) : 'floor'];
	    var seconds = differenceInSeconds(dateRight, dateLeft);
	    var offset = dateRight.getTimezoneOffset() - dateLeft.getTimezoneOffset();
	    var minutes = mathPartial(seconds / 60) - offset;
	    var hours, days, months, years;
	    if (options.unit) {
	        unit = String(options.unit);
	    } else {
	        if (minutes < 1) {
	            unit = 's';
	        } else if (minutes < 60) {
	            unit = 'm';
	        } else if (minutes < MINUTES_IN_DAY) {
	            unit = 'h';
	        } else if (minutes < MINUTES_IN_MONTH) {
	            unit = 'd';
	        } else if (minutes < MINUTES_IN_YEAR) {
	            unit = 'M';
	        } else {
	            unit = 'Y';
	        }
	    }
	    if (unit === 's') {
	        return localize('xSeconds', seconds, localizeOptions);
	    } else if (unit === 'm') {
	        return localize('xMinutes', minutes, localizeOptions);
	    } else if (unit === 'h') {
	        hours = mathPartial(minutes / 60);
	        return localize('xHours', hours, localizeOptions);
	    } else if (unit === 'd') {
	        days = mathPartial(minutes / MINUTES_IN_DAY);
	        return localize('xDays', days, localizeOptions);
	    } else if (unit === 'M') {
	        months = mathPartial(minutes / MINUTES_IN_MONTH);
	        return localize('xMonths', months, localizeOptions);
	    } else if (unit === 'Y') {
	        years = mathPartial(minutes / MINUTES_IN_YEAR);
	        return localize('xYears', years, localizeOptions);
	    }
	    throw new Error('Unknown unit: ' + unit);
	}
	module.exports = distanceInWordsStrict;
	


/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 55 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 61 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 62 */
/***/ function(module, exports) {
/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 64 */
/***/ function(module, exports) {
/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

	var getDayOfYear = __webpack_require__(66);
	var getISOWeek = __webpack_require__(68);
	var getISOYear = __webpack_require__(7);
	var parse = __webpack_require__(2);
	var isValid = __webpack_require__(69);
	var enLocale = __webpack_require__(45);
	function format(dirtyDate, dirtyFormatStr, dirtyOptions) {
	    var formatStr = dirtyFormatStr ? String(dirtyFormatStr) : 'YYYY-MM-DDTHH:mm:ss.SSSZ';
	    var options = dirtyOptions || {};
	    var locale = options.locale;
	    var localeFormatters = enLocale.format.formatters;
	    var formattingTokensRegExp = enLocale.format.formattingTokensRegExp;
	    if (locale && locale.format && locale.format.formatters) {
	        localeFormatters = locale.format.formatters;
	        if (locale.format.formattingTokensRegExp) {
	            formattingTokensRegExp = locale.format.formattingTokensRegExp;
	        }
	    }
	    var date = parse(dirtyDate);
	    if (!isValid(date)) {
	        return 'Invalid Date';
	    }
	    var formatFn = buildFormatFn(formatStr, localeFormatters, formattingTokensRegExp);
	    return formatFn(date);
	}
	var formatters = {
	    'M': function (date) {
	        return date.getMonth() + 1;
	    },
	    'MM': function (date) {
	        return addLeadingZeros(date.getMonth() + 1, 2);
	    },
	    'Q': function (date) {
	        return Math.ceil((date.getMonth() + 1) / 3);
	    },
	    'D': function (date) {
	        return date.getDate();
	    },
	    'DD': function (date) {
	        return addLeadingZeros(date.getDate(), 2);
	    },
	    'DDD': function (date) {
	        return getDayOfYear(date);
	    },
	    'DDDD': function (date) {
	        return addLeadingZeros(getDayOfYear(date), 3);
	    },
	    'd': function (date) {
	        return date.getDay();
	    },
	    'E': function (date) {
	        return date.getDay() || 7;
	    },
	    'W': function (date) {
	        return getISOWeek(date);
	    },
	    'WW': function (date) {
	        return addLeadingZeros(getISOWeek(date), 2);
	    },
	    'YY': function (date) {
	        return addLeadingZeros(date.getFullYear(), 4).substr(2);
	    },
	    'YYYY': function (date) {
	        return addLeadingZeros(date.getFullYear(), 4);
	    },
	    'GG': function (date) {
	        return String(getISOYear(date)).substr(2);
	    },
	    'GGGG': function (date) {
	        return getISOYear(date);
	    },
	    'H': function (date) {
	        return date.getHours();
	    },
	    'HH': function (date) {
	        return addLeadingZeros(date.getHours(), 2);
	    },
	    'h': function (date) {
	        var hours = date.getHours();
	        if (hours === 0) {
	            return 12;
	        } else if (hours > 12) {
	            return hours % 12;
	        } else {
	            return hours;
	        }
	    },
	    'hh': function (date) {
	        return addLeadingZeros(formatters['h'](date), 2);
	    },
	    'm': function (date) {
	        return date.getMinutes();
	    },
	    'mm': function (date) {
	        return addLeadingZeros(date.getMinutes(), 2);
	    },
	    's': function (date) {
	        return date.getSeconds();
	    },
	    'ss': function (date) {
	        return addLeadingZeros(date.getSeconds(), 2);
	    },
	    'S': function (date) {
	        return Math.floor(date.getMilliseconds() / 100);
	    },
	    'SS': function (date) {
	        return addLeadingZeros(Math.floor(date.getMilliseconds() / 10), 2);
	    },
	    'SSS': function (date) {
	        return addLeadingZeros(date.getMilliseconds(), 3);
	    },
	    'Z': function (date) {
	        return formatTimezone(date.getTimezoneOffset(), ':');
	    },
	    'ZZ': function (date) {
	        return formatTimezone(date.getTimezoneOffset());
	    },
	    'X': function (date) {
	        return Math.floor(date.getTime() / 1000);
	    },
	    'x': function (date) {
	        return date.getTime();
	    }
	};
	function buildFormatFn(formatStr, localeFormatters, formattingTokensRegExp) {
	    var array = formatStr.match(formattingTokensRegExp);
	    var length = array.length;
	    var i;
	    var formatter;
	    for (i = 0; i < length; i++) {
	        formatter = localeFormatters[array[i]] || formatters[array[i]];
	        if (formatter) {
	            array[i] = formatter;
	        } else {
	            array[i] = removeFormattingTokens(array[i]);
	        }
	    }
	    return function (date) {
	        var output = '';
	        for (var i = 0; i < length; i++) {
	            if (array[i] instanceof Function) {
	                output += array[i](date, formatters);
	            } else {
	                output += array[i];
	            }
	        }
	        return output;
	    };
	}
	function removeFormattingTokens(input) {
	    if (input.match(/\[[\s\S]/)) {
	        return input.replace(/^\[|]$/g, '');
	    }
	    return input.replace(/\\/g, '');
	}
	function formatTimezone(offset, delimeter) {
	    delimeter = delimeter || '';
	    var sign = offset > 0 ? '-' : '+';
	    var absOffset = Math.abs(offset);
	    var hours = Math.floor(absOffset / 60);
	    var minutes = absOffset % 60;
	    return sign + addLeadingZeros(hours, 2) + delimeter + addLeadingZeros(minutes, 2);
	}
	function addLeadingZeros(number, targetLength) {
	    var output = Math.abs(number).toString();
	    while (output.length < targetLength) {
	        output = '0' + output;
	    }
	    return output;
	}
	module.exports = format;
	


/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 67 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 68 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

	var isDate = __webpack_require__(3);
	function isValid(dirtyDate) {
	    if (isDate(dirtyDate)) {
	        return !isNaN(dirtyDate);
	    } else {
	        throw new TypeError(toString.call(dirtyDate) + ' is not an instance of Date');
	    }
	}
	module.exports = isValid;
	


/***/ },
/* 70 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 71 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 73 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 74 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 75 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 76 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 77 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 78 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 79 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 80 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 81 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 82 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 83 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 84 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 85 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 86 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 87 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 88 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 89 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 90 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 91 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 92 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 93 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 94 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 95 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 96 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 97 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 98 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 99 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 100 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 101 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 102 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 103 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 104 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 105 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 106 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 107 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 108 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 109 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 110 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 111 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 112 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 113 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 114 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 115 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 116 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 117 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 118 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 119 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 120 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 121 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 122 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 123 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 124 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 125 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 126 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 127 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 128 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 129 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 130 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 131 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 132 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 133 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 134 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 135 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 136 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 137 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 138 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 139 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 140 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 141 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 142 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 143 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 144 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 145 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 146 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 147 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 148 */
/***/ function(module, exports) {
/***/ },
/* 149 */
/***/ function(module, exports) {
/***/ },
/* 150 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 151 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 152 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 153 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 154 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 155 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 156 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 157 */
/***/ function(module, exports, __webpack_require__) {
/***/ },
/* 158 */
/***/ function(module, exports, __webpack_require__) {
/***/ }
/******/ ])
});
;
//# sourceMappingURL=date_fns.js.map
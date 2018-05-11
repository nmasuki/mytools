/**
 * Created by nmasuki on 9/21/2017.
 */
const md5 = require("md5");

if (!console.olog) {
    function getLogMsg(args) {
        var msg = args.map(str => {
                if (typeof str == "object")
                    str = (Object.keys(str).length ? JSON.stringify(str, null, 3) : ""); //.substr(0, 400) + "...";

                if (typeof str == "function")
                    str = `[Function: ${str.name}`.trim().trim(":") + "]";

                if (str && typeof str != "string")
                    str = str.toString().split('\n').first().trim('\r');

                return str;
            }).join("\t").trimRight(),
            firstList = msg.split("\n").first(),
            prompt = console.prompt || ">",
            i = 0;

        if (firstList && firstList.length < prompt.length && !firstList.any("\r"))
            msg = firstList + " ".repeat(prompt.length - firstList.length) + msg.substr(firstList.length);

        return msg.replace(',"$id":1', '').replace('"$id":1', '')
            .replace(/^\s*(\{\s*})\s*$/, '')
            .replace(/%s/g, function () {
                return args[i++];
            });
    }

    console.logfs = require('fs');
    console._olog = console.log;

    console.olog = function () {
        var msg = getLogMsg(Array.from(arguments));
        if (msg.trim())
            process.stdout.write(`\r${msg}\r\n`);
    };

    console.log = function () {
        var prompt = console.prompt || ">";
        var msg = getLogMsg(Array.from(arguments));

        if (msg.trim() && console.lastMsg != msg) {
            process.stdout.write(`\r${msg}\r\n${prompt}`);
            console.lastMsg = msg;
            console.lastMsgCount = 1;

            try {
                var _msg = `\r\n${(new Date()).toISOString()}\r\n${msg}`;
                if (console._debugTrace) {
                    var stack = arguments.callee.caller.stackTrace().splice(1);
                    _msg += `\r\nStack Trace:\r\n${stack.join('\r\n')}`;
                }
                console.logfs.appendFile("./Debug.log", _msg, function(err){});
            } catch (e) {
                //Ignore
                msg = msg.trim().split('\n').first() + '\r\n' + e.message;
            }
        }else{
            process.stdout.write(`\r(${++console.lastMsgCount}) ${console.lastMsg}`);
        }
    }

    console.debug = function () {
        var args = Array.from(arguments);
        var msg = getLogMsg(args);
        if (msg.trim()) {
            try {
                var _msg = `\r\n${(new Date()).toISOString()}\r\n${msg}`;
                if (console._debugTrace) {
                    var stack = arguments.callee.caller.stackTrace().splice(1);
                    _msg += `\r\nStack Trace:\r\n${stack.join('\r\n')}`;
                }
                console.logfs.appendFile("./Debug.log", _msg);
            } catch (e) {
                //Ignore
                msg = msg.trim().split('\n').first() + '\r\n' + e.message;
            }
            console.log(msg.trim().split('\n').first());
        }
    };

    console.debugTrace = function () {
        console._debugTrace = true;
        console.debug.apply(this, arguments);
        console._debugTrace = false;
    };

    console.ask = function ask(question, callback, validate) {
        if (global.args.s) return;
        var args = Array.from(arguments);
        question = args.first(a => typeof a == "string");
        callback = args.first(a => typeof a == "function");
        validate = args.nth(a => typeof a == "function" || typeof a == "object", 2);

        if (question)
            console.log(question);

        validate = validate || (line => true);
        if (validate.test)
            validate = (line => validate.test(line));

        console.asking = true;
        rl.on("line", function (data) {
            console.asking = false;
            data = data.toString().trim();
            if (validate(data)) {
                callback(data);
            } else {
                console.log(`Invalid input '${data}'. It should match: `, validate);
                ask(question, callback, validate);
            }
        });
    }

    console.prompt = console._prompt;
    Object.defineProperty(console, 'prompt', {
        get: function () {
            return console._prompt;
        },
        set: function (value) {
            if (value && value != console._prompt) {
                console.debug("Setting [console.prompt] to: " + value);
                process.stdout.write(`\r${value}`);
                console._prompt = value;
            }
        }
    });

}

if (!JSON.ostringify) {
    JSON.oparse = JSON.parse;
    JSON.ostringify = JSON.stringify;
    JSON.dstringify = function (value, replacer, space) {
        function censor(val) {
            var i = 0;
            var cache = []
            return function (key, value) {
                if (key.contains("."))
                    key = key.replace(/\./g, "_");

                if (typeof value === 'object' && value !== null) {
                    if (i !== 0) {
                        if (cache.indexOf(value) >= 0) // Circular reference found
                            return {"$id": value["_id"]};
                    }

                    //Use _id to for track Circular reference
                    if (!value["_id"])
                        value["_id"] = md5(JSON.ostringify(value));

                    // Store value in our collection
                    if (cache.indexOf(value) < 0)
                        cache.push(value);
                }

                i++;
                //if (cache.length > 500) // seems to be a harded maximum of 100 serialized objects?
                //    return '[Unknown]';

                return replacer ? replacer(key, value, space) : value;
            }
        }

        return JSON.ostringify(value, censor(Object.assign({}, value)), space);
    }
    JSON.parse = function () {
        try {
            return JSON.oparse.apply(this, arguments);
        } catch (e) {
            //console.debug("JSON parse failure!", e)
            return null;
        }
    }
}

if (!Object.values)
    Object.values = function (obj) {
        return Object.keys(obj).map(k => obj[k]);
    }

if (!Object.equals)
    Object.equals = function (x, y) {
        if (x === y) return true;
        // if both x and y are null or undefined and exactly the same

        if (!( x instanceof Object ) || !( y instanceof Object )) return false;
        // if they are not strictly equal, they both need to be Objects

        if (x.constructor !== y.constructor) return false;
        // they must have the exact same prototype chain, the closest we can do is
        // test there constructor.

        for (var p in x) {
            if (!x.hasOwnProperty(p)) continue;
            // other properties were tested using x.constructor === y.constructor

            if (!y.hasOwnProperty(p)) return false;
            // allows to compare x[ p ] and y[ p ] when set to undefined

            if (x[p] === y[p]) continue;
            // if they have the same strict value or identity then they are equal

            if (typeof( x[p] ) !== "object") return false;
            // Numbers, Strings, Functions, Booleans must be strictly equal

            if (!Object.equals(x[p], y[p])) return false;
            // Objects and Arrays must be tested recursively
        }

        for (p in y) {
            if (y.hasOwnProperty(p) && !x.hasOwnProperty(p)) return false;
            // allows x[ p ] to be set to undefined
        }
        return true;
    }

if (!Object.isEmpty)
    Object.isEmpty = function (obj) {
        //check if it's an Obj first
        var isObj = obj !== null
            && typeof obj === 'object'
            && Object.prototype.toString.call(obj) === '[object Object]';

        if (isObj) {
            for (var o in obj) {
                if (obj.hasOwnProperty(o)) {
                    return false;
                    break;
                }
            }
            return true;
        } else {
            console.error("isEmpty function only accept an Object");
        }
    };

if (!Object.diff)
    Object.diff = function (obj1, obj2) {
        if (obj2 && !obj1)
            return Object.diff({}, obj2)
        if (obj1 && !obj2)
            return Object.diff(obj1, {})

        var ret = {}, rett;
        for (var i in obj2) {
            if (obj2.hasOwnProperty(i)) {
                rett = {};
                if (typeof obj2[i] === 'object') {
                    rett = Object.diff(obj1[i], obj2[i]);
                    if (!Object.isEmpty(rett))
                        ret[i] = rett;
                } else {
                    if (!obj1 || !obj1.hasOwnProperty(i) || obj2[i] !== obj1[i])
                        ret[i] = [obj1[i], obj2[i]];
                }
            }
        }
        return ret;
    };

if (!Function.prototype.stackTrace)
    Function.prototype.stackTrace = function () {
        var callstack = [];
        var isCallstackPopulated = false;
        try {
            i.dont.exist += 0; //doesn't exist- that's the point
        } catch (e) {
            if (e.stack) { //Firefox
                var lines = e.stack.split('\n');
                for (var i = 0, len = lines.length; i < len; i++) {
                    if (lines[i].match(/^\s*(at)\s/)) {
                        callstack.push(lines[i]);
                    }
                }
                //Remove call to stackTrace()
                callstack.shift();
                isCallstackPopulated = true;
            }
            else if (window.opera && e.message) { //Opera
                var lines = e.message.split('\n');
                for (var i = 0, len = lines.length; i < len; i++) {
                    if (lines[i].match(/^\s*(at)\s/)) {
                        var entry = lines[i];
                        //Append next line also since it has the file info
                        if (lines[i + 1]) {
                            entry += ' at ' + lines[i + 1];
                            i++;
                        }
                        callstack.push(entry);
                    }
                }
                //Remove call to stackTrace()
                callstack.shift();
                isCallstackPopulated = true;
            }
        }

        if (!isCallstackPopulated) { //IE and Safari
            var currentFunction = arguments.callee.caller;
            while (currentFunction) {
                var fn = currentFunction.toString();
                var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('')) || 'anonymous';
                callstack.push(fname);
                currentFunction = currentFunction.caller;
            }
        }
        return callstack;
    }

//
if (!Function.prototype.retryApply)
    Function.prototype.retryApply = function (context, checkReady, maxRetries, retryTime, args) {
        var retry = 0, fn = this, stackTrace = arguments.callee.caller.stackTrace();
        maxRetries = maxRetries || 5;
        retryTime = retryTime || 1000;


        return new Promise(function (fulfill, reject) {
            var timeInterval = setInterval(function () {
                if (retry++ > maxRetries) {
                    clearInterval(timeInterval);
                    reject("Max retries reached!\r\n", stackTrace.join("\r\n"))
                } else if (retry > 1) {
                    //console.debug(`Retrying!! Attempt ${retry - 1} of ${maxRetries}.`)
                }

                var isReady = typeof checkReady == "function" ? !!checkReady() : true;
                if (isReady) {
                    try {
                        var d = fn.apply(context, args);
                        if (d instanceof Promise)
                            d.then(fulfill).catch(reject);
                        else
                            fulfill(d);

                        clearInterval(timeInterval);
                    } catch (e) { //Retry
                        console.error(e);
                    }
                }
            }, retryTime);
        }).catch(console.debug);
    }

//
if (!Function.prototype.retryCall)
    Function.prototype.retryCall = function (context, checkReady, maxRetries, retryTime) {
        var args = [];
        for (var i = 4; i < arguments.length; i++)
            args.push(arguments[i]);

        return this.retryApply(context, checkReady, maxRetries, retryTime, args);
    }

//
if (!Function.prototype.promiseApply)
    Function.prototype.promiseApply = function (context) {
        var retry = 0, fn = this, maxRetries = 5, retryTime = 1000;
        var args = [];

        for (var i = 1; i < arguments.length; i++)
            args.push(arguments[i]);

        return new Promise(function (fulfill, reject) {
            var timeInterval = setInterval(function () {

                try {
                    var d = fn.apply(context, args);
                    clearInterval(timeInterval);
                    fulfill(d);
                    return;
                } catch (e) {
                    //Retry
                    console.log(e);
                }

                if (++retry > maxRetries) {
                    clearInterval(timeInterval);
                    reject("Max retries reached!")
                }
            }, retryTime);
        }).catch(console.debug);
    }

//
if (!Function.prototype.promiseCall)
    Function.prototype.promiseCall = function (context) {
        var args = [];
        for (var i = 1; i < arguments.length; i++)
            args.push(arguments[i]);

        return this.promiseApply.apply(this, context, args);
    }

//String formating
if (!String.prototype.format)
    String.prototype.format = function () {
        var formated = this;
        for (i in arguments) {
            if (arguments.hasOwnProperty(i)) {
                var regex = new RegExp("(\\{" + i + "\\})", "g");
                var value = arguments[i];
                try {
                    if (ko && ko.unwrap)
                        value = ko.unwrap(value);
                } catch (e) {
                    //ignore
                }

                formated = formated.replace(regex, value);
            }
        }
        return formated;
    }

if (!String.prototype.splitArgs)
    String.prototype.splitArgs = function () {
        //The parenthesis in the regex creates a captured group within the quotes
        var myRegexp = /[^\s"]+|"([^"]*)"/gi;
        var myString = this.toString();
        var myArray = [];

        do {
            //Each call to exec returns the next regex match as an array
            var match = myRegexp.exec(myString);
            if (match != null) {
                //Index 1 in the array is the captured group if it exists
                //Index 0 is the matched text, which we use if no captured group exists
                myArray.push(match[1] ? match[1] : match[0]);
            }
        } while (match != null);
        return myArray;
    }

//https://www.sitepoint.com/trimming-strings-in-javascript/
//if (!String.prototype.trimLeft)
String.prototype.trimLeft = function (charlist) {
    if (charlist === undefined)
        charlist = "\\s";

    return this.replace(new RegExp("^[" + charlist + "]+"), "");
};

//https://www.sitepoint.com/trimming-strings-in-javascript/
//if (!String.prototype.trimRight)
String.prototype.trimRight = function (charlist) {
    if (charlist === undefined)
        charlist = "\\s";

    return this.replace(new RegExp("[" + charlist + "]+$"), "");
};

//https://www.sitepoint.com/trimming-strings-in-javascript/
//if (!String.prototype.trim)
String.prototype.trim = function (charlist) {
    return this.trimRight(charlist).trimLeft(charlist);
};

//
if (!String.prototype.any)
    String.prototype.contains = String.prototype.any = function (search) {
        if (typeof search == "function")
            return this.map(search).any(true);
        else if (search)
            return this.indexOf(search) >= 0;
        else
            return this.length > 0;
    };

if (!String.prototype.camelCaseToSentence)
    String.prototype.camelCaseToSentence = function () {
        return this.trim().replace(/^[a-z]|[A-Z]/g, function (v, i) {
            return i === 0 ? v.toUpperCase() : " " + v.toLowerCase();
        });
        ;
    }

if (!String.prototype.toSentenceCase)
    String.prototype.toSentenceCase = function () {
        var sentence = this.trim();
        return sentence.substr(0, 1).toUpperCase() + sentence.substr(1).toLowerCase();
    }

String.prototype.toProperCase = function (lowerCaseTheRest) {
    return (lowerCaseTheRest ? this.toLowerCase() : this)
        .replace(/(^|[\s\xA0])[^\s\xA0]/g, function (s) {
            return s.toUpperCase();
        });
};
if (!Array.prototype.nth)
    Array.prototype.nth = function (filter, index) {
        index = (index || 1) - 1;
        filter = filter || function (f) {
                return true
            };
        return this.filter(filter)[index];
    }

if (!Array.prototype.first)
    Array.prototype.first = function (filter) {
        filter = filter || function (f) {
                return true
            };
        var filtered = this.filter(filter);
        return filtered ? filtered[0] : null;
    }


Array.prototype.clone = function () {
    return this.slice(0);
};

if (!Array.prototype.last)
    Array.prototype.last = function (filter) {
        filter = filter || function (f) {
                return true
            };
        var arr = this.filter(filter)
        return arr[arr.length - 1];
    }

//
if (!Array.prototype.any)
    Array.prototype.contains = Array.prototype.any = function (search) {
        if (typeof search == "function")
            return this.map(search).any(true);
        else if (search)
            return this.indexOf(search) >= 0;
        else
            return this.length > 0;
    };

//
if (!Array.prototype.aggregate)
    Array.prototype.aggregate = function (initial, aggregator, selector) {
        if (selector && typeof selector != "function") throw "selector must be a function..";
        var values = selector ? this.map(selector) : this;
        return values.reduce(aggregator, initial);
    };

//
if (!Array.prototype.sum)
    Array.prototype.sum = function (selector) {
        return this.aggregate(0.0, (a, b) => a + b, selector);
    };

//
if (!Array.prototype.avg)
    Array.prototype.avg = function (selector) {
        return this.sum(selector) / this.length;
    };

if (!Array.prototype.prod)
    Array.prototype.prod = function (selector) {
        return this.aggregate(1.0, (a, b) => a * b, selector);
    };
if (!Array.prototype.splitChunks)
    Array.prototype.splitChunks = function (size) {
        var arr = this;
        var chunkCount = parseInt(this.length / size) + 1;
        var groups = this.groupBy(a => {
            return arr.indexOf(a) % chunkCount;
        });

        return Object.values(groups);
    }
//
if (!Array.prototype.groupBy)
    Array.prototype.groupBy = function (compare) {
        return this.reduce(function (groups, x) {
            var groupKey = (typeof compare == "function" ? compare(x) : (x[compare] || x || 0));
            (groups[groupKey] = groups[groupKey] || []).push(x);
            return groups;
        }, {});
    }

//
if (!Array.prototype.group)
    Array.prototype.group = function (compare) {
        var groups = this.groupBy();
        return Object.keys(groups).map(function (k) {
            return groups[k];
        })
    }

if (!Array.prototype.distinctBy)
    Array.prototype.distinctBy = function (compare) {
        var groups = this.groupBy(compare);
        return Object.keys(groups).map(function (k) {
            return groups[k][0];
        });
    }

if (!Array.prototype.distinct)
    Array.prototype.distinct = function (prop) {
        return this.distinctBy(prop);
    }

if (!Array.prototype.orderBy)
    Array.prototype.orderBy = function (clause) {
        return this.slice(0).sort(function (a, b) {
            var x = typeof clause == "function" ? clause(a) : a;
            var y = typeof clause == "function" ? clause(b) : b;
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
    }

if (!Array.prototype.orderByDescending)
    Array.prototype.orderByDescending = function (clause) {
        return this.slice(0).sort(function (a, b) {
            var x = typeof clause == "function" ? clause(a) : a;
            var y = typeof clause == "function" ? clause(b) : b;
            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        });
    }

if (!Array.prototype.flatten)
    Array.prototype.flatten = function (map) {
        return this.reduce(function (a, b) {
            return a.concat(typeof map == "function" ? map(b) : b);
        }, []);
    }

//
if (!Math.sequence)
    Math.sequence = function (min, max, fxn) {
        max = max || 100;
        min = min || 0;
        var N = [];

        if (typeof fxn == "function")
            for (var i = min; i <= max; i++) N.push(fxn(i));
        else
            for (var i = min; i <= max; i++) N.push(i);

        return N;
    }

Date.isLeapYear = function (year) {
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
};

Date.getDaysInMonth = function (year, month) {
    return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};

Date.prototype.isLeapYear = function () {
    return Date.isLeapYear(this.getFullYear());
};

Date.prototype.getDaysInMonth = function () {
    return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
};

Date.prototype.addYears = function (value) {
    var years = Math.floor(value);
    var months = (value - years) * 12;
    this.setYear(this.getYear() + years);
    if (months) this.addMonths(months);
    return this;
}

Date.prototype.addMonths = function (value) {
    var months = value % 12;
    var years = Math.floor(value / 12);

    this.setDate(1);
    this.setMonth(this.getMonth() + months);
    this.setDate(Math.min(this.getDate(), this.getDaysInMonth()));

    if (years) this.addYears(years);
    return this;
};

Date.prototype.addDays = function (value) {
    return this.addHours(24 * value);
}

Date.prototype.addHours = function (value) {
    return this.addMinutes(value * 60);
}

Date.prototype.addMinutes = function (value) {
    return this.addSeconds(value * 60);
}

Date.prototype.addSeconds = function (value) {
    this.setTime(this.getTime() + (value * 1000));
    return this;
}

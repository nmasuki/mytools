const sql = require('mssql');
const PhoneNumberRegex = require('../models/PhoneNumberRegex');
const Carrier = require('../models/Carrier');
const CarrierLookUp = require('../models/CarrierLookUp');
const Async = require('async');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/number_regex');

var con, connecting, allCarriers = [],
    allDocs = [],
    CONCURRENT = 5,
    BATCHSIZE = 1000;

function connectMySQLConnection() {
    if (con) {
        con.close();
        sql.close();
        console.log("Establishing new MySQL connection...");
    }
    return connecting || (connecting = sql.connect('mssql://sa:Ih8uih8U@users.de-sql.mobileaccord.local/Users').then(c => {
        console.log("MySQL Connected!");
        connecting = null;
        return (con = c);
    }));
}

connectMySQLConnection();
Carrier.find()
    .select('-__v')
    .exec((err, carriers) => {
        if (err) return;
        carriers.forEach(c => allCarriers.push(c));
    });

console.log('Setuping up interval.');
var processed = 0;
var processQueeue = Async.queue(function processLookUp(obj, callback) {
    if (processed++ % (CONCURRENT * 10) == 0)
        console.log('Processing...', processed + " remaining " + processQueeue.length(), obj.createdDate.toISOString());

    function internationalRegex() {
        return updateRegex('international', obj.phone_number, obj).then(function () {
            obj.processed = true;
            return obj.save()
                .then(a => {
                    if (typeof callback == "function")
                        setTimeout(callback, 1000);
                })
                .catch(err => console.warn(err));
        });
    }

    if (obj.phone_number != obj.national_format)
        return updateRegex('national', obj.national_format, obj).then(internationalRegex);
    else
        return internationalRegex();
}, CONCURRENT);

var processRunId = setInterval(function () {
    console.log('Processing...', processed + " remaining " + processQueeue.length());
}, 5000);

processQueeue.drain = function () {
    clearInterval(processRunId);
    console.log('All items have been processed at', new Date().toISOString());
};

function updateRegex(formatType, phone_number, obj) {
    phone_number = phone_number.replace(/[^\+\d]/g, "");

    var regex = getRegexStrings(phone_number.split(''));

    return Promise.all(regex.map(match => {
        var filter = {
            format: match,
            formatType: formatType
        };

        return PhoneNumberRegex.find(filter)
            .select('-__v')
            .exec((err, docs) => {
                if (err) {
                    console.warn(err);
                    return Promise.timeout(200);
                }

                var carrier = getCarrier(obj.carrier);
                docs = getDocs(match, formatType, carrier, docs);

                var doc = docs[0];
                if (!doc.carriers.any(c => (c.id || c) == carrier.id)) {
                    doc.carriers.push(carrier);
                    var distinct = doc.carriers.map(c => c._id || c).distinct();
                    doc.carriers = distinct;
                }

                if (!doc.numbers.any(n => n == phone_number)) {
                    doc.numbers.push(phone_number);
                    doc.occurences = doc.numbers.length;
                }

                if (doc.format.trim()) {
                    var afterSave = function () {
                        console.log("All docs:" + allDocs.length);
                        allDocs = allDocs.filter(d=>d.id != doc.id);
                        console.log("All docs:" + allDocs.length);
                        
                        if (doc.carriers.length == 1 && doc.occurences > 100)
                            console.log(doc.format, doc.occurences);

                        doc.failed = 0;
                        if (typeof next == "function")
                            next();
                    };

                    if (doc.isNew) {
                        doc.isNew = false;
                        return doc.save().then(afterSave).catch(err => {
                            console.warn("Error saving..", err.message);
                            doc.failed = (doc.failed || 0) + 1;
                            delete doc.__v;
                            return doc.save().then(afterSave).catch(err2 => {
                                console.warn("Document could not be saved..", err2.message);
                                doc.failed = (doc.failed || 0) + 1;
                            });
                        });
                    } else {
                        doc.needsUpdate = true;
                    }
                } else {
                    console.log("null format");
                }

                return Promise.timeout(200);
            });
    }));
}

function getCarrier(obj) {
    var carrier = allCarriers.find(a => a.id == obj.id || a.mobile_country_code == obj.mobile_country_code && a.mobile_network_code == obj.mobile_network_code);

    if (!carrier) {
        carrier = new Carrier(obj);
        allCarriers.push(carrier);
        carrier.save().catch(err => {
            //console.warn(err)
        });
    }

    return carrier;
}

function getDocs(match, formatType, carrier, docs) {
    docs = allDocs.concat((docs || []))
        .filter(d => d.format == match && d.formatType == formatType);

    if (!docs.length) {
        var doc = new PhoneNumberRegex({
            format: match,
            formatType: formatType,
            modifiedDate: new Date()
        });
        allDocs.push(doc);
        docs.push(doc);
    }

    if (docs.length > 1)
        docs = docs.distinctBy(d => d.id);

    if (carrier)
        docs.forEach(doc => {
            if (doc.carriers.all(c => (c.id || c) != carrier.id))
                doc.carriers.push(carrier);

            var foundIndex = allDocs.findIndex(d => d.id == doc.id);
            if (foundIndex >= 0)
                allDocs[foundIndex] = doc;
            else
                allDocs.push(doc);
        });

    if (docs.length > 1) {
        console.warn("Something is going wrong..");
    }

    return docs;
}

function simplifyRegex(array) {
    var res = [],
        last = null;

    for (var i = array.length - 1; i >= 0; i--) {
        if (last && last.regex == array[i]) {
            last.count += 1;
        } else {
            if (last) res.unshift(last);
            last = {
                regex: array[i],
                count: 1
            };
        }

        if (i == 0) res.unshift(last);
    }

    return res.map(r => `${r.regex}${r.count>1?'{' + r.count + '}':''}`);
}

function getRegexStrings(input) {
    if (!input) return [];

    var array = typeof input == "string" ? simplifyRegex(input) : input;
    var regex = [array.join('')];

    for (var i = array.length - 1; i >= 0; i--) {
        var matched = false;
        if (/^\d$/.test(array[i])) {
            array[i] = "\\d";
            matched = true;
        } else if (/^[\w^_]$/.test(array[i])) {
            array[i] = "\\w";
            matched = true;
        } else if (!array[i]) {
            array[i] = "";
        }

        if (matched)
            regex.unshift(simplifyRegex(array).join(''));
    }

    return regex.filter(f => !!f.trim());
}

function getSampleMatch(regexStr) {
    var r = /\\(\w)\{(\d)\}/;
    return regexStr.replace(r, function (match, escapeChar, count) {
        var fillCharsOptions = {
            'd': '0123456789',
            'w': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            's': ' \n\r'
        };
        var fillChars = fillCharsOptions[escapeChar] || 'X';

        var fill = "";
        for (var i = 0; i < count || 0; i++) {
            var pick = Math.round(Math.random() * (fillChars.length - 1));
            fill += fillChars[pick];
        }

        return fill;
    });
}

function RegexMaker() {
    var lastCarrierETLDate = null;

    function etlCarrierLookUp(since, done) {
        if (!since) {
            function getSinceAndContinueLoadingSQL(){
                return CarrierLookUp.find()
                //.sort({ createdDate: 1 })
                .exec((err, docs) => {
                    if (err)
                        return console.log(err);
                        
                    var dates = docs.filter(doc => doc.createdDate).map(doc => doc.createdDate);
                    var lastModified = dates.length ? dates.max(d => d.getTime()) : new Date('2014-01-01').getTime();

                    var _since = new Date(lastModified).toISOString();
                    console.log("Picking SQL data from " + _since);

                    etlCarrierLookUp(_since, done);
                });
            }

            return CarrierLookUp.find({ processed: false })
                //.sort({ createdDate: 1 })
                .exec((err, docs) => {
                    if (err)
                        return console.log(err);

                    if (docs.length) {
                        var chunks = docs.splitChunks(BATCHSIZE);
                        var promiseChain;

                        chunks.forEach(chunk => {
                            var promise = new Promise((fulfill, reject) => {
                                var interval = setInterval(() => {
                                    if (processQueeue.length() < BATCHSIZE) {
                                        clearInterval(interval);
                                        chunk.forEach(d => processQueeue.push(d));
                                    }
                                }, 1000);
                            });

                            if (!promiseChain)
                                promiseChain = promise;
                            else
                                promiseChain.then(promise);
                        });

                        return promiseChain.then(() => getSinceAndContinueLoadingSQL());
                    }

                    return getSinceAndContinueLoadingSQL();
                });
        }
        var that = this,
            args = arguments;

        if (since == lastCarrierETLDate) {
            if (typeof done == "function")
                return done();
            else
                return;
        }

        if (processQueeue.length() > BATCHSIZE * 5) {
            return Promise.timeout(30000).then(() => etlCarrierLookUp.apply(that, args));
        }

        if (!con) {
            console.log("Awaiting SQL connection..");
            return connectMySQLConnection().then(c => {
                console.log("Calling etlCarrierLookUp..");
                return etlCarrierLookUp.apply(that, args);
            });
        }
        lastCarrierETLDate = since;
        var query = `SELECT TOP (${BATCHSIZE}) * FROM [Users]..[MobileNumberCarrierLookup] WHERE ModifiedDateTime > '${since}' AND MNC IS NOT NULL AND MCC IS NOT NULL ORDER BY ModifiedDateTime ASC;`;

        console.log("Loading batch from SQL...", since);
        return con.query(query).then(result => {
            console.log("Loaded batch from SQL...", result.recordset.length);

            var savingPromise = Promise.all(result.recordset.map((data, i) => {
                if (data.JsonResult) {
                    var obj = JSON.parse(data.JsonResult);
                    var carrier = CarrierLookUp(obj);
                    carrier.id = obj.national_format;
                    carrier.processed = false;
                    carrier.createdDate = data.ModifiedDateTime;

                    processQueeue.push(carrier, function (err) {
                        if (err) {
                            console.log(err);
                        }
                    });

                    return carrier.save();
                }

                return Promise.resolve(null);
            }));

            return savingPromise.finally(() => {
                var maxDate = result.recordset.max(d => {
                    if (d.ModifiedDateTime)
                        return d.ModifiedDateTime.getTime();
                    return 0;
                });

                if (maxDate) {
                    return done(new Date(maxDate).toISOString(), done);
                } else {
                    return done(undefined, done);
                }
            });

        }).catch(err => {
            console.log("SQL error. Retrying..", err.message);
            return connectMySQLConnection()
                .then(() => {
                    console.log("Picking from: ", since);
                    return etlCarrierLookUp.apply(that, args);
                })
                .catch(err => {
                    console.log("Error Connecting..", err && err.message);
                    return etlCarrierLookUp.apply(that, args);
                });
        });
    }

    this.toRegex = getRegexStrings;

    this.updateCarrier = function updateCarrierRegex() {
        return PhoneNumberRegex
            .find({
                $where: 'this.carriers.length == 1 && this.numbers.length > 4'
            })
            .sort({
                occurences: -1
            })
            //.limit(1000)
            .populate('carriers')
            .exec((err, regex) => {
                if (err)
                    return console.log(err);

                console.log(`Got ${regex.length} regex matching only one carrier...`);
                var updates = regex.selectMany(r => {
                    return r.carriers.select(c => {
                        c = getCarrier(c);

                        function regexAIsSubsetOfB(a, b) {
                            if (a == b) return true;

                            var startA = a.replace(/\\(\w)\{(\d)\}$/, '');
                            var startB = b.replace(/\\(\w)\{(\d)\}$/, '');

                            return startA == startB || startA.startsWith(startB);
                        }

                        if (c.matchingRegex.all(m => !regexAIsSubsetOfB(r.format, m))) {
                            c.matchingRegex
                                .where(m => regexAIsSubsetOfB(m, r.format))
                                .forEach(m => c.matchingRegex.remove(m));

                            c.matchingRegex.push(r.format);
                            return c;
                        }

                    }).where(s => !!s);
                }).distinct();

                console.log(`Updating ${updates.length} carriers...`);

                return Promise.all(updates.map(c => c.save())).then(s => {
                    console.log("Done!");
                }).catch(err => {
                    console.log("Done! with error.", err.message);
                });
            });
    };

    this.etlRegex = function () {
        var next = function (since, done) {
            if (!since || since < new Date().toISOString())
                etlCarrierLookUp.apply(this, arguments);
            else
                console.log("Done ETL!", since);
        };

        return etlCarrierLookUp(undefined, next);
    };
}

module.exports = RegexMaker;
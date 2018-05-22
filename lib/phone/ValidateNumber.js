/**
 * Created by nmasuki on 5/3/2018.
 */

require('./../common/polyfills');
const fs = require('fs');
const md5 = require("md5");
const Contacts = require("./Phonebook").Contacts;
const HTTPClient = require('./../common/HTTPClient');
const MongoRepo = require("../common/MongoRepo");
var messagebird;
const csvPath = "C:\\data\\GeoPoll_South_Sudan_RDD_400K";

function ValidateNumber() {
    var self = this;
    HTTPClient.call(this);

    var lookupRepo = new MongoRepo("numberLookup", "lookup");
    var numberRepo = new MongoRepo("numberLookup", "number");

    self.messageBirdLookUp = function (mobilenumber, callback) {
        messagebird = messagebird || require('messagebird')(process.env.MESSAGE_BIRD_APIKEY1);

        function lookUp() {
            messagebird.lookup.read(mobilenumber, function (err, response) {
                if (err)
                    return console.log(err);

                lookupRepo.save({
                    _id: md5(mobilenumber),
                    date: new Date().toISOString(),
                    response: response
                });

                callback(response);
                if (!response.lhr)
                    setUpLHR();
            });
        }

        function setUpLHR() {
            messagebird.lookup.hlr.create(mobilenumber, function (err, response) {
                if (err)
                    return console.log(err);

                lookupRepo.save({
                    _id: md5(mobilenumber),
                    date: new Date().toISOString(),
                    response: response
                });

                //console.log(response);
                if (response.status == "sent")
                    setTimeout(savedLookUp, 60 * 1000);
                else {
                    callback(response);
                }
            });
        }

        function savedLookUp(){
            return lookupRepo.findOne({_id: md5(mobilenumber)})
                .then(function (data) {
                    if (data) {
                        if(data.status == "unknown" || data.status == "active") {
                            if (typeof callback == "function")
                                callback(data.response)
                        }else if(response.status == "sent" && response.statusDatetime < new Date().addHours(2).toISOString()){
                            //Wait a while then check again
                            setTimeout(savedLookUp, 60 * 1000);
                        }else
                            setUpLHR();
                    } else
                        lookUp();
                })
                .catch(lookUp);
        }

        return savedLookUp();
    };

    self.transferToLookUp = function (mobilenumber, callback) {
        var url = "http://fm.transfer-to.com/cgi-bin/shop/topup";
        var login = process.env.TRANSFERTO_LOGIN;
        var transferToPwd = process.env.TRANSFERTO_KEY;
        var key = getNextKey();

        console.log("transferToLookUp..", mobilenumber);

        var payload = {
            action: "msisdn_info",
            key: key,
            login: login,
            md5: md5(login + transferToPwd + key),
            destination_msisdn: mobilenumber
        };
        var xml_payload = `<xml>` +
            `<action>${payload.action}</action><login>${payload.login}</login>` +
            `<md5>${payload.md5}</md5><key>${payload.key}</key>` +
            `<destination_msisdn>${payload.destination_msisdn}</destination_msisdn>` +
            `</xml>`;

        function apiCall() {
            return self.makeRequest(url, xml_payload, "POST", {'Content-Type': 'text/plain; charset=utf-8'})
                .catch(err => {
                    console.log(err);
                })
                .then((a, b, c) => {
                    lookupRepo.save({
                        _id: md5(mobilenumber),
                        date: new Date().toISOString(),
                        xml: xml_payload,
                        response: {a: a, b: b, c: c}
                    });
                    console.log(a, b, c);

                    if (typeof callback == "function")
                        callback(a, b, c);
                });
        }

        return lookupRepo.findOne({_id: md5(mobilenumber)})
            .then(function (data) {
                if (data && data.response) {
                    if (typeof callback == "function")
                        callback(data.response.a, data.response.b, data.response.c)
                } else
                    apiCall();
            })
            .catch(apiCall);

    };

    self.numberLookUps = function (contacts, callback) {
        var count = 0;
        var chunks = contacts.splitChunks(100000);
        console.log("Slit into " + chunks.length);
        chunks.forEach((chunk, i) => {
            console.log("Working on chunk " + (i + 1));

            var windex = 0;
            (function processNext() {
                var c = chunk[windex++];
                if (!c) {
                    if (typeof callback == "function")
                        callback(chunk, i, i >= chunks.length);
                } else if (typeof c.status == "undefined") {
                    self.transferToLookUp(c.numbers, response => {
                        data = response.TransferTo || response.hlr || response;

                        for (var x  in data) {
                            var value = Array.isArray(data[x]) ? data[x][0] : data[x];
                            if (typeof value == "object") {
                                for (var y in value)
                                    c[x + "_" + y] = value[y];
                            } else
                                c[x] = value;
                        }


                        if (c.status)
                            c.connection_status = c.status;

                        if (!c.connection_status)
                            c.connection_status = 0;

                        console.log(c.numbers, "Status " + c.connection_status + "%");

                        c._id = c.numbers;
                        numberRepo.save(c);
                        processNext();
                    });
                } else {
                    processNext();
                }
            })();
        });
    };

    self.checkall = function () {
        fs.readdir(csvPath, function (err, items) {
            var csvs = items.filter(f => f.endsWith(".csv") && !f.endsWith("Checked.csv"));
            (function processNext() {
                var next = csvs.pop();
                if (next)
                    self.check([csvPath, next].join("\\"), processNext);
            })();
        });
    };

    self.check = function (csvFile, processNext) {
        if (!csvFile) throw "csvFile required!!";
        var contacts = new Contacts(csvFile);
        self.numberLookUps.retryApply(this, contacts.isReady, 1000, 1000, [
            contacts.contacts, function (c, i, last) {
                var ext = i ? `-(${i}).csv` : ".csv";
                writeCsv(c, csvFile.replace(".csv", ext));
                if (last && typeof processNext == "function")
                    processNext();
            }]);
    };

    function getNextKey() {
        var time = getUniqueUtcNow().getTime() - new Date("1986-06-22").getTime();
        return time;
    }

    function getUniqueUtcNow() {
        var waitTill = new Date(new Date().getTime() + 1);
        while (waitTill > new Date()) {
        }
        return new Date();
    }

    function writeCsv(data, csvFile) {
        var headers = [];
        var csv = "";

        var file = csvFile.replace(".csv", "-Checked.csv");
        console.log("Saving..", file);

        data.forEach(d => {
            Object.keys(d).forEach(h => {
                if (!headers.contains(h)) headers.push(h);
            });
            csv += "\r\n" + headers.map(h => `"${d[h] || ''}"`).join(",");
        })

        fs.writeFile(file, `"${headers.join('","')}"${csv}`);
    }
}

module.exports = ValidateNumber;
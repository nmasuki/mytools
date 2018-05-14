const MongoRepo = require("../lib/common/MongoRepo");
const najax = require('najax');

var useSyncGateway = true;

var googleKeyUsage = {
    _id: "Google:" + new Date().addHours(-10 + 3).toISOString().substr(0, 10),
    dailyLimit: 100,
    usage: {
        'AIzaSyBGzl7yhwd0kEmRN9qYP7hmq6uvII8o7Sk': 0,
        'AIzaSyAgqLVvMJluK3-65169vjm8GDCc4d3LK1I': 0,
        'AIzaSyAWF4-UBqugwC2LhGFlRsti1bm7CSJNwlA': 0,
        'AIzaSyDrTQ_gRXhHpbOcaERWR4ykcxK9fXZJbso': 0,
        'AIzaSyBQsWkz6-MIHTbPQrj220rLkwRFE7OD1-Q': 0
    }
};
var keyRepo = new MongoRepo("dialadrink", "apiKeys");
keyRepo.findOne({_id: googleKeyUsage._id}).then(function (record, err) {
    if (err)
        console.log(err);

    if (record) {
        for (var k in record.usage)
            if (googleKeyUsage.usage[k])
                googleKeyUsage.usage[k] += record.usage[k];
            else
                googleKeyUsage.usage[k] = record.usage[k];
    }

    keyRepo.save(googleKeyUsage);
});

var googleKeyUsageTimeout = null;
var host = "159.65.50.86";//"localhost";//
var database = "dialadrink";
var repo = new MongoRepo("dialadrink", "search");

if (!useSyncGateway) {
    const couchbase = require("couchbase");
    var cluster = new couchbase.Cluster(`http://${host}:8091?detailed_errcodes=1`);
    cluster.authenticate('admin', 'admin@Mai');
    var bucket = cluster.openBucket('dialadrink', function (err) {
        if (err) {
            useSyncGateway = true;
            console.log(err);
        }
    });
    bucket.operationTimeout = 1 * 60000;
}

var regexPostDate = /(\w{3}\s\d{1,2},?\s*\d{4}\s*.{0,3}\.{3}.{0,4})/;

var msnCalls = 0, idRevs = {}, sync = {};

sync.get = function get(_id, callback) {
    if (!useSyncGateway) {
        bucket.get(_id, function (err, row, meta) {
            if (!err) {
                if (meta)
                    idRevs[_id] = meta.rev;
                if (typeof callback == "function")
                    callback(err, row.value, row.cas);
            } else if (err.code == 23) {
                setTimeout(sync.get, 1000 + Math.random() * 10000, _id, callback);
            } else if (err.code == 13) {
                callback()
            } else {
                console.debug("Error while getting data!", _id, err.message);
            }
        });
    } else {
        najax.get({
            url: `http://${host}:4985/${database}/` + _id,
            contentType: "application/json",
            dataType: 'json',
            headers: {
                "Accept-Encoding": "gzip, deflate",
                "Accept-Language": "en-US,en;q=0.9,sw-KE;q=0.8,sw;q=0.7",
                "Cookie": `ui-auth-${host}%3A8091=597e0c9fa882da2d75ba956568bd559f`,
                "DNT": "1",
                "Host": `${host}:4985`,
                "Origin": `http://${host}:4985`,
                "Proxy-Connection": "keep-alive",
                "Referer": `http://${host}:4985/_admin/db/${database}/documents`,
                "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36"
            },
            success: function (data) {
                if (idRevs && data._rev)
                    idRevs[_id] = data._rev;

                if (typeof callback == "function")
                    callback(null, data, data._rev)
            },
            error: function (xhr, status, err) {
                var msg = xhr.responseText || err.message;
                if (err.code == "ETIMEDOUT")
                    setTimeout(sync.get, 1000 + Math.random() * 10000, _id, callback);
                else if (err.message == "Not Found")
                    callback()
                else if (typeof callback == "function") {
                    console.log("Error while Getting from sync gateway..", msg);
                    callback()
                } else {
                    console.warn("Error while getting " + _id, err.message)
                }
            }
        });
    }
};

sync.save = function save(_id, _rev, data, mathFn) {
    sync.get(_id, function (err, row, cas) {
        if(typeof mathFn == "function" && !mathFn(row))
            return;

        var diff = Object.diff(row, data) || {};
        var diffArr = Object.values(diff).filter(d => d && d[1]);
        if (diffArr.length == 0) {
            console.log("No changes detected yet..");
            return;
        } else if (row) {
            var changes = `${_id}:\r\n`;
            for (var i in diff)
                changes += `\t-${i}: ${diff[i][0]}->${diff[i][1]}\r\n`;

            console.log(changes);
        }
        var doc = JSON.parse(JSON.stringify(data));

        doc.createdAt = doc.createdAt || (row || {}).createdAt || new Date().toISOString();
        doc.modifiedAt = new Date().toISOString();
        if (!useSyncGateway) {
            delete doc._id;
            delete doc.$id;
            if (row) {
                bucket.upsert(_id, doc, function (err, res) {
                    if (err)
                        console.warn("Error while upserting data!", err);
                    else
                        console.log(`Upserted '${doc.name}', '${_id}', '${res.cas}'!`)
                });
            } else {
                bucket.insert(_id, doc, function (err, res) {
                    if (err)
                        console.warn("Error while inserting data!", err);
                    else
                        console.log(`Inserted '${doc.name}', '${_id}', '${res.cas}'!`)
                });
            }
        } else {
            doc._rev = cas || idRevs[_id] || (row || {})._rev;
            najax.put({
                url: `http://${host}:4985/${database}/` + _id,
                contentType: "application/json",
                dataType: 'json',
                data: doc,
                headers: {
                    "Accept-Encoding": "gzip, deflate",
                    "Accept-Language": "en-US,en;q=0.9,sw-KE;q=0.8,sw;q=0.7",
                    "Cookie": `ui-auth-${host}%3A8091=597e0c9fa882da2d75ba956568bd559f`,
                    "DNT": "1",
                    "Host": `${host}:4985`,
                    "Origin": "http://${host}:4985",
                    "Proxy-Connection": "keep-alive",
                    "Referer": `http://${host}:4985/_admin/db/${database}/documents`,
                    "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36"
                },
                success: function (data) {
                    idRevs[_id] = data._rev || data.rev || data.Rev;
                    console.log(`Saved '${doc.name}', '${data.id}', '${idRevs[_id]}'!`)
                },
                error: function (xhr, status, err) {
                    var msg = xhr.responseText || err.message;
                    console.log("Error while Saving to sync gateway..", msg);
                    if (err.code == "ETIMEDOUT" || err.code == "ECONNRESET") {
                        console.log("Retrying..")
                        setTimeout(sync.save, 5000 + Math.random() * 10000, _id, _rev, doc);
                    }
                    else if (typeof callback == "function")
                        callback()
                }
            });
        }
    });
};

sync.fillIn = function fillIn(row, data) {
    var _id = "product-" + ((row.url || data.page || "").trim().replace(/[\W]+/g, '-').trim('-') || data.name.replace(/[\W]+/g, '-'))
        .toLowerCase().trim('-');

    if (_id == "product-")
        console.log(data, row);

    row = row || {};

    if (row.category == "offer")
        data.category = data.category;

    if (row.subcategory == "offer")
        data.subcategory = data.subcategory;

    if (row.subcategory && row.subcategory.toLowerCase() == "image")
        data.subcategory = undefined;

    if (row.categories && row.categories.length)
        data.category = row.categories.first(c => c && !c.startsWith("offer"));

    data.options = (row.options || []).concat(data.options).filter(o => !!o)
        .orderByDescending(o => o && o.name)
        .distinctBy(o => parseFloat("0" + o && o.price));

    var _data = Object.assign(row, data);
    sync.save(_id, row._rev, _data);
    sync.fillDescription(_id, _data);
};

sync.fillDescription = function fillDescription(_id, _data) {
    var name = _data.name.replace(/[\W]+/g, ' ').replace(/\ss\s/, "s ");
    var cat = _data.category && !_data.category.startsWith("offer") ? _data.category : "";
    if (!cat.startsWith("offer") && !name.toLowerCase().contains(cat.toLowerCase()))
        name += ` ${cat}`;

    var hasDescription = false;//!!_data.description;
    if (!hasDescription) {
        sync.googleSearch(name.trimRight('s') + ' is a', function (data, err) {
            if (err) {
                console.log(err);
                return;
            }

            var items;
            var exempts = ["£", "$", "click", "login", "dialadrink", "price", "buy", "pay", "deliver", "cart", "website", "site", "sale", "page", "under the age", "i have", "jumia", "shopping", "likes", "comment", "1, 2, 3"]
            if (data && data.webPages && data.webPages.value[0]) {
                items = data.webPages.value.filter(function (i) {
                    return !!i.snippet && i.snippet.toLowerCase().contains(_data.name.toLowerCase());
                });
                _data.description = items[0].snippet.replace(regexPostDate, "").trim();
                _data.altDescriptions = items.slice(1).map(function (v) {
                    return v.snippet.replace(regexPostDate, "").trim();
                });
            }

            if (data && data.posts) {
                items = data.posts.filter(function (i) {
                    return !!i.title;
                });
                if (items[0]) {
                    var descriptions = []
                    _data.description = items[0].text.replace(regexPostDate, "").trim();
                    _data.altDescriptions = items.slice(1).map(function (v) {
                        return v.text.replace(regexPostDate, "").trim();
                    });
                }
            }

            if (data && (data.items || data.data)) {
                items = (data.items || data.data).filter(function (i) {
                    return !!i.htmlSnippet;
                }).filter(d => !d.snippet.split(/\W/).contains(w => w && exempts.contains(w.toLowerCase())));

                if (items.length) {
                    _data.description = items.first().htmlSnippet.replace(regexPostDate, "").trim();
                    _data.altDescriptions = items.slice(1).map(function (v) {
                        return v.htmlSnippet.replace(regexPostDate, "").trim();
                    });
                } else {
                    console.log("No matching search result..");
                }

                _data.altImages = (data.items || data.data)
                    .map(i => i.pagemap && i.pagemap.cse_thumbnail && i.pagemap.cse_thumbnail.flatten(t => t.src))
                    .filter(s => !!s)
                    .map(s => s[0])
                    .filter(d => !d.split(/\W/).contains(w => w && exempts.contains(w.toLowerCase())))
            }

            sync.save(_id, _data._rev, _data);
        });
    }
};

sync.webhoseSearch = function webhoseSearch(content, callback) {
    var searchId = content.toLowerCase().replace(/[\W]+/g, '-').trim('-');

    function apiCall() {
        var api_key = "efaa6a62-81ae-45bf-8474-4decc27b4a9c";
        var url = `http://webhose.io/filterWebContent?token=${api_key}&format=json&sort=crawled&q="${content.replace(/[\W]+/g, ' ')}" language:english`;
        var timeout = (++msnCalls) * 2500;
        setTimeout(function () {
            najax.get({
                url: url,
                dataType: 'json',
                success: function (data) {
                    if (data && data.posts && data.posts.length) {
                        repo.save({
                            _id: searchId,
                            items: data.posts
                        })
                    }

                    if (typeof callback == "function")
                        callback(data)
                },
                error: function (xhr, status, err) {
                    console.log("Error while calling webhose search..", xhr.responseText);
                    if (err)
                        if (typeof callback == "function")
                            callback()
                }
            })
        }, timeout);
    }

    repo.find({_id: searchId}).then(function (records) {
        if (records && records.length) {
            if (typeof callback == "function")
                callback(records[0])
        } else {
            apiCall();
        }
    }).catch(function (err, msg) {
        console.log(msg, err)
        apiCall()
    });
};

sync.msnSearch = function msnSearch(content, callback) {
    var searchId = content.toLowerCase().replace(/[\W]+/g, '-').trim('-');

    function apiCal() {
        var api_key = 'b476321667004c34bd30e061802a0ed1';
        var url = `https://api.cognitive.microsoft.com/bing/v7.0/search?q=${encodeURIComponent(content)}`;

        var timeout = (++msnCalls) * 1000;
        setTimeout(function () {
            najax.get({
                url: url,
                dataType: 'json',
                headers: {"Ocp-Apim-Subscription-Key": api_key},
                success: function (data) {
                    if (data) {
                        repo.save({_id: searchId, items: data.webPages})
                    }
                    if (typeof callback == "function")
                        callback(data)
                },
                error: function (xhr) {
                    console.log("Error while calling MSN search..", xhr.responseText);
                    if (typeof callback == "function")
                        callback()
                }
            })
        }, timeout);

    }

    repo.find({_id: searchId}).then(function (records) {
        if (records && records.length) {
            if (typeof callback == "function")
                callback(records[0])
        } else {
            apiCal();
        }
    }).catch(function (err, msg) {
        console.log(msg, err)
        apiCal()
    });

};

sync.googleSearch = function googleSearch(content, callback) {
    var searchId = content.toLowerCase().replace(/[\W]+/g, '-').trim('-');

    function apiCal() {
        var api_key = Object.keys(googleKeyUsage.usage).orderBy(k => googleKeyUsage.usage[k]).first();
        var url = `https://www.googleapis.com/customsearch/v1?key=${api_key}&cx=002193200989192095014:iz7f4t9msrk&q=${content}`;

        if (googleKeyUsage.usage[api_key] >= googleKeyUsage.dailyLimit) {
            callback(null, `Daily limit for '${api_key}' has been reached!`);
            return;
        }

        function updateKeyUsage() {
            googleKeyUsage.usage[api_key] += 1;
            if (googleKeyUsageTimeout)
                clearTimeout(googleKeyUsageTimeout)
            googleKeyUsageTimeout = setTimeout(keyRepo.save, 3000, googleKeyUsage)
        }

        updateKeyUsage();
        najax.get({
            url: url,
            dataType: 'json',
            success: function (data) {
                if (data) {
                    try {
                        repo.save({
                            _id: searchId,
                            data: JSON.parse(JSON.stringify(data.items))
                        })
                    } catch (e) {
                        console.log("Error while saving to mongo.", e)
                    }
                }
                if (typeof callback == "function")
                    callback(data)
            },
            error: function (xhr, status, err) {
                var msg = xhr.responseText || err.message;
                console.log("Error while calling Google search..\n", msg);
                if (err.code == "ECONNRESET")
                    setTimeout(apiCal, 5000 + Math.random() * 10000)
                else if (typeof callback == "function")
                    callback(null, err)
            }
        })
    }

    repo.findOne({_id: searchId}).then(function (record) {
        if (record && record.modifiedAt > new Date().addDays(-5).toISOString()) {
            if (typeof callback == "function")
                callback(record)
        } else {
            apiCal();
        }
    }).catch(function (err, msg) {
        console.log(msg, err)
        apiCal()
    });
};

sync.pruneMissing = function (drinks) {
    //http://159.65.50.86:4985/dialadrink/_all_docs
    najax.get({
        url: `http://${host}:4985/${database}/_all_docs`,
        contentType: "application/json",
        dataType: 'json',
        headers: {
            "Accept-Encoding": "gzip, deflate",
            "Accept-Language": "en-US,en;q=0.9,sw-KE;q=0.8,sw;q=0.7",
            "Cookie": `ui-auth-${host}%3A8091=597e0c9fa882da2d75ba956568bd559f`,
            "DNT": "1",
            "Host": `${host}:4985`,
            "Origin": "http://${host}:4985",
            "Proxy-Connection": "keep-alive",
            "Referer": `http://${host}:4985/_admin/db/${database}/documents`,
            "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36"
        },
        success: function (data) {
            data.rows.forEach(row => {
                var found = drinks.find(d => d._id == row.id);
                if (!found)
                    sync.save(row.id, row.value.rev, {_id: row.id, _deleted: true}, r => r.type == "Product")
            });
        },
        error: function (xhr, status, err) {
            var msg = xhr.responseText || err.message;
            console.log("Error while reading all to sync gateway..", msg);
            if (err.code == "ETIMEDOUT" || err.code == "ECONNRESET") {
                console.log("Retrying..")
                setTimeout(sync.deleteMissing, 5000 + Math.random() * 10000, drinks);
            }
            else if (typeof callback == "function")
                callback()
        }
    });
}

module.exports = sync;

/**
 * Created by nmasuki on 9/18/2017.
 */
require('./../common/polyfills');
const fs = require('fs');
const csv = require('csv');
const gravatar = require('gravatar');
const json2csv = require('json2csv');

const HTTPClient = require('./../common/HTTPClient');

function Contacts(_csvFile) {
    var self = this, csvFile;
    self.contacts = [];

    if (fs.existsSync(_csvFile)) csvFile = _csvFile;

    self.init = function () {
        var keys = null;
        var parser = csv.parse({relax_column_count: true});

        parser.on('readable', function () {
            var data, contacts = []
            while (data = parser.read()) {
                if (!keys)
                    keys = data.map(function (d, i) {
                        return d.toString().replace(/[^\w\s]/gi, '')
                    });
                else {
                    var record = {Numbers: []};
                    var names = [];
                    for (var i in data) if (data.hasOwnProperty(i)) {
                        var key = (keys[i] || i).toString().toLowerCase();
                        var value = (data[i] || "").toString().trim();
                        if (value) {
                            if (key.any("phone"))// || key.any("number")
                                record.Numbers.push({Number: value.replace(/[^\w\d\+]/gi, ''), Type: key});
                            if (key.any("name") || key.any("suffix"))
                                names.push(value);
                            record[key] = value;
                        }
                    }
                    record.Names = names.join(" ").trim() || record.Numbers.map(n => n.Number).join();
                    if (!record.Names) {
                        delete record.Names;
                        delete record.Numbers;
                    }

                    self.contacts.push(record);
                }
            }

            console.log("Processing.. ", csvFile);
        });

        csvFile = csvFile || ((process.env.HOME || process.env.USERPROFILE) + "\\Contacts\\googlecontacts.csv");

        console.log("Loading..", csvFile);
        fs.readFile(csvFile, 'utf8', function (err, data) {
            if (err)
                return console.log(err);

            try {
                if (data)
                    parser.write(data.trim());
            } catch (e) {
                console.warn(e)
            }
        });
    };

    self.find = function (search, callback) {
        function find(c) {
            function trueMarkNumber(c) {
                var nsearch = (search.split(":")[1] || "").trim();
                if (nsearch) {
                    c.Selected = c.Numbers.filter(function (n, i) {
                        if (/^(\d+)$/.test(nsearch)) {
                            if (nsearch < c.Numbers.length)
                                return (i + 1) == nsearch;
                            else if (nsearch.length >= 3)
                                return n.Number.toString().any(nsearch);
                        } else
                            return n.Type.toString().any(nsearch);
                    })
                }
                return true
            }

            if (c && search) for (var i in c) {
                if (!c[i])
                    continue;

                if (typeof search === "function") {
                    if (search(c[i]))
                        return trueMarkNumber(c)
                    else
                        continue;
                }
                else if (Array.isArray(c[i])) {
                    if (c[i].any(find))
                        return trueMarkNumber(c)
                    else
                        continue;
                }
                else if (typeof c[i] === 'object') {
                    if (find(c[i]))
                        return trueMarkNumber(c)
                    else
                        continue;
                }
                else if (search) {
                    var a = search.toString().split(":")[0].replace(/[^\d\w]/, "").toLowerCase();
                    var b = c[i].toString().replace(/[^\d\w]/, "").toLowerCase();
                    var match = a && b && b.indexOf(a) >= 0; // a === b
                    if (match)
                        return trueMarkNumber(c);
                }
            }

            return false;
        }

        var matches = self.contacts.filter(find).sort((a, b) => a.Names.localeCompare(b.Names));
        if (matches && matches.length) {
            if (typeof callback == "function")
                self.selectContact.call(this, matches, callback);
        } else {
            console.log("No match found!!");
        }
        return matches;
    }

    self.selectNumber = function selectNumber(contact, callback, j) {
        if (Array.isArray(contact)) {
            contact.forEach(c => self.selectNumber(c, callback, j))
            return;
        }
        var selected = contact.Selected && contact.Selected.length ? contact.Selected : contact.Numbers

        if (selected.length == 0) {
            console.warn("User does not have any number assigned..");
        }
        else if (selected.length == 1) {
            callback(selected[0].Number, contact);
            return;
        }
        else if (contact.Numbers.length == 1) {
            callback(contact.Numbers[0].Number, contact);
            return;
        }
        else if (contact.Numbers[j]) {
            callback(contact.Numbers[j].Number, contact);
            return;
        }

        var options = "\nSelect one:\r\n\t" +
            selected.map(function (n, i) {
                return (i + 1) + ". " + n.Number + ", " + n.Type;
            }).join("\r\n\t") +
            "\r\n\t{0}. Select all".format(selected.length) +
            "\r\n\t0. Exit";

        var qn = ("Found " + contact.Numbers.length + " phone number associated with the contact.." + options);
        console.ask(qn, function readLine(line) {
            var i = parseFloat(line.toString().trim()) - 1;
            var exit = ["exit", "bye", "0"];

            if (line && (exit.any(line) || i <= -1)) {
                if (rl)
                    rl.close();
            }
            else if (selected[i]) {
                callback(selected[i].Number, contact);
            } else if (contact.Numbers[i]) {
                callback(contact.Numbers[i].Number, contact);
            } else if (line) {
                console.ask("Invalid selection: [" + line.toString().trim() + "]" + options, readLine);
            }
        });
    };

    self.selectContact = function selectContact(contacts, callback, i, j) {
        if (contacts.length == 1) {
            self.selectNumber(contacts.first(), callback, j);
            return;
        }
        else if (contacts[i]) {
            self.selectNumber(contacts[i], callback, j);
            return;
        }

        var options = "\r\n\t" + contacts.map(function (c, i) {
                return (i + 1) + ". " + c.Names;
            }).join("\r\n\t") +
            "\r\n\t{0}. Select all".format(contacts.length + 1) +
            "\r\n\t0. Exit";

        function validateInput(line) {
            line = line || "";
            if (line.toString().trim() && !isNaN(line)) {
                var n = parseInt(line.toString().trim());
                return 0 <= n && n <= contacts.length;
            }
            return false;
        }

        var qn = "\r\nPlease select one of the following:" + options;
        console.ask("Found " + contacts.length + " matches.." + qn, function readLine(line) {
            i = parseFloat(line.toString().trim()) - 1;
            var exit = ["exit", "bye", "0"]
            if (line && (exit.any(line) || i <= -1)) {
                if (rl) rl.close();
            }
            else if (i == contacts.length)
                self.selectNumber(contacts, callback);
            else if (contacts[i])
                self.selectNumber(contacts[i], callback);
            else if (line) {
                console.ask("Invalid selection: [" + line.toString().trim() + "]" + qn, readLine, validateInput);
            }
        }, validateInput)
    };

    self.isReady = function () {
        return !!self.contacts.length;
    }

    self.search = function (search, callback) {
        return self.find.retryApply(this, self.isReady, 20, 1000, arguments);
    }

    self.init();
}

function GoogleContacts() {
    var self = this;
    var csvFile = ((process.env.HOME || process.env.USERPROFILE) + "\\Contacts\\googlecontacts.csv");

    Contacts.call(this, csvFile);
    HTTPClient.call(this, authorize);

    var CLIENT_ID = '232638861668-p13kdq7nkft35kppn3kt238ubntfe5f5.apps.googleusercontent.com';
    var CLIENT_SECRET = 'GW5xih3VlMBGr7YDR1Vb3UA_';
    var SCOPE = 'https://www.google.com/m8/feeds'; // https://www.googleapis.com/auth/plus.me https://www.googleapis.com/auth/userinfo.Email
    var DEVICE_GRANT_TYPE = "http://oauth.net/grant_type/device/1.0"

    function authorize() {
        var waitingPrompt = "Waiting ..", waitCount = 0, prompt = console.prompt || "";
        if (waitingPrompt && waitingPrompt.length < prompt.length)
            waitingPrompt = waitingPrompt + " ".repeat(1 + prompt.length - waitingPrompt.length);

        function pingForAccessToken() {
            process.stdout.write('\r' + waitingPrompt + (++waitCount % 2 == 0 ? '\\' : '/'));
            return self.makeRequest(
                "https://www.googleapis.com/oauth2/v4/token",
                {
                    code: self.Config.device_code,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: DEVICE_GRANT_TYPE
                }, "POST"
            ).then(function (token) {
                if (token) {
                    self.Config.Used = true;
                    self.Config.AccessToken = token;
                    self.saveToken(self.Config);

                    console.log("Access granted!");
                } else {
                    setTimeout(pingForAccessToken, 5000);
                }
            }).catch(function (error) {
                setTimeout(pingForAccessToken, 5000);
            });
        };

        console.log("Initializing GoogleContacts!!")
        if (self.isValidAuthToken()) {
            console.log("GoogleContacts>Using saved device authorization code:", self.Config.user_code)
            console.log(`GoogleContacts>Go to '${self.Config.verification_url}' and enter the code: '${self.Config.user_code}'`);
            self.saveToken(self.Config);
            pingForAccessToken();
        } else {
            console.log("GoogleContacts>Requesting device authorization code.");
            self.makeRequest(
                `https://accounts.google.com/o/oauth2/device/code`,
                {scope: SCOPE, client_id: CLIENT_ID}, "POST"
            ).then(function (data) {
                self.Config = self.saveToken(data);

                console.debug("Device authorization code: ", self.Config);
                console.log("We need access to your Contacts..");
                console.log(`Go to '${self.Config.verification_url}' and enter the code: '${self.Config.user_code}'`)

                setTimeout(pingForAccessToken, 5000);
            }).catch(function () {
                console.debug("GoogleContacts>Error while requesting access Token.")
                console.debug.apply(this, arguments);
            });
        }
    }

    function getContactsFromGoogleApi() {
        return self.makeRequest(
            'https://www.google.com/m8/feeds/Contacts/default/full',
            {
                'alt': 'json',
                'max-results': 1000,
                'orderby': 'lastmodified'
            }, 'GET', {
                'Authorization': `${self.Config.AccessToken.token_type} ${self.Config.AccessToken.access_token}`,
                'GData-Version': '3.0'
            }
        )
    }

    function _import(file) {
        console.log('Getting a list of all your Contacts');
        file = file || csvFile;
        return getContactsFromGoogleApi()
            .then(function (feed) {

                if (feed)
                    fs.writeFile(file.replace(".csv", ".json"), JSON.ostringify(feed));

                var fields = []
                var users = feed.feed.entry.map(function (c) {
                    var r = {};

                    function getGdData(d, m) {
                        m = m || {};
                        var gdKeys = Object.keys(d).filter(k => k.startsWith('g') && k.contains('$'));

                        gdKeys.forEach(k => m = Object.assign(m, getGdData(d[k], m)));

                        function getFieldFromKey(key) {
                            var i = key.indexOf('$');
                            var _k = key.substr(i).camelCaseToSentence().toProperCase();
                            return _k;
                        }

                        function getGdValue(d, k, _m) {
                            if (d['$t']) {
                                return d['$t'];
                            } else if (Array.isArray(d)) {
                                var a = [];
                                d.forEach(di => a.push(getGdValue(di)));
                                return a.join();
                            } else {
                                _m = _m || {}
                                Object.keys(d).forEach(key => _m[k + ' ' + getFieldFromKey(key)] = getGdValue(d[key], key, _m));
                            }
                        }

                        var oKeys = Object.keys(d).filter(k => !(k.startsWith('g') && k.contains('$')));
                        oKeys.forEach(k => m[getFieldFromKey(k)] = getGdValue(d[k], k, m));

                        return m;
                    }

                    var model = getGdData(c);

                    if (c['gd$name'] && c['gd$name']['gd$fullName']) {
                        r.Name = c['gd$name']['gd$fullName']['$t'];
                    }
                    if (c['gd$PhoneNumber'] && c['gd$PhoneNumber'].length > 0) {
                        for (var i = 0; i < c['gd$PhoneNumber'].length; i++)
                            r['PhoneNumber' + (i ? i : '')] = (c['gd$PhoneNumber'][i]['$t'] || "").replace(/[\D]*/g, "");
                    }
                    if (c['gd$Email'] && c['gd$Email'].length > 0) {
                        r.Email = c['gd$Email'][0]['address'];
                        r.Nickname = c['gd$Email'][0]['address'].split('@')[0];
                    }
                    if (c['gContact$nickname']) {
                        r.Nickname = c['gContact$nickname']['$t'];
                    }
                    if (c['link']) {
                        var photoLink = c['link'].filter(function (link) {
                            return link.rel == 'http://schemas.google.com/Contacts/2008/rel#photo' &&
                                'gd$etag' in link;
                        })[0];
                        if (photoLink) {
                            r.Picture = '/users/photo?l=' + encodeURIComponent(photoLink.href);
                        } else if (r.Email) {
                            r.Picture = gravatar.url(r.Email, {
                                s: 40,
                                d: "https://ssl.gstatic.com/s2/profiles/images/silhouette80.png"
                            });
                        }
                    }

                    return r;
                })
                    .filter(function (u) {
                        return !!u.PhoneNumber;
                        //return !!u.Email &&                  //we can only give access to persons with Email at this point
                        //    !~u.Email.indexOf('@reply.');  //adress with @reply. are usually temporary reply address for forum kind of websites.
                    });

                var fields = Object.keys(users.first());

                try {

                    var result = json2csv({data: users, fields: fields});
                    if (result)
                        fs.writeFile(file, result);
                } catch (err) {
                    // Errors are thrown for bad options, or if the data is empty and no fields are provided.
                    // Be sure to provide fields if it is possible that your data array will be empty.
                    console.error(err);
                }
                console.log(`${users.length} contacts imported!`);
            })
    }

    self.import = function (file) {
        if (self.isValidAccessToken()) authorize();
        return _import.retryApply(this, self.isReady, 100, 1000, [file]);
    }

    self.isReady = function () {
        return !!self.contacts.length && self.isValidAccessToken();
    }

    self.authorize = authorize;
}

module.exports = {Contacts: Contacts, GoogleContacts: GoogleContacts};

/**
 * Created by nmasuki on 9/15/2017.
 */
const najax = require('najax');
const Contacts = require('./Phonebook').Contacts;
const WebSocket = require('ws');
const msgHandler = require('./../helpers/pushbullet_msghandler');

function PushBullet() {
    var access_token = process.env.PUSHBULLET_AUTH;
    var contacts = new Contacts();
    var rl = global.rl;
    if (rl)
        rl.on('close', function () {
            if (bullet.ws)
                bullet.ws.close();
            process.exit();
        });

    var bullet = Object.assign(this, {
        access_token: access_token,
        profile: null,

        getProfile: function getSMSProfile(callback, token) {
            if (token)
                bullet.setToken(token);

            najax.get({
                url: 'https://api.pushbullet.com/v2/users/me',
                headers: {'Access-Token': bullet.access_token},
                dataType: 'json',
                success: function (data) {
                    console.debug("Loaded profile: " + data.name)
                    bullet.profile = data;
                    bullet.getDevices(function (devices) {
                        if (typeof callback == "function")
                            callback.call(this, data);
                    }, token);
                },
                error: function () {
                    console.log("Error while trying to load profile..", bullet.access_token)
                    console.log.apply(this, arguments);
                }
            })
        },
        getDevices: function getDevices(callback, token) {
            token = token || bullet.access_token
            najax.get({
                url: 'https://api.pushbullet.com/v2/devices',
                headers: {'Access-Token': token},
                dataType: 'json',
                success: function (data) {
                    console.log("Loaded devices: " + data.devices.map(function (d) {
                        return d.Nickname || d.model;
                    }).join(','));

                    if (bullet.profile && token == bullet.access_token)
                        bullet.profile.devices = data.devices.filter(function (d) {
                            return d.active;
                        });

                    if (typeof callback == "function")
                        callback.call(this, data.devices);

                },
                error: function () {
                    console.log("Error while trying to load device..")
                    console.log.apply(this, arguments);
                }
            })
        },
        getWs: function () {
            if (bullet.ws)
                return bullet.ws;
            else if (bullet.access_token) {
                var ws = bullet.ws = new WebSocket(`wss://stream.pushbullet.com/websocket/${bullet.access_token}`);
                ws.numbers = ws.numbers || [];

                ws.on('open', function open() {
                    console.debug("WS opened successfully. Listening..");
                });
                ws.on('message', function incoming(data) {
                    if (typeof data == "string")
                        data = JSON.parse(data);

                    var handler = msgHandler[data.type];
                    if (typeof handler == "function")
                        handler.call(handler, data);
                    else
                        console.debug(`Msg type '${data.type}' not hundled in 'pushbullet_msghandler.js'`);

                });
                ws.on('error', function (error) {
                    console.debug(this, arguments);
                });
                ws.on('close', function (user) {
                    console.debug(this, arguments);
                });
            }

            return bullet.ws;
        },

        setToken: function (token) {
            bullet.profile = null;
            bullet.access_token = token;
        },

        smsListen: function (number, contact, callback) {
            var args = Array.from(arguments),
                number = args.first(a => typeof a == "string"),
                msg = args.nth(a => typeof a == "string", 2),
                contact = args.first(a => typeof a == "object") || {Names: ""},
                callback = args.first(a => typeof a == "function") || bullet.sms;

            function getPrompt() {
                var prompt = `sms`;
                if (number) prompt += "@" + number.replace(/[\D]*/g, "");
                if (contact.Names) prompt += ` (${contact.Names})`;
                prompt += ">";
                return prompt;
            }

            console.prompt = getPrompt();

            var ws = bullet.getWs();
            if (ws) {
                ws.numbers = ws.numbers || [];
                if (number && !ws.numbers.contains(number))
                    ws.numbers.push(number);
            }

            (function listenSTDIN() {
                console.ask(getPrompt(), function action(answer) {
                    var msg;
                    if (answer && ["bye", "exit"].contains(answer.toString().trim())) {
                        //rl.close();
                    }
                    else if (answer && [".", "@"].contains(answer.toString().trim()[0])) {
                        number = answer.toString().trim().trim(".");
                        bullet.sms(number);
                    }
                    else {
                        if (!number) {
                            console.debug("Searching Contacts for: " + answer);
                            number = answer;
                        } else {
                            msg = answer;
                        }
                        callback(number, msg, contact, listenSTDIN);
                    }
                });
            })();
        },
        sms: function sendSMS(number, msg, callback) {
            var args = Array.from(arguments).filter(a => a != bullet.access_token),
                number = args.first(a => typeof a == "string"),
                msg = args.nth(a => typeof a == "string", 2),
                callback = args.first(a => typeof a == "function");

            if (!bullet.profile)
                bullet.getProfile(() => sendSMS(number, msg, callback));
            else {

                function send(n, m, contact, cb) {
                    cb = cb || callback;
                    contact = contact || {Names: ""};

                    bullet.smsListen(n, contact, send);
                    if (!m) {
                        console.debug("Selected contact: " + contact.Names + ": " + n);
                        return;
                    }

                    najax.post({
                        url: 'https://api.pushbullet.com/v2/ephemerals',
                        headers: {'Access-Token': bullet.access_token},
                        contentType: "application/json",
                        data: {
                            "push": {
                                "conversation_iden": n,
                                "message": m,
                                "source_user_iden": bullet.profile.iden,
                                "target_device_iden": bullet.profile.devices[0].iden,
                                "type": "messaging_extension_reply",
                                "package_name": "com.pushbullet.android",
                            },
                            "type": "push"
                        },
                        success: function (data) {
                            if (m)
                                console.olog(`\r\n${contact.Names} -> ${m}`);

                            if (typeof cb == "function")
                                cb.call(this, data);
                        },
                        error: function () {
                            console.log("Error while trying to send sms..");
                            console.debug.apply(this, arguments);
                        }
                    });
                }

                function selectNumber(contact, j) {
                    var selected = contact.Selected && contact.Selected.length ? contact.Selected : contact.Numbers

                    if (selected.length == 0) {
                        console.warn("User does not have any number assigned..");
                    }
                    else if (selected.length == 1) {
                        send(selected[0].Number, msg, contact);
                        return;
                    }
                    else if (contact.Numbers.length == 1) {
                        send(contact.Numbers[0].Number, msg, contact);
                        return;
                    }
                    else if (contact.Numbers[j]) {
                        send(contact.Numbers[j].Number, msg, contact);
                        return;
                    }

                    var options = "\nSelect one:\r\n\t" +
                        selected.map(function (n, i) {
                            return (i + 1) + ". " + n.Number + ", " + n.Type;
                        }).join("\r\n\t") + "\r\n\t0. Exit";

                    console.log("Found " + contact.Numbers.length + " phone number associated with the contact..", options)

                    console.ask("sms>", function readLine(line) {
                        var i = parseFloat(line.toString().trim()) - 1;
                        var exit = ["exit", "bye", "0"];

                        if (line && (exit.any(line) || i <= -1)) {
                            if (rl) rl.close();
                        }
                        else if (selected[i]) {
                            send(selected[i].Number, msg, contact);
                        } else if (contact.Numbers[i]) {
                            send(contact.Numbers[i].Number, msg, contact);
                        } else if (line) {
                            console.log("Invalid selection: [" + line.toString().trim() + "]", options);
                            if (rl) rl.question("sms>", readLine);
                        }
                    }, function (line) {
                        var i = parseFloat(line.toString().trim()) - 1;
                        var exit = ["exit", "bye", "0"];

                        if (line && (exit.any(line) || i <= -1))
                            return true;

                        else if (selected[i]) {
                            return true;
                        } else if (contact.Numbers[i]) {
                            return true;
                        } else if (line) {
                            return false;
                        }
                    });
                }

                function selectContact(i, j) {
                    if (found[i]) {
                        selectNumber(found[i], j);
                        return;
                    }

                    var options = "\nSelect one:\r\n\t" +
                        found.map(function (c, i) {
                            return (i + 1) + ". " + c.Names;
                        }).join("\r\n\t");

                    console.log("Found ", found.length, " matching Contacts..", options, "\r\n\t0. Exit")
                    console.ask("sms>", function readLine(line) {
                        i = parseFloat(line.toString().trim()) - 1;
                        var exit = ["exit", "bye", "0"]
                        if (line && (exit.any(line) || i <= -1)) {
                            if (rl) rl.close()
                        } else if (found[i])
                            selectNumber(found[i]);
                        else if (line) {
                            console.log("Invalid selection: [" + line.toString().trim() + "]", options);
                            console.ask("sms>", readLine);
                        }
                    });
                }

                var found = contacts.find(number)
                    .sort((a, b) => a.Names.localeCompare(b.Names));

                if (found && found.length) {
                    if (found.length == 1) {
                        if (found[0].Numbers.length == 1)
                            send(found[0].Numbers[0].Number, msg, found[0]);
                        else
                            selectNumber(found[0]);
                    }
                    else
                        selectContact();
                }
                else if (number && /^([\d]+)$/.test(number))
                    send(number, msg);
                else {
                    bullet.smsListen();
                    if (number)
                        console.log("No match found!!");
                }
            }
        },
        push: function push(option, callback) {
            var args = Array.from(arguments),
                option = args.first(a => typeof a == "object") || {},
                callback = args.first(a => typeof a == "function");

            if (typeof callback !== "function") {
                callback = args.filter(function (a) {
                    return typeof a == "function";
                }).shift();
            }

            if (option) {
                var strings = args.filter(a => typeof a == "string");

                if (typeof option == "string") {
                    option = {
                        title: strings.shift(),
                        body: strings.shift()
                    };
                }

                if (strings.length) {
                    var params = ['title', 'body'];
                    params.forEach(function (p) {
                        option[p] = option[p] || strings.shift();
                    });
                }

                najax.post({
                    url: 'https://api.pushbullet.com/v2/pushes',
                    headers: {'Access-Token': option.token || bullet.access_token},
                    contentType: "application/json",
                    data: Object.assign({
                        type: 'note',
                        title: 'Testing',
                        body: 'Test body'
                    }, option),
                    success: function (data) {
                        console.debug("Done: ", data)
                        if (typeof callback == "function")
                            callback.call(this, data);
                    },
                    error: function () {
                        console.debug.apply(this, arguments);
                    }
                });
            } else
                push("Testing", "Just a test..", callback, {Email: bullet.profile.email_normalized});
        }
    });

    return bullet;
}

module.exports.PushBullet = PushBullet;
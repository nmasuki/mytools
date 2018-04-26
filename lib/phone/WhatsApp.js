/**
 * Created by nmasuki on 2/14/2018.
 */
'use strict';

var Botsapp = require('botsapp');
var process = require('process');
const Contacts = require('./Phonebook').Contacts;

function WhatsApp() {
    var self = this, yourBot;
    var contacts = new Contacts();

    self.init = function init(msisdn, username, password, ccode) {
        yourBot = new Botsapp.Bot({
            adapter: {
                msisdn: msisdn, // phone number with country code
                username: username, // your name on WhatsApp
                password: password, // WhatsApp password
                ccode: ccode // country code
            }
        });


        // Connect to the server
        yourBot.connect(function() {
            console.log("I'm alive!");
        });

        //Error
        yourBot.on('error', function gracefulShutdown() {
            yourBot.destroy();
            process.exit(1);
        });
    }

    self.listen = function () {
        // Register a handler which logs every message
        var anyMessage = self.anyMessage || (self.anyMessage = new Botsapp.Trigger().always());
        yourBot.registerTrigger(anyMessage, function onTrigger(event) {
            console.log(event);
        });
    };

    self.send = function (to, msg) {
        contacts.find(to, (msisdn, obj) => {
            if (msisdn) {
                console.log("Sending to", msisdn);
                yourBot.sendMessage(msisdn, msg, function onSend() {
                    console.log('WhatsApp Sent to', msisdn);
                });
            }
        })
    };

    self.monitor = function (from, msg, reply) {
        // Get hello from a specific user
        contacts.find(from, (msisdn, obj) => {
            if (msisdn) {
                var msgTrigger = new Botsapp.Trigger();

                if (from) {
                    var author = `${msisdn}@s.whatsapp.net`;
                    msgTrigger = msgTrigger.from(author);
                }

                if (msg)
                    msgTrigger = msgTrigger.withText(msg);
                else
                    msgTrigger = msgTrigger.always();

                yourBot.registerTrigger(msgTrigger, function onTrigger(event) {
                    console.log(msg + " from", event.from, event.body);
                    if (reply)
                        self.send(event.from, reply)
                });
            }
        });
    };

    self.thumbsUp = self.monitorThumbsUp = function () {
        // Get a thumbsup, give a thumbsup
        var thumbsupEmoji = new Buffer([240, 159, 145, 141]);
        var thumbsUp = new Botsapp.Trigger().withEmoji(thumbsupEmoji);

        yourBot.registerTrigger(thumbsUp, function onTrigger(event) {
            var emoji = thumbsupEmoji.toString('utf8');
            yourBot.sendMessage(event.from, emoji, function onSend() {
                console.log('Sent emoji to', event.from);
            });
        });
    };

    self.init('254720805835', 'Nel', '555-749', '254');
}

module.exports = WhatsApp;
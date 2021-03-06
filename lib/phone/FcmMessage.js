/**
 * Created by nmasuki on 9/18/2017.
 */

var FCM = require('fcm-node');

class FcmMessage {
    constructor() {
        var fcm = new FCM(process.env.FCM_KEY);
        Object.assign(this, fcm);
    }

    sendMessage(token, title, msg, data, callback) {
        var message = {
            to: token,
            collapse_key: title,

            notification: {
                title: title || 'Title of your push notification',
                body: msg
            },

            data: data || {}
        };

        console.log("Sending FCM message!", token, title, msg, data, callback);
        this.send(message, function (err, response) {
            if (err) {
                console.error("FCM Something has gone wrong!", err);
            } else {
                console.log("FCM Successfully sent with response: ", response);
                if (typeof callback == "function")
                    callback(JSON.parse(response));
            }
        });
    }
}

FcmMessage.getInstance = function(){
    return FcmMessage._instance  || (FcmMessage._instance = new FcmMessage())
}

module.exports = FcmMessage;

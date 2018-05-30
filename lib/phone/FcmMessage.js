/**
 * Created by nmasuki on 9/18/2017.
 */

var FCM = require('fcm-node');
class FcmMessage{
    constructor(){
        var fcm = new FCM(process.argv.FCM_KEY || "AIzaSyAEyUUyO5Wu7rmg8UMxrXtIFNOq1GOXS4c");
        Object.assign(this, fcm);
    }

    sendMessage(token, title, msg, data){
        var message = {
            to: token,
            collapse_key: title,

            notification: {
                title: title || 'Title of your push notification',
                body: msg
            },

            data: data || {}
        };

        this.send(message, function(err, response){
            if (err) {
                console.error("FCM Something has gone wrong!", err);
            } else {
                console.log("FCM Successfully sent with response: ", response);
            }
        });
    }
}

Object.assign(FcmMessage.prototype, FCM.prototype);
module.exports = new FcmMessage;

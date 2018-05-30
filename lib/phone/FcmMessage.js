/**
 * Created by nmasuki on 9/18/2017.
 */

var FCM = require('fcm-node');
class FcmMessage{
    constructor(){
        var fcm = new FCM(process.argv.FCM_KEY || "AIzaSyBsTVLJZaZ_YCuQmaJDeF0vb5MotzrMcgw");
        Object.assign(this, FCM)
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
                console.log("Something has gone wrong!");
            } else {
                console.log("Successfully sent with response: ", response);
            }
        });
    }
}

module.exports = new FcmMessage;

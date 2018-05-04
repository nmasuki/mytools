/**
 * Created by nmasuki on 2/6/2018.
 */
var handler = {
    nop: function (data) {

    },
    push: function (data) {
        data = data || {}
        var push = data.push || {};

        function ignore() {        };
        function showSMS() {
            var msg = (push.notifications || []).map(n => ` (${n.title}) <- ${n.body}`).join("\r\n");
            if (msg)
                console.log(msg);
            //console.log(data);
        }

        var pushhandler = {dismissal: ignore, messaging_extension_reply: ignore, sms_changed: showSMS};
        var h = pushhandler[push.type];
        if (h) h.apply();
        else console.log("handler for push." + push.type + " not done!! DATA:", data);
    }
};

module.exports = handler;

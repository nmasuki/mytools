/**
 * Mpesa callbacks
 */

const MongoRepo = require('../../../lib/common/MongoRepo'),
    FCM = require("../../../lib/phone/FcmMessage"),
    express = require('express'),
    router = express.Router(),
    ejs = require('ejs'),
    config = require('./config');

var fcm = new FCM();
var repo = new MongoRepo("drinks", "orders");

// B2C/C2B ResultURL - /api/v1/result
router.post('/result', function (req, res) {
    var body = req.body && req.body.Body && req.body.Body.stkCallback || {};

    console.log('-----------B2C RESULTS------------');
    console.log(body.ResultDesc);
    console.log('----------------------------------');

    if (body) {
        repo.findOne({"paymentData.MerchantRequestID": body.MerchantRequestID})
            .then(data => {
                if (data) {

                    body.type = "Mpesa-Callback";
                    body.createdAt = new Date().toISOString();
                    body.status = body.ResultCode === 0 ? "success" : "failed";
                    body.message = config.MpesaResultCode[body.ResultCode] || body.ResultDesc;

                    data.status = body.status;
                    data.paymentData = data.paymentData || [];
                    data.paymentData.push(body);

                    if (body.message)
                        fcm.sendMessage(req.query.regId, "MPESA Payment", body.message);

                    repo.save(data);
                } else {
                    console.log("Error while trying to read MerchantRequestID:" + body.MerchantRequestID);
                    fcm.sendMessage(req.query.regId, "MPESA Payment", console.lastMsg);
                }
            });
    } else {
        console.log("Invalid/Unexpected body received from MPESA", req.body);
        fcm.sendMessage(req.query.regId, "MPESA Payment", console.lastMsg);
    }

    /* {
       "Body": {
          "stkCallback": {
             "MerchantRequestID": "22954-724188-1",
             "CheckoutRequestID": "ws_CO_DMZ_34598621_28052018215209591",
             "ResultCode": 1032,
             "ResultDesc": "Request cancelled by user",
             "_id": "4b6b07ac6f78789fcc7f40aaa2694b2d"
          },
          "_id": "0247da6e8f064238200b2c7791593599"
       },
       "_id": "8e6198cd5b5d85f24dd2d34fcf45da25"
    }*/

    var message = {
        "ResponseCode": "00000000",
        "ResponseDesc": "success"
    };

    res.json(message);
});

// B2C/C2B QueueTimeoutURL - /api/v1/timeout
router.post('/timeout', function (req, res) {
    console.log('-----------B2C TIMEOUT------------');
    console.log(req.body);
    console.log('-----------------------');

    var message = {
        "ResponseCode": "00000000",
        "ResponseDesc": "success"
    };

    res.json(message);
});

// C2B ValidationURL - /api/v1/validation
router.post('/validation', function (req, res) {
    console.log('-----------C2B VALIDATION REQUEST-----------');
    console.log(req.body);
    console.log('-----------------------');

    var message = {
        "ResultCode": 0,
        "ResultDesc": "Success",
        "ThirdPartyTransID": "1234567890"
    };

    res.json(message);
});

// C2B ConfirmationURL - /api/v1/confirmation
router.post('/confirmation', function (req, res) {
    console.log('-----------C2B CONFIRMATION REQUEST------------');
    console.log(req.body);
    console.log('-----------------------');

    var message = {
        "ResultCode": 0,
        "ResultDesc": "Success"
    };

    res.json(message);
});

module.exports = router;
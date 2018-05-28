/**
 * Mpesa callbacks
 */

const MongoRepo = require('../../../lib/common/MongoRepo'),
    express = require('express'),
    router = express.Router(),
    ejs = require('ejs');

var repo = new MongoRepo("drinks", "orders");

// B2C/C2B ResultURL - /api/v1/result
router.post('/result', function (req, res) {
    console.log('-----------B2C RESULTS------------');
    console.log(req.body);
    console.log('----------------------------------');

    if (req.body && req.body.Body && req.body.Body.stkCallback) {
        var body = req.body.Body.stkCallback;
        repo.findOne({"paymentData.MerchantRequestID": body.MerchantRequestID})
            .then(data => {
                if (data) {
                    console.log("Mpesa result: ", data);

                    data.paymentData = data.paymentData || [];

                    var statusOpts = ["cancelled", "success", "failed", "ok"];
                    var status = (body.ResultDesc || data.status).split(" ").filter(w => w && statusOpts.find(s => w.toLowerCase().startsWith(s)));

                    body.createdAt = new Date().toISOString();
                    body.type = "Mpesa-Callback";
                    body.status = status[0];

                    data.status = status[0];
                    data.paymentData.push(body);

                    repo.save(data);
                } else {
                    console.log("Error while trying to read MerchantRequestID:" + body.MerchantRequestID);
                }
            });
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
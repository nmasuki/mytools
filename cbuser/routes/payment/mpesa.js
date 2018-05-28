/**
 * Mpesa callbacks
 */

const express = require('express'),
    router = express.Router(),
    ejs = require('ejs'),
    app = express();

// B2C/C2B ResultURL - /api/v1/result
router.post('/result', function (req, res) {
    console.log('-----------B2C RESULTS------------');
    console.log(req.body);
    console.log('-----------------------');

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
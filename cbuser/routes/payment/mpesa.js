/**
 * Mpesa callbacks
 */

var express = require('express');
var prettyjson = require('prettyjson')
var router = express.Router();

// B2C/C2B ResultURL - /api/v1/result
router.post('/result', function (req, res) {
    console.log('-----------B2C CALLBACK------------');
    console.log(prettyjson.render(req.body, {noColor: true}));
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
    console.log(prettyjson.render(req.body, {noColor: true}));
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
    console.log(prettyjson.render(req.body, {noColor: true}));
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
    console.log(prettyjson.render(req.body, {noColor: true}));
    console.log('-----------------------');

    var message = {
        "ResultCode": 0,
        "ResultDesc": "Success"
    };

    res.json(message);
});

module.exports = router;
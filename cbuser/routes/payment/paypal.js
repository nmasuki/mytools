/**
 * Paypal callbacks
 */

var express = require('express');
var router = express.Router();

// return_url
router.post('/result', function(req, res) {
    console.log('-----------PAYPAL RESULTS REQUEST-----------');
    console.log(prettyjson.render(req.body, options));
    console.log('-----------------------');

    var message = {
        "ResultCode": 0,
        "ResultDesc": "Success",
        "ThirdPartyTransID": "1234567890"
    };

    res.json(message);
});

// cancel_url
router.post('/cancel', function(req, res) {
    console.log('-----------C2B CONFIRMATION REQUEST------------');
    console.log(prettyjson.render(req.body, options));
    console.log('-----------------------');

    var message = {
        "ResultCode": 0,
        "ResultDesc": "Success"
    };

    res.json(message);
});

module.exports = router;
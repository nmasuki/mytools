/**
 * Paypal callbacks
 */

require("../../../lib/common/polyfills");
const express = require('express');
const router = express.Router();
const MoneyClients = require('../../../lib/money/index');
const paypal = new MoneyClients.Paypal();

// return_url
router.get('/result', function(req, res) {
    var paymentId = req.query.paymentId;
    var payerId = { payer_id: req.query.PayerID };

    paypal.payment.execute(paymentId, payerId, function(error, payment){
        if(error){
            console.error(JSON.stringify(error));
        } else {
            if (payment.state == 'approved'){
                console.log('payment completed successfully');
            } else {
                console.log('payment not successful');
            }

            res.json(payment);
        }
    });


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
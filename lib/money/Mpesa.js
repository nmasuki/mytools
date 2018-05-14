/**
 * Created by nmasuki on 11/5/2017.
 */
const MongoRepo = require('./../common/MongoRepo.js');
const MoneyClients = require('./client/index');
require("../common/polyfills");

function Mpesa() {
    MongoRepo.call(this, "drinks", "orders");

    var self = this,
        client = new MoneyClients.MPESAClient();

    function lipaNaMpesaOnline(shortcode, senderMsisdn, accountRef, amount, transactionDesc) {
        var startTime = new Date().getTime();
        var data = {
            ShortCode: shortcode,
            Amount: (amount || 100),
            transactionType: 'CustomerPayBillOnline',
            SenderMsisdn: sanitizePhoneNumber(senderMsisdn),
            accountRef: accountRef || "ACC00" + new Date().getTime(),
            transactionDesc: transactionDesc || "DES00" + new Date().getTime(),
            CallBackURL: client.getConfig().CallBackURL || client.getConfig().ResultURL
        };


        var promise = client.lipaNaMpesaOnline(
            data.SenderMsisdn, data.Amount, data.CallBackURL,
            data.accountRef, data.transactionDesc, data.transactionType
        )
            .catch((err) => {
                console.error("lipa_na_mpesa_online_payment failed!");
                response.data = Object.assign({status: "failed"}, err.response.data);
                //res.sendStatus(response.data.errorCode);
                //res.send(response.data);
                return response;
            })
            .then(function (response) {
                var body = Object.assign({status: "sent"}, response.data);

                body.createdAt = new Date().toISOString();
                body.processTime = new Date().getTime() - startTime;

                self.findOne({_id: data._id})
                    .then(function (_data) {
                        _data = _data || data;
                        _data.statusData = _data.statusData || [];
                        _data.statusData.push(body);
                        _data.status = body.status == "success" ? "processing" : body.status;

                        self.save(_data);
                    });

                return body;
            });


        data._id = `${data.SenderMsisdn}-${data.accountRef}-${data.transactionDesc}`.toUpperCase();
        data.status = "request_sent";
        data.orderType = "Mpesa";
        self.save(data);

        return promise;
    }

    function lipaNaMpesaQuery(shortcode, checkoutRequestId) {
        var data = {
            "BusinessShortCode": shortcode,
            "CheckoutRequestID": checkoutRequestId
        };

        var startTime = new Date().getTime();
        return client.lipaNaMpesaQuery(data.CheckoutRequestID, data.BusinessShortCode)
            .catch(function(err){
                response.data = Object.assign({status: "failed_confirm"}, err.response.data);
                return response;
            })
            .then(function (response) {
                var body = response.data
                body.createdAt = new Date().toISOString();
                body.processTime = new Date().getTime() - startTime;

                self.getCollection().findOne({
                    "BusinessShortCode": shortcode,
                    'statusData.CheckoutRequestID': checkoutRequestId
                }).then(function (doc) {
                    if (doc) {
                        body.status = body.status == "success" ? "confirmed" : body.status

                        doc.statusData = doc.statusData || [];
                        doc.statusData.push(body);
                        doc.status = body.status;

                        self.save(doc);
                    }
                });

            });
    }

    function sendMoneyB2C(phoneNumber, amount, desc = "Testcases") {
        var data = {
            "InitiatorName": self.Config.InitiatorName,
            "SecurityCredential": self.Config.SecurityCredential,
            "CommandID": "BusinessPayment",
            "Amount": amount,
            "PartyA": self.Config.Shortcode1,
            "PartyB": phoneNumber,
            "Remarks": "Testing B2C",
            "QueueTimeOutURL": self.Config.ValidationURL,
            "ResultURL": self.Config.ConfirmationURL,
            "Occassion": desc
        };

        var startTime = new Date().getTime();
        return client.b2c_payment_request(data)
            .then(function (body, response) {

                body.createdAt = new Date().toISOString();
                body.processTime = new Date().getTime() - startTime;

                self.getCollection().findOne({
                    "BusinessShortCode": shortcode,
                    'statusData.CheckoutRequestID': checkoutRequestId
                }).then(function (doc) {
                    if (doc) {
                        body.status = body.status == "success" ? "confirmed" : body.status

                        doc.statusData = doc.statusData || [];
                        doc.statusData.push(body);
                        doc.status = body.status;

                        self.save(doc);
                    }
                });

            });

    }

    function sanitizePhoneNumber(phone) {
        phone = phone.replace(/[\W]+/g, "");
        if (!phone)
            return "";

        if (phone.length < 11)
            phone = phone.replace(/^0/, "254").replace(/^7/, "2547");

        if (phone.length == 13 && phone.startsWith("+"))
            phone = phone.replace("^+", "");

        return phone;
    }

    self.lipaNaMpesaOnline = function (shortcode, phoneNumber, account, amount, desc) {
        return lipaNaMpesaOnline.retryApply(this, () => client && client.getConfig(), 5, 1000, [shortcode, phoneNumber, account, amount, desc])
    }

    self.lipaNaMpesaQuery = function (checkoutRequestId, shortcode = null) {
        return lipaNaMpesaQuery.retryApply(this, () => client && client.getConfig(), 5, 1000, [checkoutRequestId, shortcode])
    }

    return self;
}

module.exports = Mpesa
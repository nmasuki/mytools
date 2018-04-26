/**
 * Created by nmasuki on 11/5/2017.
 */
var MongoRepo = require('./../common/MongoRepo.js'), col = null;
var MoneyClients = require('./client/index');

function Mpesa() {
    MongoRepo.call(this);

    var self = this,
        client = new MoneyClients.MPESAClient();

    function paybill(shortcode, phoneNumber, amount, account, desc) {
        var data = {
            BusinessShortCode: shortcode,
            Passkey: client.Config.LNM_PassKey,
            Amount: (amount || 100),
            PartyA: phoneNumber,
            PartyB: shortcode,
            PhoneNumber: phoneNumber,
            CallBackURL: client.Config.ValidationURL,
            AccountReference: account || "ACC00" + new Date().getTime(),
            TransactionDesc: desc || "DES00" + new Date().getTime(),
        };

        var startTime = new Date().getTime()
        var promise = client.lipa_na_mpesa_online_payment(data)
            .then(function (body, response) {

                body.createdAt = new Date().toISOString();
                body.processTime = new Date().getTime() - startTime;

                data.statusData = data.statusData || [];
                data.statusData.push(body);
                data.status = body.status == "success" ? "processing" : body.status;

                self.save(data);
            });

        data.status = "request_sent";
        self.save(data);

        return promise;
    }

    function confirmPaybill(shortcode, checkoutRequestId) {
        var data = {
            "BusinessShortCode": shortcode,
            "CheckoutRequestID": checkoutRequestId,
            "Passkey": client.Config.LNM_PassKey
        };

        var startTime = new Date().getTime();
        return client.lipa_na_mpesa_online_query(data)
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

    function sendMoneyB2C(phoneNumber, amount, desc = "Testcases"){
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

    self.paybill = function (shortcode, phoneNumber, account, amount, desc) {
        return paybill.retryApply(this, () => client && client.Config, 5, 1000, [shortcode, phoneNumber, account, amount, desc])
    }

    self.confirmPaybill = function (shortcode, checkoutRequestId) {
        return confirmPaybill.retryApply(this, () => client && client.Config, 5, 1000, [shortcode, checkoutRequestId])
    }
}

module.exports = Mpesa
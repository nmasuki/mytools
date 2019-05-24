/**
 * Created by nmasuki on 11/5/2017.
 */
const MongoRepo = require('./../common/MongoRepo');
const MoneyClients = require('./client/index');
require("../common/polyfills");

function Mpesa() {
    MongoRepo.call(this, "drinks", "orders");

    var self = this,
        client = new MoneyClients.MPESAClient();
        
    function sanitizePhoneNumber(phone) {
        phone = phone.replace(/[\W]+/g, "");
        if (!phone)
            return "";
            
        if (phone.startsWith("+"))
            phone = phone.replace("^+", "");

        if (phone.length < 11)
            phone = phone.replace(/^0/, "254").replace(/^7/, "2547");

        
        return phone;
    }

    function lipaNaMpesaOnline(order) {
        var startTime = new Date().getTime(),
            paymentMethod = order.paymentMethod

        var data = {
            type: "Mpesa-Request",
            Amount: (order.itemsCost + order.shippingCost || 100),
            ShortCode: paymentMethod.metaData.shortcode || '600784',
            accountRef: paymentMethod.metaData.account || order.metaData["payment-fullNames"] || "ACC00" + new Date().getTime(),
            CallBackURL: (client.getConfig().CallBackURL || client.getConfig().ResultURL) + `?regId=${order.metaData.regId || ""}`,
            SenderMsisdn: sanitizePhoneNumber(order.metaData["payment-identifier"]),
            transactionDesc: "ORDER " + order.orderNumber || "DES00" + new Date().getTime(),
            transactionType: 'CustomerPayBillOnline'
        };

        var promise = client.lipaNaMpesaOnline(
            data.SenderMsisdn, data.Amount, data.CallBackURL,
            data.accountRef, data.transactionDesc,
            data.transactionType, data.ShortCode
        )
            .catch((err) => {
                console.error("lipa_na_mpesa_online_payment failed!");
                response.data = Object.assign({status: "failed"}, err.response.data);
                return response;
            })
            .then(function (response) {
                var body = Object.assign({status: "awaiting_callback"}, response.data);

                body.createdAt = new Date().toISOString();
                body.processTime = new Date().getTime() - startTime;

                return body;
            });


        data.status = "request_sent";
        order.paymentData.push(data);

        return promise;
    }

    function lipaNaMpesaQuery(shortcode, checkoutRequestId) {
        var data = {
            "BusinessShortCode": shortcode,
            "CheckoutRequestID": checkoutRequestId
        };

        var startTime = new Date().getTime();
        return client.lipaNaMpesaQuery(data.CheckoutRequestID, data.BusinessShortCode)
            .catch(function (err) {
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



    self.lipaNaMpesaOnline = function (order) {
        return lipaNaMpesaOnline.retryApply(this, () => client && client.getConfig(), 5, 1000, [order])
    }

    self.lipaNaMpesaQuery = function (checkoutRequestId, shortcode = null) {
        return lipaNaMpesaQuery.retryApply(this, () => client && client.getConfig(), 5, 1000, [checkoutRequestId, shortcode])
    }

    return self;
}

module.exports = Mpesa
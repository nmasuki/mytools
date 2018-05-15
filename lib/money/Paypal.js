/**
 * Created by nmasuki on 11/5/2017.
 */
const MongoRepo = require('./../common/MongoRepo.js');
const MoneyClients = require('./client/index');
require("../common/polyfills");

function Paypal() {
    var self = this,
        paypal = new MoneyClients.PayPalClient();

    self.requestPayment = function (order) {
        var data = {
            "intent": "order",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": paypal.getConfig().return_url + `?regId=${order.metaData.regId}`,
                "cancel_url": paypal.getConfig().cancel_url + `?regId=${order.metaData.regId}`
            },
            "transactions": [{
                "item_list": {
                    "items": order.orderItems.map(o => {
                        return {
                            "name": o.product.name,
                            "sku": o.product.sku || o.product.name,
                            "price": o.product.price,
                            "currency": o.product.currency || "KES",
                            "quantity": o.size || 1
                        }
                    })
                },
                "payee": {
                    "email": order.metaData["payment-identifier"] || "master-us-pro-t2@paypal.com"
                },
                "amount": {
                    "currency": order.currency || "KES",
                    "total": (order.itemsCost + order.shippingCost).toString()
                },
                "description": "Dial a drink order " + order.orderNumber
            }]
        };

        var promise = new Promise((fulfill, reject) => {
            paypal.payment.create(data, function (error, payment) {
                if (error) {
                    var body = Object.assign({status: "failed"}, error);
                    reject(body);
                } else {
                    var approval_url = payment.links.find(l => l.rel == 'approval_url');
                    // If redirect url present, redirect user
                    if (approval_url) {
                        var body = Object.assign({status: "url_sent"}, payment);
                        fulfill(body);
                    } else {
                        reject({status: "failed", message: "No redirect URI present"});
                    }
                }
            });
        });

        data.status = "request_sent";
        order.paymentData.push(data);

        return promise;
    }
}

module.exports = Paypal;

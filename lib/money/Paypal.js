/**
 * Created by nmasuki on 11/5/2017.
 */
const MongoRepo = require('./../common/MongoRepo.js');
const MoneyClients = require('./client/index');
require("../common/polyfills");

function Paypal() {
    MongoRepo.call(this, "drinks", "orders");

    var self = this,
        paypal = new MoneyClients.PayPalClient();

    self.requestPayment = function(order){
        var data = {
            "intent": "order",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": paypal.getConfig().return_url,
                "cancel_url": paypal.getConfig().cancel_url
            },
            "transactions": [{
                "item_list": {
                    "items": order.orderItems.map(o=>{
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
                    "email":order.metaData["payment-identifier"] || "master-us-pro-t2@paypal.com"
                },
                "amount": {
                    "currency": order.currency || "KES",
                    "total": (order.itemsCost + order.shippingCost).toString()
                },
                "description": "Dial a drink order " + order.orderNumber
            }]
        };

        var promise = new Promise((fulfill, reject)=>{
            paypal.payment.create(data, function (error, payment) {
                if (error) {
                    reject(error);
                } else {
                    console.log("Create payment response!");
                    console.log(payment);

                    payment.status = payment.state == "created"? "success": payment.state;
                    self.save(data);

                    fulfill(payment);
                }
            });
        });

        data._id = `${order.orderNumber}`.toUpperCase();
        data.status = "request_sent";
        data.orderType = "Paypal";

        self.save(data);

        return promise;
    }
}

module.exports = Paypal;

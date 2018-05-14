var express = require('express')
    , bodyParser = require('body-parser')
    , prettyjson = require('prettyjson');

var request = require('request').defaults({json: true})
    , httpProxy = require('http-proxy')
    , host = "127.0.0.1:4985"
    , db = "dialadrink"
    , app = express();

function authChecker(req, res, next) {
    if (req.headers.authorization || req.path === '/auth') {
        var auth = new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString().split(':');
        next();
    } else if (req.headers["user-agent"].startsWith("curl/")) {
        next();
    } else {
        res.send("Missing Authorization!!");
    }
}

function fetchUserObject(req, res, next) {
    if (req.headers.authorization || req.path === '/auth') {
        next();
    } else if (req.headers["user-agent"].startsWith("curl/")) {
        next();
    } else {
        res.redirect("/auth");
    }
}

var protectedBearer = [authChecker, fetchUserObject]
var protectedBasic = [authChecker, fetchUserObject]
var unprotected = [];

app.use(bodyParser.urlencoded({extended: true}));
app.use('/signup', bodyParser.json());
app.use('/order', bodyParser.json());

// All other requests. Disable in prod
/*/
app.all('*', protectedBasic, function (req, res) {
    req.pipe(request(`http://${host}${req.url}`)).pipe(res);
});
/**/

// Sign up
app.post('/signup', protectedBearer, function (req, res) {
    var json = req.body;
    var signupUrl = `http://${host}/${db}/_user/`;

    console.log('Its signup time', signupUrl, json);

    var options = {
        url: signupUrl,
        method: 'POST',
        body: json
    };

    request(options, function (error, response) {
        //res.writeHead(response.statusCode);
        res.send(response.body);
        res.end();
    });
});

// Order
app.post('/order', protectedBasic, function (req, res) {
    var money = new require("../lib/money")
    var order = req.body,
        paymentMethod = order.paymentMethod;

    paymentMethod.metaData = paymentMethod.metaData || {};
    switch (paymentMethod.name) {
        case "Cash On Delivery":
            res.send({
                status: 'success',
                message: paymentMethod.metaData.successMsg || "Thanks for placing your order. Your deliver will soon be dispatched"
            });
            break;
        case "M-Pesa":
            var mpesa = new money.Mpesa(),
                phoneNumber = order.metaData["payment-identifier"],
                shortCode = paymentMethod.metaData.shortcode || '600784',
                account = paymentMethod.metaData.account || order.metaData["payment-fullNames"],
                desc = "ORDER " + order.orderNumber;

            mpesa.lipaNaMpesaOnline(shortCode, phoneNumber, account, order.itemsCost, desc)
                .then((data) => {
                    var body = Object.assign({status: "success"}, data);
                    body.CustomerMessage = paymentMethod.metaData.successMsg || body.CustomerMessage;
                    res.send(body);
                });
            break;
        case "Paypal":
            var paypal = new money.Paypal();
            paypal.requestPayment(order)
                .then((data)=>{
                    var body = Object.assign({status: "success"}, data);
                    body.CustomerMessage = paymentMethod.metaData.successMsg || body.CustomerMessage;
                    res.send(body);
                });
            break;
        case "Mock":
            res.send({
                status: 'success',
                message: "This is a mocked successful order. Please continue testing our App."
            });
            break;
        default:
            res.sendStatus(501);
            res.send({
                status: 'failed',
                message: `The payment method '${order.paymentMethod.name}' is not yet implemented! Please try another one.`
            });
            break
    }
});

require('./routes/payment')(app);

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('App listening at http://%s:%s', host, port);
});
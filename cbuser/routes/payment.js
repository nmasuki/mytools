var bodyParser = require('body-parser');

module.exports = function (app) {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use('/paypal', require('./payment/paypal'));
    app.use('/mpesa', require('./payment/mpesa'));
};
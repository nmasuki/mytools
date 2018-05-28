var bodyParser = require('body-parser');

module.exports = function (app) {
    app.use('/paypal', [
        bodyParser.json(),
        bodyParser.urlencoded({ extended: true }),
        require('./payment/paypal')
    ]);

    app.use('/mpesa', [
        bodyParser.json(),
        bodyParser.urlencoded({ extended: true }),
        require('./payment/mpesa')
    ]);
};
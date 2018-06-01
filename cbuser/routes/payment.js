var bodyParser = require('body-parser');
var Raven = require('raven');

// Must configure Raven before doing anything else with it
Raven.config('https://d45276ab6f5548fcaf23c09c4e35b2e1@sentry.io/1217739').install();

module.exports = function (app) {
    // The request handler must be the first middleware on the app
    app.use(Raven.requestHandler());

    // The error handler must be before any other error middleware
    app.use(Raven.errorHandler());

    //paypal callback
    app.use('/paypal', [
        bodyParser.json(),
        bodyParser.urlencoded({ extended: true }),
        require('./payment/paypal')
    ]);

    //mpesa callback
    app.use('/mpesa', [
        bodyParser.json(),
        bodyParser.urlencoded({ extended: true }),
        require('./payment/mpesa')
    ]);
};
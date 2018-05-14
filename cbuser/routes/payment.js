module.exports = function (app) {
    app.use('/paypal', require('./payment/paypal'));
    app.use('/mpesa', require('./payment/mpesa'));
}
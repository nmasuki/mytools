const najax = require('najax');
const request = require('request');
const fs = require('fs');
const URL = require("./mpesaurls.js")
require('./lib/common/polyfills.js')

var MongoClient = require('mongodb').MongoClient
    , assert = require('assert'), col = null;


// Use connect method to connect to the Server
MongoClient.connect('mongodb://localhost:27017/mpesa', function (err, db) {
    assert.equal(null, err);
    console.log("Connected correctly to server");
    col = db.collection('mpesa');
});

function MpesaClient(access_token, env = "production") {
    var self = this;
    if(!access_token){
        var time = new Date().getTime();
        if (!exports.Config || !exports.Config.AccessToken || exports.Config.AccessToken.expiry < time)
        {
            console.warn("Missing required field 'access_token'");
            return true;
        }
        else
            access_token = exports.Config.AccessToken.access_token;
    }

    self.env = env
    self.headers = {"Authorization": "Bearer " + access_token}

    function process_payload(expected_keys, options) {
        var payload = {}
        for (var i in expected_keys) {
            var key = expected_keys[i];
            if(typeof key != "function") {
                var value = options[key];
                if (!value)
                    throw `Missing keyword argument: ${key}`;
                else
                    payload[key] = value
            }
        }
        return payload;
    }

    function encode_password(shortcode, passkey, timestamp) {
        return new Buffer(shortcode + passkey + timestamp).toString("base64");
    }

    function generate_timestamp() {
        var time = new Date();
        return time.toISOString().slice(-24).replace(/\D/g, '').slice(0, 14)
    }

    function makeRequest(url, payload, method) {
        return new Promise(function (fulfill, reject){
            request({
                method: method,
                url: url,
                headers: self.headers,
                json: payload
            }, function (error, response, body) {
                try{
                    if(error)
                        fulfill(Object.assign({status: "error", error: error}, body, e), response);
                    else if(response.statusCode == 200)
                        fulfill(Object.assign({status: "success"}, body), response);
                    else
                        fulfill(Object.assign({status: "failed"}, body), response)
                }catch (e){
                    reject(Object.assign({status: "error"}, body, e), response)
                }

            });
        }).catch(console.debug)

    }

    self.b2b_payment_request = function (options) {
        var expected_keys = [
            "Initiator", "SecurityCredential",
            "CommandID", "SenderIdentifierType",
            "RecieverIdentifierType", "Amount",
            "PartyA", "PartyB", "AccountReference",
            "Remarks", "QueueTimeOutURL", "ResultURL"
        ];

        var payload = process_payload(expected_keys, options);
        return self.makeRequest(URL[self.env]["b2b_payment_request"], payload, "POST");
    }

    self.b2c_payment_request = function (options) {
        var expected_keys = [
            "InitiatorName", "SecurityCredential",
            "CommandID", "Amount", "PartyA",
            "PartyB", "Remarks", "QueueTimeOutURL",
            "ResultURL", "Occassion"
        ]
        var payload = process_payload(expected_keys, options);
        return self.makeRequest(URL[self.env]["b2c_payment_request"], payload, "POST");
    }

    self.c2b_register_url = function (options) {
        var expected_keys = [
            "ShortCode", "ResponseType",
            "ConfirmationURL", "ValidationURL"
        ]
        var payload = process_payload(expected_keys, options);
        return self.makeRequest(URL[self.env]["c2b_register_url"], payload, "POST");
    }

    self.c2b_simulate_transaction = function (options) {
        var expected_keys = [
            "ShortCode", "Amount",
            "Msisdn", "BillRefNumber"
        ]
        var payload = process_payload(expected_keys, options);
        return self.makeRequest(URL[self.env]["c2b_simulate_transaction"], payload, "POST");
    }

    self.transaction_status_request = function (options) {
        var expected_keys = [
            "Initiator", "SecurityCredential",
            "TransactionID", "PartyA",
            "ResultURL", "QueueTimeOutURL",
            "Remarks", "Occasion"
        ]
        var payload = process_payload(expected_keys, options);
        payload["CommandID"] = "TransactionStatusQuery"
        payload["IdentifierType"] = "1"
        return self.makeRequest(URL[self.env]["transaction_status_request"], payload, "POST");
    }

    self.account_balance_request = function (options) {
        var expected_keys = [
            "Initiator", "SecurityCredential", "PartyA",
            "Remarks", "QueueTimeOutURL", "ResultURL"
        ]
        var payload = process_payload(expected_keys, options);
        payload["CommandID"] = "AccountBalance"
        payload["IdentifierType"] = "4"
        return self.makeRequest(URL[self.env]["account_balance_request"], payload, "POST");
    }

    self.reversal_request = function (options) {
        var expected_keys = [
            "TransactionID", "Amount",
            "ReceiverParty", "ResultURL",
            "Initiator", "SecurityCredential",
            "QueueTimeOutURL", "Remarks", "Occasion"
        ]
        var payload = process_payload(expected_keys, options);
        payload["CommandID"] = "TransactionReversal"
        payload["RecieverIdentifierType"] = "4"
        var response = self.makeRequest(URL[self.env]["reversal_request"], payload, "POST")
        return response
    }

    self.lipa_na_mpesa_online_query = function (options) {
        if (!options.Passkey)
            throw `Missing keyword argument: Passkey`;

        var expected_keys = [
            "BusinessShortCode",
            "CheckoutRequestID"
        ];
        var payload = process_payload(expected_keys, options);
        payload.Timestamp = generate_timestamp();
        payload.Password = encode_password(payload.BusinessShortCode, options.Passkey, payload.Timestamp);
        return self.makeRequest(URL[self.env]["lipa_na_mpesa_online_query"], payload, "POST");
    }

    self.lipa_na_mpesa_online_payment = function (options) {
        if (!options.Passkey)
            throw `Missing keyword argument: Passkey`;

        var expected_keys = [
            "BusinessShortCode",
            "Amount", "PartyA", "PartyB",
            "PhoneNumber", "CallBackURL",
            "AccountReference", "TransactionDesc"
        ]

        var payload = process_payload(expected_keys, options);
        payload["Timestamp"] = generate_timestamp()
        payload["TransactionType"] = "CustomerPayBillOnline"
        payload["Password"] = encode_password(payload.BusinessShortCode, options.Passkey, payload.Timestamp);

        return self.makeRequest(URL[self.env]["lipa_na_mpesa_online_payment"], payload, "POST")
    }

}

function init(callback) {
    var jsonFile = "./mpesadata.json";

    function saveConfig(data) {
        fs.writeFile(jsonFile, JSON.stringify(data));
    }

    function getSavedConfig() {
        if (fs.existsSync(jsonFile)) {
            var json = fs.readFileSync(jsonFile, 'utf8');
            if (json) return JSON.parse(json)
            console.log("file not exists")
        }
        return {};
    }

    function resetOAuth() {
        var consumer_key = process.env.MPESA_KEY, //"YOUR_APP_CONSUMER_KEY",
            consumer_secret = process.env.MPESA_SECRET, //"YOUR_APP_CONSUMER_SECRET",
            url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            auth = "Basic " + new Buffer(consumer_key + ":" + consumer_secret).toString("base64");

        request({
            url: url,
            headers: {"Authorization": auth},
            dataType: 'json',
        }, function (error, response, body) {
            if(typeof body != "object")
                body = JSON.parse(body);

            body.expiry = new Date().addSeconds(body.expires_in).getTime();
            body.expiryDate = new Date(body.expiry).toISOString();

            exports.Config.AccessToken = body;
            saveConfig(exports.Config)

            if(typeof callback == "function")
                callback(exports.Config);
        });
    }

    exports.Config = getSavedConfig();

    if (!exports.Config || !exports.Config.AccessToken || exports.Config.AccessToken.expiry < new Date().getTime())
        resetOAuth();
    else if(typeof callback == "function")
        callback(exports.Config);

}

var exports = module.exports = {Mpesa: new Mpesa(), Config: null};

init(function(config){
    exports.client = new MpesaClient(config.AccessToken.access_token);
});


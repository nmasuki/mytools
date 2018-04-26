/**
 * Created by nmasuki on 11/4/2017.
 */

const URL = require("./../urls/mpesa.js")
const HTTPClient = require("./../../common/HTTPClient.js")

function MPESAClient(env = "production") {
    var self = this;
    self.env = env;

    function process_payload(expected_keys, options) {
        var payload = {}
        for (var i in expected_keys) {
            var key = expected_keys[i];
            if (typeof key != "function") {
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
        ];
        var payload = process_payload(expected_keys, options);
        payload["CommandID"] = "AccountBalance"
        payload["IdentifierType"] = "4"
        return self.makeRequest(URL[self.env]["account_balance_request"], payload, "POST");
    }

    self.reversal_request = function (options) {
        var expected_keys = [
            "Initiator", "SecurityCredential",
            "TransactionID", "Amount",
            "ReceiverParty", "ResultURL",
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

    function init() {
        var url = `${URL[self.env]["oauth_generate_token"]}?grant_type=client_credentials`,
            auth = "Basic " + new Buffer(process.env.MPESA_KEY + ":" + process.env.MPESA_SECRET).toString("base64"),
            data = null, header = {Authorization: auth};

        self.makeRequest(url, data, 'GET', headers).then(function (body) {
            if (typeof body == "string")
                body = JSON.parse(body);

            if(body.expires_in)
            {
                body.expiryDate = new Date().addSeconds(body.expires_in);
                body.expiry = body.expiryDate.getTime();
            }
            delete body.r;

            self.Config = self.Config || {};
            self.Config.AccessToken = body;

            self.saveToken(self.Config);
            self.headers = {"Authorization": "Bearer " + body.access_token}
        });
    }

    HTTPClient.call(self, init);
    if(self.Config && self.Config.AccessToken)
        self.headers = {"Authorization": "Bearer " + self.Config.AccessToken.access_token}
}

module.exports = MPESAClient;
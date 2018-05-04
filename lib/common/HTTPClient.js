/**
 * Created by nmasuki on 11/4/2017.
 */
const najax = require('najax');
const fs = require('fs');
const os = require('os');
const xml2js = require('xml2js');
require('./polyfills.js');

function HTTPClient(initCallback) {
    var self = this;
    var jsonFile = `${(process.env.HOME || process.env.USERPROFILE)}/${self.constructor.name.toLowerCase()}.json`;

    if (!self.makeRequest)
        self.makeRequest = function (url, payload, method, headers) {
            payload = payload || {};
            method = method || "GET";
            headers = headers || {};
            headers = Object.assign(headers || {}, self.headers || {}, {});

            var curl = `curl `;
            if (Object.keys(headers).length) {
                var _headers = Object.keys(headers).map(k => `-H "${k}: ${headers[k]}"`).join(' ')
                curl += _headers;
            }

            if (Object.keys(payload).length) {
                var _payload = typeof payload == "string" ? payload : Object.keys(payload).map(k => `${k}=${encodeURIComponent(payload[k])}`).join('&');
                if (method.toUpperCase() == "GET" || typeof payload != "string")
                    curl += ` ${url}?${_payload}`;
                else
                    curl += ` -X ${method.toUpperCase()} -d '${_payload}' ${url}`;
            }

            var call = method == 'POST' ? najax.post : najax.get;
            var options = {
                url: url,
                data: payload,
                success: function (body) {
                    try {
                        if (!body)
                            body = {};
                        else if (typeof body != "object")
                            body = JSON.parse(body) || body;

                        if (typeof body == "string" && body.trim()[0] == "<")
                            xml2js.parseString(body, (err, data) => {
                                options.fulfill(Object.assign({status: "success"}, data, err));
                            });
                        else
                            options.fulfill(Object.assign({status: "success"}, body));
                    } catch (e) {
                        options.reject(Object.assign({status: "error", error: e}, body))
                    }
                },
                error: function (error) {
                    var body = JSON.parse(this.responseText) || this.responseText;
                    options.reject(Object.assign({status: "error", error: error}, body))
                }
            };
            if (Object.keys(headers).length)
                options.headers = headers;

            call(options);
            return new Promise(function (fulfill, reject) {
                //console.debug("HTTP call! " + curl);
                options.fulfill = fulfill;
                options.reject = reject;
            }).catch(function (xhr) {
                options.reject(xhr);
                console.log("HTTP call failed! " + JSON.oparse(xhr.responseText), curl);
            });
        }

    if (!self.saveToken)
        self.saveToken = function (data) {
            if (data && data.expires_in && !data.expiry) {
                data.expiryDate = new Date().addSeconds(data.expires_in);
                data.expiry = data.expiryDate.getTime();
            }

            var token = data.AccessToken;
            if (token && token.expires_in && !token.expiry) {
                token.expiryDate = new Date().addSeconds(token.expires_in);
                token.expiry = token.expiryDate.getTime();
            }

            if (data) {
                var json = JSON.stringify(data, null, 4);
                fs.writeFile(jsonFile, json);
            }

            return Object.assign(self.Config, data)
        }

    if (!self.getSavedToken)
        self.getSavedToken = function () {
            console.log("Getting saved Access Token")
            if (fs.existsSync(jsonFile)) {
                var json = fs.readFileSync(jsonFile, 'utf8');
                if (json) return JSON.parse(json);
                console.log("No Access Token found! File was empty..");
            } else {
                console.log("No Access Token found! File was missing..");
            }
            return {};
        }

    if (!self.isValidAuthToken)
        self.isValidAuthToken = function () {
            var token = self.Config;
            var valid = token && !token.Used && token.expiry && token.expiry > new Date().getTime();

            //if (valid)
            //    console.log("AuthToken valid till ", token.expiryDate);

            return valid;
        }

    if (!self.isValidAccessToken)
        self.isValidAccessToken = function () {
            var token = self.Config && self.Config.AccessToken;
            var valid = token && token.expiry && token.expiry > new Date().getTime();

            //if (valid)
            //    console.log("AuthAccess valid till ", token.expiryDate);

            return valid;
        }

    if (!self.isReady)
        self.isReady = function () {
            return self.isValidAccessToken();
        }

    if (!self.Config)
        self.Config = self.getSavedToken();

    if (!self.isValidAccessToken()) {
        if (typeof initCallback == "function")
            initCallback.call(this)
    } else {
        var token = self.Config && self.Config.AccessToken;
        console.log("AuthAccess valid till ", token.expiryDate);
    }
}

module.exports = HTTPClient;
/**
 * Created by nmasuki on 11/4/2017.
 */
const fs = require("fs");
const Mpesa = require('mpesa-node')

function getConfig(jsonFile) {
    console.log("Getting saved Access Token")
    if (fs.existsSync(jsonFile)) {
        var json = fs.readFileSync(jsonFile, 'utf8');
        return JSON.parse(json);
        console.log("No Access Token found! File was empty..", jsonFile);
    } else {
        console.log("No Access Token found! File was missing..", jsonFile);
    }
    return {
        "ENV": "sandbox",
        "Shortcode": "702421",
        "Shortcode1": "600332",
        "InitiatorName": "testapi0332",
        "SecurityCredential": "Safaricom332!",
        "Shortcode2": "600000",
        "TestMSISDN": "254708374149",
        "LNM_Shortcode": "174379",
        "LNM_PassKey": "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
        "ResultURL": "http://159.65.50.86:3000/mpesa/result",
        "ConfirmationURL": "http://159.65.50.86:3000/mpesa/confirmation",
        "ValidationURL": "http://159.65.50.86:3000/mpesa/validation",
        "QueueTimeOutURL": "http://159.65.50.86:3000/mpesa/timeout"
    };
}

var config = getConfig(`${(process.env.HOME || process.env.USERPROFILE)}/mpesaclient.json`);

class MPESAClient extends Mpesa{
    constructor() {
        super({
            consumerKey: process.env.MPESA_KEY,
            consumerSecret: process.env.MPESA_SECRET,
            environment: config.ENV || "sandbox",
            shortCode: config.Shortcode,
            initiatorName: config.InitiatorName,
            lipaNaMpesaShortCode: config.LNM_Shortcode,
            lipaNaMpesaShortPass: config.LNM_PassKey,
            securityCredential: config.SecurityCredential,
            //certPath: path.resolve('keys/myKey.cert')
        });
    }

    getConfig(){
        return config;
    }
}

module.exports = MPESAClient;
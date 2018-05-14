/**
 * Created by nmasuki on 11/4/2017.
 */
const fs = require("fs");
const paypal = require('paypal-rest-sdk')

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
        "mode": "sandbox",
        "return_url":"http://159.65.50.86:3000/paypal/result",
        "cancel_url":"http://159.65.50.86:3000/paypal/cancel"
    };
}

var config = getConfig(`${(process.env.HOME || process.env.USERPROFILE)}/paypalclient.json`);

class PaypalClient {
    constructor() {
        paypal.configure({
            "mode": config.mode,
            "client_id": process.env.PAYPAL_KEY,
            "client_secret": process.env.PAYPAL_SECRET,
        });
        Object.assign(this, paypal)
    }

    getConfig(){
        return config;
    }
}

module.exports = PaypalClient;

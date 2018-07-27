var najax = require('najax');
var async = require('async');

function topup(count) {
    var data = {
        "Amount": 50,
        "WC": 0.49,
        "CostPassedToUser": 0,
        "CarrierBillingProviderId": 4402,
        "Currency": "Kenyan_Shilling_KES",
        "Description": "Airtime",
        "IsValid": true
    };

    var sequence = [];
    for(var i = 0; i< count || 10; i++)
        sequence.push(i);

    async.each(sequence, function (i) {
        console.log("Runing topup", i);
        najax.post({
            url: 'https://api-mobile.geopoll.com:443/api/billing/topup/send',
            data: data,
            headers: {"Authorization": "MOBILE FEB4DF79C20A90806F3C3C6E974B7D05C933288D7D925D4D77B19EE0F2C965AC"},
            success: function (body) {
                console.log("Success", i, body);
            },
            error: function (error) {
                console.warn("Failed", i, error);
            }
        });
    }, function done(err){
        console.log("Done!", err);
    })
};

topup(10);
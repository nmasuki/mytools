var najax = require('najax');
var async = require('async');

function topup(count) {
    count = count || 10;
    var data = {
        "Amount": 5,
        "WC": 0.049,
        "CostPassedToUser": 0,
        "CarrierBillingProviderId": 4402,
        "Currency": "Kenyan_Shilling_KES",
        "Description": "Airtime"
    };

    var sequence = [];
    for (var i = 1; i <= count; i++)
        sequence.push(i);

    console.log("Running " + count + " topup calls");
    async.each(sequence, function (i) {
        console.log("Running topup", i);
        najax.post({
            url: 'https://api-mobile.geopoll.com:443/api/billing/topup/send',
            //url: 'http://localhost:50822/api/billing/topup/send',
            data: data,
            headers: {"Authorization": "MOBILE FEB4DF79C20A90806F3C3C6E974B7D05C933288D7D925D4D77B19EE0F2C965AC"},
            success: function (body, xhr) {
                console.log("Success", i, body, xhr.getResponseHeader('set-cookie'));
            },
            error: function (xhr) {
                console.warn("Failed", i, xhr.responseText, xhr.getResponseHeader('set-cookie'));
            }
        });
    }, function done(err) {
        console.log("Done!", err);
    })
};

topup(20);
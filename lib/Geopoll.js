var najax = require('najax');
var async = require('async');
var HttpClient = require("./common/HTTPClient.js")
var apiIndicatorCouchUrl = `${process.env.GEOPOLL_COUCHDB_URL}/apikeyindicators`;

function Geopoll() {
    var self = this;
    HttpClient.call(self);

    self.topUp = function (count) {
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

    self.save = function (indicator) {
        return self.makeRequest(
            apiIndicatorCouchUrl, JSON.stringify(indicator), "POST", {"Content-Type": "application/json"});
    }

    self.get = function (id) {
        return self.makeRequest(apiIndicatorCouchUrl + "/" + id, {}, "GET");
    }

    self.setRemoved = function remove(removed) {
        if (typeof removed === "string")
            removed = eval("!!" + removed);

        apikeys.rows.forEach(r => {
            self.get(r.id).then(data => {
                var toSave = data.ApiKeyIndicatorList.find(item => {
                    return item.IndicatorID === r.key && item.Removed !== removed;
                });

                data.ApiKeyIndicatorList.forEach(item => {
                    if (item.IndicatorID === r.key)
                        item.Removed = removed;
                });

                if (toSave) {
                    self.save(data).then(r => {
                        console.log(r)
                        if (r.ok || r.status !== "error")
                            console.log("Deactivated", data._id);
                    });
                } else {
                    console.log("Skipping..", data._id);
                }

            })
        });
    }

    self.deactivate = function () {
        return self.setRemoved(true)
    }

    self.activate = function () {
        return self.setRemoved(false)
    }
}

module.exports = Geopoll;

var apikeys = {
    total_rows: 6885,
    offset: 1169,
    rows: [
        {
            id: "MjQwNTYxNUQxQjg4N0YwOEVBNTFFRDJENTQ0OEU0ODNEMEVFNURFM0I2RTM1QTZEMzhGNjg2NTkxN0FCMDBDQkZEMTFBMjBEODMyQTQ0N0Y=",
            key: "pg-brand-health-tracker-kenya",
            value: false
        },
        {
            id: "NDY4QjlEN0M3NTZDQ0VEQUZFMjBDQjFDQjVFOEZCRTYwRDY4MTUzMjVDOEI4ODUwQTI4NUY4MjBGMTE3RENFREQ2NEEwOTVEOUU3NURDOTA=",
            key: "pg-brand-health-tracker-kenya",
            value: false
        },
        {
            id: "NTc5QjM1NTY2OUEwMTQ5NDJDRDgxRDFDQzBBMUM2MkZGREQ0MjE0OThCNEE0NzQ1RjBDRThGOTRFMjE4MkMwNjczRTIxQkQ2RjYwNzIyNTI=",
            key: "pg-brand-health-tracker-kenya",
            value: false
        },
        {
            id: "NzAxQkFGQjU0NzI4NTY0MEQxRjdGRTdFRDYyOUNBMDJDRjI1RDgwODM4Mjg3RDZBOTNGMUE2NjA5OTIzRUVENEVBOUE1NjY2MzIzMTcyNTc=",
            key: "pg-brand-health-tracker-kenya",
            value: false
        },
        {
            id: "Q0QzOEQwMTcyMTkzNkI4MEEwOTY2OEVCRjNCMDYwNzU4MUZFODkwNUMwMTY3NDdDN0VCMTc4RkM4MDIwMzBENjg1MzcyMDAzNERDM0I5QjQ=",
            key: "pg-brand-health-tracker-kenya",
            value: false
        },
        {
            id: "QzEyN0Q0ODFBMTMwRDZGQzdEMTlERDkwNDZBQzhBN0ZCNTQ2OUEwNEQyNTIzN0E1QTg2MkJDOTgyOEMyNzUxOEE1NTY4RjhDM0FDQkQ0QTI=",
            key: "pg-brand-health-tracker-kenya",
            value: false
        },
        {
            id: "RDkzNUYyNjMyQjY2QzA3NTc4QjVGOUM2NDFDQUE1MjgxNDU2NDE1Q0FBODVFMDI2M0I0RkI5REYyMEU3MDI1RENCQUU4RjNGQzA1MkMyQUU=",
            key: "pg-brand-health-tracker-kenya",
            value: false
        },
        {
            id: "MjE3OTAxMjI3ODJCMTkzMEZGRTk3MTFFREQ5RkQ0RjBCMkY4Qjk5ODY5MUM2ODFEMjE1NzQ4NDQzNDI5Q0I0NkM3RUFFOTY0Qzk5NkU1MjI=",
            key: "pg-brand-health-tracker-southafrica",
            value: true
        },
        {
            id: "MkY0RDYxQjQzNDYxQ0Y3Nzg0RDlBMEMxMzdBOUM0RUNCRkIzQkU4ODMwOEIwNEUyNDZCNjk5NEYyRjEyN0U3MjRCMzQ2ODc5MTZGQjhCNkM=",
            key: "pg-brand-health-tracker-southafrica",
            value: true
        },
        {
            id: "NDY4QjlEN0M3NTZDQ0VEQUZFMjBDQjFDQjVFOEZCRTYwRDY4MTUzMjVDOEI4ODUwQTI4NUY4MjBGMTE3RENFREQ2NEEwOTVEOUU3NURDOTA=",
            key: "pg-brand-health-tracker-southafrica",
            value: true
        },
        {
            id: "NTc5QjM1NTY2OUEwMTQ5NDJDRDgxRDFDQzBBMUM2MkZGREQ0MjE0OThCNEE0NzQ1RjBDRThGOTRFMjE4MkMwNjczRTIxQkQ2RjYwNzIyNTI=",
            key: "pg-brand-health-tracker-southafrica",
            value: true
        },
        {
            id: "NzAxQkFGQjU0NzI4NTY0MEQxRjdGRTdFRDYyOUNBMDJDRjI1RDgwODM4Mjg3RDZBOTNGMUE2NjA5OTIzRUVENEVBOUE1NjY2MzIzMTcyNTc=",
            key: "pg-brand-health-tracker-southafrica",
            value: true
        },
        {
            id: "NzYwODcyOEUxRDIzRDc4NUNEODBERjA3QTZBRDVCM0IwODQyQjA1QUY5QTY2RkM2ODJDNDM0RDZFMkMzMzRBMkE1QUE3QUU0OTNBRUE0MUE=",
            key: "pg-brand-health-tracker-southafrica",
            value: true
        },
        {
            id: "Q0NDNDYwODY3NkI5RTdBOEUwNUVDNDY0OUQxMTBERTQxNjFFMzcxRkU1NDQxMDBFNDVDMjFCNTc5NkIwRUJFN0ZENkFCQThCQkVGMkJCQjk=",
            key: "pg-brand-health-tracker-southafrica",
            value: true
        },
        {
            id: "Q0QzOEQwMTcyMTkzNkI4MEEwOTY2OEVCRjNCMDYwNzU4MUZFODkwNUMwMTY3NDdDN0VCMTc4RkM4MDIwMzBENjg1MzcyMDAzNERDM0I5QjQ=",
            key: "pg-brand-health-tracker-southafrica",
            value: false
        },
        {
            id: "RDkzNUYyNjMyQjY2QzA3NTc4QjVGOUM2NDFDQUE1MjgxNDU2NDE1Q0FBODVFMDI2M0I0RkI5REYyMEU3MDI1RENCQUU4RjNGQzA1MkMyQUU=",
            key: "pg-brand-health-tracker-southafrica",
            value: false
        },
        {
            id: "MjE3OTAxMjI3ODJCMTkzMEZGRTk3MTFFREQ5RkQ0RjBCMkY4Qjk5ODY5MUM2ODFEMjE1NzQ4NDQzNDI5Q0I0NkM3RUFFOTY0Qzk5NkU1MjI=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "NDY4QjlEN0M3NTZDQ0VEQUZFMjBDQjFDQjVFOEZCRTYwRDY4MTUzMjVDOEI4ODUwQTI4NUY4MjBGMTE3RENFREQ2NEEwOTVEOUU3NURDOTA=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "NTc5QjM1NTY2OUEwMTQ5NDJDRDgxRDFDQzBBMUM2MkZGREQ0MjE0OThCNEE0NzQ1RjBDRThGOTRFMjE4MkMwNjczRTIxQkQ2RjYwNzIyNTI=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "NzAxQkFGQjU0NzI4NTY0MEQxRjdGRTdFRDYyOUNBMDJDRjI1RDgwODM4Mjg3RDZBOTNGMUE2NjA5OTIzRUVENEVBOUE1NjY2MzIzMTcyNTc=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "ODg5Njk2Q0Q4QjY1MDUxNEM2NjQ0NTYyRUVCNTZFMDZBQjNCNjU2MTA4RTAxNDA5NzNBMUIwNjNBMkQwQzkwMzY0RDJDMjFGQTY2RjlDOUM=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "ODg5Njk2Q0Q4QjY1MDUxNEM2NjQ0NTYyRUVCNTZFMDZBQjNCNjU2MTA4RTAxNDA5NzNBMUIwNjNBMkQwQzkwMzY0RDJDMjFGQTY2RjlDOUM=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "Q0NDNDYwODY3NkI5RTdBOEUwNUVDNDY0OUQxMTBERTQxNjFFMzcxRkU1NDQxMDBFNDVDMjFCNTc5NkIwRUJFN0ZENkFCQThCQkVGMkJCQjk=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "Q0QzOEQwMTcyMTkzNkI4MEEwOTY2OEVCRjNCMDYwNzU4MUZFODkwNUMwMTY3NDdDN0VCMTc4RkM4MDIwMzBENjg1MzcyMDAzNERDM0I5QjQ=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "QjRDQ0MzQUEzOTI3NDZCNkNGMEY0OTUxRUMwMEI4RkU4OTYzM0MxMkYzQkEzOTlBOERBNTJFQkYxOTBBQUQ0NDhCOURGQzlBOUU0QzZGQTU=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "QzUxNUVCOTlDNDUxNEJCMzg5Q0U1NkZDN0M5QkU5NEU5RjA0QUFCM0E2MDA0NTQwMkU3OEFFNTgyMkU4N0IzNjIwMkM4Q0I3RjdGMTAyMUE=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "RDkzNUYyNjMyQjY2QzA3NTc4QjVGOUM2NDFDQUE1MjgxNDU2NDE1Q0FBODVFMDI2M0I0RkI5REYyMEU3MDI1RENCQUU4RjNGQzA1MkMyQUU=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "RTNBMUVCMTE1NTc0OUVGNUYwNUVDMDlCQzQ1NjBFODZGMUJDQ0E5RjU4MEIzMTZFMUJDMjFCNkU2RTUxRkJEMjU1NTA4RjkxNDYxN0NEMjE=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        },
        {
            id: "RkU5RUJGMTJGQjUxOUIxMDNEMTREODU4NTNCMTc5ODlGQjIyMkZDMTJDNjg0MjY4NDg1NzBERTg5NDQ4QzE5NTJGRDE4OUExRjNEMUM4NjQ=",
            key: "pg-brand-health-tracker-nigeria",
            value: true
        }
    ]
}

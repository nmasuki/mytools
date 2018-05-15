var najax = require('najax');
var HttpClient = require("./common/HTTPClient.js")
var apiIndicatorCouchUrl = `${process.env.GEOPOLL_COUCHDB_URL}/apikeyindicators`.replace("couchdb.", "couchdb28.");

function Geopoll() {
    var self = this;
    HttpClient.call(self);

    self.save = function (indicator) {
        return self.makeRequest(
            apiIndicatorCouchUrl, JSON.stringify(indicator),
            "POST", {
                "Content-Type": "application/json"
            });
    }

    self.get = function (id) {
        return self.makeRequest(apiIndicatorCouchUrl + "/" + id, {}, "GET");
    }

    self.setRemoved = function remove(removed) {
        if (typeof removed == "string")
            removed = eval("!!" + removed);

        apikeys.rows.forEach(r => {
            self.get(r.id).then(data => {
                var toSave = data.ApiKeyIndicatorList.find(item => {
                    return item.IndicatorID == r.key && item.Removed != removed;
                });

                data.ApiKeyIndicatorList.forEach(item => {
                    if (item.IndicatorID == r.key)
                        item.Removed = removed;
                });

                if (toSave) {
                    self.save(data).then(r => {
                        console.log(r)
                        if(r.ok || r.status != "error")
                            console.log("Deactivated", data._id);
                    });
                } else {
                    console.log("Skipping..", data._id);
                }

            })
        });
    }

    self.deactivate = function(){
        return self.setRemoved(true)
    }

    self.activate = function(){
        return self.setRemoved(false)
    }
}

module.exports = Geopoll;

var apikeys = {
    "total_rows": 6873,
    "offset": 1175,
    "rows": [{
        "id": "MjE3OTAxMjI3ODJCMTkzMEZGRTk3MTFFREQ5RkQ0RjBCMkY4Qjk5ODY5MUM2ODFEMjE1NzQ4NDQzNDI5Q0I0NkM3RUFFOTY0Qzk5NkU1MjI=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "NDY4QjlEN0M3NTZDQ0VEQUZFMjBDQjFDQjVFOEZCRTYwRDY4MTUzMjVDOEI4ODUwQTI4NUY4MjBGMTE3RENFREQ2NEEwOTVEOUU3NURDOTA=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "NTc5QjM1NTY2OUEwMTQ5NDJDRDgxRDFDQzBBMUM2MkZGREQ0MjE0OThCNEE0NzQ1RjBDRThGOTRFMjE4MkMwNjczRTIxQkQ2RjYwNzIyNTI=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "NzAxQkFGQjU0NzI4NTY0MEQxRjdGRTdFRDYyOUNBMDJDRjI1RDgwODM4Mjg3RDZBOTNGMUE2NjA5OTIzRUVENEVBOUE1NjY2MzIzMTcyNTc=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "ODg5Njk2Q0Q4QjY1MDUxNEM2NjQ0NTYyRUVCNTZFMDZBQjNCNjU2MTA4RTAxNDA5NzNBMUIwNjNBMkQwQzkwMzY0RDJDMjFGQTY2RjlDOUM=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "ODg5Njk2Q0Q4QjY1MDUxNEM2NjQ0NTYyRUVCNTZFMDZBQjNCNjU2MTA4RTAxNDA5NzNBMUIwNjNBMkQwQzkwMzY0RDJDMjFGQTY2RjlDOUM=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "Q0NDNDYwODY3NkI5RTdBOEUwNUVDNDY0OUQxMTBERTQxNjFFMzcxRkU1NDQxMDBFNDVDMjFCNTc5NkIwRUJFN0ZENkFCQThCQkVGMkJCQjk=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "Q0QzOEQwMTcyMTkzNkI4MEEwOTY2OEVCRjNCMDYwNzU4MUZFODkwNUMwMTY3NDdDN0VCMTc4RkM4MDIwMzBENjg1MzcyMDAzNERDM0I5QjQ=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "QjRDQ0MzQUEzOTI3NDZCNkNGMEY0OTUxRUMwMEI4RkU4OTYzM0MxMkYzQkEzOTlBOERBNTJFQkYxOTBBQUQ0NDhCOURGQzlBOUU0QzZGQTU=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "QzUxNUVCOTlDNDUxNEJCMzg5Q0U1NkZDN0M5QkU5NEU5RjA0QUFCM0E2MDA0NTQwMkU3OEFFNTgyMkU4N0IzNjIwMkM4Q0I3RjdGMTAyMUE=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "RDkzNUYyNjMyQjY2QzA3NTc4QjVGOUM2NDFDQUE1MjgxNDU2NDE1Q0FBODVFMDI2M0I0RkI5REYyMEU3MDI1RENCQUU4RjNGQzA1MkMyQUU=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "RTNBMUVCMTE1NTc0OUVGNUYwNUVDMDlCQzQ1NjBFODZGMUJDQ0E5RjU4MEIzMTZFMUJDMjFCNkU2RTUxRkJEMjU1NTA4RjkxNDYxN0NEMjE=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "RkU5RUJGMTJGQjUxOUIxMDNEMTREODU4NTNCMTc5ODlGQjIyMkZDMTJDNjg0MjY4NDg1NzBERTg5NDQ4QzE5NTJGRDE4OUExRjNEMUM4NjQ=",
        "key": "pg-brand-health-tracker-nigeria",
        "value": 1
    }, {
        "id": "MjE3OTAxMjI3ODJCMTkzMEZGRTk3MTFFREQ5RkQ0RjBCMkY4Qjk5ODY5MUM2ODFEMjE1NzQ4NDQzNDI5Q0I0NkM3RUFFOTY0Qzk5NkU1MjI=",
        "key": "pg-brand-health-tracker-southafrica",
        "value": 1
    }, {
        "id": "MkY0RDYxQjQzNDYxQ0Y3Nzg0RDlBMEMxMzdBOUM0RUNCRkIzQkU4ODMwOEIwNEUyNDZCNjk5NEYyRjEyN0U3MjRCMzQ2ODc5MTZGQjhCNkM=",
        "key": "pg-brand-health-tracker-southafrica",
        "value": 1
    }, {
        "id": "NDY4QjlEN0M3NTZDQ0VEQUZFMjBDQjFDQjVFOEZCRTYwRDY4MTUzMjVDOEI4ODUwQTI4NUY4MjBGMTE3RENFREQ2NEEwOTVEOUU3NURDOTA=",
        "key": "pg-brand-health-tracker-southafrica",
        "value": 1
    }, {
        "id": "NTc5QjM1NTY2OUEwMTQ5NDJDRDgxRDFDQzBBMUM2MkZGREQ0MjE0OThCNEE0NzQ1RjBDRThGOTRFMjE4MkMwNjczRTIxQkQ2RjYwNzIyNTI=",
        "key": "pg-brand-health-tracker-southafrica",
        "value": 1
    }, {
        "id": "NzAxQkFGQjU0NzI4NTY0MEQxRjdGRTdFRDYyOUNBMDJDRjI1RDgwODM4Mjg3RDZBOTNGMUE2NjA5OTIzRUVENEVBOUE1NjY2MzIzMTcyNTc=",
        "key": "pg-brand-health-tracker-southafrica",
        "value": 1
    }, {
        "id": "NzYwODcyOEUxRDIzRDc4NUNEODBERjA3QTZBRDVCM0IwODQyQjA1QUY5QTY2RkM2ODJDNDM0RDZFMkMzMzRBMkE1QUE3QUU0OTNBRUE0MUE=",
        "key": "pg-brand-health-tracker-southafrica",
        "value": 1
    }, {
        "id": "Q0NDNDYwODY3NkI5RTdBOEUwNUVDNDY0OUQxMTBERTQxNjFFMzcxRkU1NDQxMDBFNDVDMjFCNTc5NkIwRUJFN0ZENkFCQThCQkVGMkJCQjk=",
        "key": "pg-brand-health-tracker-southafrica",
        "value": 1
    }
    ]
}

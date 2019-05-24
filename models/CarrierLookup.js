var mongoose = require('mongoose');

var schema = new mongoose.Schema({
    "processed": {type: Boolean},
    "createdDate": {type: Date},
    "internal_carrierid":  { type: Number },
    "country_code":  { type: String },
    "phone_number":  { type: String },
    "national_format":  { type: String },
    "carrier": {
        "mobile_country_code": { type: String },
        "mobile_network_code":  { type: String },
        "name":  { type: String },
        "type":  { type: String },
        "error_code":  { type: Number }
    }
});

var CarrierLookup = mongoose.model('CarrierLookup', schema);
module.exports = CarrierLookup;
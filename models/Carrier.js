var mongoose = require('mongoose');

var carrierSchema = new mongoose.Schema({
	name: {type: String},
	mobile_country_code: {type: String},
    mobile_network_code: {type: String},
    matchingRegex: {type: Array}
});

var Carrier = mongoose.model('Carrier', carrierSchema);

module.exports =  Carrier;
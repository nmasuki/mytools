const mongoose = require('mongoose');
const request = require('request');
var sync = require("./drink.sync.js");

var DrinksSchema = new mongoose.Schema({
    name: {type: String, required: true, unique: true},
    price: {type: Number, required: true},
    image: {type: String, required: true},
    category: {type: String, required: true},
    quantity: {type: String, required: true},
    desc: {type: String},
    alt: {type: String},
    front: {type: Boolean, default: false},
    url: {type: String, required: true, unique: true},
    quantities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quantity'
    }]
})

var Drink = mongoose.model('Drink', DrinksSchema);

Drink.syncFillDescription = sync.fillDescription;
Drink.pruneMissing = sync.pruneMissing;
Drink.syncFillIn = sync.fillIn;
Drink.syncSave = sync.save;
Drink.syncGet = sync.get;

Drink.api = function () {
    return new Promise(function (fulfill, reject) {
        request('https://www.dialadrinkkenya.com/products.json', {json: true}, (err, res, body) => {
            if (err)
                reject(err)
            else
                fulfill(body);

            return body;
        });
    });
}

module.exports = Drink;
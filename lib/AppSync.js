//mongoose connection
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1:27017/drinks');

const Quantity = require('../models/quantity');
const Drink = require('../models/drink.model');
const Crawler = require("./Crawler");

function AppSync() {
    var self = this;

    self.syncUrl = function () {
        var crawler = new Crawler();
        crawler.crawl("https://dialadrinkkenya.com");
    }

    self.sync = function () {
        Drink.find({}).populate('quantities').exec(function (err, drinks) {
            if (err)
                throw "Error fetching drinks!";
            var i = 0;
            drinks.orderBy(d => Math.random()).forEach(doc => {
                var yearRegex = /([\d]+)\s(years?)/gi;
                var fullName = doc.name.trim();
                var ageOption = yearRegex.test(fullName) ? fullName.match(yearRegex).first() : "";
                var name = (ageOption ? fullName.replace(yearRegex, fullName.match(yearRegex).join(" ")) : fullName).trim();
                doc._id = doc._id.toString();


                var data = {
                    page: doc.url,
                    name: name,
                    owner: 'none',
                    type: 'Product',
                    category: doc.category,
                    categories: [doc.category],
                    subcategory: doc.image.replace(/[\W]+/g, ' ').toProperCase(),
                    description: doc.desc || "",
                    imageUrl: `https://dialadrinkkenya.com/uploads/${encodeURI(doc.name)}.jpg`,
                    price: doc.price,
                    currency: "KES",
                    options: doc.quantities.map(q => {
                        return {
                            name: q.quantity,
                            price: q.price,
                            currency: "KES"
                        }
                    })
                };
                if (doc.front) data.categories.push("offer");

                setTimeout(function () {
                    console.log(doc.url);
                    Drink.syncFillIn({}, data);
                }, ++i * 500);
            })
        });
    }
}

module.exports = AppSync;




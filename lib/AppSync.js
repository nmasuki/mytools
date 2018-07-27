//mongoose connection
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1:27017/drinks');

const Quantity = require('../models/quantity');
const Drink = require('../models/drink.model');
const Crawler = require("./Crawler");

function AppSync() {
    var self = this;

    self.syncCrawler = function () {
        var crawler = new Crawler();
        crawler.crawl("https://dialadrinkkenya.com");
    }

    self.sync = function () {
        Drink.api().then(drinks => {
            if (!drinks)
                throw "Error fetching drinks!";

            var i = 0;
            var map = drinks.map(doc => {
                var yearRegex = /([\d]+)\s(years?)/gi;
                var fullName = doc.name.trim();
                var ageOption = yearRegex.test(fullName) ? fullName.match(yearRegex).first() : "";
                var name = (ageOption ? fullName.replace(yearRegex, fullName.match(yearRegex).join(" ")) : fullName).trim();

                var data = {
                    name: name,
                    page: (doc.url || "").split("/").pop(),
                    owner: 'none',
                    type: 'Product',
                    popularity: doc.popularity,
                    category: (doc.category || "").toLowerCase(),
                    categories: (doc.categories || [doc.category]).map(c => (c || "").toLowerCase()),
                    subcategory: (doc.subcategory || doc.image || "").replace(/[\W]+/g, ' ').toProperCase(),
                    description: (doc.description || doc.desc || "").trim(),
                    imageUrl: doc.image || `https://dialadrinkkenya.com/uploads/${encodeURI(doc.name)}.jpg`,
                    price: doc.price,
                    currency: doc.currency || "KES",
                    options: doc.options || doc.quantities.map(q => {
                        return {
                            name: q.quantity,
                            price: q.price,
                            currency: "KES"
                        }
                    })
                };
                data._id = "product-" + ((data.page || "").trim().replace(/[\W]+/g, '-').trim("-") || data.name.replace(/[\W]+/g, '-'))
                    .toLowerCase();

                if (doc.front) data.categories.push("offer");
                if (!data.subcategory || data.subcategory == "Image" ||
                    data.subcategory.startsWith("Http") ||
                    data.subcategory.startsWith("N A")) {
                    var nameRegex = new RegExp(`(${doc.name.split(' ').map(s => s.replace(/[\W.]+/g, ' ')).join(")|(")})`, "ig");
                    data.subcategory = decodeURI(data.page || "")
                        .replace(/[\W.]+/g, ' ').toProperCase()
                        .replace(nameRegex, "")
                        .replace(new RegExp("[ ]+", "g"), ' ')
                        .replace(data.category.toProperCase(), "")
                        .trim();
                }

                return data;
            });

            map.orderBy(d => Math.random())
                .forEach(data => setTimeout(Drink.syncFillIn, ++i * 250, {}, data));

            Drink.pruneMissing(map);
        })
    }
}

module.exports = AppSync;
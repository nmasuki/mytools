/**
 * Created by nmasuki on 2/6/2018.
 */

var Drink = require('../../models/drink.model');
function Handler() {
    var handler = {
        'dialadrinkkenya.com': function ($, uri, json) {
            var yearRegex = /([\d]+)\s(years?)/gi;
            var urlParts = uri.path.split('/').filter(c => c && c != "category" && c != "product")
            var category = (urlParts.first() || "offer").split("-").last(l => !/\d/.test(l[0]));
            var subCategory = urlParts.nth(null, 2);

            Array.from($("[itemtype$=Product]")).forEach(a => {
                var fullName = $(a).find("span[itemprop=name]").text().trim();
                var ageOption = yearRegex.test(fullName) ? fullName.match(yearRegex).first() : "";
                if (yearRegex.test(fullName))
                    ageOption = fullName.match(yearRegex).first();

                var page = decodeURIComponent($(a).find("a").attr("href"));
                var name = (ageOption ? fullName.replace(yearRegex, fullName.match(yearRegex).join(" ")) : fullName).trim();
                var _id = page.toLowerCase().replace(/[\W]+/g, '-').trim('-');

                var _data = {
                    page: page,
                    name: name,
                    owner: 'none',
                    type: 'Product',
                    category: category || "offer",
                    categories: category ? [category] : [],
                    subcategory: subCategory,
                    imageUrl: `${uri.protocol}//${uri.host}${encodeURI($(a).find("img").attr("src"))}`,
                    price: parseFloat($(a).find("span[itemprop=price]").text().trim()),
                    currency: $(a).find("span[itemprop=price]").parent().text().trim().split(' ').first()
                };

                Drink.syncGet(_id, function (err, row, meta) {
                    if (row) {
                        var categories = row.categories || (category ? [category] : []);
                        if (!categories.any(c => c == category))
                            categories.push(category);

                        _data.categories = categories;
                        _data.category = categories.first(c => c && !c.startsWith("offer")) || "offer";

                        if (row.price != _data.price) {
                            _data.options = _data.options || [];

                            if (row.options) {
                                for (var i in row.options) {
                                    if (row.options[i] && !_data.options.any(o => o.price == row.options[i].price))
                                        _data.options.push(row.options[i]);
                                }
                            }

                            if (!_data.options.any(o => o.price == row.price))
                                _data.options.push({
                                    name: "Option " + (_data.options.length + 1),
                                    price: row.price,
                                    currency: row.currency
                                });

                            if (!_data.options.any(o => o.price == _data.price))
                                _data.options.push({
                                    name: ageOption || "Option " + (_data.options.length + 1),
                                    price: _data.price,
                                    currency: _data.currency
                                });

                        }
                    } else
                        row = row || {};


                    _data = Object.assign({}, row || {}, _data);

                    var diff = Object.diff(_data, row);
                    if (Object.keys(diff).length)
                        Drink.syncSave(_id, row._rev, _data);

                    if (_data.category != "offer")
                        Drink.syncFillDescription(_id, _data);
                })
            })

            if (uri.path.indexOf("/product/") >= 0) {
                var page = uri.path;
                var fullName = $("#cart > div.row > div:nth-child(1)").text().trim();
                var ageOption = yearRegex.test(fullName) ? fullName.match(yearRegex).first() : "";
                var name = (ageOption ? fullName.replace(yearRegex, fullName.match(yearRegex).join(" ")) : fullName).trim();
                var _id = page.toLowerCase().replace(/[\W]+/g, '-').trim('-');
                var priceText = $("#cart > div.row > div.col-md-6 > div:nth-child(1) > div.col-md-4").text().trim();
                var description = ($("#cart > div.col-md-12 > div.col-md-8").html() || "").trim();

                var nameKey = fullName.toLowerCase().replace(/[\W]+/g, "-");
                var subCategory = page.replace("/product/", "").replace(nameKey, "").trim("-");

                if (subCategory != page.replace("/product/", "")) {
                    category = subCategory ? subCategory.split("-").last(l => !/\d/.test(l[0])) : "offer";
                } else {
                    subCategory = undefined;
                }

                if(subCategory)
                    subCategory = subCategory.replace(/[\W]+/, ' ').toProperCase();

                var options = Array.from($("select.quantity").find("option").map(function (i, e) {
                    return {
                        name: $(e).text().trim().split(/(\d+(?:.\d+)?)\s*(\w+)/).join(" ").trim().toProperCase(),
                        price: parseFloat($(e).attr("value")),
                        currency: priceText.toUpperCase().split(' ').first()
                    }
                }));

                if (options.length) {
                    Drink.syncGet(_id, function (err, row, meta) {
                        var _data = {
                            page: page,
                            name: name,
                            owner: 'none',
                            type: 'Product',
                            category: category,
                            subcategory: subCategory,
                            description: description,
                            imageUrl: `${uri.protocol}//${uri.host}${encodeURI($("#cart > div.row > div.col-md-5 > div > a > img").attr("src"))}`,
                            price: options[0].price,
                            currency: options[0].currency || priceText.toUpperCase().split(' ').first(),
                            createdAt: new Date().toISOString()
                        };
                        Drink.syncFillIn(row, _data);
                    });
                }
            }
        }
    };

    return handler;
}

module.exports = Handler();
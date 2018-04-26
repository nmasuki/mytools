/**
 * Created by nmasuki on 9/15/2017.
 */
var Crawler = require("crawler");
var MongoRepo = require("./common/MongoRepo");
var couchbase = require("couchbase");
var N1qlQuery = couchbase.N1qlQuery;

function MyCrawler(){

    var repo = new MongoRepo("dialadrink");
    var cluster = new couchbase.Cluster('http://ec2-18-217-219-161.us-east-2.compute.amazonaws.com');
    cluster.authenticate('admin', 'admin@Mai');
    var bucket = cluster.openBucket('dialadrink', function(err) {
        if (err) {
            // Failed to make a connection to the Couchbase cluster.
            throw err;
        }
    });
    bucket.operationTimeout = 360 * 1000;

    function proccessContent($, uri, json){
        var title = $("title").text();
        var headers = $("h1, h2, h3, h4");

        var category = uri.path.split('/').filter(c=>c && c != "category");

        Array.from($("[itemtype$=Product]")).forEach(a=>{
            var page = $(a).find("a").attr("href");

            var _data = {
                page: page,
                type: 'Product',
                category: category.first() || "offer",
                subcategory: category.nth(null, 2),
                imageUrl: `${uri.protocol}//${uri.host}${$(a).find("img").attr("src")}`,
                name: $(a).find("span[itemprop=name]").text().trim(),
                price: $(a).find("span[itemprop=price]").text().trim(),
                currency: $(a).find("span[itemprop=price]").parent().text().trim().split(' ').first(),
                modifiedDate: new Date()
            };
            bucket.insert(page, _data, function(err, res) {
                if (err) {
                    // Failed to make a connection to the Couchbase cluster.
                    throw err;
                }
            });
            /*
            bucket.get(page, function(err, row, meta) {
                row = row || {}
                if(row.value)
                    console.log('Name: %s. Email: %s', row.value.name, row.value.type);

                if(row.value){
                    bucket.upsert(page, Object.assign(_data, row.value), function(err, res) { });
                }else{
                    bucket.insert(page, _data, function(err, res) { });
                }

            });*/

            repo.find({page:page})
                .catch(console.debug)
                .then(function(data){
                    var prod = Object.assign(data.first()||{}, _data );
                    repo.save(prod)
                });

        })

    }

    var links = [];
    var c = new Crawler({
        maxConnections: 10,
        // This will be called for each crawled page
        callback: function (error, res, done) {
            if (error) {
                console.log(error);
            } else {
                var $ = res.$;
                var json = res.toJSON();

                // $ is Cheerio by default
                //a lean implementation of core jQuery designed specifically for the server
                var newLinks = [];
                var uri = json.request.uri;

                if (typeof $ == "function") {
                    $("a").each(function (i, b) {
                        var href = b.attribs.href;
                        if (!href || href[0] == '#' || /(mailto\:)/i.test(href)) return;

                        if (href.indexOf("://") < 0) {
                            var pathEscaped = uri.path.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g, '\\$&');
                            var pathReg = new RegExp("(" + pathEscaped + ")$")
                            var url = uri.href.replace(pathReg, "");
                            if (href[0] == '/')
                                href = url + href;
                            else
                                href = url + '/' + href;
                        }

                        if (href && links.indexOf(href) < 0 && newLinks.indexOf(href) < 0 && href.indexOf("dialadrink") >0) {
                            newLinks.push(href);
                        }
                    });

                    links = links.concat(newLinks);

                    if (newLinks && newLinks.length)
                        newLinks.forEach(l=>c.queue(l));

                    console.log($("title").text() + ".", uri.href ,newLinks.length? newLinks.length + " links found.":"");
                    proccessContent($, uri, json);
                }

            }
            done();
        }
    });

    this.crawl = function(){
        Array.from(arguments).filter(l=>{
            return l && /(http|ftp)/.test(l.toString())
        }).forEach(l=>c.queue(l));
    }
}

module.exports.Crawler = MyCrawler;






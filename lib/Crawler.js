/**
 * Created by nmasuki on 9/15/2017.
 */
var Crawler = require("crawler");
var Handler = require("./helpers/crawler_url_hundeler");
function MyCrawler() {

    var links = [];
    var c = new Crawler({
        maxConnections: 3,
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

                        if (href && links.indexOf(href) < 0 && newLinks.indexOf(href) < 0 && href.indexOf(uri.host) > 0) {
                            newLinks.push(href);
                        }
                    });

                    links = links.concat(newLinks);

                    if (newLinks && newLinks.length)
                        newLinks.forEach(l => c.queue(l));

                    console.log($("title").text().trim() + "." + uri.href, newLinks.length ? newLinks.length + " links found." : "");
                    if(Handler && typeof Handler[uri.host] == "function")
                        Handler[uri.host]($, uri, json);
                }

            }
            done();
        }
    });

    this.crawl = function () {
        Array.from(arguments).filter(l => {
            return l && /(http|ftp)/.test(l.toString())
        }).forEach(l => c.queue(l));
    }
}

module.exports.Crawler = MyCrawler;






var express = require('express')
    , bodyParser = require('body-parser');

var request = require('request').defaults({json: true})
    , httpProxy = require('http-proxy')
    , host = "127.0.0.1:4985"
    , db = "dialadrink"
    , app = express();

function authChecker(req, res, next) {
    if (req.headers.authorization || req.path === '/auth') {
        var auth = new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString().split(':');
        next();
    } else if(req.headers["user-agent"].startsWith("curl/")){
        next();
    } else {
        res.redirect("/auth");
    }
}

function fetchUserObject(req, res, next) {
    if (req.headers.authorization || req.path === '/auth') {
        next();
    } else if(req.headers["user-agent"].startsWith("curl/")){
        next();
    } else {
        res.redirect("/auth");
    }
}

var protectedBearer = [authChecker, fetchUserObject]
var protectedBasic = [authChecker, fetchUserObject]
var unprotected = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use('/signup', bodyParser.json());

// Sign up
app.post('/signup', protectedBearer, function (req, res) {
    var json = req.body;
    var signupUrl = `http://${host}/${db}/_user/`;

    console.log('Its signup time', signupUrl, json);

    var options = {
        url: signupUrl,
        method: 'POST',
        body: json
    };

    request(options, function (error, response) {
        //res.writeHead(response.statusCode);
        res.send(response.body);
        res.end();
    });
});

// All other requests. Disable in prod
/*/
app.all('*', protectedBasic, function (req, res) {
    req.pipe(request(`http://${host}${req.url}`)).pipe(res);
});
/**/


var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('App listening at http://%s:%s', host, port);
});
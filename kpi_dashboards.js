var request = require('request');
var randomstring = require("randomstring");
var parser = require('nomnom');
var colors = require('colors');
var arrUserPasses = []
var arrAcl = []
var arrVirtualHost = []
/*var cloudant = 'https://mai.cloudant.com'
getVirutalHosts();
function getVirutalHosts() {
    var url = 'https://cloudant.geopoll.com/_api/v2/user/virtual_hosts'
    var options = {
        url: url,
        auth: {
            'user': 'mai',
            'pass': 'MobbingCords'
        }
    };
    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            //console.log('got a body')
            var bodyObj = JSON.parse(body);
            var virtualHostsObj = bodyObj.virtual_hosts;
            for (var i = 0, len = virtualHostsObj.length; i < len; i++) {
                generateInfo(virtualHostsObj[i]);
            }
            console.log(arrUserPasses);
            console.log(arrAcl);
            console.log(arrVirtualHost);
        } else {
            throw error
        }
    };
    request(options, callback);
};*/

var args = parser
    .option('dns', {
        default: "tb.geopoll.com",
        help: 'endpoint. ex: sector-survey.geopoll.com ',
        abbr: 'd'
    })
    .option('rewrite', {
       // default: "/tb",
        help: 'where it goes. ex: "/sector-survey/_design/app/_rewrite"',
        abbr: 'r'
    })
    .option('couchHost', {
        default: "https://mai:MobbingCords@couchdb.geopoll.com/",
        help: "couchDB host with Auth",
        abbr: 'c'
    })
    .parse();


start();

function start() {
    //create the virtualHostObj
    console.log('Post green text into a ticket as assign to Tech!')
    virtualHostObj = [args.dns, args.rewrite]
    generateInfo(virtualHostObj);
    console.log(colors.green('Create FW ACL record with "%s"'), arrAcl);
    //console.log('Copy paste into local.ini [VirutalHost] section "' + arrVirtualHost + '"')
    return;
};

function generateInfo(virtualHostObj) {
    var password = randomstring.generate();
    var username = virtualHostObj[0]
    arrUserPasses.push({
        username,
        password
    })
    var body = {
        "_id": "org.couchdb.user:" + username,
        "name": username,
        "type": "user",
        "roles": [],
        "password": password
    };
    var secBody = {
        "admins": {
            "names": [],
            "roles": [
                "_admin"
            ]
        },
        "members": {
            "names": [
                "" + username
            ],
            "roles": [
                "_admin"
            ]
        }
    };
    createUser(username, body);
    modSecurity(username, secBody);
    authstring = generateAuth(username, password);
    generateAcl(authstring, virtualHostObj);
    getCouchNodes(args.couchHost, virtualHostObj);
};

function createUser(username, body) {
    var couchDBuser = 'https://couchdb.geopoll.com/_users/org.couchdb.user:' + username
    var options = {
        url: couchDBuser,
        method: 'PUT',
        auth: {
            'user': 'mai',
            'pass': 'MobbingCords'
        },
        headers: [{
            name: 'content-type',
            value: 'application/json'
        }],
        body: JSON.stringify(body)
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 201) {
            //console.log('Created user ' + username)
            return;
        } else {
            //throw error
            console.log('ERROR in creating user: '+username+ '. They might have already been created: ' + error)
        }
    };
    request(options, callback);
};

function modSecurity(username, secBody) {
    db = username.replace('.geopoll.com', '');
    var couchdbDBSecurity = 'https://couchdb.geopoll.com/' + db + '/_security'
    var options = {
        url: couchdbDBSecurity,
        method: 'PUT',
        auth: {
            'user': 'mai',
            'pass': 'MobbingCords'
        },
        headers: [{
            name: 'content-type',
            value: 'application/json'
        }],
        body: JSON.stringify(secBody)
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
           // console.log('Modified Security doc for db ' + db)
            return;
        } else {
            //throw error
            console.log('ERROR in modifying the ' + db + ' security doc while adding the user: '+username+ '\nError:' + error)
        }
    };
    request(options, callback);
};

function generateAuth(username, password) {
    //random that shiz
    var authString = (username + ':' + password);
    var authString = Buffer(authString).toString('base64');
    return authString;
};

function generateAcl(authstring, virtualHostObj) {
    //creates the ACL string for FW
    var acl = (virtualHostObj[0] + ' reqadd Authorization:\\ Basic\\ ' + authstring + ' if ' + virtualHostObj[0])
    arrAcl.push(acl)
    return;
};

function getCouchNodes(couchHost) {
    //grabs nodes from current cluster
    couchHostNodes = couchHost + '_membership'
    //console.log(couchHostNodes)
    var options = {
        url: couchHostNodes,
        method: 'GET',
        auth: {
            'user': 'mai',
            'pass': 'MobbingCords'
        }
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            arrNodes = JSON.parse(response.body);
            arrNodes = arrNodes.all_nodes;
            nodeCount = arrNodes.length;
            arrNodes.forEach(function (node) {
               // console.log('Performing tasks for node ' + node)
                createVirtualHost(virtualHostObj, node, nodeCount)
            })
        } else {
            //throw error
            console.log('ERROR in modifying the ' + db + ' security doc: ' + error)
        }
    };
    request(options, callback);
}

function createVirtualHost(virtualHostObj, node) {
    var rewrite = virtualHostObj[1];
    var host = virtualHostObj[0]
    var count = 0;
    hostname = node.replace('couchdb@','')
    var virtualHostConfig = 'http://' + hostname + ':5986/_config/vhosts/' + host
    var options = {
        url: virtualHostConfig,
        method: 'PUT',
        auth: {
            'user': 'mai',
            'pass': 'MobbingCords'
        },
        headers: [{
            name: 'content-type',
            value: 'application/json'
        }],
        body: JSON.stringify(rewrite)
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            //console.log('Modified Config for  ' + node);
            count++
            if (count = nodeCount){
                return;
            }
        } else {
            //throw error
            console.log('ERROR in modifying the config on node: '+node+' Error: ' + error);
        }
    };
    request(options, callback);
}

/*
function restartNode(node) {
    hostname = node.replace('couchdb@','')
    var restartNode = 'http://' + hostname + ':5986/_restart'
    var options = {
        url: restartNode,
        method: 'POST',
        auth: {
            'user': 'mai',
            'pass': 'MobbingCords'
        }
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log('Restarted node ' + node);
            return;
        } else {
            //throw error
            console.log('ERROR in restarting ' + node + '\nError:\n' + error)
        }
    };
    request(options, callback);
}*/
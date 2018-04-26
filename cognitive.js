/**
 * Created by nmasuki on 9/29/2017.
 */
require('./lib/common/polyfills.js');
var fs = require('fs');
var najax = require('najax');
var ibmCV = {
    "url": "https://gateway-a.watsonplatform.net/visual-recognition/api",
    "detect_faces": "v3/detect_faces",
    "classify": "v3/classify",
    "note": "It may take up to 5 minutes for this key to become active",
    "api_key": "b0e7d0e11b17bf0b4408719eabafb3f3f68cfd23"
}

var image_file = [
    'https://couchdb.geopoll.com/binarycontent/binarycontent-d2b73ebc-99e3-46a7-9910-cb2c8b77e733/60068bb5-8ed1-4e76-881f-8b9032e6abe7.jpg',
    'https://watson-developer-cloud.github.io/doc-tutorial-downloads/visual-recognition/fruitbowl.jpg',
];

function saveDocument(doc, database){
    return najax.post({
        url: 'https://mai:MobbingCords@couchdb.geopoll.com/'+database,
        contentType: "application/json",
        dataType: 'json',
        data: JSON.stringify(doc),
        success: console.log,
        error: console.error
    });
}

function getIBMWatsonClassification(doc, callback) {
    if(doc.IBMWatsonClasses) {
        console.warn("Watson classification already done..");
        return;
    }
    var imageUrl = "https://couchdb.geopoll.com/binarycontent/{0}/{1}".format(doc._id, doc.Name);
    najax.get({
        url: [ibmCV.url, "v3/classify"].join("/"),// + ['api_key=' + ibmCV.api_key, 'version=2016-05-20', 'url=' + image_file],
        contentType: "application/json",
        dataType: 'json',
        data: {
            api_key: ibmCV.api_key,
            version: '2016-05-20',
            url: imageUrl,
        },
        success: function (data) {
            if (data && data.images) {
                data.images.forEach(img => {
                    var classes = [];

                    for (var i in img.classifiers) {
                        var classifier = img.classifiers[i];
                        for (var j in classifier.classes) {
                            classes.push(Object.assign({
                                classifier: classifier.Name,
                            }, classifier.classes[j]));
                        }
                    }
                    if(typeof callback == "function")
                        callback(classes);
                    else
                        console.log(classes)
                })
            }
        },
        error: function () {
            console.log("Making api call..")
            console.log.apply(this, arguments);
        }
    });
}

function getLastChangesSequence(database){
    var sequence = {};
    if(fs.existsSync('./sequence.json'))
        sequence = require('./sequence.json')||{};

    return sequence[database] || 'now';
}

function saveLastChangesSequence(database, sequenceKey){
    var json, sequence = {};
    if(fs.existsSync('./sequence.json')){
        fs.readFile('./sequence.json', d=>{
            json = d || '{}';
            sequence = JSON.parse(json);
            sequence[database] = sequenceKey;
            json = JSON.stringify(sequence);

            fs.truncate('./sequence.json', 0, function() {
                fs.writeFile('./sequence.json', json, function (err) {
                    if (err)
                        return console.log("Error writing file: " + err);
                });
            });
        });
    } else {
        sequence[database] = sequenceKey;
        json = JSON.stringify(sequence);

        fs.writeFile('./sequence.json', json, function (err) {
            if (err)
                return console.log("Error writing file: " + err);
        });
    }


}

function getDataChanges(database, callback,  batchSize){
    return najax.get({
        url:'https://mai:MobbingCords@couchdb.geopoll.com/'+database+'/_changes',
        contentType: "application/json",
        dataType: 'json',
        data:{
            since: getLastChangesSequence(database),
            limit: batchSize || 100,
            include_docs: true
        },
        success: function(data){
            if(typeof callback == "function")
                callback.call(this, data);
            else
                console.log(data);

            if(data && data.last_seq)
                saveLastChangesSequence(database, data.last_seq)

        }
    });
}

getDataChanges("binarycontent", function(data){
    data.results.forEach(row => {
        getIBMWatsonClassification(row.doc, function(classes){
            var _classes = classes.distinctBy(c=>c.class);
            row.doc.IBMWatsonClasses = _classes;
            saveDocument(row.doc, "binarycontent");
        })
    });
});

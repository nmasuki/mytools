/**
 * Created by nmasuki on 11/5/2017.
 */
var MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

function MongoRepo(dbName, colName, host) {
    var db, col;
    var self = this;
    dbName = dbName || "objects";
    colName = colName || dbName;
    host = host || "localhost";

    function cleanMongoObject(obj){
        var _obj = JSON.parse(JSON.stringify(obj));
        Object.keys(_obj || {}).forEach(k=>{
            if(Array.isArray(_obj[k]))
                _obj[k] = _obj[k].map(cleanMongoObject);
            else if(typeof _obj[k] == "object")
                _obj[k] = cleanMongoObject(_obj[k]);
            else{
                var key = k.replace(/[.]+/g, ">");
                if(key!=k) {
                    _obj[key] = _obj[k];
                    delete _obj[k];
                }
            }
        });
        return _obj;
    }

    self.save = function (data) {
        data = cleanMongoObject(data);

        function insert(){
            console.olog(`Creating [${colName}]...`);
            data.createdAt = data.createdAt || new Date().toISOString();
            // Insert a single document
            col.insertOne(data, function (err, r) {
                if (err)
                {
                    if(err.message.startsWith("E11000 duplicate key error"))
                        update();
                    else
                        throw `Error while updating on mongo '${err.message}'`;
                }
                else
                    assert.equal(1, r.insertedCount);
            })
        }

        function update(){
            console.olog(`Updating [${colName}]...`);

            // Update a single document
            var _id = data._id;
            delete data._id;

            data.createdAt = data.createdAt || data.modifiedAt || new Date().toISOString();
            data.modifiedAt = new Date().toISOString();

            col.updateOne({_id: _id}, {$set: data}, function (err, r) {
                if (err)
                    throw `Error while updating on mongo '${err.message}'`;
            })
        }

        if (data && !data._id) {
            return insert.retryCall(self, () => col, 5, 100);
        } else if (data) {
            return (() => col.findOne({_id: data._id}, function (err, doc) {
                if (err )
                    throw `Error while updating on mongo '${err.message}'`;
                else{
                    if(doc)
                        update();
                    else
                        insert();
                }
            })).retryCall(self, () => col, 5, 100);
        } else {
            throw "Missing parameter [data._id]!";
        }
    }

    self.findOne = function(select){
        return new Promise(function (fulfill, reject) {
            (() => {
                var r = col.findOne(select, function (err, result) {
                    if (err)
                        reject(err, `Error while updating on mongo '${err.message}'`);

                    fulfill(result);
                });
            }).retryCall(self, () => col, 5, 100);

        }).catch(console.debug);
    }

    self.find = function(select){
        return new Promise(function (fulfill, reject) {

            (() => col.find(select, function (err, results) {
                if (err)
                    reject(err, `Error while updating on mongo '${err.message}'`);
                else
                    fulfill(results)
            })).retryCall(self, () => col, 5, 100);

        }).catch(console.debug);
    }

    self.getCollection = (callback) => {
        if (typeof callback == "function") {
            if (col)
                callback.call(this, null, col);
            else {
                initialize(callback);
            }
        }
        return col;
    };

    // Use connect method to connect to the Server
    function initialize(callback) {
        MongoClient.connect(`mongodb://${host}:27017/${dbName}`, function (err, mongoclient) {
            if(err){
                console.error(`Failed to connect to mongo ${host}`, err);
            }else{
                db =  mongoclient.db(dbName);
                col = db.collection(colName);
                if (typeof callback == "function")
                    callback.call(this, err, col);
                console.log(`Connected mongodb '${dbName}.${colName}'!`);
            }
        });
    }

    initialize((err, collection) => {
        assert.equal(null, err);
    });
}

module.exports = MongoRepo;
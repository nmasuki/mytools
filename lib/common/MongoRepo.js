/**
 * Created by nmasuki on 11/5/2017.
 */
var MongoClient = require('mongodb').MongoClient
    , assert = require('assert'), col = null;

function MongoRepo(dbName, colName, host) {
    var self = this;
    dbName = dbName || "objects";
    colName = colName || dbName;
    host = host || "localhost";

    self.save = function (data) {
        if (data && !data._id) {
            console.olog("Creating record.", data);
            // Insert a single document
            delete data.$id;
            return (() => col.insertOne(data, function (err, r) {
                if (err)
                    throw `Error while updating on mongo '${err.message}'`;
                else
                    assert.equal(1, r.insertedCount);
            })).retryCall(self, () => col, 5, 100);
        } else if (data) {
            console.olog("Updating to db.", data);
            // Update a single document
            var id = data._id;
            delete data._id;
            delete data.$id;
            return (() => col.updateOne({_id: id}, {$set: data}, function (err, r) {
                if (err)
                    throw `Error while updating on mongo '${err.message}'`;
            })).retryCall(self, () => col, 5, 100);
        } else {
            throw "Missing parameter [data._id]!";
        }
    }

    self.find = function(select){
        return new Promise(function (fulfill, reject) {

            (() => col.find(select).toArray(function (err, results) {
                if (err)
                    reject(`Error while updating on mongo '${err.message}'`);

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
        MongoClient.connect(`mongodb://${host}:27017/${dbName}`, function (err, db) {
            console.log("Connected correctly to mongodb.");
            col = db.collection(colName);
            if (typeof callback == "function")
                callback.call(this, err, col);
        });
    }

    initialize((err, collection) => {
        assert.equal(null, err);
    });
}

module.exports = MongoRepo;
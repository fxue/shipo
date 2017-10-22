#!/usr/bin/env node
var blockchain = require('mastercard-blockchain');
var MasterCardAPI = blockchain.MasterCardAPI;

const async = require('async'), encoding = 'base64', fs = require('fs');
var prompt = require('prompt');

var protobuf = require("protobufjs");
const express = require('express')
const app = express()
const port = 3000

app.put('/entry', (request, response) => {
  createEntry(request.query.content,(err,data) => {
     console.log(JSON.stringify(data))
     response.send(JSON.stringify(data))
  }
  )
})

app.get('/entry', (request, response) => {
  retrieveEntry(request.query.hash,(err,data) => {
     console.log(JSON.stringify(data))
     response.send(JSON.stringify(data))
  }
  )
})

var appID = null;
var msgClassDef = null;
var protoFile = null;

console.log(fs.readFileSync('help.txt').toString());
prompt.start();
initApi((err, result) => {
  app.listen(port, (err) => {
    if (err) {
      return console.log('something bad happened', err)
    }
    console.log(`server is listening on ${port}`)
  })
});

function updateNode(callback) {
    console.log('updateNode');
    async.waterfall([
        function (callback) {
            prompt.get({
                name: 'newProtoFile',
                description: 'Protofile',
                default: 'message.proto',
                required: true,
                conform: (value) => {
                    return fs.existsSync(value);
                }
            }, callback);
        },
        function (data, callback) {
            protoFile = data.newProtoFile;
            protobuf.load(protoFile, callback);
        },
        function (root, callback) {
            var nested = guessNested(root);
            if (nested && 2 == nested.length) {
                appID = nested[0];
                msgClassDef = root.lookupType(appID + "." + nested[1]);
                blockchain.App.update({
                    id: appID,
                    name: appID,
                    description: "",
                    version: 0,
                    definition: {
                        format: "proto3",
                        encoding: encoding,
                        messages: fs.readFileSync(protoFile).toString(encoding)
                    }
                }, callback);
            } else {
                callback('could not read message class def from proto file', null);
            }
        },
        function (result, callback) {
            blockchain.App.read(appID, {}, callback);
        }
    ], function (err, result) {
        if (err) {
            console.log('error', err);
        } else {
            console.log(result);
        }
        async.nextTick(callback, err, result);
    });
}

function createEntry(content,callback) {
    console.log('createEntry');
    async.waterfall([
        function (callback) {
            var payload = { text: content };
            var errMsg = msgClassDef.verify(payload);
            if (errMsg) {
                callback(errMsg, null);
            } else {
                var message = msgClassDef.create(payload);
                blockchain.TransactionEntry.create({
                    "app": appID,
                    "encoding": encoding,
                    "value": msgClassDef.encode(message).finish().toString(encoding)
                }, callback);
            }
        }
    ], function (err, result) {
        if (err) {
            console.log('error', err);
        } else {
            console.log(result);
        }
        async.nextTick(callback, err, result);
    });
}


function retrieveEntry(hash,callback) {
    console.log('retrieveEntry');
    var ctx = {};
    async.waterfall([
        function ( callback) {
            data = {"hash": hash}
            blockchain.TransactionEntry.read("", { "hash": data.hash }, callback);
        },
        function (data, callback) {
            ctx.data = data;
            var message = msgClassDef.decode(new Buffer(data.value, 'hex'));
            var object = msgClassDef.toObject(message, {
                longs: String,
                enums: String,
                bytes: String
            });
            callback(null, object);
        }
    ], function (err, result) {
        if (err) {
            console.log('error', err);
        } else {
            console.log('response', ctx.data, 'decoded', result);
        }
        async.nextTick(callback, err, result);
    });
}


function initApi(onDone) {
    console.log('initializing');
    async.waterfall([
        function ( callback) {
          var result = {
              "consumerKey" : "EjfzB6vGe8t39QaaxshrjxLnUBn4Xfx8l3RFdL2Xbcf313bd!d4a6543b3ea94588baa024138747b8be0000000000000000",
              "keystorePath" : "/Users/fei/Downloads/mastercard-1508622152-sandbox.p12",
              "storePass" : "keystorepassword",
              "keyAlias" : "keyalias",
              "protoFile" : "message.proto"
            }
            console.log(result)
            var authentication = new MasterCardAPI.OAuth(
                result.consumerKey, result.keystorePath, 
                result.keyAlias, result.storePass);
            MasterCardAPI.init({
                sandbox: true,
                //debug: argv.verbosity,
                authentication: authentication
            });
            protoFile = result.protoFile;
            protobuf.load(protoFile, callback);
        }
    ], function (err, root) {
        if (err) {
            console.log('error', err);
        } else {
            console.log("auth done")
            var nested = guessNested(root);
            if (nested && 2 == nested.length) {
                appID = nested[0];
                msgClassDef = root.lookupType(appID + "." + nested[1]);
                console.log('initialized');
            } else {
                console.log('could not read message class def from', protoFile);
            }
            console.log("auth done")
        }
        async.nextTick(onDone, err, appID);
    });
}


function getProperties(obj) {
    var ret = [];
    for (var name in obj) {
        if (obj.hasOwnProperty(name)) {
            ret.push(name);
        }
    }
    return ret;
}

function guessNested(root) {
    var props = getProperties(root.nested);
    var firstChild = getProperties(root.nested[props[0]].nested);
    return [props[0], firstChild[0]];
}

#!/usr/bin/env node
var blockchain = require('mastercard-blockchain');
var MasterCardAPI = blockchain.MasterCardAPI;

const async = require('async'), encoding = 'base64', fs = require('fs');
var prompt = require('prompt'), options = createOptions();

var protobuf = require("protobufjs");

var argv = options.argv;
prompt.override = argv;

var appID = null;
var msgClassDef = null;
var protoFile = null;

console.log(fs.readFileSync('help.txt').toString());
prompt.start();
initApi((err, result) => {
    if (!err) {
        processCommands();
    }
});

function processCommands() {
    async.waterfall([
        function (callback) {
            prompt.get(promptCmdSchema(), callback);
        }
    ], function (err, result) {
        if (!err) {
            switch (result.cmdOption) {
                case 1:
                    updateNode((error, data) => {
                        processCommandsAfter();
                    });
                    break;
                case 2:
                    createEntry((error, data) => {
                        processCommandsAfter();
                    });
                    break;
                case 3:
                    retrieveEntry((error, data) => {
                        processCommandsAfter();
                    });
                    break;
                case 4:
                    retrieveBlock((error, data) => {
                        processCommandsAfter();
                    });
                    break;
                case 5:
                    retrieveLastConfirmedBlock((error, data) => {
                        processCommandsAfter();
                    });
                    break;
                case 6:
                    fs.readFile(protoFile, (err, data) => {
                        if (err) {
                            console.log('error', err);
                        } else {
                            console.log(data.toString());
                        }
                        processCommandsAfter();
                    });
                    break;
                case 7:
                    done = true;
                    initApi((err, result) => {
                        if (!err) {
                            processCommandsAfter();
                        }
                    });
                    break;
                case 8:
                    options.showHelp();
                    async.nextTick(processCommandsAfter);
                    break;
                default:
                    console.log('Goodbye');
                    break;
            }
        }
    });
}

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

function createEntry(callback) {
    console.log('createEntry');
    async.waterfall([
        function (callback) {
            prompt.get(['textEntry'], callback);
        },
        function (data, callback) {
            var payload = { text: data.textEntry };
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
            console.log('error', error);
        } else {
            console.log(result);
        }
        async.nextTick(callback, err, result);
    });
}

function retrieveEntry(callback) {
    console.log('retrieveEntry');
    var ctx = {};
    async.waterfall([
        function (callback) {
            prompt.get(['hash'], callback);
        },
        function (data, callback) {
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
            console.log('error', error);
        } else {
            console.log('response', ctx.data, 'decoded', result);
        }
        async.nextTick(callback, err, ctx.data, result);
    });
}

function retrieveBlock(callback) {
    console.log('retrieveBlock');
    async.waterfall([
        function (callback) {
            prompt.get(['blockId'], callback);
        },
        function (data, callback) {
            blockchain.Block.read(data.blockId, {}, callback);
        }
    ], function (err, result) {
        if (err) {
            console.log('error', err);
        } else {
            console.log('response', result);
        }
        async.nextTick(callback, err, result);
    });
}

function retrieveLastConfirmedBlock(callback) {
    console.log('retrieveLastConfirmedBlock');
    async.waterfall([
        function (callback) {
            blockchain.Block.list({}, callback);
        }
    ], function (err, result) {
        if (err) {
            console.log('error', error);
        } else {
            console.log('response', result);
        }
        async.nextTick(callback, err, result);
    });
}

function initApi(onDone) {
    console.log('initializing');
    async.waterfall([
        function (callback) {
            prompt.get(promptInitSchema(), callback);
        },
        function (result, callback) {
            var authentication = new MasterCardAPI.OAuth(result.consumerKey, result.keystorePath, result.keyAlias, result.storePass);
            MasterCardAPI.init({
                sandbox: true,
                debug: argv.verbosity,
                authentication: authentication
            });
            protoFile = result.protoFile;
            protobuf.load(protoFile, callback);
        }
    ], function (err, root) {
        if (err) {
            console.log('error', error);
        } else {
            var nested = guessNested(root);
            if (nested && 2 == nested.length) {
                appID = nested[0];
                msgClassDef = root.lookupType(appID + "." + nested[1]);
                console.log('initialized');
            } else {
                console.log('could not read message class def from', protoFile);
            }
        }
        async.nextTick(onDone, err, appID);
    });
}

function processCommandsAfter() {
    async.waterfall([
        function (callback) {
            prompt.get({ properties: { enter: { description: 'press enter to continue', required: false } } }, callback);
        }
    ], function (err, result) {
        if (err) {
            console.log('error', error);
        }
        async.nextTick(processCommands);
    });
}

function promptInitSchema() {
    return {
        properties: {
            keystorePath: {
                description: 'Keystore',
                required: true,
                conform: (value) => {
                    return fs.existsSync(value);
                }
            },
            storePass: {
                description: 'Keystore Password',
                required: true,
                default: 'keystorepassword'
            },
            consumerKey: {
                description: 'Consumer Key',
                required: true
            },
            keyAlias: {
                description: 'Key Alias',
                required: true,
                default: 'keyalias'
            },
            protoFile: {
                description: 'Protobuf File',
                required: true,
                default: 'message.proto'
            }
        }
    };
}

function promptCmdSchema() {
    return {
        properties: {
            cmdOption: {
                description: '\n============ MENU ============\n1. Update protocol buffer definition\n2. Create entry\n3. Retrieve entry\n4. Retrieve block\n5. Retrieve last confirmed block\n6. Show Protocol Buffer Definition\n7. Re-initialize API\n8. Print Command Line Options\n0. Quit\nOption',
                message: 'Invalid Option',
                type: 'number',
                default: 0,
                required: true,
                conform: (value) => {
                    return value >= 0 && value <= 8;
                }
            }
        }
    };
}

function createOptions() {
    return require('yargs')
        .options({
            'consumerKey': {
                alias: 'ck',
                description: 'consumer key (mastercard developers)'
            },
            'keystorePath': {
                alias: 'kp',
                description: 'the path to your keystore (mastercard developers)'
            },
            'keyAlias': {
                alias: 'ka',
                description: 'key alias (mastercard developers)'
            },
            'storePass': {
                alias: 'sp',
                description: 'keystore password (mastercard developers)'
            },
            'protoFile': {
                alias: 'pf',
                description: 'protobuf file'
            },
            'verbosity': {
                alias: 'v',
                default: false,
                description: 'log mastercard developers sdk to console'
            }
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

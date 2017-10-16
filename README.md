# nodejs blockchain barebones client #

## Getting Started ##
This application demonstrates the basics of getting started with the Mastercard Core Blockchain API. To get started you should take the following steps 
 * Clone this repository
 * Edit the message.proto file and assign your APP_ID for value of package
 * Goto Mastercard Developers and create a Mastercard Blockchain project (note this is currently a private API and you may need to request access). You will be taken through the wizard to create a node. You must provide an APP_ID and a protocol buffer definition i.e. message.proto.
 * You will receive a p12 file and a consumer key from Mastercard Developers for your project.
 * Execute the following commands
```bash
npm install
node app.js
```
When started it gets you to confirm your parameters and then displays a simple menu. 

## Menu ##
```
============ MENU ============
1. Update protocol buffer definition
2. Create entry
3. Retrieve entry
4. Retrieve block
5. Retrieve last confirmed block
6. Show Protocol Buffer Definition
7. Re-initialize API
8. Print Command Line Options
0. Quit
Option:  (0)
```

From this menu you can create basic text entries on the blockchain and then retrieve them. You can also retrieve the block the entry was written.

## More Commandline Options ##
```
Options:
  --help                Show help                                      [boolean]
  --version             Show version number                            [boolean]
  --consumerKey, --ck   consumer key (mastercard developers)
  --keystorePath, --kp  the path to your keystore (mastercard developers)
  --keyAlias, --ka      key alias (mastercard developers)
  --storePass, --sp     keystore password (mastercard developers)
  --protoFile, --pf     protobuf file
  --verbosity, -v       log mastercard developers sdk to console[default: false]
```

### Useful Info
This project makes use of the Mastercard Blockchain SDK available from npm.

```bash
npm install mastercard-blockchain --save
```

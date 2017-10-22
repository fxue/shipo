var request = require('request');
const fs = require('fs');

var req = request.defaults();
var userId = "WVNX9PD93QZ8W5FWUYKQ2152JbUrMAnZIfhbdNy4tCD63c-nA"
var password = "H3Av7KqZt1RfX20rTqr3RH1CR3WfH1EeP7AgD"
var certfile = "/Users/fei/Downloads/cert.pem"
var keyfile = "/Users/fei/Downloads/key_66053e71-eabc-4489-9530-fca3209cac87.pem"
var data =
{
"senderEnterpriseId": "788890",
"receiverEnterpriseId": "V-USA-EUR-20990373-100900001-008",
"invoiceDetails": [
{
"invoiceNumber": "54trtrt",
"poNumber": "125552",
"paymentAmount": 500,
"paymentCurrencyIsoCode": 840,
"notes": "For Coffee",
"partialPayment": false
}
]
}
req.post({    
	uri : "https://sandbox.api.visa.com/visab2bconnect/v1/payments",    
	key: fs.readFileSync(keyfile),    
	cert: fs.readFileSync(certfile),    
	headers: {      
		'Content-Type' : 'application/json',      
		'Accept' : 'application/json',      
		'Authorization' : 'Basic ' + new Buffer(userId + ':' + password).toString('base64')    },   
		 body: JSON.stringify(data)
	}, function(error, response, body) { 
	   console.log(response.body);
	});
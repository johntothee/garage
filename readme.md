Garage is an internet of things garage door lock and opener for the 
raspberry pi. It uses nodejs and jwt to receive signed tokens to command a garage door to unlock and then trigger the opener. This is work in progress at this point.

genJwt.js is a helper file to generate test keys for a user.

When a token is verified and the open-close command is received GPIO pin 17 will go active low to open the lock solenoid. Then GPIO pin 27 will go active low for half a second triggering the opener. 15 seconds later GPIO pin 17 will go inactive releasing the lock solenoid.

Next steps are to wire up relays and lock solenoid. The lock is expected to work with a 120VAC solenoid and metal pin that will block the path of a garage door's rollers.

An iOS app has also been started which will generate keys, share the public key, and send signed open-close requests.

Needed info to setup:
API Key - random string of characters saved to ./keys/api_key.txt 
Each request will have this query parameter, and will be checked first. This is mainly to keep lurkers away.

IP Address and port - to access the raspberry pi. If one's ip address isn't static a Dynamic Domain Name System service could be used instead. You'll also need to forward the port in your router and/or modem.

User ID - any integer to identify users.

Public/private rsa key pair generated by openssl. The private key is used to sign jwt tokens. The public key is used to verify the signature and should be installed in ./keys/ with a filename format of [USER_ID]-public.pem

A number of node packages are defined in package.json. Install them with `npm install`.

Relays and a solenoid. I found a board with two 5v relays locally similar to this: https://www.sainsmart.com/products/2-channel-5v-relay-module
When complete I'll include drawings and/or wiring diagrams.

This application can be run from the command line with `node app.js`

To generate a test token use `node genJwt.js [USERID] [COMMAND]`. From a web browser the url takes the format: "http://[IP]:[PORT]/api/garage?apikey=[API_KEY]&token=[JWT_TOKEN]"
A response including the word 'verify' is successful. 

Security info:
We're using jwt tokens with the RS256 algorithm for extra security. Only the private key can sign tokens for which verification can only be done with the matching public key. Tokens also expire after two minutes. Even if one were to get a copy of a token it would soon be invalid. Communicating over https would provide further protection.

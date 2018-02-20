garage is an internet of things garage door lock and opener for the 
raspberry pi. It uses nodejs and jwt to receive signed tokens to command a garage door to unlock and then trigger the opener. This is very much a proof of concept at this point.

genJwt.js is a helper file to generate test keys for a user.

Next steps are to configure GPIO pins and wire up relays. The lock is expected to work with a 120VAC solenoid and metal pin that will block the path of a garage door's rollers.

Eventually an iOS app will generate keys, send the server the public key and send signed open requests.
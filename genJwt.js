const fs = require('fs');
var jwt = require('jsonwebtoken');

// sign with RSA SHA256
var cert = fs.readFileSync('./keys/1-private.key');  // get private key

// sign asynchronously
jwt.sign({ uid: '1', command: 'verify' }, cert, { algorithm: 'RS256' }, function(err, token) {
  console.log(token);
  var decoded = jwt.decode(token);

  // get the decoded payload and header
  var decoded = jwt.decode(token, {complete: true});
  console.log(decoded.header);
  console.log(decoded.payload);
  console.log('uid: ' + decoded.payload.uid);
  console.log('command: ' + decoded.payload.command);
});
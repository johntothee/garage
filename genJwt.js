const fs = require('fs');
var jwt = require('jsonwebtoken');

if (!(user = process.argv[2])) {
  user = '1';
}

if (!(commandToUse = process.argv[3])) {
  commandToUse  = 'verify';
}
// sign with RSA SHA256
var cert = fs.readFileSync('./keys/' + user + '-private.key');  // get private key

// sign asynchronously
// for testing we're only using uid=1
// verify command verifies a token was received and properly verified.
// open-close does what you think.
// jwt.sign({ uid: '1', command: 'verify' }, cert, { algorithm: 'RS256' }, 
jwt.sign({ uid: user, command:  commandToUse}, cert, { algorithm: 'RS256' }, function(err, token) {
  console.log(token);
  var decoded = jwt.decode(token);

  // get the decoded payload and header
  var decoded = jwt.decode(token, {complete: true});
  console.log(decoded.header);
  console.log(decoded.payload);
  console.log('uid: ' + decoded.payload.uid);
  console.log('command: ' + decoded.payload.command);
  console.log(process.argv[2]);
});
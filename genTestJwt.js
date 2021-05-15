// Generate a JTW token to use for testing.
// usage: node genTestJwt.js will generate a JTW token for user 1, with a
// command of verify, using algorith RSA256

const fs = require('fs');
var jwt = require('jsonwebtoken');

if (!(user = process.argv[2])) {
  user = '1';
}

if (!(commandToUse = process.argv[3])) {
  commandToUse  = 'verify';
}

if (!(algorithm = process.argv[4])) {
  algorithm = 'RSA256';
}

// sign with RSA SHA256
var cert = fs.readFileSync('./keys/' + user + '-private.key');  // get private key

// sign asynchronously
// verify command verifies a token was received and properly verified.
// open-close does what you think.
jwt.sign({ uid: user, command:  commandToUse}, cert, { algorithm: algorithm }, function(err, token) {
  var decoded = jwt.decode(token);

  // get the decoded payload and header
  var decoded = jwt.decode(token, {complete: true});
  console.log('header:');
  console.log(decoded.header);
  console.log('payload:');
  console.log(decoded.payload);
  console.log('token: \n' + token);
});
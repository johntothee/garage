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
// verify command verifies a token was received and properly verified.
// open-close does what you think.
jwt.sign({ uid: user, command:  commandToUse}, cert, { algorithm: 'RS256' }, function(err, token) {
  var decoded = jwt.decode(token);

  // get the decoded payload and header
  var decoded = jwt.decode(token, {complete: true});
  console.log('header:');
  console.log(decoded.header);
  console.log('payload:');
  console.log(decoded.payload);
  console.log('token: \n' + token);
});
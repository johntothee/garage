const fs = require('fs');
var jwt = require('jsonwebtoken');
var express = require('express');
var app = express();

try {
  var apiKey = fs.readFileSync('./keys/api_key.txt');
}
catch(error) {
  console.log(error);
}
// Strip off EOF character.
apiKey = apiKey.slice(0, -1);

app.get('/api/garage', function (req, res) {
  // Limit requests by apiKey to limit DOS
  var apiParam = req.query.apikey;

  if (apiParam != apiKey) {
    res.status(403).send('Sorry, access is forbidden!');
  }
  else {
    var jwtParam = req.query.token;
    var response = processJwt(res, jwtParam);

    // valid commands to start are: verify, open-close
    // @todo: add correct response for verify command
    // @todo: open command triggers lock and opener pins
    res.send('Welcome to the garage. reponse: ' + response);
  }
});

app.listen(3000, function () {
  console.log('Garage app listening on port 3000!');
});

function processJwt(res, token) {
  // need uid from payload to user correct public key
  var decoded = jwt.decode(token, {complete: true});
  if (decoded == null) {
    return false;
  }

  var user = decoded.payload.uid;
  if (user == null) {
    return false;
  }

  try {
    var cert = fs.readFileSync('./keys/' + user + '-public.pem');
  }
  catch(error) {
    console.log(error);
    return false;
  }

  // verify token
  var response = jwt.verify(token, cert);
  console.log('command: ' + response.command);
  return response.command;
}

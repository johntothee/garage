const fs = require('fs');
var jwt = require('jsonwebtoken');
var express = require('express');
var app = express();
const apiKey = "RCQgNWxAbhnsdptutvNVUWjwq4Xfrj";

app.get('/api/garage', function (req, res) {
  // Limit requests by apiKey to limit drivebys
  var apiParam = req.query.apikey;
  if (apiParam != apiKey) {
    res.status(404).send('Sorry, we cannot find that!');
  }
  else {
    var jwtParam = req.query.token;
    var response = processJwt(res, jwtParam);

    // valid commands to start are: verify, open-close
    res.send('Welcome to the garage. reponse: ' + response);
  }
});

app.listen(3000, function () {
  console.log('Garage app listening on port 3000!');
});

function processJwt(res, token) {
  // need uid from payload to user correct public key
  var decoded = jwt.decode(token, {complete: true});
  var user = decoded.payload.uid;
  // @todo: first check file exists and user is only a string
  var cert = fs.readFileSync('./keys/' + user + '-public.pem');

  // verify token
  var response = jwt.verify(token, cert);
  console.log('command: ' + response.command);
  return response.command;
}

//reject if not correct

//if correct check command

//verify command, just respond with 'yes'

//or is open/close command
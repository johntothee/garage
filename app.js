const fs = require('fs');
var jwt = require('jsonwebtoken');
var express = require('express');
var app = express();

try {
  // A simple text file indicates if this environment has GPIO pins
  var prodMode = fs.readFileSync('./keys/prod.txt').toString('utf-8');
}
catch(error) {
  console.log('Running in non-raspberry pi mode');
}

if (prodMode) {
  // Only setup GPIO if running on a raspberry pi board.
  var gpio = require('onoff').Gpio;
  var lock = new gpio(17, 'out', 'none', {'activeLow': true});
  var opener = new gpio(27, 'out', 'none', {'activeLow': true});
}

try {
  // Get the API Key from file.
  var apiKey = fs.readFileSync('./keys/api_key.txt').toString('utf-8');
}
catch(error) {
  console.log(error);
}
// Strip off EOF character.
apiKey = apiKey.slice(0, -1);
app.get('/api/garage', function (req, res) {
  // Limit requests by apiKey to limit lurkers, DOS
  var apiParam = req.query.apikey;
  if (apiParam !== apiKey) {
    res.status(403).send('Sorry, access is forbidden!');
  }
  else {
    var jwtParam = req.query.token;
    var response = processJwt(res, jwtParam);

    switch (response) {
      // valid commands to start are: verify, open-close
      case 'verify':
        // @todo: add correct response for verify
        res.send('Welcome to the garage. reponse: ' + response);
        break;

      case 'open-close':
        openCloseDoor(res);
        break;

      default:
        res.send('No valid command found.');
    }
  }
});

app.listen(3000, function () {
  console.log('Garage app listening on port 3000!');
});

function processJwt(res, token) {
  // need uid from payload to user correct public key
  var decoded = jwt.decode(token, {complete: true});
  if (decoded === null) {
    console.log('token not decoded');
    return false;
  }

  var user = decoded.payload.uid;
  if (user == null) {
    console.log('no uid in payload');
    return false;
  }
  user = parseInt(user);

  try {
    // get user's public key
    var cert = fs.readFileSync('./keys/' + user + '-public.pem');
  }
  catch(error) {
    console.log(error);
    return false;
  }

  // verify token with max age of 2 minutes
  try {
    var response = jwt.verify(token, cert, {maxAge: '2m'});
  }
  catch (error) {
    console.log('error: ' + error);
    return false;
  }
  console.log('command: ' + response.command);
  return response.command;
}

function openCloseDoor(res) {
  // Don't run this if not on rpi.
  if (!prodMode) {
    return false;
  }

  // Unlock and open.
  console.log('unlock and open garage door.');
  lock.writeSync(1);
  opener.writeSync(1);
  setTimeout(function () {
    // Open button only needs half a second.
    opener.writeSync(0);
  }, 500);
  setTimeout(function () {
    // Keep unlocked while garage door is in operation, > 13 seconds.
    lock.writeSync(0);
  }, 15000);
  console.log('sequence complete.');
  res.send('OK');
}

// @todo: Need a listener for manual button press.
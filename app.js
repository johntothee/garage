#!/usr/bin/env node

const fs = require('fs');
const https = require("https");
var jwt = require('jsonwebtoken');
var express = require('express');
var app = express();
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db/garage.db');
var twilio = require('twilio');

db.serialize(function() {
  // Initialize table.
  // db.run("CREATE TABLE timestamp (t INT)");
  var stmt = db.prepare("INSERT INTO timestamp VALUES (?)");
  var timestamp = Math.floor(Date.now() / 1000);
  stmt.run(timestamp);
  stmt.finalize();
});
db.close();

try {
  // A simple text file indicates if this environment has GPIO pins
  var prodMode = fs.readFileSync('./keys/prod.txt').toString('utf-8');
}
catch(error) {
  console.log('Running in non-raspberry pi mode');
}

// Twilio credenials in text files.
var accountSid = readFile(fs, 'accountSid.txt');
var authToken = readFile(fs, 'authToken.txt');
var to = readFile(fs, 'to.txt');
var from = readFile(fs, 'from.txt');
var client = new twilio(accountSid, authToken);

if (prodMode) {
  // Only setup GPIO if running on a raspberry pi board.
  var gpio = require('onoff').Gpio;
  var lock = new gpio(17, 'out', 'none', {'activeLow': true});
  var opener = new gpio(27, 'out', 'none', {'activeLow': true});
  // Force pins inactive (high) to start.
  lock.writeSync(0);
  opener.writeSync(0);

  // Manual button
  var button = gpio(4, 'in', 'falling', {'activeLow': true});
  button.watch(function(err, value) {
    if (err) {
      throw err;
    }
    if (value == 0) {
      console.log(value);
      openCloseDoor(null);
    }
  });

  // Sensor to send message if door opened for unknown reason.
  var sensor = gpio(3, 'in', 'rising', {'activeLow': true});
  sensor.watch(function(err, value) {
    if (err) {
      throw err;
    }
    if (value == 1) {
      var timestamp = Math.floor(Date.now() / 1000); 
      console.log('detected open door at ' + timestamp);
      // Get time of last openClose event and compare.
      compareTimeStamp(timestamp);
    }
  });
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

// Main listen function
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
      // valid commands are: verify, open-close
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

// Setup https.
const options = {
  // get these from lets-encrypt
  key: fs.readFileSync("./keys/key.pem"),
  cert: fs.readFileSync("./keys/cert.pem")
};
app = https.createServer(options, app);
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
  // Save timestamp of this event.
  writeTimestamp();
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
  if (res) {
    res.send('OK');
  }
}

// Write current time to db as an open-close event.
function writeTimestamp() {
  var db = new sqlite3.Database('./db/garage.db');
  db.serialize(function() {
    var stmt = db.prepare("INSERT INTO timestamp VALUES (?)");
    var timestamp = Math.floor(Date.now() / 1000);
    stmt.run(timestamp);
    stmt.finalize();
  }); 
  db.close();
}

// Compare nowTimeStamp to last open-close timestamp.
// More than 120 seconds different should send a message.
function compareTimeStamp(nowTimeStamp) {
  var db = new sqlite3.Database('./db/garage.db');
  db.each("SELECT t FROM timestamp ORDER BY rowid DESC LIMIT 1", function(err, row) {
    console.log("comparison:");
    console.log(nowTimeStamp);
    console.log(row.t);
    if (err) throw err;          
    if (row) {
      if ((nowTimeStamp - row.t) > 120) {
        // Send warning message
        console.log("need to send a warning message that door is open.");
        var date = new Date(nowTimeStamp * 1000);
        var hours = date.getHours();
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        var formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
        client.messages.create({
          body: 'The garage door opened at ' + formattedTime,
          to: to,  // Text this number
          from: from // From a valid Twilio number
        })
        .then((message) => console.log(message.sid));
      }
    }
  });
  db.close();
}

function readFile(fs, filename) {
  try {
    // Get the Twilio accountSid from file.
    var text = fs.readFileSync('./keys/' + filename).toString('utf-8');
  }
  catch(error) {
    console.log(error);
  }
  // Strip off EOF character.
  return text.slice(0, -1);
}
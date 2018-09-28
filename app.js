#!/usr/bin/env node

const GARAGE_DOOR_OPEN = 1;

const fs = require('fs');
const https = require("https");
const jwt = require('jsonwebtoken');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db/garage.db');
const twilio = require('twilio');
var app = express();

try {
  // A simple text file indicates if this environment has GPIO pins
  var config = fs.readFileSync('./keys/config.json');
  var jsonConfig = JSON.parse(config);
}
catch(error) {
  console.log('No config.json file');
}

if (jsonConfig.rpi == false) {
  console.log('Running in non-raspberry pi mode');
}

// Twilio credenials in config.
const client = new twilio(jsonConfig.accountSid, jsonConfig.authToken);

if (jsonConfig.rpi) {
  // Only setup GPIO if running on a raspberry pi board.
  var gpio = require('onoff').Gpio;
  var lock = new gpio(17, 'out', 'none', {'activeLow': true});
  var opener = new gpio(27, 'out', 'none', {'activeLow': true});
  // Force pins inactive (high) to start.
  lock.writeSync(0);
  opener.writeSync(0);

  // Manual button GPIO 22 (pin 15)
  var button = gpio(22, 'in', 'rising', {'activeLow': false});
  button.watch(function(err, value) {
    if (err) {
      throw err;
    }
    if (value == 1) {
      console.log('button pressed with value = ' + value);
      // Double check button after 3 seconds.
      setTimeout(function () {
        if (button.readSync() == 1) {
          console.log('button is still pressed, open door now');
          openCloseDoor(null);
        }
      }, 3000);
    }
  });

  // Sensor to send message if door opens for unknown reason.
  // GPIO3 (pin 5) defaults to internal pull-up. Setup magnet to be Normally Open.
  // When door opens, switch will close to ground.
  // Value of 1 for active low means active or at ground.
  var sensor = gpio(3, 'in', 'falling', {'activeLow': true});
  sensor.watch(function(err, value) {
    if (err) {
      throw err;
    }
    if (value == GARAGE_DOOR_OPEN) {
      console.log('sensor first detected open.');
      setTimeout(function () {
        // Double check sensor afer 3 seconds.
        if (sensor.readSync() == GARAGE_DOOR_OPEN) {
          var timestamp = Math.floor(Date.now() / 1000);
          console.log('detected open door at ' + timestamp);
          // Get time of last openClose event and compare.
          compareTimeStamp(timestamp);
        }
      }, 3000);
    }
  });
}

// Main listener
app.get('/api/garage', function (req, res) {
  // Restrict requests by apiKey to limit lurkers, DOS
  var apiParam = req.query.apikey;
  if (apiParam !== jsonConfig.apiKey) {
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
  key: fs.readFileSync(jsonConfig.keyPath + 'privkey.pem'),
  cert: fs.readFileSync(jsonConfig.keyPath + 'cert.pem'),
  ca: fs.readFileSync(jsonConfig.keyPath + 'chain.pem')
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
  console.log('user: ' + user);
  return response.command;
}

function openCloseDoor(res) {
  // Don't run this if not on rpi.
  if (!jsonConfig.rpi) {
    return false;
  }

  // Unlock and active garage door opener.
  console.log('unlock and open garage door.');
  // Save timestamp of this event.
  writeTimestamp('timestamp');
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
function writeTimestamp(table) {
  db = new sqlite3.Database('./db/garage.db');
  db.serialize(function() {
    var stmt = db.prepare("INSERT INTO " + table + " VALUES (?)");
    var timestamp = Math.floor(Date.now() / 1000);
    stmt.run(timestamp);
    stmt.finalize();
  });
  db.close();
}

// Compare nowTimeStamp to last open-close timestamp.
// More than 180 seconds difference should send a message.
function compareTimeStamp(nowTimeStamp) {
  db = new sqlite3.Database('./db/garage.db');
  db.each("SELECT t FROM timestamp ORDER BY rowid DESC LIMIT 1", function(err, row) {
    console.log("comparison:");
    console.log(nowTimeStamp);
    console.log(row.t);
    if (err) throw err;          
    else if (row) {
      if ((nowTimeStamp - row.t) > 180) {
        db.each("SELECT t FROM sms ORDER BY rowid DESC LIMIT 1", function(error, times) {
          if (error) throw error;
          else if (times) {
            console.log("sms timestamp value: " + times.t);
            if ((nowTimeStamp - times.t) > 300) {
              // Last SMS was more than 5 minutes ago. Okay to send another.
              sendSMS(nowTimeStamp);
            }
          }
        });
      }
    }
  });
}

// Send SMS.
function sendSMS(timestamp) {
  console.log("need to send a warning message that door is open.");
  var date = new Date(timestamp * 1000);
  var hours = date.getHours();
  var minutes = "0" + date.getMinutes();
  var seconds = "0" + date.getSeconds();
  var formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
  client.messages.create({
    body: 'The garage door opened at ' + formattedTime,
    to: jsonConfig.to,  // Text this number
    from: jsonConfig.from // From a valid Twilio number
  })
  .then((message) => console.log(message.sid));
  writeTimestamp('sms');
}

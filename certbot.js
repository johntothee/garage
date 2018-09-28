// Run as root and update strings to generate new cert files from letsencrypt.

const http = require("http");
const express = require('express');
var app = express();


// Main listener
app.get('/.well-known/acme-challenge/AO6ycPphSl54CxIO7uTCHDkzohUhpoJ_x_wY2ews230', function (req, res) {
  res.send('AO6ycPphSl54CxIO7uTCHDkzohUhpoJ_x_wY2ews230.6g79z-U8d9sChjzwmbuxd-1VIA0I9mOdogaEx4edNzM');

});

// serve static files
// Use with 'authenticator = webroot' and 'webroot_path = [STATIC PATH]' in /etc/letsencrypt/renewal/*.conf
app.use(express.static('static'));


app = http.createServer(app);
app.listen(80, function () {
  console.log('Garage app listening on port 80!');
});

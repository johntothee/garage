#!/usr/bin/env node

const fs = require('fs');
const http = require("http");
const express = require('express');
var app = express();


// Main listener
app.get('/.well-known/acme-challenge/AO6ycPphSl54CxIO7uTCHDkzohUhpoJ_x_wY2ews230', function (req, res) {
  res.send('AO6ycPphSl54CxIO7uTCHDkzohUhpoJ_x_wY2ews230.6g79z-U8d9sChjzwmbuxd-1VIA0I9mOdogaEx4edNzM');

});

app = http.createServer(app);
app.listen(80, function () {
  console.log('Garage app listening on port 80!');
});

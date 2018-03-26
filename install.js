var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db/garage.db');

// Create database tables.
db.serialize(function() {
  // Initialize tables.
  db.run("CREATE TABLE timestamp (t INT)");

  var stmt = db.prepare("INSERT INTO timestamp VALUES (?)");
  var timestamp = 0;
  stmt.run(timestamp);
  stmt.finalize();

  db.run("CREATE TABLE sms (t INT)");

  var stmt = db.prepare("INSERT INTO sms VALUES (?)");
  var timestamp = 0;
  stmt.run(timestamp);
  stmt.finalize();

});
db.close();
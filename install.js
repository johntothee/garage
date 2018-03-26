var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db/garage.db');

// Create database tables.
db.serialize(function() {
  // Initialize tables.
  db.run("CREATE TABLE timestamp (t INT)");
  db.run("CREATE TABLE sms (t INT)");
});
db.close();
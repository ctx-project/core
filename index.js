var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('data');

// process.argv.forEach(function (val, index, array) {
// 	 console.log(index + ': ' + val);
// });

console.log(process.argv.slice(2));


// db.serialize();

// db.run("CREATE TABLE lorem (info TEXT)");

// var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
// for (var i = 0; i < 10; i++) {
// 		stmt.run("Ipsum " + i);
// }
// stmt.finalize();

// db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
// 		console.log(row.id + ": " + row.info);
// });
 
db.close();


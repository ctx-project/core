var sqlite3 = require('sqlite3').verbose(),
		db = new sqlite3.Database('/home/andrei/ctx/core/data'),
		l = function(o) {console.log(o);},
		terms = process.argv.slice(2);

// db.each("SELECT * FROM items", function(err, row) { l(row); });
// db.each("SELECT * FROM tags", function(err, row) { l(row); });
// return;

if(!terms.length) { db.close(); return; }

db.run("INSERT INTO items (body) VALUES (?)", terms.join(' '), function(err) {
	if(err)	{ l(err); return; }
	
	var id = this.lastID,
			pts = db.prepare('INSERT INTO tags VALUES (?, ?)'),
			dts = db.prepare('DELETE FROM tags WHERE itemId = ?'),
			uis = db.prepare('UPDATE items SET body = ? WHERE id = ?'),
			dis = db.prepare('DELETE FROM items WHERE id = ?'),
			gis = db.prepare('SELECT * FROM items WHERE id = ?');	
			
	function putTags (id, terms) {
		terms
			.filter(t => t.startsWith('.'))
			.forEach(t => pts.run(id, t.slice(1)));
	};
			
	putTags(id, terms);
	l(id);
	
	if (terms.length > 1) {
		if(terms[0] == '.delete') {
			dis.run(terms[1]);
			dts.run(terms[1]);
		}
		
		else if(terms[0] == '.update') {
			uis.run(terms.slice(2).join(' '), terms[1]);
			dts.run(terms[1], () => putTags(terms[1], terms.slice(2)));
		}
		
		else if(terms[0] == '.watch')
			gis.get(terms[1], (err, row) => {
				var tags = row.body.split(' ').filter(t => !t.startsWith('.')),
						s = tags.map((t, i) => `JOIN tags T${i} ON T${i}.itemId = I.id AND T${i}.tag = ?`).join(' ');
				
				db.each("SELECT I.* FROM items I " + s, tags, (err, row) => l(row.body + ' =' + row.id));
			});
	}
});

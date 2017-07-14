var l = function(o) {console.log(o); return o;},
		elasticlunr = require('elasticlunr'),
		fs = require('fs');

module.exports = function(path) {
	this.path = path;
	var parts = load(path);
	this.index = parts[0];
	this.nextId = parts[1];
	this.docs = this.index.documentStore;
	this.put = put.bind(this);
	this.get = get.bind(this);
	this.onPut = null;
};	

function load(path) {
	try {
		var o = JSON.parse(fs.readFileSync(path, 'utf8'));
		return [elasticlunr.Index.load(o), o.nextId || 1234];
	}
	catch (ex) {
		var index = new elasticlunr.Index();
		index.addField('tags');
		index.setRef('id');
		return [index, 1234];
	}
}

function save(core) {
	var o = core.index.toJSON();
	o.nextId = core.nextId;
	fs.writeFile(core.path, JSON.stringify(o));
}

function put(text) {
	if(!text) return null;
	var words = text.trim().split(' ').filter(w => !!w),
			tags = words.filter(w => {var l = w[0]; return l != '~' && l == l.toUpperCase();}).map(t => t.toLowerCase()),
			maybeId = words[words.length - 1],
			id = maybeId.startsWith('~') && maybeId.length > 1 ? maybeId.slice(1) : null,
			idExists = id ? this.docs.hasDoc(id) : false;
	
	tags.filter(t => t.indexOf('.') != -1).forEach(ct => Array.prototype.push.apply(tags, ct.split('.')));
	tags.filter(t => t.indexOf(':') != -1).forEach(ct => Array.prototype.push.apply(tags, ct.split(':')));
	if(!tags.length) tags.push('untagged');
	
	// l(text);	l(words);	l(tags);	l(maybeId);	l(id);	l(idExists);	return '';

	if(idExists)
		if(words.length == 1)
			this.index.removeDocByRef(id);
		else
			this.index.updateDoc({id: id, tags: tags, body: text});
	else 
		if(id && words.length == 1)
			return;
		else {
			if(!id) {
				id = this.nextId++;	
				text += ' ~' + id;
			}
			
			this.index.addDoc({id: id, tags: tags, body: text});
		}
	
	if(this.onPut) setTimeout(() => this.onPut(text));
	
	save(this);
	
	return '~' + id;
}

function get(text) {
	// l(this.docs.docs); return; 
	var tags = text.split(' ').filter(w => !!w).map(t => t.toLowerCase()),
			ptags = tags.filter(t => t[0] != '-'),
			ntags = tags.filter(t => t[0] == '-').map(t => t.slice(1));
	return this.index.search(ptags.join(' '), {bool: 'AND'})
		.map(r => this.docs.getDoc(r.ref))
		.filter(doc => ntags.every(nt => doc.tags.indexOf(nt) == -1))
		.map(doc => {
			var	body = doc.body,
					sep = body.search(/(^|\s+)[^A-Z\s\*]/);
			return (body.slice(0, sep).split(' ').filter(t => !!t && ptags.indexOf(t.toLowerCase()) == -1).join(' ') + body.slice(sep)).trim();		
		});
}


	






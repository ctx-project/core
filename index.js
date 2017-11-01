var l = function(o) {console.log(o); return o;},
		elasticlunr = require('elasticlunr'),
		fs = require('fs');

module.exports = function(path) {
	this.path = path;
	var store = load(path);
	this.items = store.items;
	this.nextId = store.nextId;
	this.tags = store.tags;
	this.docs = this.items.documentStore;
	this.put = put.bind(this);
	this.get = get.bind(this);
	this.onPut = null;
	this.hints = hints.bind(this);

	// var docs = this.docs.docs;
	// for(var docid in docs) {
	// 	this.put(docs[docid].body);
	// }
	
	// // l(this.tags.toJSON());
	// save(this);
	// // l(this.items.toJSON());
};	

function load(path) {
	try {
		var store = JSON.parse(fs.readFileSync(path, 'utf8'));
		return {
			items: elasticlunr.Index.load(store.items), 
			nextId: store.nextId,
			tags: elasticlunr.Index.load(store.tags)
		};
	}
	catch (ex) {
		var items = new elasticlunr.Index();
		items.addField('tags');
		items.setRef('id');
		
		var tags = new elasticlunr.Index();
		tags.addField('parts');
		tags.setRef('tag');
		
		return {items, tags, nextId: 1234};
	}
}

function save(core) {
	fs.writeFile(core.path, JSON.stringify({
		items: core.items.toJSON(),
		nextId: core.nextId,
		tags: core.tags.toJSON()
	}));
}

function put(text) {
	if(!text) return null;
	var words = text.trim().split(' ').filter(w => !!w),
			tags = words.filter(w => {var l = w[0]; return l != '~' && l == l.toUpperCase() && isNaN(l);}).map(t => t.toLowerCase()),
			maybeId = words[words.length - 1],
			id = maybeId.startsWith('~') && maybeId.length > 1 ? maybeId.slice(1) : null,
			idExists = id ? this.docs.hasDoc(id) : false;
	
	tags.forEach(function(tag) {
		if(this.tags.documentStore.hasDoc(tag)) return;
		this.tags.addDoc({tag: tag, parts: tag.split(/[\.:]+/)});	
	}.bind(this));
	
	function subtags(sep) {
		tags.filter(t => t.indexOf(sep) != -1).forEach(ct => Array.prototype.push.apply(tags, ct.split(sep).filter(t => !isNaN(+t))));
	}
	subtags(':');
	subtags('.');

	if(!tags.length) tags.push('untagged');
	
	// l(text);	l(words);	l(tags);	l(maybeId);	l(id);	l(idExists);	return '';

	if(idExists)
		if(words.length == 1)
			this.items.removeDocByRef(id);
		else
			this.items.updateDoc({id: id, tags: tags, body: text});
	else 
		if(id && words.length == 1)
			return;
		else {
			if(!id) {
				id = this.nextId++;	
				text += ' ~' + id;
			}
			
			this.items.addDoc({id: id, tags: tags, body: text});
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
	return this.items.search(ptags.join(' '), {bool: 'AND'})
		.map(r => this.docs.getDoc(r.ref))
		.filter(doc => ntags.every(nt => doc.tags.indexOf(nt) == -1))
		.map(doc => {
			var	body = doc.body,
					sep = body.search(/(^|\s+)[^A-Z\s\*]/);
			return (body.slice(0, sep).split(' ').filter(t => !!t && ptags.indexOf(t.toLowerCase()) == -1).join(' ') + body.slice(sep)).trim();		
		});
}

function hints(text) {
	return this.tags.search(text, {expand: true}).map(t => t.ref);
}




	






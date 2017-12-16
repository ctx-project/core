var l = function(o) {console.log(o); return o;},
		elasticlunr = require('elasticlunr'),
		fs = require('fs'),
		lang = require('@ctx/language'),
		parse = lang.parse,
		compose = lang.compose,
		serializeItem = compose.getItemSerializer();

module.exports = function(path) {
	this.path = path;
	var store = load(path);
	this.itemIndex = store.items;
	this.nextId = store.nextId;
	this.tagIndex = store.tags;
	this.itemDocs = this.itemIndex.documentStore;
	this.tagDocs = this.tagIndex.documentStore;
	this.put = put.bind(this);
	this.get = get.bind(this);
	this.onPut = null;
	this.hints = hints.bind(this);
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
		items: core.itemIndex.toJSON(),
		nextId: core.nextId,
		tags: core.tagIndex.toJSON()
	}));
}

function hints(word) {
	return this.tagIndex.search(word, {expand: true}).map(t => t.ref);
}

function put(item) {
	if(!item.trim()) return '';
	
	var record = parse.item(item, ['tags', 'case', 'signature']),
			signature = record.signature,
			id = record.id,
			idExists = id ? this.itemDocs.hasDoc(id) : false;

	record.tags.forEach(function(tag) {
		if(this.tagDocs.hasDoc(tag.name)) return;
		this.tagIndex.addDoc({tag: tag.name, parts: tag.parts});	
	}.bind(this));
	
	if(!signature.length) signature.push('untagged');
	
	if(idExists)
		if(record.remove)
			this.itemIndex.removeDocByRef(id);
		else
			this.itemIndex.updateDoc({id, tags: signature, body: item});
	else 
		if(record.remove)
			return;
		else {
			if(!id) {
				id = this.nextId++;	
				item += ' ~' + id;
			}
			
			this.itemIndex.addDoc({id: id, tags: signature, body: item});
		}
	
	if(this.onPut) setTimeout(() => this.onPut(item));
	
	save(this);
	
	return '~' + id;
}

function get(item) {
	if(!item.trim()) return [];
	// return [JSON.stringify(parse.item('-Cuc', ['tags', 'sign']))];
	// if(!item.trim()) {
	// 	// var itemDocs = this.itemDocs.itemDocs;
	// 	// for(var docid in itemDocs) {
	// 	// 	 this.put(itemDocs[docid].body);
	// 	// }
	// 	return Object.keys(this.tagIndex.documentStore.itemDocs);
	// }
	// // l(this.itemDocs.itemDocs); return; 
	// return ['a', 'b'];
	
	item = item.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	
	var record = parse.item(item, ['tags', 'case', 'sign']),
			ptags = record.positiveTags.map(t => t.body),
			ntags = record.negativeTags.map(t => t.body);

	return this.itemIndex.search(ptags.join(' '), {bool: 'AND'})
		.map(r => this.itemDocs.getDoc(r.ref))
		.filter(doc => ntags.every(nt => doc.tags.indexOf(nt) == -1))
		.map(doc => serializeItem(compose.removeFromHead(parse.item(doc.body, ['tags']), ptags)));
}



	






var ShuffleSeed = require('shuffle-seed');
var HashIds = require('hashids');

var _initialized = false;

var _charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed 1, 0, iI, oO which could look confusing
var _hashTemplates = {};
var _hashTemplateKeys = [];
var _hashLength = 8;
var _shuffleHashSaltLength = 4;
var _objectId = null;

function EncodedSeededHashid(hashScope, hash) {
  this.getHashScope = function(){
    return hashScope;
  }
  
  this.toString = function(){
    return hash.toString();
  }
}

function DecodedSeededHashid(hashScope, data) {
  this.getHashScope = function(){
    return hashScope;
  }
  
  this.toValue = function(){
    return data;
  }
  
  this.toString = function(){
    return data.toString();
  }
  
  this.toObjectId = function(){
    if(!_objectId){
      throw new Error('ObjectId variable not configured.');
    }
    
    let objectId = _objectId(data);
    if(objectId.toString() === data){
      return objectId;
    }
    else{
      return null;
    }
  }
}

function generateRandomObjectId(){ // Used for testing the ObjectId variable
  var text = "";
  var charList = "0123456789abcdef";
  for(var i=0; i < 24; i++){  
    text += charList.charAt(Math.floor(Math.random() * charList.length));
  }
  return text;
}

function createHasher(secret){
  return new HashIds(secret, _hashLength, getShuffledCharset(secret));
}

function shuffleSeededString(str, seed) {
	return ShuffleSeed.shuffle(str.split(''), seed).join('');
}

function unshuffleSeededString(str, seed) {
	return ShuffleSeed.unshuffle(str.split(''), seed).join('');
}

function getShuffledCharset(seed) {
	return shuffleSeededString(_charset, seed);
}

function doDecode(useHex, scope, hash, seed = '') {
	let selectedHasher = _hashTemplates[scope];
  
  if(!selectedHasher){
    throw new Error('Missing hash scope.');
  }
  
  if(hash instanceof EncodedSeededHashid){
    hash = hash.toString();
  }
  
	if (!hash || typeof hash !== 'string') {
    throw new Error('Missing hash.');
	}
  
	hash = unshuffleSeededString(hash, selectedHasher.salt.substring(0, _shuffleHashSaltLength));
  
	let decodedHash;

  if (useHex) {
		// Hex based hash
		let decoded = selectedHasher.decodeHex(hash);
		if (typeof decoded === 'string') {
			decodedHash = decoded;
		}
		else {
			decodedHash = '';
		}
	}
	else {
		// Count based hash
		let decoded = selectedHasher.decode(hash);
		if (decoded instanceof Array && decoded.length > 0) {
			decodedHash = decoded[0] + '';
		}
		else {
			decodedHash = '';
		}
	}

	// Must have seed and decoded hash cannot be empty string
	if (seed && decodedHash) {
		decodedHash = unshuffleSeededString(decodedHash, scope + seed);
	}
  
  if(!useHex){
    decodedHash = parseInt(decodedHash);
  }
  
  return new DecodedSeededHashid(scope, decodedHash);
}

function doEncode(useHex, scope, data, seed = '') {
	let selectedHasher = _hashTemplates[scope];

  if(!selectedHasher){
    throw new Error('Missing hash scope.');
  }
  
  if(data instanceof DecodedSeededHashid){
    data = data.toString();
  }
  
  if (!data || !data.toString || typeof data.toString !== "function") {
    throw new Error('Missing data.');
	}

	data = data.toString(); // Convert to string so it could be shuffled

	// Must have seed and data cannot be empty string
	if (seed && data) {
		data = shuffleSeededString(data, scope + seed);
	}

  if(useHex){
		// Hex based hash
    return new EncodedSeededHashid(scope, shuffleSeededString(
      selectedHasher.encodeHex(data),
      selectedHasher.salt.substr(0, _shuffleHashSaltLength)
    ));
  }
  else{
		// Count based hash
    return new EncodedSeededHashid(scope, shuffleSeededString(
      selectedHasher.encode(data),
      selectedHasher.salt.substr(0, _shuffleHashSaltLength)
    ));
  }
}

function requireUninitialized(){
  if(_initialized){
    throw new Error('Unable to configure after initialization.');
  }
}

function requireInitialized(){
  if(!_initialized){
    throw new Error('Initialization is required.');
  }
}


module.exports = {
  setObjectIdVariable: function(objectIdVariable){
    requireUninitialized();

    if(typeof objectIdVariable !== 'function'){
      throw new Error('Invalid objectid variable.');
    }

    try{
      let randomObjectId = generateRandomObjectId();
      if(objectIdVariable(randomObjectId).toString() !== randomObjectId){
        throw new Error('Invalid objectid variable.');
      }
    }
    catch(err){
      throw new Error('Invalid objectid variable.');
    }

    _objectId = objectIdVariable; 
  },
  
  setHashLength: function(length) {
    requireUninitialized();

    length = parseInt(length);

    if(isNaN(length) || length < 0){
      throw new Error('Invalid hash length, must be a number.');
    }

    _hashLength = length;
  },
  
  setCharset: function(newCharset) {
    requireUninitialized();

    if(typeof newCharset !== 'string' || newCharset.length < 16){ // Required by hashids
      throw new Error('Invalid charset, must be > 16 unique characters.');
    }

    _charset = newCharset;
  },
  
  setShuffleHashSaltLength: function(length) {
    requireUninitialized();

    length = parseInt(length);

    if(isNaN(length) || length < 1){
      throw new Error('Invalid shuffle hash salt length, must be a number > 0.');
    }

    _shuffleHashSaltLength = length;
  },
  
  encode: function(scope, data, seed = '') {
    requireInitialized();

    return doEncode(false, scope, data, seed);
  },

  encodeHex: function(scope, data, seed = '') {
    requireInitialized();

    return doEncode(true, scope, data, seed);
  },

  decode: function(scope, hash, seed = '') {
    requireInitialized();

    return doDecode(false, scope, hash, seed);
  },

  decodeHex: function(scope, hash, seed = '') {
    requireInitialized();

    return doDecode(true, scope, hash, seed);
  },

  initialize: function(hashTemplates){ // [{scope: String, salt: String}, ...]
    requireUninitialized();

    if(!hashTemplates || !(hashTemplates instanceof Array) || hashTemplates.length == 0){
      throw new Error('Invalid hash templates.');
    }

    var templates = {};
    for(var i = 0; i < hashTemplates.length; i++){
      templates[hashTemplates[i].scope] = createHasher(hashTemplates[i].salt);
    }

    _hashTemplates = Object.freeze(templates);
    _hashTemplateKeys = Object.keys(_hashTemplates);

    _initialized = true;
  }
}

console.log('loaded...')
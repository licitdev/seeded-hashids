var ShuffleSeed = require('shuffle-seed');
var HashIds = require('hashids');

var HexPattern = /^[a-fA-F0-9]+$/;
var Defaults = {
  scopes: {},
  charset: 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', // Removed 1, 0, iI, oO which could look confusing
  hashLength: 8,
  shuffleOutput: true,
  objectId: null
};

var _initialized = false;
var _scopes = Defaults.scopes;
var _charset = Defaults.charset; 
var _hashLength = Defaults.hashLength;
var _shuffleOutput = Defaults.shuffleOutput;
var _objectId = Defaults.objectId;

function _generateRandomObjectId(){ // Used for testing the ObjectId variable
  var text = "";
  var charList = "0123456789abcdef";
  for(var i=0; i < 24; i++){  
    text += charList.charAt(Math.floor(Math.random() * charList.length));
  }
  return text;
}

function _createHasher(salt){
  return new HashIds(salt, _hashLength, _getShuffledCharset(salt));
}

function _shuffleSeededString(str, seed) {
	return ShuffleSeed.shuffle(str.split(''), seed).join('');
}

function _unshuffleSeededString(str, seed) {
	return ShuffleSeed.unshuffle(str.split(''), seed).join('');
}

function _getShuffledCharset(seed) {
	return _shuffleSeededString(_charset, seed);
}

function _encode(useHex, scope, data, seed) {
	var selectedHasher = _scopes[scope];

  if(!selectedHasher){
    throw new Error('Missing scope.');
  }
  
  if(useHex){
    if (!data || typeof data !== 'string' || !HexPattern.test(data)) {
      throw new Error('Missing data, must be a hex string.');
    }
  }
  else{
    if (!data || typeof data !== 'number' || parseInt(data) < 0) {
      throw new Error('Missing data, must be a positive number.');
    }
  }
  
  if (seed && typeof seed !== 'string') {
    throw new Error('Invalid seed, must be a string.');
	}

	data = data.toString(); // Convert to string so it could be shuffled

	// Must have seed and data cannot be empty string
	if (seed && data) {
		data = _shuffleSeededString(data, scope + seed);
	}

  var hash;
  
  if(useHex){
		// Hex based hash
    hash = selectedHasher.encodeHex(data);
  }
  else{
		// Count based hash
    hash = selectedHasher.encode(data);
  }
  
  if(!hash){ // Crossed Hashids limit of hashes that can be generated with charset
    throw new Error('Input data too huge, unable to encoded.');
  }
  
  if(_shuffleOutput){
    return _shuffleSeededString(hash, selectedHasher.alphabet);
  }

  return hash;
}

function _decode(useHex, scope, hash, seed) {
	var selectedHasher = _scopes[scope];
  
  if(!selectedHasher){
    throw new Error('Missing scope.');
  }
  
	if (!hash || typeof hash !== 'string') {
    throw new Error('Missing hash, must be a string.');
	}
  
  if (seed && typeof seed !== 'string') {
    throw new Error('Invalid seed, must be a string.');
	}
  
  if(_shuffleOutput){
    hash = _unshuffleSeededString(hash, selectedHasher.alphabet);
  }
  
	var data;

  if (useHex) {
		// Hex based hash
		data = selectedHasher.decodeHex(hash);
		if (typeof data !== 'string') {
			data = '';
		}
	}
	else {
		// Count based hash
		data = selectedHasher.decode(hash);
		if (data instanceof Array && data.length > 0) {
			data = data[0] + '';
		}
		else {
			data = '';
		}
	}

	// Must have seed and decoded hash cannot be empty string
	if (seed && data) {
		data = _unshuffleSeededString(data, scope + seed);
	}
  
  if(!useHex){
    data = parseInt(data);
  }
  
  return data;
}

function _requireUninitialized(){
  if(_initialized){
    throw new Error('Unable to configure after initialization.');
  }
}

function _requireInitialized(){
  if(!_initialized){
    throw new Error('Initialization is required.');
  }
}

module.exports = {
  getInitialized: function() {
    return _initialized;
  },
  
  getScopes: function() {
    return Object.keys(_scopes);
  },
  
  getCharset: function() {
    return _charset;
  },
  
  getHashLength: function() {
    return _hashLength;
  },
  
  getShuffleOutput: function() {
    return _shuffleOutput;
  },
  
  getObjectId: function() {
    return _objectId;
  },
  
  encode: function(scope, number, seed) {
    _requireInitialized();

    return _encode(false, scope, number, seed);
  },

  encodeHex: function(scope, hex, seed) {
    _requireInitialized();

    return _encode(true, scope, hex, seed);
  },

  decode: function(scope, hash, seed) {
    _requireInitialized();

    return _decode(false, scope, hash, seed);
  },

  decodeHex: function(scope, hash, seed) {
    _requireInitialized();

    return _decode(true, scope, hash, seed);
  },
  
  decodeObjectId: function(scope, hash, seed) {
    _requireInitialized();
    
    if(!_objectId){
      throw new Error('ObjectId variable not configured.');
    }
    
    // Do decode as per hex
    var data = _decode(true, scope, hash, seed);
    
    // Cast to ObjectId if is 24 character hex string
    if(data && data.length === 24){
      return _objectId(data);
    }
    
    return null;
  },

  initialize: function(options){ // [{scope: String, salt: String}, ...]
    _requireUninitialized();
    
    if(options.charset !== undefined){
      if(typeof options.charset !== 'string'){
        throw new Error('Invalid charset, must a string with 16 or more unique characters.');
      }

      var uniqueCharacters = '';
      for(var x = 0; x < options.charset.length; x++){
        if(uniqueCharacters.indexOf(options.charset[x]) === -1){
          uniqueCharacters += options.charset[x];
        }
      }
      
      if(uniqueCharacters.length < 16){ // Required by hashids
        throw new Error('Invalid charset, must a string with 16 or more unique characters.');
      }

      _charset = uniqueCharacters;
    }
    
    if(options.hashLength !== undefined){
      options.hashLength = parseInt(options.hashLength);

      if(isNaN(options.hashLength) || options.hashLength < 0){
        throw new Error('Invalid hashLength, must be a positive number.');
      }

      _hashLength = options.hashLength;
    }
    
    if(options.shuffleOutput !== undefined){
      _shuffleOutput = !!options.shuffleOutput;
    }
    
    if(options.objectId !== undefined){
      if(typeof options.objectId !== 'function'){
        throw new Error('Invalid objectId, should pass in Mongoose or MongoDB ObjectId variable.');
      }

      try{
        var randomObjectId = _generateRandomObjectId();
        if(options.objectId(randomObjectId).toString() !== randomObjectId){
          throw new Error('Invalid objectId, should pass in Mongoose or MongoDB ObjectId variable.');
        }
      }
      catch(err){
        throw new Error('Invalid objectId, should pass in Mongoose or MongoDB ObjectId variable.');
      }

      _objectId = options.objectId;
    }
    
    if(!options.scopes || !(options.scopes instanceof Array) || options.scopes.length == 0){
      throw new Error('Invalid scopes. Must be an array of {scope, salt} which are strings.');
    }
    
    var scopes = {};
    for(var i = 0; i < options.scopes.length; i++){
      if(!options.scopes[i].scope ||
         typeof options.scopes[i].scope !== 'string' ||
         !options.scopes[i].salt ||
         typeof options.scopes[i].salt !== 'string'){
        throw new Error('Invalid scopes. Must be an array of {scope, salt} which are strings.');
      }
      if(scopes[options.scopes[i].scope]){
        throw new Error('Scope exists. Please ensure that scopes are unique.');
      }
      
      scopes[options.scopes[i].scope] = _createHasher(options.scopes[i].salt);
    }

    _scopes = Object.freeze(scopes);

    _initialized = true;
  },
  
  reset: function(){
    _charset = Defaults.charset; 
    _scopes = Defaults.scopes;
    _hashLength = Defaults.hashLength;
    _shuffleOutput = Defaults.shuffleOutput;
    _objectId = Defaults.objectId;
    _initialized = false;
  }
}
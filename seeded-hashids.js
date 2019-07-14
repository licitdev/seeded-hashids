const HashIds = require('hashids');

const HexPattern = /^[a-fA-F0-9]+$/;
const Defaults = {
  scopes: {},
  charset: 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', // Removed 1, 0, iI, oO which could look confusing
  minOutputLength: 8,
  shuffleOutput: true,
  objectId: null, // Use require('mongoose').Types.ObjectId or require('mongodb').ObjectId or similar
  shuffleFunction: _shuffleSeededString,
  unshuffleFunction: _unshuffleSeededString
};

let _initialized = false;
let _scopes = Defaults.scopes;
let _charset = Defaults.charset;
let _minOutputLength = Defaults.minOutputLength;
let _shuffleOutput = Defaults.shuffleOutput;
let _objectId = Defaults.objectId;
let _shuffleFunction = Defaults.shuffleFunction;
let _unshuffleFunction = Defaults.unshuffleFunction;

function _generateRandomObjectId() { // Used for testing the ObjectId variable
  let text = "";
  let charList = "0123456789abcdef";
  for (let i = 0; i < 24; i++) {
    text += charList.charAt(Math.floor(Math.random() * charList.length));
  }
  return text;
}

function _createHasher(salt) {
  return new HashIds(salt, _minOutputLength, _getShuffledCharset(salt));
}

function _shuffleSeededString(str, seed) {
  return _shuffleSeededArray(str.split(''), seed).join('');
}

function _unshuffleSeededString(str, seed) {
  return _unshuffleSeededArray(str.split(''), seed).join('');
}

function _getShuffledCharset(seed) {
  return _shuffleSeededString(_charset, seed);
}

// Shuffle is not guaranteed to be unique
function _shuffleSeededArray(array, seed) { // Always required to have a seed
  seed = _seedFromString(seed);
  let currentIndex = array.length, randomIndex, temp;
  let random = function() {
    var x = Math.sin(++seed) * 10000;
    return x - Math.floor(x);
  };
  while (0 !== currentIndex) {
    randomIndex = Math.floor(random() * currentIndex);
    currentIndex -= 1;
    temp = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temp;
  }
  return array;
}

// Unshuffle is not guaranteed to be unique
function _unshuffleSeededArray(array, seed) { // Always required to have a seed
  seed = _seedFromString(seed);
  let currentIndex = 0, maxIndex = array.length, randomIndex, temp;
  seed += array.length + 1
  let random = function() {
    var x = Math.sin(--seed) * 10000;
    return x - Math.floor(x);
  };
  while (currentIndex !== maxIndex) {
    randomIndex = Math.floor(random() * (currentIndex + 1));
    temp = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temp;
    currentIndex += 1;
  }
  return array;
}

function _seedFromString(s) {
 return s.split("").reduce(function(a, b) {
  a = ((a << 5) - a) + b.charCodeAt(0);
  return a & a
 }, 0);
}

function _doShuffleOutput(hashid, seed) { // Always required to have a seed
  let shuffledCharset = _getShuffledCharset(seed);
  let outputHashid = '';
  for (let x = 0; x < hashid.length; x++) {
    outputHashid += shuffledCharset[_charset.indexOf(hashid[x])]
  }
  return _shuffleSeededString(outputHashid, seed);
}

function _doUnshuffleOutput(hashid, seed) { // Always required to have a seed
  hashid = _unshuffleSeededString(hashid, seed);
  let shuffledCharset = _getShuffledCharset(seed);
  let outputHashid = '';
  for (let x = 0; x < hashid.length; x++) {
    outputHashid += _charset[shuffledCharset.indexOf(hashid[x])]
  }
  return outputHashid;
}

function _encode(useHex, scope, data, seed) {
  let selectedHasher = _scopes[scope];

  if (!selectedHasher) {
    throw new Error('Missing scope.');
  }
  
  let isArray = false;

  if (useHex) {
    if (!data || typeof data !== 'string' || !HexPattern.test(data)) {
      throw new Error('Missing data, must be a hex string.');
    }
  } else {
    if (data === undefined) {
      throw new Error('Missing data, must be a positive number or an array of positive numbers.');
    }
    else if(typeof data === 'number'){
      let temp = parseInt(data);
      if(isNaN(temp) || temp < 0){
        throw new Error('Invalid data, must be a positive number greater of equals 0.');
      }
    }
    else if(typeof data === 'object' && data.constructor === Array){
      if(data.length === 0){
        throw new Error('Invalid data, must be an array of positive number greater or equals 0.');
      }
      for(let i = 0; i < data.length; i++){
        let temp = parseInt(data[i]);
        if(isNaN(temp) || temp < 0){
          throw new Error('Invalid data, numbers within array must be greater or equals 0.');
        }
      }
      isArray = true;
    }
    else{
      throw new Error('Invalid data, must be a positive number or an array of positive numbers.');
    }
  }

  if (seed !== undefined && typeof seed !== 'string') {
    throw new Error('Invalid seed, must be a string.');
  }
  
  if(isArray){
    if (seed !== undefined && data) {
      data = data.map((x) => x); // Prevent changes to array that was passed in
      data = _shuffleSeededArray(data, scope + seed);
    }
  }
  else{
    data = data.toString(); // Convert to string so it could be shuffled

    // Must have seed and data cannot be empty string
    if (seed !== undefined && data) {
      data = _shuffleSeededString(data, scope + seed);
    }
  }

  let hashid;

  if (useHex) {
    // Hex based hashid
    hashid = selectedHasher.encodeHex(data);
  } else {
    // Count based hashid
    hashid = selectedHasher.encode(data);
  }

  if (!hashid) { // Crossed Hashids limit of hashids that can be generated with charset
    throw new Error('Input data too huge, unable to encoded.');
  }

  if (_shuffleOutput && seed !== undefined) {
    return _doShuffleOutput(hashid, seed);
  }

  return hashid;
}

function _decode(useHex, scope, hashid, seed) {
  let selectedHasher = _scopes[scope];

  if (!selectedHasher) {
    throw new Error('Missing scope.');
  }

  if (!hashid || typeof hashid !== 'string') {
    throw new Error('Missing hashid, must be a string.');
  }

  if (seed !== undefined && typeof seed !== 'string') {
    throw new Error('Invalid seed, must be a string.');
  }

  if (_shuffleOutput && seed !== undefined) {
    hashid = _doUnshuffleOutput(hashid, seed);
  }

  let data;
  let isArray = false;

  if (useHex) {
    // Hex based hashid
    data = selectedHasher.decodeHex(hashid);
    if (typeof data !== 'string') {
      data = '';
    }
  } else {
    // Count based hashid
    data = selectedHasher.decode(hashid);
    if(data.length === 1){
      data = data[0] + '';
    }
    else if(data.length > 1){
      isArray = true;
    }
    else{
      data = '';
    }
  }

  if(isArray){
    if (seed !== undefined && data) {
      data = _unshuffleSeededArray(data, scope + seed);
    }
  }
  else{
    // Must have seed and decoded hashid cannot be empty string
    if (seed !== undefined && data) {
      data = _unshuffleSeededString(data, scope + seed);
    }
    
    if (!useHex) {
      data = parseInt(data);
    }
  }

  return data;
}

function _requireUninitialized() {
  if (_initialized) {
    throw new Error('Unable to configure after initialization.');
  }
}

function _requireInitialized() {
  if (!_initialized) {
    throw new Error('Initialization is required.');
  }
}

module.exports = {
  isInitialized: function() {
    return _initialized;
  },

  getScopes: function() {
    return Object.keys(_scopes);
  },

  getCharset: function() {
    return _charset;
  },

  getMinOutputLength: function() {
    return _minOutputLength;
  },

  getShuffleOutput: function() {
    return _shuffleOutput;
  },

  getObjectId: function() {
    return _objectId;
  },
  
  getShuffleFunction: function() {
    return _shuffleFunction;
  },
  
  getUnshuffleFunction: function() {
    return _unshuffleFunction;
  },

  encode: function(scope, number, seed) {
    _requireInitialized();

    return _encode(false, scope, number, seed);
  },

  encodeHex: function(scope, hex, seed) {
    _requireInitialized();

    return _encode(true, scope, hex, seed);
  },

  decode: function(scope, hashid, seed) {
    _requireInitialized();

    return _decode(false, scope, hashid, seed);
  },

  decodeHex: function(scope, hashid, seed) {
    _requireInitialized();

    return _decode(true, scope, hashid, seed);
  },

  decodeObjectId: function(scope, hashid, seed) {
    _requireInitialized();

    if (!_objectId) {
      throw new Error('ObjectId variable not configured.');
    }

    // Do decode as per hex
    let data = _decode(true, scope, hashid, seed);

    // Cast to ObjectId if is 24 character hex string
    if (data && data.length === 24) {
      return _objectId(data);
    }

    return null;
  },

  initialize: function(options) { // [{scope: String, salt: String}, ...]
    _requireUninitialized();

    if (!options || typeof options !== 'object') {
      throw new Error('Invalid options object, required for initialization.');
    }

    if (options.charset !== undefined) {
      if (typeof options.charset !== 'string') {
        throw new Error('Invalid charset, must a string with 16 or more unique characters.');
      }

      let uniqueCharacters = '';
      for (let x = 0; x < options.charset.length; x++) {
        if (uniqueCharacters.indexOf(options.charset[x]) === -1) {
          uniqueCharacters += options.charset[x];
        }
      }

      if (uniqueCharacters.length < 16) { // Required by hashids
        throw new Error('Invalid charset, must a string with 16 or more unique characters.');
      }

      _charset = uniqueCharacters;
    }

    if (options.minOutputLength !== undefined) {
      options.minOutputLength = parseInt(options.minOutputLength);

      if (isNaN(options.minOutputLength) || options.minOutputLength < 0) {
        throw new Error('Invalid minOutputLength, must be a positive number.');
      }

      _minOutputLength = options.minOutputLength;
    }

    if (options.shuffleOutput !== undefined) {
      _shuffleOutput = !!options.shuffleOutput;
    }

    if (options.objectId !== undefined) {
      if (typeof options.objectId !== 'function') {
        throw new Error('Invalid objectId, should pass in Mongoose or MongoDB ObjectId variable.');
      }

      try {
        let randomObjectId = _generateRandomObjectId();
        if (options.objectId(randomObjectId).toString() !== randomObjectId) {
          throw new Error('Invalid objectId, should pass in Mongoose or MongoDB ObjectId variable.');
        }
      } catch (err) {
        throw new Error('Invalid objectId, should pass in Mongoose or MongoDB ObjectId variable.');
      }

      _objectId = options.objectId;
    }
    
    if (options.shuffleFunction !== undefined) {
      if (typeof options.shuffleFunction !== 'function') {
        throw new Error('Invalid shuffleFunction, should pass in a shuffle function that accepts (inputString, seedString) and returns an outputString.');
      }
      
      // Can't really test out as different shuffle functions could accept different input lengths.
      if (typeof options.shuffleFunction('a', 'a') !== 'string') {
        throw new Error('Invalid shuffleFunction, outputString should be of string type.');
      }

      _shuffleFunction = options.shuffleFunction;
    }
    
    if (options.unshuffleFunction !== undefined) {
      if (typeof options.unshuffleFunction !== 'function') {
        throw new Error('Invalid unshuffleFunction, should pass in an unshuffle function that accepts (inputString, seedString) and returns an outputString.');
      }
      
      // Can't really test out as different shuffle functions could accept different input lengths.
      if (typeof options.unshuffleFunction('a', 'a') !== 'string') {
        throw new Error('Invalid unshuffleFunction, outputString should be of string type.');
      }

      _unshuffleFunction = options.unshuffleFunction;
    }

    if (!options.scopes || !(options.scopes instanceof Array) || options.scopes.length == 0) {
      throw new Error('Invalid scopes. Must be an array of {scope, salt} which are strings.');
    }

    let scopes = {};
    let salts = [];
    for (let i = 0; i < options.scopes.length; i++) {
      if (!options.scopes[i].scope ||
        typeof options.scopes[i].scope !== 'string' ||
        !options.scopes[i].salt ||
        typeof options.scopes[i].salt !== 'string') {
        throw new Error('Invalid scopes. Must be an array of {scope, salt} which are strings.');
      }
      if (scopes[options.scopes[i].scope]) {
        throw new Error('Scope exists. Please ensure that scopes are unique.');
      }
      if (salts.indexOf(options.scopes[i].salt) !== -1) {
        throw new Error('Salt exists. Please ensure that salts are unique.');
      }
      
      salts.push(options.scopes[i].salt);
      scopes[options.scopes[i].scope] = _createHasher(options.scopes[i].salt);
    }

    _scopes = Object.freeze(scopes);

    _initialized = true;
  },

  reset: function() {
    _charset = Defaults.charset;
    _scopes = Defaults.scopes;
    _minOutputLength = Defaults.minOutputLength;
    _shuffleOutput = Defaults.shuffleOutput;
    _objectId = Defaults.objectId;
    _initialized = false;
  }
}
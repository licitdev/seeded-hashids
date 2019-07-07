const ShuffleSeed = require('shuffle-seed');
const HashIds = require('hashids');

const HexPattern = /^[a-fA-F0-9]+$/;
const Defaults = {
  scopes: {},
  charset: 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', // Removed 1, 0, iI, oO which could look confusing
  minOutputLength: 8,
  shuffleOutput: true,
  objectId: null // Use require('mongoose').Types.ObjectId or require('mongodb').ObjectId or similar
};

let _initialized = false;
let _scopes = Defaults.scopes;
let _charset = Defaults.charset;
let _minOutputLength = Defaults.minOutputLength;
let _shuffleOutput = Defaults.shuffleOutput;
let _objectId = Defaults.objectId;

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
  return ShuffleSeed.shuffle(str.split(''), seed).join('');
}

function _unshuffleSeededString(str, seed) {
  return ShuffleSeed.unshuffle(str.split(''), seed).join('');
}

function _getShuffledCharset(seed) {
  return _shuffleSeededString(_charset, seed);
}

function _doShuffleOutput(hashid, seed) { // Can accept undefined if no seed
  let shuffledCharset = _getShuffledCharset(seed);
  let outputHashid = '';
  for (let x = 0; x < hashid.length; x++) {
    outputHashid += shuffledCharset[_charset.indexOf(hashid[x])]
  }
  return _shuffleSeededString(outputHashid, seed);
}

function _doUnshuffleOutput(hashid, seed) { // Can accept undefined if no seed
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

  if (useHex) {
    if (!data || typeof data !== 'string' || !HexPattern.test(data)) {
      throw new Error('Missing data, must be a hex string.');
    }
  } else {
    if (data === undefined || typeof data !== 'number' || parseInt(data) < 0) {
      throw new Error('Missing data, must be a positive number.');
    }
  }

  if (seed !== undefined && typeof seed !== 'string') {
    throw new Error('Invalid seed, must be a string.');
  }

  data = data.toString(); // Convert to string so it could be shuffled

  // Must have seed and data cannot be empty string
  if (seed !== undefined && data) {
    data = _shuffleSeededString(data, scope + seed);
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

  if (useHex) {
    // Hex based hashid
    data = selectedHasher.decodeHex(hashid);
    if (typeof data !== 'string') {
      data = '';
    }
  } else {
    // Count based hashid
    data = selectedHasher.decode(hashid);
    if (data instanceof Array && data.length > 0) {
      data = data[0] + '';
    } else {
      data = '';
    }
  }

  // Must have seed and decoded hashid cannot be empty string
  if (seed !== undefined && data) {
    data = _unshuffleSeededString(data, scope + seed);
  }

  if (!useHex) {
    data = parseInt(data);
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
        throw new Error('Invalid objectId, should pass in Mongoose or MongoDB ObjectId letiable.');
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
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

function _doShuffleOutput(hash, seed) { // Can accept undefined if no seed
  let shuffledCharset = _getShuffledCharset(seed);
  let outputHash = '';
  for (let x = 0; x < hash.length; x++) {
    outputHash += shuffledCharset[_charset.indexOf(hash[x])]
  }
  return outputHash;
}

function _doUnshuffleOutput(hash, seed) { // Can accept undefined if no seed
  let shuffledCharset = _getShuffledCharset(seed);
  let outputHash = '';
  for (let x = 0; x < hash.length; x++) {
    outputHash += _charset[shuffledCharset.indexOf(hash[x])]
  }
  return outputHash;
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

  let hash;

  if (useHex) {
    // Hex based hash
    hash = selectedHasher.encodeHex(data);
  } else {
    // Count based hash
    hash = selectedHasher.encode(data);
  }

  if (!hash) { // Crossed Hashids limit of hashes that can be generated with charset
    throw new Error('Input data too huge, unable to encoded.');
  }

  if (_shuffleOutput) {
    return _doShuffleOutput(hash, seed);
  }

  return hash;
}

function _decode(useHex, scope, hash, seed) {
  let selectedHasher = _scopes[scope];

  if (!selectedHasher) {
    throw new Error('Missing scope.');
  }

  if (!hash || typeof hash !== 'string') {
    throw new Error('Missing hash, must be a string.');
  }

  if (seed !== undefined && typeof seed !== 'string') {
    throw new Error('Invalid seed, must be a string.');
  }

  if (_shuffleOutput) {
    hash = _doUnshuffleOutput(hash, seed);
  }

  let data;

  if (useHex) {
    // Hex based hash
    data = selectedHasher.decodeHex(hash);
    if (typeof data !== 'string') {
      data = '';
    }
  } else {
    // Count based hash
    data = selectedHasher.decode(hash);
    if (data instanceof Array && data.length > 0) {
      data = data[0] + '';
    } else {
      data = '';
    }
  }

  // Must have seed and decoded hash cannot be empty string
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

    if (!_objectId) {
      throw new Error('ObjectId variable not configured.');
    }

    // Do decode as per hex
    let data = _decode(true, scope, hash, seed);

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
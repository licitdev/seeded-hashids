var seededHashids = require('../seeded-hashids');
var assert = require('chai').assert;

var defaults = {
  scopes: [
    {scope: 'user', salt: 'abcd'},
    {scope: 'profile', salt: '1234'},
  ],
  objectId: require('mongoose').Types.ObjectId, // Can also use require('mongodb').ObjectId
  hashLength: 8,
  charset: '1234567890abcdef',
  shuffleOutput: true
};

describe('when uninitialized', () => {
  
	it('should throw an error for .encode', () => {
		assert.throws(() => {
      seededHashids.encode();
		});
	});
  
  it('should throw an error for .encodeHex', () => {
		assert.throws(() => {
      seededHashids.encodeHex();
		});
	});
  
  it('should throw an error for .decode', () => {
		assert.throws(() => {
      seededHashids.decode();
		});
	});
  
  it('should throw an error for .decodeHex', () => {
		assert.throws(() => {
      seededHashids.decodeHex();
		});
	});
  
  it('should throw an error for .decodeObjectId', () => {
		assert.throws(() => {
      seededHashids.decodeObjectId();
		});
	});
  
  it('should throw an error for .decodeObjectId', () => {
		assert.throws(() => {
      seededHashids.decodeObjectId();
		});
	});

});

describe('when initializing', () => {
  afterEach(() => {
    seededHashids.reset();
  });
  
  it('should not throw an error if reset', () => {
		assert.doesNotThrow(() => {
      seededHashids.reset();
		});
	});
  
	it('should throw an error if missing scopes', () => {
		assert.throws(() => {
      seededHashids.initialize({});
		});
    assert.throws(() => {
      seededHashids.initialize({scopes: []});
		});
	});
  
  it('should throw an error if scopes are invalid', () => {
		assert.throws(() => {
      seededHashids.initialize({scopes: [{scope: 'test', salt: 'salt'}, {scope: 123, salt: 'salt'}]});
		});
    assert.throws(() => {
      seededHashids.initialize({scopes: [{scope: 'test', salt: 'salt'}, {scope: 'test2', salt: 555}]});
		});
	});
  
  it('should throw an error if there are duplicated scopes', () => {
		assert.throws(() => {
      seededHashids.initialize({scopes: [{scope: 'test', salt: 'salt'}, {scope: 'test', salt: 'salt'}]});
		});
	});
  
  it('should throw an error if invalid hashLength is passed', () => {
		assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, hashLength: -1});
		});
    assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, hashLength: ''});
		});
    assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, hashLength: {}});
		});
	});
  
  it('should throw an error if invalid charset is passed', () => {
		assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, charset: '1234567890'});
		});
    assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, charset: 1234567890});
		});
    assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, charset: '11223344556677889900'});
		});
    assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, charset: {}});
		});
	});
  
  it('should throw an error if invalid objectid is passed', () => {
		assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, objectId: ''});
		});
    assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, objectId: {}});
		});
    assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, objectId: function(v){return null;}});
		});
    assert.throws(() => {
      seededHashids.initialize({scopes: defaults.scopes, objectId: function(v){return '';}});
		});
	});
  
  it('should not throw an error if valid initialization with objectId', () => {
		assert.doesNotThrow(() => {
      seededHashids.initialize(defaults);
		});
	});
  
  it('should not throw an error if valid initialization without objectId', () => {
		assert.doesNotThrow(() => {
      var temp = defaults.objectId;
      delete defaults.objectId;
      seededHashids.initialize(defaults);
      defaults.objectId = temp;
		});
	});
  
});


describe('when initialized', () => {
  
  before(() => {
    seededHashids.reset();
    seededHashids.initialize(defaults);
  });
  
	it('should throw an error for .initialize', () => {    
		assert.throws(() => {
      seededHashids.initialize();
		});
	});
  
  it('should get the same value for .getInitialized', () => {
    assert.deepEqual(true, seededHashids.getInitialized());
	});
  
  it('should get the same value for .getScopes', () => {
    assert.deepEqual(Object.keys(defaults.scopes), Object.keys(seededHashids.getScopes()));
	});
  
  it('should get the same value for .getCharset', () => {
    assert.deepEqual(defaults.charset, seededHashids.getCharset());
	});
  
  it('should get the same value for .getHashLength', () => {
    assert.deepEqual(defaults.hashLength, seededHashids.getHashLength());
	});
  
  it('should get the same value for .getShuffleOutput', () => {
    assert.deepEqual(defaults.shuffleOutput, seededHashids.getShuffleOutput());
	});
  
  it('should get the same value for .getObjectId', () => {
    assert.deepEqual(defaults.objectId, seededHashids.getObjectId());
	});

  describe('when using .encode', () => {

    it('should throw an error if missing / invalid scope', () => {
      assert.throws(() => {
        seededHashids.encode('fake', 123);
      });
      assert.throws(() => {
        seededHashids.encode({}, 123);
      });
      assert.throws(() => {
        seededHashids.encode(123, 123);
      });
    });
    
    it('should throw an error if invalid data', () => {
      assert.throws(() => {
        seededHashids.encode('user', {});
      });
      assert.throws(() => {
        seededHashids.encode('user', 'fake');
      });
      assert.throws(() => {
        seededHashids.encode('user', -1);
      });
    });
    
    it('should throw an error if invalid seed', () => {
      assert.throws(() => {
        seededHashids.encode('user', 123, {});
      });
      assert.throws(() => {
        seededHashids.encode('user', 123, 123);
      });
    });
    
    it('should throw an error if data too big be encoded', () => {
      assert.throws(() => {
        seededHashids.encode('user', 999999999999999999999);
      });
    });

  });
  
  describe('when using .encodeHex', () => {

    it('should throw an error if missing / invalid scope', () => {
      assert.throws(() => {
        seededHashids.encodeHex('fake', 'abcdef1234567890');
      });
      assert.throws(() => {
        seededHashids.encodeHex({}, 'abcdef1234567890');
      });
      assert.throws(() => {
        seededHashids.encodeHex(123, 'abcdef1234567890');
      });
    });
    
    it('should throw an error if invalid data', () => {
      assert.throws(() => {
        seededHashids.encodeHex('user', {});
      });
      assert.throws(() => {
        seededHashids.encodeHex('user', 'fake');
      });
      assert.throws(() => {
        seededHashids.encodeHex('user', -1);
      });
      assert.throws(() => {
        seededHashids.encodeHex('user', 123);
      });
    });
    
    it('should throw an error if invalid seed', () => {
      assert.throws(() => {
        seededHashids.encodeHex('user', 'abcdef1234567890', {});
      });
      assert.throws(() => {
        seededHashids.encodeHex('user', 'abcdef1234567890', 123);
      });
    });
    
  });
  
  describe('when using .decode', () => {

    it('should throw an error if missing / invalid scope', () => {
      assert.throws(() => {
        seededHashids.decode('fake', 'hash');
      });
      assert.throws(() => {
        seededHashids.decode({}, 'hash');
      });
      assert.throws(() => {
        seededHashids.decode(123, 'hash');
      });
    });
    
    it('should throw an error if invalid data', () => {
      assert.throws(() => {
        seededHashids.decode('user', {});
      });
      assert.throws(() => {
        seededHashids.decode('user', 123);
      });
    });
    
    it('should throw an error if invalid seed', () => {
      assert.throws(() => {
        seededHashids.decode('user', 'hash', {});
      });
      assert.throws(() => {
        seededHashids.decode('user', 'hash', 123);
      });
    });
    
  });
  
  describe('when using .decodeHex', () => {

    it('should throw an error if missing / invalid scope', () => {
      assert.throws(() => {
        seededHashids.decodeHex('fake', 'hash');
      });
      assert.throws(() => {
        seededHashids.decodeHex({}, 'hash');
      });
      assert.throws(() => {
        seededHashids.decodeHex(123, 'hash');
      });
    });
    
    it('should throw an error if invalid data', () => {
      assert.throws(() => {
        seededHashids.decodeHex('user', {});
      });
      assert.throws(() => {
        seededHashids.decodeHex('user', 123);
      });
    });
    
    it('should throw an error if invalid seed', () => {
      assert.throws(() => {
        seededHashids.decodeHex('user', 'hash', {});
      });
      assert.throws(() => {
        seededHashids.decodeHex('user', 'hash', 123);
      });
    });
    
  });
  
  describe('when using .decodeObjectId', () => {

    it('should throw an error if missing / invalid scope', () => {
      assert.throws(() => {
        seededHashids.decodeObjectId('fake', 'hash');
      });
      assert.throws(() => {
        seededHashids.decodeObjectId({}, 'hash');
      });
      assert.throws(() => {
        seededHashids.decodeObjectId(123, 'hash');
      });
    });
    
    it('should throw an error if invalid data', () => {
      assert.throws(() => {
        seededHashids.decodeObjectId('user', {});
      });
      assert.throws(() => {
        seededHashids.decodeObjectId('user', 123);
      });
    });
    
    it('should throw an error if invalid seed', () => {
      assert.throws(() => {
        seededHashids.decodeObjectId('user', 'hash', {});
      });
      assert.throws(() => {
        seededHashids.decodeObjectId('user', 'hash', 123);
      });
    });
    
  });
  
});

describe('when initialized without objectId', () => {
  
  before(() => {
    seededHashids.reset();
    var temp = defaults.objectId;
    delete defaults.objectId;
    seededHashids.initialize(defaults);
    defaults.objectId = temp;
  });
  
  it('should throw an error for .initialize', () => {
		assert.throws(() => {
      seededHashids.initialize();
		});
	});
  
  it('should throw an error for .decodeObjectId', () => {
		assert.throws(() => {
      seededHashids.decodeObjectId('user', 'hash');
		});
	});
  
  it('should get the same value for .getScopes', () => {
    assert.deepEqual(Object.keys(defaults.scopes), Object.keys(seededHashids.getScopes()));
	});
  
  it('should get the same value for .getCharset', () => {
    assert.deepEqual(defaults.charset, seededHashids.getCharset());
	});
  
  it('should get the same value for .getHashLength', () => {
    assert.deepEqual(defaults.hashLength, seededHashids.getHashLength());
	});
  
  it('should get the same value for .getShuffleOutput', () => {
    assert.deepEqual(defaults.shuffleOutput, seededHashids.getShuffleOutput());
	});
  
  it('should get the same value for .getObjectId', () => {
    assert.equal(null, seededHashids.getObjectId());
	});
  
});

describe('when encoding and decoding with shuffle', () => {
  
  before(() => {
    seededHashids.reset();
    seededHashids.initialize(defaults);
  });
  
  it('should run .encode and .decode correctly without salt', () => {
    var number = 12345678;
    var encoded = seededHashids.encode('user', number);
    var decoded = seededHashids.decode('user', encoded);
    assert.deepEqual(number, decoded);
	});
  
  it('should run .encode and .decode correctly with salt', () => {
    var number = 12345678;
    var salt = 'somesalt';
    var encoded = seededHashids.encode('user', number, salt);
    var decoded = seededHashids.decode('user', encoded, salt);
    assert.deepEqual(number, decoded);
	});
  
  it('should run .encodeHex and .decodeHex correctly without salt', () => {
    var hex = 'abcdef1234567890';
    var encoded = seededHashids.encodeHex('user', hex);
    var decoded = seededHashids.decodeHex('user', encoded);
    assert.deepEqual(hex, decoded);
	});
  
  it('should run .encodeHex and .decodeHex correctly with salt', () => {
    var hex = 'abcdef1234567890';
    var salt = 'somesalt';
    var encoded = seededHashids.encodeHex('user', hex, salt);
    var decoded = seededHashids.decodeHex('user', encoded, salt);
    assert.deepEqual(hex, decoded);
	});
  
  it('should run .encodeHex and .decodeObjectId correctly without salt', () => {
    var hex = 'abcdef1234567890abcdef12';
    var encoded = seededHashids.encodeHex('user', hex);
    var decoded = seededHashids.decodeObjectId('user', encoded);
    decoded = decoded.toString()
    assert.deepEqual(hex, decoded);
	});
  
  it('should run .encodeHex and .decodeObjectId correctly with salt', () => {
    var hex = 'abcdef1234567890abcdef12';
    var salt = 'somesalt';
    var encoded = seededHashids.encodeHex('user', hex, salt);
    var decoded = seededHashids.decodeObjectId('user', encoded, salt);
    decoded = decoded.toString()
    assert.deepEqual(hex, decoded);
	});
  
  it('should return NaN when .decode with an invalid hash without salt', () => {
    var hash = 'fakehash';
    var decoded = seededHashids.decode('user', hash);
    assert.deepEqual(NaN, decoded);
	});
  
  it('should return NaN when .decode with an invalid hash without salt', () => {
    var hash = 'fakehash';
    var salt = 'somesalt';
    var decoded = seededHashids.decode('user', hash, salt);
    assert.deepEqual(NaN, decoded);
	});
  
  it('should return an empty string when .decodeHex with an invalid hash without salt', () => {
    var hash = 'fakehash';
    var decoded = seededHashids.decodeHex('user', hash);
    assert.deepEqual('', decoded);
	});
  
  it('should return an empty string when .decodeHex with an invalid hash without salt', () => {
    var hash = 'fakehash';
    var salt = 'somesalt';
    var decoded = seededHashids.decodeHex('user', hash, salt);
    assert.deepEqual('', decoded);
	});
  
  it('should return null when .decodeObjectId with an invalid hash without salt', () => {
    var hex = 'abcdef1234567890';
    var encoded = seededHashids.encodeHex('user', hex);
    var decoded = seededHashids.decodeObjectId('user', encoded);
    assert.deepEqual(null, decoded);
	});
  
  it('should return null when .decodeObjectId with an invalid hash without salt', () => {
    var hex = 'abcdef1234567890';
    var salt = 'somesalt';
    var encoded = seededHashids.encodeHex('user', hex, salt);
    var decoded = seededHashids.decodeObjectId('user', encoded, salt);
    assert.deepEqual(null, decoded);
	});
  
});

describe('when encoding and decoding without shuffle', () => {
  
  before(() => {
    seededHashids.reset();
    defaults.shuffleOutput = false;
    seededHashids.initialize(defaults);
    delete defaults.shuffleOutput;
  });
  
  it('should run .encode and .decode correctly without salt', () => {
    var number = 12345678;
    var encoded = seededHashids.encode('user', number);
    var decoded = seededHashids.decode('user', encoded);
    assert.deepEqual(number, decoded);
	});
  
  it('should run .encode and .decode correctly with salt', () => {
    var number = 12345678;
    var salt = 'somesalt';
    var encoded = seededHashids.encode('user', number, salt);
    var decoded = seededHashids.decode('user', encoded, salt);
    assert.deepEqual(number, decoded);
	});
  
  it('should run .encodeHex and .decodeHex correctly without salt', () => {
    var hex = 'abcdef1234567890';
    var encoded = seededHashids.encodeHex('user', hex);
    var decoded = seededHashids.decodeHex('user', encoded);
    assert.deepEqual(hex, decoded);
	});
  
  it('should run .encodeHex and .decodeHex correctly with salt', () => {
    var hex = 'abcdef1234567890';
    var salt = 'somesalt';
    var encoded = seededHashids.encodeHex('user', hex, salt);
    var decoded = seededHashids.decodeHex('user', encoded, salt);
    assert.deepEqual(hex, decoded);
	});
  
  it('should run .encodeHex and .decodeObjectId correctly without salt', () => {
    var hex = 'abcdef1234567890abcdef12';
    var encoded = seededHashids.encodeHex('user', hex);
    var decoded = seededHashids.decodeObjectId('user', encoded);
    if(decoded){
      decoded = decoded.toString()
    }
    assert.deepEqual(hex, decoded);
	});
  
  it('should run .encodeHex and .decodeObjectId correctly with salt', () => {
    var hex = 'abcdef1234567890abcdef12';
    var salt = 'somesalt';
    var encoded = seededHashids.encodeHex('user', hex, salt);
    var decoded = seededHashids.decodeObjectId('user', encoded, salt);
    if(decoded){
      decoded = decoded.toString()
    }
    assert.deepEqual(hex, decoded);
	});
  
  it('should return NaN when .decode with an invalid hash without salt', () => {
    var hash = 'fakehash';
    var decoded = seededHashids.decode('user', hash);
    assert.deepEqual(NaN, decoded);
	});
  
  it('should return NaN when .decode with an invalid hash without salt', () => {
    var hash = 'fakehash';
    var salt = 'somesalt';
    var decoded = seededHashids.decode('user', hash, salt);
    assert.deepEqual(NaN, decoded);
	});
  
  it('should return an empty string when .decodeHex with an invalid hash without salt', () => {
    var hash = 'fakehash';
    var decoded = seededHashids.decodeHex('user', hash);
    assert.deepEqual('', decoded);
	});
  
  it('should return an empty string when .decodeHex with an invalid hash without salt', () => {
    var hash = 'fakehash';
    var salt = 'somesalt';
    var decoded = seededHashids.decodeHex('user', hash, salt);
    assert.deepEqual('', decoded);
	});
  
  it('should return null when .decodeObjectId with an invalid hash without salt', () => {
    var hex = 'abcdef1234567890';
    var encoded = seededHashids.encodeHex('user', hex);
    var decoded = seededHashids.decodeObjectId('user', encoded);
    assert.deepEqual(null, decoded);
	});
  
  it('should return null when .decodeObjectId with an invalid hash without salt', () => {
    var hex = 'abcdef1234567890';
    var salt = 'somesalt';
    var encoded = seededHashids.encodeHex('user', hex, salt);
    var decoded = seededHashids.decodeObjectId('user', encoded, salt);
    assert.deepEqual(null, decoded);
	});
  
});
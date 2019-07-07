# Seeded-Hashids
Generate seeded Hashids that is unique per scope.

[![Build Status][travis-image]][travis-url]
[![Coveralls Status][coveralls-image]][coveralls-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![NPM version][npm-version-image]][npm-url]
[![License][license-image]][license-url]

**Seeded-Hashids** is an easy to use library to generate seeded [Hashids](http://hashids.org/javascript) which is unique to a seed based on a user or group. Hide the raw ids, hex strings, objectids or uuids from end users.

An example is to generate Hashids that are unique to a particular application. Even if multiple applications shared their userids with each other, the users could not be correlated or identified by their userids.

## Sample Scenario
```
Encoding the userids and using their actual userid as a seed.
The userids are unique and never revealed to end users.
User A (ID 123)
User B (ID 456)
User C (ID 789)

Application A sees User B as 'zxcqwe' and sees User C as 'bnmrty'
Application B sees User A as 'qweasd' and sees User C as 'rtyjkl'
Application C sees User A as 'fghzxc' and sees User B as 'asdiop'

'asdiop' is supposedly only visible to Application C.
If Application A decodes 'asdiop', it decodes to an empty string.
```

## Getting started

Install Seeded-Hashids via:

- [npm](https://npmjs.com): `npm install --save seeded-hashids`
- [yarn](http://yarnpkg.com): `yarn add seeded-hashids`

Sample code:

```javascript
const seededHashids = require('seeded-hashids');
const ObjectId = require('mongoose').Types.ObjectId;
const scopes = [
	{scope: 'user', salt: 'some-salt'}
];

seededHashids.initialize({scopes: scopes, objectId: ObjectId});

let encoded, decoded;

// Encoding hex strings
encoded = seededHashids.encodeHex('user', 'abcd1234');
decoded = seededHashids.decodeHex('user', encoded);
console.log(encoded); // 'rdksH67E'
console.log(decoded); // 'abcd1234'

// Encoding hex strings with seed
encoded = seededHashids.encodeHex('user', 'abcd1234', 'unique-seed');
decoded = seededHashids.decodeHex('user', encoded, 'unique-seed');
console.log(encoded); // 'dvdztVza'
console.log(decoded); // 'abcd1234'

// If a wrong seed is used to decode, will decode to a different output  
decoded = seededHashids.decodeHex('user', encoded, 'wrong-seed');
console.log(decoded); // '' (Empty string)

// Decoding ObjectIds, same as hex but needs to be 24 characters hex string
encoded = seededHashids.encodeHex('user', 'abcd1234abcd1234abcd1234', 'unique-seed');
decoded = seededHashids.decodeObjectId('user', encoded, 'unique-seed');
console.log(encoded); // 'U5FdAz8EvEErzga96Z5z6S'
console.log(decoded); // ObjectId('abcd1234abcd1234abcd1234')

// Encoding positive integers
encoded = seededHashids.encode('user', 12345678);
decoded = seededHashids.decode('user', encoded);
console.log(encoded); // 'vxfR8swj'
console.log(decoded); // 12345678
```

## API

### **initialize (options)** : noResult `undefined`
> To set up the required scopes and other parameters.
```javascript
seededHashids.initialize({
	scopes: scopes,
    charset: charset,
    hashLength: hashLength,
    shuffleOutput: shuffleOutput,
    objectId: objectId
});
```

#### options `Object`

Field | Required | Type | Defaults
:---  | :---: | :---: | :---
scopes | yes | `Array` | -
charset | no | `String` | `a-z, A-Z, 2-9` without `i, I, o, O, 1, 0` to increase readibility
hashLength | no | `Number` |  8
shuffleOutput | no | `Boolean` | true
objectId | no | `ObjectId` | -

##### scopes `Array`
- The array is a list of scope object that contains a scope string and a salt string.
- Each scope could be then name of a class or an object type.
```javascript
let scope = [
	{scope: 'user', salt: 'some-salt'},
    {scope: 'profile', salt: 'another-salt'},
];
```

##### charset `String` *(optional)*
- This value is passed directly to Hashids.
- A minimum of 16 unique characters are required.
```javascript
let charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
```

##### hashLength `Number` *(optional)*
- This value is passed directly to Hashids, which adds padding to reach the length required.
```javascript
let hashLength = 8;
```

##### shuffleOutput `Boolean` *(optional)*
- This value determines if the output hash will be shuffled after encoding by Hashids and before decoding by Hashids. 
- The output is shuffled based on the seed and attempts to prevent decoding using a wrong seed.
```javascript
let shuffleOutput = true;
```

##### objectId `Function` *(optional)*
- This object is required only if there is a need to cast the decoding output to an ObjectId using .decodeObjectId.
- Can pass in `require('mongoose').Types.ObjectId ` or `require('mongodb').ObjectId` or functions.
```javascript
let objectId = require('mongoose').Types.ObjectId;
```
---
### **encode (scope, number, [seed])** : Hashid `String`
> To encode positive numbers.
```javascript
let userId = seededHashids.encode('user', 12345678);
```

#### scope `String`
- This scope should be the same scope string that was used during initialization.

#### number `String`
- This number to be encoded.

#### seed `String` *(optional)*
- This seed is used to generate a hashid that is "unique" for itself.
---
### **encodeHex (scope, hex, [seed])** : Hashid `String`
> To encode hex strings.
```javascript
let userId = seededHashids.encodeHex('user', 'abcd1234', 'unique-seed');
```

#### scope `String`
- This scope should be the same scope string that was used during initialization.

#### hex `String`
- This hex string to be encoded.

#### seed `String` *(optional)*
- This seed is used to generate a hashid that is "unique" for itself.

---
### **decode (scope, hash, [seed])** : decodedNumber `Number`
> To decode hashes into positive numbers. Returns NaN if unable to decode.
```javascript
let userId = seededHashids.decode('user', 'vxfR8swj', 'unique-seed');
```

#### scope `String`
- This scope should be the same scope string that was used during initialization.

#### hash `String`
- This hash to be decoded.

#### seed `String` *(optional)*
- This seed is used to decode a hashid that is "unique" for itself.
---
### **decodeHex (scope, hash, [seed])** : decodedHex `String`
> To decode hashes into hex strings. Returns an empty string if unable to decode.
```javascript
let userId = seededHashids.decodeHex('user', 'dvdztVza', 'unique-seed');
```

#### scope `String`
- This scope should be the same scope string that was used during initialization.

#### hash `String`
- This hash to be decoded.

#### seed `String` *(optional)*
- This seed is used to decode a hashid that is "unique" for itself.
---
### **decodeObjectId (scope, hash, [seed])** : decodedObjectId `ObjectId`
> To decode hashes into objectIds. Returns NaN if unable to decode.
```javascript
let userId = seededHashids.decodeObjectId('user', 'U5FdAz8EvEErzga96Z5z6S', 'unique-seed');
```

#### scope `String`
- This scope should be the same scope string that was used during initialization.

#### hash `String`
- This hash to be decoded.

#### seed `String` *(optional)*
- This seed is used to decode a hashid that is "unique" for itself.
---
### **reset ()** : noResult `undefined`
> To reset seededHashids, needs to initialize() again before usage.
```javascript
seededHashids.reset();
```
---
### **isInitialized ()** : isInitialized `Boolean`
> To check if seededHashids is initialized.
```javascript
let isInitialized = seededHashids.isInitialized();
```
---
### **getScopes ()** : scopes `Array`
> To get the string array of scopes.
```javascript
let scopes = seededHashids.getScopes();
```
---
### **getCharset ()** : charset `String`
> To get the charset string.
```javascript
let charset = seededHashids.getCharset();
```
---
### **getHashLength ()** : hashLength `Number`
> To get the hash length.
```javascript
let hashLength = seededHashids.getHashLength();
```
---
### **getShuffleOutput ()** : shuffleOutput `Boolean`
> To check if the output is shuffled.
```javascript
let shuffleOutput = seededHashids.getShuffleOutput();
```
---
### **getObjectId ()** : objectId `Function`
> To get the objectId function to see if available.
```javascript
let objectId = seededHashids.getObjectId();
```

## Recommendations
1. Charset should **not** be too short.
2. Salts should **not** be too short.
3. Seeds should **not** be too short. Recommended to use **long** hex strings such as ObjectIds or UUIDs.
4. Encode **longer** hex strings such as ObjectIds or UUIDs.
5. Always **validate** the output after decoding.
6. Leave the shuffleOutput as **true**, which is the default value.
7. Encode and decode as required, recommended for database to contain only **original** ids or hex strings.

## Pitfalls
1. Encoding of an array of numbers is **not** supported.
2. Encoding of negative numbers are **not** supported.
3. Required to pass in the **correct type** of parameters in order to prevent invalid hashes by accident.
4. It is still **possible** for a different seed to decode a hash, but it is really rare if the **recommendations** are followed. 
4. Do **not** use this library as a security tool and do not encode sensitive data. This is **not** an encryption library.

## License

MIT License. See the [LICENSE](LICENSE) file.

[travis-url]: https://travis-ci.com/licitdev/seeded-hashids.js
[travis-image]: https://travis-ci.com/licitdev/seeded-hashids.svg

[coveralls-url]: https://coveralls.io/github/licitdev/seeded-hashids
[coveralls-image]: https://coveralls.io/repos/github/licitdev/seeded-hashids/badge.svg

[npm-downloads-image]: https://img.shields.io/npm/dm/seeded-hashids.svg?style=flat-square
[npm-version-image]: https://img.shields.io/npm/v/seeded-hashids.svg
[npm-url]: https://www.npmjs.com/package/seeded-hashids

[license-url]: https://github.com/licitdev/seeded-hashids/blob/master/LICENSE
[license-image]: https://img.shields.io/packagist/l/hashids/hashids.svg?style=flat
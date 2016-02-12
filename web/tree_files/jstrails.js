(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

// Require Trail
var Trail = require('./src/js/trail' );

module.exports = jstrails = (function(){

  // Flag bad practises
 'use strict';

  return {
    create: function(){
      return new Trail();
    }
  };
}());

},{"./src/js/trail":73}],2:[function(require,module,exports){
// UMD header
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.ayepromise = factory();
    }
}(this, function () {
    'use strict';

    var ayepromise = {};

    /* Wrap an arbitrary number of functions and allow only one of them to be
       executed and only once */
    var once = function () {
        var wasCalled = false;

        return function wrapper(wrappedFunction) {
            return function () {
                if (wasCalled) {
                    return;
                }
                wasCalled = true;
                wrappedFunction.apply(null, arguments);
            };
        };
    };

    var getThenableIfExists = function (obj) {
        // Make sure we only access the accessor once as required by the spec
        var then = obj && obj.then;

        if (typeof obj === "object" && typeof then === "function") {
            // Bind function back to it's object (so fan's of 'this' don't get sad)
            return function() { return then.apply(obj, arguments); };
        }
    };

    var aThenHandler = function (onFulfilled, onRejected) {
        var defer = ayepromise.defer();

        var doHandlerCall = function (func, value) {
            setTimeout(function () {
                var returnValue;
                try {
                    returnValue = func(value);
                } catch (e) {
                    defer.reject(e);
                    return;
                }

                if (returnValue === defer.promise) {
                    defer.reject(new TypeError('Cannot resolve promise with itself'));
                } else {
                    defer.resolve(returnValue);
                }
            }, 1);
        };

        var callFulfilled = function (value) {
            if (onFulfilled && onFulfilled.call) {
                doHandlerCall(onFulfilled, value);
            } else {
                defer.resolve(value);
            }
        };

        var callRejected = function (value) {
            if (onRejected && onRejected.call) {
                doHandlerCall(onRejected, value);
            } else {
                defer.reject(value);
            }
        };

        return {
            promise: defer.promise,
            handle: function (state, value) {
                if (state === FULFILLED) {
                    callFulfilled(value);
                } else {
                    callRejected(value);
                }
            }
        };
    };

    // States
    var PENDING = 0,
        FULFILLED = 1,
        REJECTED = 2;

    ayepromise.defer = function () {
        var state = PENDING,
            outcome,
            thenHandlers = [];

        var doSettle = function (settledState, value) {
            state = settledState;
            // persist for handlers registered after settling
            outcome = value;

            thenHandlers.forEach(function (then) {
                then.handle(state, outcome);
            });

            // Discard all references to handlers to be garbage collected
            thenHandlers = null;
        };

        var doFulfill = function (value) {
            doSettle(FULFILLED, value);
        };

        var doReject = function (error) {
            doSettle(REJECTED, error);
        };

        var registerThenHandler = function (onFulfilled, onRejected) {
            var thenHandler = aThenHandler(onFulfilled, onRejected);

            if (state === PENDING) {
                thenHandlers.push(thenHandler);
            } else {
                thenHandler.handle(state, outcome);
            }

            return thenHandler.promise;
        };

        var safelyResolveThenable = function (thenable) {
            // Either fulfill, reject or reject with error
            var onceWrapper = once();
            try {
                thenable(
                    onceWrapper(transparentlyResolveThenablesAndSettle),
                    onceWrapper(doReject)
                );
            } catch (e) {
                onceWrapper(doReject)(e);
            }
        };

        var transparentlyResolveThenablesAndSettle = function (value) {
            var thenable;

            try {
                thenable = getThenableIfExists(value);
            } catch (e) {
                doReject(e);
                return;
            }

            if (thenable) {
                safelyResolveThenable(thenable);
            } else {
                doFulfill(value);
            }
        };

        var onceWrapper = once();
        return {
            resolve: onceWrapper(transparentlyResolveThenablesAndSettle),
            reject: onceWrapper(doReject),
            promise: {
                then: registerThenHandler,
                fail: function (onRejected) {
                    return registerThenHandler(null, onRejected);
                }
            }
        };
    };

    return ayepromise;
}));

},{}],3:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],4:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"base64-js":3,"ieee754":34,"isarray":5}],5:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],6:[function(require,module,exports){
(function (Buffer){
var clone = (function() {
'use strict';

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
*/
function clone(parent, circular, depth, prototype) {
  var filter;
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    filter = circular.filter;
    circular = circular.circular
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth == 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
};
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
};
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
};
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
};
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
};
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this,require("buffer").Buffer)

},{"buffer":4}],7:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = [],
        peg$c1 = function() { return []},
        peg$c2 = peg$FAILED,
        peg$c3 = ",",
        peg$c4 = { type: "literal", value: ",", description: "\",\"" },
        peg$c5 = function(x, xs) { return [x].concat(xs); },
        peg$c6 = function(entry) { return [entry]; },
        peg$c7 = function(url, format) { return {url: url, format: format}; },
        peg$c8 = function(url) { return {url: url}; },
        peg$c9 = "url(",
        peg$c10 = { type: "literal", value: "url(", description: "\"url(\"" },
        peg$c11 = ")",
        peg$c12 = { type: "literal", value: ")", description: "\")\"" },
        peg$c13 = function(value) { return value; },
        peg$c14 = "format(",
        peg$c15 = { type: "literal", value: "format(", description: "\"format(\"" },
        peg$c16 = "local(",
        peg$c17 = { type: "literal", value: "local(", description: "\"local(\"" },
        peg$c18 = function(value) { return {local: value}; },
        peg$c19 = /^[^)]/,
        peg$c20 = { type: "class", value: "[^)]", description: "[^)]" },
        peg$c21 = function(chars) { return util.extractValue(chars.join("")); },
        peg$c22 = /^[ \t\r\n\f]/,
        peg$c23 = { type: "class", value: "[ \\t\\r\\n\\f]", description: "[ \\t\\r\\n\\f]" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0, s1;

      s0 = peg$parsesourceEntries();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c1();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parsesourceEntries() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsesourceEntry();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsewhitespace();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsewhitespace();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c3;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c4); }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parsewhitespace();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parsewhitespace();
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsesourceEntries();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c5(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsesourceEntry();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c6(s1);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parsesourceEntry() {
      var s0;

      s0 = peg$parseurlEntry();
      if (s0 === peg$FAILED) {
        s0 = peg$parselocalEntry();
      }

      return s0;
    }

    function peg$parseurlEntry() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseurl();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsewhitespace();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsewhitespace();
          }
        } else {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseformat();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c7(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseurl();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c8(s1);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseurl() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c9) {
        s1 = peg$c9;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c10); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsevalue();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 41) {
            s3 = peg$c11;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c12); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c13(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseformat() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 7) === peg$c14) {
        s1 = peg$c14;
        peg$currPos += 7;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c15); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsevalue();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 41) {
            s3 = peg$c11;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c12); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c13(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parselocalEntry() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c16) {
        s1 = peg$c16;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c17); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsevalue();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 41) {
            s3 = peg$c11;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c12); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c18(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parsevalue() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c19.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c20); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c19.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c20); }
          }
        }
      } else {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c21(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsewhitespace() {
      var s0;

      if (peg$c22.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c23); }
      }

      return s0;
    }


      var util = require('../util');


    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{"../util":9}],8:[function(require,module,exports){
var grammar = require('./grammar');


exports.SyntaxError = function (message, offset) {
    this.message  = message;
    this.offset   = offset;
};

exports.parse = function (fontFaceSourceValue) {
    try {
        return grammar.parse(fontFaceSourceValue);
    } catch (e) {
        throw new exports.SyntaxError(e.message, e.offset);
    }
};

exports.serialize = function (parsedFontFaceSources) {
    return parsedFontFaceSources.map(function (sourceItem) {
        var itemValue;

        if (sourceItem.url) {
            itemValue = 'url("' + sourceItem.url + '")';
            if (sourceItem.format) {
                itemValue += ' format("' + sourceItem.format + '")';
            }
        } else {
            itemValue = 'local("' + sourceItem.local + '")';
        }
        return itemValue;
    }).join(', ');
};

},{"./grammar":7}],9:[function(require,module,exports){
var trimCSSWhitespace = function (value) {
    var whitespaceRegex = /^[\t\r\f\n ]*(.+?)[\t\r\f\n ]*$/;

    return value.replace(whitespaceRegex, "$1");
};

var unquoteString = function (quotedUrl) {
    var doubleQuoteRegex = /^"(.*)"$/,
        singleQuoteRegex = /^'(.*)'$/;

    if (doubleQuoteRegex.test(quotedUrl)) {
        return quotedUrl.replace(doubleQuoteRegex, "$1");
    } else {
        if (singleQuoteRegex.test(quotedUrl)) {
            return quotedUrl.replace(singleQuoteRegex, "$1");
        } else {
            return quotedUrl;
        }
    }
};

exports.extractValue = function (value) {
    return unquoteString(trimCSSWhitespace(value));
};

},{}],10:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

'use strict';

exports.match = matchQuery;
exports.parse = parseQuery;

// -----------------------------------------------------------------------------

var RE_MEDIA_QUERY     = /(?:(only|not)?\s*([^\s\(\)]+)(?:\s*and)?\s*)?(.+)?/i,
    RE_MQ_EXPRESSION   = /\(\s*([^\s\:\)]+)\s*(?:\:\s*([^\s\)]+))?\s*\)/,
    RE_MQ_FEATURE      = /^(?:(min|max)-)?(.+)/,
    RE_LENGTH_UNIT     = /(em|rem|px|cm|mm|in|pt|pc)?$/,
    RE_RESOLUTION_UNIT = /(dpi|dpcm|dppx)?$/;

function matchQuery(mediaQuery, values) {
    return parseQuery(mediaQuery).some(function (query) {
        var inverse = query.inverse;

        // Either the parsed or specified `type` is "all", or the types must be
        // equal for a match.
        var typeMatch = query.type === 'all' || values.type === query.type;

        // Quit early when `type` doesn't match, but take "not" into account.
        if ((typeMatch && inverse) || !(typeMatch || inverse)) {
            return false;
        }

        var expressionsMatch = query.expressions.every(function (expression) {
            var feature  = expression.feature,
                modifier = expression.modifier,
                expValue = expression.value,
                value    = values[feature];

            // Missing or falsy values don't match.
            if (!value) { return false; }

            switch (feature) {
                case 'orientation':
                case 'scan':
                    return value.toLowerCase() === expValue.toLowerCase();

                case 'width':
                case 'height':
                case 'device-width':
                case 'device-height':
                    expValue = toPx(expValue);
                    value    = toPx(value);
                    break;

                case 'resolution':
                    expValue = toDpi(expValue);
                    value    = toDpi(value);
                    break;

                case 'aspect-ratio':
                case 'device-aspect-ratio':
                case /* Deprecated */ 'device-pixel-ratio':
                    expValue = toDecimal(expValue);
                    value    = toDecimal(value);
                    break;

                case 'grid':
                case 'color':
                case 'color-index':
                case 'monochrome':
                    expValue = parseInt(expValue, 10) || 1;
                    value    = parseInt(value, 10) || 0;
                    break;
            }

            switch (modifier) {
                case 'min': return value >= expValue;
                case 'max': return value <= expValue;
                default   : return value === expValue;
            }
        });

        return (expressionsMatch && !inverse) || (!expressionsMatch && inverse);
    });
}

function parseQuery(mediaQuery) {
    return mediaQuery.split(',').map(function (query) {
        query = query.trim();

        var captures    = query.match(RE_MEDIA_QUERY),
            modifier    = captures[1],
            type        = captures[2],
            expressions = captures[3] || '',
            parsed      = {};

        parsed.inverse = !!modifier && modifier.toLowerCase() === 'not';
        parsed.type    = type ? type.toLowerCase() : 'all';

        // Split expressions into a list.
        expressions = expressions.match(/\([^\)]+\)/g) || [];

        parsed.expressions = expressions.map(function (expression) {
            var captures = expression.match(RE_MQ_EXPRESSION),
                feature  = captures[1].toLowerCase().match(RE_MQ_FEATURE);

            return {
                modifier: feature[1],
                feature : feature[2],
                value   : captures[2]
            };
        });

        return parsed;
    });
}

// -- Utilities ----------------------------------------------------------------

function toDecimal(ratio) {
    var decimal = Number(ratio),
        numbers;

    if (!decimal) {
        numbers = ratio.match(/^(\d+)\s*\/\s*(\d+)$/);
        decimal = numbers[1] / numbers[2];
    }

    return decimal;
}

function toDpi(resolution) {
    var value = parseFloat(resolution),
        units = String(resolution).match(RE_RESOLUTION_UNIT)[1];

    switch (units) {
        case 'dpcm': return value / 2.54;
        case 'dppx': return value * 96;
        default    : return value;
    }
}

function toPx(length) {
    var value = parseFloat(length),
        units = String(length).match(RE_LENGTH_UNIT)[1];

    switch (units) {
        case 'em' : return value * 16;
        case 'rem': return value * 16;
        case 'cm' : return value * 96 / 2.54;
        case 'mm' : return value * 96 / 2.54 / 10;
        case 'in' : return value * 96;
        case 'pt' : return value * 72;
        case 'pc' : return value * 72 / 12;
        default   : return value;
    }
}

},{}],11:[function(require,module,exports){
//.CommonJS
var CSSOM = {
    CSSRule: require("./CSSRule").CSSRule,
    MatcherList: require("./MatcherList").MatcherList
};
///CommonJS


/**
 * @constructor
 * @see https://developer.mozilla.org/en/CSS/@-moz-document
 */
CSSOM.CSSDocumentRule = function CSSDocumentRule() {
    CSSOM.CSSRule.call(this);
    this.matcher = new CSSOM.MatcherList;
    this.cssRules = [];
};

CSSOM.CSSDocumentRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSDocumentRule.prototype.constructor = CSSOM.CSSDocumentRule;
CSSOM.CSSDocumentRule.prototype.type = 10;
//FIXME
//CSSOM.CSSDocumentRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
//CSSOM.CSSDocumentRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

Object.defineProperty(CSSOM.CSSDocumentRule.prototype, "cssText", {
  get: function() {
    var cssTexts = [];
    for (var i=0, length=this.cssRules.length; i < length; i++) {
        cssTexts.push(this.cssRules[i].cssText);
    }
    return "@-moz-document " + this.matcher.matcherText + " {" + cssTexts.join("") + "}";
  }
});


//.CommonJS
exports.CSSDocumentRule = CSSOM.CSSDocumentRule;
///CommonJS

},{"./CSSRule":17,"./MatcherList":23}],12:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSStyleDeclaration: require("./CSSStyleDeclaration").CSSStyleDeclaration,
	CSSRule: require("./CSSRule").CSSRule
};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#css-font-face-rule
 */
CSSOM.CSSFontFaceRule = function CSSFontFaceRule() {
	CSSOM.CSSRule.call(this);
	this.style = new CSSOM.CSSStyleDeclaration;
	this.style.parentRule = this;
};

CSSOM.CSSFontFaceRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSFontFaceRule.prototype.constructor = CSSOM.CSSFontFaceRule;
CSSOM.CSSFontFaceRule.prototype.type = 5;
//FIXME
//CSSOM.CSSFontFaceRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
//CSSOM.CSSFontFaceRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

// http://www.opensource.apple.com/source/WebCore/WebCore-955.66.1/css/WebKitCSSFontFaceRule.cpp
Object.defineProperty(CSSOM.CSSFontFaceRule.prototype, "cssText", {
  get: function() {
    return "@font-face {" + this.style.cssText + "}";
  }
});


//.CommonJS
exports.CSSFontFaceRule = CSSOM.CSSFontFaceRule;
///CommonJS

},{"./CSSRule":17,"./CSSStyleDeclaration":18}],13:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSRule: require("./CSSRule").CSSRule,
	CSSStyleSheet: require("./CSSStyleSheet").CSSStyleSheet,
	MediaList: require("./MediaList").MediaList
};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#cssimportrule
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSImportRule
 */
CSSOM.CSSImportRule = function CSSImportRule() {
	CSSOM.CSSRule.call(this);
	this.href = "";
	this.media = new CSSOM.MediaList;
	this.styleSheet = new CSSOM.CSSStyleSheet;
};

CSSOM.CSSImportRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSImportRule.prototype.constructor = CSSOM.CSSImportRule;
CSSOM.CSSImportRule.prototype.type = 3;

Object.defineProperty(CSSOM.CSSImportRule.prototype, "cssText", {
  get: function() {
    var mediaText = this.media.mediaText;
    return "@import url(" + this.href + ")" + (mediaText ? " " + mediaText : "") + ";";
  },
  set: function(cssText) {
    var i = 0;

    /**
     * @import url(partial.css) screen, handheld;
     *        ||               |
     *        after-import     media
     *         |
     *         url
     */
    var state = '';

    var buffer = '';
    var index;
    var mediaText = '';
    for (var character; character = cssText.charAt(i); i++) {

      switch (character) {
        case ' ':
        case '\t':
        case '\r':
        case '\n':
        case '\f':
          if (state === 'after-import') {
            state = 'url';
          } else {
            buffer += character;
          }
          break;

        case '@':
          if (!state && cssText.indexOf('@import', i) === i) {
            state = 'after-import';
            i += 'import'.length;
            buffer = '';
          }
          break;

        case 'u':
          if (state === 'url' && cssText.indexOf('url(', i) === i) {
            index = cssText.indexOf(')', i + 1);
            if (index === -1) {
              throw i + ': ")" not found';
            }
            i += 'url('.length;
            var url = cssText.slice(i, index);
            if (url[0] === url[url.length - 1]) {
              if (url[0] === '"' || url[0] === "'") {
                url = url.slice(1, -1);
              }
            }
            this.href = url;
            i = index;
            state = 'media';
          }
          break;

        case '"':
          if (state === 'url') {
            index = cssText.indexOf('"', i + 1);
            if (!index) {
              throw i + ": '\"' not found";
            }
            this.href = cssText.slice(i + 1, index);
            i = index;
            state = 'media';
          }
          break;

        case "'":
          if (state === 'url') {
            index = cssText.indexOf("'", i + 1);
            if (!index) {
              throw i + ': "\'" not found';
            }
            this.href = cssText.slice(i + 1, index);
            i = index;
            state = 'media';
          }
          break;

        case ';':
          if (state === 'media') {
            if (buffer) {
              this.media.mediaText = buffer.trim();
            }
          }
          break;

        default:
          if (state === 'media') {
            buffer += character;
          }
          break;
      }
    }
  }
});


//.CommonJS
exports.CSSImportRule = CSSOM.CSSImportRule;
///CommonJS

},{"./CSSRule":17,"./CSSStyleSheet":20,"./MediaList":24}],14:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSRule: require("./CSSRule").CSSRule,
	CSSStyleDeclaration: require('./CSSStyleDeclaration').CSSStyleDeclaration
};
///CommonJS


/**
 * @constructor
 * @see http://www.w3.org/TR/css3-animations/#DOM-CSSKeyframeRule
 */
CSSOM.CSSKeyframeRule = function CSSKeyframeRule() {
	CSSOM.CSSRule.call(this);
	this.keyText = '';
	this.style = new CSSOM.CSSStyleDeclaration;
	this.style.parentRule = this;
};

CSSOM.CSSKeyframeRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSKeyframeRule.prototype.constructor = CSSOM.CSSKeyframeRule;
CSSOM.CSSKeyframeRule.prototype.type = 9;
//FIXME
//CSSOM.CSSKeyframeRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
//CSSOM.CSSKeyframeRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

// http://www.opensource.apple.com/source/WebCore/WebCore-955.66.1/css/WebKitCSSKeyframeRule.cpp
Object.defineProperty(CSSOM.CSSKeyframeRule.prototype, "cssText", {
  get: function() {
    return this.keyText + " {" + this.style.cssText + "} ";
  }
});


//.CommonJS
exports.CSSKeyframeRule = CSSOM.CSSKeyframeRule;
///CommonJS

},{"./CSSRule":17,"./CSSStyleDeclaration":18}],15:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSRule: require("./CSSRule").CSSRule
};
///CommonJS


/**
 * @constructor
 * @see http://www.w3.org/TR/css3-animations/#DOM-CSSKeyframesRule
 */
CSSOM.CSSKeyframesRule = function CSSKeyframesRule() {
	CSSOM.CSSRule.call(this);
	this.name = '';
	this.cssRules = [];
};

CSSOM.CSSKeyframesRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSKeyframesRule.prototype.constructor = CSSOM.CSSKeyframesRule;
CSSOM.CSSKeyframesRule.prototype.type = 8;
//FIXME
//CSSOM.CSSKeyframesRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
//CSSOM.CSSKeyframesRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

// http://www.opensource.apple.com/source/WebCore/WebCore-955.66.1/css/WebKitCSSKeyframesRule.cpp
Object.defineProperty(CSSOM.CSSKeyframesRule.prototype, "cssText", {
  get: function() {
    var cssTexts = [];
    for (var i=0, length=this.cssRules.length; i < length; i++) {
      cssTexts.push("  " + this.cssRules[i].cssText);
    }
    return "@" + (this._vendorPrefix || '') + "keyframes " + this.name + " { \n" + cssTexts.join("\n") + "\n}";
  }
});


//.CommonJS
exports.CSSKeyframesRule = CSSOM.CSSKeyframesRule;
///CommonJS

},{"./CSSRule":17}],16:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSRule: require("./CSSRule").CSSRule,
	MediaList: require("./MediaList").MediaList
};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#cssmediarule
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSMediaRule
 */
CSSOM.CSSMediaRule = function CSSMediaRule() {
	CSSOM.CSSRule.call(this);
	this.media = new CSSOM.MediaList;
	this.cssRules = [];
};

CSSOM.CSSMediaRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSMediaRule.prototype.constructor = CSSOM.CSSMediaRule;
CSSOM.CSSMediaRule.prototype.type = 4;
//FIXME
//CSSOM.CSSMediaRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
//CSSOM.CSSMediaRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

// http://opensource.apple.com/source/WebCore/WebCore-658.28/css/CSSMediaRule.cpp
Object.defineProperty(CSSOM.CSSMediaRule.prototype, "cssText", {
  get: function() {
    var cssTexts = [];
    for (var i=0, length=this.cssRules.length; i < length; i++) {
      cssTexts.push(this.cssRules[i].cssText);
    }
    return "@media " + this.media.mediaText + " {" + cssTexts.join("") + "}";
  }
});


//.CommonJS
exports.CSSMediaRule = CSSOM.CSSMediaRule;
///CommonJS

},{"./CSSRule":17,"./MediaList":24}],17:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#the-cssrule-interface
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSRule
 */
CSSOM.CSSRule = function CSSRule() {
	this.parentRule = null;
	this.parentStyleSheet = null;
};

CSSOM.CSSRule.STYLE_RULE = 1;
CSSOM.CSSRule.IMPORT_RULE = 3;
CSSOM.CSSRule.MEDIA_RULE = 4;
CSSOM.CSSRule.FONT_FACE_RULE = 5;
CSSOM.CSSRule.PAGE_RULE = 6;
CSSOM.CSSRule.WEBKIT_KEYFRAMES_RULE = 8;
CSSOM.CSSRule.WEBKIT_KEYFRAME_RULE = 9;

// Obsolete in CSSOM http://dev.w3.org/csswg/cssom/
//CSSOM.CSSRule.UNKNOWN_RULE = 0;
//CSSOM.CSSRule.CHARSET_RULE = 2;

// Never implemented
//CSSOM.CSSRule.VARIABLES_RULE = 7;

CSSOM.CSSRule.prototype = {
	constructor: CSSOM.CSSRule
	//FIXME
};


//.CommonJS
exports.CSSRule = CSSOM.CSSRule;
///CommonJS

},{}],18:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration
 */
CSSOM.CSSStyleDeclaration = function CSSStyleDeclaration(){
	this.length = 0;
	this.parentRule = null;

	// NON-STANDARD
	this._importants = {};
};


CSSOM.CSSStyleDeclaration.prototype = {

	constructor: CSSOM.CSSStyleDeclaration,

	/**
	 *
	 * @param {string} name
	 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration-getPropertyValue
	 * @return {string} the value of the property if it has been explicitly set for this declaration block.
	 * Returns the empty string if the property has not been set.
	 */
	getPropertyValue: function(name) {
		return this[name] || "";
	},

	/**
	 *
	 * @param {string} name
	 * @param {string} value
	 * @param {string} [priority=null] "important" or null
	 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration-setProperty
	 */
	setProperty: function(name, value, priority) {
		if (this[name]) {
			// Property already exist. Overwrite it.
			var index = Array.prototype.indexOf.call(this, name);
			if (index < 0) {
				this[this.length] = name;
				this.length++;
			}
		} else {
			// New property.
			this[this.length] = name;
			this.length++;
		}
		this[name] = value;
		this._importants[name] = priority;
	},

	/**
	 *
	 * @param {string} name
	 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration-removeProperty
	 * @return {string} the value of the property if it has been explicitly set for this declaration block.
	 * Returns the empty string if the property has not been set or the property name does not correspond to a known CSS property.
	 */
	removeProperty: function(name) {
		if (!(name in this)) {
			return "";
		}
		var index = Array.prototype.indexOf.call(this, name);
		if (index < 0) {
			return "";
		}
		var prevValue = this[name];
		this[name] = "";

		// That's what WebKit and Opera do
		Array.prototype.splice.call(this, index, 1);

		// That's what Firefox does
		//this[index] = ""

		return prevValue;
	},

	getPropertyCSSValue: function() {
		//FIXME
	},

	/**
	 *
	 * @param {String} name
	 */
	getPropertyPriority: function(name) {
		return this._importants[name] || "";
	},


	/**
	 *   element.style.overflow = "auto"
	 *   element.style.getPropertyShorthand("overflow-x")
	 *   -> "overflow"
	 */
	getPropertyShorthand: function() {
		//FIXME
	},

	isPropertyImplicit: function() {
		//FIXME
	},

	// Doesn't work in IE < 9
	get cssText(){
		var properties = [];
		for (var i=0, length=this.length; i < length; ++i) {
			var name = this[i];
			var value = this.getPropertyValue(name);
			var priority = this.getPropertyPriority(name);
			if (priority) {
				priority = " !" + priority;
			}
			properties[i] = name + ": " + value + priority + ";";
		}
		return properties.join(" ");
	},

	set cssText(cssText){
		var i, name;
		for (i = this.length; i--;) {
			name = this[i];
			this[name] = "";
		}
		Array.prototype.splice.call(this, 0, this.length);
		this._importants = {};

		var dummyRule = CSSOM.parse('#bogus{' + cssText + '}').cssRules[0].style;
		var length = dummyRule.length;
		for (i = 0; i < length; ++i) {
			name = dummyRule[i];
			this.setProperty(dummyRule[i], dummyRule.getPropertyValue(name), dummyRule.getPropertyPriority(name));
		}
	}
};


//.CommonJS
exports.CSSStyleDeclaration = CSSOM.CSSStyleDeclaration;
CSSOM.parse = require('./parse').parse; // Cannot be included sooner due to the mutual dependency between parse.js and CSSStyleDeclaration.js
///CommonJS

},{"./parse":28}],19:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSStyleDeclaration: require("./CSSStyleDeclaration").CSSStyleDeclaration,
	CSSRule: require("./CSSRule").CSSRule
};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#cssstylerule
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleRule
 */
CSSOM.CSSStyleRule = function CSSStyleRule() {
	CSSOM.CSSRule.call(this);
	this.selectorText = "";
	this.style = new CSSOM.CSSStyleDeclaration;
	this.style.parentRule = this;
};

CSSOM.CSSStyleRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSStyleRule.prototype.constructor = CSSOM.CSSStyleRule;
CSSOM.CSSStyleRule.prototype.type = 1;

Object.defineProperty(CSSOM.CSSStyleRule.prototype, "cssText", {
	get: function() {
		var text;
		if (this.selectorText) {
			text = this.selectorText + " {" + this.style.cssText + "}";
		} else {
			text = "";
		}
		return text;
	},
	set: function(cssText) {
		var rule = CSSOM.CSSStyleRule.parse(cssText);
		this.style = rule.style;
		this.selectorText = rule.selectorText;
	}
});


/**
 * NON-STANDARD
 * lightweight version of parse.js.
 * @param {string} ruleText
 * @return CSSStyleRule
 */
CSSOM.CSSStyleRule.parse = function(ruleText) {
	var i = 0;
	var state = "selector";
	var index;
	var j = i;
	var buffer = "";

	var SIGNIFICANT_WHITESPACE = {
		"selector": true,
		"value": true
	};

	var styleRule = new CSSOM.CSSStyleRule;
	var selector, name, value, priority="";

	for (var character; character = ruleText.charAt(i); i++) {

		switch (character) {

		case " ":
		case "\t":
		case "\r":
		case "\n":
		case "\f":
			if (SIGNIFICANT_WHITESPACE[state]) {
				// Squash 2 or more white-spaces in the row into 1
				switch (ruleText.charAt(i - 1)) {
					case " ":
					case "\t":
					case "\r":
					case "\n":
					case "\f":
						break;
					default:
						buffer += " ";
						break;
				}
			}
			break;

		// String
		case '"':
			j = i + 1;
			index = ruleText.indexOf('"', j) + 1;
			if (!index) {
				throw '" is missing';
			}
			buffer += ruleText.slice(i, index);
			i = index - 1;
			break;

		case "'":
			j = i + 1;
			index = ruleText.indexOf("'", j) + 1;
			if (!index) {
				throw "' is missing";
			}
			buffer += ruleText.slice(i, index);
			i = index - 1;
			break;

		// Comment
		case "/":
			if (ruleText.charAt(i + 1) === "*") {
				i += 2;
				index = ruleText.indexOf("*/", i);
				if (index === -1) {
					throw new SyntaxError("Missing */");
				} else {
					i = index + 1;
				}
			} else {
				buffer += character;
			}
			break;

		case "{":
			if (state === "selector") {
				styleRule.selectorText = buffer.trim();
				buffer = "";
				state = "name";
			}
			break;

		case ":":
			if (state === "name") {
				name = buffer.trim();
				buffer = "";
				state = "value";
			} else {
				buffer += character;
			}
			break;

		case "!":
			if (state === "value" && ruleText.indexOf("!important", i) === i) {
				priority = "important";
				i += "important".length;
			} else {
				buffer += character;
			}
			break;

		case ";":
			if (state === "value") {
				styleRule.style.setProperty(name, buffer.trim(), priority);
				priority = "";
				buffer = "";
				state = "name";
			} else {
				buffer += character;
			}
			break;

		case "}":
			if (state === "value") {
				styleRule.style.setProperty(name, buffer.trim(), priority);
				priority = "";
				buffer = "";
			} else if (state === "name") {
				break;
			} else {
				buffer += character;
			}
			state = "selector";
			break;

		default:
			buffer += character;
			break;

		}
	}

	return styleRule;

};


//.CommonJS
exports.CSSStyleRule = CSSOM.CSSStyleRule;
///CommonJS

},{"./CSSRule":17,"./CSSStyleDeclaration":18}],20:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	StyleSheet: require("./StyleSheet").StyleSheet,
	CSSStyleRule: require("./CSSStyleRule").CSSStyleRule
};
///CommonJS


/**
 * @constructor
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleSheet
 */
CSSOM.CSSStyleSheet = function CSSStyleSheet() {
	CSSOM.StyleSheet.call(this);
	this.cssRules = [];
};


CSSOM.CSSStyleSheet.prototype = new CSSOM.StyleSheet;
CSSOM.CSSStyleSheet.prototype.constructor = CSSOM.CSSStyleSheet;


/**
 * Used to insert a new rule into the style sheet. The new rule now becomes part of the cascade.
 *
 *   sheet = new Sheet("body {margin: 0}")
 *   sheet.toString()
 *   -> "body{margin:0;}"
 *   sheet.insertRule("img {border: none}", 0)
 *   -> 0
 *   sheet.toString()
 *   -> "img{border:none;}body{margin:0;}"
 *
 * @param {string} rule
 * @param {number} index
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleSheet-insertRule
 * @return {number} The index within the style sheet's rule collection of the newly inserted rule.
 */
CSSOM.CSSStyleSheet.prototype.insertRule = function(rule, index) {
	if (index < 0 || index > this.cssRules.length) {
		throw new RangeError("INDEX_SIZE_ERR");
	}
	var cssRule = CSSOM.parse(rule).cssRules[0];
	cssRule.parentStyleSheet = this;
	this.cssRules.splice(index, 0, cssRule);
	return index;
};


/**
 * Used to delete a rule from the style sheet.
 *
 *   sheet = new Sheet("img{border:none} body{margin:0}")
 *   sheet.toString()
 *   -> "img{border:none;}body{margin:0;}"
 *   sheet.deleteRule(0)
 *   sheet.toString()
 *   -> "body{margin:0;}"
 *
 * @param {number} index within the style sheet's rule list of the rule to remove.
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleSheet-deleteRule
 */
CSSOM.CSSStyleSheet.prototype.deleteRule = function(index) {
	if (index < 0 || index >= this.cssRules.length) {
		throw new RangeError("INDEX_SIZE_ERR");
	}
	this.cssRules.splice(index, 1);
};


/**
 * NON-STANDARD
 * @return {string} serialize stylesheet
 */
CSSOM.CSSStyleSheet.prototype.toString = function() {
	var result = "";
	var rules = this.cssRules;
	for (var i=0; i<rules.length; i++) {
		result += rules[i].cssText + "\n";
	}
	return result;
};


//.CommonJS
exports.CSSStyleSheet = CSSOM.CSSStyleSheet;
CSSOM.parse = require('./parse').parse; // Cannot be included sooner due to the mutual dependency between parse.js and CSSStyleSheet.js
///CommonJS

},{"./CSSStyleRule":19,"./StyleSheet":25,"./parse":28}],21:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSValue
 *
 * TODO: add if needed
 */
CSSOM.CSSValue = function CSSValue() {
};

CSSOM.CSSValue.prototype = {
	constructor: CSSOM.CSSValue,

	// @see: http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSValue
	set cssText(text) {
		var name = this._getConstructorName();

		throw new Exception('DOMException: property "cssText" of "' + name + '" is readonly!');
	},

	get cssText() {
		var name = this._getConstructorName();

		throw new Exception('getter "cssText" of "' + name + '" is not implemented!');
	},

	_getConstructorName: function() {
		var s = this.constructor.toString(),
				c = s.match(/function\s([^\(]+)/),
				name = c[1];

		return name;
	}
};


//.CommonJS
exports.CSSValue = CSSOM.CSSValue;
///CommonJS

},{}],22:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSValue: require('./CSSValue').CSSValue
};
///CommonJS


/**
 * @constructor
 * @see http://msdn.microsoft.com/en-us/library/ms537634(v=vs.85).aspx
 *
 */
CSSOM.CSSValueExpression = function CSSValueExpression(token, idx) {
	this._token = token;
	this._idx = idx;
};

CSSOM.CSSValueExpression.prototype = new CSSOM.CSSValue;
CSSOM.CSSValueExpression.prototype.constructor = CSSOM.CSSValueExpression;

/**
 * parse css expression() value
 *
 * @return {Object}
 *				 - error:
 *				 or
 *				 - idx:
 *				 - expression:
 *
 * Example:
 *
 * .selector {
 *		zoom: expression(documentElement.clientWidth > 1000 ? '1000px' : 'auto');
 * }
 */
CSSOM.CSSValueExpression.prototype.parse = function() {
	var token = this._token,
			idx = this._idx;

	var character = '',
			expression = '',
			error = '',
			info,
			paren = [];


	for (; ; ++idx) {
		character = token.charAt(idx);

		// end of token
		if (character == '') {
			error = 'css expression error: unfinished expression!';
			break;
		}

		switch(character) {
			case '(':
				paren.push(character);
				expression += character;
				break;

			case ')':
				paren.pop(character);
				expression += character;
				break;

			case '/':
				if (info = this._parseJSComment(token, idx)) { // comment?
					if (info.error) {
						error = 'css expression error: unfinished comment in expression!';
					} else {
						idx = info.idx;
						// ignore the comment
					}
				} else if (info = this._parseJSRexExp(token, idx)) { // regexp
					idx = info.idx;
					expression += info.text;
				} else { // other
					expression += character;
				}
				break;

			case "'":
			case '"':
				info = this._parseJSString(token, idx, character);
				if (info) { // string
					idx = info.idx;
					expression += info.text;
				} else {
					expression += character;
				}
				break;

			default:
				expression += character;
				break;
		}

		if (error) {
			break;
		}

		// end of expression
		if (paren.length == 0) {
			break;
		}
	}

	var ret;
	if (error) {
		ret = {
			error: error
		}
	} else {
		ret = {
			idx: idx,
			expression: expression
		}
	}

	return ret;
};


/**
 *
 * @return {Object|false}
 *          - idx:
 *          - text:
 *          or
 *          - error:
 *          or
 *          false
 *
 */
CSSOM.CSSValueExpression.prototype._parseJSComment = function(token, idx) {
	var nextChar = token.charAt(idx + 1),
			text;

	if (nextChar == '/' || nextChar == '*') {
		var startIdx = idx,
				endIdx,
				commentEndChar;

		if (nextChar == '/') { // line comment
			commentEndChar = '\n';
		} else if (nextChar == '*') { // block comment
			commentEndChar = '*/';
		}

		endIdx = token.indexOf(commentEndChar, startIdx + 1 + 1);
		if (endIdx !== -1) {
			endIdx = endIdx + commentEndChar.length - 1;
			text = token.substring(idx, endIdx + 1);
			return {
				idx: endIdx,
				text: text
			}
		} else {
			error = 'css expression error: unfinished comment in expression!';
			return {
				error: error
			}
		}
	} else {
		return false;
	}
};


/**
 *
 * @return {Object|false}
 *					- idx:
 *					- text:
 *					or 
 *					false
 *
 */
CSSOM.CSSValueExpression.prototype._parseJSString = function(token, idx, sep) {
	var endIdx = this._findMatchedIdx(token, idx, sep),
			text;

	if (endIdx === -1) {
		return false;
	} else {
		text = token.substring(idx, endIdx + sep.length);

		return {
			idx: endIdx,
			text: text
		}
	}
};


/**
 * parse regexp in css expression
 *
 * @return {Object|false}
 *				 - idx:
 *				 - regExp:
 *				 or 
 *				 false
 */

/*

all legal RegExp
 
/a/
(/a/)
[/a/]
[12, /a/]

!/a/

+/a/
-/a/
* /a/
/ /a/
%/a/

===/a/
!==/a/
==/a/
!=/a/
>/a/
>=/a/
</a/
<=/a/

&/a/
|/a/
^/a/
~/a/
<</a/
>>/a/
>>>/a/

&&/a/
||/a/
?/a/
=/a/
,/a/

		delete /a/
				in /a/
instanceof /a/
			 new /a/
		typeof /a/
			void /a/

*/
CSSOM.CSSValueExpression.prototype._parseJSRexExp = function(token, idx) {
	var before = token.substring(0, idx).replace(/\s+$/, ""),
			legalRegx = [
				/^$/,
				/\($/,
				/\[$/,
				/\!$/,
				/\+$/,
				/\-$/,
				/\*$/,
				/\/\s+/,
				/\%$/,
				/\=$/,
				/\>$/,
				/\<$/,
				/\&$/,
				/\|$/,
				/\^$/,
				/\~$/,
				/\?$/,
				/\,$/,
				/delete$/,
				/in$/,
				/instanceof$/,
				/new$/,
				/typeof$/,
				/void$/,
			];

	var isLegal = legalRegx.some(function(reg) {
		return reg.test(before);
	});

	if (!isLegal) {
		return false;
	} else {
		var sep = '/';

		// same logic as string
		return this._parseJSString(token, idx, sep);
	}
};


/**
 *
 * find next sep(same line) index in `token`
 *
 * @return {Number}
 *
 */
CSSOM.CSSValueExpression.prototype._findMatchedIdx = function(token, idx, sep) {
	var startIdx = idx,
			endIdx;

	var NOT_FOUND = -1;

	while(true) {
		endIdx = token.indexOf(sep, startIdx + 1);

		if (endIdx === -1) { // not found
			endIdx = NOT_FOUND;
			break;
		} else {
			var text = token.substring(idx + 1, endIdx),
					matched = text.match(/\\+$/);
			if (!matched || matched[0] % 2 == 0) { // not escaped
				break;
			} else {
				startIdx = endIdx;
			}
		}
	}

	// boundary must be in the same line(js sting or regexp)
	var nextNewLineIdx = token.indexOf('\n', idx + 1);
	if (nextNewLineIdx < endIdx) {
		endIdx = NOT_FOUND;
	}


	return endIdx;
}




//.CommonJS
exports.CSSValueExpression = CSSOM.CSSValueExpression;
///CommonJS

},{"./CSSValue":21}],23:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see https://developer.mozilla.org/en/CSS/@-moz-document
 */
CSSOM.MatcherList = function MatcherList(){
    this.length = 0;
};

CSSOM.MatcherList.prototype = {

    constructor: CSSOM.MatcherList,

    /**
     * @return {string}
     */
    get matcherText() {
        return Array.prototype.join.call(this, ", ");
    },

    /**
     * @param {string} value
     */
    set matcherText(value) {
        // just a temporary solution, actually it may be wrong by just split the value with ',', because a url can include ','.
        var values = value.split(",");
        var length = this.length = values.length;
        for (var i=0; i<length; i++) {
            this[i] = values[i].trim();
        }
    },

    /**
     * @param {string} matcher
     */
    appendMatcher: function(matcher) {
        if (Array.prototype.indexOf.call(this, matcher) === -1) {
            this[this.length] = matcher;
            this.length++;
        }
    },

    /**
     * @param {string} matcher
     */
    deleteMatcher: function(matcher) {
        var index = Array.prototype.indexOf.call(this, matcher);
        if (index !== -1) {
            Array.prototype.splice.call(this, index, 1);
        }
    }

};


//.CommonJS
exports.MatcherList = CSSOM.MatcherList;
///CommonJS

},{}],24:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#the-medialist-interface
 */
CSSOM.MediaList = function MediaList(){
	this.length = 0;
};

CSSOM.MediaList.prototype = {

	constructor: CSSOM.MediaList,

	/**
	 * @return {string}
	 */
	get mediaText() {
		return Array.prototype.join.call(this, ", ");
	},

	/**
	 * @param {string} value
	 */
	set mediaText(value) {
		var values = value.split(",");
		var length = this.length = values.length;
		for (var i=0; i<length; i++) {
			this[i] = values[i].trim();
		}
	},

	/**
	 * @param {string} medium
	 */
	appendMedium: function(medium) {
		if (Array.prototype.indexOf.call(this, medium) === -1) {
			this[this.length] = medium;
			this.length++;
		}
	},

	/**
	 * @param {string} medium
	 */
	deleteMedium: function(medium) {
		var index = Array.prototype.indexOf.call(this, medium);
		if (index !== -1) {
			Array.prototype.splice.call(this, index, 1);
		}
	}

};


//.CommonJS
exports.MediaList = CSSOM.MediaList;
///CommonJS

},{}],25:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#the-stylesheet-interface
 */
CSSOM.StyleSheet = function StyleSheet() {
	this.parentStyleSheet = null;
};


//.CommonJS
exports.StyleSheet = CSSOM.StyleSheet;
///CommonJS

},{}],26:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSStyleSheet: require("./CSSStyleSheet").CSSStyleSheet,
	CSSStyleRule: require("./CSSStyleRule").CSSStyleRule,
	CSSMediaRule: require("./CSSMediaRule").CSSMediaRule,
	CSSStyleDeclaration: require("./CSSStyleDeclaration").CSSStyleDeclaration,
	CSSKeyframeRule: require('./CSSKeyframeRule').CSSKeyframeRule,
	CSSKeyframesRule: require('./CSSKeyframesRule').CSSKeyframesRule
};
///CommonJS


/**
 * Produces a deep copy of stylesheet — the instance variables of stylesheet are copied recursively.
 * @param {CSSStyleSheet|CSSOM.CSSStyleSheet} stylesheet
 * @nosideeffects
 * @return {CSSOM.CSSStyleSheet}
 */
CSSOM.clone = function clone(stylesheet) {

	var cloned = new CSSOM.CSSStyleSheet;

	var rules = stylesheet.cssRules;
	if (!rules) {
		return cloned;
	}

	var RULE_TYPES = {
		1: CSSOM.CSSStyleRule,
		4: CSSOM.CSSMediaRule,
		//3: CSSOM.CSSImportRule,
		//5: CSSOM.CSSFontFaceRule,
		//6: CSSOM.CSSPageRule,
		8: CSSOM.CSSKeyframesRule,
		9: CSSOM.CSSKeyframeRule
	};

	for (var i=0, rulesLength=rules.length; i < rulesLength; i++) {
		var rule = rules[i];
		var ruleClone = cloned.cssRules[i] = new RULE_TYPES[rule.type];

		var style = rule.style;
		if (style) {
			var styleClone = ruleClone.style = new CSSOM.CSSStyleDeclaration;
			for (var j=0, styleLength=style.length; j < styleLength; j++) {
				var name = styleClone[j] = style[j];
				styleClone[name] = style[name];
				styleClone._importants[name] = style.getPropertyPriority(name);
			}
			styleClone.length = style.length;
		}

		if (rule.hasOwnProperty('keyText')) {
			ruleClone.keyText = rule.keyText;
		}

		if (rule.hasOwnProperty('selectorText')) {
			ruleClone.selectorText = rule.selectorText;
		}

		if (rule.hasOwnProperty('mediaText')) {
			ruleClone.mediaText = rule.mediaText;
		}

		if (rule.hasOwnProperty('cssRules')) {
			ruleClone.cssRules = clone(rule).cssRules;
		}
	}

	return cloned;

};

//.CommonJS
exports.clone = CSSOM.clone;
///CommonJS

},{"./CSSKeyframeRule":14,"./CSSKeyframesRule":15,"./CSSMediaRule":16,"./CSSStyleDeclaration":18,"./CSSStyleRule":19,"./CSSStyleSheet":20}],27:[function(require,module,exports){
'use strict';

exports.CSSStyleDeclaration = require('./CSSStyleDeclaration').CSSStyleDeclaration;
exports.CSSRule = require('./CSSRule').CSSRule;
exports.CSSStyleRule = require('./CSSStyleRule').CSSStyleRule;
exports.MediaList = require('./MediaList').MediaList;
exports.CSSMediaRule = require('./CSSMediaRule').CSSMediaRule;
exports.CSSImportRule = require('./CSSImportRule').CSSImportRule;
exports.CSSFontFaceRule = require('./CSSFontFaceRule').CSSFontFaceRule;
exports.StyleSheet = require('./StyleSheet').StyleSheet;
exports.CSSStyleSheet = require('./CSSStyleSheet').CSSStyleSheet;
exports.CSSKeyframesRule = require('./CSSKeyframesRule').CSSKeyframesRule;
exports.CSSKeyframeRule = require('./CSSKeyframeRule').CSSKeyframeRule;
exports.MatcherList = require('./MatcherList').MatcherList;
exports.CSSDocumentRule = require('./CSSDocumentRule').CSSDocumentRule;
exports.CSSValue = require('./CSSValue').CSSValue;
exports.CSSValueExpression = require('./CSSValueExpression').CSSValueExpression;
exports.parse = require('./parse').parse;
exports.clone = require('./clone').clone;

},{"./CSSDocumentRule":11,"./CSSFontFaceRule":12,"./CSSImportRule":13,"./CSSKeyframeRule":14,"./CSSKeyframesRule":15,"./CSSMediaRule":16,"./CSSRule":17,"./CSSStyleDeclaration":18,"./CSSStyleRule":19,"./CSSStyleSheet":20,"./CSSValue":21,"./CSSValueExpression":22,"./MatcherList":23,"./MediaList":24,"./StyleSheet":25,"./clone":26,"./parse":28}],28:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @param {string} token
 */
CSSOM.parse = function parse(token) {

	var i = 0;

	/**
		"before-selector" or
		"selector" or
		"atRule" or
		"atBlock" or
		"before-name" or
		"name" or
		"before-value" or
		"value"
	*/
	var state = "before-selector";

	var index;
	var buffer = "";

	var SIGNIFICANT_WHITESPACE = {
		"selector": true,
		"value": true,
		"atRule": true,
		"importRule-begin": true,
		"importRule": true,
		"atBlock": true,
		'documentRule-begin': true
	};

	var styleSheet = new CSSOM.CSSStyleSheet;

	// @type CSSStyleSheet|CSSMediaRule|CSSFontFaceRule|CSSKeyframesRule|CSSDocumentRule
	var currentScope = styleSheet;

	// @type CSSMediaRule|CSSKeyframesRule|CSSDocumentRule
	var parentRule;

	var selector, name, value, priority="", styleRule, mediaRule, importRule, fontFaceRule, keyframesRule, keyframeRule, documentRule;

	var atKeyframesRegExp = /@(-(?:\w+-)+)?keyframes/g;

	var parseError = function(message) {
		var lines = token.substring(0, i).split('\n');
		var lineCount = lines.length;
		var charCount = lines.pop().length + 1;
		var error = new Error(message + ' (line ' + lineCount + ', char ' + charCount + ')');
		error.line = lineCount;
		error.char = charCount;
		error.styleSheet = styleSheet;
		throw error;
	};

	for (var character; character = token.charAt(i); i++) {

		switch (character) {

		case " ":
		case "\t":
		case "\r":
		case "\n":
		case "\f":
			if (SIGNIFICANT_WHITESPACE[state]) {
				buffer += character;
			}
			break;

		// String
		case '"':
			index = i + 1;
			do {
				index = token.indexOf('"', index) + 1;
				if (!index) {
					parseError('Unmatched "');
				}
			} while (token[index - 2] === '\\')
			buffer += token.slice(i, index);
			i = index - 1;
			switch (state) {
				case 'before-value':
					state = 'value';
					break;
				case 'importRule-begin':
					state = 'importRule';
					break;
			}
			break;

		case "'":
			index = i + 1;
			do {
				index = token.indexOf("'", index) + 1;
				if (!index) {
					parseError("Unmatched '");
				}
			} while (token[index - 2] === '\\')
			buffer += token.slice(i, index);
			i = index - 1;
			switch (state) {
				case 'before-value':
					state = 'value';
					break;
				case 'importRule-begin':
					state = 'importRule';
					break;
			}
			break;

		// Comment
		case "/":
			if (token.charAt(i + 1) === "*") {
				i += 2;
				index = token.indexOf("*/", i);
				if (index === -1) {
					parseError("Missing */");
				} else {
					i = index + 1;
				}
			} else {
				buffer += character;
			}
			if (state === "importRule-begin") {
				buffer += " ";
				state = "importRule";
			}
			break;

		// At-rule
		case "@":
			if (token.indexOf("@-moz-document", i) === i) {
				state = "documentRule-begin";
				documentRule = new CSSOM.CSSDocumentRule;
				documentRule.__starts = i;
				i += "-moz-document".length;
				buffer = "";
				break;
			} else if (token.indexOf("@media", i) === i) {
				state = "atBlock";
				mediaRule = new CSSOM.CSSMediaRule;
				mediaRule.__starts = i;
				i += "media".length;
				buffer = "";
				break;
			} else if (token.indexOf("@import", i) === i) {
				state = "importRule-begin";
				i += "import".length;
				buffer += "@import";
				break;
			} else if (token.indexOf("@font-face", i) === i) {
				state = "fontFaceRule-begin";
				i += "font-face".length;
				fontFaceRule = new CSSOM.CSSFontFaceRule;
				fontFaceRule.__starts = i;
				buffer = "";
				break;
			} else {
				atKeyframesRegExp.lastIndex = i;
				var matchKeyframes = atKeyframesRegExp.exec(token);
				if (matchKeyframes && matchKeyframes.index === i) {
					state = "keyframesRule-begin";
					keyframesRule = new CSSOM.CSSKeyframesRule;
					keyframesRule.__starts = i;
					keyframesRule._vendorPrefix = matchKeyframes[1]; // Will come out as undefined if no prefix was found
					i += matchKeyframes[0].length - 1;
					buffer = "";
					break;
				} else if (state == "selector") {
					state = "atRule";
				}
			}
			buffer += character;
			break;

		case "{":
			if (state === "selector" || state === "atRule") {
				styleRule.selectorText = buffer.trim();
				styleRule.style.__starts = i;
				buffer = "";
				state = "before-name";
			} else if (state === "atBlock") {
				mediaRule.media.mediaText = buffer.trim();
				currentScope = parentRule = mediaRule;
				mediaRule.parentStyleSheet = styleSheet;
				buffer = "";
				state = "before-selector";
			} else if (state === "fontFaceRule-begin") {
				if (parentRule) {
					fontFaceRule.parentRule = parentRule;
				}
				fontFaceRule.parentStyleSheet = styleSheet;
				styleRule = fontFaceRule;
				buffer = "";
				state = "before-name";
			} else if (state === "keyframesRule-begin") {
				keyframesRule.name = buffer.trim();
				if (parentRule) {
					keyframesRule.parentRule = parentRule;
				}
				keyframesRule.parentStyleSheet = styleSheet;
				currentScope = parentRule = keyframesRule;
				buffer = "";
				state = "keyframeRule-begin";
			} else if (state === "keyframeRule-begin") {
				styleRule = new CSSOM.CSSKeyframeRule;
				styleRule.keyText = buffer.trim();
				styleRule.__starts = i;
				buffer = "";
				state = "before-name";
			} else if (state === "documentRule-begin") {
				// FIXME: what if this '{' is in the url text of the match function?
				documentRule.matcher.matcherText = buffer.trim();
				if (parentRule) {
					documentRule.parentRule = parentRule;
				}
				currentScope = parentRule = documentRule;
				documentRule.parentStyleSheet = styleSheet;
				buffer = "";
				state = "before-selector";
			}
			break;

		case ":":
			if (state === "name") {
				name = buffer.trim();
				buffer = "";
				state = "before-value";
			} else {
				buffer += character;
			}
			break;

		case '(':
			if (state === 'value') {
				// ie css expression mode
				if (buffer.trim() == 'expression') {
					var info = (new CSSOM.CSSValueExpression(token, i)).parse();

					if (info.error) {
						parseError(info.error);
					} else {
						buffer += info.expression;
						i = info.idx;
					}
				} else {
					index = token.indexOf(')', i + 1);
					if (index === -1) {
						parseError('Unmatched "("');
					}
					buffer += token.slice(i, index + 1);
					i = index;
				}
			} else {
				buffer += character;
			}

			break;

		case "!":
			if (state === "value" && token.indexOf("!important", i) === i) {
				priority = "important";
				i += "important".length;
			} else {
				buffer += character;
			}
			break;

		case ";":
			switch (state) {
				case "value":
					styleRule.style.setProperty(name, buffer.trim(), priority);
					priority = "";
					buffer = "";
					state = "before-name";
					break;
				case "atRule":
					buffer = "";
					state = "before-selector";
					break;
				case "importRule":
					importRule = new CSSOM.CSSImportRule;
					importRule.parentStyleSheet = importRule.styleSheet.parentStyleSheet = styleSheet;
					importRule.cssText = buffer + character;
					styleSheet.cssRules.push(importRule);
					buffer = "";
					state = "before-selector";
					break;
				default:
					buffer += character;
					break;
			}
			break;

		case "}":
			switch (state) {
				case "value":
					styleRule.style.setProperty(name, buffer.trim(), priority);
					priority = "";
				case "before-name":
				case "name":
					styleRule.__ends = i + 1;
					if (parentRule) {
						styleRule.parentRule = parentRule;
					}
					styleRule.parentStyleSheet = styleSheet;
					currentScope.cssRules.push(styleRule);
					buffer = "";
					if (currentScope.constructor === CSSOM.CSSKeyframesRule) {
						state = "keyframeRule-begin";
					} else {
						state = "before-selector";
					}
					break;
				case "keyframeRule-begin":
				case "before-selector":
				case "selector":
					// End of media/document rule.
					if (!parentRule) {
						parseError("Unexpected }");
					}
					currentScope.__ends = i + 1;
					// Nesting rules aren't supported yet
					styleSheet.cssRules.push(currentScope);
					currentScope = styleSheet;
					parentRule = null;
					buffer = "";
					state = "before-selector";
					break;
			}
			break;

		default:
			switch (state) {
				case "before-selector":
					state = "selector";
					styleRule = new CSSOM.CSSStyleRule;
					styleRule.__starts = i;
					break;
				case "before-name":
					state = "name";
					break;
				case "before-value":
					state = "value";
					break;
				case "importRule-begin":
					state = "importRule";
					break;
			}
			buffer += character;
			break;
		}
	}

	return styleSheet;
};


//.CommonJS
exports.parse = CSSOM.parse;
// The following modules cannot be included sooner due to the mutual dependency with parse.js
CSSOM.CSSStyleSheet = require("./CSSStyleSheet").CSSStyleSheet;
CSSOM.CSSStyleRule = require("./CSSStyleRule").CSSStyleRule;
CSSOM.CSSImportRule = require("./CSSImportRule").CSSImportRule;
CSSOM.CSSMediaRule = require("./CSSMediaRule").CSSMediaRule;
CSSOM.CSSFontFaceRule = require("./CSSFontFaceRule").CSSFontFaceRule;
CSSOM.CSSStyleDeclaration = require('./CSSStyleDeclaration').CSSStyleDeclaration;
CSSOM.CSSKeyframeRule = require('./CSSKeyframeRule').CSSKeyframeRule;
CSSOM.CSSKeyframesRule = require('./CSSKeyframesRule').CSSKeyframesRule;
CSSOM.CSSValueExpression = require('./CSSValueExpression').CSSValueExpression;
CSSOM.CSSDocumentRule = require('./CSSDocumentRule').CSSDocumentRule;
///CommonJS

},{"./CSSDocumentRule":11,"./CSSFontFaceRule":12,"./CSSImportRule":13,"./CSSKeyframeRule":14,"./CSSKeyframesRule":15,"./CSSMediaRule":16,"./CSSStyleDeclaration":18,"./CSSStyleRule":19,"./CSSStyleSheet":20,"./CSSValueExpression":22}],29:[function(require,module,exports){
var Tree = require('./src/tree');
module.exports = dataTree = (function(){
  return {
    create: function(){
      return new Tree();
    }
  };
}());

},{"./src/tree":32}],30:[function(require,module,exports){

module.exports = (function(){

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Basic Setup
  // ------------------------------------

  /**
   * @class Traverser
   * @constructor
   * @classdesc Represents a traverser which searches/traverses the tree in BFS and DFS fashion.
   * @param tree - {@link Tree} that has to be traversed or search.
   */
  function Traverser(tree){

    if(!tree)
    throw new Error('Could not find a tree that is to be traversed');

    /**
     * Represents the {@link Tree} which has to be traversed.
     *
     * @property _tree
     * @type {object}
     * @default "null"
     */
    this._tree = tree;

  }

  // ------------------------------------
  // Methods
  // ------------------------------------

  /**
   * Searches a tree in DFS fashion. Requires a search criteria to be provided.
   *
   * @method searchDFS
   * @memberof Traverser
   * @instance
   * @param {function} criteria - MUST BE a callback function that specifies the search criteria.
   * Criteria callback here receives {@link TreeNode#_data} in parameter and MUST return boolean
   * indicating whether that data satisfies your criteria.
   * @return {object} - first {@link TreeNode} in tree that matches the given criteria.
   * @example
   * // Search DFS
   * var node = tree.traverser().searchDFS(function(data){
   *  return data.key === '#greenapple';
   * });
   */
  Traverser.prototype.searchDFS = function(criteria){

    // Hold the node when found
    var foundNode = null;

    // Find node recursively
    (function recur(node){
      if(node.matchCriteria(criteria)){
        foundNode = node;
        return foundNode;
      } else {
        node._childNodes.some(recur);
      }
    }(this._tree._rootNode));

    return foundNode;
  };

  /**
   * Searches a tree in BFS fashion. Requires a search criteria to be provided.
   *
   * @method searchBFS
   * @memberof Traverser
   * @instance
   * @param {function} criteria - MUST BE a callback function that specifies the search criteria.
   * Criteria callback here receives {@link TreeNode#_data} in parameter and MUST return boolean
   * indicating whether that data satisfies your criteria.
   * @return {object} - first {@link TreeNode} in tree that matches the given criteria.
   * @example
   * // Search BFS
   * var node = tree.traverser().searchBFS(function(data){
   *  return data.key === '#greenapple';
   * });
   */
  Traverser.prototype.searchBFS = function(criteria){

    // Hold the node when found
    var foundNode = null;

    // Find nodes recursively
    (function expand(queue){
      while(queue.length){
        var current = queue.splice(0, 1)[0];
        if(current.matchCriteria(criteria)){
          foundNode = current;
          return;
        }
        current._childNodes.forEach(function(_child){
          queue.push(_child);
        });
      }
    }([this._tree._rootNode]));


    return foundNode;

  };

  /**
   * Traverses an entire tree in DFS fashion.
   *
   * @method traverseDFS
   * @memberof Traverser
   * @instance
   * @param {function} callback - Gets triggered when @{link TreeNode} is explored. Explored node is passed as parameter to callback.
   * @example
   * // Traverse DFS
   * tree.traverser().traverseDFS(function(node){
   *  console.log(node.data);
   * });
   */
  Traverser.prototype.traverseDFS = function(callback){
    (function recur(node){
      callback(node);
      node._childNodes.forEach(recur);
    }(this._tree._rootNode));
  };

  /**
   * Traverses an entire tree in BFS fashion.
   *
   * @method traverseBFS
   * @memberof Traverser
   * @instance
   * @param {function} callback - Gets triggered when node is explored. Explored node is passed as parameter to callback.
   * @example
   * // Traverse BFS
   * tree.traverser().traverseBFS(function(node){
   *  console.log(node.data);
   * });
   */
  Traverser.prototype.traverseBFS = function(callback){
    (function expand(queue){
      while(queue.length){
        var current = queue.splice(0, 1)[0];
        callback(current);
        current._childNodes.forEach(function(_child){
          queue.push(_child);
        });
      }
    }([this._tree._rootNode]));
  };

  // ------------------------------------
  // Export
  // ------------------------------------

  return Traverser;

}());

},{}],31:[function(require,module,exports){

module.exports = (function(){

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Basic Setup
  // ------------------------------------

  /**
   * @class TreeNode
   * @classdesc Represents a node in the tree.
   * @constructor
   * @param {object} data - that is to be stored in a node
   */
  function TreeNode(data){

    /**
     * Represents the parent node
     *
     * @property _parentNode
     * @type {object}
     * @default "null"
     */
    this._parentNode = null;

    /**
     * Represents the child nodes
     *
     * @property _childNodes
     * @type {array}
     * @default "[]"
     */
    this._childNodes = [];

    /**
     * Represents the data node has
     *
     * @property _data
     * @type {object}
     * @default "null"
     */
    this._data = data;

    /**
     * Depth of the node represents level in hierarchy
     *
     * @property _depth
     * @type {number}
     * @default -1
     */
    this._depth = -1;

  }

  // ------------------------------------
  // Getters and Setters
  // ------------------------------------

  /**
   * Returns a parent node of current node
   *
   * @method parentNode
   * @memberof TreeNode
   * @instance
   * @return {TreeNode} - parent of current node
   */
  TreeNode.prototype.parentNode = function(){
    return this._parentNode;
  };

  /**
   * Returns an array of child nodes
   *
   * @method childNodes
   * @memberof TreeNode
   * @instance
   * @return {array} - array of child nodes
   */
  TreeNode.prototype.childNodes = function(){
    return this._childNodes;
  };

  /**
   * Sets or gets the data belonging to this node. Data is what user sets using `insert` and `insertTo` methods.
   *
   * @method data
   * @memberof TreeNode
   * @instance
   * @param {object | array | string | number | null} _data - data which is to be stored
   * @return {object | array | string | number | null} - data belonging to this node
   */
  TreeNode.prototype.data = function(_data){
    if(arguments.length > 0){
      this._data = data;
    } else {
      return this._data;
    }
  };

  /**
   * Depth of the node. Indicates the level at which node lies in a tree.
   *
   * @method depth
   * @memberof TreeNode
   * @instance
   * @return {number} - depth of node
   */
  TreeNode.prototype.depth = function(){
    return this._data;
  };

  // ------------------------------------
  // Methods
  // ------------------------------------

  /**
   * Indicates whether this node matches the specified criteria. It triggers a callback criteria function that returns something.
   *
   * @method matchCriteria
   * @memberof TreeNode
   * @instance
   * @param {function} callback - Callback function that specifies some criteria. It receives {@link TreeNode#_data} in parameter and expects different values in different scenarios.
   * `matchCriteria` is used by following functions and expects:
   * 1. {@link Tree#searchBFS} - {boolean} in return indicating whether given node satisfies criteria.
   * 2. {@link Tree#searchDFS} - {boolean} in return indicating whether given node satisfies criteria.
   * 3. {@link Tree#export} - {object} in return indicating formatted data object.
   */
  TreeNode.prototype.matchCriteria = function(criteria){
    return criteria(this._data);
  };

  /**
   * get sibling nodes.
   *
   * @method siblings
   * @memberof TreeNode
   * @instance
   * @return {array} - array of instances of {@link TreeNode}
   */
  TreeNode.prototype.siblings = function(){
    var thiss = this;
    return !this._parentNode ? [] : this._parentNode._childNodes.filter(function(_child){
      return _child !== thiss;
    });
  };

  // ------------------------------------
  // Export
  // ------------------------------------

  return TreeNode;

}());

},{}],32:[function(require,module,exports){
var TreeNode = require('./tree-node');
var Traverser = require('./traverser');
module.exports = (function(){

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Basic Setup
  // ------------------------------------

  /**
   * @class Tree
   * @classdesc Represents the tree in which data nodes can be inserted
   * @constructor
   */
   function Tree(){

    /**
     * Represents the root node of the tree.
     *
     * @member
     * @type {object}
     * @default "null"
     */
    this._rootNode = null;

    /**
     * Represents the current node in question. `_currentNode` points to most recent
     * node inserted or parent node of most recent node removed.
     *
     * @member
    * @memberof Tree.
     * @type {object}
     * @default "null"
     */
    this._currentNode = null;

    /**
     * Represents the traverser which search/traverse a tree in DFS and BFS fashion.
     *
     * @member
     * @memberof Tree
     * @type {object}
     * @instance
     * @default {@link Traverser}
     */
    this._traverser = new Traverser(this);

  }

  // ------------------------------------
  // Getters and Setters
  // ------------------------------------

  /**
   * Returns a root node of the tree.
   *
   * @method rootNode
   * @memberof Tree
   * @instance
   * @return {TreeNode} - root node of the tree.
   */
  Tree.prototype.rootNode = function(){
    return this._rootNode;
  };

  /**
   * Returns a current node in a tree
   *
   * @method currentNode
   * @memberof Tree
   * @instance
   * @return {TreeNode} - current node of the tree.
   */
  Tree.prototype.currentNode = function(){
    return this._currentNode;
  };

  /**
   * Getter function that returns {@link Traverser}.
   *
   * @method traverser
   * @memberof Tree
   * @instance
   * @return {@link Traverser} for the tree.
   */
  Tree.prototype.traverser = function(){
    return this._traverser;
  };

  // ------------------------------------
  // Methods
  // ------------------------------------

  /**
   * Checks whether tree is empty.
   *
   * @method isEmpty
   * @memberof Tree
   * @instance
   * @return {boolean} whether tree is empty.
   */
  Tree.prototype.isEmpty = function(){
    return this._rootNode === null && this._currentNode === null;
  };

  /**
   * Empties the tree. Removes all nodes from tree.
   *
   * @method pruneAllNodes
   * @memberof Tree
   * @instance
   * @return {@link Tree} empty tree.
   */
  Tree.prototype.pruneAllNodes = function(){
    if(this._rootNode && this._currentNode) this.trimBranchFrom(this._rootNode);
    return this;
  };

  /**
   * Creates a {@link TreeNode} that contains the data provided and insert it in a tree.
   * New node gets inserted to the `_currentNode` which updates itself upon every insertion and deletion.
   *
   * @method insert
   * @memberof Tree
   * @instance
   * @param {object} data - data that has to be stored in tree-node.
   * @return {object} - instance of {@link TreeNode} that represents node inserted.
   * @example
   *
   * // Insert single value
   * tree.insert(183);
   *
   * // Insert array of values
   * tree.insert([34, 565, 78]);
   *
  * // Insert complex data
   * tree.insert({
   *   key: '#berries',
   *   value: { name: 'Apple', color: 'Red'}
   * });
   */
  Tree.prototype.insert = function(data){
    var node = new TreeNode(data);
    if(this._rootNode === null && this._currentNode === null){
      node._depth = 1;
      this._rootNode = this._currentNode = node;
    } else {
      node._parentNode = this._currentNode;
      this._currentNode._childNodes.push(node);
      this._currentNode = node;
      node.depth = node._parentNode._depth + 1;
    }
    return node;
  };

  /**
   * Removes a node from tree and updates `_currentNode` to parent node of node removed.
   *
   * @method remove
   * @memberof Tree
   * @instance
   * @param {object} node - {@link TreeNode} that has to be removed.
   * @param {boolean} trim - indicates whether to remove entire branch from the specified node.
   */
  Tree.prototype.remove = function(node, trim){
    if(trim || node === this._rootNode){

      // Trim Entire branch
      this.trimBranchFrom(node);

    } else {

      // Upate children's parent to grandparent
      node._childNodes.forEach(function(_child){
        _child._parentNode = node._parentNode;
        node._parentNode._childNodes.push(_child);
      });

      // Delete itslef from parent child array
      node._parentNode._childNodes.splice(node._parentNode._childNodes.indexOf(node), 1);

      // Update Current Node
      this._currentNode = node._parentNode;

      // Clear Child Array
      node._childNodes = [];
      node._parentNode = null;
      node._data = null;

    }
  };

  /**
   * Remove an entire branch starting with specified node.
   *
   * @method trimBranchFrom
   * @memberof Tree
   * @instance
   * @param {object} node - {@link TreeNode} from which entire branch has to be removed.
   */
  Tree.prototype.trimBranchFrom = function(node){

    // Hold `this`
    var thiss = this;

    // trim brach recursively
    (function recur(node){
      node._childNodes.forEach(recur);
      node._childNodes = [];
      node._data = null;
    }(node));

    // Update Current Node
    if(node._parentNode){
      node._parentNode._childNodes.splice(node._parentNode._childNodes.indexOf(node), 1);
      thiss._currentNode = node._parentNode;
    } else {
      thiss._rootNode = thiss._currentNode = null;
    }
  };

  /**
   * Inserts node to a particular node present in the tree. Particular node here is searched
   * in the tree based on the criteria provided.
   *
   * @method insertTo
   * @memberof Tree
   * @instance
   * @param {function} criteria - Callback function that specifies the search criteria
   * for node to which new node is to be inserted. Criteria callback here receives {@link TreeNode#_data}
   * in parameter and MUST return boolean indicating whether that data satisfies your criteria.
   * @param {object} data - that has to be stored in tree-node.
   * @return {object} - instance of {@link TreeNode} that represents node inserted.
   * @example
   *
   * // Insert data
   * tree.insert({
   *   key: '#apple',
   *   value: { name: 'Apple', color: 'Red'}
   * });
   *
   * // New Data
   * var greenApple = {
   *  key: '#greenapple',
   *  value: { name: 'Green Apple', color: 'Green' }
   * };
   *
   * // Insert data to node which has `key` = #apple
   * tree.insertTo(function(data){
   *  return data.key === '#apple'
   * }, greenApple);
   */
  Tree.prototype.insertTo = function(criteria, data){
    var node = this.traverser().searchDFS(criteria);
    return this.insertToNode(node, data);
  };

  /**
   * Inserts node to a particular node present in the tree. Particular node here is an instance of {@link TreeNode}
   *
   * @method insertToNode
   * @memberof Tree
   * @instance
   * @param {function} node -  {@link TreeNode} to which data node is to be inserted.
   * @param {object} data - that has to be stored in tree-node.
   * @return {object} - instance of {@link TreeNode} that represents node inserted.
   * @example
   *
   * // Insert data
   * var node = tree.insert({
   *   key: '#apple',
   *   value: { name: 'Apple', color: 'Red'}
   * });
   *
   * // New Data
   * var greenApple = {
   *  key: '#greenapple',
   *  value: { name: 'Green Apple', color: 'Green' }
   * };
   *
   * // Insert data to node
   * tree.insertToNode(node, greenApple);
   */
  Tree.prototype.insertToNode = function(node, data){
    var newNode = new TreeNode(data);
    newNode._parentNode = node;
    newNode._depth = newNode._parentNode._depth + 1;
    node._childNodes.push(newNode);
    this._currentNode = newNode;
    return newNode;
  };

  /**
   * Exports the tree data in format specified. It maintains herirachy by adding
   * additional "children" property to returned value of `criteria` callback.
   *
   * @method export
   * @memberof Tree
   * @instance
   * @param {Tree~criteria} criteria - Callback function that receives data in parameter
   * and MUST return a formatted data that has to be exported. A new property "children" is added to object returned
   * that maintains the heirarchy of nodes.
   * @return {object} - {@link TreeNode}.
   * @example
   *
   * var rootNode = tree.insert({
   *   key: '#apple',
   *   value: { name: 'Apple', color: 'Red'}
   * });
   *
   * tree.insert({
   *   key: '#greenapple',
   *   value: { name: 'Green Apple', color: 'Green'}
   * });
   *
   * tree.insertToNode(rootNode,  {
   *  key: '#someanotherapple',
   *  value: { name: 'Some Apple', color: 'Some Color' }
   * });
   *
   * // Export the tree
   * var exported = tree.export(function(data){
   *  return { name: data.value.name };
   * });
   *
   * // Result in `exported`
   * {
   * "name": "Apple",
   * "children": [
   *   {
   *     "name": "Green Apple",
   *     "children": []
   *   },
   *   {
   *     "name": "Some Apple",
   *     "children": []
   *  }
   * ]
   *}
   *
   */
  Tree.prototype.export = function(criteria){

    // Check if criteria is specified
    if(!criteria || typeof criteria !== 'function')
    throw new Error('Export criteria not specified');

    // Check if rootNode is not null
    if(!this._rootNode){
      return null;
    }

    // Export every node recursively
    var exportRecur = function(node){
      var exported = node.matchCriteria(criteria);
      if(!exported || typeof exported !== 'object'){
        throw new Error('Export criteria should always return an object and it cannot be null.');
      } else {
        exported.children = [];
        node._childNodes.forEach(function(_child){
          exported.children.push(exportRecur(_child));
        });

        return exported;
      }
    };

    return exportRecur(this._rootNode);
  };


  /**
   * Imports the JSON data into a tree using the criteria provided.
   * A property indicating the nesting of object must be specified.
   *
   * @method import
   * @memberof Tree
   * @instance
   * @param {object} data - JSON data that has be imported
   * @param {string} childProperty - Name of the property that holds the nested data.
   * @param {Tree~criteria} criteria - Callback function that receives data in parameter
   * and MUST return a formatted data that has to be imported in a tree.
   * @return {object} - {@link Tree}.
   * @example
   *
   * var data = {
   *   "trailId": "h2e67d4ea-f85f40e2ae4a06f4777864de",
   *   "initiatedAt": 1448393492488,
   *   "snapshots": {
   *      "snapshotId": "b3d132131-213c20f156339ea7bdcb6273",
   *      "capturedAt": 1448393495353,
   *      "thumbnail": "data:img",
   *      "children": [
   *       {
   *        "snapshotId": "yeb7ab27c-b36ff1b04aefafa9661243de",
   *        "capturedAt": 1448393499685,
   *        "thumbnail": "data:image/",
   *        "children": [
   *          {
   *            "snapshotId": "a00c9828f-e2be0fc4732f56471e77947a",
   *            "capturedAt": 1448393503061,
   *            "thumbnail": "data:image/png;base64",
   *            "children": []
   *          }
   *        ]
   *      }
   *     ]
   *   }
   * };
   *
   *  // Import
   *  // This will result in a tree having nodes containing `id` and `thumbnail` as data
   *  tree.import(data, 'children', function(nodeData){
   *    return {
   *      id: nodeData.snapshotId,
   *      thumbnail: nodeData.thumbnail
   *     }
   *  });
   *
   */
  Tree.prototype.import = function(data, childProperty, criteria){

    // Empty all tree
    if(this._rootNode) this.trimBranchFrom(this._rootNode);

    // Set Current Node to root node as null
    this._currentNode = this._rootNode = null;

    // Hold `this`
    var thiss = this;

    // Import recursively
    (function importRecur(node, recurData){

      // Format data from given criteria
      var _data = criteria(recurData);

      // Create Root Node
      if(!node){
        node = thiss.insert(_data);
      } else {
        node = thiss.insertToNode(node, _data);
      }

      // For Every Child
      recurData[childProperty].forEach(function(_child){
        importRecur(node, _child);
      });

    }(this._rootNode, data));

    // Set Current Node to root node
    this._currentNode = this._rootNode;

    return this;

  };

  /**
   * Callback that receives a node data in parameter and expects user to return one of following:
   * 1. {@link Traverser#searchBFS} - {boolean} in return indicating whether given node satisfies criteria.
   * 2. {@link Traverser#searchDFS} - {boolean} in return indicating whether given node satisfies criteria.
   * 3. {@link Tree#export} - {object} in return indicating formatted data object.
   * @callback criteria
   * @param data {object} - data of particular {@link TreeNode}
   */

   // ------------------------------------
   // Export
   // ------------------------------------

  return Tree;

}());

},{"./traverser":30,"./tree-node":31}],33:[function(require,module,exports){
/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||function(e){"use strict";if("undefined"==typeof navigator||!/MSIE [1-9]\./.test(navigator.userAgent)){var t=e.document,n=function(){return e.URL||e.webkitURL||e},o=t.createElementNS("http://www.w3.org/1999/xhtml","a"),r="download"in o,i=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},a=e.webkitRequestFileSystem,c=e.requestFileSystem||a||e.mozRequestFileSystem,u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},f="application/octet-stream",s=0,d=500,l=function(t){var o=function(){"string"==typeof t?n().revokeObjectURL(t):t.remove()};e.chrome?o():setTimeout(o,d)},v=function(e,t,n){t=[].concat(t);for(var o=t.length;o--;){var r=e["on"+t[o]];if("function"==typeof r)try{r.call(e,n||e)}catch(i){u(i)}}},p=function(e){return/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)?new Blob(["﻿",e],{type:e.type}):e},w=function(t,u,d){d||(t=p(t));var w,y,m,S=this,h=t.type,O=!1,R=function(){v(S,"writestart progress write writeend".split(" "))},b=function(){if((O||!w)&&(w=n().createObjectURL(t)),y)y.location.href=w;else{var o=e.open(w,"_blank");void 0==o&&"undefined"!=typeof safari&&(e.location.href=w)}S.readyState=S.DONE,R(),l(w)},g=function(e){return function(){return S.readyState!==S.DONE?e.apply(this,arguments):void 0}},E={create:!0,exclusive:!1};return S.readyState=S.INIT,u||(u="download"),r?(w=n().createObjectURL(t),o.href=w,o.download=u,void setTimeout(function(){i(o),R(),l(w),S.readyState=S.DONE})):(e.chrome&&h&&h!==f&&(m=t.slice||t.webkitSlice,t=m.call(t,0,t.size,f),O=!0),a&&"download"!==u&&(u+=".download"),(h===f||a)&&(y=e),c?(s+=t.size,void c(e.TEMPORARY,s,g(function(e){e.root.getDirectory("saved",E,g(function(e){var n=function(){e.getFile(u,E,g(function(e){e.createWriter(g(function(n){n.onwriteend=function(t){y.location.href=e.toURL(),S.readyState=S.DONE,v(S,"writeend",t),l(e)},n.onerror=function(){var e=n.error;e.code!==e.ABORT_ERR&&b()},"writestart progress write abort".split(" ").forEach(function(e){n["on"+e]=S["on"+e]}),n.write(t),S.abort=function(){n.abort(),S.readyState=S.DONE},S.readyState=S.WRITING}),b)}),b)};e.getFile(u,{create:!1},g(function(e){e.remove(),n()}),g(function(e){e.code===e.NOT_FOUND_ERR?n():b()}))}),b)}),b)):void b())},y=w.prototype,m=function(e,t,n){return new w(e,t,n)};return"undefined"!=typeof navigator&&navigator.msSaveOrOpenBlob?function(e,t,n){return n||(e=p(e)),navigator.msSaveOrOpenBlob(e,t||"download")}:(y.abort=function(){var e=this;e.readyState=e.DONE,v(e,"abort")},y.readyState=y.INIT=0,y.WRITING=1,y.DONE=2,y.error=y.onwritestart=y.onprogress=y.onwrite=y.onabort=y.onerror=y.onwriteend=null,m)}}("undefined"!=typeof self&&self||"undefined"!=typeof window&&window||this.content);"undefined"!=typeof module&&module.exports?module.exports.saveAs=saveAs:"undefined"!=typeof define&&null!==define&&null!=define.amd&&define([],function(){return saveAs});
},{}],34:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],35:[function(require,module,exports){
// Simple, stupid "background"/"background-image" value parser that just aims at exposing the image URLs
"use strict";

var cssSupport = require('./cssSupport');


var trimCSSWhitespace = function (url) {
    var whitespaceRegex = /^[\t\r\f\n ]*(.+?)[\t\r\f\n ]*$/;

    return url.replace(whitespaceRegex, "$1");
};

// TODO exporting this for the sake of unit testing. Should rather test the background value parser explicitly.
exports.extractCssUrl = function (cssUrl) {
    var urlRegex = /^url\(([^\)]+)\)/,
        quotedUrl;

    if (!urlRegex.test(cssUrl)) {
        throw new Error("Invalid url");
    }

    quotedUrl = urlRegex.exec(cssUrl)[1];
    return cssSupport.unquoteString(trimCSSWhitespace(quotedUrl));
};

var sliceBackgroundDeclaration = function (backgroundDeclarationText) {
    var functionParamRegexS = "\\s*(?:\"[^\"]*\"|'[^']*'|[^\\(]+)\\s*",
        valueRegexS = "(" + "url\\(" + functionParamRegexS + "\\)" + "|" + "[^,\\s]+" + ")",
        simpleSingularBackgroundRegexS = "(?:\\s*" + valueRegexS + ")+",
        simpleBackgroundRegexS = "^\\s*(" + simpleSingularBackgroundRegexS + ")" +
                                  "(?:\\s*,\\s*(" + simpleSingularBackgroundRegexS + "))*" +
                                  "\\s*$",
        simpleSingularBackgroundRegex = new RegExp(simpleSingularBackgroundRegexS, "g"),
        outerRepeatedMatch,
        backgroundLayers = [],
        getValues = function (singularBackgroundDeclaration) {
            var valueRegex = new RegExp(valueRegexS, "g"),
                backgroundValues = [],
                repeatedMatch;

            repeatedMatch = valueRegex.exec(singularBackgroundDeclaration);
            while (repeatedMatch) {
                backgroundValues.push(repeatedMatch[1]);
                repeatedMatch = valueRegex.exec(singularBackgroundDeclaration);
            }
            return backgroundValues;
        };

    if (backgroundDeclarationText.match(new RegExp(simpleBackgroundRegexS))) {
        outerRepeatedMatch = simpleSingularBackgroundRegex.exec(backgroundDeclarationText);
        while (outerRepeatedMatch) {
            backgroundLayers.push(getValues(outerRepeatedMatch[0]));
            outerRepeatedMatch = simpleSingularBackgroundRegex.exec(backgroundDeclarationText);
        }

        return backgroundLayers;
    }
    return [];
};

var findBackgroundImageUrlInValues = function (values) {
    var i, url;

    for(i = 0; i < values.length; i++) {
        try {
            url = exports.extractCssUrl(values[i]);
            return {
                url: url,
                idx: i
            };
        } catch (e) {}
    }
};

exports.parse = function (backgroundValue) {
    var backgroundLayers = sliceBackgroundDeclaration(backgroundValue);

    return backgroundLayers.map(function (backgroundLayerValues) {
        var urlMatch = findBackgroundImageUrlInValues(backgroundLayerValues);

        if (urlMatch) {
            return {
                preUrl: backgroundLayerValues.slice(0, urlMatch.idx),
                url: urlMatch.url,
                postUrl: backgroundLayerValues.slice(urlMatch.idx+1),
            };
        } else {
            return {
                preUrl: backgroundLayerValues
            };
        }
    });
};

exports.serialize = function (parsedBackground) {
    var backgroundLayers = parsedBackground.map(function (backgroundLayer) {
        var values = [].concat(backgroundLayer.preUrl);

        if (backgroundLayer.url) {
            values.push('url("' + backgroundLayer.url + '")');
        }
        if (backgroundLayer.postUrl) {
            values = values.concat(backgroundLayer.postUrl);
        }

        return values.join(' ');
    });

    return backgroundLayers.join(', ');
};

},{"./cssSupport":36}],36:[function(require,module,exports){
"use strict";

var cssom = require('cssom');


exports.unquoteString = function (quotedUrl) {
    var doubleQuoteRegex = /^"(.*)"$/,
        singleQuoteRegex = /^'(.*)'$/;

    if (doubleQuoteRegex.test(quotedUrl)) {
        return quotedUrl.replace(doubleQuoteRegex, "$1");
    } else {
        if (singleQuoteRegex.test(quotedUrl)) {
            return quotedUrl.replace(singleQuoteRegex, "$1");
        } else {
            return quotedUrl;
        }
    }
};

var rulesForCssTextFromBrowser = function (styleContent) {
    var doc = document.implementation.createHTMLDocument(""),
        styleElement = document.createElement("style"),
        rules;

    styleElement.textContent = styleContent;
    // the style will only be parsed once it is added to a document
    doc.body.appendChild(styleElement);
    rules = styleElement.sheet.cssRules;

    return Array.prototype.slice.call(rules);
};

var browserHasBackgroundImageUrlIssue = (function () {
    // Checks for http://code.google.com/p/chromium/issues/detail?id=161644
    var rules = rulesForCssTextFromBrowser('a{background:url(i)}');
    return !rules.length || rules[0].cssText.indexOf('url()') >= 0;
}());

exports.rulesForCssText = function (styleContent) {
    if (browserHasBackgroundImageUrlIssue && cssom.parse) {
        return cssom.parse(styleContent).cssRules;
    } else {
        return rulesForCssTextFromBrowser(styleContent);
    }
};

exports.cssRulesToText = function (cssRules) {
    return cssRules.reduce(function (cssText, rule) {
        return cssText + rule.cssText;
    }, '');
};

exports.exchangeRule = function (cssRules, rule, newRuleText) {
    var ruleIdx = cssRules.indexOf(rule),
        styleSheet = rule.parentStyleSheet;

    // Generate a new rule
    styleSheet.insertRule(newRuleText, ruleIdx+1);
    styleSheet.deleteRule(ruleIdx);
    // Exchange with the new
    cssRules[ruleIdx] = styleSheet.cssRules[ruleIdx];
};

// Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=443978
exports.changeFontFaceRuleSrc = function (cssRules, rule, newSrc) {
    var newRuleText = '@font-face { font-family: ' + rule.style.getPropertyValue("font-family") + '; ';

    if (rule.style.getPropertyValue("font-style")) {
        newRuleText += 'font-style: ' + rule.style.getPropertyValue("font-style") + '; ';
    }

    if (rule.style.getPropertyValue("font-weight")) {
        newRuleText += 'font-weight: ' + rule.style.getPropertyValue("font-weight") + '; ';
    }

    newRuleText += 'src: ' + newSrc + '}';
    exports.exchangeRule(cssRules, rule, newRuleText);
};

},{"cssom":27}],37:[function(require,module,exports){
"use strict";

var util = require('./util'),
    inlineImage = require('./inlineImage'),
    inlineScript = require('./inlineScript'),
    inlineCss = require('./inlineCss'),
    cssSupport = require('./cssSupport');


var getUrlBasePath = function (url) {
    return util.joinUrl(url, '.');
};

var parameterHashFunction = function (params) {
    // HACK JSON.stringify is poor man's hashing;
    // same objects might not receive same result as key order is not guaranteed
    var a = params.map(function (param, idx) {
        // Only include options relevant for method
        if (idx === (params.length - 1)) {
            param = {
                // Two different HTML pages on the same path level have the same base path, but a different URL
                baseUrl: getUrlBasePath(param.baseUrl)
            };
        }
        return JSON.stringify(param);
    });
    return a;
};

var memoizeFunctionOnCaching = function (func, options) {
    if ((options.cache !== false && options.cache !== 'none') && options.cacheBucket) {
        return util.memoize(func, parameterHashFunction, options.cacheBucket);
    } else {
        return func;
    }
};

/* Style inlining */

var requestExternalsForStylesheet = function (styleContent, alreadyLoadedCssUrls, options) {
    var cssRules = cssSupport.rulesForCssText(styleContent);

    return inlineCss.loadCSSImportsForRules(cssRules, alreadyLoadedCssUrls, options).then(function (cssImportResult) {
        return inlineCss.loadAndInlineCSSResourcesForRules(cssRules, options).then(function (cssResourcesResult) {
            var errors = cssImportResult.errors.concat(cssResourcesResult.errors),
                hasChanges = cssImportResult.hasChanges || cssResourcesResult.hasChanges;

            if (hasChanges) {
                styleContent = cssSupport.cssRulesToText(cssRules);
            }

            return {
                hasChanges: hasChanges,
                content: styleContent,
                errors: errors
            };
        });
    });
};

var loadAndInlineCssForStyle = function (style, options, alreadyLoadedCssUrls) {
    var styleContent = style.textContent,
        processExternals = memoizeFunctionOnCaching(requestExternalsForStylesheet, options);

    return processExternals(styleContent, alreadyLoadedCssUrls, options).then(function (result) {
        if (result.hasChanges) {
            style.childNodes[0].nodeValue = result.content;
        }

        return util.cloneArray(result.errors);
    });
};

var getCssStyleElements = function (doc) {
    var styles = doc.getElementsByTagName("style");

    return Array.prototype.filter.call(styles, function (style) {
        return !style.attributes.type || style.attributes.type.nodeValue === "text/css";
    });
};

exports.loadAndInlineStyles = function (doc, options) {
    var styles = getCssStyleElements(doc),
        allErrors = [],
        alreadyLoadedCssUrls = [],
        inlineOptions;

    inlineOptions = util.clone(options);
    inlineOptions.baseUrl = inlineOptions.baseUrl || util.getDocumentBaseUrl(doc);

    return util.all(styles.map(function (style) {
        return loadAndInlineCssForStyle(style, inlineOptions, alreadyLoadedCssUrls).then(function (errors) {
            allErrors = allErrors.concat(errors);
        });
    })).then(function () {
        return allErrors;
    });
};

/* CSS link inlining */

var substituteLinkWithInlineStyle = function (oldLinkNode, styleContent) {
    var parent = oldLinkNode.parentNode,
        styleNode;

    styleContent = styleContent.trim();
    if (styleContent) {
        styleNode = oldLinkNode.ownerDocument.createElement("style");
        styleNode.type = "text/css";
        styleNode.appendChild(oldLinkNode.ownerDocument.createTextNode(styleContent));

        parent.insertBefore(styleNode, oldLinkNode);
    }

    parent.removeChild(oldLinkNode);
};

var requestStylesheetAndInlineResources = function (url, options) {
    return util.ajax(url, options)
        .then(function (content) {
            var cssRules = cssSupport.rulesForCssText(content);

            return {
                content: content,
                cssRules: cssRules
            };
        })
        .then(function (result) {
            var hasChangesFromPathAdjustment = inlineCss.adjustPathsOfCssResources(url, result.cssRules);

            return {
                content: result.content,
                cssRules: result.cssRules,
                hasChanges: hasChangesFromPathAdjustment
            };
        })
        .then(function (result) {
            return inlineCss.loadCSSImportsForRules(result.cssRules, [], options)
                .then(function (cssImportResult) {
                    return {
                        content: result.content,
                        cssRules: result.cssRules,
                        hasChanges: result.hasChanges || cssImportResult.hasChanges,
                        errors: cssImportResult.errors
                    };
                });
        })
        .then(function (result) {
            return inlineCss.loadAndInlineCSSResourcesForRules(result.cssRules, options)
                .then(function (cssResourcesResult) {
                    return {
                        content: result.content,
                        cssRules: result.cssRules,
                        hasChanges: result.hasChanges || cssResourcesResult.hasChanges,
                        errors: result.errors.concat(cssResourcesResult.errors)
                    };
                });
        })
        .then(function (result) {
            var content = result.content;
            if (result.hasChanges) {
                content = cssSupport.cssRulesToText(result.cssRules);
            }
            return {
                content: content,
                errors: result.errors
            };
        });
};

var loadLinkedCSS = function (link, options) {
    var cssHref = link.attributes.href.nodeValue,
        documentBaseUrl = util.getDocumentBaseUrl(link.ownerDocument),
        ajaxOptions = util.clone(options);

    if (!ajaxOptions.baseUrl && documentBaseUrl) {
        ajaxOptions.baseUrl = documentBaseUrl;
    }

    var processStylesheet = memoizeFunctionOnCaching(requestStylesheetAndInlineResources, options);

    return processStylesheet(cssHref, ajaxOptions).then(function (result) {
        return {
            content: result.content,
            errors: util.cloneArray(result.errors)
        };
    });
};

var getCssStylesheetLinks = function (doc) {
    var links = doc.getElementsByTagName("link");

    return Array.prototype.filter.call(links, function (link) {
        return link.attributes.rel && link.attributes.rel.nodeValue === "stylesheet" &&
            (!link.attributes.type || link.attributes.type.nodeValue === "text/css");
    });
};

exports.loadAndInlineCssLinks = function (doc, options) {
    var links = getCssStylesheetLinks(doc),
        errors = [];

    return util.all(links.map(function (link) {
        return loadLinkedCSS(link, options).then(function(result) {
            substituteLinkWithInlineStyle(link, result.content + "\n");

            errors = errors.concat(result.errors);
        }, function (e) {
            errors.push({
                resourceType: "stylesheet",
                url: e.url,
                msg: "Unable to load stylesheet " + e.url
            });
        });
    })).then(function () {
        return errors;
    });
};

/* Main */

exports.loadAndInlineImages = inlineImage.inline;
exports.loadAndInlineScript = inlineScript.inline;

exports.inlineReferences = function (doc, options) {
    var allErrors = [],
        inlineFuncs = [
            exports.loadAndInlineImages,
            exports.loadAndInlineStyles,
            exports.loadAndInlineCssLinks];

    if (options.inlineScripts !== false) {
        inlineFuncs.push(exports.loadAndInlineScript);
    }

    return util.all(inlineFuncs.map(function (func) {
        return func(doc, options)
            .then(function (errors) {
                allErrors = allErrors.concat(errors);
            });
    })).then(function () {
        return allErrors;
    });
};

},{"./cssSupport":36,"./inlineCss":38,"./inlineImage":39,"./inlineScript":40,"./util":41}],38:[function(require,module,exports){
"use strict";

var ayepromise = require('ayepromise'),
    util = require('./util'),
    cssSupport = require('./cssSupport'),
    backgroundValueParser = require('./backgroundValueParser'),
    fontFaceSrcValueParser = require('css-font-face-src');


var updateCssPropertyValue = function (rule, property, value) {
    rule.style.setProperty(property, value, rule.style.getPropertyPriority(property));
};

var findBackgroundImageRules = function (cssRules) {
    return cssRules.filter(function (rule) {
        return rule.type === window.CSSRule.STYLE_RULE && (rule.style.getPropertyValue('background-image') || rule.style.getPropertyValue('background'));
    });
};

var findBackgroundDeclarations = function (rules) {
    var backgroundDeclarations = [];

    rules.forEach(function (rule) {
        if (rule.style.getPropertyValue('background-image')) {
            backgroundDeclarations.push({
                property: 'background-image',
                value: rule.style.getPropertyValue('background-image'),
                rule: rule
            });
        } else if (rule.style.getPropertyValue('background')) {
            backgroundDeclarations.push({
                property: 'background',
                value: rule.style.getPropertyValue('background'),
                rule: rule
            });
        }
    });

    return backgroundDeclarations;
};

var findFontFaceRules = function (cssRules) {
    return cssRules.filter(function (rule) {
        return rule.type === window.CSSRule.FONT_FACE_RULE && rule.style.getPropertyValue("src");
    });
};

var findCSSImportRules = function (cssRules) {
    return cssRules.filter(function (rule) {
        return rule.type === window.CSSRule.IMPORT_RULE && rule.href;
    });
};

var findExternalBackgroundUrls = function (parsedBackground) {
    var matchIndices = [];

    parsedBackground.forEach(function (backgroundLayer, i) {
        if (backgroundLayer.url && !util.isDataUri(backgroundLayer.url)) {
            matchIndices.push(i);
        }
    });

    return matchIndices;
};

var findExternalFontFaceUrls = function (parsedFontFaceSources) {
    var sourceIndices = [];
    parsedFontFaceSources.forEach(function (sourceItem, i) {
        if (sourceItem.url && !util.isDataUri(sourceItem.url)) {
            sourceIndices.push(i);
        }
    });
    return sourceIndices;
};

exports.adjustPathsOfCssResources = function (baseUrl, cssRules) {
    var backgroundRules = findBackgroundImageRules(cssRules),
        backgroundDeclarations = findBackgroundDeclarations(backgroundRules),
        change = false;

    backgroundDeclarations.forEach(function (declaration) {
        var parsedBackground = backgroundValueParser.parse(declaration.value),
            externalBackgroundIndices = findExternalBackgroundUrls(parsedBackground),
            backgroundValue;

        if (externalBackgroundIndices.length > 0) {
            externalBackgroundIndices.forEach(function (backgroundLayerIndex) {
                var relativeUrl = parsedBackground[backgroundLayerIndex].url,
                    url = util.joinUrl(baseUrl, relativeUrl);
                parsedBackground[backgroundLayerIndex].url = url;
            });

            backgroundValue = backgroundValueParser.serialize(parsedBackground);

            updateCssPropertyValue(declaration.rule, declaration.property, backgroundValue);

            change = true;
        }
    });
    findFontFaceRules(cssRules).forEach(function (rule) {
        var fontFaceSrcDeclaration = rule.style.getPropertyValue("src"),
            parsedFontFaceSources, externalFontFaceUrlIndices;

        try {
            parsedFontFaceSources = fontFaceSrcValueParser.parse(fontFaceSrcDeclaration);
        } catch (e) {
            return;
        }
        externalFontFaceUrlIndices = findExternalFontFaceUrls(parsedFontFaceSources);

        if (externalFontFaceUrlIndices.length > 0) {
            externalFontFaceUrlIndices.forEach(function (fontFaceUrlIndex) {
                var relativeUrl = parsedFontFaceSources[fontFaceUrlIndex].url,
                    url = util.joinUrl(baseUrl, relativeUrl);

                parsedFontFaceSources[fontFaceUrlIndex].url = url;
            });

            cssSupport.changeFontFaceRuleSrc(cssRules, rule, fontFaceSrcValueParser.serialize(parsedFontFaceSources));

            change = true;
        }
    });
    findCSSImportRules(cssRules).forEach(function (rule) {
        var cssUrl = rule.href,
            url = util.joinUrl(baseUrl, cssUrl);

        cssSupport.exchangeRule(cssRules, rule, "@import url(" + url + ");");

        change = true;
    });

    return change;
};

/* CSS import inlining */

var substituteRule = function (cssRules, rule, newCssRules) {
    var position = cssRules.indexOf(rule);

    cssRules.splice(position, 1);

    newCssRules.forEach(function (newRule, i) {
        cssRules.splice(position + i, 0, newRule);
    });
};

var fulfilledPromise = function (value) {
    var defer = ayepromise.defer();
    defer.resolve(value);
    return defer.promise;
};

var loadAndInlineCSSImport = function (cssRules, rule, alreadyLoadedCssUrls, options) {
    var url = rule.href,
        cssHrefRelativeToDoc;

    url = cssSupport.unquoteString(url);

    cssHrefRelativeToDoc = util.joinUrl(options.baseUrl, url);

    if (alreadyLoadedCssUrls.indexOf(cssHrefRelativeToDoc) >= 0) {
        // Remove URL by adding empty string
        substituteRule(cssRules, rule, []);
        return fulfilledPromise([]);
    } else {
        alreadyLoadedCssUrls.push(cssHrefRelativeToDoc);
    }

    return util.ajax(url, options)
        .then(function (cssText) {
            var externalCssRules = cssSupport.rulesForCssText(cssText);

            // Recursively follow @import statements
            return exports.loadCSSImportsForRules(externalCssRules, alreadyLoadedCssUrls, options)
                .then(function (result) {
                    exports.adjustPathsOfCssResources(url, externalCssRules);

                    substituteRule(cssRules, rule, externalCssRules);

                    return result.errors;
                });
        }, function (e) {
            throw {
                resourceType: "stylesheet",
                url: e.url,
                msg: "Unable to load stylesheet " + e.url
            };
        });
};

exports.loadCSSImportsForRules = function (cssRules, alreadyLoadedCssUrls, options) {
    var rulesToInline = findCSSImportRules(cssRules),
        errors = [],
        hasChanges = false;

    return util.all(rulesToInline.map(function (rule) {
        return loadAndInlineCSSImport(cssRules, rule, alreadyLoadedCssUrls, options).then(function (moreErrors) {
            errors = errors.concat(moreErrors);

            hasChanges = true;
        }, function (e) {
            errors.push(e);
        });
    })).then(function () {
        return {
            hasChanges: hasChanges,
            errors: errors
        };
    });
};

/* CSS linked resource inlining */

var loadAndInlineBackgroundImages = function (backgroundValue, options) {
    var parsedBackground = backgroundValueParser.parse(backgroundValue),
        externalBackgroundLayerIndices = findExternalBackgroundUrls(parsedBackground),
        hasChanges = false;

    return util.collectAndReportErrors(externalBackgroundLayerIndices.map(function (backgroundLayerIndex) {
        var url = parsedBackground[backgroundLayerIndex].url;

        return util.getDataURIForImageURL(url, options)
            .then(function (dataURI) {
                parsedBackground[backgroundLayerIndex].url = dataURI;

                hasChanges = true;
            }, function (e) {
                throw {
                    resourceType: "backgroundImage",
                    url: e.url,
                    msg: "Unable to load background-image " + e.url
                };
            });
    })).then(function (errors) {
        return {
            backgroundValue: backgroundValueParser.serialize(parsedBackground),
            hasChanges: hasChanges,
            errors: errors
        };
    });
};

var iterateOverRulesAndInlineBackgroundImages = function (cssRules, options) {
    var rulesToInline = findBackgroundImageRules(cssRules),
        backgroundDeclarations = findBackgroundDeclarations(rulesToInline),
        errors = [],
        cssHasChanges = false;

    return util.all(backgroundDeclarations.map(function (declaration) {
        return loadAndInlineBackgroundImages(declaration.value, options)
            .then(function (result) {
                if (result.hasChanges) {
                    updateCssPropertyValue(declaration.rule, declaration.property, result.backgroundValue);

                    cssHasChanges = true;
                }

                errors = errors.concat(result.errors);
            });
    })).then(function () {
        return {
            hasChanges: cssHasChanges,
            errors: errors
        };
    });
};

var loadAndInlineFontFace = function (srcDeclarationValue, options) {
    var hasChanges = false,
        parsedFontFaceSources, externalFontFaceUrlIndices;

    try {
        parsedFontFaceSources = fontFaceSrcValueParser.parse(srcDeclarationValue);
    } catch (e) {
        parsedFontFaceSources = [];
    }
    externalFontFaceUrlIndices = findExternalFontFaceUrls(parsedFontFaceSources);

    return util.collectAndReportErrors(externalFontFaceUrlIndices.map(function (urlIndex) {
        var fontSrc = parsedFontFaceSources[urlIndex],
            format = fontSrc.format || "woff";

        return util.binaryAjax(fontSrc.url, options)
            .then(function (content) {
                var base64Content = btoa(content);
                fontSrc.url = 'data:font/' + format + ';base64,' + base64Content;

                hasChanges = true;
            }, function (e) {
                throw {
                    resourceType: "fontFace",
                    url: e.url,
                    msg: "Unable to load font-face " + e.url
                };
            });
    })).then(function (errors) {
        return {
            srcDeclarationValue: fontFaceSrcValueParser.serialize(parsedFontFaceSources),
            hasChanges: hasChanges,
            errors: errors
        };
    });
};

var iterateOverRulesAndInlineFontFace = function (cssRules, options) {
    var rulesToInline = findFontFaceRules(cssRules),
        errors = [],
        hasChanges = false;

    return util.all(rulesToInline.map(function (rule) {
        var srcDeclarationValue = rule.style.getPropertyValue("src");

        return loadAndInlineFontFace(srcDeclarationValue, options).then(function (result) {
            if (result.hasChanges) {
                cssSupport.changeFontFaceRuleSrc(cssRules, rule, result.srcDeclarationValue);

                hasChanges = true;
            }

            errors = errors.concat(result.errors);
        });
    })).then(function () {
        return {
            hasChanges: hasChanges,
            errors: errors
        };
    });
};

exports.loadAndInlineCSSResourcesForRules = function (cssRules, options) {
    var hasChanges = false,
        errors = [];

    return util.all([iterateOverRulesAndInlineBackgroundImages, iterateOverRulesAndInlineFontFace].map(function (func) {
        return func(cssRules, options)
            .then(function (result) {
                hasChanges = hasChanges || result.hasChanges;
                errors = errors.concat(result.errors);
            });
    })).then(function () {
        return {
            hasChanges: hasChanges,
            errors: errors
        };
    });
};

},{"./backgroundValueParser":35,"./cssSupport":36,"./util":41,"ayepromise":2,"css-font-face-src":8}],39:[function(require,module,exports){
"use strict";

var util = require('./util');


var encodeImageAsDataURI = function (image, options) {
    var url = image.attributes.src ? image.attributes.src.nodeValue : null,
        documentBase = util.getDocumentBaseUrl(image.ownerDocument),
        ajaxOptions = util.clone(options);

    if (!ajaxOptions.baseUrl && documentBase) {
        ajaxOptions.baseUrl = documentBase;
    }

    return util.getDataURIForImageURL(url, ajaxOptions)
        .then(function (dataURI) {
            return dataURI;
        }, function (e) {
            throw {
                resourceType: "image",
                url: e.url,
                msg: "Unable to load image " + e.url
            };
        });
};

var filterExternalImages = function (images) {
    return images.filter(function (image) {
        var url = image.attributes.src ? image.attributes.src.nodeValue : null;

        return url !== null && !util.isDataUri(url);
    });
};

var filterInputsForImageType = function (inputs) {
    return Array.prototype.filter.call(inputs, function (input) {
        return input.type === "image";
    });
};

var toArray = function (arrayLike) {
    return Array.prototype.slice.call(arrayLike);
};

exports.inline = function (doc, options) {
    var images = toArray(doc.getElementsByTagName("img")),
        imageInputs = filterInputsForImageType(doc.getElementsByTagName("input")),
        externalImages = filterExternalImages(images.concat(imageInputs));

    return util.collectAndReportErrors(externalImages.map(function (image) {
        return encodeImageAsDataURI(image, options).then(function (dataURI) {
            image.attributes.src.nodeValue = dataURI;
        });
    }));
};

},{"./util":41}],40:[function(require,module,exports){
"use strict";

var util = require('./util');


var loadLinkedScript = function (script, options) {
    var src = script.attributes.src.nodeValue,
        documentBase = util.getDocumentBaseUrl(script.ownerDocument),
        ajaxOptions = util.clone(options);

    if (!ajaxOptions.baseUrl && documentBase) {
        ajaxOptions.baseUrl = documentBase;
    }

    return util.ajax(src, ajaxOptions)
        .fail(function (e) {
            throw {
                resourceType: "script",
                url: e.url,
                msg: "Unable to load script " + e.url
            };
        });
};

var escapeClosingTags = function (text) {
    // http://stackoverflow.com/questions/9246382/escaping-script-tag-inside-javascript
    return text.replace(/<\//g, '<\\/');
};

var substituteExternalScriptWithInline = function (scriptNode, jsCode) {
    scriptNode.attributes.removeNamedItem('src');
    scriptNode.textContent = escapeClosingTags(jsCode);
};

var getScripts = function (doc) {
    var scripts = doc.getElementsByTagName("script");

    return Array.prototype.filter.call(scripts, function (script) {
        return !!script.attributes.src;
    });
};

exports.inline = function (doc, options) {
    var scripts = getScripts(doc);

    return util.collectAndReportErrors(scripts.map(function (script) {
        return loadLinkedScript(script, options).then(function (jsCode) {
            substituteExternalScriptWithInline(script, jsCode);
        });
    }));
};

},{"./util":41}],41:[function(require,module,exports){
"use strict";

var url = require('url'),
    ayepromise = require('ayepromise');


exports.getDocumentBaseUrl = function (doc) {
    if (doc.baseURI !== 'about:blank') {
        return doc.baseURI;
    }

    return null;
};

exports.clone = function (object) {
    var theClone = {},
        i;
    for (i in object) {
        if (object.hasOwnProperty(i)) {
           theClone[i] = object[i];
        }
    }
    return theClone;
};

exports.cloneArray = function (nodeList) {
    return Array.prototype.slice.apply(nodeList, [0]);
};

exports.joinUrl = function (baseUrl, relUrl) {
    if (!baseUrl) {
        return relUrl;
    }
    return url.resolve(baseUrl, relUrl);
};

exports.isDataUri = function (url) {
    return (/^data:/).test(url);
};

exports.all = function (promises) {
    var defer = ayepromise.defer(),
        pendingPromiseCount = promises.length,
        resolvedValues = [];

    if (promises.length === 0) {
        defer.resolve([]);
        return defer.promise;
    }

    promises.forEach(function (promise, idx) {
        promise.then(function (value) {
            pendingPromiseCount -= 1;
            resolvedValues[idx] = value;

            if (pendingPromiseCount === 0) {
                defer.resolve(resolvedValues);
            }
        }, function (e) {
            defer.reject(e);
        });
    });
    return defer.promise;
};

exports.collectAndReportErrors = function (promises) {
    var errors = [];

    return exports.all(promises.map(function (promise) {
        return promise.fail(function (e) {
            errors.push(e);
        });
    })).then(function () {
        return errors;
    });
};

var lastCacheDate = null;

var getUncachableURL = function (url, cache) {
    if (cache === false || cache === 'none' || cache === 'repeated') {
        if (lastCacheDate === null || cache !== 'repeated') {
            lastCacheDate = Date.now();
        }
        return url + "?_=" + lastCacheDate;
    } else {
        return url;
    }
};

exports.ajax = function (url, options) {
    var ajaxRequest = new window.XMLHttpRequest(),
        defer = ayepromise.defer(),
        joinedUrl = exports.joinUrl(options.baseUrl, url),
        augmentedUrl;

    var doReject = function () {
        defer.reject({
            msg: 'Unable to load url',
            url: joinedUrl
        });
    };

    augmentedUrl = getUncachableURL(joinedUrl, options.cache);

    ajaxRequest.addEventListener("load", function () {
        if (ajaxRequest.status === 200 || ajaxRequest.status === 0) {
            defer.resolve(ajaxRequest.response);
        } else {
            doReject();
        }
    }, false);

    ajaxRequest.addEventListener("error", doReject, false);

    try {
        ajaxRequest.open('GET', augmentedUrl, true);
        ajaxRequest.overrideMimeType(options.mimeType);
        ajaxRequest.send(null);
    } catch (e) {
        doReject();
    }

    return defer.promise;
};

exports.binaryAjax = function (url, options) {
    var ajaxOptions = exports.clone(options);

    ajaxOptions.mimeType = 'text/plain; charset=x-user-defined';

    return exports.ajax(url, ajaxOptions)
        .then(function (content) {
            var binaryContent = "";

            for (var i = 0; i < content.length; i++) {
                binaryContent += String.fromCharCode(content.charCodeAt(i) & 0xFF);
            }

            return binaryContent;
        });
};

var detectMimeType = function (content) {
    var startsWith = function (string, substring) {
        return string.substring(0, substring.length) === substring;
    };

    if (startsWith(content, '<?xml') || startsWith(content, '<svg')) {
        return 'image/svg+xml';
    }
    return 'image/png';
};

exports.getDataURIForImageURL = function (url, options) {
    return exports.binaryAjax(url, options)
        .then(function (content) {
            var base64Content = btoa(content),
                mimeType = detectMimeType(content);

            return 'data:' + mimeType + ';base64,' + base64Content;
        });
};

var uniqueIdList = [];

var constantUniqueIdFor = function (element) {
    // HACK, using a list results in O(n), but how do we hash a function?
    if (uniqueIdList.indexOf(element) < 0) {
        uniqueIdList.push(element);
    }
    return uniqueIdList.indexOf(element);
};

exports.memoize = function (func, hasher, memo) {
    if (typeof memo !== "object") {
        throw new Error("cacheBucket is not an object");
    }

    return function () {
        var args = Array.prototype.slice.call(arguments);

        var argumentHash = hasher(args),
            funcHash = constantUniqueIdFor(func),
            retValue;

        if (memo[funcHash] && memo[funcHash][argumentHash]) {
            return memo[funcHash][argumentHash];
        } else {
            retValue = func.apply(null, args);

            memo[funcHash] = memo[funcHash] || {};
            memo[funcHash][argumentHash] = retValue;

            return retValue;
        }
    };
};

},{"ayepromise":2,"url":48}],42:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.3.2 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.3.2',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],43:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],44:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],45:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":43,"./encode":44}],46:[function(require,module,exports){
/*! rasterizeHTML.js - v1.2.1 - 2015-11-26
* http://www.github.com/cburgmer/rasterizeHTML.js
* Copyright (c) 2015 Christoph Burgmer; Licensed MIT */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define(["url","css-mediaquery","xmlserializer","sane-domparser-error","ayepromise","inlineresources"], function (a0,b1,c2,d3,e4,f5) {
      return (root['rasterizeHTML'] = factory(a0,b1,c2,d3,e4,f5));
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require("url"),require("css-mediaquery"),require("xmlserializer"),require("sane-domparser-error"),require("ayepromise"),require("inlineresources"));
  } else {
    root['rasterizeHTML'] = factory(url,cssMediaQuery,xmlserializer,sanedomparsererror,ayepromise,inlineresources);
  }
}(this, function (url, cssMediaQuery, xmlserializer, sanedomparsererror, ayepromise, inlineresources) {

var util = (function (url) {
    "use strict";

    var module = {};

    var uniqueIdList = [];

    module.joinUrl = function (baseUrl, relUrl) {
        if (!baseUrl) {
            return relUrl;
        }
        return url.resolve(baseUrl, relUrl);
    };

    module.getConstantUniqueIdFor = function (element) {
        // HACK, using a list results in O(n), but how do we hash e.g. a DOM node?
        if (uniqueIdList.indexOf(element) < 0) {
            uniqueIdList.push(element);
        }
        return uniqueIdList.indexOf(element);
    };

    module.clone = function (object) {
        var theClone = {},
            i;
        for (i in object) {
            if (object.hasOwnProperty(i)) {
                theClone[i] = object[i];
            }
        }
        return theClone;
    };

    var isObject = function (obj) {
        return typeof obj === "object" && obj !== null;
    };

    var isCanvas = function (obj) {
        return isObject(obj) &&
            Object.prototype.toString.apply(obj).match(/\[object (Canvas|HTMLCanvasElement)\]/i);
    };

    // args: canvas, options
    module.parseOptionalParameters = function (args) {
        var parameters = {
            canvas: null,
            options: {}
        };

        if (args[0] == null || isCanvas(args[0])) {
            parameters.canvas = args[0] || null;

            parameters.options = module.clone(args[1]);
        } else {
            parameters.options = module.clone(args[0]);
        }

        return parameters;
    };

    return module;
}(url));

// Proxy objects by monkey patching
var proxies = (function (util, ayepromise) {
    "use strict";

    var module = {};

    var monkeyPatchInstanceMethod = function (object, methodName, proxyFunc) {
        var originalFunc = object[methodName];

        object[methodName] = function () {
            var args = Array.prototype.slice.call(arguments);

            return proxyFunc.apply(this, [args, originalFunc]);
        };

        return originalFunc;
    };

    // Bases all XHR calls on the given base URL
    module.baseUrlRespectingXhr = function (XHRObject, baseUrl) {
        var xhrConstructor = function () {
            var xhr = new XHRObject();

            monkeyPatchInstanceMethod(xhr, 'open', function (args, originalOpen) {
                var method = args.shift(),
                    url = args.shift(),
                    joinedUrl = util.joinUrl(baseUrl, url);

                return originalOpen.apply(this, [method, joinedUrl].concat(args));
            });

            return xhr;
        };

        return xhrConstructor;
    };

    // Provides a convenient way of being notified when all pending XHR calls are finished
    module.finishNotifyingXhr = function (XHRObject) {
        var totalXhrCount = 0,
            doneXhrCount = 0,
            waitingForPendingToClose = false,
            defer = ayepromise.defer();

        var checkAllRequestsFinished = function () {
            var pendingXhrCount = totalXhrCount - doneXhrCount;

            if (pendingXhrCount <= 0 && waitingForPendingToClose) {
                defer.resolve({totalCount: totalXhrCount});
            }
        };

        var xhrConstructor = function () {
            var xhr = new XHRObject();

            monkeyPatchInstanceMethod(xhr, 'send', function (_, originalSend) {
                totalXhrCount += 1;
                return originalSend.apply(this, arguments);
            });

            xhr.addEventListener('load', function () {
                doneXhrCount += 1;

                checkAllRequestsFinished();
            });

            return xhr;
        };

        xhrConstructor.waitForRequestsToFinish = function () {
            waitingForPendingToClose = true;
            checkAllRequestsFinished();
            return defer.promise;
        };

        return xhrConstructor;
    };

    return module;
}(util, ayepromise));

var documentUtil = (function () {
    "use strict";

    var module = {};

    var asArray = function (arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };

    module.addClassName = function (element, className) {
        element.className += ' ' + className;
    };

    module.addClassNameRecursively = function (element, className) {
        module.addClassName(element, className);

        if (element.parentNode !== element.ownerDocument) {
            module.addClassNameRecursively(element.parentNode, className);
        }
    };

    var changeCssRule = function (rule, newRuleText) {
        var styleSheet = rule.parentStyleSheet,
            ruleIdx = asArray(styleSheet.cssRules).indexOf(rule);

        // Exchange rule with the new text
        styleSheet.insertRule(newRuleText, ruleIdx+1);
        styleSheet.deleteRule(ruleIdx);
    };

    var updateRuleSelector = function (rule, updatedSelector) {
        var styleDefinitions = rule.cssText.replace(/^[^\{]+/, ''),
            newRule = updatedSelector + ' ' + styleDefinitions;

        changeCssRule(rule, newRule);
    };

    var cssRulesToText = function (cssRules) {
        return asArray(cssRules).reduce(function (cssText, rule) {
            return cssText + rule.cssText;
        }, '');
    };

    var rewriteStyleContent = function (styleElement) {
        styleElement.textContent = cssRulesToText(styleElement.sheet.cssRules);
    };

    var matchingSimpleSelectorsRegex = function (simpleSelectorList) {
        return '(' +
            '(?:^|[^.#:\\w])' +            // start of string or not a simple selector character,
            '|' +                          // ... or ...
            '(?=\\W)' +                    // the next character parsed is not an alphabetic character (and thus a natural boundary)
            ')' +
            '(' +
            simpleSelectorList.join('|') + // one out of the given simple selectors
            ')' +
            '(?=\\W|$)';                   // followed either by a non-alphabetic character or the end of the string
    };

    var replaceSimpleSelectorsBy = function (doc, simpleSelectorList, caseInsensitiveReplaceFunc) {
        var selectorRegex = matchingSimpleSelectorsRegex(simpleSelectorList);

        asArray(doc.querySelectorAll('style')).forEach(function (styleElement) {
            var matchingRules = asArray(styleElement.sheet.cssRules).filter(function (rule) {
                return rule.selectorText && new RegExp(selectorRegex, 'i').test(rule.selectorText);
            });

            if (matchingRules.length) {
                matchingRules.forEach(function (rule) {
                    var newSelector = rule.selectorText.replace(new RegExp(selectorRegex, 'gi'),
                                                             function (_, prefixMatch, selectorMatch) {
                        return prefixMatch + caseInsensitiveReplaceFunc(selectorMatch);
                    });

                    if (newSelector !== rule.selectorText) {
                        updateRuleSelector(rule, newSelector);
                    }
                });

                rewriteStyleContent(styleElement);
            }
        });
    };

    module.rewriteCssSelectorWith = function (doc, oldSelector, newSelector) {
        replaceSimpleSelectorsBy(doc, [oldSelector], function () {
            return newSelector;
        });
    };

    module.lowercaseCssTypeSelectors = function (doc, matchingTagNames) {
        replaceSimpleSelectorsBy(doc, matchingTagNames, function (match) {
            return match.toLowerCase();
        });
    };

    module.findHtmlOnlyNodeNames = function (doc) {
        var treeWalker = doc.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT),
            htmlNodeNames = {},
            nonHtmlNodeNames = {},
            currentTagName;

        while(treeWalker.nextNode()) {
            currentTagName = treeWalker.currentNode.tagName.toLowerCase();
            if (treeWalker.currentNode.namespaceURI === 'http://www.w3.org/1999/xhtml') {
                htmlNodeNames[currentTagName] = true;
            } else {
                nonHtmlNodeNames[currentTagName] = true;
            }
        }

        return Object.keys(htmlNodeNames).filter(function (tagName) {
            return !nonHtmlNodeNames[tagName];
        });
    };

    return module;
}());

var documentHelper = (function (documentUtil) {
    "use strict";

    var module = {};

    var asArray = function (arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };

    var cascadingAction = {
        active: true,
        hover: true,
        focus: false,
        target: false
    };

    module.fakeUserAction = function (doc, selector, action) {
        var elem = doc.querySelector(selector),
            pseudoClass = ':' + action,
            fakeActionClass = 'rasterizehtml' + action;
        if (! elem) {
            return;
        }

        if (cascadingAction[action]) {
            documentUtil.addClassNameRecursively(elem, fakeActionClass);
        } else {
            documentUtil.addClassName(elem, fakeActionClass);
        }
        documentUtil.rewriteCssSelectorWith(doc, pseudoClass, '.' + fakeActionClass);
    };

    module.persistInputValues = function (doc) {
        var inputs = doc.querySelectorAll('input'),
            textareas = doc.querySelectorAll('textarea'),
            isCheckable = function (input) {
                return input.type === 'checkbox' || input.type === 'radio';
            };

        asArray(inputs).filter(isCheckable)
            .forEach(function (input) {
                if (input.checked) {
                    input.setAttribute('checked', '');
                } else {
                    input.removeAttribute('checked');
                }
            });

        asArray(inputs).filter(function (input) { return !isCheckable(input); })
            .forEach(function (input) {
                input.setAttribute('value', input.value);
            });

        asArray(textareas)
            .forEach(function (textarea) {
                textarea.textContent = textarea.value;
            });
    };

    module.rewriteTagNameSelectorsToLowerCase = function (doc) {
        documentUtil.lowercaseCssTypeSelectors(doc, documentUtil.findHtmlOnlyNodeNames(doc));
    };

    return module;
}(documentUtil));

var mediaQueryHelper = (function (cssMediaQuery) {
    "use strict";

    var module = {};

    var svgImgBlueByEmMediaQuery = function () {
        var svg = '<svg id="svg" xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
                '<style>@media (max-width: 1em) { svg { background: #00f; } }</style>' +
                '</svg>';

        var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
            img = document.createElement('img');

        img.src = url;

        return img;
    };

    var firstPixelHasColor = function (img, r, g, b) {
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        var context = canvas.getContext("2d"),
            data;

        context.drawImage(img, 0, 0);
        data = context.getImageData(0, 0, 1, 1).data;
        return data[0] === r && data[1] === g && data[2] === b;
    };

    var hasEmMediaQueryIssue = function () {
        var img = svgImgBlueByEmMediaQuery(),
            defer = ayepromise.defer();

        document.querySelector('body').appendChild(img);

        img.onload = function () {
            document.querySelector('body').removeChild(img);
            try {
                defer.resolve(!firstPixelHasColor(img, 0, 0, 255));
            } catch (e) {
                // Fails in PhantomJS, let's assume the issue exists
                defer.resolve(true);
            }
        };
        img.onerror = function () {
            defer.reject();
        };

        return defer.promise;
    };

    var hasEmIssue;

    module.needsEmWorkaround = function () {
        if (hasEmIssue === undefined) {
            hasEmIssue = hasEmMediaQueryIssue();
        }
        return hasEmIssue;
    };

    var asArray = function (arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };

    var cssRulesToText = function (cssRules) {
        return asArray(cssRules).map(function (rule) {
            return rule.cssText;
        }).join('\n');
    };

    var mediaQueryRule = function (mediaQuery, cssRules) {
        return '@media ' + mediaQuery + '{' +
            cssRulesToText(cssRules) +
            '}';
    };

    var exchangeRuleWithNewContent = function (styleSheet, ruleIdx, newRuleText) {
        try {
            styleSheet.insertRule(newRuleText, ruleIdx+1);
        } catch (e) {
            // In case the browser does not like our new rule we just keep the existing one and quietly leave
            return;
        }
        styleSheet.deleteRule(ruleIdx);
    };

    var changeCssRule = function (rule, newRuleText) {
        var styleSheet = rule.parentStyleSheet,
            ruleIdx = asArray(styleSheet.cssRules).indexOf(rule);

        exchangeRuleWithNewContent(styleSheet, ruleIdx, newRuleText);
    };

    var rewriteStyleContent = function (styleElement) {
        styleElement.textContent = cssRulesToText(styleElement.sheet.cssRules);
    };

    var serializeExpression = function (exp) {
        var feature = exp.modifier ? exp.modifier + '-' + exp.feature : exp.feature;
        if (exp.value) {
            return '(' + feature + ': ' + exp.value + ')';
        } else {
            return '(' + feature + ')';
        }
    };

    var serializeQueryPart = function (q) {
        var segments = [];

        if (q.inverse) {
            segments.push("not");
        }

        segments.push(q.type);

        if (q.expressions.length > 0) {
            segments.push('and ' + q.expressions.map(serializeExpression).join(' and '));
        }

        return segments.join(' ');
    };

    // poor man's testability
    module.serializeQuery = function (q) {
        var queryParts = q.map(serializeQueryPart);
        return queryParts.join(', ');
    };

    var transformEmIntoPx = function (em) {
        return em * 16;
    };

    var replaceEmValueWithPx = function (value) {
        // Match a number with em unit. Doesn't match all, but should be enough for now
        var match = /^((?:\d+\.)?\d+)em/.exec(value);
        if (match) {
            return transformEmIntoPx(parseFloat(match[1])) + 'px';
        }
        return value;
    };

    var substituteEmWithPx = function (mediaQuery) {
        var parsedQuery = cssMediaQuery.parse(mediaQuery),
            hasChanges = false;

        parsedQuery.forEach(function (q) {
            q.expressions.forEach(function (exp) {
                var rewrittenValue = replaceEmValueWithPx(exp.value);

                hasChanges |= rewrittenValue !== exp.value;
                exp.value = rewrittenValue;
            });
        });

        if (hasChanges) {
            return module.serializeQuery(parsedQuery);
        }
    };

    var replaceEmsWithPx = function (mediaQueryRules) {
        var anyRuleHasChanges = false;

        mediaQueryRules.forEach(function (rule) {
            var rewrittenMediaQuery = substituteEmWithPx(rule.media.mediaText);

            if (rewrittenMediaQuery) {
                changeCssRule(rule, mediaQueryRule(rewrittenMediaQuery, rule.cssRules));
            }

            anyRuleHasChanges |= !!rewrittenMediaQuery;
        });

        return anyRuleHasChanges;
    };

    module.workAroundWebKitEmSizeIssue = function (document) {
        var styles = document.querySelectorAll('style');

        asArray(styles).forEach(function (style) {
            var mediaQueryRules = asArray(style.sheet.cssRules).filter(function (rule) {
                return rule.type === window.CSSRule.MEDIA_RULE;
            });

            var hasChanges = replaceEmsWithPx(mediaQueryRules);
            if (hasChanges) {
                rewriteStyleContent(style);
            }
        });
    };

    return module;
}(cssMediaQuery));

var browser = (function (util, proxies, ayepromise, sanedomparsererror, theWindow) {
    "use strict";

    var module = {};

    var createHiddenElement = function (doc, tagName, width, height) {
        var element = doc.createElement(tagName);
        // 'display: none' doesn't cut it, as browsers seem to be lazy loading CSS
        element.style.visibility = "hidden";
        element.style.width = width + "px";
        element.style.height = height + "px";
        element.style.position = "absolute";
        element.style.top = (-10000 - height) + "px";
        element.style.left = (-10000 - width) + "px";
        // We need to add the element to the document so that its content gets loaded
        doc.getElementsByTagName("body")[0].appendChild(element);
        return element;
    };

    module.executeJavascript = function (doc, options) {
        var iframe = createHiddenElement(theWindow.document, "iframe", options.width, options.height),
            html = doc.documentElement.outerHTML,
            iframeErrorsMessages = [],
            defer = ayepromise.defer(),
            timeout = options.executeJsTimeout || 0;

        var doResolve = function () {
            var doc = iframe.contentDocument;
            theWindow.document.getElementsByTagName("body")[0].removeChild(iframe);
            defer.resolve({
                document: doc,
                errors: iframeErrorsMessages
            });
        };

        var waitForJavaScriptToRun = function () {
            var d = ayepromise.defer();
            if (timeout > 0) {
                setTimeout(d.resolve, timeout);
            } else {
                d.resolve();
            }
            return d.promise;
        };

        iframe.onload = function () {
            waitForJavaScriptToRun()
                .then(finishNotifyXhrProxy.waitForRequestsToFinish)
                .then(doResolve);
        };

        var xhr = iframe.contentWindow.XMLHttpRequest,
            finishNotifyXhrProxy = proxies.finishNotifyingXhr(xhr),
            baseUrlXhrProxy = proxies.baseUrlRespectingXhr(finishNotifyXhrProxy, options.baseUrl);

        iframe.contentDocument.open();
        iframe.contentWindow.XMLHttpRequest = baseUrlXhrProxy;
        iframe.contentWindow.onerror = function (msg) {
            iframeErrorsMessages.push({
                resourceType: "scriptExecution",
                msg: msg
            });
        };

        iframe.contentDocument.write('<!DOCTYPE html>');
        iframe.contentDocument.write(html);
        iframe.contentDocument.close();

        return defer.promise;
    };

    var createHiddenSandboxedIFrame = function (doc, width, height) {
        var iframe = doc.createElement('iframe');
        iframe.style.width = width + "px";
        iframe.style.height = height + "px";
        // 'display: none' doesn't cut it, as browsers seem to be lazy loading content
        iframe.style.visibility = "hidden";
        iframe.style.position = "absolute";
        iframe.style.top = (-10000 - height) + "px";
        iframe.style.left = (-10000 - width) + "px";
        // Don't execute JS, all we need from sandboxing is access to the iframe's document
        iframe.sandbox = 'allow-same-origin';
        // Don't include a scrollbar on Linux
        iframe.scrolling = 'no';
        return iframe;
    };

    var createIframeWithSizeAtZoomLevel1 = function (width, height, zoom) {
        var scaledViewportWidth = Math.floor(width / zoom),
            scaledViewportHeight = Math.floor(height / zoom);

        return createHiddenSandboxedIFrame(theWindow.document, scaledViewportWidth, scaledViewportHeight);
    };

    var calculateZoomedContentSizeAndRoundUp = function (actualViewport, requestedWidth, requestedHeight, zoom) {
        return {
            width: Math.max(actualViewport.width * zoom, requestedWidth),
            height: Math.max(actualViewport.height * zoom, requestedHeight)
        };
    };

    var calculateContentSize = function (doc, selector, requestedWidth, requestedHeight, zoom) {
            // clientWidth/clientHeight needed for PhantomJS
        var actualViewportWidth = Math.max(doc.documentElement.scrollWidth, doc.body.clientWidth),
            actualViewportHeight = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, doc.body.clientHeight),
            top, left, originalWidth, originalHeight, rootFontSize,
            element, rect, contentSize;

        if (selector) {
            element = doc.querySelector(selector);

            if (!element) {
                throw {
                    message: "Clipping selector not found"
                };
            }

            rect = element.getBoundingClientRect();

            top = rect.top;
            left = rect.left;
            originalWidth = rect.width;
            originalHeight = rect.height;
        } else {
            top = 0;
            left = 0;
            originalWidth = actualViewportWidth;
            originalHeight = actualViewportHeight;
        }

        contentSize = calculateZoomedContentSizeAndRoundUp({
                width: originalWidth,
                height: originalHeight
            },
            requestedWidth,
            requestedHeight,
            zoom);

        rootFontSize = theWindow.getComputedStyle(doc.documentElement).fontSize;

        return {
            left: left,
            top: top,
            width: contentSize.width,
            height: contentSize.height,
            viewportWidth: actualViewportWidth,
            viewportHeight: actualViewportHeight,

            rootFontSize: rootFontSize
        };
    };

    module.calculateDocumentContentSize = function (doc, options) {
        var html = doc.documentElement.outerHTML,
            defer = ayepromise.defer(),
            zoom = options.zoom || 1,
            iframe;


        iframe = createIframeWithSizeAtZoomLevel1(options.width, options.height, zoom);
        // We need to add the element to the document so that its content gets loaded
        theWindow.document.getElementsByTagName("body")[0].appendChild(iframe);

        iframe.onload = function () {
            var doc = iframe.contentDocument,
                size;

            try {
                size = calculateContentSize(doc, options.clip, options.width, options.height, zoom);

                defer.resolve(size);
            } catch (e) {
                defer.reject(e);
            } finally {
                theWindow.document.getElementsByTagName("body")[0].removeChild(iframe);
            }
        };

        // srcdoc doesn't work in PhantomJS yet
        iframe.contentDocument.open();
        iframe.contentDocument.write('<!DOCTYPE html>');
        iframe.contentDocument.write(html);
        iframe.contentDocument.close();

        return defer.promise;
    };

    var addHTMLTagAttributes = function (doc, html) {
        var attributeMatch = /<html((?:\s+[^>]*)?)>/im.exec(html),
            helperDoc = theWindow.document.implementation.createHTMLDocument(''),
            htmlTagSubstitute,
            i, elementSubstitute, attribute;

        if (!attributeMatch) {
            return;
        }

        htmlTagSubstitute = '<div' + attributeMatch[1] + '></div>';
        helperDoc.documentElement.innerHTML = htmlTagSubstitute;
        elementSubstitute = helperDoc.querySelector('div');

        for (i = 0; i < elementSubstitute.attributes.length; i++) {
            attribute = elementSubstitute.attributes[i];
            doc.documentElement.setAttribute(attribute.name, attribute.value);
        }
    };

    module.parseHTML = function (html) {
        // We should be using the DOMParser, but it is not supported in older browsers
        var doc = theWindow.document.implementation.createHTMLDocument('');
        doc.documentElement.innerHTML = html;

        addHTMLTagAttributes(doc, html);
        return doc;
    };

    var failOnInvalidSource = function (doc) {
        try {
            return sanedomparsererror.failOnParseError(doc);
        } catch (e) {
            throw {
                message: "Invalid source",
                originalError: e
            };
        }
    };

    module.validateXHTML = function (xhtml) {
        var p = new DOMParser(),
            doc = p.parseFromString(xhtml, "application/xml");

        failOnInvalidSource(doc);
    };

    var lastCacheDate = null;

    var getUncachableURL = function (url, cache) {
        if (cache === 'none' || cache === 'repeated') {
            if (lastCacheDate === null || cache !== 'repeated') {
                lastCacheDate = Date.now();
            }
            return url + "?_=" + lastCacheDate;
        } else {
            return url;
        }
    };

    var doDocumentLoad = function (url, options) {
        var xhr = new window.XMLHttpRequest(),
            joinedUrl = util.joinUrl(options.baseUrl, url),
            augmentedUrl = getUncachableURL(joinedUrl, options.cache),
            defer = ayepromise.defer(),
            doReject = function (e) {
                defer.reject({
                    message: "Unable to load page",
                    originalError: e
                });
            };

        xhr.addEventListener("load", function () {
            if (xhr.status === 200 || xhr.status === 0) {
                defer.resolve(xhr.responseXML);
            } else {
                doReject(xhr.statusText);
            }
        }, false);

        xhr.addEventListener("error", function (e) {
            doReject(e);
        }, false);

        try {
            xhr.open('GET', augmentedUrl, true);
            xhr.responseType = "document";
            xhr.send(null);
        } catch (e) {
            doReject(e);
        }

        return defer.promise;
    };

    module.loadDocument = function (url, options) {
        return doDocumentLoad(url, options)
            .then(function (doc) {
                return failOnInvalidSource(doc);
            });
    };

    return module;
}(util, proxies, ayepromise, sanedomparsererror, window));

var svg2image = (function (ayepromise, window) {
    "use strict";

    var module = {};

    var urlForSvg = function (svg, useBlobs) {
        if (useBlobs) {
            return URL.createObjectURL(new Blob([svg], {"type": "image/svg+xml"}));
        } else {
            return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        }
    };

    var cleanUpUrl = function (url) {
        if (url instanceof Blob) {
            URL.revokeObjectURL(url);
        }
    };

    var simpleForeignObjectSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><foreignObject></foreignObject></svg>';

    var supportsReadingObjectFromCanvas = function (url) {
        var canvas = document.createElement("canvas"),
            image = new Image(),
            defer = ayepromise.defer();

        image.onload = function () {
            var context = canvas.getContext("2d");
            try {
                context.drawImage(image, 0, 0);
                // This will fail in Chrome & Safari
                canvas.toDataURL("image/png");
                defer.resolve(true);
            } catch (e) {
                defer.resolve(false);
            }
        };
        image.onerror = defer.reject;
        image.src = url;

        return defer.promise;
    };

    var readingBackFromCanvasBenefitsFromOldSchoolDataUris = function () {
        // Check for work around for https://code.google.com/p/chromium/issues/detail?id=294129
        var blobUrl = urlForSvg(simpleForeignObjectSvg, true);
        return supportsReadingObjectFromCanvas(blobUrl)
            .then(function (supportsReadingFromBlobs) {
                cleanUpUrl(blobUrl);
                if (supportsReadingFromBlobs) {
                    return false;
                }
                return supportsReadingObjectFromCanvas(urlForSvg(simpleForeignObjectSvg, false))
                    .then(function (s) {
                        return s;
                    });
            }, function () {
                return false;
            });
    };

    var supportsBlobBuilding = function () {
        if (window.Blob) {
            // Available as constructor only in newer builds for all browsers
            try {
                new Blob(['<b></b>'], { "type" : "text/xml" });
                return true;
            } catch (err) {}
        }
        return false;
    };

    var checkBlobSupport = function () {
        var defer = ayepromise.defer();

        if (supportsBlobBuilding && window.URL) {
            readingBackFromCanvasBenefitsFromOldSchoolDataUris()
                .then(function (doesBenefit) {
                    defer.resolve(! doesBenefit);
                }, function () {
                    defer.reject();
                });
        } else {
            defer.resolve(false);
        }

        return defer.promise;
    };

    var checkForBlobsResult;

    var checkForBlobs = function () {
        if (checkForBlobsResult === undefined) {
            checkForBlobsResult = checkBlobSupport();
        }

        return checkForBlobsResult;
    };

    var buildImageUrl = function (svg) {
        return checkForBlobs().then(function (useBlobs) {
            return urlForSvg(svg, useBlobs);
        });
    };

    module.renderSvg = function (svg) {
        var url, image,
            defer = ayepromise.defer(),
            resetEventHandlers = function () {
                image.onload = null;
                image.onerror = null;
            },
            cleanUp = function () {
                if (url) {
                    cleanUpUrl(url);
                }
            };

        image = new Image();
        image.onload = function() {
            resetEventHandlers();
            cleanUp();

            defer.resolve(image);
        };
        image.onerror = function () {
            cleanUp();

            // Webkit calls the onerror handler if the SVG is faulty
            defer.reject();
        };

        buildImageUrl(svg).then(function (imageUrl) {
            url = imageUrl;
            image.src = url;
        }, defer.reject);

        return defer.promise;
    };

    return module;
}(ayepromise, window));

var document2svg = (function (util, browser, documentHelper, mediaQueryHelper, xmlserializer) {
    "use strict";

    var module = {};

    var svgAttributes = function (size, zoom) {
        var zoomFactor = zoom || 1;

        var attributes = {
            width: size.width,
            height: size.height,
            'font-size': size.rootFontSize
        };

        if (zoomFactor !== 1) {
            attributes.style = 'transform:scale(' + zoomFactor + '); transform-origin: 0 0;';
        }

        return attributes;
    };

    var foreignObjectAttributes = function (size) {
        var closestScaledWith, closestScaledHeight,
            offsetX, offsetY;

        closestScaledWith = Math.round(size.viewportWidth);
        closestScaledHeight = Math.round(size.viewportHeight);

        offsetX = -size.left;
        offsetY = -size.top;

        var attributes = {
             'x': offsetX,
             'y': offsetY,
             'width': closestScaledWith,
             'height': closestScaledHeight
        };

        return attributes;
    };

    var workAroundCollapsingMarginsAcrossSVGElementInWebKitLike = function (attributes) {
        var style = attributes.style || '';
        attributes.style = style + 'float: left;';
    };

    var workAroundSafariSometimesNotShowingExternalResources = function (attributes) {
        /* Let's hope that works some magic. The spec says SVGLoad only fires
         * now when all externals are available.
         * http://www.w3.org/TR/SVG/struct.html#ExternalResourcesRequired */
        attributes.externalResourcesRequired = true;
    };

    var workAroundChromeShowingScrollbarsUnderLinuxIfHtmlIsOverflowScroll = function () {
        return '<style scoped="">html::-webkit-scrollbar { display: none; }</style>';
    };

    var serializeAttributes = function (attributes) {
        var keys = Object.keys(attributes);
        if (!keys.length) {
            return '';
        }

        return ' ' + keys.map(function (key) {
            return key + '="' + attributes[key] + '"';
        }).join(' ');
    };

    var convertDocumentToSvg = function (doc, size, zoomFactor) {
        var xhtml = xmlserializer.serializeToString(doc);

        browser.validateXHTML(xhtml);

        var foreignObjectAttrs = foreignObjectAttributes(size);
        workAroundCollapsingMarginsAcrossSVGElementInWebKitLike(foreignObjectAttrs);
        workAroundSafariSometimesNotShowingExternalResources(foreignObjectAttrs);

        return (
            '<svg xmlns="http://www.w3.org/2000/svg"' +
                serializeAttributes(svgAttributes(size, zoomFactor)) +
                '>' +
                workAroundChromeShowingScrollbarsUnderLinuxIfHtmlIsOverflowScroll() +
                '<foreignObject' + serializeAttributes(foreignObjectAttrs) + '>' +
                xhtml +
                '</foreignObject>' +
                '</svg>'
        );
    };

    module.getSvgForDocument = function (doc, size, zoomFactor) {
        documentHelper.rewriteTagNameSelectorsToLowerCase(doc);

        return mediaQueryHelper.needsEmWorkaround().then(function (needsWorkaround) {
            if (needsWorkaround) {
                mediaQueryHelper.workAroundWebKitEmSizeIssue(doc);
            }

            return convertDocumentToSvg(doc, size, zoomFactor);
        });
    };

    module.drawDocumentAsSvg = function (doc, options) {
        ['hover', 'active', 'focus', 'target'].forEach(function (action) {
            if (options[action]) {
                documentHelper.fakeUserAction(doc, options[action], action);
            }
        });

        return browser.calculateDocumentContentSize(doc, options)
            .then(function (size) {
                return module.getSvgForDocument(doc, size, options.zoom);
            });
    };

    return module;
}(util, browser, documentHelper, mediaQueryHelper, xmlserializer));

var rasterize = (function (util, browser, documentHelper, document2svg, svg2image, inlineresources) {
    "use strict";

    var module = {};

    var generalDrawError = function (e) {
        return {
            message: "Error rendering page",
            originalError: e
        };
    };

    var drawSvgAsImg = function (svg) {
        return svg2image.renderSvg(svg)
            .then(function (image) {
                return {
                    image: image,
                    svg: svg
                };
            }, function (e) {
                throw generalDrawError(e);
            });
    };

    var drawImageOnCanvas = function (image, canvas) {
        try {
            canvas.getContext("2d").drawImage(image, 0, 0);
        } catch (e) {
            // Firefox throws a 'NS_ERROR_NOT_AVAILABLE' if the SVG is faulty
            throw generalDrawError(e);
        }
    };

    var doDraw = function (doc, canvas, options) {
        return document2svg.drawDocumentAsSvg(doc, options)
            .then(drawSvgAsImg)
            .then(function (result) {
                if (canvas) {
                    drawImageOnCanvas(result.image, canvas);
                }

                return result;
            });
    };

    var operateJavaScriptOnDocument = function (doc, options) {
        return browser.executeJavascript(doc, options)
            .then(function (result) {
                var document = result.document;
                documentHelper.persistInputValues(document);

                return {
                    document: document,
                    errors: result.errors
                };
            });
    };

    module.rasterize = function (doc, canvas, options) {
        var inlineOptions;

        inlineOptions = util.clone(options);
        inlineOptions.inlineScripts = options.executeJs === true;

        return inlineresources.inlineReferences(doc, inlineOptions)
            .then(function (errors) {
                if (options.executeJs) {
                    return operateJavaScriptOnDocument(doc, options)
                        .then(function (result) {
                            return {
                                document: result.document,
                                errors: errors.concat(result.errors)
                            };
                        });
                } else {
                    return {
                        document: doc,
                        errors: errors
                    };
                }
            }).then(function (result) {
                return doDraw(result.document, canvas, options)
                    .then(function (drawResult) {
                        return {
                            image: drawResult.image,
                            svg: drawResult.svg,
                            errors: result.errors
                        };
                    });
            });
    };

    return module;
}(util, browser, documentHelper, document2svg, svg2image, inlineresources));

var rasterizeHTML = (function (util, browser, rasterize) {
    "use strict";

    var module = {};

    var getViewportSize = function (canvas, options) {
        var defaultWidth = 300,
            defaultHeight = 200,
            fallbackWidth = canvas ? canvas.width : defaultWidth,
            fallbackHeight = canvas ? canvas.height : defaultHeight,
            width = options.width !== undefined ? options.width : fallbackWidth,
            height = options.height !== undefined ? options.height : fallbackHeight;

        return {
            width: width,
            height: height
        };
    };

    var constructOptions = function (params) {
        var viewport = getViewportSize(params.canvas, params.options),
            options;

        options = util.clone(params.options);
        options.width = viewport.width;
        options.height = viewport.height;

        return options;
    };

    /**
     * Draws a Document to the canvas.
     * rasterizeHTML.drawDocument( document [, canvas] [, options] ).then(function (result) { ... });
     */
    module.drawDocument = function () {
        var doc = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = util.parseOptionalParameters(optionalArguments);

        return rasterize.rasterize(doc, params.canvas, constructOptions(params));
    };

    var drawHTML = function (html, canvas, options) {
        var doc = browser.parseHTML(html);

        return module.drawDocument(doc, canvas, options);
    };

    /**
     * Draws a HTML string to the canvas.
     * rasterizeHTML.drawHTML( html [, canvas] [, options] ).then(function (result) { ... });
     */
    module.drawHTML = function () {
        var html = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = util.parseOptionalParameters(optionalArguments);

        return drawHTML(html, params.canvas, params.options);
    };

    // work around https://bugzilla.mozilla.org/show_bug.cgi?id=925493
    var workAroundFirefoxNotLoadingStylesheetStyles = function (doc, url, options) {
        var d = document.implementation.createHTMLDocument('');
        d.replaceChild(doc.documentElement, d.documentElement);

        var extendedOptions = options ? util.clone(options) : {};

        if (!options.baseUrl) {
            extendedOptions.baseUrl = url;
        }

        return {
            document: d,
            options: extendedOptions
        };
    };

    var drawURL = function (url, canvas, options) {
        return browser.loadDocument(url, options)
            .then(function (doc) {
                var workaround = workAroundFirefoxNotLoadingStylesheetStyles(doc, url, options);
                return module.drawDocument(workaround.document, canvas, workaround.options);
            });
    };

    /**
     * Draws a page to the canvas.
     * rasterizeHTML.drawURL( url [, canvas] [, options] ).then(function (result) { ... });
     */
    module.drawURL = function () {
        var url = arguments[0],
            optionalArguments = Array.prototype.slice.call(arguments, 1),
            params = util.parseOptionalParameters(optionalArguments);

        return drawURL(url, params.canvas, params.options);
    };

    return module;
}(util, browser, rasterize));

return rasterizeHTML;

}));

},{"ayepromise":2,"css-mediaquery":10,"inlineresources":37,"sane-domparser-error":47,"url":48,"xmlserializer":49}],47:[function(require,module,exports){
'use strict';

var innerXML = function (node) {
    var s = new XMLSerializer();
    return Array.prototype.map.call(node.childNodes, function (node) {
        return s.serializeToString(node);
    }).join('');
};

var getParseError = function (doc) {
    // Firefox
    if (doc.documentElement.tagName === 'parsererror' &&
        doc.documentElement.namespaceURI === 'http://www.mozilla.org/newlayout/xml/parsererror.xml') {
        return doc.documentElement;
    }

    // Chrome, Safari
    if ((doc.documentElement.tagName === 'xml' || doc.documentElement.tagName === 'html') &&
        doc.documentElement.childNodes &&
        doc.documentElement.childNodes.length > 0 &&
        doc.documentElement.childNodes[0].nodeName === 'parsererror') {
        return doc.documentElement.childNodes[0];
    }

    // PhantomJS
    if (doc.documentElement.tagName === 'html' &&
        doc.documentElement.childNodes &&
        doc.documentElement.childNodes.length > 0 &&
        doc.documentElement.childNodes[0].nodeName === 'body' &&
        doc.documentElement.childNodes[0].childNodes &&
        doc.documentElement.childNodes[0].childNodes.length &&
        doc.documentElement.childNodes[0].childNodes[0].nodeName === 'parsererror') {
        return doc.documentElement.childNodes[0].childNodes[0];
    }

    return undefined;
};

var errorMessagePatterns = [
    // Chrome, Safari, PhantomJS
    new RegExp('^<h3[^>]*>This page contains the following errors:<\/h3><div[^>]*>(.+?)\n?<\/div>'),
    // Firefox
    new RegExp('^(.+)\n')
];

var extractParseError = function (errorNode) {
    var content = innerXML(errorNode);
    var i, match;

    for(i = 0; i < errorMessagePatterns.length; i++) {
        match = errorMessagePatterns[i].exec(content);

        if (match) {
            return match[1];
        }
    }
    return undefined;
};

var failOnParseError = function (doc) {
    var errorMessage;

    if (doc === null) {
        throw new Error('Parse error');
    }

    var parseError = getParseError(doc);
    if (parseError !== undefined) {
        errorMessage = extractParseError(parseError) || 'Parse error';
        throw new Error(errorMessage);
    }
};

exports.failOnParseError = function (doc) {
    failOnParseError(doc);

    return doc;
};

},{}],48:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":42,"querystring":45}],49:[function(require,module,exports){
var removeInvalidCharacters = function (content) {
    // See http://www.w3.org/TR/xml/#NT-Char for valid XML 1.0 characters
    return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
};

var serializeAttributeValue = function (value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

var serializeTextContent = function (content) {
    return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

var serializeAttribute = function (attr) {
    var value = attr.value;

    return ' ' + attr.name + '="' + serializeAttributeValue(value) + '"';
};

var getTagName = function (node) {
    var tagName = node.tagName;

    // Aid in serializing of original HTML documents
    if (node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
        tagName = tagName.toLowerCase();
    }
    return tagName;
};

var serializeNamespace = function (node) {
    var nodeHasXmlnsAttr = Array.prototype.map.call(node.attributes || node.attrs, function (attr) {
            return attr.name;
        })
        .indexOf('xmlns') >= 0;
    // Serialize the namespace as an xmlns attribute whenever the element
    // doesn't already have one and the inherited namespace does not match
    // the element's namespace.
    // As a special case, always include an xmlns for html elements, in case
    // of broken namespaceURI handling by browsers.
    if (!nodeHasXmlnsAttr &&
            (!node.parentNode ||
             node.namespaceURI !== node.parentNode.namespaceURI ||
             getTagName(node) === 'html')) {
         return ' xmlns="' + node.namespaceURI + '"';
    } else {
        return '';
    }
};

var serializeChildren = function (node) {
    return Array.prototype.map.call(node.childNodes, function (childNode) {
        return nodeTreeToXHTML(childNode);
    }).join('');
};

var serializeTag = function (node) {
    var output = '<' + getTagName(node);
    output += serializeNamespace(node);

    Array.prototype.forEach.call(node.attributes || node.attrs, function (attr) {
        output += serializeAttribute(attr);
    });

    if (node.childNodes.length > 0) {
        output += '>';
        output += serializeChildren(node);
        output += '</' + getTagName(node) + '>';
    } else {
        output += '/>';
    }
    return output;
};

var serializeText = function (node) {
    var text = node.nodeValue || node.value || '';
    return serializeTextContent(text);
};

var serializeComment = function (node) {
    return '<!--' +
        node.data
            .replace(/-/g, '&#45;') +
        '-->';
};

var serializeCDATA = function (node) {
    return '<![CDATA[' + node.nodeValue + ']]>';
};

var nodeTreeToXHTML = function (node) {
    if (node.nodeName === '#document' ||
        node.nodeName === '#document-fragment') {
        return serializeChildren(node);
    } else {
        if (node.tagName) {
            return serializeTag(node);
        } else if (node.nodeName === '#text') {
            return serializeText(node);
        } else if (node.nodeName === '#comment') {
            return serializeComment(node);
        } else if (node.nodeName === '#cdata-section') {
            return serializeCDATA(node);
        }
    }
};

exports.serializeToString = function (document) {
    return removeInvalidCharacters(nodeTreeToXHTML(document));
};

},{}],50:[function(require,module,exports){

var helpers = require('./helpers');
var Snapshot = require('./snapshot');
var dataTree = require('data-tree');
var Changes = require('./changes');

module.exports = (function(){

  // Flag bad practises
  'use strict';

  // --------------------------------
  // Action
  // --------------------------------

  var Action = function(playCallback){

    this._playCallback = playCallback;
    this._doneCallback = null;

  };

  Action.prototype.done = function(callback){
    if(arguments.length > 0){
      this._doneCallback = callback;
    } else if(this._doneCallback){
      this._doneCallback();
    }
  };

  Action.prototype.play = function(currentChanges, parentInSub, parentInMaster){
    if(this._playCallback) this._playCallback(currentChanges, parentInSub, parentInMaster);
  };

  // --------------------------------
  // Export
  // --------------------------------

  return Action;

}());

},{"./changes":51,"./helpers":66,"./snapshot":71,"data-tree":29}],51:[function(require,module,exports){

var helpers = require('./helpers');
var rasterizeHTML = require('rasterizehtml');
var clone = require('clone');
var Action = require('./action');

module.exports = (function(){

  // Flag bad practises
  'use strict';

  // --------------------------------
  // Changes
  // --------------------------------

  /**
   * Represents the changes captured in visualization at particular moment
   *
   * @class
   * @kind class
   * @constructor
   * @param {object} subTrail - sub trail to which changes belongs
   * @param {object | array | string | number | null} data - data that was changed
   */
  var Changes = function(subTrail, data){

    /**
     * Auto-generated alphanumeric id that uniqely identifies the change.
     *
     * @property _id
     * @type {string}
     */
    this._id = helpers.guid();

    /**
     * {@link SubTrail} to which this changes are associated.
     *
     * @property _subTrail
     * @type {object}
     * @default "null"
     */
    this._subTrail = subTrail;

    /**
     * Data that was recorded as change.
     *
     * @property _data
     * @type {object | array | number | string | null}
     * @default "null"
     */
    this._data = clone(data);

    /**
     * Data that represents a checkpoint state
     *
     * @property _checkpointData
     * @type {object | array | number | string | null}
     * @default "null"
     */
    this._checkpointData = null;

    /**
     * Should use as a checkpoint
     *
     * @property _useAsCheckpoint
     * @type {boolean}
     * @default "false"
     */
    this._useAsCheckpoint = false;

    /**
     * Timestamp at which changes were recorded.
     *
     * @property _recordedAt
     * @type {string}
     * @default "timestamp"
     */
    this._recordedAt = new Date().getTime();

    /**
     * Thumbnail captured.
     *
     * @property _thumbnail
     * @type {string}
     * @default "null"
     */
    this._thumbnail = null;

    /**
     * Level of snapshot in a sub-trail tree
     *
     * @property _level
     * @type {number}
     * @default -1
     */
    this._levelInSubTrail = -1;

  /**
   * Level of snapshot in a master-trail tree
   *
   * @property _level
   * @type {number}
   * @default -1
   */
  this._levelInMasterTrail = -1;

  /**
   * Node that encapsulates change in master trail
   *
   * @property _nodeInMasterTrail
   * @type {object}
   * @default "null"
   */
  this._nodeInMasterTrail = null;

  /**
   * Node that encapsulates change in sub trail
   *
   * @property _nodeInSubTrail
   * @type {object}
   * @default "null"
   */
  this._nodeInSubTrail = null;

  /**
   * Forward action callback
   *
   * @property _forwardActionCallback
   * @type {function}
   * @default null
   */
   this._forwardAction = null;

   /**
    * Inverse action callback
    *
    * @property _inverseActionCallback
    * @type {function}
    * @default null
    */
    this._inverseAction = null;

    /**
     * Action Done Callback
     *
     * @property _actionDoneCallback
     * @type {function}
     * @default "null"
     */
    this._actionDoneCallback = null;

  };

  // --------------------------------
  // Getters and Setters
  // --------------------------------

  /**
   * Sets or gets the id
   *
   * @method id
   * @kind member
   * @param {string} id - id of the change
   */
  Changes.prototype.id = function(id){
    if(arguments.length > 0){
      this._id = id;
      return this;
    } else {
      return this._id;
    }
  };

  /**
   * Sub Trail to which changes belongs
   *
   * @method subTrail
   * @kind member
   * @param {string} id - id of the change
   */
  Changes.prototype.subTrail = function(){
    return this._subTrail;
  };

  /**
   * Sets or gets the data.
   *
   * @method data
   * @kind member
   * @param {object | array | string | number | null } data - data that has to be recorded.
   */
  Changes.prototype.data = function(data){
    if(arguments.length > 0){
      this._data = clone(data);
      return this;
    } else {
      return this._data;
    }
  };

  /**
   * Returns a checkpoint data
   *
   * @method data
   * @kind member
   */
  Changes.prototype.checkpointData = function(){
    return this._checkpointData;
  };

  /**
   * Sets or gets the timestamp at which changes were recorded.
   *
   * @method recordedAt
   * @kind member
   * @param {number} timestamp - time at which changes were recorded
   */
  Changes.prototype.recordedAt = function(timestamp){
    if(arguments.length > 0){
      this._recordedAt = timestamp;
      return this;
    } else {
      return this._recordedAt;
    }
  };

  /**
   * Sets or gets the thumbnail
   *
   * @method thumbnail
   * @kind member
   * @param {string} thumbnail - base64 representation of thumbnail
   */
  Changes.prototype.thumbnail = function(thumbnail){
    if(arguments.length > 0){
      this._thumbnail = thumbnail;
      return this;
    } else {
      return this._thumbnail;
    }
  };

  /**
   * Gets the level in Master Trail
   *
   * @method levelInMasterTrail
   * @kind member
   * @return {number} level - level in master trail
   */
  Changes.prototype.levelInMasterTrail = function(){
    return this._levelInMasterTrail;
  };

  /**
   * Gets the level in Sub Trail
   *
   * @method levelInSubTrail
   * @kind member
   * @return {number} level - level in sub trail
   */
  Changes.prototype.levelInSubTrail = function(){
    return this._levelInSubTrail;
  };

  /**
   * Gets the node that encapsulates changes in master trail
   *
   * @method nodeInMasterTrail
   * @kind member
   * @return {object} node - node in master trail
   */
  Changes.prototype.nodeInMasterTrail = function(){
    return this._nodeInMasterTrail;
  };

  /**
   * Gets the node that encapsulates changes in sub trail
   *
   * @method nodeInSubTrail
   * @kind member
   * @return {object} node - node in sub trail
   */
  Changes.prototype.nodeInSubTrail = function(){
    return this._nodeInSubTrail;
  };

  /**
   * Sets the forward action
   *
   * @method setForwardAction
   * @kind member
   * @param {function} callback - callback that implements forward action
   */
  Changes.prototype.setForwardAction = function(callback){
    if(callback && typeof callback === 'function'){
      this._forwardAction = new Action(callback);
      return this._forwardAction;
    }
  };

  /**
   * Sets the inverse action
   *
   * @method setInverseAction
   * @kind member
   * @param {function} callback - callback that implements inverse action
   */
  Changes.prototype.setInverseAction = function(callback){
    if(callback && typeof callback === 'function'){
      this._inverseAction = new Action(callback);
      return this._inverseAction;
    }
  };

  /**
   * Checks if node is checkpoint
   *
   * @method isCheckpoint
   * @kind member
   */
  Changes.prototype.isCheckpoint = function(){
    return this._useAsCheckpoint;
  };

  // --------------------------------
  // Methods
  // --------------------------------

  /**
   * Captures a thumbnail of given captureArea
   *
   * @method captureThumbnail
   * @kind member
   * @param {string} captureArea - query selector which has to rendered as thumbnail.
   * @param {number} delay - delay in milliseconds after which thumbnail should be captured.
   * @param {function} callback - gets triggered when snapshot finishes rendering thumbnail.
   */
    Changes.prototype.captureThumbnail = function(element, delay){

      // Hold `this`
      var thiss = this;

      // Capture
      if(element && typeof element === 'string'){
        setTimeout(function(){
          rasterize(thiss, element, function(imageBase64){
            thiss.subTrail()._events.onThumbnailCaptured.forEach(function(handler){
              handler(thiss);
            });
          });
        }, delay && typeof delay === 'number' ? delay : 0);
      }

    };

    /**
     * Invert the changes
     *
     * @method inverse
     * @kind member
     */
    Changes.prototype.inverse = function(){

      console.log("Inverse", this);

      // Get Parents from Master and Sub Tree
      var parentInMaster = this.nodeInMasterTrail()._parentNode ? this.nodeInMasterTrail()._parentNode._data.changes : null;
      var parentInSub = this.nodeInSubTrail()._parentNode ? this.nodeInSubTrail()._parentNode._data.changes : null;

      // Call Inverse
      if(this._inverseAction){
        this._inverseAction.play(this, parentInSub, parentInMaster);
      }

      // Update Current Node
      if(this.nodeInSubTrail()._parentNode) this.subTrail()._currentVersionNode = this.nodeInSubTrail()._parentNode;

      return this._inverseAction;

    };

    /**
     * Forward the changes
     *
     * @method forward
     * @kind member
     */
    Changes.prototype.forward = function(){

      console.log("Forward", this);

      // Get Childs From Master and Sub Trail
      var lastChildInMaster = this.nodeInMasterTrail()._childNodes.length ? this.nodeInMasterTrail()._childNodes[ this.nodeInMasterTrail()._childNodes.length -1 ]._data.changes : null;
      var lastChildInSub = this.nodeInSubTrail()._childNodes.length ? this.nodeInSubTrail()._childNodes[ this.nodeInSubTrail()._childNodes.length -1 ]._data.changes : null;

      // Call Forward
      if(this._forwardAction){
        this._forwardAction.play(this);
      }

      // Update Current Node
      if(lastChildInMaster && lastChildInMaster === lastChildInSub) this.subTrail()._currentVersionNode = this.nodeInSubTrail()._childNodes[ this.nodeInSubTrail()._childNodes.length -1 ];

      return this._forwardAction;

    };

    /**
     * dones the action
     *
     * @method done
     * @kind member
     */
    Changes.prototype.done = function(){
      if(this._actionDoneCallback){
        this._actionDoneCallback();
      } return this;
    };


  // --------------------------------
  // Private Methods
  // --------------------------------

  var rasterize = function(thiss, element, callback){

    // If required arguments are passed
    if(arguments.length > 0){

      // Check If rasterizeHTML is included
      if(!rasterizeHTML || rasterizeHTML === 'undefined'){
        if(callback) callback(null);
        return;
      }

      if(!document.querySelector(element)){
        if(callback) callback(null);
        return;
      }

      // Clone and Hold current document
      var currentDocument = document;
      var clonnedDocument = currentDocument.cloneNode(true);

      // Get Body and HTML
      var body = currentDocument.body,
          html = currentDocument.documentElement;

      // Compute Max Height
      var maxHeight = Math.max(body.scrollHeight, body.offsetHeight,
      html.clientHeight, html.scrollHeight, html.offsetHeight);

      // Compute Max Width
      var maxWidth = Math.max(body.scrollWidth, body.offsetWidth,
      html.clientWidth, html.scrollWidth, html.offsetWidth);

      // Create temporary canvas element
      var canvas = clonnedDocument.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      canvas.id = "ra-canvas";

      // Modify Context of Canvas
      var context = canvas.getContext("2d");
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Rasterize the entire document
      var elementDOM = currentDocument.querySelector(element);

      // Size and Offsets
      var height = Math.max(elementDOM.clientHeight, elementDOM.scrollHeight),
          width = Math.max(elementDOM.clientWidth, elementDOM.scrollWidth),
          topOffset = elementDOM.offsetTop,
          leftOffset = elementDOM.offsetLeft;

      // Draw rasterized document
      rasterizeHTML.drawDocument(clonnedDocument, canvas).then(function(renderResult) {

        // Get Canvas context
        var ctx = canvas.getContext("2d");

        // Get Image Data
        var imageData = ctx.getImageData(leftOffset, topOffset, width, height);

        // Clear Canvas Rect
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Resize Canvas
        canvas.width = width;
        canvas.height = height;

        // Put cropped data back
        ctx.putImageData(imageData, 0, 0);

        // Get base64
        var imageBase64 = canvas.toDataURL("image/png", 1.0);

        // Save Thumbnail
        thiss.thumbnail(imageBase64);

        // Send result back
        if(callback) callback(imageBase64);

      });

    }

  };

  // --------------------------------
  // Export
  // --------------------------------

  return Changes;

}());

},{"./action":50,"./helpers":66,"clone":6,"rasterizehtml":46}],52:[function(require,module,exports){

var Rule = require('./rule');

module.exports = (function(){

  // Flag bad practises
 'use strict';

  // --------------------------------
  // Checkpoint Manager
  // --------------------------------

  var CheckpointManager = function(){

  /**
   * Rules for checkpointing.
   *
   * @property _rules
   * @type {array}
   * @default "[]"
   */
    this._rules = [];

    //
    this._setCheckpointCallback = null;
    this._getCheckpointCallback = null;

  };

  // --------------------------------
  // Getters and Setters
  // --------------------------------

  /**
   * Gets the rules added for checkpointing
   *
   * @method rules
   * @kind member
   * @return {array} - array of rules added for checkpointing
   */
  CheckpointManager.prototype.rules = function(){
    return this._rules;
  };

  // --------------------------------
  // Methods
  // --------------------------------

  /**
   * Adds a checkpointing rule
   *
   * @method addRule
   * @kind member
   * @return {function} - function defining rule for checkpointing
   */
  CheckpointManager.prototype.addRule = function(rule){
    if(rule && typeof rule === 'function'){
      return this._rules[this._rules.push(new Rule(rule)) - 1];
    }
  };

  /**
   * Adds multiple checkpointing rules.
   *
   * @method addRules
   * @kind member
   * @return {array} - array of functions defining rule for checkpointing
   */
  CheckpointManager.prototype.addRules = function(rules){
    var thiss = this;
    if(rules && Array.isArray(rules)){
      rules.forEach(function(rule){
        thiss.addRule(rule);
      });
    } return this;
  };

  /**
   * Apply all rules to given changes
   *
   * @method applyRules
   * @kind member
   * @param {object} snapshot - snapshot that is captured
   */
  CheckpointManager.prototype.applyRulesTo = function(changes){
    var thiss = this;
    this.rules().forEach(function(rule){
      if(rule.play(changes)){
        changes._useAsCheckpoint = true;
      }
    });
  };

  /**
   * Sets a checkpoint function
   *
   * @method setCheckpointFunc
   * @kind member
   * @param {function} callback - callback function that gets the checkpoint data
   */
  CheckpointManager.prototype.setCheckpointFunc = function(callback){
    this._setCheckpointCallback = callback;
  };

  /**
   * Sets a checkpoint function
   *
   * @method setCheckpointFunc
   * @kind member
   * @param {function} callback - callback function that gets the checkpoint data
   */
  CheckpointManager.prototype.getCheckpointFunc = function(callback){
    this._getCheckpointCallback = callback;
  };

  /**
   * Gets a checkpoint
   *
   * @method getCheckpointData
   * @kind member
   */
  CheckpointManager.prototype.getCheckpointData = function(callback){
    if(this._setCheckpointCallback) return this._setCheckpointCallback();
  };

  /**
   * Loads a
   *
   * @method getCheckpointData
   * @kind member
   */
  CheckpointManager.prototype.setCheckpointData = function(data){
    if(this._getCheckpointCallback) return this._getCheckpointCallback(data);
  };

  // --------------------------------
  // Export
  // --------------------------------

  return CheckpointManager;

}());

},{"./rule":54}],53:[function(require,module,exports){

var CheckpointManager = require('./checkpointManager');
var Rule = require('./rule');

module.exports = (function(){
  return {
    checkpointManager: CheckpointManager,
    rule: Rule
  };
}());

},{"./checkpointManager":52,"./rule":54}],54:[function(require,module,exports){

var clone = require('clone');

module.exports = (function(){

  // Flag bad practises
 'use strict';

  // --------------------------------
  // Rule
  // --------------------------------

  var Rule = function(playCallback){

  /**
   * Callback function that runs the logic for rule and returns boolean
   *
   * @property _playCallback
   * @type {function}
   * @default "null"
   */
    this._playCallback = playCallback;

  };

  // --------------------------------
  // Getters and Setters
  // --------------------------------

  // --------------------------------
  // Methods
  // --------------------------------

  Rule.prototype.init = function(attrs){

    // Hold `this`
    var thiss = this;

    // If valid object is passed; copy attrs to `this` object
    if(attrs && typeof attrs === 'object'){
      Object.keys(attrs).forEach(function(attr){
        thiss[attr] = attrs[attr];
      });
    }

    // Allow method chaining
    return this;

  };

  Rule.prototype.play = function(changes){
    return this._playCallback(changes);
  };

  // --------------------------------
  // Export
  // --------------------------------

  return Rule;

}());

},{"clone":6}],55:[function(require,module,exports){


module.exports = (function(doc){

  // Flag bad practises
 'use strict';

  // --------------------------------
  // Basic Setup
  // --------------------------------

  var controlBox = {

  };

  // --------------------------------
  // Methods
  // --------------------------------

  controlBox.create = function(trail){

    // Create main container
    var container = doc.createElement("div");

    // Append Properties
    d3.select(container)
      .attr('id', trail._id + '-control-box-container')
      .attr('class', 'trails-control-box-container');

    // Create control box
    var box = d3.select(container)
      .append("div")
      .attr('id', trail._id + '-control-box')
      .attr('class', 'trails-control-box');

    // Create and append title-container and title
    var titlebar = box.append('div')
      .attr('id', trail._id + '-title-container')
      .attr('class', 'trails-title-container')
      .append('p')
      .attr('id', trail._id + '-trails-title')
      .attr('class', 'trails-title')
      .text('trail-' + trail._id.split('-')[0] + '...');

    // Create and append controls-container
    var controlsContainer = box.append('div')
      .attr('id', trail._id + '-controls-container')
      .attr('class', 'trails-controls-container');

    var controlsDropdown = controlsContainer.append('ul')
      .attr('id', trail._id + '-controls-dropdown')
      .attr('class', 'trails-controls-dropdown');

    var controlsDropdownRight = controlsContainer.append('ul')
      .attr('id', trail._id + '-controls-dropdown-right')
      .attr('class', 'trails-controls-dropdown-right');

    var controlsMainMenuLi = controlsDropdown.append('li')
      .attr('id', trail._id + '-controls-dropdown-menu-item')
      .attr('class', 'trails-controls-menu-item')
      .text("Actions");

    var controlsSubMenu = controlsMainMenuLi.append('ul')
      .attr('id', trail._id + '-controls-dropdown-sub-menu')
      .attr('class', 'trails-controls-dropdown-sub-menu');

    // Create and append gallery-container
    box.append('div')
      .attr('id', trail._id + '-thumbnails-container')
      .attr('class', 'trails-thumbnails-container')
      .append('div')
      .attr('id', trail._id + '-thumbnails-container-inner-wrapper')
      .attr('class', 'trails-thumbnails-container-inner-wrapper')
      .attr('width', 0)
      .append('div')
      .attr('id', trail._id + '-thumbnails-gallery')
      .attr('class', 'trails-thumbnails-gallery');

      // Create and append comments container
      box.append('div')
        .attr('id', trail._id + '-comments-container')
        .attr('class', 'trails-comments-container');

      // Create and append overlay
      d3.select(doc.body).append('div')
        .attr('id', trail._id + '-trails-overlay')
        .attr('class', 'trails-overlay')
        .append('div')
        .attr('id', trail._id + '-trails-overlay-inner-wrapper')
        .attr('class', 'trails-overlay-inner-wrapper');

      // Drag
      var dragstartsTargetId = null;
      var drag = d3.behavior.drag()
        .origin(function(d) {
          return {x: container.offsetLeft, y: container.offsetTop};
        })
        .on("dragstart", function(){
          dragstartsTargetId = d3.event.sourceEvent.target.id;
          d3.event.sourceEvent.stopPropagation();
          d3.select(container).classed("dragging", true);
        })
        .on("drag", function(){
          if(dragstartsTargetId === trail._id + '-trails-title'){
            container.style.left = (+d3.event.x) + "px";
            container.style.top = (+d3.event.y) + "px";
          }
        })
        .on("dragend", function(){
          d3.select(container).classed("dragging", false);
          dragstartsTargetId = null;
        });

      // Call drag on container
      d3.select(container).call(drag);

      return container;

  };


  // --------------------------------
  // Export
  // --------------------------------

  return controlBox;

});

},{}],56:[function(require,module,exports){
var exporter = require('../share/exporter');

module.exports = (function(doc){

  // Flag bad practises
 'use strict';

  // --------------------------------
  // Basic Setup
  // --------------------------------

  var gistControl = {

    // Create control
    create: function(trail){

      // Create Wrapper
      var control = doc.createElement('li');

      // Create controls
      d3.select(control)
      .attr('id', 'trails-' + trail._id + '-control-gist')
      .attr('clsas', 'trails-control control-gist')
      .text('Export Gist')
      .on('click', function(){

        // Export and Format Gist
        var gist = gistControl.formatGist(trail, exporter.export(trail));

        // Use d3 xhr to post gist
        var url = trail.githubAccessToken() ? "https://api.github.com/gists?access_token=" + trail.githubAccessToken() : 'https://api.github.com/gists';
        d3.xhr(url)
          .header("Content-Type", "application/json")
          .post(gist, function(err, data){
            console.log("response", data);
            if(data && data.response){
              var parsed = JSON.parse(data.response);
              if(parsed && parsed.id){
                alert("Exported to gist: " + parsed.id);
              } else {
                alert('Error posting gist.\n\n'+'Unknown Error');
              }
            } else {
              var msg = trail.githubAccessToken() ? 'Make sure that provided access token is valid.' : 'Unknown Error';
              alert('Error posting gist.\n\n'+msg);
            }
          });

      });

      // Append
      d3.select(trail._controlBox)
        .select('.trails-controls-dropdown-sub-menu')[0][0]
        .appendChild(control);

      return control;

    },


    formatGist: function(trail, exportable){

      // Month Names
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

      // Format Date
      var date = new Date();
      var formattedTime = months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear() +  " - " + date.getHours() + ":" +  date.getMinutes() + ":" + date.getSeconds();

      // Template
      var gistTemplate = {
        "description": "jsTrail exported at: " + formattedTime,
        "public": trail.githubAccessToken() === null,
        "files": { }
      };

      // Add File
      gistTemplate.files[ "trail-" + trail.id() + ".json"] = {};
      gistTemplate.files[ "trail-" + trail.id() + ".json"].content = JSON.stringify(exportable, null, 2);

      // Return formatted gist
      return JSON.stringify(gistTemplate);

    },

  };

  // --------------------------------
  // Export
  // --------------------------------

  return gistControl;

});

},{"../share/exporter":69}],57:[function(require,module,exports){
var treeView = require('./treeView');
var tableView = require('./tableView');

module.exports = (function(doc){

  // Flag bad practises
 'use strict';

  // --------------------------------
  // Basic Setup
  // --------------------------------

  var galleryControl = {

    // Create control
    create: function(trail){

      // Create Wrapper
      var control = doc.createElement('li');

      // Create controls
      d3.select(control)
      .attr('id', 'trails-' + trail._id + '-control-gallery')
      .attr('class', 'trails-control control-gallery control-right')
      .text('G')
      .on('click', function(){

        // Overlay and wrapper
        var overlay = d3.select('#' + trail._id + '-trails-overlay').style("display", "block");
        var overlayWrapper = d3.select('#' + trail._id + '-trails-overlay-inner-wrapper').html("");

        // Disable Body Scrolling
        d3.select(doc.body).style("overflow", "hidden");

        // On Pressing esc hide overlay
        d3.select(doc.body)
        .on("keydown", function(){
          if(d3.event.keyCode === 27){
            d3.select('#' + trail._id + '-trails-overlay').style('display', 'none');
            d3.select(doc.body).style("overflow", "auto");
          }
        });

        // Export all Snapshots
        var versionList = [];
        var versionTree = trail.versionTree().export(function(data){
          versionList.push(data.changes);
          return data.changes ? {
            changesId: data.changes.id(),
            recordedAt: data.changes.recordedAt(),
            thumbnail: data.changes.thumbnail(),
            vizData: data.changes.data(),
            isCheckpoint: data.changes.isCheckpoint(),
          } : { changesId: null, thumbnail: null};
        });

        // Show Table
        tableView.show(trail, overlayWrapper, versionList, doc);
        treeView.show(trail, overlayWrapper, versionTree, doc);

      });

      // Append
      d3.select(trail._controlBox)
        .select('.trails-controls-dropdown-right')[0][0]
        .appendChild(control);

      return control;

    }
  };

  // --------------------------------
  // Export
  // --------------------------------

  return galleryControl;

});

},{"./tableView":63,"./treeView":64}],58:[function(require,module,exports){
var importer = require('../share/importer');

module.exports = (function(doc){

  // Flag bad practises
 'use strict';

  // --------------------------------
  // Basic Setup
  // --------------------------------

  var gistImport = {

    // Create control
    create: function(trail){

      // Create Wrapper
      var control = doc.createElement('li');

      // Create controls
      d3.select(control)
      .attr('id', 'trails-' + trail._id + '-import-gist')
      .attr('clsas', 'trails-control control-import-gist')
      .text('Import Gist')
      .on('click', function(){

        // Get gist Id
        var gistId = prompt("Enter a gist id");
        if(gistId){

          var response = gistImport.getGistData('https://api.github.com/gists/' + gistId, function(response){
            if(response && response.id){
              var fileName = Object.keys(response.files)[0];
              var content = null;
              if(response.files[fileName].truncated){
                gistImport.getGistData(response.files[fileName].raw_url, function(_content){
                  content = _content;
                  importer.import(trail, content);
                });
              } else {
                content = JSON.parse(response.files[fileName].content);
                importer.import(trail, content);
              }
            }
          });



        }

      });

      // Append
      d3.select(trail._controlBox)
        .select('.trails-controls-dropdown-sub-menu')[0][0]
        .appendChild(control);

      return control;

    },

    getGistData: function(url, callback){

      // XMLHTTP
      var xmlhttp = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");

      // On Ready State Change
      xmlhttp.onreadystatechange = function(){
        if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
           if(xmlhttp.status == 200){
             var response = JSON.parse(xmlhttp.responseText);
             callback(response);
           } else if(xmlhttp.status == 400) {
              alert('Error 400');
           } else {
               alert('Unknown Error.');
           }
        }
      };

      // Send Request
      xmlhttp.open("GET", url, true);
      xmlhttp.send();

    },

  };

  // --------------------------------
  // Export
  // --------------------------------

  return gistImport;

});

},{"../share/importer":70}],59:[function(require,module,exports){


module.exports = (function(doc){

  return {

    // ControlBox that holds the snapshot gallery and controls
    controlBox: require('./controlBox')(doc),

    // List of posible controls
    list: {
      importGist: require('./importGist')(doc),
      exportGist: require('./exportGist')(doc),
      saveJSON: require('./saveJSON')(doc),
      loadJSON: require('./loadJSON')(doc),
      navigation: require('./navigation')(doc),
      gallery: require('./gallery')(doc),
    },

    all: function(){
      return Object.keys(this.list);
    },

  };


});

},{"./controlBox":55,"./exportGist":56,"./gallery":57,"./importGist":58,"./loadJSON":60,"./navigation":61,"./saveJSON":62}],60:[function(require,module,exports){

var importer = require('../share/importer');

module.exports = (function(doc){

  // Flag bad practises
 'use strict';

  // --------------------------------
  // Basic Setup
  // --------------------------------

  var loadControl = {

    // Create control
    create: function(trail){

      // Create Wrapper
      var control = doc.createElement('li');
      var inputBox = doc.createElement('input');

      // Create controls
      d3.select(control)
        .attr('id', 'trails-' + trail._id + '-control-load')
        .attr('class', 'trails-control control-load')
        .text('Load JSON')
        .on('click', function(){
          inputBox.click();
        });

      // Create Control Box
      d3.select(inputBox)
        .attr('id', 'trails-' + trail._id + '-control-input')
        .attr('class', 'control-input')
        .attr('type', 'file')
        .style('display', 'none')
        .on('change', function(){
          if(window.FileReader){
            var file = d3.event.target.files[0];
            var reader = new FileReader();
            reader.onload = function(e) {
             var fileContents = e.target.result;
             var dataObject = JSON.parse(fileContents);
             importer.import(trail, dataObject);
           };
           reader.readAsText(file);
         }else{
           alert("Your browser does not support FileReader. Please consider upgrading.");
         }
       });

      // Append
      d3.select(trail._controlBox)
        .select('.trails-controls-dropdown-sub-menu')[0][0]
        .appendChild(control);

      // Append
      d3.select(trail._controlBox)
        .select('.trails-control-box')[0][0]
        .appendChild(inputBox);

      return control;

    }
  };

  // --------------------------------
  // Export
  // --------------------------------

  return loadControl;

});

},{"../share/importer":70}],61:[function(require,module,exports){


module.exports = (function(doc){

  // Flag bad practises
 'use strict';

  // --------------------------------
  // Basic Setup
  // --------------------------------

  var snapshotControl = {

    // Create control
    create: function(trail){

      // Create Wrapper
      var controlPrev = doc.createElement('li');
      var controlNext = doc.createElement('li');

      // Get thumbnail gallery
      var thumbnailGallery = d3.select(trail._controlBox).selectAll('.trails-thumbnails-gallery');

      // Create controls prev
      d3.select(controlPrev)
      .attr('id', 'trails-' + trail._id + '-control-snapshot-prev')
      .attr('class', 'trails-control control-snapshot-prev')
      .text('<< Prev')
      .on('click', function(){

        // Get Current Version Node
        var fromVersionNode = trail._currentVersionNode;

        // If has parent node
        if(fromVersionNode._parentNode){

          // Get Sub Trail
          trail.subTrails().forEach(function(subTrail){
            if(subTrail === fromVersionNode._data.changes.subTrail()){

              // Call Inverse on Sub Trail
              trail.waitFor(function(){
                fromVersionNode._data.changes.inverse().done();
              });

              // Update current node to parent node
              trail._currentVersionNode = fromVersionNode._parentNode;

              // Update Highlighted Thumbnail
              thumbnailGallery.selectAll('img').classed('highlight', function(d){
                return trail._currentVersionNode._data.changes ? d._data.changes.id() === trail._currentVersionNode._data.changes.id() : false;
              });

            }
          });

        }

      });

      // Create controls next
      d3.select(controlNext)
      .attr('id', 'trails-' + trail._id + '-control-snapshot-next')
      .attr('class', 'trails-control control-snapshot-next')
      .text('Next >>')
      .on('click', function(){

        // Get Current snapshot
        var fromVersionNode = trail._currentVersionNode;

        // If has parent node
        if(fromVersionNode._childNodes.length){

          // Get Index from current version
          var idx = trail._currentBranchVersions.indexOf(fromVersionNode);

          // If There is a trail ahead of current node already in current branch
          var nextChildVersion = idx < trail._currentBranchVersions.length - 1 ? trail._currentBranchVersions[idx + 1] : fromVersionNode._childNodes[fromVersionNode._childNodes.length - 1];

          // Forward on current node
          trail.waitFor(function(){
            nextChildVersion._data.changes.forward().done();
          });

          // Update current node to parent node
          trail._currentVersionNode = nextChildVersion;

          // Update Highlighted Thumbnail
          thumbnailGallery.selectAll('img').classed('highlight', function(d){
            return trail._currentVersionNode._data.changes ? d._data.changes.id() === trail._currentVersionNode._data.changes.id() : false;
          });

        }

      });

      // Get container to Append
      var container = d3.select(trail._controlBox)
        .select('.trails-controls-dropdown')[0][0];

      // Append
      container.appendChild(controlPrev);
      container.appendChild(controlNext);

      return controlPrev;

    }
  };

  // --------------------------------
  // Export
  // --------------------------------

  return snapshotControl;

});

},{}],62:[function(require,module,exports){

var fileSaver = require('filesaver.js/FileSaver.min.js');
var exporter = require('../share/exporter');

module.exports = (function(doc){

  // Flag bad practises
 'use strict';

  // --------------------------------
  // Basic Setup
  // --------------------------------



  var saveControl = {

    // Create control
    create: function(trail){

      // Create Wrapper
      var control = doc.createElement('li');

      // Create controls
      d3.select(control)
        .attr('id', 'trails-' + trail._id + '-control-save')
        .attr('clsas', 'trails-control control-save')
        .text('Save JSON')
        .on('click', function(){
          var blob = new Blob([JSON.stringify(exporter.export(trail))], {type: "text/json;charset=utf-8"});
          fileSaver.saveAs(blob, 'trail-' + trail.id() + '.json');
        });

      // Append
      d3.select(trail._controlBox)
        .select('.trails-controls-dropdown-sub-menu')[0][0]
        .appendChild(control);

      return control;

    }
  };

  // --------------------------------
  // Export
  // --------------------------------

  return saveControl;

});

},{"../share/exporter":69,"filesaver.js/FileSaver.min.js":33}],63:[function(require,module,exports){

var stateLoader = require('../navigation/stateLoader');

module.exports = (function(){

  // --------------------------------
  // Table View
  // --------------------------------

  var tableView = {

  };

  // --------------------------------
  // Methods
  // --------------------------------

  tableView.show = function(trail, overlayWrapper, versionList, doc){

    // Create and Append Table Container
    var tableContainer = overlayWrapper.append('div')
      .attr('id', trail._id + '-trails-overlay-table-container')
      .attr('class', 'trails-overlay-table-container');

    // Create and append table
    var table = tableContainer.append('table')
      .attr('id', trail._id + '-trails-overlay-table')
      .attr('class', 'trails-overlay-table')
      .attr('cellpadding', 0)
      .attr('cellspacing', 0);

    // Append thead
    var thead = table.append('thead')
      .attr('id', trail._id + '-trails-overlay-table-thead')
      .attr('class', 'trails-overlay-table-thead')
      .append("tr");

    // Append tbody
    var tbody = table.append('tbody')
      .attr('id', trail._id + '-trails-overlay-table-tbody')
      .attr('class', 'trails-overlay-table-tbody');

    // --------------------------------
    // Appending Headers
    // --------------------------------

    // Id col
    var colId = thead.append('th')
      .attr('sorting', 'none')
      .attr('id', 'col-id')
      .text('Id');

    // Id colCapturedAt
    var colRecordedAt = thead.append('th')
      .attr('id', 'col-recorded-at')
      .attr('sorting', 'ascending')
      .style('cursor', 's-resize')
      .text('Recorded At')
      .on('click', sortRecordedAtCol);

    // Id colThumbnail
    var colThumbnail = thead.append('th')
      .attr('id', 'col-thumbnail')
      .text('Thumbnail');

    // Actions
    var colActions = thead.append('th')
      .attr('id', 'col-action')
      .text('Actions');

    // --------------------------------
    // Appending Rows and Columns
    // --------------------------------

    // Month Names
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Append rows (tr)
    var tr = tbody.selectAll('tr')
      .data(versionList)
      .enter().append('tr')
      .attr('id', function(d){ return d ? 'row-' + d.id() : 'root-node'; });

    // Append Id
    tr.append('td')
      .append('div')
      .text(function(d, i){
        return d ? d.id().split('-')[0] : 'Original State';
      });

    // Append Capture At
    tr.append('td')
      .append('div')
      .html(function(d, i){
        if(d){
          var date = new Date(+d.recordedAt());
          return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear() + "<br />" + date.getHours() + ":" +  date.getMinutes() + ":" + date.getSeconds();
        } else {
          return 'N/A';
        }
      });

    // Append Thumbnail
    tr.append('td')
      .append('div')
      .append('img')
      .attr('class', 'table-thumbnail')
      .attr('src', function(d){
        if(d){ return d.thumbnail(); }
      });

    // Append Load
    tr.append('td')
      .append('div')
      .append('span')
      .attr('class', 'load-changes')
      .attr('changes-id', function(d){ return d ? 'row-' + d.id() : 'root-node'; })
      .on('click', function(d){

        // Load State
        trail.waitFor(function(){
          stateLoader.loadState(trail, d);
        });

        // Exit Overlay
        d3.select('#' + trail._id + '-trails-overlay').style('display', 'none');
        d3.select(doc.body).style("overflow", "auto");

      }).text('Load State');

    // --------------------------------
    // Events
    // --------------------------------

    function sortRecordedAtCol(){

      // Select element
      var element = d3.select(this);

      // Sort
      tr.sort(function(changeA, changeB){
        return !changeA || !changeB ? -1 :element.attr('sorting') !== 'ascending' ? d3.ascending(changeA.recordedAt(), changeB.recordedAt()) : d3.descending(changeA.recordedAt(), changeB.recordedAt());
      });

      // Toggle attr
      element.attr('sorting', function(){
        return element.attr('sorting') !== 'ascending' ? 'ascending' : 'descending';
      });

      // Toggle cursor
      element.style('cursor', function(){
        return element.attr('sorting') === 'ascending' ? 's-resize' : 'n-resize';
      });

    }

  };

  // --------------------------------
  // Export
  // --------------------------------

  return tableView;

}());

},{"../navigation/stateLoader":68}],64:[function(require,module,exports){


module.exports = (function(){

  // --------------------------------
  // Tree View
  // --------------------------------

  var treeView = {

  };

  // --------------------------------
  // Methods
  // --------------------------------

  treeView.show = function(trail, overlayWrapper, versionTree, doc){

    // Create and Append Tree Container
    var treeContainer = overlayWrapper.append('div')
      .attr('id', trail._id + '-trails-overlay-tree-container')
      .attr('class', 'trails-overlay-tree-container');

    // Margin to the tree
    var margin = { top: 10, right: 0, bottom: 0, left: 10 },
    width = 800 - margin.right - margin.left,
    height = 600 - margin.top - margin.bottom;

    // Create Zoom
    var zoom = d3.behavior.zoom()
      .scaleExtent([0.5, 2])
      .on("zoom", zoomed);

    // Append SVG
    var svg = treeContainer.append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(zoom);

    // Zoomable Group
    var container = svg.append('g')
      .attr('class', 'zoomable');

    // Counter
    var i = 0;

    // tree Layout
    var tree = d3.layout.tree()
      .separation(function separation(a, b) { return a.parent === b.parent ? 1 : 1.5; })
      .nodeSize([80, 80]);

    // Projection
    var diagonal = d3.svg.diagonal()
     .projection(function(d) { return [d.x + width / 2, d.y + 50]; });

    // Numeric Settings
    var nodeDepth = 100;

    // Update Tree
    update(versionTree);

    // Hold Current Scale
    var scale = 1;

    // On Zoomed
    function zoomed(){

      // Check Event and Update
      if(scale != d3.event.scale){
        container.transition()
        .duration(200)
        .attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
      } else {
        container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
      }

      // Update Scale
      scale = d3.event.scale;

    }

    // Update Tree
    function update(versionTree){

      // Compute the new tree layout.
      var nodes = tree.nodes(versionTree);
      var links = tree.links(nodes);

      // Normalize for fixed-depth.
      nodes.forEach(function(d) { d.y = d.depth * nodeDepth; });

      // Declare the nodes…
      var node = container.selectAll("g.node")
        .data(nodes, function(d) { return d.id || (d.id = ++i); });

      // Enter the nodes.
      var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
          return "translate(" + (d.x + width / 2 )+ "," + (d.y + 50) + ")";
        });

      // Append Image
      nodeEnter.append("circle")
        .attr("r", 10)
        .attr('id', function(d) { return d.changesId ? ('node-' + d.changesId) : 'root-node' ; })
        .attr('class', 'tree-node')
        // .attr("transform", "translate(" + [100, 100] + ")")
        .classed('root-node', function(d){ return d.changesId === null; })
        .classed('checkpoint', function(d){ return d.changesId && d.isCheckpoint; })
        .classed('current', function(d){
          return trail._currentVersionNode._data.changes && d.changesId ? d.changesId === trail._currentVersionNode._data.changes._id : trail._currentVersionNode._data.changes === d.changesId;
        })
        .on('click', highlightNode);

      // Append Labels
      nodeEnter.append("text")
        .attr("y", function(d) { return d.children || d._children ? -30 : 30; })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.changesId ? d.changesId.split("-")[0] : 'Original State'; })
        .style("fill-opacity", 1);

      // Declare the links…
      var link = container.selectAll("path.link")
        .data(links, function(d) { return d.target.id; });

      // Enter the links.
      link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", diagonal);

    }


    function highlightNode(d){


    }

  };

  // --------------------------------
  // Export
  // --------------------------------

  return treeView;

}());

},{}],65:[function(require,module,exports){
module.exports = (function(){
  return function() {
    function s1() {
      return String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s1() + s4() + s4() + '-' + s4() + s4() + s4() + s4() + s4() + s4();
  };
}());

},{}],66:[function(require,module,exports){

module.exports = (function(){
  return {
    guid: require('./guid')
  };
}());

},{"./guid":65}],67:[function(require,module,exports){

module.exports = (function(){

  var nearestCheckpoint = {

    find: function(trail, toNode){

      // Check if destination itself is checkpoint
      if(toNode && toNode._data.changes && toNode._data.changes.isCheckpoint()){
        return {
          node: toNode,
          distance: 0,
        };
      }

      // Radius of search
      var maxDistance = 5;

      // Current Checkpoint and Distance
      var chkDistance = 10000000000;
      var checkpoint = null;

      // Recur over outer nodes
      (function recurOuter(outerNode, visited, distance){

        // Start Exploring Children
        var found = (function recur(node, visited, distance){

          // Check if already visited
          if(visited.indexOf(node) > -1)
          return;

          // Check Distance
          if(distance > maxDistance || distance > chkDistance)
          return;

          // Check for checkpoint
          if(node && node._data.changes && node._data.changes.isCheckpoint() && distance < chkDistance){
            checkpoint = node;
            chkDistance = distance;
            return true;
          }

          // Recur over childs
          node._childNodes.some(function(_child){
            return recur(_child, visited, distance + 1);
          });

        }(outerNode, visited, distance));

        // Return if checkpoint is found
        if(found) return;

        // Go to Parent
        if(outerNode._parentNode){
          return recurOuter(outerNode._parentNode, visited, distance + 1);
        }

      }(toNode, [], 0));

      return {
        node: checkpoint,
        distance: chkDistance,
      };

    }

  };

  return nearestCheckpoint;

}());

},{}],68:[function(require,module,exports){

var nearestCheckpoint = require('./nearestCheckpoint');

module.exports = (function(){

  function goInverse(fromNode, toNode, callback){
    (function recur(node){
      var returnedValue = callback(node);
      if(returnedValue) return returnedValue;
      if(node._parentNode && node._parentNode !== toNode) recur(node._parentNode);
    }(fromNode));
  }

  function goForward(fromNode, toNode, callback){
    (function recur(node){
      if(node._parentNode && node._parentNode !== fromNode) recur(node._parentNode);
      callback(node);
    }(toNode));
  }

  function distBetween(fromNode, toNode){
    return distanceToRoot(fromNode) + distanceToRoot(toNode) - 2 * distanceToRoot(findCommonParent(fromNode, toNode));
  }

  function distanceToRoot(node){
    var distance = 0;
    (function recur(node){
      if(node._parentNode){
        distance++;
        recur(node._parentNode);
      }
    }(node));
    return distance;
  }

  function findCommonParent(fromNode, toNode){

    // Get Parents
    var fromNodeParents = getParents(fromNode);
    var toNodeParents = getParents(toNode);

    // Find Commont
    var common = null;
    for(var i = 0; i < fromNodeParents.length; i++){
      if(toNodeParents.indexOf(fromNodeParents[i]) !== -1){
        common = fromNodeParents[i];
        break;
      }
    }

    // Return Common
    return common;

  }

  function getParents(fromNode){
    var parents = [];
    (function recur(node){
      parents.push(node);
      if(node._parentNode) recur(node._parentNode);
    }(fromNode));
    return parents;
  }


  function resetViz(fromNode){
    trail.waitFor(function(){
      (function recur(node){
        if(node._data.changes){
          if(node._parentNode && node._parentNode._data.changes){
            node._data.changes.inverse();
            recur(node._parentNode);
          } else {
            node._data.changes.inverse().done();
            node._data.changes.done();
          }
        }
      }(fromNode));
    });
  }

  var stateLoader = {

    loadState: function(trail, d){

      // Get Start and End Nodes
      var fromNode = trail._currentVersionNode;
      var toNode = d;

      // Root Node Clicked
      toNode = !toNode ? trail.versionTree()._rootNode : toNode.nodeInMasterTrail();

      // Loading current version
      if(fromNode === toNode) return;

      // Find Nearest Checkpoint
      var chk = nearestCheckpoint.find(trail, toNode);
      var checkpointNode = chk.node;
      var checkpointDistance = chk.distance;

      // Distance Between Two Nodes
      var distance = distBetween(fromNode, toNode);

      // If checkpoint is near than fromNod, load checkpoint and perform actions
      // Update fromNode
      if((checkpointDistance < distance ) && checkpointNode){
        trail.checkpointManager().setCheckpointData(checkpointNode._data.changes._checkpointData);
        fromNode = checkpointNode;
      }

      // Find Common Parents
      var commonParent = findCommonParent(fromNode, toNode);

      if(toNode._data.changes && toNode._data.changes.isCheckpoint()){
        if(trail._updateVizCallback){
          trail._updateVizCallback();
        }
      } else if(commonParent === fromNode){

        // Forward All Changes till destination
        goForward(fromNode, toNode, function(node){
          var forwardAction = node._data.changes.forward();
          if(node === toNode){
            forwardAction.done();
          }
        });

      } else if(commonParent === toNode){

        // Inverse All Changes till destination
        goInverse(fromNode, toNode, function(node){
          var inverseAction = node._data.changes.inverse();
          if(node._parentNode === commonParent){
            inverseAction.done();
          }
        });

      } else {

        // Inverse All Changes till common node
        goInverse(fromNode, commonParent, function(node){
          var inverseAction = node._data.changes.inverse();
        });

        // Forward All Changes till destination
        goForward(commonParent, toNode, function(node){
          var forwardAction = node._data.changes.forward();
          if(node === toNode){
            forwardAction.done();
          }
        });

      }

      // Clear current branch
      trail._currentBranchVersions = [];

      // Recursively add thumbnails
      (function recur(node){
        if(node._parentNode){
          recur(node._parentNode);
          trail._currentBranchVersions.push(node);
        }
      }(toNode));

      // Add thumbnails below the  targetted node
      if(toNode._childNodes.length)
      (function recur(node){
        trail._currentBranchVersions.push(node);
        if(node._childNodes.length)
          recur(node._childNodes[node._childNodes.length - 1]);
      }(toNode._childNodes[toNode._childNodes.length - 1]));

      // Update Current Node
      trail._currentVersionNode = toNode;

      // Update Thumbnail Gallery
      trail.refreshThumbnailGallery();

    }

  };

  return stateLoader;

}());

},{"./nearestCheckpoint":67}],69:[function(require,module,exports){

module.exports = (function(){

  var exporter = {

    // Export the given trail along with everything
    export: function(trail){

      // Master Trail Info
      var exportedMasterTrail = exporter.extractTrailInfo(trail);

      // Extract Sub Trails
      var exportedSubTrails = trail.subTrails().map(function(subTrail){
        return exporter.extractSubTrail(subTrail);
      });

      // Add exported sub trails in master trail
      exportedMasterTrail.subTrails = exportedSubTrails;

      // Return
      return exportedMasterTrail;

    },

    extractTrailInfo: function(trail){
      return {
        trailId: trail.id(),
        initiatedAt: trail._initiatedAt,
        attrs: trail._attrs,
        controls: trail._controlsSelected,
        renderTo: trail._renderTo,
        isMaster: true,
        versionTree: exporter.exportVersionTree(trail, trail.versionTree()),
        currentVersionNodeId: trail._currentVersionNode._data.changes ? trail._currentVersionNode._data.changes.id() : null,
        currentBranchVersions: trail._currentBranchVersions.map(function(node){
          return node._data.changes.id();
        })
      };
    },

    extractSubTrail: function(subTrail){
      return {
        subTrailId: subTrail.id(),
        identifier: subTrail._identifier,
        initiatedAt: subTrail._initiatedAt,
        attrs: subTrail._attrs,
        masterTrailId: subTrail.masterTrail().id(),
        currentVersionNodeId: subTrail._currentVersionNode._data.changes ? trail._currentVersionNode._data.changes.id() : null,
        versionTree: exporter.exportSubTrailVersionTree(subTrail, subTrail.versionTree())
      };
    },

    exportVersionTree: function(trail, tree){
      return tree.export(function(data){
        return data.changes ? {
          changeId: data.changes.id(),
          subTrailId: data.changes.subTrail().id(),
        } : { isMaster: true};
      });
    },

    exportSubTrailVersionTree: function(subTrail, tree){
      return tree.export(function(data){
        return data.key ? {
          changeId: data.changes.id(),
          recordedAt: data.changes.recordedAt(),
          thumbnail: data.changes.thumbnail(),
          subTrailId: data.changes.subTrail().id(),
          data: data.changes.data(),
          checkpointData: data.changes.checkpointData(),
          useAsCheckpoint: data.changes.isCheckpoint(),
          levelInMasterTrail: data.changes.levelInMasterTrail(),
          levelInSubTrail: data.changes.levelInSubTrail(),
        } : { isMaster: true };
      });
    },

  };

  return exporter;

}());

},{}],70:[function(require,module,exports){

var dataTree = require('data-tree');
var Changes = require('../changes');
var stateLoader = require('../navigation/stateLoader');

module.exports = (function(){

  var importer = {

    import: function(trail, trailData){

      // Validate
      if(!trailData || !trailData.trailId || typeof trailData.trailId !== 'string')
      return;

      // Reset Viz Data
      trail.waitFor(function(){
        trail._events.onTrailLoads.forEach(function(_cb){
          _cb();
        });
      });

      // Import Trail Information
      importer.importTrailInfo(trail, trailData);

    },

    importTrailInfo: function(trail, trailData){

      // Override Properties
      trail._id = trailData.trailId;
      trail._initiatedAt = trailData.initiatedAt;

      Object.keys(trailData.attrs).forEach(function(key){
        trail.attr(key, trailData.attrs[key]);
      });

      // Override subTrails
      trail.subTrails().forEach(function(subTrail){
        trailData.subTrails.forEach(function(subTrailData){
          if(subTrail._identifier === subTrailData.identifier){
            importer.importSubTrailInfo(trail, subTrail, subTrailData);
          }
        });
      });

      // Remove Control Box
      trail.recreateControlBox();

      // Clear selected controls
      trail._controlsSelected = [];

      // Add Controls
      trail.addControls(trailData.controls);
      trail.renderTo(trailData.renderTo);

      // Import Version Tree in Sub Trails
      importer.importMasterTrailVersionTree(trail, trailData);


    },

    importSubTrailInfo: function(trail, subTrail, subTrailData){
      subTrail._id = subTrailData.subTrailId;
      subTrail._initiatedAt = subTrailData.initiatedAt;
      importer.importSubTrailVersionTree(subTrail, subTrailData);
      Object.keys(subTrailData.attrs).forEach(function(key){
        subTrail.attr(key, subTrailData.attrs[key]);
      });
    },

    importSubTrailVersionTree: function(subTrail, subTrailData){

      // Get tree data
      treeData = subTrailData.versionTree;

      // Clear old tree
      subTrail._versionTree = dataTree.create();

      // Create Dummy Changes
      var dummyChange = new Changes(subTrail, null);

      // Import Data
      subTrail._versionTree.import(treeData, 'children', function(nodeData){

       if(nodeData.isMaster){
         return {
           key: null,
           changes: dummyChange
         };
       } else {

         // Create Change and Override
         var changes = new Changes(subTrail, nodeData.data);
         changes.id(nodeData.changeId);
         changes.recordedAt(nodeData.recordedAt);
         changes.data(nodeData.data);
         changes._checkpointData = nodeData.checkpointData;
         changes._levelInSubTrail = nodeData.levelInSubTrail;
         changes._levelInMasterTrail = nodeData.levelInMasterTrail;
         changes._subTrail = subTrail;
         changes._thumbnail = nodeData.thumbnail;
         changes._useAsCheckpoint = nodeData.useAsCheckpoint;
         changes._forwardAction = subTrail._forwardAction;
         changes._inverseAction = subTrail._inverseAction;
         return {
           key: nodeData.changeId,
           changes: changes
         };
       }

     });

     subTrail._currentVersionNode = subTrail._versionTree._rootNode;
     subTrail._versionTree.traverser().traverseBFS(function(node){
       if(subTrailData.currentVersionNodeId && node._data.changes && node._data.changes.id() === subTrailData.currentVersionNodeId){
         subTrail._currentVersionNode = node;
       }
       if(node._data.changes){
         node._data.changes._nodeInSubTrail = node;
       }
     });

   },

   importMasterTrailVersionTree: function(trail, trailData){
     treeData =  trailData.versionTree;
     trail._versionTree = dataTree.create();
     trail._currentBranchVersions = [];
     trail._versionTree.import(treeData, 'children', function(nodeData){

       if(nodeData.isMaster){
         return {
           key: null,
           changes: null
         };
       } else {

         // Fetch Change
         var changeNode = null;
         trail.subTrails().some(function(subTrail){
           if(subTrail.id() === nodeData.subTrailId){
             changeNode = subTrail.versionTree().traverser().searchBFS(function(nodeD){
               return nodeD.changes && nodeD.changes.id() === nodeData.changeId;
             });
             if(changeNode) return true;
           }
         });

         var changes = changeNode._data.changes;

         return changes ? {
           key: changes.id(),
           changes: changes
         } : {key: null,
         changes: null} ;

       }
     });

     trail._currentVersionNode = trail._versionTree._rootNode;
     var toNode = trail._versionTree._rootNode;
     trail._versionTree.traverser().traverseBFS(function(node){
       if(trailData.currentVersionNodeId && node._data.changes && node._data.changes.id() === trailData.currentVersionNodeId){
         toNode = node;
       }
       if(node._data.changes){
         node._data.changes._nodeInMasterTrail = node;
       }
     });


      //  trail.refreshThumbnailGallery();
      trail.waitFor(function(){
        stateLoader.loadState(trail, toNode._data.changes);
      });


     console.log("Trail", trail, toNode);


   },




  };

  return importer;

}());

},{"../changes":51,"../navigation/stateLoader":68,"data-tree":29}],71:[function(require,module,exports){

var helpers = require('./helpers');
var Snapshot = require('./snapshot');
var dataTree = require('data-tree');
var rasterizeHTML = require('rasterizehtml');
var clone = require('clone');

module.exports = (function(){

  // Flag bad practises
 'use strict';

 // --------------------------------
 // Trail
 // --------------------------------

 /**
  * Represents snapshot that holds the state of visualization.
  *
  * @class
  * @kind class
  * @constructor
  * @param {object} data - data that has to stored in snapshot.
  */
 var Snapshot = function(data){

   /**
    * Id that uniqely identifies the snapshot.
    *
    * @property _id
    * @type {string}
    * @default "timestamp"
    */
   this._id = helpers.guid();

   /**
    * Id of the trail to which snapshot belongs
    *
    * @property _trailId
    * @type {string}
    * @default "null"
    */
   this._trailId = null;

   /**
    * Timestamp at which snapshot was captured.
    *
    * @property _capturedAt
    * @type {string}
    * @default "timestamp"
    */
   this._capturedAt = new Date().getTime();

   /**
    * Data that was captured.
    *
    * @property _data
    * @type {object | array | number | string | null}
    * @default "null"
    */
   this._data = clone(data);

   /**
    * Data that represents checkpoint
    *
    * @property _checkpointData
    * @type {object | array | number | string | null}
    * @default "null"
    */
   this._checkpointData = null;

   /**
    * Thumbnail captured.
    *
    * @property _thumbnail
    * @type {string}
    * @default "null"
    */
   this._thumbnail = null;

   /**
    * Level of snapshot in a sub-trail tree
    *
    * @property _level
    * @type {number}
    * @default -1
    */
   this._levelInSubTrail = -1;

   /**
    * Level of snapshot in a master-trail tree
    *
    * @property _level
    * @type {number}
    * @default -1
    */
   this._levelInMasterTrail = -1;


   /**
    * Represents Previous State in Sub Trail
    *
    * @property _prevStateInSubTrail
    * @type {obejct}
    * @default "null"
    */
   this._prevStateFromSubTrail = null;

   /**
    * Represents Previous State in Master Trail
    *
    * @property _prevStateInMasterTrail
    * @type {obejct}
    * @default "null"
    */
   this._prevStateFromMasterTrail = null;

 };

 // --------------------------------
 // Methods
 // --------------------------------

 /**
  * Sets or gets the data.
  *
  * @method data
  * @kind member
  * @param {object | array | string | number | null } data - data that has to be captured.
  */
 Snapshot.prototype.data = function(data){
   if(arguments.length > 0){
     this._data = clone(data);
     return this;
   } else {
     return this._data;
   }
 };

 /**
  * Sets or gets the trailId.
  *
  * @method trailId
  * @kind member
  * @param {string trailId - Id of the trail to which snapshot belongs
  */
 Snapshot.prototype.trailId = function(id){
   if(arguments.length > 0){
     this._trailId = id;
     return this;
   } else {
     return this._trailId;
   }
 };

 /**
  * Captures a thumbnail of given captureArea
  *
  * @method captureThumbnail
  * @kind member
  * @param {string} captureArea - query selector which has to rendered as thumbnail.
  * @param {number} delay - delay in milliseconds after which thumbnail should be captured.
  * @param {function} callback - gets triggered when snapshot finishes rendering thumbnail.
  */
   Snapshot.prototype.captureThumbnail = function(element, delay, callback){

     // Hold `this`
     var thiss = this;

     // If required arguments are passed
     if(arguments.length > 0){

       // Check If rasterizeHTML is included
       if(!rasterizeHTML || rasterizeHTML === 'undefined'){
         callback(null);
         return;
       }

       if(!document.querySelector(element)){
         callback(null);
         return;
       }

       // Clone and Hold current document
       var currentDocument = document;
       var clonnedDocument = currentDocument.cloneNode(true);

       // Get Body and HTML
       var body = currentDocument.body,
           html = currentDocument.documentElement;

       // Compute Max Height
       var maxHeight = Math.max(body.scrollHeight, body.offsetHeight,
       html.clientHeight, html.scrollHeight, html.offsetHeight);

       // Compute Max Width
       var maxWidth = Math.max(body.scrollWidth, body.offsetWidth,
       html.clientWidth, html.scrollWidth, html.offsetWidth);

       // Create temporary canvas element
       var canvas = clonnedDocument.createElement("canvas");
       canvas.width = maxWidth;
       canvas.height = maxHeight;
       canvas.id = "ra-canvas";

       // Modify Context of Canvas
       var context = canvas.getContext("2d");
       context.fillStyle = "#FFFFFF";
       context.fillRect(0, 0, canvas.width, canvas.height);

       // Rasterize the entire document
       var elementDOM = currentDocument.querySelector(element);

       // Size and Offsets
       var height = Math.max(elementDOM.clientHeight, elementDOM.scrollHeight),
           width = Math.max(elementDOM.clientWidth, elementDOM.scrollWidth),
           topOffset = elementDOM.offsetTop,
           leftOffset = elementDOM.offsetLeft;

       // Draw rasterized document
       rasterizeHTML.drawDocument(clonnedDocument, canvas).then(function(renderResult) {

         // Get Canvas context
         var ctx = canvas.getContext("2d");

         // Get Image Data
         var imageData = ctx.getImageData(leftOffset, topOffset, width, height);

         // Clear Canvas Rect
         ctx.clearRect(0, 0, canvas.width, canvas.height);

         // Resize Canvas
         canvas.width = width;
         canvas.height = height;

         // Put cropped data back
         ctx.putImageData(imageData, 0, 0);

         // Get base64
         var imageBase64 = canvas.toDataURL("image/png", 1.0);

         // Set Thumbnail
         thiss.thumbnail(imageBase64);

         // Send result back
         if(callback) callback(imageBase64);

       });

     }

   };

   /**
    * Sets or gets the thumbnail.
    *
    * @method thumbnail
    * @kind member
    * @param {string} captureArea - query selector which has to rendered as thumbnail.
    * @param {function} callback - gets triggered when snapshot finishes rendering thumbnail.
    */
     Snapshot.prototype.thumbnail = function(thumbnail){
       if(arguments.length > 0 && typeof thumbnail  === 'string'){
         this._thumbnail = thumbnail;
         return this;
       } else {
         return this._thumbnail;
       }
     };

   /**
    * Gets the thumbnail.
    *
    * @method capturedAt
    * @kind member
    */
     Snapshot.prototype.capturedAt = function(){
       return this._capturedAt;
     };

     /**
      * Gets the data.
      *
      * @method data
      * @kind member
      */
       Snapshot.prototype.checkpointData = function(data){
         if(arguments.length > 0 && data){
           this._checkpointData = data;
         } else {
           return this._checkpointData;
         }
       };

   /**
    * Gets the data.
    *
    * @method isCheckpoint
    * @kind member
    * @return {boolean} - whether snapshot is checkpoint
    */
     Snapshot.prototype.isCheckpoint = function(){
       return this._checkpointData !== null;
     };

   /**
    * Gets the levelof snapshot in sub-trail.
    *
    * @method levelInSubTrail
    * @kind member
    * @return number - level of snapshot
    */
     Snapshot.prototype.levelInSubTrail = function(){
       return this._levelInSubTrail;
     };

   /**
    * Gets the levelof snapshot in master-trail.
    *
    * @method levelInMasterTrail
    * @kind member
    * @return number - level of snapshot
    */
     Snapshot.prototype.levelInMasterTrail = function(){
       return this._levelInMasterTrail;
     };

   /**
    * Gets the levelof snapshot in master-trail.
    *
    * @method level
    * @kind member
    * @return number - level of snapshot
    */
     Snapshot.prototype.level = function(){
       return this._levelInMasterTrail;
     };

   /**
    * Gets the id of snapshot
    *
    * @method id
    * @kind member
    * @return string - id of snapshot
    */
     Snapshot.prototype.id = function(){
       return this._id;
     };

     Snapshot.prototype.prevStateFromSubTrail = function(){
       return this._prevStateFromSubTrail;
     };

     Snapshot.prototype.prevStateFromMasterTrail = function(){
       return this._prevStateFromMasterTrail;
     };

 // --------------------------------
 // Export
 // --------------------------------

 return Snapshot;



 }());

},{"./helpers":66,"./snapshot":71,"clone":6,"data-tree":29,"rasterizehtml":46}],72:[function(require,module,exports){

var helpers = require('./helpers');
var Snapshot = require('./snapshot');
var dataTree = require('data-tree');
var Changes = require('./changes');
var clone = require('clone');
var Action = require('./action');

module.exports = (function(){

  // Flag bad practises
  'use strict';

  // --------------------------------
  // Sub Trail
  // --------------------------------

  /**
   * Represents the sub-trail that tracks of the states of visualization.
   *
   * @class
   * @kind class
   * @constructor
   * @param masterTrail - {@link Trail} to which this sub-trail is associated.
   */
  var SubTrail = function(masterTrail, uid){

    if(!uid){
      throw Error('Sub Trail must have identifier in parameter');
    }

    this._identifier = uid;

    /**
     * Auto-generated alphanumeric id that uniqely identifies the trail.
     *
     * @property _id
     * @type {string}
     */
    this._id = helpers.guid();

    /**
     * Timestamp at which sub trail was initiated
     *
     * @property _initiatedAt
     * @type {number}
     */
    this._initiatedAt = new Date().getTime();

    /**
     * Attributes that defines the state of trail.
     *
     * @property _attrs
     * @type {object}
     * @default "null"
     */
    this._attrs = {};

    /**
     * {@link Trail} to which this sub-trail is associated.
     *
     * @property _masterTrail
     * @type {object}
     * @default "null"
     */
    this._masterTrail = masterTrail;

    /**
     * Tree of the changes captured
     *
     * @property _versionTree
     * @type {object}
     * @default "null"
     */
    this._versionTree = dataTree.create();

    // Dummy Change
    var dummyChange = new Changes(this, null);

    /**
     * Represents the current version in a sub-trail
     *
     * @property _currentVersionNode
     * @type {object}
     * @default "null"
     */
    this._currentVersionNode = this.versionTree().insert({
      key: null,
      changes: dummyChange
    });

    /**
     * Events that trail can fire
     *
     * @property _events
     * @type {object}
     */
    this._events = {
      'onChangesRecorded': [],
      'onThumbnailCaptured': [],
    };

    /**
     * Forward action callback
     *
     * @property _forwardActionCallback
     * @type {function}
     * @default null
     */
     this._forwardAction = null;

     /**
      * Inverse action callback
      *
      * @property _inverseActionCallback
      * @type {function}
      * @default null
      */
      this._inverseAction = null;


  };

  // --------------------------------
  // Getters and Setters
  // --------------------------------

  /**
   * Gets the GUID of current subTrail.
   *
   * @method id
   * @kind member
   * @return {string} - Auto-generated alphanumeric id that uniqely identifies the trail.
   */
  SubTrail.prototype.id = function(){
    return this._id;
  };

  /**
   * Gets or sets attribute to {@link Trial} instance.
   *
   * @method attr
   * @kind member
   * @param {string} key - using which value is to be set or get.
   * @param {object} value - could be anything that needs to store.
   */
  SubTrail.prototype.attr = function(key, value) {
    if (!key || typeof key !== 'string') {
      return null;
    } else {
      if (arguments.length > 1) {
        this._attrs[key] = value;
        return this;
      } else if(this._attrs.hasOwnProperty(key)){
        return this._attrs[key];
      }
    }
  };

  /**
   * Gets or sets the master trail.
   *
   * @method masterTrail
   * @kind member
   * @param {object} trail - master trail to which this sub-trail is associated
   */
  SubTrail.prototype.masterTrail = function(trail) {
    if(trail && typeof trail === 'object'){
      this._masterTrail = trail;
      return this;
    } else {
      return this._masterTrail;
    }
  };

  /**
   * Gets the version tree
   *
   * @method versionTree
   * @kind member
   * @return {object} tree - version tree
   */
  SubTrail.prototype.versionTree = function() {
    return this._versionTree;
  };

  // --------------------------------
  // Methods
  // --------------------------------

  /**
   * Adds event handler
   *
   * @method addEventHandler
   * @kind member
   * @param {string} eventName - name of the event
   * @param {function} handler - callback function that has to be fired upon event
   */
  SubTrail.prototype.addEventHandler = function(eventName, handler) {

    // Check if valid event name is passed
    if(this._events.hasOwnProperty(eventName)){
      this._events[eventName].push(handler);
    }

    // Allow method chaining
    return this;

  };

  /**
   * Captures a snapshot
   *
   * @method attrs
   * @kind member
   * @param {object | array | string | number | null} data - Data that has to be captured in snapshot.
   * @param {string} captureArea - DOM selector which has to be rendered as thumbnail.
   * @param {numner} delay - delay after which thumbnail has to be randered. Some visualization may take some time to update after interaction.
   */
  SubTrail.prototype.capture = function(data, captureArea, delay){

    // Return if master trail is waiting
    if(this.masterTrail().isIdle()) return;

    // Create Snapshot
    var snapshot = new Snapshot(data).trailId(this.id());

    // Hold `this`
    var thiss = this;

    // Check if capture area and delay are provided
    // Capture snapshot, add it to local tree and send it to handlers
    if(captureArea && typeof captureArea === 'string'){
      setTimeout(function(){
        snapshot.captureThumbnail(captureArea, function(imageBase64){
          addSnapshotToTree(thiss, snapshot);
          thiss._events.onSnapshotCaptured.forEach(function(handler){
            handler(snapshot);
          });
        });
      }, delay && typeof delay === 'number' ? delay : 0);
    }

  };

  /**
   * Captures a snapshot with given thumbnail
   *
   * @method attrs
   * @kind member
   * @param {object | array | string | number | null} data - Data that has to be captured in snapshot.
   * @param {string} imageBase64URL - Base64 representation of image that has to be captured as thumbnail.
   * @param {numner} delay - delay after which thumbnail has to be randered. Some visualization may take some time to update after interaction.
   */
  SubTrail.prototype.captureWithImage = function(data, imageBase64URL, delay){

    // Return if master trail is waiting
    if(this.masterTrail().isIdle()) return;

    // Create Snapshot
    var snapshot = new Snapshot(data).trailId(this._id).thumbnail(imageBase64URL);

    // Add Snapshot to a tree
    addSnapshotToTree(this, snapshot);

    // Trigger `onSnapshotCaptured` event
    this._events.onSnapshotCaptured.forEach(function(handler){
      handler(snapshot);
    });

  };

  /**
   * Records the changes
   *
   * @method recordChanges
   * @kind member
   * @param {object | array | string | number | null} data - Data that has to be recorded in change.
   * @param {function} actionCallback - Callback that gets triggered after changes are created and provides inverse and forward actions.
   */
  SubTrail.prototype.recordChanges = function(data, actionCallback){

    // Return if master trail is waiting. Changes are returned without being tracked.
    if(this.masterTrail().isIdle()) return null;

    // Capture Change
    var changes = new Changes(this, data);

    // Sets Actions
    changes._forwardAction = this._forwardAction;
    changes._inverseAction = this._inverseAction;

    // Fire actionCallback
    if(actionCallback && typeof actionCallback === 'function') actionCallback(changes);

    // Add Changes to Version tree
    addChangesToVersionTree(this, changes);

    // Trigger on Changes Recorded callback
    this._events.onChangesRecorded.forEach(function(handler){
      handler(changes);
    });

  };

  /**
   * Records the changes
   *
   * @method recordChanges
   * @kind member
   * @param {object | array | string | number | null} data - Data that has to be recorded in changes.
   * @param {string} imageBase64URL - Base64 representation of image that has to be captured as thumbnail.
   */
  SubTrail.prototype.recordChangesWithImage = function(data, imageBase64, actionCallback){

    // Capture Change
    var changes = new Changes(this, data);

    // Return if master trail is waiting. Changes are returned without being tracked.
    if(this.masterTrail().isIdle()) return changes;

    // Sets Actions
    changes._forwardAction = this._forwardAction;
    changes._inverseAction = this._inverseAction;

    // Fire actionCallback
    if(actionCallback && typeof actionCallback === 'function') actionCallback(changes);

    // Add Thumbnail
    changes.thumbnail(imageBase64);

    // Add Changes to version tree
    addChangesToVersionTree(this, changes);

    // Trigger on Changes Recorded callback
    this._events.onChangesRecorded.forEach(function(handler){
      handler(changes);
    });

    // Trigger `onThumbnailCaptured`
    this._events.onThumbnailCaptured.forEach(function(handler){
      handler(changes);
    });

    return changes;

  };

  /**
   * Sets the forward action
   *
   * @method setForwardAction
   * @kind member
   * @param {function} callback - callback that implements forward action
   */
  SubTrail.prototype.setForwardAction = function(callback){
    if(callback && typeof callback === 'function'){
      this._forwardAction = new Action(callback);
      return this._forwardAction;
    }
  };

  /**
   * Sets the inverse action
   *
   * @method setInverseAction
   * @kind member
   * @param {function} callback - callback that implements inverse action
   */
  SubTrail.prototype.setInverseAction = function(callback){
    if(callback && typeof callback === 'function'){
      this._inverseAction = new Action(callback);
      return this._inverseAction;
    }
  };

  // --------------------------------
  // Private Methods
  // --------------------------------

  /**
   * Adds a snapshot to the tree in current trail.
   *
   * @method addSnapshotToTree
   * @param {@link Trail} - trail to which snapshot has to be added.
   * @param {@link Changes} - Change which are to be added in a tree.
   */
  var addChangesToVersionTree = function(subtrail, changes){

    // Add Previous State From Sub Trail
    // snapshot._prevStateFromSubTrail = subtrail._currentSnapshotNode._data.snapshot.data();

    // Add given snapshot to tree
    subtrail._currentVersionNode = subtrail.versionTree().insertToNode(subtrail._currentVersionNode, {
      key: changes.id(),
      changes: changes
    });

    // Depth
    changes._levelInSubTrail = subtrail._currentVersionNode._depth;

    // Node
    changes._nodeInSubTrail = subtrail._currentVersionNode;

  };

  // --------------------------------
  // Export
  // --------------------------------

  return SubTrail;

}());

},{"./action":50,"./changes":51,"./helpers":66,"./snapshot":71,"clone":6,"data-tree":29}],73:[function(require,module,exports){
(function (__dirname){
console.log("Name", __dirname);
var helpers = require('./helpers');
var SubTrail = require('./subTrail');
var controls = require('./controls')(window.document);
var dataTree = require('data-tree');
var CheckpointManager = require('./checkpoints').checkpointManager;
var Version = require('./snapshot');
var rasterizeHTML = require('rasterizehtml');
var fileSaver = require('filesaver.js/FileSaver.min.js');



module.exports = (function(){

  // Flag bad practises
 'use strict';

  // --------------------------------
  // Trail
  // --------------------------------

  /**
   * Represents the master-trail that manages sub-trails to capture provenance
   *
   * @class
   * @kind class
   * @constructor
   * @param data - using which trail is to be created
   */
  var Trail = function(data){

    /**
     * Auto-generated alphanumeric id that uniqely identifies the trail.
     *
     * @property _id
     * @type {string}
     */
    this._id = helpers.guid();

    /**
     * Timestamp at which trail was initiated
     *
     * @property _initiatedAt
     * @type {number}
     */
    this._initiatedAt = new Date().getTime();

    /**
     * Attributes that defines the state of trail.
     *
     * @property _attrs
     * @type {object}
     * @default "null"
     */
    this._attrs = {};

    /**
     * sub-trails associated with this master trail.
     *
     * @property _subTrails
     * @type {array}
     * @default "[]"
     */
    this._subTrails = [];

    /**
     * Control box that renders controls
     *
     * @property _currentVersion
     * @type {object}
     * @default "null"
     */
    this._controlBox = controls.controlBox.create(this);

    /**
     * Controls that are selected
     *
     * @property _controlsSelected
     * @type {array}
     * @default "[]"
     */
    this._controlsSelected = [];

    this._renderTo = null;

    /**
     * Tree of the snapshot
     *
     * @property _versionTree
     * @type {object}
     */
    this._versionTree = dataTree.create();

    /**
     * Represents the current snapshot in a sub-trail
     *
     * @property _currentVersionNode
     * @type {object}
     * @default "null"
     */
     this._currentVersionNode = this.versionTree().insert({
       key: null,
       changes: null
     });

    /**
     * Versions from current trails
     *
     * @property _currentBranchVersions
     * @type {array}
     * @default "[]"
     */
    this._currentBranchVersions = [];

    /**
     * Events that trail can fire
     *
     * @property _events
     * @type {object}
     */
    this._events = {
      'onChangesRecorded': [],
      'onCheckpointRequested':[],
      'onTrailLoads': [],
    };

    /**
     * Checkpoint callback that gets the checkpoint data
     *
     * @property _checkpointCallback
     * @type {function}
     * @default "null"
     */
    this._checkpointCallback = null;

    /**
     * Defines whether trail is idle
     *
     * @property _isIdle
     * @type {boolean}
     * @default "false"
     */
    this._isIdle = false;

    /**
     * Manages checkpoint
     *
     * @property _checkpointManager
     * @type {object}
     * @default "false"
     */
    this._checkpointManager = new CheckpointManager();

    // Github Access Token
    this._githubAccessToken = null;

    // Default Checkpointing Rule
    this.checkpointManager().addRule(function(changes){
      return changes._count && changes._count % 5 === 0;
    });

  };

  // --------------------------------
  // Setters and Getters
  // --------------------------------

  /**
   * Gets the GUID of current subTrail.
   *
   * @method id
   * @kind member
   * @return {string} - Auto-generated alphanumeric id that uniqely identifies the trail.
   */
  Trail.prototype.id = function(){
    return this._id;
  };

  /**
   * Gets or sets the access token
   *
   * @method githubAccessToken
   * @kind member
   * @return {string} - access token.
   */
  Trail.prototype.githubAccessToken = function(token){
    if(arguments.length > 0){
      this._githubAccessToken = token;
      return this;
    } else {
      return this._githubAccessToken;
    }
  };

  /**
   * Gets or sets attribute to {@link Trial} instance.
   *
   * @method attr
   * @kind member
   * @param {string} key - using which value is to be set or get.
   * @param {object} value - could be anything that needs to store.
   */
  Trail.prototype.attr = function(key, value) {
    if (!key || typeof key !== 'string') {
      return null;
    } else {
      if (arguments.length > 1) {
        this._attrs[key] = value;
        return this;
      } else if(this._attrs.hasOwnProperty(key)){
        return this._attrs[key];
      }
    }
  };

  /**
   * Gets the array of sub-trails
   *
   * @method subTrails
   * @kind member
   * @return {array} - sub trails associated with this master trail.
   */
  Trail.prototype.subTrails = function() {
    return this._subTrails;
  };

  /**
   * Gets the snapshot tree
   *
   * @method versionTree
   * @kind member
   * @return {object} tree - snapshot tree
   */
  Trail.prototype.versionTree = function() {
    return this._versionTree;
  };

  /**
   * Gets the `isIdle` flag
   *
   * @method isIdle
   * @kind member
   * @return {boolean}  - whether trail is idle
   */
  Trail.prototype.isIdle = function() {
    return this._isIdle;
  };

  /**
   * Gets the `_currentVersionNode`
   *
   * @method isIdle
   * @kind member
   * @return {object}  - Node object that wraps snapshot object
   */
  Trail.prototype.currentVersionNode = function() {
    return this._currentVersionNode;
  };

  /**
   * Gets the `_checkpointManager`
   *
   * @method checkpointManager
   * @kind member
   * @return {object}  - Node object that wraps snapshot object
   */
  Trail.prototype.checkpointManager = function() {
    return this._checkpointManager;
  };

  // --------------------------------
  // Methods
  // --------------------------------

  /**
   * Adds event handler
   *
   * @method addEventHandler
   * @kind member
   * @param {string} eventName - name of the event
   * @param {function} handler - callback function that has to be fired upon event
   */
  Trail.prototype.addEventHandler = function(eventName, handler) {

    // Check if valid event name is passed
    if(this._events.hasOwnProperty(eventName)){
      this._events[eventName].push(handler);
    }

    // Allow method chaining
    return this;

  };

  /**
   * Creates a sub trail
   *
   * @method subTrail
   * @kind member
   * @return {@link SubTrail} - Newly created sub-trail.
   */
  Trail.prototype.subTrail = function(uid) {

    // Hold `this`
    var thiss = this;

    // Create Sub Trail
    var subTrail = new SubTrail(this, uid);

    // Add Event Handler: `onChangesRecorded`
    subTrail.addEventHandler('onChangesRecorded', function(changes){

      // Add Changes in Version Tree
      addChangesToVersionTree(thiss, changes);

      // Get Checkpoint Data
      changes._checkpointData = thiss.checkpointManager().getCheckpointData();

      // Trigger `onChangesRecorded`
      thiss._events.onChangesRecorded.forEach(function(cb){
        var modifiedChanges = cb(changes);
        if(modifiedChanges && modifiedChanges.id() === changes.id()){
          changes = modifiedChanges;
        }
      });

      // Recur for checkpoint
      if(thiss.checkpointManager()){
        (function recur(node){
          if(node && node._data.changes && !node._data.changes.isCheckpoint()){
            thiss.checkpointManager().applyRulesTo(node._data.changes);
            if(node._parentNode){
              recur(node._parentNode);
            }
          }
        }(thiss._currentVersionNode));
      }

    });

    // Add Event Handler: `onThumbnailCaptured`
    subTrail.addEventHandler('onThumbnailCaptured', function(changes){
      addThumbnailToGallery(thiss, changes);
    });

    // Add it to the list
    this._subTrails.push(subTrail);

    // Return
    return subTrail;

  };

    Trail.prototype.recreateControlBox = function(){
      if(this._controlBox)
      d3.select(this._controlBox).remove();
      this._controlBox = controls.controlBox.create(this);
    };

  /**
   * Lets you add single control to the trail. Control could be:
   * 1. `gistControl` - Lets you export trail to gist.
   * 2. `saveControl` - Lets you save trail locally.
   * 3. `loadControl` - Lets you load back the exported trail.
   * 4. `snapshotControl` - Lets you navigate between snapshots.
   *
   * @method addControl
   * @kind member
   * @param {string} ctrl - one of the control option specified above.
   * @return {Trail} - useful for method chaining
   */
  Trail.prototype.addControl = function(ctrlName){

    // Check if valid control name is passed and is not rendered already
    if(controls.list.hasOwnProperty(ctrlName) && this._controlsSelected.indexOf(ctrlName) === -1){

      // Create and append control to control box
      controls.list[ctrlName].create(this);

      // Mark control as registered
      this._controlsSelected.push(ctrlName);

    }

    return this;
  };

  /**
   * Adds specified controls to the trail. Controls could be:
   * 1. `gistControl` - Lets you export trail to gist.
   * 2. `saveControl` - Lets you save trail locally.
   * 3. `loadControl` - Lets you load back the exported trail.
   * 4. `snapshotControl` - Lets you navigate between snapshots.
   *
   * @method addControls
   * @kind member
   * @param {array} ctrlArray - array containing control options specified above.
   * @return {Trail} - useful for method chaining
   */
  Trail.prototype.addControls = function(ctrlArray){

    // Check array is valid
    ctrlArray = ctrlArray && Array.isArray(ctrlArray) && ctrlArray.length > 0 ? ctrlArray : Object.keys(controls.list);

    // Hold `this`
    var thiss = this;

    // Add control for every entry in array
    ctrlArray.forEach(function(ctrl){
      thiss.addControl(ctrl);
    });

    return this;
  };

  /**
   * render control to given query selector.
   *
   * @method attrs
   * @kind member
   * @param {string | object} control - query selector or DOM object to which controls are to be appended.
   */
  Trail.prototype.renderTo = function(renderTo){

    // Check If `renderTo` is query selector or DOM object itslef
    if(typeof renderTo === 'string'){
      this._renderTo = renderTo;
      document.querySelector(renderTo).appendChild(this._controlBox);
    } else if(typeof renderTo === 'object' && renderTo.appendChild){
      renderTo.appendChild(this._controlBox);
    }

    return this;

  };

  /**
   * keeps trail idle until event is complete
   *
   * @method waitFor
   * @kind member
   * @param {function} callback - function that requires trail to be idle.
   */
  Trail.prototype.waitFor = function(callback){
    this._isIdle = true;
    callback();
    this._isIdle = false;
  };

  /**
   * Requests user to provide a checkpoint data
   *
   * @method checkpoints
   * @kind member
   * @param {function} callback
   */
  Trail.prototype.checkpoints = function(callback){

    // Validate callback type
    if(!callback || typeof callback !== 'function'){
      throw Error('Parameter to checkpoints should be a function returning checkpoint data');
    }

    // Set checkpoint callback.
    this._checkpointCallback = callback;

    // Create Checkpoints
    this._checkpointManager = new CheckpointManager();

    // Return manager
    return this._checkpointManager;

  };

  /**
   * Sets a checkpoint callback
   *
   * @method checkpoints
   * @kind member
   * @param {function} callback
   */
  Trail.prototype.setCheckpointFunc = function(callback){
    if(callback && typeof callback === 'function')
    this.checkpointManager().setCheckpointFunc(callback);
  };

  /**
   * gets a checkpoint callback
   *
   * @method checkpoints
   * @kind member
   * @param {function} callback
   */
  Trail.prototype.getCheckpointFunc = function(callback){
    if(callback && typeof callback === 'function')
    this.checkpointManager().getCheckpointFunc(callback);
  };

  /**
   * callback that updates a viz
   *
   * @method updateVizFunc
   * @kind member
   * @param {function} callback
   */
  Trail.prototype.updateVizFunc = function(callback){
    if(callback && typeof callback === 'function')
    this._updateVizCallback = callback;
  };

  Trail.prototype.refreshThumbnailGallery = function(){

    // Hold This
    var trail = this;

    // Check if controls are rendered
    if(trail._controlBox){

      // Get Gallery
      var galleryWrapper = d3.select(trail._controlBox).select('.trails-thumbnails-container-inner-wrapper');
      var thumbnailGallery = d3.select(trail._controlBox).selectAll('.trails-thumbnails-gallery');

      // Select All Img
      var allThumbs = thumbnailGallery.selectAll("img")
        .data(trail._currentBranchVersions, function(d){ return d._data.changes.id(); });

      // New Image
      allThumbs.enter()
        .append('img')
        .attr('src', function(d){ return d._data.changes.thumbnail(); })
        .attr('height', 200)
        .attr('class', 'trails-thumbnail');

      // Update Highlighting
      allThumbs.classed('highlight', function(d){
        return trail._currentVersionNode._data.changes &&  trail._currentVersionNode._data.changes.id() === d._data.changes.id();
      });

      // Remove outgoing
      allThumbs.exit().remove();

      // Append Multiple class
      allThumbs.classed('multiple', function(d){
        return d._childNodes.length > 1;
      });

    }

  };


  // --------------------------------
  // Private Methods
  // --------------------------------

  /**
   * Adds a snapshot to the tree in current trail.
   *
   * @method addVersionToTree
   * @param {@link Trail} - trail to which snapshot has to be added.
   * @param {@link Version} - Version which is to be added in a tree.
   */
  var addChangesToVersionTree = function(trail, changes){

    // Add Previous State From Master Trail
    //  snapshot._prevStateFromMasterTrail = trail._currentVersionNode._data.snapshot.data();

    // Add given snapshot to tree
    trail._currentVersionNode = trail.versionTree().insertToNode(trail._currentVersionNode, {
      key: changes.id(),
      changes: changes
    });

    // Depth
    changes._levelInMasterTrail = trail._currentVersionNode._depth;

    // Node
    changes._nodeInMasterTrail = trail._currentVersionNode;

  };

  /**
   * Adds a snapshot to the gallery.
   *
   * @method addVersionToTree
   * @param {@link Trail} - trail to which gallery belongs.
   * @param {@link Version} - Version which is to be added in a gallery.
   */
  var addThumbnailToGallery = function(trail, changes){

    // Filter Siblings
    trail._currentBranchVersions = trail._currentBranchVersions.filter(function(node){
      return node._data.changes.levelInMasterTrail() < changes.levelInMasterTrail();
    });

    // Add rendered snapshot
    // Current Version has reference to node that contains recently taken snapshot
    trail._currentBranchVersions.push(changes.nodeInMasterTrail());

    // Refresh Thumbnail Gallery
    trail.refreshThumbnailGallery(trail._currentBranchVersions);

  };

  Trail.prototype.rasterizeAndCrop = function(element, callback){

    // If required arguments are passed
    if(arguments.length > 0){

      // Check If rasterizeHTML is included
      if(!rasterizeHTML || rasterizeHTML === 'undefined'){
        if(callback) callback(null);
        return;
      }

      if(!document.querySelector(element)){
        if(callback) callback(null);
        return;
      }

      // Clone and Hold current document
      var currentDocument = document;
      var clonnedDocument = currentDocument.cloneNode(true);

      // Get Body and HTML
      var body = currentDocument.body,
          html = currentDocument.documentElement;

      // Compute Max Height
      var maxHeight = Math.max(body.scrollHeight, body.offsetHeight,
      html.clientHeight, html.scrollHeight, html.offsetHeight);

      // Compute Max Width
      var maxWidth = Math.max(body.scrollWidth, body.offsetWidth,
      html.clientWidth, html.scrollWidth, html.offsetWidth);

      // Create temporary canvas element
      var canvas = clonnedDocument.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      canvas.id = "ra-canvas";

      // Modify Context of Canvas
      var context = canvas.getContext("2d");
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Rasterize the entire document
      var elementDOM = currentDocument.querySelector(element);

      // Size and Offsets
      var height = Math.max(elementDOM.clientHeight, elementDOM.scrollHeight),
          width = Math.max(elementDOM.clientWidth, elementDOM.scrollWidth),
          topOffset = elementDOM.offsetTop,
          leftOffset = elementDOM.offsetLeft;

      // Draw rasterized document
      rasterizeHTML.drawDocument(clonnedDocument, canvas).then(function(renderResult) {

        console.log("Rendered", renderResult);
        var blob = new Blob([renderResult.svg], {type: "text/svg;charset=utf-8"});
        fileSaver.saveAs(blob, 'Snapshot.svg');

        // Get Canvas context
        var ctx = canvas.getContext("2d");

        // Get Image Data
        var imageData = ctx.getImageData(leftOffset, topOffset, width, height);

        // Clear Canvas Rect
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Resize Canvas
        canvas.width = width;
        canvas.height = height;

        // Put cropped data back
        ctx.putImageData(imageData, 0, 0);

        // Get base64
        var imageBase64 = canvas.toDataURL("image/png", 1.0);

        // Send result back
        if(callback) callback(imageBase64);

      });

    }

  };

  // --------------------------------
  // Export
  // --------------------------------

  return Trail;


}());

}).call(this,"/src\\js")

},{"./checkpoints":53,"./controls":59,"./helpers":66,"./snapshot":71,"./subTrail":72,"data-tree":29,"filesaver.js/FileSaver.min.js":33,"rasterizehtml":46}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9heWVwcm9taXNlL2F5ZXByb21pc2UuanMiLCJub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanMiLCJub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jbG9uZS9jbG9uZS5qcyIsIm5vZGVfbW9kdWxlcy9jc3MtZm9udC1mYWNlLXNyYy9saWIvZ3JhbW1hci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jc3MtZm9udC1mYWNlLXNyYy9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY3NzLWZvbnQtZmFjZS1zcmMvbGliL3V0aWwuanMiLCJub2RlX21vZHVsZXMvY3NzLW1lZGlhcXVlcnkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY3Nzb20vbGliL0NTU0RvY3VtZW50UnVsZS5qcyIsIm5vZGVfbW9kdWxlcy9jc3NvbS9saWIvQ1NTRm9udEZhY2VSdWxlLmpzIiwibm9kZV9tb2R1bGVzL2Nzc29tL2xpYi9DU1NJbXBvcnRSdWxlLmpzIiwibm9kZV9tb2R1bGVzL2Nzc29tL2xpYi9DU1NLZXlmcmFtZVJ1bGUuanMiLCJub2RlX21vZHVsZXMvY3Nzb20vbGliL0NTU0tleWZyYW1lc1J1bGUuanMiLCJub2RlX21vZHVsZXMvY3Nzb20vbGliL0NTU01lZGlhUnVsZS5qcyIsIm5vZGVfbW9kdWxlcy9jc3NvbS9saWIvQ1NTUnVsZS5qcyIsIm5vZGVfbW9kdWxlcy9jc3NvbS9saWIvQ1NTU3R5bGVEZWNsYXJhdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9jc3NvbS9saWIvQ1NTU3R5bGVSdWxlLmpzIiwibm9kZV9tb2R1bGVzL2Nzc29tL2xpYi9DU1NTdHlsZVNoZWV0LmpzIiwibm9kZV9tb2R1bGVzL2Nzc29tL2xpYi9DU1NWYWx1ZS5qcyIsIm5vZGVfbW9kdWxlcy9jc3NvbS9saWIvQ1NTVmFsdWVFeHByZXNzaW9uLmpzIiwibm9kZV9tb2R1bGVzL2Nzc29tL2xpYi9NYXRjaGVyTGlzdC5qcyIsIm5vZGVfbW9kdWxlcy9jc3NvbS9saWIvTWVkaWFMaXN0LmpzIiwibm9kZV9tb2R1bGVzL2Nzc29tL2xpYi9TdHlsZVNoZWV0LmpzIiwibm9kZV9tb2R1bGVzL2Nzc29tL2xpYi9jbG9uZS5qcyIsIm5vZGVfbW9kdWxlcy9jc3NvbS9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY3Nzb20vbGliL3BhcnNlLmpzIiwibm9kZV9tb2R1bGVzL2RhdGEtdHJlZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhLXRyZWUvc3JjL3RyYXZlcnNlci5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhLXRyZWUvc3JjL3RyZWUtbm9kZS5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhLXRyZWUvc3JjL3RyZWUuanMiLCJub2RlX21vZHVsZXMvZmlsZXNhdmVyLmpzL0ZpbGVTYXZlci5taW4uanMiLCJub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pbmxpbmVyZXNvdXJjZXMvc3JjL2JhY2tncm91bmRWYWx1ZVBhcnNlci5qcyIsIm5vZGVfbW9kdWxlcy9pbmxpbmVyZXNvdXJjZXMvc3JjL2Nzc1N1cHBvcnQuanMiLCJub2RlX21vZHVsZXMvaW5saW5lcmVzb3VyY2VzL3NyYy9pbmxpbmUuanMiLCJub2RlX21vZHVsZXMvaW5saW5lcmVzb3VyY2VzL3NyYy9pbmxpbmVDc3MuanMiLCJub2RlX21vZHVsZXMvaW5saW5lcmVzb3VyY2VzL3NyYy9pbmxpbmVJbWFnZS5qcyIsIm5vZGVfbW9kdWxlcy9pbmxpbmVyZXNvdXJjZXMvc3JjL2lubGluZVNjcmlwdC5qcyIsIm5vZGVfbW9kdWxlcy9pbmxpbmVyZXNvdXJjZXMvc3JjL3V0aWwuanMiLCJub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCJub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2RlY29kZS5qcyIsIm5vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZW5jb2RlLmpzIiwibm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yYXN0ZXJpemVodG1sL2Rpc3QvcmFzdGVyaXplSFRNTC5qcyIsIm5vZGVfbW9kdWxlcy9zYW5lLWRvbXBhcnNlci1lcnJvci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy91cmwvdXJsLmpzIiwibm9kZV9tb2R1bGVzL3htbHNlcmlhbGl6ZXIvbGliL3NlcmlhbGl6ZXIuanMiLCJzcmMvanMvYWN0aW9uLmpzIiwic3JjL2pzL2NoYW5nZXMuanMiLCJzcmMvanMvY2hlY2twb2ludHMvY2hlY2twb2ludE1hbmFnZXIuanMiLCJzcmMvanMvY2hlY2twb2ludHMvaW5kZXguanMiLCJzcmMvanMvY2hlY2twb2ludHMvcnVsZS5qcyIsInNyYy9qcy9jb250cm9scy9jb250cm9sQm94LmpzIiwic3JjL2pzL2NvbnRyb2xzL2V4cG9ydEdpc3QuanMiLCJzcmMvanMvY29udHJvbHMvZ2FsbGVyeS5qcyIsInNyYy9qcy9jb250cm9scy9pbXBvcnRHaXN0LmpzIiwic3JjL2pzL2NvbnRyb2xzL2luZGV4LmpzIiwic3JjL2pzL2NvbnRyb2xzL2xvYWRKU09OLmpzIiwic3JjL2pzL2NvbnRyb2xzL25hdmlnYXRpb24uanMiLCJzcmMvanMvY29udHJvbHMvc2F2ZUpTT04uanMiLCJzcmMvanMvY29udHJvbHMvdGFibGVWaWV3LmpzIiwic3JjL2pzL2NvbnRyb2xzL3RyZWVWaWV3LmpzIiwic3JjL2pzL2hlbHBlcnMvZ3VpZC5qcyIsInNyYy9qcy9oZWxwZXJzL2luZGV4LmpzIiwic3JjL2pzL25hdmlnYXRpb24vbmVhcmVzdENoZWNrcG9pbnQuanMiLCJzcmMvanMvbmF2aWdhdGlvbi9zdGF0ZUxvYWRlci5qcyIsInNyYy9qcy9zaGFyZS9leHBvcnRlci5qcyIsInNyYy9qcy9zaGFyZS9pbXBvcnRlci5qcyIsInNyYy9qcy9zbmFwc2hvdC5qcyIsInNyYy9qcy9zdWJUcmFpbC5qcyIsInNyYy9qcy90cmFpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1Z0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaGpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVkQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbGhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3d0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbnNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG4vLyBSZXF1aXJlIFRyYWlsXHJcbnZhciBUcmFpbCA9IHJlcXVpcmUoJy4vc3JjL2pzL3RyYWlsJyApO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBqc3RyYWlscyA9IChmdW5jdGlvbigpe1xyXG5cclxuICAvLyBGbGFnIGJhZCBwcmFjdGlzZXNcclxuICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGNyZWF0ZTogZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIG5ldyBUcmFpbCgpO1xyXG4gICAgfVxyXG4gIH07XHJcbn0oKSk7XHJcbiIsIi8vIFVNRCBoZWFkZXJcbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3QuYXllcHJvbWlzZSA9IGZhY3RvcnkoKTtcbiAgICB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgYXllcHJvbWlzZSA9IHt9O1xuXG4gICAgLyogV3JhcCBhbiBhcmJpdHJhcnkgbnVtYmVyIG9mIGZ1bmN0aW9ucyBhbmQgYWxsb3cgb25seSBvbmUgb2YgdGhlbSB0byBiZVxuICAgICAgIGV4ZWN1dGVkIGFuZCBvbmx5IG9uY2UgKi9cbiAgICB2YXIgb25jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHdhc0NhbGxlZCA9IGZhbHNlO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiB3cmFwcGVyKHdyYXBwZWRGdW5jdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAod2FzQ2FsbGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgd2FzQ2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB3cmFwcGVkRnVuY3Rpb24uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHZhciBnZXRUaGVuYWJsZUlmRXhpc3RzID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAvLyBNYWtlIHN1cmUgd2Ugb25seSBhY2Nlc3MgdGhlIGFjY2Vzc29yIG9uY2UgYXMgcmVxdWlyZWQgYnkgdGhlIHNwZWNcbiAgICAgICAgdmFyIHRoZW4gPSBvYmogJiYgb2JqLnRoZW47XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHRoZW4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgLy8gQmluZCBmdW5jdGlvbiBiYWNrIHRvIGl0J3Mgb2JqZWN0IChzbyBmYW4ncyBvZiAndGhpcycgZG9uJ3QgZ2V0IHNhZClcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoZW4uYXBwbHkob2JqLCBhcmd1bWVudHMpOyB9O1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBhVGhlbkhhbmRsZXIgPSBmdW5jdGlvbiAob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgICAgICAgdmFyIGRlZmVyID0gYXllcHJvbWlzZS5kZWZlcigpO1xuXG4gICAgICAgIHZhciBkb0hhbmRsZXJDYWxsID0gZnVuY3Rpb24gKGZ1bmMsIHZhbHVlKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0dXJuVmFsdWU7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSBmdW5jKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVyLnJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyZXR1cm5WYWx1ZSA9PT0gZGVmZXIucHJvbWlzZSkge1xuICAgICAgICAgICAgICAgICAgICBkZWZlci5yZWplY3QobmV3IFR5cGVFcnJvcignQ2Fubm90IHJlc29sdmUgcHJvbWlzZSB3aXRoIGl0c2VsZicpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWZlci5yZXNvbHZlKHJldHVyblZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY2FsbEZ1bGZpbGxlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKG9uRnVsZmlsbGVkICYmIG9uRnVsZmlsbGVkLmNhbGwpIHtcbiAgICAgICAgICAgICAgICBkb0hhbmRsZXJDYWxsKG9uRnVsZmlsbGVkLCB2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlZmVyLnJlc29sdmUodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBjYWxsUmVqZWN0ZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChvblJlamVjdGVkICYmIG9uUmVqZWN0ZWQuY2FsbCkge1xuICAgICAgICAgICAgICAgIGRvSGFuZGxlckNhbGwob25SZWplY3RlZCwgdmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWZlci5yZWplY3QodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwcm9taXNlOiBkZWZlci5wcm9taXNlLFxuICAgICAgICAgICAgaGFuZGxlOiBmdW5jdGlvbiAoc3RhdGUsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlID09PSBGVUxGSUxMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbEZ1bGZpbGxlZCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbFJlamVjdGVkKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8vIFN0YXRlc1xuICAgIHZhciBQRU5ESU5HID0gMCxcbiAgICAgICAgRlVMRklMTEVEID0gMSxcbiAgICAgICAgUkVKRUNURUQgPSAyO1xuXG4gICAgYXllcHJvbWlzZS5kZWZlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHN0YXRlID0gUEVORElORyxcbiAgICAgICAgICAgIG91dGNvbWUsXG4gICAgICAgICAgICB0aGVuSGFuZGxlcnMgPSBbXTtcblxuICAgICAgICB2YXIgZG9TZXR0bGUgPSBmdW5jdGlvbiAoc2V0dGxlZFN0YXRlLCB2YWx1ZSkge1xuICAgICAgICAgICAgc3RhdGUgPSBzZXR0bGVkU3RhdGU7XG4gICAgICAgICAgICAvLyBwZXJzaXN0IGZvciBoYW5kbGVycyByZWdpc3RlcmVkIGFmdGVyIHNldHRsaW5nXG4gICAgICAgICAgICBvdXRjb21lID0gdmFsdWU7XG5cbiAgICAgICAgICAgIHRoZW5IYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uICh0aGVuKSB7XG4gICAgICAgICAgICAgICAgdGhlbi5oYW5kbGUoc3RhdGUsIG91dGNvbWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIERpc2NhcmQgYWxsIHJlZmVyZW5jZXMgdG8gaGFuZGxlcnMgdG8gYmUgZ2FyYmFnZSBjb2xsZWN0ZWRcbiAgICAgICAgICAgIHRoZW5IYW5kbGVycyA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGRvRnVsZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgZG9TZXR0bGUoRlVMRklMTEVELCB2YWx1ZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGRvUmVqZWN0ID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBkb1NldHRsZShSRUpFQ1RFRCwgZXJyb3IpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByZWdpc3RlclRoZW5IYW5kbGVyID0gZnVuY3Rpb24gKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gICAgICAgICAgICB2YXIgdGhlbkhhbmRsZXIgPSBhVGhlbkhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpO1xuXG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IFBFTkRJTkcpIHtcbiAgICAgICAgICAgICAgICB0aGVuSGFuZGxlcnMucHVzaCh0aGVuSGFuZGxlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoZW5IYW5kbGVyLmhhbmRsZShzdGF0ZSwgb3V0Y29tZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGVuSGFuZGxlci5wcm9taXNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzYWZlbHlSZXNvbHZlVGhlbmFibGUgPSBmdW5jdGlvbiAodGhlbmFibGUpIHtcbiAgICAgICAgICAgIC8vIEVpdGhlciBmdWxmaWxsLCByZWplY3Qgb3IgcmVqZWN0IHdpdGggZXJyb3JcbiAgICAgICAgICAgIHZhciBvbmNlV3JhcHBlciA9IG9uY2UoKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhlbmFibGUoXG4gICAgICAgICAgICAgICAgICAgIG9uY2VXcmFwcGVyKHRyYW5zcGFyZW50bHlSZXNvbHZlVGhlbmFibGVzQW5kU2V0dGxlKSxcbiAgICAgICAgICAgICAgICAgICAgb25jZVdyYXBwZXIoZG9SZWplY3QpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBvbmNlV3JhcHBlcihkb1JlamVjdCkoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHRyYW5zcGFyZW50bHlSZXNvbHZlVGhlbmFibGVzQW5kU2V0dGxlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgdGhlbmFibGU7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhlbmFibGUgPSBnZXRUaGVuYWJsZUlmRXhpc3RzKHZhbHVlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBkb1JlamVjdChlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGVuYWJsZSkge1xuICAgICAgICAgICAgICAgIHNhZmVseVJlc29sdmVUaGVuYWJsZSh0aGVuYWJsZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRvRnVsZmlsbCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIG9uY2VXcmFwcGVyID0gb25jZSgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzb2x2ZTogb25jZVdyYXBwZXIodHJhbnNwYXJlbnRseVJlc29sdmVUaGVuYWJsZXNBbmRTZXR0bGUpLFxuICAgICAgICAgICAgcmVqZWN0OiBvbmNlV3JhcHBlcihkb1JlamVjdCksXG4gICAgICAgICAgICBwcm9taXNlOiB7XG4gICAgICAgICAgICAgICAgdGhlbjogcmVnaXN0ZXJUaGVuSGFuZGxlcixcbiAgICAgICAgICAgICAgICBmYWlsOiBmdW5jdGlvbiAob25SZWplY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVnaXN0ZXJUaGVuSGFuZGxlcihudWxsLCBvblJlamVjdGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHJldHVybiBheWVwcm9taXNlO1xufSkpO1xuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVNfVVJMX1NBRkUgPSAnLScuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0hfVVJMX1NBRkUgPSAnXycuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTIHx8XG5cdFx0ICAgIGNvZGUgPT09IFBMVVNfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIIHx8XG5cdFx0ICAgIGNvZGUgPT09IFNMQVNIX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpc2FycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbnZhciByb290UGFyZW50ID0ge31cblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogRHVlIHRvIHZhcmlvdXMgYnJvd3NlciBidWdzLCBzb21ldGltZXMgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiB3aWxsIGJlIHVzZWQgZXZlblxuICogd2hlbiB0aGUgYnJvd3NlciBzdXBwb3J0cyB0eXBlZCBhcnJheXMuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAgIC0gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLFxuICogICAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAgLSBTYWZhcmkgNS03IGxhY2tzIHN1cHBvcnQgZm9yIGNoYW5naW5nIHRoZSBgT2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3RvcmAgcHJvcGVydHlcbiAqICAgICBvbiBvYmplY3RzLlxuICpcbiAqICAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG5cbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGAgdG8gYGZhbHNlYCBzbyB0aGV5XG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCBiZWhhdmVzIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVCAhPT0gdW5kZWZpbmVkXG4gID8gZ2xvYmFsLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgOiB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgZnVuY3Rpb24gQmFyICgpIHt9XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICBhcnIuY29uc3RydWN0b3IgPSBCYXJcbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MiAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICBhcnIuY29uc3RydWN0b3IgPT09IEJhciAmJiAvLyBjb25zdHJ1Y3RvciBjYW4gYmUgc2V0XG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgJiYgLy8gY2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gICAgICAgIGFyci5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBrTWF4TGVuZ3RoICgpIHtcbiAgcmV0dXJuIEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUXG4gICAgPyAweDdmZmZmZmZmXG4gICAgOiAweDNmZmZmZmZmXG59XG5cbi8qKlxuICogQ2xhc3M6IEJ1ZmZlclxuICogPT09PT09PT09PT09PVxuICpcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgYXJlIGF1Z21lbnRlZFxuICogd2l0aCBmdW5jdGlvbiBwcm9wZXJ0aWVzIGZvciBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgQVBJIGZ1bmN0aW9ucy4gV2UgdXNlXG4gKiBgVWludDhBcnJheWAgc28gdGhhdCBzcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdCByZXR1cm5zXG4gKiBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBCeSBhdWdtZW50aW5nIHRoZSBpbnN0YW5jZXMsIHdlIGNhbiBhdm9pZCBtb2RpZnlpbmcgdGhlIGBVaW50OEFycmF5YFxuICogcHJvdG90eXBlLlxuICovXG5mdW5jdGlvbiBCdWZmZXIgKGFyZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSkge1xuICAgIC8vIEF2b2lkIGdvaW5nIHRocm91Z2ggYW4gQXJndW1lbnRzQWRhcHRvclRyYW1wb2xpbmUgaW4gdGhlIGNvbW1vbiBjYXNlLlxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkgcmV0dXJuIG5ldyBCdWZmZXIoYXJnLCBhcmd1bWVudHNbMV0pXG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoYXJnKVxuICB9XG5cbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXMubGVuZ3RoID0gMFxuICAgIHRoaXMucGFyZW50ID0gdW5kZWZpbmVkXG4gIH1cblxuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIGZyb21OdW1iZXIodGhpcywgYXJnKVxuICB9XG5cbiAgLy8gU2xpZ2h0bHkgbGVzcyBjb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodGhpcywgYXJnLCBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6ICd1dGY4JylcbiAgfVxuXG4gIC8vIFVudXN1YWwuXG4gIHJldHVybiBmcm9tT2JqZWN0KHRoaXMsIGFyZylcbn1cblxuZnVuY3Rpb24gZnJvbU51bWJlciAodGhhdCwgbGVuZ3RoKSB7XG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGggPCAwID8gMCA6IGNoZWNrZWQobGVuZ3RoKSB8IDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGF0W2ldID0gMFxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nICh0aGF0LCBzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykgZW5jb2RpbmcgPSAndXRmOCdcblxuICAvLyBBc3N1bXB0aW9uOiBieXRlTGVuZ3RoKCkgcmV0dXJuIHZhbHVlIGlzIGFsd2F5cyA8IGtNYXhMZW5ndGguXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuXG4gIHRoYXQud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAodGhhdCwgb2JqZWN0KSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqZWN0KSkgcmV0dXJuIGZyb21CdWZmZXIodGhhdCwgb2JqZWN0KVxuXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHJldHVybiBmcm9tQXJyYXkodGhhdCwgb2JqZWN0KVxuXG4gIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3RhcnQgd2l0aCBudW1iZXIsIGJ1ZmZlciwgYXJyYXkgb3Igc3RyaW5nJylcbiAgfVxuXG4gIGlmICh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKG9iamVjdC5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgcmV0dXJuIGZyb21UeXBlZEFycmF5KHRoYXQsIG9iamVjdClcbiAgICB9XG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHRoYXQsIG9iamVjdClcbiAgICB9XG4gIH1cblxuICBpZiAob2JqZWN0Lmxlbmd0aCkgcmV0dXJuIGZyb21BcnJheUxpa2UodGhhdCwgb2JqZWN0KVxuXG4gIHJldHVybiBmcm9tSnNvbk9iamVjdCh0aGF0LCBvYmplY3QpXG59XG5cbmZ1bmN0aW9uIGZyb21CdWZmZXIgKHRoYXQsIGJ1ZmZlcikge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChidWZmZXIubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgYnVmZmVyLmNvcHkodGhhdCwgMCwgMCwgbGVuZ3RoKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXkgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vLyBEdXBsaWNhdGUgb2YgZnJvbUFycmF5KCkgdG8ga2VlcCBmcm9tQXJyYXkoKSBtb25vbW9ycGhpYy5cbmZ1bmN0aW9uIGZyb21UeXBlZEFycmF5ICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICAvLyBUcnVuY2F0aW5nIHRoZSBlbGVtZW50cyBpcyBwcm9iYWJseSBub3Qgd2hhdCBwZW9wbGUgZXhwZWN0IGZyb20gdHlwZWRcbiAgLy8gYXJyYXlzIHdpdGggQllURVNfUEVSX0VMRU1FTlQgPiAxIGJ1dCBpdCdzIGNvbXBhdGlibGUgd2l0aCB0aGUgYmVoYXZpb3JcbiAgLy8gb2YgdGhlIG9sZCBCdWZmZXIgY29uc3RydWN0b3IuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKHRoYXQsIGFycmF5KSB7XG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGFycmF5LmJ5dGVMZW5ndGhcbiAgICB0aGF0ID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGFycmF5KSlcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIGFuIG9iamVjdCBpbnN0YW5jZSBvZiB0aGUgQnVmZmVyIGNsYXNzXG4gICAgdGhhdCA9IGZyb21UeXBlZEFycmF5KHRoYXQsIG5ldyBVaW50OEFycmF5KGFycmF5KSlcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuLy8gRGVzZXJpYWxpemUgeyB0eXBlOiAnQnVmZmVyJywgZGF0YTogWzEsMiwzLC4uLl0gfSBpbnRvIGEgQnVmZmVyIG9iamVjdC5cbi8vIFJldHVybnMgYSB6ZXJvLWxlbmd0aCBidWZmZXIgZm9yIGlucHV0cyB0aGF0IGRvbid0IGNvbmZvcm0gdG8gdGhlIHNwZWMuXG5mdW5jdGlvbiBmcm9tSnNvbk9iamVjdCAodGhhdCwgb2JqZWN0KSB7XG4gIHZhciBhcnJheVxuICB2YXIgbGVuZ3RoID0gMFxuXG4gIGlmIChvYmplY3QudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShvYmplY3QuZGF0YSkpIHtcbiAgICBhcnJheSA9IG9iamVjdC5kYXRhXG4gICAgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB9XG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICBCdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG4gIEJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG59IGVsc2Uge1xuICAvLyBwcmUtc2V0IGZvciB2YWx1ZXMgdGhhdCBtYXkgZXhpc3QgaW4gdGhlIGZ1dHVyZVxuICBCdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuICBCdWZmZXIucHJvdG90eXBlLnBhcmVudCA9IHVuZGVmaW5lZFxufVxuXG5mdW5jdGlvbiBhbGxvY2F0ZSAodGhhdCwgbGVuZ3RoKSB7XG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIHRoYXQgPSBCdWZmZXIuX2F1Z21lbnQobmV3IFVpbnQ4QXJyYXkobGVuZ3RoKSlcbiAgICB0aGF0Ll9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIGFuIG9iamVjdCBpbnN0YW5jZSBvZiB0aGUgQnVmZmVyIGNsYXNzXG4gICAgdGhhdC5sZW5ndGggPSBsZW5ndGhcbiAgICB0aGF0Ll9pc0J1ZmZlciA9IHRydWVcbiAgfVxuXG4gIHZhciBmcm9tUG9vbCA9IGxlbmd0aCAhPT0gMCAmJiBsZW5ndGggPD0gQnVmZmVyLnBvb2xTaXplID4+PiAxXG4gIGlmIChmcm9tUG9vbCkgdGhhdC5wYXJlbnQgPSByb290UGFyZW50XG5cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IGtNYXhMZW5ndGhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0ga01heExlbmd0aCgpKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgoKS50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2xvd0J1ZmZlcikpIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcbiAgZGVsZXRlIGJ1Zi5wYXJlbnRcbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgdmFyIGkgPSAwXG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSBicmVha1xuXG4gICAgKytpXG4gIH1cblxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0IGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycy4nKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykgc3RyaW5nID0gJycgKyBzdHJpbmdcblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIC8vIERlcHJlY2F0ZWRcbiAgICAgIGNhc2UgJ3Jhdyc6XG4gICAgICBjYXNlICdyYXdzJzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuQnVmZmVyLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5cbmZ1bmN0aW9uIHNsb3dUb1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICBzdGFydCA9IHN0YXJ0IHwgMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPT09IEluZmluaXR5ID8gdGhpcy5sZW5ndGggOiBlbmQgfCAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCB8IDBcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiAwXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSByZXR1cm4gLTEgLy8gc3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcgYWx3YXlzIGZhaWxzXG4gICAgcmV0dXJuIFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgWyB2YWwgXSwgYnl0ZU9mZnNldClcbiAgfVxuXG4gIGZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yICh2YXIgaSA9IDA7IGJ5dGVPZmZzZXQgKyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyW2J5dGVPZmZzZXQgKyBpXSA9PT0gdmFsW2ZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4XSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbC5sZW5ndGgpIHJldHVybiBieXRlT2Zmc2V0ICsgZm91bmRJbmRleFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuLy8gYGdldGAgaXMgZGVwcmVjYXRlZFxuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQgKG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLmdldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMucmVhZFVJbnQ4KG9mZnNldClcbn1cblxuLy8gYHNldGAgaXMgZGVwcmVjYXRlZFxuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQgKHYsIG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLnNldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMud3JpdGVVSW50OCh2LCBvZmZzZXQpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAoaXNOYU4ocGFyc2VkKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggfCAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgLy8gbGVnYWN5IHdyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKSAtIHJlbW92ZSBpbiB2MC4xM1xuICB9IGVsc2Uge1xuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aCB8IDBcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignYXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2kgKyAxXSAqIDI1NilcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIG5ld0J1ZiA9IEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9XG5cbiAgaWYgKG5ld0J1Zi5sZW5ndGgpIG5ld0J1Zi5wYXJlbnQgPSB0aGlzLnBhcmVudCB8fCB0aGlzXG5cbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdidWZmZXIgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3ZhbHVlIGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpLCAwKVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpLCAwKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gdmFsdWUgPCAwID8gMSA6IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gd3JpdGVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG4gIHZhciBpXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yIChpID0gbGVuIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2UgaWYgKGxlbiA8IDEwMDAgfHwgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gYXNjZW5kaW5nIGNvcHkgZnJvbSBzdGFydFxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRTdGFydClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gZmlsbCh2YWx1ZSwgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWx1ZSwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXZhbHVlKSB2YWx1ZSA9IDBcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kKSBlbmQgPSB0aGlzLmxlbmd0aFxuXG4gIGlmIChlbmQgPCBzdGFydCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCA8IHN0YXJ0JylcblxuICAvLyBGaWxsIDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDAgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdlbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gdmFsdWVcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gdXRmOFRvQnl0ZXModmFsdWUudG9TdHJpbmcoKSlcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGBBcnJheUJ1ZmZlcmAgd2l0aCB0aGUgKmNvcGllZCogbWVtb3J5IG9mIHRoZSBidWZmZXIgaW5zdGFuY2UuXG4gKiBBZGRlZCBpbiBOb2RlIDAuMTIuIE9ubHkgYXZhaWxhYmxlIGluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBBcnJheUJ1ZmZlci5cbiAqL1xuQnVmZmVyLnByb3RvdHlwZS50b0FycmF5QnVmZmVyID0gZnVuY3Rpb24gdG9BcnJheUJ1ZmZlciAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAgIHJldHVybiAobmV3IEJ1ZmZlcih0aGlzKSkuYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLmxlbmd0aClcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgfVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQnVmZmVyLnRvQXJyYXlCdWZmZXIgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKVxuICB9XG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIEJQID0gQnVmZmVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEF1Z21lbnQgYSBVaW50OEFycmF5ICppbnN0YW5jZSogKG5vdCB0aGUgVWludDhBcnJheSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAqL1xuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gX2F1Z21lbnQgKGFycikge1xuICBhcnIuY29uc3RydWN0b3IgPSBCdWZmZXJcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IHNldCBtZXRob2QgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWRcbiAgYXJyLmdldCA9IEJQLmdldFxuICBhcnIuc2V0ID0gQlAuc2V0XG5cbiAgYXJyLndyaXRlID0gQlAud3JpdGVcbiAgYXJyLnRvU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvTG9jYWxlU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvSlNPTiA9IEJQLnRvSlNPTlxuICBhcnIuZXF1YWxzID0gQlAuZXF1YWxzXG4gIGFyci5jb21wYXJlID0gQlAuY29tcGFyZVxuICBhcnIuaW5kZXhPZiA9IEJQLmluZGV4T2ZcbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludExFID0gQlAucmVhZFVJbnRMRVxuICBhcnIucmVhZFVJbnRCRSA9IEJQLnJlYWRVSW50QkVcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50TEUgPSBCUC5yZWFkSW50TEVcbiAgYXJyLnJlYWRJbnRCRSA9IEJQLnJlYWRJbnRCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnRMRSA9IEJQLndyaXRlVUludExFXG4gIGFyci53cml0ZVVJbnRCRSA9IEJQLndyaXRlVUludEJFXG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnRMRSA9IEJQLndyaXRlSW50TEVcbiAgYXJyLndyaXRlSW50QkUgPSBCUC53cml0ZUludEJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG4iLCJ2YXIgdG9TdHJpbmcgPSB7fS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsInZhciBjbG9uZSA9IChmdW5jdGlvbigpIHtcbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBDbG9uZXMgKGNvcGllcykgYW4gT2JqZWN0IHVzaW5nIGRlZXAgY29weWluZy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHN1cHBvcnRzIGNpcmN1bGFyIHJlZmVyZW5jZXMgYnkgZGVmYXVsdCwgYnV0IGlmIHlvdSBhcmUgY2VydGFpblxuICogdGhlcmUgYXJlIG5vIGNpcmN1bGFyIHJlZmVyZW5jZXMgaW4geW91ciBvYmplY3QsIHlvdSBjYW4gc2F2ZSBzb21lIENQVSB0aW1lXG4gKiBieSBjYWxsaW5nIGNsb25lKG9iaiwgZmFsc2UpLlxuICpcbiAqIENhdXRpb246IGlmIGBjaXJjdWxhcmAgaXMgZmFsc2UgYW5kIGBwYXJlbnRgIGNvbnRhaW5zIGNpcmN1bGFyIHJlZmVyZW5jZXMsXG4gKiB5b3VyIHByb2dyYW0gbWF5IGVudGVyIGFuIGluZmluaXRlIGxvb3AgYW5kIGNyYXNoLlxuICpcbiAqIEBwYXJhbSBgcGFyZW50YCAtIHRoZSBvYmplY3QgdG8gYmUgY2xvbmVkXG4gKiBAcGFyYW0gYGNpcmN1bGFyYCAtIHNldCB0byB0cnVlIGlmIHRoZSBvYmplY3QgdG8gYmUgY2xvbmVkIG1heSBjb250YWluXG4gKiAgICBjaXJjdWxhciByZWZlcmVuY2VzLiAob3B0aW9uYWwgLSB0cnVlIGJ5IGRlZmF1bHQpXG4gKiBAcGFyYW0gYGRlcHRoYCAtIHNldCB0byBhIG51bWJlciBpZiB0aGUgb2JqZWN0IGlzIG9ubHkgdG8gYmUgY2xvbmVkIHRvXG4gKiAgICBhIHBhcnRpY3VsYXIgZGVwdGguIChvcHRpb25hbCAtIGRlZmF1bHRzIHRvIEluZmluaXR5KVxuICogQHBhcmFtIGBwcm90b3R5cGVgIC0gc2V0cyB0aGUgcHJvdG90eXBlIHRvIGJlIHVzZWQgd2hlbiBjbG9uaW5nIGFuIG9iamVjdC5cbiAqICAgIChvcHRpb25hbCAtIGRlZmF1bHRzIHRvIHBhcmVudCBwcm90b3R5cGUpLlxuKi9cbmZ1bmN0aW9uIGNsb25lKHBhcmVudCwgY2lyY3VsYXIsIGRlcHRoLCBwcm90b3R5cGUpIHtcbiAgdmFyIGZpbHRlcjtcbiAgaWYgKHR5cGVvZiBjaXJjdWxhciA9PT0gJ29iamVjdCcpIHtcbiAgICBkZXB0aCA9IGNpcmN1bGFyLmRlcHRoO1xuICAgIHByb3RvdHlwZSA9IGNpcmN1bGFyLnByb3RvdHlwZTtcbiAgICBmaWx0ZXIgPSBjaXJjdWxhci5maWx0ZXI7XG4gICAgY2lyY3VsYXIgPSBjaXJjdWxhci5jaXJjdWxhclxuICB9XG4gIC8vIG1haW50YWluIHR3byBhcnJheXMgZm9yIGNpcmN1bGFyIHJlZmVyZW5jZXMsIHdoZXJlIGNvcnJlc3BvbmRpbmcgcGFyZW50c1xuICAvLyBhbmQgY2hpbGRyZW4gaGF2ZSB0aGUgc2FtZSBpbmRleFxuICB2YXIgYWxsUGFyZW50cyA9IFtdO1xuICB2YXIgYWxsQ2hpbGRyZW4gPSBbXTtcblxuICB2YXIgdXNlQnVmZmVyID0gdHlwZW9mIEJ1ZmZlciAhPSAndW5kZWZpbmVkJztcblxuICBpZiAodHlwZW9mIGNpcmN1bGFyID09ICd1bmRlZmluZWQnKVxuICAgIGNpcmN1bGFyID0gdHJ1ZTtcblxuICBpZiAodHlwZW9mIGRlcHRoID09ICd1bmRlZmluZWQnKVxuICAgIGRlcHRoID0gSW5maW5pdHk7XG5cbiAgLy8gcmVjdXJzZSB0aGlzIGZ1bmN0aW9uIHNvIHdlIGRvbid0IHJlc2V0IGFsbFBhcmVudHMgYW5kIGFsbENoaWxkcmVuXG4gIGZ1bmN0aW9uIF9jbG9uZShwYXJlbnQsIGRlcHRoKSB7XG4gICAgLy8gY2xvbmluZyBudWxsIGFsd2F5cyByZXR1cm5zIG51bGxcbiAgICBpZiAocGFyZW50ID09PSBudWxsKVxuICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICBpZiAoZGVwdGggPT0gMClcbiAgICAgIHJldHVybiBwYXJlbnQ7XG5cbiAgICB2YXIgY2hpbGQ7XG4gICAgdmFyIHByb3RvO1xuICAgIGlmICh0eXBlb2YgcGFyZW50ICE9ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gcGFyZW50O1xuICAgIH1cblxuICAgIGlmIChjbG9uZS5fX2lzQXJyYXkocGFyZW50KSkge1xuICAgICAgY2hpbGQgPSBbXTtcbiAgICB9IGVsc2UgaWYgKGNsb25lLl9faXNSZWdFeHAocGFyZW50KSkge1xuICAgICAgY2hpbGQgPSBuZXcgUmVnRXhwKHBhcmVudC5zb3VyY2UsIF9fZ2V0UmVnRXhwRmxhZ3MocGFyZW50KSk7XG4gICAgICBpZiAocGFyZW50Lmxhc3RJbmRleCkgY2hpbGQubGFzdEluZGV4ID0gcGFyZW50Lmxhc3RJbmRleDtcbiAgICB9IGVsc2UgaWYgKGNsb25lLl9faXNEYXRlKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IERhdGUocGFyZW50LmdldFRpbWUoKSk7XG4gICAgfSBlbHNlIGlmICh1c2VCdWZmZXIgJiYgQnVmZmVyLmlzQnVmZmVyKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IEJ1ZmZlcihwYXJlbnQubGVuZ3RoKTtcbiAgICAgIHBhcmVudC5jb3B5KGNoaWxkKTtcbiAgICAgIHJldHVybiBjaGlsZDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBwcm90b3R5cGUgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocGFyZW50KTtcbiAgICAgICAgY2hpbGQgPSBPYmplY3QuY3JlYXRlKHByb3RvKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjaGlsZCA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlKTtcbiAgICAgICAgcHJvdG8gPSBwcm90b3R5cGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNpcmN1bGFyKSB7XG4gICAgICB2YXIgaW5kZXggPSBhbGxQYXJlbnRzLmluZGV4T2YocGFyZW50KTtcblxuICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgIHJldHVybiBhbGxDaGlsZHJlbltpbmRleF07XG4gICAgICB9XG4gICAgICBhbGxQYXJlbnRzLnB1c2gocGFyZW50KTtcbiAgICAgIGFsbENoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgaW4gcGFyZW50KSB7XG4gICAgICB2YXIgYXR0cnM7XG4gICAgICBpZiAocHJvdG8pIHtcbiAgICAgICAgYXR0cnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHByb3RvLCBpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGF0dHJzICYmIGF0dHJzLnNldCA9PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY2hpbGRbaV0gPSBfY2xvbmUocGFyZW50W2ldLCBkZXB0aCAtIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBjaGlsZDtcbiAgfVxuXG4gIHJldHVybiBfY2xvbmUocGFyZW50LCBkZXB0aCk7XG59XG5cbi8qKlxuICogU2ltcGxlIGZsYXQgY2xvbmUgdXNpbmcgcHJvdG90eXBlLCBhY2NlcHRzIG9ubHkgb2JqZWN0cywgdXNlZnVsbCBmb3IgcHJvcGVydHlcbiAqIG92ZXJyaWRlIG9uIEZMQVQgY29uZmlndXJhdGlvbiBvYmplY3QgKG5vIG5lc3RlZCBwcm9wcykuXG4gKlxuICogVVNFIFdJVEggQ0FVVElPTiEgVGhpcyBtYXkgbm90IGJlaGF2ZSBhcyB5b3Ugd2lzaCBpZiB5b3UgZG8gbm90IGtub3cgaG93IHRoaXNcbiAqIHdvcmtzLlxuICovXG5jbG9uZS5jbG9uZVByb3RvdHlwZSA9IGZ1bmN0aW9uIGNsb25lUHJvdG90eXBlKHBhcmVudCkge1xuICBpZiAocGFyZW50ID09PSBudWxsKVxuICAgIHJldHVybiBudWxsO1xuXG4gIHZhciBjID0gZnVuY3Rpb24gKCkge307XG4gIGMucHJvdG90eXBlID0gcGFyZW50O1xuICByZXR1cm4gbmV3IGMoKTtcbn07XG5cbi8vIHByaXZhdGUgdXRpbGl0eSBmdW5jdGlvbnNcblxuZnVuY3Rpb24gX19vYmpUb1N0cihvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59O1xuY2xvbmUuX19vYmpUb1N0ciA9IF9fb2JqVG9TdHI7XG5cbmZ1bmN0aW9uIF9faXNEYXRlKG8pIHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiBfX29ialRvU3RyKG8pID09PSAnW29iamVjdCBEYXRlXSc7XG59O1xuY2xvbmUuX19pc0RhdGUgPSBfX2lzRGF0ZTtcblxuZnVuY3Rpb24gX19pc0FycmF5KG8pIHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiBfX29ialRvU3RyKG8pID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcbmNsb25lLl9faXNBcnJheSA9IF9faXNBcnJheTtcblxuZnVuY3Rpb24gX19pc1JlZ0V4cChvKSB7XG4gIHJldHVybiB0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgX19vYmpUb1N0cihvKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59O1xuY2xvbmUuX19pc1JlZ0V4cCA9IF9faXNSZWdFeHA7XG5cbmZ1bmN0aW9uIF9fZ2V0UmVnRXhwRmxhZ3MocmUpIHtcbiAgdmFyIGZsYWdzID0gJyc7XG4gIGlmIChyZS5nbG9iYWwpIGZsYWdzICs9ICdnJztcbiAgaWYgKHJlLmlnbm9yZUNhc2UpIGZsYWdzICs9ICdpJztcbiAgaWYgKHJlLm11bHRpbGluZSkgZmxhZ3MgKz0gJ20nO1xuICByZXR1cm4gZmxhZ3M7XG59O1xuY2xvbmUuX19nZXRSZWdFeHBGbGFncyA9IF9fZ2V0UmVnRXhwRmxhZ3M7XG5cbnJldHVybiBjbG9uZTtcbn0pKCk7XG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKSB7XG4gIC8qXG4gICAqIEdlbmVyYXRlZCBieSBQRUcuanMgMC44LjAuXG4gICAqXG4gICAqIGh0dHA6Ly9wZWdqcy5tYWpkYS5jei9cbiAgICovXG5cbiAgZnVuY3Rpb24gcGVnJHN1YmNsYXNzKGNoaWxkLCBwYXJlbnQpIHtcbiAgICBmdW5jdGlvbiBjdG9yKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH1cbiAgICBjdG9yLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgY2hpbGQucHJvdG90eXBlID0gbmV3IGN0b3IoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIFN5bnRheEVycm9yKG1lc3NhZ2UsIGV4cGVjdGVkLCBmb3VuZCwgb2Zmc2V0LCBsaW5lLCBjb2x1bW4pIHtcbiAgICB0aGlzLm1lc3NhZ2UgID0gbWVzc2FnZTtcbiAgICB0aGlzLmV4cGVjdGVkID0gZXhwZWN0ZWQ7XG4gICAgdGhpcy5mb3VuZCAgICA9IGZvdW5kO1xuICAgIHRoaXMub2Zmc2V0ICAgPSBvZmZzZXQ7XG4gICAgdGhpcy5saW5lICAgICA9IGxpbmU7XG4gICAgdGhpcy5jb2x1bW4gICA9IGNvbHVtbjtcblxuICAgIHRoaXMubmFtZSAgICAgPSBcIlN5bnRheEVycm9yXCI7XG4gIH1cblxuICBwZWckc3ViY2xhc3MoU3ludGF4RXJyb3IsIEVycm9yKTtcblxuICBmdW5jdGlvbiBwYXJzZShpbnB1dCkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB7fSxcblxuICAgICAgICBwZWckRkFJTEVEID0ge30sXG5cbiAgICAgICAgcGVnJHN0YXJ0UnVsZUZ1bmN0aW9ucyA9IHsgc3RhcnQ6IHBlZyRwYXJzZXN0YXJ0IH0sXG4gICAgICAgIHBlZyRzdGFydFJ1bGVGdW5jdGlvbiAgPSBwZWckcGFyc2VzdGFydCxcblxuICAgICAgICBwZWckYzAgPSBbXSxcbiAgICAgICAgcGVnJGMxID0gZnVuY3Rpb24oKSB7IHJldHVybiBbXX0sXG4gICAgICAgIHBlZyRjMiA9IHBlZyRGQUlMRUQsXG4gICAgICAgIHBlZyRjMyA9IFwiLFwiLFxuICAgICAgICBwZWckYzQgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCIsXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCIsXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjNSA9IGZ1bmN0aW9uKHgsIHhzKSB7IHJldHVybiBbeF0uY29uY2F0KHhzKTsgfSxcbiAgICAgICAgcGVnJGM2ID0gZnVuY3Rpb24oZW50cnkpIHsgcmV0dXJuIFtlbnRyeV07IH0sXG4gICAgICAgIHBlZyRjNyA9IGZ1bmN0aW9uKHVybCwgZm9ybWF0KSB7IHJldHVybiB7dXJsOiB1cmwsIGZvcm1hdDogZm9ybWF0fTsgfSxcbiAgICAgICAgcGVnJGM4ID0gZnVuY3Rpb24odXJsKSB7IHJldHVybiB7dXJsOiB1cmx9OyB9LFxuICAgICAgICBwZWckYzkgPSBcInVybChcIixcbiAgICAgICAgcGVnJGMxMCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcInVybChcIiwgZGVzY3JpcHRpb246IFwiXFxcInVybChcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxMSA9IFwiKVwiLFxuICAgICAgICBwZWckYzEyID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiKVwiLCBkZXNjcmlwdGlvbjogXCJcXFwiKVxcXCJcIiB9LFxuICAgICAgICBwZWckYzEzID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9LFxuICAgICAgICBwZWckYzE0ID0gXCJmb3JtYXQoXCIsXG4gICAgICAgIHBlZyRjMTUgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJmb3JtYXQoXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJmb3JtYXQoXFxcIlwiIH0sXG4gICAgICAgIHBlZyRjMTYgPSBcImxvY2FsKFwiLFxuICAgICAgICBwZWckYzE3ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwibG9jYWwoXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJsb2NhbChcXFwiXCIgfSxcbiAgICAgICAgcGVnJGMxOCA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB7bG9jYWw6IHZhbHVlfTsgfSxcbiAgICAgICAgcGVnJGMxOSA9IC9eW14pXS8sXG4gICAgICAgIHBlZyRjMjAgPSB7IHR5cGU6IFwiY2xhc3NcIiwgdmFsdWU6IFwiW14pXVwiLCBkZXNjcmlwdGlvbjogXCJbXildXCIgfSxcbiAgICAgICAgcGVnJGMyMSA9IGZ1bmN0aW9uKGNoYXJzKSB7IHJldHVybiB1dGlsLmV4dHJhY3RWYWx1ZShjaGFycy5qb2luKFwiXCIpKTsgfSxcbiAgICAgICAgcGVnJGMyMiA9IC9eWyBcXHRcXHJcXG5cXGZdLyxcbiAgICAgICAgcGVnJGMyMyA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbIFxcXFx0XFxcXHJcXFxcblxcXFxmXVwiLCBkZXNjcmlwdGlvbjogXCJbIFxcXFx0XFxcXHJcXFxcblxcXFxmXVwiIH0sXG5cbiAgICAgICAgcGVnJGN1cnJQb3MgICAgICAgICAgPSAwLFxuICAgICAgICBwZWckcmVwb3J0ZWRQb3MgICAgICA9IDAsXG4gICAgICAgIHBlZyRjYWNoZWRQb3MgICAgICAgID0gMCxcbiAgICAgICAgcGVnJGNhY2hlZFBvc0RldGFpbHMgPSB7IGxpbmU6IDEsIGNvbHVtbjogMSwgc2VlbkNSOiBmYWxzZSB9LFxuICAgICAgICBwZWckbWF4RmFpbFBvcyAgICAgICA9IDAsXG4gICAgICAgIHBlZyRtYXhGYWlsRXhwZWN0ZWQgID0gW10sXG4gICAgICAgIHBlZyRzaWxlbnRGYWlscyAgICAgID0gMCxcblxuICAgICAgICBwZWckcmVzdWx0O1xuXG4gICAgaWYgKFwic3RhcnRSdWxlXCIgaW4gb3B0aW9ucykge1xuICAgICAgaWYgKCEob3B0aW9ucy5zdGFydFJ1bGUgaW4gcGVnJHN0YXJ0UnVsZUZ1bmN0aW9ucykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgc3RhcnQgcGFyc2luZyBmcm9tIHJ1bGUgXFxcIlwiICsgb3B0aW9ucy5zdGFydFJ1bGUgKyBcIlxcXCIuXCIpO1xuICAgICAgfVxuXG4gICAgICBwZWckc3RhcnRSdWxlRnVuY3Rpb24gPSBwZWckc3RhcnRSdWxlRnVuY3Rpb25zW29wdGlvbnMuc3RhcnRSdWxlXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0ZXh0KCkge1xuICAgICAgcmV0dXJuIGlucHV0LnN1YnN0cmluZyhwZWckcmVwb3J0ZWRQb3MsIHBlZyRjdXJyUG9zKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvZmZzZXQoKSB7XG4gICAgICByZXR1cm4gcGVnJHJlcG9ydGVkUG9zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpbmUoKSB7XG4gICAgICByZXR1cm4gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBlZyRyZXBvcnRlZFBvcykubGluZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb2x1bW4oKSB7XG4gICAgICByZXR1cm4gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBlZyRyZXBvcnRlZFBvcykuY29sdW1uO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4cGVjdGVkKGRlc2NyaXB0aW9uKSB7XG4gICAgICB0aHJvdyBwZWckYnVpbGRFeGNlcHRpb24oXG4gICAgICAgIG51bGwsXG4gICAgICAgIFt7IHR5cGU6IFwib3RoZXJcIiwgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uIH1dLFxuICAgICAgICBwZWckcmVwb3J0ZWRQb3NcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXJyb3IobWVzc2FnZSkge1xuICAgICAgdGhyb3cgcGVnJGJ1aWxkRXhjZXB0aW9uKG1lc3NhZ2UsIG51bGwsIHBlZyRyZXBvcnRlZFBvcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBvcykge1xuICAgICAgZnVuY3Rpb24gYWR2YW5jZShkZXRhaWxzLCBzdGFydFBvcywgZW5kUG9zKSB7XG4gICAgICAgIHZhciBwLCBjaDtcblxuICAgICAgICBmb3IgKHAgPSBzdGFydFBvczsgcCA8IGVuZFBvczsgcCsrKSB7XG4gICAgICAgICAgY2ggPSBpbnB1dC5jaGFyQXQocCk7XG4gICAgICAgICAgaWYgKGNoID09PSBcIlxcblwiKSB7XG4gICAgICAgICAgICBpZiAoIWRldGFpbHMuc2VlbkNSKSB7IGRldGFpbHMubGluZSsrOyB9XG4gICAgICAgICAgICBkZXRhaWxzLmNvbHVtbiA9IDE7XG4gICAgICAgICAgICBkZXRhaWxzLnNlZW5DUiA9IGZhbHNlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09IFwiXFxyXCIgfHwgY2ggPT09IFwiXFx1MjAyOFwiIHx8IGNoID09PSBcIlxcdTIwMjlcIikge1xuICAgICAgICAgICAgZGV0YWlscy5saW5lKys7XG4gICAgICAgICAgICBkZXRhaWxzLmNvbHVtbiA9IDE7XG4gICAgICAgICAgICBkZXRhaWxzLnNlZW5DUiA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRldGFpbHMuY29sdW1uKys7XG4gICAgICAgICAgICBkZXRhaWxzLnNlZW5DUiA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAocGVnJGNhY2hlZFBvcyAhPT0gcG9zKSB7XG4gICAgICAgIGlmIChwZWckY2FjaGVkUG9zID4gcG9zKSB7XG4gICAgICAgICAgcGVnJGNhY2hlZFBvcyA9IDA7XG4gICAgICAgICAgcGVnJGNhY2hlZFBvc0RldGFpbHMgPSB7IGxpbmU6IDEsIGNvbHVtbjogMSwgc2VlbkNSOiBmYWxzZSB9O1xuICAgICAgICB9XG4gICAgICAgIGFkdmFuY2UocGVnJGNhY2hlZFBvc0RldGFpbHMsIHBlZyRjYWNoZWRQb3MsIHBvcyk7XG4gICAgICAgIHBlZyRjYWNoZWRQb3MgPSBwb3M7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwZWckY2FjaGVkUG9zRGV0YWlscztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckZmFpbChleHBlY3RlZCkge1xuICAgICAgaWYgKHBlZyRjdXJyUG9zIDwgcGVnJG1heEZhaWxQb3MpIHsgcmV0dXJuOyB9XG5cbiAgICAgIGlmIChwZWckY3VyclBvcyA+IHBlZyRtYXhGYWlsUG9zKSB7XG4gICAgICAgIHBlZyRtYXhGYWlsUG9zID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHBlZyRtYXhGYWlsRXhwZWN0ZWQgPSBbXTtcbiAgICAgIH1cblxuICAgICAgcGVnJG1heEZhaWxFeHBlY3RlZC5wdXNoKGV4cGVjdGVkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckYnVpbGRFeGNlcHRpb24obWVzc2FnZSwgZXhwZWN0ZWQsIHBvcykge1xuICAgICAgZnVuY3Rpb24gY2xlYW51cEV4cGVjdGVkKGV4cGVjdGVkKSB7XG4gICAgICAgIHZhciBpID0gMTtcblxuICAgICAgICBleHBlY3RlZC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICBpZiAoYS5kZXNjcmlwdGlvbiA8IGIuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGEuZGVzY3JpcHRpb24gPiBiLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB3aGlsZSAoaSA8IGV4cGVjdGVkLmxlbmd0aCkge1xuICAgICAgICAgIGlmIChleHBlY3RlZFtpIC0gMV0gPT09IGV4cGVjdGVkW2ldKSB7XG4gICAgICAgICAgICBleHBlY3RlZC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gYnVpbGRNZXNzYWdlKGV4cGVjdGVkLCBmb3VuZCkge1xuICAgICAgICBmdW5jdGlvbiBzdHJpbmdFc2NhcGUocykge1xuICAgICAgICAgIGZ1bmN0aW9uIGhleChjaCkgeyByZXR1cm4gY2guY2hhckNvZGVBdCgwKS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTsgfVxuXG4gICAgICAgICAgcmV0dXJuIHNcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcL2csICAgJ1xcXFxcXFxcJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAgICAnXFxcXFwiJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHgwOC9nLCAnXFxcXGInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAgICdcXFxcdCcpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxuL2csICAgJ1xcXFxuJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXGYvZywgICAnXFxcXGYnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAgICdcXFxccicpXG4gICAgICAgICAgICAucmVwbGFjZSgvW1xceDAwLVxceDA3XFx4MEJcXHgwRVxceDBGXS9nLCBmdW5jdGlvbihjaCkgeyByZXR1cm4gJ1xcXFx4MCcgKyBoZXgoY2gpOyB9KVxuICAgICAgICAgICAgLnJlcGxhY2UoL1tcXHgxMC1cXHgxRlxceDgwLVxceEZGXS9nLCAgICBmdW5jdGlvbihjaCkgeyByZXR1cm4gJ1xcXFx4JyAgKyBoZXgoY2gpOyB9KVxuICAgICAgICAgICAgLnJlcGxhY2UoL1tcXHUwMTgwLVxcdTBGRkZdL2csICAgICAgICAgZnVuY3Rpb24oY2gpIHsgcmV0dXJuICdcXFxcdTAnICsgaGV4KGNoKTsgfSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC9bXFx1MTA4MC1cXHVGRkZGXS9nLCAgICAgICAgIGZ1bmN0aW9uKGNoKSB7IHJldHVybiAnXFxcXHUnICArIGhleChjaCk7IH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGV4cGVjdGVkRGVzY3MgPSBuZXcgQXJyYXkoZXhwZWN0ZWQubGVuZ3RoKSxcbiAgICAgICAgICAgIGV4cGVjdGVkRGVzYywgZm91bmREZXNjLCBpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBleHBlY3RlZC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGV4cGVjdGVkRGVzY3NbaV0gPSBleHBlY3RlZFtpXS5kZXNjcmlwdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdGVkRGVzYyA9IGV4cGVjdGVkLmxlbmd0aCA+IDFcbiAgICAgICAgICA/IGV4cGVjdGVkRGVzY3Muc2xpY2UoMCwgLTEpLmpvaW4oXCIsIFwiKVxuICAgICAgICAgICAgICArIFwiIG9yIFwiXG4gICAgICAgICAgICAgICsgZXhwZWN0ZWREZXNjc1tleHBlY3RlZC5sZW5ndGggLSAxXVxuICAgICAgICAgIDogZXhwZWN0ZWREZXNjc1swXTtcblxuICAgICAgICBmb3VuZERlc2MgPSBmb3VuZCA/IFwiXFxcIlwiICsgc3RyaW5nRXNjYXBlKGZvdW5kKSArIFwiXFxcIlwiIDogXCJlbmQgb2YgaW5wdXRcIjtcblxuICAgICAgICByZXR1cm4gXCJFeHBlY3RlZCBcIiArIGV4cGVjdGVkRGVzYyArIFwiIGJ1dCBcIiArIGZvdW5kRGVzYyArIFwiIGZvdW5kLlwiO1xuICAgICAgfVxuXG4gICAgICB2YXIgcG9zRGV0YWlscyA9IHBlZyRjb21wdXRlUG9zRGV0YWlscyhwb3MpLFxuICAgICAgICAgIGZvdW5kICAgICAgPSBwb3MgPCBpbnB1dC5sZW5ndGggPyBpbnB1dC5jaGFyQXQocG9zKSA6IG51bGw7XG5cbiAgICAgIGlmIChleHBlY3RlZCAhPT0gbnVsbCkge1xuICAgICAgICBjbGVhbnVwRXhwZWN0ZWQoZXhwZWN0ZWQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFN5bnRheEVycm9yKFxuICAgICAgICBtZXNzYWdlICE9PSBudWxsID8gbWVzc2FnZSA6IGJ1aWxkTWVzc2FnZShleHBlY3RlZCwgZm91bmQpLFxuICAgICAgICBleHBlY3RlZCxcbiAgICAgICAgZm91bmQsXG4gICAgICAgIHBvcyxcbiAgICAgICAgcG9zRGV0YWlscy5saW5lLFxuICAgICAgICBwb3NEZXRhaWxzLmNvbHVtblxuICAgICAgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VzdGFydCgpIHtcbiAgICAgIHZhciBzMCwgczE7XG5cbiAgICAgIHMwID0gcGVnJHBhcnNlc291cmNlRW50cmllcygpO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gW107XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgIHMxID0gcGVnJGMxKCk7XG4gICAgICAgIH1cbiAgICAgICAgczAgPSBzMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXNvdXJjZUVudHJpZXMoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNTtcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNlc291cmNlRW50cnkoKTtcbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMiA9IFtdO1xuICAgICAgICBzMyA9IHBlZyRwYXJzZXdoaXRlc3BhY2UoKTtcbiAgICAgICAgd2hpbGUgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczIucHVzaChzMyk7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2V3aGl0ZXNwYWNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0NCkge1xuICAgICAgICAgICAgczMgPSBwZWckYzM7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNCk7IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzNCA9IFtdO1xuICAgICAgICAgICAgczUgPSBwZWckcGFyc2V3aGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICB3aGlsZSAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgczQucHVzaChzNSk7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNld2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJHBhcnNlc291cmNlRW50cmllcygpO1xuICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRjNShzMSwgczUpO1xuICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBwZWckcGFyc2Vzb3VyY2VFbnRyeSgpO1xuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICBzMSA9IHBlZyRjNihzMSk7XG4gICAgICAgIH1cbiAgICAgICAgczAgPSBzMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXNvdXJjZUVudHJ5KCkge1xuICAgICAgdmFyIHMwO1xuXG4gICAgICBzMCA9IHBlZyRwYXJzZXVybEVudHJ5KCk7XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckcGFyc2Vsb2NhbEVudHJ5KCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2V1cmxFbnRyeSgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMztcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNldXJsKCk7XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBbXTtcbiAgICAgICAgczMgPSBwZWckcGFyc2V3aGl0ZXNwYWNlKCk7XG4gICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHdoaWxlIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczIucHVzaChzMyk7XG4gICAgICAgICAgICBzMyA9IHBlZyRwYXJzZXdoaXRlc3BhY2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczIgPSBwZWckYzI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczMgPSBwZWckcGFyc2Vmb3JtYXQoKTtcbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzcoczEsIHMzKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBwZWckcGFyc2V1cmwoKTtcbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgczEgPSBwZWckYzgoczEpO1xuICAgICAgICB9XG4gICAgICAgIHMwID0gczE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2V1cmwoKSB7XG4gICAgICB2YXIgczAsIHMxLCBzMiwgczM7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA0KSA9PT0gcGVnJGM5KSB7XG4gICAgICAgIHMxID0gcGVnJGM5O1xuICAgICAgICBwZWckY3VyclBvcyArPSA0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTApOyB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2V2YWx1ZSgpO1xuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQxKSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRjMTE7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTIpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMTMoczIpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWZvcm1hdCgpIHtcbiAgICAgIHZhciBzMCwgczEsIHMyLCBzMztcblxuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDcpID09PSBwZWckYzE0KSB7XG4gICAgICAgIHMxID0gcGVnJGMxNDtcbiAgICAgICAgcGVnJGN1cnJQb3MgKz0gNztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzE1KTsgfVxuICAgICAgfVxuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMyID0gcGVnJHBhcnNldmFsdWUoKTtcbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0MSkge1xuICAgICAgICAgICAgczMgPSBwZWckYzExO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzEyKTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzEzKHMyKTtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzI7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vsb2NhbEVudHJ5KCkge1xuICAgICAgdmFyIHMwLCBzMSwgczIsIHMzO1xuXG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNikgPT09IHBlZyRjMTYpIHtcbiAgICAgICAgczEgPSBwZWckYzE2O1xuICAgICAgICBwZWckY3VyclBvcyArPSA2O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTcpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczIgPSBwZWckcGFyc2V2YWx1ZSgpO1xuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQxKSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRjMTE7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTIpOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMTgoczIpO1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHMwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXZhbHVlKCkge1xuICAgICAgdmFyIHMwLCBzMSwgczI7XG5cbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IFtdO1xuICAgICAgaWYgKHBlZyRjMTkudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMyMCk7IH1cbiAgICAgIH1cbiAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgICBpZiAocGVnJGMxOS50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMjApOyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMSA9IHBlZyRjMjtcbiAgICAgIH1cbiAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgczEgPSBwZWckYzIxKHMxKTtcbiAgICAgIH1cbiAgICAgIHMwID0gczE7XG5cbiAgICAgIHJldHVybiBzMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZWckcGFyc2V3aGl0ZXNwYWNlKCkge1xuICAgICAgdmFyIHMwO1xuXG4gICAgICBpZiAocGVnJGMyMi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgIHMwID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzIzKTsgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gczA7XG4gICAgfVxuXG5cbiAgICAgIHZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbiAgICBwZWckcmVzdWx0ID0gcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uKCk7XG5cbiAgICBpZiAocGVnJHJlc3VsdCAhPT0gcGVnJEZBSUxFRCAmJiBwZWckY3VyclBvcyA9PT0gaW5wdXQubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gcGVnJHJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHBlZyRyZXN1bHQgIT09IHBlZyRGQUlMRUQgJiYgcGVnJGN1cnJQb3MgPCBpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgcGVnJGZhaWwoeyB0eXBlOiBcImVuZFwiLCBkZXNjcmlwdGlvbjogXCJlbmQgb2YgaW5wdXRcIiB9KTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgcGVnJGJ1aWxkRXhjZXB0aW9uKG51bGwsIHBlZyRtYXhGYWlsRXhwZWN0ZWQsIHBlZyRtYXhGYWlsUG9zKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIFN5bnRheEVycm9yOiBTeW50YXhFcnJvcixcbiAgICBwYXJzZTogICAgICAgcGFyc2VcbiAgfTtcbn0pKCk7XG4iLCJ2YXIgZ3JhbW1hciA9IHJlcXVpcmUoJy4vZ3JhbW1hcicpO1xuXG5cbmV4cG9ydHMuU3ludGF4RXJyb3IgPSBmdW5jdGlvbiAobWVzc2FnZSwgb2Zmc2V0KSB7XG4gICAgdGhpcy5tZXNzYWdlICA9IG1lc3NhZ2U7XG4gICAgdGhpcy5vZmZzZXQgICA9IG9mZnNldDtcbn07XG5cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoZm9udEZhY2VTb3VyY2VWYWx1ZSkge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBncmFtbWFyLnBhcnNlKGZvbnRGYWNlU291cmNlVmFsdWUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IGV4cG9ydHMuU3ludGF4RXJyb3IoZS5tZXNzYWdlLCBlLm9mZnNldCk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5zZXJpYWxpemUgPSBmdW5jdGlvbiAocGFyc2VkRm9udEZhY2VTb3VyY2VzKSB7XG4gICAgcmV0dXJuIHBhcnNlZEZvbnRGYWNlU291cmNlcy5tYXAoZnVuY3Rpb24gKHNvdXJjZUl0ZW0pIHtcbiAgICAgICAgdmFyIGl0ZW1WYWx1ZTtcblxuICAgICAgICBpZiAoc291cmNlSXRlbS51cmwpIHtcbiAgICAgICAgICAgIGl0ZW1WYWx1ZSA9ICd1cmwoXCInICsgc291cmNlSXRlbS51cmwgKyAnXCIpJztcbiAgICAgICAgICAgIGlmIChzb3VyY2VJdGVtLmZvcm1hdCkge1xuICAgICAgICAgICAgICAgIGl0ZW1WYWx1ZSArPSAnIGZvcm1hdChcIicgKyBzb3VyY2VJdGVtLmZvcm1hdCArICdcIiknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXRlbVZhbHVlID0gJ2xvY2FsKFwiJyArIHNvdXJjZUl0ZW0ubG9jYWwgKyAnXCIpJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXRlbVZhbHVlO1xuICAgIH0pLmpvaW4oJywgJyk7XG59O1xuIiwidmFyIHRyaW1DU1NXaGl0ZXNwYWNlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIHdoaXRlc3BhY2VSZWdleCA9IC9eW1xcdFxcclxcZlxcbiBdKiguKz8pW1xcdFxcclxcZlxcbiBdKiQvO1xuXG4gICAgcmV0dXJuIHZhbHVlLnJlcGxhY2Uod2hpdGVzcGFjZVJlZ2V4LCBcIiQxXCIpO1xufTtcblxudmFyIHVucXVvdGVTdHJpbmcgPSBmdW5jdGlvbiAocXVvdGVkVXJsKSB7XG4gICAgdmFyIGRvdWJsZVF1b3RlUmVnZXggPSAvXlwiKC4qKVwiJC8sXG4gICAgICAgIHNpbmdsZVF1b3RlUmVnZXggPSAvXicoLiopJyQvO1xuXG4gICAgaWYgKGRvdWJsZVF1b3RlUmVnZXgudGVzdChxdW90ZWRVcmwpKSB7XG4gICAgICAgIHJldHVybiBxdW90ZWRVcmwucmVwbGFjZShkb3VibGVRdW90ZVJlZ2V4LCBcIiQxXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChzaW5nbGVRdW90ZVJlZ2V4LnRlc3QocXVvdGVkVXJsKSkge1xuICAgICAgICAgICAgcmV0dXJuIHF1b3RlZFVybC5yZXBsYWNlKHNpbmdsZVF1b3RlUmVnZXgsIFwiJDFcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcXVvdGVkVXJsO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5leHRyYWN0VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdW5xdW90ZVN0cmluZyh0cmltQ1NTV2hpdGVzcGFjZSh2YWx1ZSkpO1xufTtcbiIsIi8qXG5Db3B5cmlnaHQgKGMpIDIwMTQsIFlhaG9vISBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG5Db3B5cmlnaHRzIGxpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIExpY2Vuc2UuXG5TZWUgdGhlIGFjY29tcGFueWluZyBMSUNFTlNFIGZpbGUgZm9yIHRlcm1zLlxuKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLm1hdGNoID0gbWF0Y2hRdWVyeTtcbmV4cG9ydHMucGFyc2UgPSBwYXJzZVF1ZXJ5O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG52YXIgUkVfTUVESUFfUVVFUlkgICAgID0gLyg/Oihvbmx5fG5vdCk/XFxzKihbXlxcc1xcKFxcKV0rKSg/OlxccyphbmQpP1xccyopPyguKyk/L2ksXG4gICAgUkVfTVFfRVhQUkVTU0lPTiAgID0gL1xcKFxccyooW15cXHNcXDpcXCldKylcXHMqKD86XFw6XFxzKihbXlxcc1xcKV0rKSk/XFxzKlxcKS8sXG4gICAgUkVfTVFfRkVBVFVSRSAgICAgID0gL14oPzoobWlufG1heCktKT8oLispLyxcbiAgICBSRV9MRU5HVEhfVU5JVCAgICAgPSAvKGVtfHJlbXxweHxjbXxtbXxpbnxwdHxwYyk/JC8sXG4gICAgUkVfUkVTT0xVVElPTl9VTklUID0gLyhkcGl8ZHBjbXxkcHB4KT8kLztcblxuZnVuY3Rpb24gbWF0Y2hRdWVyeShtZWRpYVF1ZXJ5LCB2YWx1ZXMpIHtcbiAgICByZXR1cm4gcGFyc2VRdWVyeShtZWRpYVF1ZXJ5KS5zb21lKGZ1bmN0aW9uIChxdWVyeSkge1xuICAgICAgICB2YXIgaW52ZXJzZSA9IHF1ZXJ5LmludmVyc2U7XG5cbiAgICAgICAgLy8gRWl0aGVyIHRoZSBwYXJzZWQgb3Igc3BlY2lmaWVkIGB0eXBlYCBpcyBcImFsbFwiLCBvciB0aGUgdHlwZXMgbXVzdCBiZVxuICAgICAgICAvLyBlcXVhbCBmb3IgYSBtYXRjaC5cbiAgICAgICAgdmFyIHR5cGVNYXRjaCA9IHF1ZXJ5LnR5cGUgPT09ICdhbGwnIHx8IHZhbHVlcy50eXBlID09PSBxdWVyeS50eXBlO1xuXG4gICAgICAgIC8vIFF1aXQgZWFybHkgd2hlbiBgdHlwZWAgZG9lc24ndCBtYXRjaCwgYnV0IHRha2UgXCJub3RcIiBpbnRvIGFjY291bnQuXG4gICAgICAgIGlmICgodHlwZU1hdGNoICYmIGludmVyc2UpIHx8ICEodHlwZU1hdGNoIHx8IGludmVyc2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZXhwcmVzc2lvbnNNYXRjaCA9IHF1ZXJ5LmV4cHJlc3Npb25zLmV2ZXJ5KGZ1bmN0aW9uIChleHByZXNzaW9uKSB7XG4gICAgICAgICAgICB2YXIgZmVhdHVyZSAgPSBleHByZXNzaW9uLmZlYXR1cmUsXG4gICAgICAgICAgICAgICAgbW9kaWZpZXIgPSBleHByZXNzaW9uLm1vZGlmaWVyLFxuICAgICAgICAgICAgICAgIGV4cFZhbHVlID0gZXhwcmVzc2lvbi52YWx1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZSAgICA9IHZhbHVlc1tmZWF0dXJlXTtcblxuICAgICAgICAgICAgLy8gTWlzc2luZyBvciBmYWxzeSB2YWx1ZXMgZG9uJ3QgbWF0Y2guXG4gICAgICAgICAgICBpZiAoIXZhbHVlKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgICBzd2l0Y2ggKGZlYXR1cmUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdvcmllbnRhdGlvbic6XG4gICAgICAgICAgICAgICAgY2FzZSAnc2Nhbic6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpID09PSBleHBWYWx1ZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnd2lkdGgnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2hlaWdodCc6XG4gICAgICAgICAgICAgICAgY2FzZSAnZGV2aWNlLXdpZHRoJzpcbiAgICAgICAgICAgICAgICBjYXNlICdkZXZpY2UtaGVpZ2h0JzpcbiAgICAgICAgICAgICAgICAgICAgZXhwVmFsdWUgPSB0b1B4KGV4cFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSB0b1B4KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdyZXNvbHV0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgZXhwVmFsdWUgPSB0b0RwaShleHBWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICAgID0gdG9EcGkodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ2FzcGVjdC1yYXRpbyc6XG4gICAgICAgICAgICAgICAgY2FzZSAnZGV2aWNlLWFzcGVjdC1yYXRpbyc6XG4gICAgICAgICAgICAgICAgY2FzZSAvKiBEZXByZWNhdGVkICovICdkZXZpY2UtcGl4ZWwtcmF0aW8nOlxuICAgICAgICAgICAgICAgICAgICBleHBWYWx1ZSA9IHRvRGVjaW1hbChleHBWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICAgID0gdG9EZWNpbWFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdncmlkJzpcbiAgICAgICAgICAgICAgICBjYXNlICdjb2xvcic6XG4gICAgICAgICAgICAgICAgY2FzZSAnY29sb3ItaW5kZXgnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ21vbm9jaHJvbWUnOlxuICAgICAgICAgICAgICAgICAgICBleHBWYWx1ZSA9IHBhcnNlSW50KGV4cFZhbHVlLCAxMCkgfHwgMTtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSBwYXJzZUludCh2YWx1ZSwgMTApIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2l0Y2ggKG1vZGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnbWluJzogcmV0dXJuIHZhbHVlID49IGV4cFZhbHVlO1xuICAgICAgICAgICAgICAgIGNhc2UgJ21heCc6IHJldHVybiB2YWx1ZSA8PSBleHBWYWx1ZTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0ICAgOiByZXR1cm4gdmFsdWUgPT09IGV4cFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gKGV4cHJlc3Npb25zTWF0Y2ggJiYgIWludmVyc2UpIHx8ICghZXhwcmVzc2lvbnNNYXRjaCAmJiBpbnZlcnNlKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gcGFyc2VRdWVyeShtZWRpYVF1ZXJ5KSB7XG4gICAgcmV0dXJuIG1lZGlhUXVlcnkuc3BsaXQoJywnKS5tYXAoZnVuY3Rpb24gKHF1ZXJ5KSB7XG4gICAgICAgIHF1ZXJ5ID0gcXVlcnkudHJpbSgpO1xuXG4gICAgICAgIHZhciBjYXB0dXJlcyAgICA9IHF1ZXJ5Lm1hdGNoKFJFX01FRElBX1FVRVJZKSxcbiAgICAgICAgICAgIG1vZGlmaWVyICAgID0gY2FwdHVyZXNbMV0sXG4gICAgICAgICAgICB0eXBlICAgICAgICA9IGNhcHR1cmVzWzJdLFxuICAgICAgICAgICAgZXhwcmVzc2lvbnMgPSBjYXB0dXJlc1szXSB8fCAnJyxcbiAgICAgICAgICAgIHBhcnNlZCAgICAgID0ge307XG5cbiAgICAgICAgcGFyc2VkLmludmVyc2UgPSAhIW1vZGlmaWVyICYmIG1vZGlmaWVyLnRvTG93ZXJDYXNlKCkgPT09ICdub3QnO1xuICAgICAgICBwYXJzZWQudHlwZSAgICA9IHR5cGUgPyB0eXBlLnRvTG93ZXJDYXNlKCkgOiAnYWxsJztcblxuICAgICAgICAvLyBTcGxpdCBleHByZXNzaW9ucyBpbnRvIGEgbGlzdC5cbiAgICAgICAgZXhwcmVzc2lvbnMgPSBleHByZXNzaW9ucy5tYXRjaCgvXFwoW15cXCldK1xcKS9nKSB8fCBbXTtcblxuICAgICAgICBwYXJzZWQuZXhwcmVzc2lvbnMgPSBleHByZXNzaW9ucy5tYXAoZnVuY3Rpb24gKGV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgIHZhciBjYXB0dXJlcyA9IGV4cHJlc3Npb24ubWF0Y2goUkVfTVFfRVhQUkVTU0lPTiksXG4gICAgICAgICAgICAgICAgZmVhdHVyZSAgPSBjYXB0dXJlc1sxXS50b0xvd2VyQ2FzZSgpLm1hdGNoKFJFX01RX0ZFQVRVUkUpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG1vZGlmaWVyOiBmZWF0dXJlWzFdLFxuICAgICAgICAgICAgICAgIGZlYXR1cmUgOiBmZWF0dXJlWzJdLFxuICAgICAgICAgICAgICAgIHZhbHVlICAgOiBjYXB0dXJlc1syXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlZDtcbiAgICB9KTtcbn1cblxuLy8gLS0gVXRpbGl0aWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gdG9EZWNpbWFsKHJhdGlvKSB7XG4gICAgdmFyIGRlY2ltYWwgPSBOdW1iZXIocmF0aW8pLFxuICAgICAgICBudW1iZXJzO1xuXG4gICAgaWYgKCFkZWNpbWFsKSB7XG4gICAgICAgIG51bWJlcnMgPSByYXRpby5tYXRjaCgvXihcXGQrKVxccypcXC9cXHMqKFxcZCspJC8pO1xuICAgICAgICBkZWNpbWFsID0gbnVtYmVyc1sxXSAvIG51bWJlcnNbMl07XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY2ltYWw7XG59XG5cbmZ1bmN0aW9uIHRvRHBpKHJlc29sdXRpb24pIHtcbiAgICB2YXIgdmFsdWUgPSBwYXJzZUZsb2F0KHJlc29sdXRpb24pLFxuICAgICAgICB1bml0cyA9IFN0cmluZyhyZXNvbHV0aW9uKS5tYXRjaChSRV9SRVNPTFVUSU9OX1VOSVQpWzFdO1xuXG4gICAgc3dpdGNoICh1bml0cykge1xuICAgICAgICBjYXNlICdkcGNtJzogcmV0dXJuIHZhbHVlIC8gMi41NDtcbiAgICAgICAgY2FzZSAnZHBweCc6IHJldHVybiB2YWx1ZSAqIDk2O1xuICAgICAgICBkZWZhdWx0ICAgIDogcmV0dXJuIHZhbHVlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdG9QeChsZW5ndGgpIHtcbiAgICB2YXIgdmFsdWUgPSBwYXJzZUZsb2F0KGxlbmd0aCksXG4gICAgICAgIHVuaXRzID0gU3RyaW5nKGxlbmd0aCkubWF0Y2goUkVfTEVOR1RIX1VOSVQpWzFdO1xuXG4gICAgc3dpdGNoICh1bml0cykge1xuICAgICAgICBjYXNlICdlbScgOiByZXR1cm4gdmFsdWUgKiAxNjtcbiAgICAgICAgY2FzZSAncmVtJzogcmV0dXJuIHZhbHVlICogMTY7XG4gICAgICAgIGNhc2UgJ2NtJyA6IHJldHVybiB2YWx1ZSAqIDk2IC8gMi41NDtcbiAgICAgICAgY2FzZSAnbW0nIDogcmV0dXJuIHZhbHVlICogOTYgLyAyLjU0IC8gMTA7XG4gICAgICAgIGNhc2UgJ2luJyA6IHJldHVybiB2YWx1ZSAqIDk2O1xuICAgICAgICBjYXNlICdwdCcgOiByZXR1cm4gdmFsdWUgKiA3MjtcbiAgICAgICAgY2FzZSAncGMnIDogcmV0dXJuIHZhbHVlICogNzIgLyAxMjtcbiAgICAgICAgZGVmYXVsdCAgIDogcmV0dXJuIHZhbHVlO1xuICAgIH1cbn1cbiIsIi8vLkNvbW1vbkpTXG52YXIgQ1NTT00gPSB7XG4gICAgQ1NTUnVsZTogcmVxdWlyZShcIi4vQ1NTUnVsZVwiKS5DU1NSdWxlLFxuICAgIE1hdGNoZXJMaXN0OiByZXF1aXJlKFwiLi9NYXRjaGVyTGlzdFwiKS5NYXRjaGVyTGlzdFxufTtcbi8vL0NvbW1vbkpTXG5cblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vQ1NTL0AtbW96LWRvY3VtZW50XG4gKi9cbkNTU09NLkNTU0RvY3VtZW50UnVsZSA9IGZ1bmN0aW9uIENTU0RvY3VtZW50UnVsZSgpIHtcbiAgICBDU1NPTS5DU1NSdWxlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5tYXRjaGVyID0gbmV3IENTU09NLk1hdGNoZXJMaXN0O1xuICAgIHRoaXMuY3NzUnVsZXMgPSBbXTtcbn07XG5cbkNTU09NLkNTU0RvY3VtZW50UnVsZS5wcm90b3R5cGUgPSBuZXcgQ1NTT00uQ1NTUnVsZTtcbkNTU09NLkNTU0RvY3VtZW50UnVsZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDU1NPTS5DU1NEb2N1bWVudFJ1bGU7XG5DU1NPTS5DU1NEb2N1bWVudFJ1bGUucHJvdG90eXBlLnR5cGUgPSAxMDtcbi8vRklYTUVcbi8vQ1NTT00uQ1NTRG9jdW1lbnRSdWxlLnByb3RvdHlwZS5pbnNlcnRSdWxlID0gQ1NTU3R5bGVTaGVldC5wcm90b3R5cGUuaW5zZXJ0UnVsZTtcbi8vQ1NTT00uQ1NTRG9jdW1lbnRSdWxlLnByb3RvdHlwZS5kZWxldGVSdWxlID0gQ1NTU3R5bGVTaGVldC5wcm90b3R5cGUuZGVsZXRlUnVsZTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KENTU09NLkNTU0RvY3VtZW50UnVsZS5wcm90b3R5cGUsIFwiY3NzVGV4dFwiLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNzc1RleHRzID0gW107XG4gICAgZm9yICh2YXIgaT0wLCBsZW5ndGg9dGhpcy5jc3NSdWxlcy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBjc3NUZXh0cy5wdXNoKHRoaXMuY3NzUnVsZXNbaV0uY3NzVGV4dCk7XG4gICAgfVxuICAgIHJldHVybiBcIkAtbW96LWRvY3VtZW50IFwiICsgdGhpcy5tYXRjaGVyLm1hdGNoZXJUZXh0ICsgXCIge1wiICsgY3NzVGV4dHMuam9pbihcIlwiKSArIFwifVwiO1xuICB9XG59KTtcblxuXG4vLy5Db21tb25KU1xuZXhwb3J0cy5DU1NEb2N1bWVudFJ1bGUgPSBDU1NPTS5DU1NEb2N1bWVudFJ1bGU7XG4vLy9Db21tb25KU1xuIiwiLy8uQ29tbW9uSlNcbnZhciBDU1NPTSA9IHtcblx0Q1NTU3R5bGVEZWNsYXJhdGlvbjogcmVxdWlyZShcIi4vQ1NTU3R5bGVEZWNsYXJhdGlvblwiKS5DU1NTdHlsZURlY2xhcmF0aW9uLFxuXHRDU1NSdWxlOiByZXF1aXJlKFwiLi9DU1NSdWxlXCIpLkNTU1J1bGVcbn07XG4vLy9Db21tb25KU1xuXG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2VlIGh0dHA6Ly9kZXYudzMub3JnL2Nzc3dnL2Nzc29tLyNjc3MtZm9udC1mYWNlLXJ1bGVcbiAqL1xuQ1NTT00uQ1NTRm9udEZhY2VSdWxlID0gZnVuY3Rpb24gQ1NTRm9udEZhY2VSdWxlKCkge1xuXHRDU1NPTS5DU1NSdWxlLmNhbGwodGhpcyk7XG5cdHRoaXMuc3R5bGUgPSBuZXcgQ1NTT00uQ1NTU3R5bGVEZWNsYXJhdGlvbjtcblx0dGhpcy5zdHlsZS5wYXJlbnRSdWxlID0gdGhpcztcbn07XG5cbkNTU09NLkNTU0ZvbnRGYWNlUnVsZS5wcm90b3R5cGUgPSBuZXcgQ1NTT00uQ1NTUnVsZTtcbkNTU09NLkNTU0ZvbnRGYWNlUnVsZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDU1NPTS5DU1NGb250RmFjZVJ1bGU7XG5DU1NPTS5DU1NGb250RmFjZVJ1bGUucHJvdG90eXBlLnR5cGUgPSA1O1xuLy9GSVhNRVxuLy9DU1NPTS5DU1NGb250RmFjZVJ1bGUucHJvdG90eXBlLmluc2VydFJ1bGUgPSBDU1NTdHlsZVNoZWV0LnByb3RvdHlwZS5pbnNlcnRSdWxlO1xuLy9DU1NPTS5DU1NGb250RmFjZVJ1bGUucHJvdG90eXBlLmRlbGV0ZVJ1bGUgPSBDU1NTdHlsZVNoZWV0LnByb3RvdHlwZS5kZWxldGVSdWxlO1xuXG4vLyBodHRwOi8vd3d3Lm9wZW5zb3VyY2UuYXBwbGUuY29tL3NvdXJjZS9XZWJDb3JlL1dlYkNvcmUtOTU1LjY2LjEvY3NzL1dlYktpdENTU0ZvbnRGYWNlUnVsZS5jcHBcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShDU1NPTS5DU1NGb250RmFjZVJ1bGUucHJvdG90eXBlLCBcImNzc1RleHRcIiwge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBcIkBmb250LWZhY2Uge1wiICsgdGhpcy5zdHlsZS5jc3NUZXh0ICsgXCJ9XCI7XG4gIH1cbn0pO1xuXG5cbi8vLkNvbW1vbkpTXG5leHBvcnRzLkNTU0ZvbnRGYWNlUnVsZSA9IENTU09NLkNTU0ZvbnRGYWNlUnVsZTtcbi8vL0NvbW1vbkpTXG4iLCIvLy5Db21tb25KU1xudmFyIENTU09NID0ge1xuXHRDU1NSdWxlOiByZXF1aXJlKFwiLi9DU1NSdWxlXCIpLkNTU1J1bGUsXG5cdENTU1N0eWxlU2hlZXQ6IHJlcXVpcmUoXCIuL0NTU1N0eWxlU2hlZXRcIikuQ1NTU3R5bGVTaGVldCxcblx0TWVkaWFMaXN0OiByZXF1aXJlKFwiLi9NZWRpYUxpc3RcIikuTWVkaWFMaXN0XG59O1xuLy8vQ29tbW9uSlNcblxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNlZSBodHRwOi8vZGV2LnczLm9yZy9jc3N3Zy9jc3NvbS8jY3NzaW1wb3J0cnVsZVxuICogQHNlZSBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1TdHlsZS9jc3MuaHRtbCNDU1MtQ1NTSW1wb3J0UnVsZVxuICovXG5DU1NPTS5DU1NJbXBvcnRSdWxlID0gZnVuY3Rpb24gQ1NTSW1wb3J0UnVsZSgpIHtcblx0Q1NTT00uQ1NTUnVsZS5jYWxsKHRoaXMpO1xuXHR0aGlzLmhyZWYgPSBcIlwiO1xuXHR0aGlzLm1lZGlhID0gbmV3IENTU09NLk1lZGlhTGlzdDtcblx0dGhpcy5zdHlsZVNoZWV0ID0gbmV3IENTU09NLkNTU1N0eWxlU2hlZXQ7XG59O1xuXG5DU1NPTS5DU1NJbXBvcnRSdWxlLnByb3RvdHlwZSA9IG5ldyBDU1NPTS5DU1NSdWxlO1xuQ1NTT00uQ1NTSW1wb3J0UnVsZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDU1NPTS5DU1NJbXBvcnRSdWxlO1xuQ1NTT00uQ1NTSW1wb3J0UnVsZS5wcm90b3R5cGUudHlwZSA9IDM7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShDU1NPTS5DU1NJbXBvcnRSdWxlLnByb3RvdHlwZSwgXCJjc3NUZXh0XCIsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgbWVkaWFUZXh0ID0gdGhpcy5tZWRpYS5tZWRpYVRleHQ7XG4gICAgcmV0dXJuIFwiQGltcG9ydCB1cmwoXCIgKyB0aGlzLmhyZWYgKyBcIilcIiArIChtZWRpYVRleHQgPyBcIiBcIiArIG1lZGlhVGV4dCA6IFwiXCIpICsgXCI7XCI7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24oY3NzVGV4dCkge1xuICAgIHZhciBpID0gMDtcblxuICAgIC8qKlxuICAgICAqIEBpbXBvcnQgdXJsKHBhcnRpYWwuY3NzKSBzY3JlZW4sIGhhbmRoZWxkO1xuICAgICAqICAgICAgICB8fCAgICAgICAgICAgICAgIHxcbiAgICAgKiAgICAgICAgYWZ0ZXItaW1wb3J0ICAgICBtZWRpYVxuICAgICAqICAgICAgICAgfFxuICAgICAqICAgICAgICAgdXJsXG4gICAgICovXG4gICAgdmFyIHN0YXRlID0gJyc7XG5cbiAgICB2YXIgYnVmZmVyID0gJyc7XG4gICAgdmFyIGluZGV4O1xuICAgIHZhciBtZWRpYVRleHQgPSAnJztcbiAgICBmb3IgKHZhciBjaGFyYWN0ZXI7IGNoYXJhY3RlciA9IGNzc1RleHQuY2hhckF0KGkpOyBpKyspIHtcblxuICAgICAgc3dpdGNoIChjaGFyYWN0ZXIpIHtcbiAgICAgICAgY2FzZSAnICc6XG4gICAgICAgIGNhc2UgJ1xcdCc6XG4gICAgICAgIGNhc2UgJ1xccic6XG4gICAgICAgIGNhc2UgJ1xcbic6XG4gICAgICAgIGNhc2UgJ1xcZic6XG4gICAgICAgICAgaWYgKHN0YXRlID09PSAnYWZ0ZXItaW1wb3J0Jykge1xuICAgICAgICAgICAgc3RhdGUgPSAndXJsJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVmZmVyICs9IGNoYXJhY3RlcjtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnQCc6XG4gICAgICAgICAgaWYgKCFzdGF0ZSAmJiBjc3NUZXh0LmluZGV4T2YoJ0BpbXBvcnQnLCBpKSA9PT0gaSkge1xuICAgICAgICAgICAgc3RhdGUgPSAnYWZ0ZXItaW1wb3J0JztcbiAgICAgICAgICAgIGkgKz0gJ2ltcG9ydCcubGVuZ3RoO1xuICAgICAgICAgICAgYnVmZmVyID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ3UnOlxuICAgICAgICAgIGlmIChzdGF0ZSA9PT0gJ3VybCcgJiYgY3NzVGV4dC5pbmRleE9mKCd1cmwoJywgaSkgPT09IGkpIHtcbiAgICAgICAgICAgIGluZGV4ID0gY3NzVGV4dC5pbmRleE9mKCcpJywgaSArIDEpO1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgICB0aHJvdyBpICsgJzogXCIpXCIgbm90IGZvdW5kJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkgKz0gJ3VybCgnLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciB1cmwgPSBjc3NUZXh0LnNsaWNlKGksIGluZGV4KTtcbiAgICAgICAgICAgIGlmICh1cmxbMF0gPT09IHVybFt1cmwubGVuZ3RoIC0gMV0pIHtcbiAgICAgICAgICAgICAgaWYgKHVybFswXSA9PT0gJ1wiJyB8fCB1cmxbMF0gPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgICAgdXJsID0gdXJsLnNsaWNlKDEsIC0xKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5ocmVmID0gdXJsO1xuICAgICAgICAgICAgaSA9IGluZGV4O1xuICAgICAgICAgICAgc3RhdGUgPSAnbWVkaWEnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdcIic6XG4gICAgICAgICAgaWYgKHN0YXRlID09PSAndXJsJykge1xuICAgICAgICAgICAgaW5kZXggPSBjc3NUZXh0LmluZGV4T2YoJ1wiJywgaSArIDEpO1xuICAgICAgICAgICAgaWYgKCFpbmRleCkge1xuICAgICAgICAgICAgICB0aHJvdyBpICsgXCI6ICdcXFwiJyBub3QgZm91bmRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaHJlZiA9IGNzc1RleHQuc2xpY2UoaSArIDEsIGluZGV4KTtcbiAgICAgICAgICAgIGkgPSBpbmRleDtcbiAgICAgICAgICAgIHN0YXRlID0gJ21lZGlhJztcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBcIidcIjpcbiAgICAgICAgICBpZiAoc3RhdGUgPT09ICd1cmwnKSB7XG4gICAgICAgICAgICBpbmRleCA9IGNzc1RleHQuaW5kZXhPZihcIidcIiwgaSArIDEpO1xuICAgICAgICAgICAgaWYgKCFpbmRleCkge1xuICAgICAgICAgICAgICB0aHJvdyBpICsgJzogXCJcXCdcIiBub3QgZm91bmQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5ocmVmID0gY3NzVGV4dC5zbGljZShpICsgMSwgaW5kZXgpO1xuICAgICAgICAgICAgaSA9IGluZGV4O1xuICAgICAgICAgICAgc3RhdGUgPSAnbWVkaWEnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICc7JzpcbiAgICAgICAgICBpZiAoc3RhdGUgPT09ICdtZWRpYScpIHtcbiAgICAgICAgICAgIGlmIChidWZmZXIpIHtcbiAgICAgICAgICAgICAgdGhpcy5tZWRpYS5tZWRpYVRleHQgPSBidWZmZXIudHJpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGlmIChzdGF0ZSA9PT0gJ21lZGlhJykge1xuICAgICAgICAgICAgYnVmZmVyICs9IGNoYXJhY3RlcjtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcblxuXG4vLy5Db21tb25KU1xuZXhwb3J0cy5DU1NJbXBvcnRSdWxlID0gQ1NTT00uQ1NTSW1wb3J0UnVsZTtcbi8vL0NvbW1vbkpTXG4iLCIvLy5Db21tb25KU1xudmFyIENTU09NID0ge1xuXHRDU1NSdWxlOiByZXF1aXJlKFwiLi9DU1NSdWxlXCIpLkNTU1J1bGUsXG5cdENTU1N0eWxlRGVjbGFyYXRpb246IHJlcXVpcmUoJy4vQ1NTU3R5bGVEZWNsYXJhdGlvbicpLkNTU1N0eWxlRGVjbGFyYXRpb25cbn07XG4vLy9Db21tb25KU1xuXG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2VlIGh0dHA6Ly93d3cudzMub3JnL1RSL2NzczMtYW5pbWF0aW9ucy8jRE9NLUNTU0tleWZyYW1lUnVsZVxuICovXG5DU1NPTS5DU1NLZXlmcmFtZVJ1bGUgPSBmdW5jdGlvbiBDU1NLZXlmcmFtZVJ1bGUoKSB7XG5cdENTU09NLkNTU1J1bGUuY2FsbCh0aGlzKTtcblx0dGhpcy5rZXlUZXh0ID0gJyc7XG5cdHRoaXMuc3R5bGUgPSBuZXcgQ1NTT00uQ1NTU3R5bGVEZWNsYXJhdGlvbjtcblx0dGhpcy5zdHlsZS5wYXJlbnRSdWxlID0gdGhpcztcbn07XG5cbkNTU09NLkNTU0tleWZyYW1lUnVsZS5wcm90b3R5cGUgPSBuZXcgQ1NTT00uQ1NTUnVsZTtcbkNTU09NLkNTU0tleWZyYW1lUnVsZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDU1NPTS5DU1NLZXlmcmFtZVJ1bGU7XG5DU1NPTS5DU1NLZXlmcmFtZVJ1bGUucHJvdG90eXBlLnR5cGUgPSA5O1xuLy9GSVhNRVxuLy9DU1NPTS5DU1NLZXlmcmFtZVJ1bGUucHJvdG90eXBlLmluc2VydFJ1bGUgPSBDU1NTdHlsZVNoZWV0LnByb3RvdHlwZS5pbnNlcnRSdWxlO1xuLy9DU1NPTS5DU1NLZXlmcmFtZVJ1bGUucHJvdG90eXBlLmRlbGV0ZVJ1bGUgPSBDU1NTdHlsZVNoZWV0LnByb3RvdHlwZS5kZWxldGVSdWxlO1xuXG4vLyBodHRwOi8vd3d3Lm9wZW5zb3VyY2UuYXBwbGUuY29tL3NvdXJjZS9XZWJDb3JlL1dlYkNvcmUtOTU1LjY2LjEvY3NzL1dlYktpdENTU0tleWZyYW1lUnVsZS5jcHBcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShDU1NPTS5DU1NLZXlmcmFtZVJ1bGUucHJvdG90eXBlLCBcImNzc1RleHRcIiwge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmtleVRleHQgKyBcIiB7XCIgKyB0aGlzLnN0eWxlLmNzc1RleHQgKyBcIn0gXCI7XG4gIH1cbn0pO1xuXG5cbi8vLkNvbW1vbkpTXG5leHBvcnRzLkNTU0tleWZyYW1lUnVsZSA9IENTU09NLkNTU0tleWZyYW1lUnVsZTtcbi8vL0NvbW1vbkpTXG4iLCIvLy5Db21tb25KU1xudmFyIENTU09NID0ge1xuXHRDU1NSdWxlOiByZXF1aXJlKFwiLi9DU1NSdWxlXCIpLkNTU1J1bGVcbn07XG4vLy9Db21tb25KU1xuXG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2VlIGh0dHA6Ly93d3cudzMub3JnL1RSL2NzczMtYW5pbWF0aW9ucy8jRE9NLUNTU0tleWZyYW1lc1J1bGVcbiAqL1xuQ1NTT00uQ1NTS2V5ZnJhbWVzUnVsZSA9IGZ1bmN0aW9uIENTU0tleWZyYW1lc1J1bGUoKSB7XG5cdENTU09NLkNTU1J1bGUuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gJyc7XG5cdHRoaXMuY3NzUnVsZXMgPSBbXTtcbn07XG5cbkNTU09NLkNTU0tleWZyYW1lc1J1bGUucHJvdG90eXBlID0gbmV3IENTU09NLkNTU1J1bGU7XG5DU1NPTS5DU1NLZXlmcmFtZXNSdWxlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENTU09NLkNTU0tleWZyYW1lc1J1bGU7XG5DU1NPTS5DU1NLZXlmcmFtZXNSdWxlLnByb3RvdHlwZS50eXBlID0gODtcbi8vRklYTUVcbi8vQ1NTT00uQ1NTS2V5ZnJhbWVzUnVsZS5wcm90b3R5cGUuaW5zZXJ0UnVsZSA9IENTU1N0eWxlU2hlZXQucHJvdG90eXBlLmluc2VydFJ1bGU7XG4vL0NTU09NLkNTU0tleWZyYW1lc1J1bGUucHJvdG90eXBlLmRlbGV0ZVJ1bGUgPSBDU1NTdHlsZVNoZWV0LnByb3RvdHlwZS5kZWxldGVSdWxlO1xuXG4vLyBodHRwOi8vd3d3Lm9wZW5zb3VyY2UuYXBwbGUuY29tL3NvdXJjZS9XZWJDb3JlL1dlYkNvcmUtOTU1LjY2LjEvY3NzL1dlYktpdENTU0tleWZyYW1lc1J1bGUuY3BwXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQ1NTT00uQ1NTS2V5ZnJhbWVzUnVsZS5wcm90b3R5cGUsIFwiY3NzVGV4dFwiLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNzc1RleHRzID0gW107XG4gICAgZm9yICh2YXIgaT0wLCBsZW5ndGg9dGhpcy5jc3NSdWxlcy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgY3NzVGV4dHMucHVzaChcIiAgXCIgKyB0aGlzLmNzc1J1bGVzW2ldLmNzc1RleHQpO1xuICAgIH1cbiAgICByZXR1cm4gXCJAXCIgKyAodGhpcy5fdmVuZG9yUHJlZml4IHx8ICcnKSArIFwia2V5ZnJhbWVzIFwiICsgdGhpcy5uYW1lICsgXCIgeyBcXG5cIiArIGNzc1RleHRzLmpvaW4oXCJcXG5cIikgKyBcIlxcbn1cIjtcbiAgfVxufSk7XG5cblxuLy8uQ29tbW9uSlNcbmV4cG9ydHMuQ1NTS2V5ZnJhbWVzUnVsZSA9IENTU09NLkNTU0tleWZyYW1lc1J1bGU7XG4vLy9Db21tb25KU1xuIiwiLy8uQ29tbW9uSlNcbnZhciBDU1NPTSA9IHtcblx0Q1NTUnVsZTogcmVxdWlyZShcIi4vQ1NTUnVsZVwiKS5DU1NSdWxlLFxuXHRNZWRpYUxpc3Q6IHJlcXVpcmUoXCIuL01lZGlhTGlzdFwiKS5NZWRpYUxpc3Rcbn07XG4vLy9Db21tb25KU1xuXG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2VlIGh0dHA6Ly9kZXYudzMub3JnL2Nzc3dnL2Nzc29tLyNjc3NtZWRpYXJ1bGVcbiAqIEBzZWUgaHR0cDovL3d3dy53My5vcmcvVFIvRE9NLUxldmVsLTItU3R5bGUvY3NzLmh0bWwjQ1NTLUNTU01lZGlhUnVsZVxuICovXG5DU1NPTS5DU1NNZWRpYVJ1bGUgPSBmdW5jdGlvbiBDU1NNZWRpYVJ1bGUoKSB7XG5cdENTU09NLkNTU1J1bGUuY2FsbCh0aGlzKTtcblx0dGhpcy5tZWRpYSA9IG5ldyBDU1NPTS5NZWRpYUxpc3Q7XG5cdHRoaXMuY3NzUnVsZXMgPSBbXTtcbn07XG5cbkNTU09NLkNTU01lZGlhUnVsZS5wcm90b3R5cGUgPSBuZXcgQ1NTT00uQ1NTUnVsZTtcbkNTU09NLkNTU01lZGlhUnVsZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDU1NPTS5DU1NNZWRpYVJ1bGU7XG5DU1NPTS5DU1NNZWRpYVJ1bGUucHJvdG90eXBlLnR5cGUgPSA0O1xuLy9GSVhNRVxuLy9DU1NPTS5DU1NNZWRpYVJ1bGUucHJvdG90eXBlLmluc2VydFJ1bGUgPSBDU1NTdHlsZVNoZWV0LnByb3RvdHlwZS5pbnNlcnRSdWxlO1xuLy9DU1NPTS5DU1NNZWRpYVJ1bGUucHJvdG90eXBlLmRlbGV0ZVJ1bGUgPSBDU1NTdHlsZVNoZWV0LnByb3RvdHlwZS5kZWxldGVSdWxlO1xuXG4vLyBodHRwOi8vb3BlbnNvdXJjZS5hcHBsZS5jb20vc291cmNlL1dlYkNvcmUvV2ViQ29yZS02NTguMjgvY3NzL0NTU01lZGlhUnVsZS5jcHBcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShDU1NPTS5DU1NNZWRpYVJ1bGUucHJvdG90eXBlLCBcImNzc1RleHRcIiwge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjc3NUZXh0cyA9IFtdO1xuICAgIGZvciAodmFyIGk9MCwgbGVuZ3RoPXRoaXMuY3NzUnVsZXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGNzc1RleHRzLnB1c2godGhpcy5jc3NSdWxlc1tpXS5jc3NUZXh0KTtcbiAgICB9XG4gICAgcmV0dXJuIFwiQG1lZGlhIFwiICsgdGhpcy5tZWRpYS5tZWRpYVRleHQgKyBcIiB7XCIgKyBjc3NUZXh0cy5qb2luKFwiXCIpICsgXCJ9XCI7XG4gIH1cbn0pO1xuXG5cbi8vLkNvbW1vbkpTXG5leHBvcnRzLkNTU01lZGlhUnVsZSA9IENTU09NLkNTU01lZGlhUnVsZTtcbi8vL0NvbW1vbkpTXG4iLCIvLy5Db21tb25KU1xudmFyIENTU09NID0ge307XG4vLy9Db21tb25KU1xuXG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2VlIGh0dHA6Ly9kZXYudzMub3JnL2Nzc3dnL2Nzc29tLyN0aGUtY3NzcnVsZS1pbnRlcmZhY2VcbiAqIEBzZWUgaHR0cDovL3d3dy53My5vcmcvVFIvRE9NLUxldmVsLTItU3R5bGUvY3NzLmh0bWwjQ1NTLUNTU1J1bGVcbiAqL1xuQ1NTT00uQ1NTUnVsZSA9IGZ1bmN0aW9uIENTU1J1bGUoKSB7XG5cdHRoaXMucGFyZW50UnVsZSA9IG51bGw7XG5cdHRoaXMucGFyZW50U3R5bGVTaGVldCA9IG51bGw7XG59O1xuXG5DU1NPTS5DU1NSdWxlLlNUWUxFX1JVTEUgPSAxO1xuQ1NTT00uQ1NTUnVsZS5JTVBPUlRfUlVMRSA9IDM7XG5DU1NPTS5DU1NSdWxlLk1FRElBX1JVTEUgPSA0O1xuQ1NTT00uQ1NTUnVsZS5GT05UX0ZBQ0VfUlVMRSA9IDU7XG5DU1NPTS5DU1NSdWxlLlBBR0VfUlVMRSA9IDY7XG5DU1NPTS5DU1NSdWxlLldFQktJVF9LRVlGUkFNRVNfUlVMRSA9IDg7XG5DU1NPTS5DU1NSdWxlLldFQktJVF9LRVlGUkFNRV9SVUxFID0gOTtcblxuLy8gT2Jzb2xldGUgaW4gQ1NTT00gaHR0cDovL2Rldi53My5vcmcvY3Nzd2cvY3Nzb20vXG4vL0NTU09NLkNTU1J1bGUuVU5LTk9XTl9SVUxFID0gMDtcbi8vQ1NTT00uQ1NTUnVsZS5DSEFSU0VUX1JVTEUgPSAyO1xuXG4vLyBOZXZlciBpbXBsZW1lbnRlZFxuLy9DU1NPTS5DU1NSdWxlLlZBUklBQkxFU19SVUxFID0gNztcblxuQ1NTT00uQ1NTUnVsZS5wcm90b3R5cGUgPSB7XG5cdGNvbnN0cnVjdG9yOiBDU1NPTS5DU1NSdWxlXG5cdC8vRklYTUVcbn07XG5cblxuLy8uQ29tbW9uSlNcbmV4cG9ydHMuQ1NTUnVsZSA9IENTU09NLkNTU1J1bGU7XG4vLy9Db21tb25KU1xuIiwiLy8uQ29tbW9uSlNcbnZhciBDU1NPTSA9IHt9O1xuLy8vQ29tbW9uSlNcblxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNlZSBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1TdHlsZS9jc3MuaHRtbCNDU1MtQ1NTU3R5bGVEZWNsYXJhdGlvblxuICovXG5DU1NPTS5DU1NTdHlsZURlY2xhcmF0aW9uID0gZnVuY3Rpb24gQ1NTU3R5bGVEZWNsYXJhdGlvbigpe1xuXHR0aGlzLmxlbmd0aCA9IDA7XG5cdHRoaXMucGFyZW50UnVsZSA9IG51bGw7XG5cblx0Ly8gTk9OLVNUQU5EQVJEXG5cdHRoaXMuX2ltcG9ydGFudHMgPSB7fTtcbn07XG5cblxuQ1NTT00uQ1NTU3R5bGVEZWNsYXJhdGlvbi5wcm90b3R5cGUgPSB7XG5cblx0Y29uc3RydWN0b3I6IENTU09NLkNTU1N0eWxlRGVjbGFyYXRpb24sXG5cblx0LyoqXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG5cdCAqIEBzZWUgaHR0cDovL3d3dy53My5vcmcvVFIvRE9NLUxldmVsLTItU3R5bGUvY3NzLmh0bWwjQ1NTLUNTU1N0eWxlRGVjbGFyYXRpb24tZ2V0UHJvcGVydHlWYWx1ZVxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9IHRoZSB2YWx1ZSBvZiB0aGUgcHJvcGVydHkgaWYgaXQgaGFzIGJlZW4gZXhwbGljaXRseSBzZXQgZm9yIHRoaXMgZGVjbGFyYXRpb24gYmxvY2suXG5cdCAqIFJldHVybnMgdGhlIGVtcHR5IHN0cmluZyBpZiB0aGUgcHJvcGVydHkgaGFzIG5vdCBiZWVuIHNldC5cblx0ICovXG5cdGdldFByb3BlcnR5VmFsdWU6IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpc1tuYW1lXSB8fCBcIlwiO1xuXHR9LFxuXG5cdC8qKlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcblx0ICogQHBhcmFtIHtzdHJpbmd9IFtwcmlvcml0eT1udWxsXSBcImltcG9ydGFudFwiIG9yIG51bGxcblx0ICogQHNlZSBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1TdHlsZS9jc3MuaHRtbCNDU1MtQ1NTU3R5bGVEZWNsYXJhdGlvbi1zZXRQcm9wZXJ0eVxuXHQgKi9cblx0c2V0UHJvcGVydHk6IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuXHRcdGlmICh0aGlzW25hbWVdKSB7XG5cdFx0XHQvLyBQcm9wZXJ0eSBhbHJlYWR5IGV4aXN0LiBPdmVyd3JpdGUgaXQuXG5cdFx0XHR2YXIgaW5kZXggPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIG5hbWUpO1xuXHRcdFx0aWYgKGluZGV4IDwgMCkge1xuXHRcdFx0XHR0aGlzW3RoaXMubGVuZ3RoXSA9IG5hbWU7XG5cdFx0XHRcdHRoaXMubGVuZ3RoKys7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIE5ldyBwcm9wZXJ0eS5cblx0XHRcdHRoaXNbdGhpcy5sZW5ndGhdID0gbmFtZTtcblx0XHRcdHRoaXMubGVuZ3RoKys7XG5cdFx0fVxuXHRcdHRoaXNbbmFtZV0gPSB2YWx1ZTtcblx0XHR0aGlzLl9pbXBvcnRhbnRzW25hbWVdID0gcHJpb3JpdHk7XG5cdH0sXG5cblx0LyoqXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG5cdCAqIEBzZWUgaHR0cDovL3d3dy53My5vcmcvVFIvRE9NLUxldmVsLTItU3R5bGUvY3NzLmh0bWwjQ1NTLUNTU1N0eWxlRGVjbGFyYXRpb24tcmVtb3ZlUHJvcGVydHlcblx0ICogQHJldHVybiB7c3RyaW5nfSB0aGUgdmFsdWUgb2YgdGhlIHByb3BlcnR5IGlmIGl0IGhhcyBiZWVuIGV4cGxpY2l0bHkgc2V0IGZvciB0aGlzIGRlY2xhcmF0aW9uIGJsb2NrLlxuXHQgKiBSZXR1cm5zIHRoZSBlbXB0eSBzdHJpbmcgaWYgdGhlIHByb3BlcnR5IGhhcyBub3QgYmVlbiBzZXQgb3IgdGhlIHByb3BlcnR5IG5hbWUgZG9lcyBub3QgY29ycmVzcG9uZCB0byBhIGtub3duIENTUyBwcm9wZXJ0eS5cblx0ICovXG5cdHJlbW92ZVByb3BlcnR5OiBmdW5jdGlvbihuYW1lKSB7XG5cdFx0aWYgKCEobmFtZSBpbiB0aGlzKSkge1xuXHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0fVxuXHRcdHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcywgbmFtZSk7XG5cdFx0aWYgKGluZGV4IDwgMCkge1xuXHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0fVxuXHRcdHZhciBwcmV2VmFsdWUgPSB0aGlzW25hbWVdO1xuXHRcdHRoaXNbbmFtZV0gPSBcIlwiO1xuXG5cdFx0Ly8gVGhhdCdzIHdoYXQgV2ViS2l0IGFuZCBPcGVyYSBkb1xuXHRcdEFycmF5LnByb3RvdHlwZS5zcGxpY2UuY2FsbCh0aGlzLCBpbmRleCwgMSk7XG5cblx0XHQvLyBUaGF0J3Mgd2hhdCBGaXJlZm94IGRvZXNcblx0XHQvL3RoaXNbaW5kZXhdID0gXCJcIlxuXG5cdFx0cmV0dXJuIHByZXZWYWx1ZTtcblx0fSxcblxuXHRnZXRQcm9wZXJ0eUNTU1ZhbHVlOiBmdW5jdGlvbigpIHtcblx0XHQvL0ZJWE1FXG5cdH0sXG5cblx0LyoqXG5cdCAqXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG5cdCAqL1xuXHRnZXRQcm9wZXJ0eVByaW9yaXR5OiBmdW5jdGlvbihuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2ltcG9ydGFudHNbbmFtZV0gfHwgXCJcIjtcblx0fSxcblxuXG5cdC8qKlxuXHQgKiAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSBcImF1dG9cIlxuXHQgKiAgIGVsZW1lbnQuc3R5bGUuZ2V0UHJvcGVydHlTaG9ydGhhbmQoXCJvdmVyZmxvdy14XCIpXG5cdCAqICAgLT4gXCJvdmVyZmxvd1wiXG5cdCAqL1xuXHRnZXRQcm9wZXJ0eVNob3J0aGFuZDogZnVuY3Rpb24oKSB7XG5cdFx0Ly9GSVhNRVxuXHR9LFxuXG5cdGlzUHJvcGVydHlJbXBsaWNpdDogZnVuY3Rpb24oKSB7XG5cdFx0Ly9GSVhNRVxuXHR9LFxuXG5cdC8vIERvZXNuJ3Qgd29yayBpbiBJRSA8IDlcblx0Z2V0IGNzc1RleHQoKXtcblx0XHR2YXIgcHJvcGVydGllcyA9IFtdO1xuXHRcdGZvciAodmFyIGk9MCwgbGVuZ3RoPXRoaXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHRcdHZhciBuYW1lID0gdGhpc1tpXTtcblx0XHRcdHZhciB2YWx1ZSA9IHRoaXMuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKTtcblx0XHRcdHZhciBwcmlvcml0eSA9IHRoaXMuZ2V0UHJvcGVydHlQcmlvcml0eShuYW1lKTtcblx0XHRcdGlmIChwcmlvcml0eSkge1xuXHRcdFx0XHRwcmlvcml0eSA9IFwiICFcIiArIHByaW9yaXR5O1xuXHRcdFx0fVxuXHRcdFx0cHJvcGVydGllc1tpXSA9IG5hbWUgKyBcIjogXCIgKyB2YWx1ZSArIHByaW9yaXR5ICsgXCI7XCI7XG5cdFx0fVxuXHRcdHJldHVybiBwcm9wZXJ0aWVzLmpvaW4oXCIgXCIpO1xuXHR9LFxuXG5cdHNldCBjc3NUZXh0KGNzc1RleHQpe1xuXHRcdHZhciBpLCBuYW1lO1xuXHRcdGZvciAoaSA9IHRoaXMubGVuZ3RoOyBpLS07KSB7XG5cdFx0XHRuYW1lID0gdGhpc1tpXTtcblx0XHRcdHRoaXNbbmFtZV0gPSBcIlwiO1xuXHRcdH1cblx0XHRBcnJheS5wcm90b3R5cGUuc3BsaWNlLmNhbGwodGhpcywgMCwgdGhpcy5sZW5ndGgpO1xuXHRcdHRoaXMuX2ltcG9ydGFudHMgPSB7fTtcblxuXHRcdHZhciBkdW1teVJ1bGUgPSBDU1NPTS5wYXJzZSgnI2JvZ3VzeycgKyBjc3NUZXh0ICsgJ30nKS5jc3NSdWxlc1swXS5zdHlsZTtcblx0XHR2YXIgbGVuZ3RoID0gZHVtbXlSdWxlLmxlbmd0aDtcblx0XHRmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHRcdG5hbWUgPSBkdW1teVJ1bGVbaV07XG5cdFx0XHR0aGlzLnNldFByb3BlcnR5KGR1bW15UnVsZVtpXSwgZHVtbXlSdWxlLmdldFByb3BlcnR5VmFsdWUobmFtZSksIGR1bW15UnVsZS5nZXRQcm9wZXJ0eVByaW9yaXR5KG5hbWUpKTtcblx0XHR9XG5cdH1cbn07XG5cblxuLy8uQ29tbW9uSlNcbmV4cG9ydHMuQ1NTU3R5bGVEZWNsYXJhdGlvbiA9IENTU09NLkNTU1N0eWxlRGVjbGFyYXRpb247XG5DU1NPTS5wYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKS5wYXJzZTsgLy8gQ2Fubm90IGJlIGluY2x1ZGVkIHNvb25lciBkdWUgdG8gdGhlIG11dHVhbCBkZXBlbmRlbmN5IGJldHdlZW4gcGFyc2UuanMgYW5kIENTU1N0eWxlRGVjbGFyYXRpb24uanNcbi8vL0NvbW1vbkpTXG4iLCIvLy5Db21tb25KU1xudmFyIENTU09NID0ge1xuXHRDU1NTdHlsZURlY2xhcmF0aW9uOiByZXF1aXJlKFwiLi9DU1NTdHlsZURlY2xhcmF0aW9uXCIpLkNTU1N0eWxlRGVjbGFyYXRpb24sXG5cdENTU1J1bGU6IHJlcXVpcmUoXCIuL0NTU1J1bGVcIikuQ1NTUnVsZVxufTtcbi8vL0NvbW1vbkpTXG5cblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzZWUgaHR0cDovL2Rldi53My5vcmcvY3Nzd2cvY3Nzb20vI2Nzc3N0eWxlcnVsZVxuICogQHNlZSBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1TdHlsZS9jc3MuaHRtbCNDU1MtQ1NTU3R5bGVSdWxlXG4gKi9cbkNTU09NLkNTU1N0eWxlUnVsZSA9IGZ1bmN0aW9uIENTU1N0eWxlUnVsZSgpIHtcblx0Q1NTT00uQ1NTUnVsZS5jYWxsKHRoaXMpO1xuXHR0aGlzLnNlbGVjdG9yVGV4dCA9IFwiXCI7XG5cdHRoaXMuc3R5bGUgPSBuZXcgQ1NTT00uQ1NTU3R5bGVEZWNsYXJhdGlvbjtcblx0dGhpcy5zdHlsZS5wYXJlbnRSdWxlID0gdGhpcztcbn07XG5cbkNTU09NLkNTU1N0eWxlUnVsZS5wcm90b3R5cGUgPSBuZXcgQ1NTT00uQ1NTUnVsZTtcbkNTU09NLkNTU1N0eWxlUnVsZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDU1NPTS5DU1NTdHlsZVJ1bGU7XG5DU1NPTS5DU1NTdHlsZVJ1bGUucHJvdG90eXBlLnR5cGUgPSAxO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQ1NTT00uQ1NTU3R5bGVSdWxlLnByb3RvdHlwZSwgXCJjc3NUZXh0XCIsIHtcblx0Z2V0OiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGV4dDtcblx0XHRpZiAodGhpcy5zZWxlY3RvclRleHQpIHtcblx0XHRcdHRleHQgPSB0aGlzLnNlbGVjdG9yVGV4dCArIFwiIHtcIiArIHRoaXMuc3R5bGUuY3NzVGV4dCArIFwifVwiO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0ZXh0ID0gXCJcIjtcblx0XHR9XG5cdFx0cmV0dXJuIHRleHQ7XG5cdH0sXG5cdHNldDogZnVuY3Rpb24oY3NzVGV4dCkge1xuXHRcdHZhciBydWxlID0gQ1NTT00uQ1NTU3R5bGVSdWxlLnBhcnNlKGNzc1RleHQpO1xuXHRcdHRoaXMuc3R5bGUgPSBydWxlLnN0eWxlO1xuXHRcdHRoaXMuc2VsZWN0b3JUZXh0ID0gcnVsZS5zZWxlY3RvclRleHQ7XG5cdH1cbn0pO1xuXG5cbi8qKlxuICogTk9OLVNUQU5EQVJEXG4gKiBsaWdodHdlaWdodCB2ZXJzaW9uIG9mIHBhcnNlLmpzLlxuICogQHBhcmFtIHtzdHJpbmd9IHJ1bGVUZXh0XG4gKiBAcmV0dXJuIENTU1N0eWxlUnVsZVxuICovXG5DU1NPTS5DU1NTdHlsZVJ1bGUucGFyc2UgPSBmdW5jdGlvbihydWxlVGV4dCkge1xuXHR2YXIgaSA9IDA7XG5cdHZhciBzdGF0ZSA9IFwic2VsZWN0b3JcIjtcblx0dmFyIGluZGV4O1xuXHR2YXIgaiA9IGk7XG5cdHZhciBidWZmZXIgPSBcIlwiO1xuXG5cdHZhciBTSUdOSUZJQ0FOVF9XSElURVNQQUNFID0ge1xuXHRcdFwic2VsZWN0b3JcIjogdHJ1ZSxcblx0XHRcInZhbHVlXCI6IHRydWVcblx0fTtcblxuXHR2YXIgc3R5bGVSdWxlID0gbmV3IENTU09NLkNTU1N0eWxlUnVsZTtcblx0dmFyIHNlbGVjdG9yLCBuYW1lLCB2YWx1ZSwgcHJpb3JpdHk9XCJcIjtcblxuXHRmb3IgKHZhciBjaGFyYWN0ZXI7IGNoYXJhY3RlciA9IHJ1bGVUZXh0LmNoYXJBdChpKTsgaSsrKSB7XG5cblx0XHRzd2l0Y2ggKGNoYXJhY3Rlcikge1xuXG5cdFx0Y2FzZSBcIiBcIjpcblx0XHRjYXNlIFwiXFx0XCI6XG5cdFx0Y2FzZSBcIlxcclwiOlxuXHRcdGNhc2UgXCJcXG5cIjpcblx0XHRjYXNlIFwiXFxmXCI6XG5cdFx0XHRpZiAoU0lHTklGSUNBTlRfV0hJVEVTUEFDRVtzdGF0ZV0pIHtcblx0XHRcdFx0Ly8gU3F1YXNoIDIgb3IgbW9yZSB3aGl0ZS1zcGFjZXMgaW4gdGhlIHJvdyBpbnRvIDFcblx0XHRcdFx0c3dpdGNoIChydWxlVGV4dC5jaGFyQXQoaSAtIDEpKSB7XG5cdFx0XHRcdFx0Y2FzZSBcIiBcIjpcblx0XHRcdFx0XHRjYXNlIFwiXFx0XCI6XG5cdFx0XHRcdFx0Y2FzZSBcIlxcclwiOlxuXHRcdFx0XHRcdGNhc2UgXCJcXG5cIjpcblx0XHRcdFx0XHRjYXNlIFwiXFxmXCI6XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0YnVmZmVyICs9IFwiIFwiO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGJyZWFrO1xuXG5cdFx0Ly8gU3RyaW5nXG5cdFx0Y2FzZSAnXCInOlxuXHRcdFx0aiA9IGkgKyAxO1xuXHRcdFx0aW5kZXggPSBydWxlVGV4dC5pbmRleE9mKCdcIicsIGopICsgMTtcblx0XHRcdGlmICghaW5kZXgpIHtcblx0XHRcdFx0dGhyb3cgJ1wiIGlzIG1pc3NpbmcnO1xuXHRcdFx0fVxuXHRcdFx0YnVmZmVyICs9IHJ1bGVUZXh0LnNsaWNlKGksIGluZGV4KTtcblx0XHRcdGkgPSBpbmRleCAtIDE7XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgXCInXCI6XG5cdFx0XHRqID0gaSArIDE7XG5cdFx0XHRpbmRleCA9IHJ1bGVUZXh0LmluZGV4T2YoXCInXCIsIGopICsgMTtcblx0XHRcdGlmICghaW5kZXgpIHtcblx0XHRcdFx0dGhyb3cgXCInIGlzIG1pc3NpbmdcIjtcblx0XHRcdH1cblx0XHRcdGJ1ZmZlciArPSBydWxlVGV4dC5zbGljZShpLCBpbmRleCk7XG5cdFx0XHRpID0gaW5kZXggLSAxO1xuXHRcdFx0YnJlYWs7XG5cblx0XHQvLyBDb21tZW50XG5cdFx0Y2FzZSBcIi9cIjpcblx0XHRcdGlmIChydWxlVGV4dC5jaGFyQXQoaSArIDEpID09PSBcIipcIikge1xuXHRcdFx0XHRpICs9IDI7XG5cdFx0XHRcdGluZGV4ID0gcnVsZVRleHQuaW5kZXhPZihcIiovXCIsIGkpO1xuXHRcdFx0XHRpZiAoaW5kZXggPT09IC0xKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKFwiTWlzc2luZyAqL1wiKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpID0gaW5kZXggKyAxO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRidWZmZXIgKz0gY2hhcmFjdGVyO1xuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIFwie1wiOlxuXHRcdFx0aWYgKHN0YXRlID09PSBcInNlbGVjdG9yXCIpIHtcblx0XHRcdFx0c3R5bGVSdWxlLnNlbGVjdG9yVGV4dCA9IGJ1ZmZlci50cmltKCk7XG5cdFx0XHRcdGJ1ZmZlciA9IFwiXCI7XG5cdFx0XHRcdHN0YXRlID0gXCJuYW1lXCI7XG5cdFx0XHR9XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgXCI6XCI6XG5cdFx0XHRpZiAoc3RhdGUgPT09IFwibmFtZVwiKSB7XG5cdFx0XHRcdG5hbWUgPSBidWZmZXIudHJpbSgpO1xuXHRcdFx0XHRidWZmZXIgPSBcIlwiO1xuXHRcdFx0XHRzdGF0ZSA9IFwidmFsdWVcIjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGJ1ZmZlciArPSBjaGFyYWN0ZXI7XG5cdFx0XHR9XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgXCIhXCI6XG5cdFx0XHRpZiAoc3RhdGUgPT09IFwidmFsdWVcIiAmJiBydWxlVGV4dC5pbmRleE9mKFwiIWltcG9ydGFudFwiLCBpKSA9PT0gaSkge1xuXHRcdFx0XHRwcmlvcml0eSA9IFwiaW1wb3J0YW50XCI7XG5cdFx0XHRcdGkgKz0gXCJpbXBvcnRhbnRcIi5sZW5ndGg7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRidWZmZXIgKz0gY2hhcmFjdGVyO1xuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIFwiO1wiOlxuXHRcdFx0aWYgKHN0YXRlID09PSBcInZhbHVlXCIpIHtcblx0XHRcdFx0c3R5bGVSdWxlLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIGJ1ZmZlci50cmltKCksIHByaW9yaXR5KTtcblx0XHRcdFx0cHJpb3JpdHkgPSBcIlwiO1xuXHRcdFx0XHRidWZmZXIgPSBcIlwiO1xuXHRcdFx0XHRzdGF0ZSA9IFwibmFtZVwiO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YnVmZmVyICs9IGNoYXJhY3Rlcjtcblx0XHRcdH1cblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGlmIChzdGF0ZSA9PT0gXCJ2YWx1ZVwiKSB7XG5cdFx0XHRcdHN0eWxlUnVsZS5zdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCBidWZmZXIudHJpbSgpLCBwcmlvcml0eSk7XG5cdFx0XHRcdHByaW9yaXR5ID0gXCJcIjtcblx0XHRcdFx0YnVmZmVyID0gXCJcIjtcblx0XHRcdH0gZWxzZSBpZiAoc3RhdGUgPT09IFwibmFtZVwiKSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YnVmZmVyICs9IGNoYXJhY3Rlcjtcblx0XHRcdH1cblx0XHRcdHN0YXRlID0gXCJzZWxlY3RvclwiO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRkZWZhdWx0OlxuXHRcdFx0YnVmZmVyICs9IGNoYXJhY3Rlcjtcblx0XHRcdGJyZWFrO1xuXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHN0eWxlUnVsZTtcblxufTtcblxuXG4vLy5Db21tb25KU1xuZXhwb3J0cy5DU1NTdHlsZVJ1bGUgPSBDU1NPTS5DU1NTdHlsZVJ1bGU7XG4vLy9Db21tb25KU1xuIiwiLy8uQ29tbW9uSlNcbnZhciBDU1NPTSA9IHtcblx0U3R5bGVTaGVldDogcmVxdWlyZShcIi4vU3R5bGVTaGVldFwiKS5TdHlsZVNoZWV0LFxuXHRDU1NTdHlsZVJ1bGU6IHJlcXVpcmUoXCIuL0NTU1N0eWxlUnVsZVwiKS5DU1NTdHlsZVJ1bGVcbn07XG4vLy9Db21tb25KU1xuXG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2VlIGh0dHA6Ly93d3cudzMub3JnL1RSL0RPTS1MZXZlbC0yLVN0eWxlL2Nzcy5odG1sI0NTUy1DU1NTdHlsZVNoZWV0XG4gKi9cbkNTU09NLkNTU1N0eWxlU2hlZXQgPSBmdW5jdGlvbiBDU1NTdHlsZVNoZWV0KCkge1xuXHRDU1NPTS5TdHlsZVNoZWV0LmNhbGwodGhpcyk7XG5cdHRoaXMuY3NzUnVsZXMgPSBbXTtcbn07XG5cblxuQ1NTT00uQ1NTU3R5bGVTaGVldC5wcm90b3R5cGUgPSBuZXcgQ1NTT00uU3R5bGVTaGVldDtcbkNTU09NLkNTU1N0eWxlU2hlZXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ1NTT00uQ1NTU3R5bGVTaGVldDtcblxuXG4vKipcbiAqIFVzZWQgdG8gaW5zZXJ0IGEgbmV3IHJ1bGUgaW50byB0aGUgc3R5bGUgc2hlZXQuIFRoZSBuZXcgcnVsZSBub3cgYmVjb21lcyBwYXJ0IG9mIHRoZSBjYXNjYWRlLlxuICpcbiAqICAgc2hlZXQgPSBuZXcgU2hlZXQoXCJib2R5IHttYXJnaW46IDB9XCIpXG4gKiAgIHNoZWV0LnRvU3RyaW5nKClcbiAqICAgLT4gXCJib2R5e21hcmdpbjowO31cIlxuICogICBzaGVldC5pbnNlcnRSdWxlKFwiaW1nIHtib3JkZXI6IG5vbmV9XCIsIDApXG4gKiAgIC0+IDBcbiAqICAgc2hlZXQudG9TdHJpbmcoKVxuICogICAtPiBcImltZ3tib3JkZXI6bm9uZTt9Ym9keXttYXJnaW46MDt9XCJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcnVsZVxuICogQHBhcmFtIHtudW1iZXJ9IGluZGV4XG4gKiBAc2VlIGh0dHA6Ly93d3cudzMub3JnL1RSL0RPTS1MZXZlbC0yLVN0eWxlL2Nzcy5odG1sI0NTUy1DU1NTdHlsZVNoZWV0LWluc2VydFJ1bGVcbiAqIEByZXR1cm4ge251bWJlcn0gVGhlIGluZGV4IHdpdGhpbiB0aGUgc3R5bGUgc2hlZXQncyBydWxlIGNvbGxlY3Rpb24gb2YgdGhlIG5ld2x5IGluc2VydGVkIHJ1bGUuXG4gKi9cbkNTU09NLkNTU1N0eWxlU2hlZXQucHJvdG90eXBlLmluc2VydFJ1bGUgPSBmdW5jdGlvbihydWxlLCBpbmRleCkge1xuXHRpZiAoaW5kZXggPCAwIHx8IGluZGV4ID4gdGhpcy5jc3NSdWxlcy5sZW5ndGgpIHtcblx0XHR0aHJvdyBuZXcgUmFuZ2VFcnJvcihcIklOREVYX1NJWkVfRVJSXCIpO1xuXHR9XG5cdHZhciBjc3NSdWxlID0gQ1NTT00ucGFyc2UocnVsZSkuY3NzUnVsZXNbMF07XG5cdGNzc1J1bGUucGFyZW50U3R5bGVTaGVldCA9IHRoaXM7XG5cdHRoaXMuY3NzUnVsZXMuc3BsaWNlKGluZGV4LCAwLCBjc3NSdWxlKTtcblx0cmV0dXJuIGluZGV4O1xufTtcblxuXG4vKipcbiAqIFVzZWQgdG8gZGVsZXRlIGEgcnVsZSBmcm9tIHRoZSBzdHlsZSBzaGVldC5cbiAqXG4gKiAgIHNoZWV0ID0gbmV3IFNoZWV0KFwiaW1ne2JvcmRlcjpub25lfSBib2R5e21hcmdpbjowfVwiKVxuICogICBzaGVldC50b1N0cmluZygpXG4gKiAgIC0+IFwiaW1ne2JvcmRlcjpub25lO31ib2R5e21hcmdpbjowO31cIlxuICogICBzaGVldC5kZWxldGVSdWxlKDApXG4gKiAgIHNoZWV0LnRvU3RyaW5nKClcbiAqICAgLT4gXCJib2R5e21hcmdpbjowO31cIlxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCB3aXRoaW4gdGhlIHN0eWxlIHNoZWV0J3MgcnVsZSBsaXN0IG9mIHRoZSBydWxlIHRvIHJlbW92ZS5cbiAqIEBzZWUgaHR0cDovL3d3dy53My5vcmcvVFIvRE9NLUxldmVsLTItU3R5bGUvY3NzLmh0bWwjQ1NTLUNTU1N0eWxlU2hlZXQtZGVsZXRlUnVsZVxuICovXG5DU1NPTS5DU1NTdHlsZVNoZWV0LnByb3RvdHlwZS5kZWxldGVSdWxlID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0aWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSB0aGlzLmNzc1J1bGVzLmxlbmd0aCkge1xuXHRcdHRocm93IG5ldyBSYW5nZUVycm9yKFwiSU5ERVhfU0laRV9FUlJcIik7XG5cdH1cblx0dGhpcy5jc3NSdWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xufTtcblxuXG4vKipcbiAqIE5PTi1TVEFOREFSRFxuICogQHJldHVybiB7c3RyaW5nfSBzZXJpYWxpemUgc3R5bGVzaGVldFxuICovXG5DU1NPTS5DU1NTdHlsZVNoZWV0LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgcmVzdWx0ID0gXCJcIjtcblx0dmFyIHJ1bGVzID0gdGhpcy5jc3NSdWxlcztcblx0Zm9yICh2YXIgaT0wOyBpPHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0cmVzdWx0ICs9IHJ1bGVzW2ldLmNzc1RleHQgKyBcIlxcblwiO1xuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8vLkNvbW1vbkpTXG5leHBvcnRzLkNTU1N0eWxlU2hlZXQgPSBDU1NPTS5DU1NTdHlsZVNoZWV0O1xuQ1NTT00ucGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlJykucGFyc2U7IC8vIENhbm5vdCBiZSBpbmNsdWRlZCBzb29uZXIgZHVlIHRvIHRoZSBtdXR1YWwgZGVwZW5kZW5jeSBiZXR3ZWVuIHBhcnNlLmpzIGFuZCBDU1NTdHlsZVNoZWV0LmpzXG4vLy9Db21tb25KU1xuIiwiLy8uQ29tbW9uSlNcbnZhciBDU1NPTSA9IHt9O1xuLy8vQ29tbW9uSlNcblxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNlZSBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1TdHlsZS9jc3MuaHRtbCNDU1MtQ1NTVmFsdWVcbiAqXG4gKiBUT0RPOiBhZGQgaWYgbmVlZGVkXG4gKi9cbkNTU09NLkNTU1ZhbHVlID0gZnVuY3Rpb24gQ1NTVmFsdWUoKSB7XG59O1xuXG5DU1NPTS5DU1NWYWx1ZS5wcm90b3R5cGUgPSB7XG5cdGNvbnN0cnVjdG9yOiBDU1NPTS5DU1NWYWx1ZSxcblxuXHQvLyBAc2VlOiBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1TdHlsZS9jc3MuaHRtbCNDU1MtQ1NTVmFsdWVcblx0c2V0IGNzc1RleHQodGV4dCkge1xuXHRcdHZhciBuYW1lID0gdGhpcy5fZ2V0Q29uc3RydWN0b3JOYW1lKCk7XG5cblx0XHR0aHJvdyBuZXcgRXhjZXB0aW9uKCdET01FeGNlcHRpb246IHByb3BlcnR5IFwiY3NzVGV4dFwiIG9mIFwiJyArIG5hbWUgKyAnXCIgaXMgcmVhZG9ubHkhJyk7XG5cdH0sXG5cblx0Z2V0IGNzc1RleHQoKSB7XG5cdFx0dmFyIG5hbWUgPSB0aGlzLl9nZXRDb25zdHJ1Y3Rvck5hbWUoKTtcblxuXHRcdHRocm93IG5ldyBFeGNlcHRpb24oJ2dldHRlciBcImNzc1RleHRcIiBvZiBcIicgKyBuYW1lICsgJ1wiIGlzIG5vdCBpbXBsZW1lbnRlZCEnKTtcblx0fSxcblxuXHRfZ2V0Q29uc3RydWN0b3JOYW1lOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcyA9IHRoaXMuY29uc3RydWN0b3IudG9TdHJpbmcoKSxcblx0XHRcdFx0YyA9IHMubWF0Y2goL2Z1bmN0aW9uXFxzKFteXFwoXSspLyksXG5cdFx0XHRcdG5hbWUgPSBjWzFdO1xuXG5cdFx0cmV0dXJuIG5hbWU7XG5cdH1cbn07XG5cblxuLy8uQ29tbW9uSlNcbmV4cG9ydHMuQ1NTVmFsdWUgPSBDU1NPTS5DU1NWYWx1ZTtcbi8vL0NvbW1vbkpTXG4iLCIvLy5Db21tb25KU1xudmFyIENTU09NID0ge1xuXHRDU1NWYWx1ZTogcmVxdWlyZSgnLi9DU1NWYWx1ZScpLkNTU1ZhbHVlXG59O1xuLy8vQ29tbW9uSlNcblxuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQHNlZSBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXM1Mzc2MzQodj12cy44NSkuYXNweFxuICpcbiAqL1xuQ1NTT00uQ1NTVmFsdWVFeHByZXNzaW9uID0gZnVuY3Rpb24gQ1NTVmFsdWVFeHByZXNzaW9uKHRva2VuLCBpZHgpIHtcblx0dGhpcy5fdG9rZW4gPSB0b2tlbjtcblx0dGhpcy5faWR4ID0gaWR4O1xufTtcblxuQ1NTT00uQ1NTVmFsdWVFeHByZXNzaW9uLnByb3RvdHlwZSA9IG5ldyBDU1NPTS5DU1NWYWx1ZTtcbkNTU09NLkNTU1ZhbHVlRXhwcmVzc2lvbi5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDU1NPTS5DU1NWYWx1ZUV4cHJlc3Npb247XG5cbi8qKlxuICogcGFyc2UgY3NzIGV4cHJlc3Npb24oKSB2YWx1ZVxuICpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqXHRcdFx0XHQgLSBlcnJvcjpcbiAqXHRcdFx0XHQgb3JcbiAqXHRcdFx0XHQgLSBpZHg6XG4gKlx0XHRcdFx0IC0gZXhwcmVzc2lvbjpcbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIC5zZWxlY3RvciB7XG4gKlx0XHR6b29tOiBleHByZXNzaW9uKGRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCA+IDEwMDAgPyAnMTAwMHB4JyA6ICdhdXRvJyk7XG4gKiB9XG4gKi9cbkNTU09NLkNTU1ZhbHVlRXhwcmVzc2lvbi5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbigpIHtcblx0dmFyIHRva2VuID0gdGhpcy5fdG9rZW4sXG5cdFx0XHRpZHggPSB0aGlzLl9pZHg7XG5cblx0dmFyIGNoYXJhY3RlciA9ICcnLFxuXHRcdFx0ZXhwcmVzc2lvbiA9ICcnLFxuXHRcdFx0ZXJyb3IgPSAnJyxcblx0XHRcdGluZm8sXG5cdFx0XHRwYXJlbiA9IFtdO1xuXG5cblx0Zm9yICg7IDsgKytpZHgpIHtcblx0XHRjaGFyYWN0ZXIgPSB0b2tlbi5jaGFyQXQoaWR4KTtcblxuXHRcdC8vIGVuZCBvZiB0b2tlblxuXHRcdGlmIChjaGFyYWN0ZXIgPT0gJycpIHtcblx0XHRcdGVycm9yID0gJ2NzcyBleHByZXNzaW9uIGVycm9yOiB1bmZpbmlzaGVkIGV4cHJlc3Npb24hJztcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHN3aXRjaChjaGFyYWN0ZXIpIHtcblx0XHRcdGNhc2UgJygnOlxuXHRcdFx0XHRwYXJlbi5wdXNoKGNoYXJhY3Rlcik7XG5cdFx0XHRcdGV4cHJlc3Npb24gKz0gY2hhcmFjdGVyO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnKSc6XG5cdFx0XHRcdHBhcmVuLnBvcChjaGFyYWN0ZXIpO1xuXHRcdFx0XHRleHByZXNzaW9uICs9IGNoYXJhY3Rlcjtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgJy8nOlxuXHRcdFx0XHRpZiAoaW5mbyA9IHRoaXMuX3BhcnNlSlNDb21tZW50KHRva2VuLCBpZHgpKSB7IC8vIGNvbW1lbnQ/XG5cdFx0XHRcdFx0aWYgKGluZm8uZXJyb3IpIHtcblx0XHRcdFx0XHRcdGVycm9yID0gJ2NzcyBleHByZXNzaW9uIGVycm9yOiB1bmZpbmlzaGVkIGNvbW1lbnQgaW4gZXhwcmVzc2lvbiEnO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpZHggPSBpbmZvLmlkeDtcblx0XHRcdFx0XHRcdC8vIGlnbm9yZSB0aGUgY29tbWVudFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChpbmZvID0gdGhpcy5fcGFyc2VKU1JleEV4cCh0b2tlbiwgaWR4KSkgeyAvLyByZWdleHBcblx0XHRcdFx0XHRpZHggPSBpbmZvLmlkeDtcblx0XHRcdFx0XHRleHByZXNzaW9uICs9IGluZm8udGV4dDtcblx0XHRcdFx0fSBlbHNlIHsgLy8gb3RoZXJcblx0XHRcdFx0XHRleHByZXNzaW9uICs9IGNoYXJhY3Rlcjtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSBcIidcIjpcblx0XHRcdGNhc2UgJ1wiJzpcblx0XHRcdFx0aW5mbyA9IHRoaXMuX3BhcnNlSlNTdHJpbmcodG9rZW4sIGlkeCwgY2hhcmFjdGVyKTtcblx0XHRcdFx0aWYgKGluZm8pIHsgLy8gc3RyaW5nXG5cdFx0XHRcdFx0aWR4ID0gaW5mby5pZHg7XG5cdFx0XHRcdFx0ZXhwcmVzc2lvbiArPSBpbmZvLnRleHQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZXhwcmVzc2lvbiArPSBjaGFyYWN0ZXI7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGV4cHJlc3Npb24gKz0gY2hhcmFjdGVyO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdC8vIGVuZCBvZiBleHByZXNzaW9uXG5cdFx0aWYgKHBhcmVuLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblxuXHR2YXIgcmV0O1xuXHRpZiAoZXJyb3IpIHtcblx0XHRyZXQgPSB7XG5cdFx0XHRlcnJvcjogZXJyb3Jcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0cmV0ID0ge1xuXHRcdFx0aWR4OiBpZHgsXG5cdFx0XHRleHByZXNzaW9uOiBleHByZXNzaW9uXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHJldDtcbn07XG5cblxuLyoqXG4gKlxuICogQHJldHVybiB7T2JqZWN0fGZhbHNlfVxuICogICAgICAgICAgLSBpZHg6XG4gKiAgICAgICAgICAtIHRleHQ6XG4gKiAgICAgICAgICBvclxuICogICAgICAgICAgLSBlcnJvcjpcbiAqICAgICAgICAgIG9yXG4gKiAgICAgICAgICBmYWxzZVxuICpcbiAqL1xuQ1NTT00uQ1NTVmFsdWVFeHByZXNzaW9uLnByb3RvdHlwZS5fcGFyc2VKU0NvbW1lbnQgPSBmdW5jdGlvbih0b2tlbiwgaWR4KSB7XG5cdHZhciBuZXh0Q2hhciA9IHRva2VuLmNoYXJBdChpZHggKyAxKSxcblx0XHRcdHRleHQ7XG5cblx0aWYgKG5leHRDaGFyID09ICcvJyB8fCBuZXh0Q2hhciA9PSAnKicpIHtcblx0XHR2YXIgc3RhcnRJZHggPSBpZHgsXG5cdFx0XHRcdGVuZElkeCxcblx0XHRcdFx0Y29tbWVudEVuZENoYXI7XG5cblx0XHRpZiAobmV4dENoYXIgPT0gJy8nKSB7IC8vIGxpbmUgY29tbWVudFxuXHRcdFx0Y29tbWVudEVuZENoYXIgPSAnXFxuJztcblx0XHR9IGVsc2UgaWYgKG5leHRDaGFyID09ICcqJykgeyAvLyBibG9jayBjb21tZW50XG5cdFx0XHRjb21tZW50RW5kQ2hhciA9ICcqLyc7XG5cdFx0fVxuXG5cdFx0ZW5kSWR4ID0gdG9rZW4uaW5kZXhPZihjb21tZW50RW5kQ2hhciwgc3RhcnRJZHggKyAxICsgMSk7XG5cdFx0aWYgKGVuZElkeCAhPT0gLTEpIHtcblx0XHRcdGVuZElkeCA9IGVuZElkeCArIGNvbW1lbnRFbmRDaGFyLmxlbmd0aCAtIDE7XG5cdFx0XHR0ZXh0ID0gdG9rZW4uc3Vic3RyaW5nKGlkeCwgZW5kSWR4ICsgMSk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRpZHg6IGVuZElkeCxcblx0XHRcdFx0dGV4dDogdGV4dFxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRlcnJvciA9ICdjc3MgZXhwcmVzc2lvbiBlcnJvcjogdW5maW5pc2hlZCBjb21tZW50IGluIGV4cHJlc3Npb24hJztcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGVycm9yOiBlcnJvclxuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn07XG5cblxuLyoqXG4gKlxuICogQHJldHVybiB7T2JqZWN0fGZhbHNlfVxuICpcdFx0XHRcdFx0LSBpZHg6XG4gKlx0XHRcdFx0XHQtIHRleHQ6XG4gKlx0XHRcdFx0XHRvciBcbiAqXHRcdFx0XHRcdGZhbHNlXG4gKlxuICovXG5DU1NPTS5DU1NWYWx1ZUV4cHJlc3Npb24ucHJvdG90eXBlLl9wYXJzZUpTU3RyaW5nID0gZnVuY3Rpb24odG9rZW4sIGlkeCwgc2VwKSB7XG5cdHZhciBlbmRJZHggPSB0aGlzLl9maW5kTWF0Y2hlZElkeCh0b2tlbiwgaWR4LCBzZXApLFxuXHRcdFx0dGV4dDtcblxuXHRpZiAoZW5kSWR4ID09PSAtMSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSBlbHNlIHtcblx0XHR0ZXh0ID0gdG9rZW4uc3Vic3RyaW5nKGlkeCwgZW5kSWR4ICsgc2VwLmxlbmd0aCk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0aWR4OiBlbmRJZHgsXG5cdFx0XHR0ZXh0OiB0ZXh0XG5cdFx0fVxuXHR9XG59O1xuXG5cbi8qKlxuICogcGFyc2UgcmVnZXhwIGluIGNzcyBleHByZXNzaW9uXG4gKlxuICogQHJldHVybiB7T2JqZWN0fGZhbHNlfVxuICpcdFx0XHRcdCAtIGlkeDpcbiAqXHRcdFx0XHQgLSByZWdFeHA6XG4gKlx0XHRcdFx0IG9yIFxuICpcdFx0XHRcdCBmYWxzZVxuICovXG5cbi8qXG5cbmFsbCBsZWdhbCBSZWdFeHBcbiBcbi9hL1xuKC9hLylcblsvYS9dXG5bMTIsIC9hL11cblxuIS9hL1xuXG4rL2EvXG4tL2EvXG4qIC9hL1xuLyAvYS9cbiUvYS9cblxuPT09L2EvXG4hPT0vYS9cbj09L2EvXG4hPS9hL1xuPi9hL1xuPj0vYS9cbjwvYS9cbjw9L2EvXG5cbiYvYS9cbnwvYS9cbl4vYS9cbn4vYS9cbjw8L2EvXG4+Pi9hL1xuPj4+L2EvXG5cbiYmL2EvXG58fC9hL1xuPy9hL1xuPS9hL1xuLC9hL1xuXG5cdFx0ZGVsZXRlIC9hL1xuXHRcdFx0XHRpbiAvYS9cbmluc3RhbmNlb2YgL2EvXG5cdFx0XHQgbmV3IC9hL1xuXHRcdHR5cGVvZiAvYS9cblx0XHRcdHZvaWQgL2EvXG5cbiovXG5DU1NPTS5DU1NWYWx1ZUV4cHJlc3Npb24ucHJvdG90eXBlLl9wYXJzZUpTUmV4RXhwID0gZnVuY3Rpb24odG9rZW4sIGlkeCkge1xuXHR2YXIgYmVmb3JlID0gdG9rZW4uc3Vic3RyaW5nKDAsIGlkeCkucmVwbGFjZSgvXFxzKyQvLCBcIlwiKSxcblx0XHRcdGxlZ2FsUmVneCA9IFtcblx0XHRcdFx0L14kLyxcblx0XHRcdFx0L1xcKCQvLFxuXHRcdFx0XHQvXFxbJC8sXG5cdFx0XHRcdC9cXCEkLyxcblx0XHRcdFx0L1xcKyQvLFxuXHRcdFx0XHQvXFwtJC8sXG5cdFx0XHRcdC9cXCokLyxcblx0XHRcdFx0L1xcL1xccysvLFxuXHRcdFx0XHQvXFwlJC8sXG5cdFx0XHRcdC9cXD0kLyxcblx0XHRcdFx0L1xcPiQvLFxuXHRcdFx0XHQvXFw8JC8sXG5cdFx0XHRcdC9cXCYkLyxcblx0XHRcdFx0L1xcfCQvLFxuXHRcdFx0XHQvXFxeJC8sXG5cdFx0XHRcdC9cXH4kLyxcblx0XHRcdFx0L1xcPyQvLFxuXHRcdFx0XHQvXFwsJC8sXG5cdFx0XHRcdC9kZWxldGUkLyxcblx0XHRcdFx0L2luJC8sXG5cdFx0XHRcdC9pbnN0YW5jZW9mJC8sXG5cdFx0XHRcdC9uZXckLyxcblx0XHRcdFx0L3R5cGVvZiQvLFxuXHRcdFx0XHQvdm9pZCQvLFxuXHRcdFx0XTtcblxuXHR2YXIgaXNMZWdhbCA9IGxlZ2FsUmVneC5zb21lKGZ1bmN0aW9uKHJlZykge1xuXHRcdHJldHVybiByZWcudGVzdChiZWZvcmUpO1xuXHR9KTtcblxuXHRpZiAoIWlzTGVnYWwpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gZWxzZSB7XG5cdFx0dmFyIHNlcCA9ICcvJztcblxuXHRcdC8vIHNhbWUgbG9naWMgYXMgc3RyaW5nXG5cdFx0cmV0dXJuIHRoaXMuX3BhcnNlSlNTdHJpbmcodG9rZW4sIGlkeCwgc2VwKTtcblx0fVxufTtcblxuXG4vKipcbiAqXG4gKiBmaW5kIG5leHQgc2VwKHNhbWUgbGluZSkgaW5kZXggaW4gYHRva2VuYFxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqXG4gKi9cbkNTU09NLkNTU1ZhbHVlRXhwcmVzc2lvbi5wcm90b3R5cGUuX2ZpbmRNYXRjaGVkSWR4ID0gZnVuY3Rpb24odG9rZW4sIGlkeCwgc2VwKSB7XG5cdHZhciBzdGFydElkeCA9IGlkeCxcblx0XHRcdGVuZElkeDtcblxuXHR2YXIgTk9UX0ZPVU5EID0gLTE7XG5cblx0d2hpbGUodHJ1ZSkge1xuXHRcdGVuZElkeCA9IHRva2VuLmluZGV4T2Yoc2VwLCBzdGFydElkeCArIDEpO1xuXG5cdFx0aWYgKGVuZElkeCA9PT0gLTEpIHsgLy8gbm90IGZvdW5kXG5cdFx0XHRlbmRJZHggPSBOT1RfRk9VTkQ7XG5cdFx0XHRicmVhaztcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIHRleHQgPSB0b2tlbi5zdWJzdHJpbmcoaWR4ICsgMSwgZW5kSWR4KSxcblx0XHRcdFx0XHRtYXRjaGVkID0gdGV4dC5tYXRjaCgvXFxcXCskLyk7XG5cdFx0XHRpZiAoIW1hdGNoZWQgfHwgbWF0Y2hlZFswXSAlIDIgPT0gMCkgeyAvLyBub3QgZXNjYXBlZFxuXHRcdFx0XHRicmVhaztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHN0YXJ0SWR4ID0gZW5kSWR4O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIGJvdW5kYXJ5IG11c3QgYmUgaW4gdGhlIHNhbWUgbGluZShqcyBzdGluZyBvciByZWdleHApXG5cdHZhciBuZXh0TmV3TGluZUlkeCA9IHRva2VuLmluZGV4T2YoJ1xcbicsIGlkeCArIDEpO1xuXHRpZiAobmV4dE5ld0xpbmVJZHggPCBlbmRJZHgpIHtcblx0XHRlbmRJZHggPSBOT1RfRk9VTkQ7XG5cdH1cblxuXG5cdHJldHVybiBlbmRJZHg7XG59XG5cblxuXG5cbi8vLkNvbW1vbkpTXG5leHBvcnRzLkNTU1ZhbHVlRXhwcmVzc2lvbiA9IENTU09NLkNTU1ZhbHVlRXhwcmVzc2lvbjtcbi8vL0NvbW1vbkpTXG4iLCIvLy5Db21tb25KU1xudmFyIENTU09NID0ge307XG4vLy9Db21tb25KU1xuXG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0NTUy9ALW1vei1kb2N1bWVudFxuICovXG5DU1NPTS5NYXRjaGVyTGlzdCA9IGZ1bmN0aW9uIE1hdGNoZXJMaXN0KCl7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xufTtcblxuQ1NTT00uTWF0Y2hlckxpc3QucHJvdG90eXBlID0ge1xuXG4gICAgY29uc3RydWN0b3I6IENTU09NLk1hdGNoZXJMaXN0LFxuXG4gICAgLyoqXG4gICAgICogQHJldHVybiB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldCBtYXRjaGVyVGV4dCgpIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5qb2luLmNhbGwodGhpcywgXCIsIFwiKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gICAgICovXG4gICAgc2V0IG1hdGNoZXJUZXh0KHZhbHVlKSB7XG4gICAgICAgIC8vIGp1c3QgYSB0ZW1wb3Jhcnkgc29sdXRpb24sIGFjdHVhbGx5IGl0IG1heSBiZSB3cm9uZyBieSBqdXN0IHNwbGl0IHRoZSB2YWx1ZSB3aXRoICcsJywgYmVjYXVzZSBhIHVybCBjYW4gaW5jbHVkZSAnLCcuXG4gICAgICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChcIixcIik7XG4gICAgICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCA9IHZhbHVlcy5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpc1tpXSA9IHZhbHVlc1tpXS50cmltKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1hdGNoZXJcbiAgICAgKi9cbiAgICBhcHBlbmRNYXRjaGVyOiBmdW5jdGlvbihtYXRjaGVyKSB7XG4gICAgICAgIGlmIChBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIG1hdGNoZXIpID09PSAtMSkge1xuICAgICAgICAgICAgdGhpc1t0aGlzLmxlbmd0aF0gPSBtYXRjaGVyO1xuICAgICAgICAgICAgdGhpcy5sZW5ndGgrKztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWF0Y2hlclxuICAgICAqL1xuICAgIGRlbGV0ZU1hdGNoZXI6IGZ1bmN0aW9uKG1hdGNoZXIpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCBtYXRjaGVyKTtcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5jYWxsKHRoaXMsIGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgIH1cblxufTtcblxuXG4vLy5Db21tb25KU1xuZXhwb3J0cy5NYXRjaGVyTGlzdCA9IENTU09NLk1hdGNoZXJMaXN0O1xuLy8vQ29tbW9uSlNcbiIsIi8vLkNvbW1vbkpTXG52YXIgQ1NTT00gPSB7fTtcbi8vL0NvbW1vbkpTXG5cblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBzZWUgaHR0cDovL2Rldi53My5vcmcvY3Nzd2cvY3Nzb20vI3RoZS1tZWRpYWxpc3QtaW50ZXJmYWNlXG4gKi9cbkNTU09NLk1lZGlhTGlzdCA9IGZ1bmN0aW9uIE1lZGlhTGlzdCgpe1xuXHR0aGlzLmxlbmd0aCA9IDA7XG59O1xuXG5DU1NPTS5NZWRpYUxpc3QucHJvdG90eXBlID0ge1xuXG5cdGNvbnN0cnVjdG9yOiBDU1NPTS5NZWRpYUxpc3QsXG5cblx0LyoqXG5cdCAqIEByZXR1cm4ge3N0cmluZ31cblx0ICovXG5cdGdldCBtZWRpYVRleHQoKSB7XG5cdFx0cmV0dXJuIEFycmF5LnByb3RvdHlwZS5qb2luLmNhbGwodGhpcywgXCIsIFwiKTtcblx0fSxcblxuXHQvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG5cdCAqL1xuXHRzZXQgbWVkaWFUZXh0KHZhbHVlKSB7XG5cdFx0dmFyIHZhbHVlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKTtcblx0XHR2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGggPSB2YWx1ZXMubGVuZ3RoO1xuXHRcdGZvciAodmFyIGk9MDsgaTxsZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpc1tpXSA9IHZhbHVlc1tpXS50cmltKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbWVkaXVtXG5cdCAqL1xuXHRhcHBlbmRNZWRpdW06IGZ1bmN0aW9uKG1lZGl1bSkge1xuXHRcdGlmIChBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIG1lZGl1bSkgPT09IC0xKSB7XG5cdFx0XHR0aGlzW3RoaXMubGVuZ3RoXSA9IG1lZGl1bTtcblx0XHRcdHRoaXMubGVuZ3RoKys7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbWVkaXVtXG5cdCAqL1xuXHRkZWxldGVNZWRpdW06IGZ1bmN0aW9uKG1lZGl1bSkge1xuXHRcdHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcywgbWVkaXVtKTtcblx0XHRpZiAoaW5kZXggIT09IC0xKSB7XG5cdFx0XHRBcnJheS5wcm90b3R5cGUuc3BsaWNlLmNhbGwodGhpcywgaW5kZXgsIDEpO1xuXHRcdH1cblx0fVxuXG59O1xuXG5cbi8vLkNvbW1vbkpTXG5leHBvcnRzLk1lZGlhTGlzdCA9IENTU09NLk1lZGlhTGlzdDtcbi8vL0NvbW1vbkpTXG4iLCIvLy5Db21tb25KU1xudmFyIENTU09NID0ge307XG4vLy9Db21tb25KU1xuXG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAc2VlIGh0dHA6Ly9kZXYudzMub3JnL2Nzc3dnL2Nzc29tLyN0aGUtc3R5bGVzaGVldC1pbnRlcmZhY2VcbiAqL1xuQ1NTT00uU3R5bGVTaGVldCA9IGZ1bmN0aW9uIFN0eWxlU2hlZXQoKSB7XG5cdHRoaXMucGFyZW50U3R5bGVTaGVldCA9IG51bGw7XG59O1xuXG5cbi8vLkNvbW1vbkpTXG5leHBvcnRzLlN0eWxlU2hlZXQgPSBDU1NPTS5TdHlsZVNoZWV0O1xuLy8vQ29tbW9uSlNcbiIsIi8vLkNvbW1vbkpTXG52YXIgQ1NTT00gPSB7XG5cdENTU1N0eWxlU2hlZXQ6IHJlcXVpcmUoXCIuL0NTU1N0eWxlU2hlZXRcIikuQ1NTU3R5bGVTaGVldCxcblx0Q1NTU3R5bGVSdWxlOiByZXF1aXJlKFwiLi9DU1NTdHlsZVJ1bGVcIikuQ1NTU3R5bGVSdWxlLFxuXHRDU1NNZWRpYVJ1bGU6IHJlcXVpcmUoXCIuL0NTU01lZGlhUnVsZVwiKS5DU1NNZWRpYVJ1bGUsXG5cdENTU1N0eWxlRGVjbGFyYXRpb246IHJlcXVpcmUoXCIuL0NTU1N0eWxlRGVjbGFyYXRpb25cIikuQ1NTU3R5bGVEZWNsYXJhdGlvbixcblx0Q1NTS2V5ZnJhbWVSdWxlOiByZXF1aXJlKCcuL0NTU0tleWZyYW1lUnVsZScpLkNTU0tleWZyYW1lUnVsZSxcblx0Q1NTS2V5ZnJhbWVzUnVsZTogcmVxdWlyZSgnLi9DU1NLZXlmcmFtZXNSdWxlJykuQ1NTS2V5ZnJhbWVzUnVsZVxufTtcbi8vL0NvbW1vbkpTXG5cblxuLyoqXG4gKiBQcm9kdWNlcyBhIGRlZXAgY29weSBvZiBzdHlsZXNoZWV0IOKAlCB0aGUgaW5zdGFuY2UgdmFyaWFibGVzIG9mIHN0eWxlc2hlZXQgYXJlIGNvcGllZCByZWN1cnNpdmVseS5cbiAqIEBwYXJhbSB7Q1NTU3R5bGVTaGVldHxDU1NPTS5DU1NTdHlsZVNoZWV0fSBzdHlsZXNoZWV0XG4gKiBAbm9zaWRlZWZmZWN0c1xuICogQHJldHVybiB7Q1NTT00uQ1NTU3R5bGVTaGVldH1cbiAqL1xuQ1NTT00uY2xvbmUgPSBmdW5jdGlvbiBjbG9uZShzdHlsZXNoZWV0KSB7XG5cblx0dmFyIGNsb25lZCA9IG5ldyBDU1NPTS5DU1NTdHlsZVNoZWV0O1xuXG5cdHZhciBydWxlcyA9IHN0eWxlc2hlZXQuY3NzUnVsZXM7XG5cdGlmICghcnVsZXMpIHtcblx0XHRyZXR1cm4gY2xvbmVkO1xuXHR9XG5cblx0dmFyIFJVTEVfVFlQRVMgPSB7XG5cdFx0MTogQ1NTT00uQ1NTU3R5bGVSdWxlLFxuXHRcdDQ6IENTU09NLkNTU01lZGlhUnVsZSxcblx0XHQvLzM6IENTU09NLkNTU0ltcG9ydFJ1bGUsXG5cdFx0Ly81OiBDU1NPTS5DU1NGb250RmFjZVJ1bGUsXG5cdFx0Ly82OiBDU1NPTS5DU1NQYWdlUnVsZSxcblx0XHQ4OiBDU1NPTS5DU1NLZXlmcmFtZXNSdWxlLFxuXHRcdDk6IENTU09NLkNTU0tleWZyYW1lUnVsZVxuXHR9O1xuXG5cdGZvciAodmFyIGk9MCwgcnVsZXNMZW5ndGg9cnVsZXMubGVuZ3RoOyBpIDwgcnVsZXNMZW5ndGg7IGkrKykge1xuXHRcdHZhciBydWxlID0gcnVsZXNbaV07XG5cdFx0dmFyIHJ1bGVDbG9uZSA9IGNsb25lZC5jc3NSdWxlc1tpXSA9IG5ldyBSVUxFX1RZUEVTW3J1bGUudHlwZV07XG5cblx0XHR2YXIgc3R5bGUgPSBydWxlLnN0eWxlO1xuXHRcdGlmIChzdHlsZSkge1xuXHRcdFx0dmFyIHN0eWxlQ2xvbmUgPSBydWxlQ2xvbmUuc3R5bGUgPSBuZXcgQ1NTT00uQ1NTU3R5bGVEZWNsYXJhdGlvbjtcblx0XHRcdGZvciAodmFyIGo9MCwgc3R5bGVMZW5ndGg9c3R5bGUubGVuZ3RoOyBqIDwgc3R5bGVMZW5ndGg7IGorKykge1xuXHRcdFx0XHR2YXIgbmFtZSA9IHN0eWxlQ2xvbmVbal0gPSBzdHlsZVtqXTtcblx0XHRcdFx0c3R5bGVDbG9uZVtuYW1lXSA9IHN0eWxlW25hbWVdO1xuXHRcdFx0XHRzdHlsZUNsb25lLl9pbXBvcnRhbnRzW25hbWVdID0gc3R5bGUuZ2V0UHJvcGVydHlQcmlvcml0eShuYW1lKTtcblx0XHRcdH1cblx0XHRcdHN0eWxlQ2xvbmUubGVuZ3RoID0gc3R5bGUubGVuZ3RoO1xuXHRcdH1cblxuXHRcdGlmIChydWxlLmhhc093blByb3BlcnR5KCdrZXlUZXh0JykpIHtcblx0XHRcdHJ1bGVDbG9uZS5rZXlUZXh0ID0gcnVsZS5rZXlUZXh0O1xuXHRcdH1cblxuXHRcdGlmIChydWxlLmhhc093blByb3BlcnR5KCdzZWxlY3RvclRleHQnKSkge1xuXHRcdFx0cnVsZUNsb25lLnNlbGVjdG9yVGV4dCA9IHJ1bGUuc2VsZWN0b3JUZXh0O1xuXHRcdH1cblxuXHRcdGlmIChydWxlLmhhc093blByb3BlcnR5KCdtZWRpYVRleHQnKSkge1xuXHRcdFx0cnVsZUNsb25lLm1lZGlhVGV4dCA9IHJ1bGUubWVkaWFUZXh0O1xuXHRcdH1cblxuXHRcdGlmIChydWxlLmhhc093blByb3BlcnR5KCdjc3NSdWxlcycpKSB7XG5cdFx0XHRydWxlQ2xvbmUuY3NzUnVsZXMgPSBjbG9uZShydWxlKS5jc3NSdWxlcztcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gY2xvbmVkO1xuXG59O1xuXG4vLy5Db21tb25KU1xuZXhwb3J0cy5jbG9uZSA9IENTU09NLmNsb25lO1xuLy8vQ29tbW9uSlNcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5DU1NTdHlsZURlY2xhcmF0aW9uID0gcmVxdWlyZSgnLi9DU1NTdHlsZURlY2xhcmF0aW9uJykuQ1NTU3R5bGVEZWNsYXJhdGlvbjtcbmV4cG9ydHMuQ1NTUnVsZSA9IHJlcXVpcmUoJy4vQ1NTUnVsZScpLkNTU1J1bGU7XG5leHBvcnRzLkNTU1N0eWxlUnVsZSA9IHJlcXVpcmUoJy4vQ1NTU3R5bGVSdWxlJykuQ1NTU3R5bGVSdWxlO1xuZXhwb3J0cy5NZWRpYUxpc3QgPSByZXF1aXJlKCcuL01lZGlhTGlzdCcpLk1lZGlhTGlzdDtcbmV4cG9ydHMuQ1NTTWVkaWFSdWxlID0gcmVxdWlyZSgnLi9DU1NNZWRpYVJ1bGUnKS5DU1NNZWRpYVJ1bGU7XG5leHBvcnRzLkNTU0ltcG9ydFJ1bGUgPSByZXF1aXJlKCcuL0NTU0ltcG9ydFJ1bGUnKS5DU1NJbXBvcnRSdWxlO1xuZXhwb3J0cy5DU1NGb250RmFjZVJ1bGUgPSByZXF1aXJlKCcuL0NTU0ZvbnRGYWNlUnVsZScpLkNTU0ZvbnRGYWNlUnVsZTtcbmV4cG9ydHMuU3R5bGVTaGVldCA9IHJlcXVpcmUoJy4vU3R5bGVTaGVldCcpLlN0eWxlU2hlZXQ7XG5leHBvcnRzLkNTU1N0eWxlU2hlZXQgPSByZXF1aXJlKCcuL0NTU1N0eWxlU2hlZXQnKS5DU1NTdHlsZVNoZWV0O1xuZXhwb3J0cy5DU1NLZXlmcmFtZXNSdWxlID0gcmVxdWlyZSgnLi9DU1NLZXlmcmFtZXNSdWxlJykuQ1NTS2V5ZnJhbWVzUnVsZTtcbmV4cG9ydHMuQ1NTS2V5ZnJhbWVSdWxlID0gcmVxdWlyZSgnLi9DU1NLZXlmcmFtZVJ1bGUnKS5DU1NLZXlmcmFtZVJ1bGU7XG5leHBvcnRzLk1hdGNoZXJMaXN0ID0gcmVxdWlyZSgnLi9NYXRjaGVyTGlzdCcpLk1hdGNoZXJMaXN0O1xuZXhwb3J0cy5DU1NEb2N1bWVudFJ1bGUgPSByZXF1aXJlKCcuL0NTU0RvY3VtZW50UnVsZScpLkNTU0RvY3VtZW50UnVsZTtcbmV4cG9ydHMuQ1NTVmFsdWUgPSByZXF1aXJlKCcuL0NTU1ZhbHVlJykuQ1NTVmFsdWU7XG5leHBvcnRzLkNTU1ZhbHVlRXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vQ1NTVmFsdWVFeHByZXNzaW9uJykuQ1NTVmFsdWVFeHByZXNzaW9uO1xuZXhwb3J0cy5wYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKS5wYXJzZTtcbmV4cG9ydHMuY2xvbmUgPSByZXF1aXJlKCcuL2Nsb25lJykuY2xvbmU7XG4iLCIvLy5Db21tb25KU1xudmFyIENTU09NID0ge307XG4vLy9Db21tb25KU1xuXG5cbi8qKlxuICogQHBhcmFtIHtzdHJpbmd9IHRva2VuXG4gKi9cbkNTU09NLnBhcnNlID0gZnVuY3Rpb24gcGFyc2UodG9rZW4pIHtcblxuXHR2YXIgaSA9IDA7XG5cblx0LyoqXG5cdFx0XCJiZWZvcmUtc2VsZWN0b3JcIiBvclxuXHRcdFwic2VsZWN0b3JcIiBvclxuXHRcdFwiYXRSdWxlXCIgb3Jcblx0XHRcImF0QmxvY2tcIiBvclxuXHRcdFwiYmVmb3JlLW5hbWVcIiBvclxuXHRcdFwibmFtZVwiIG9yXG5cdFx0XCJiZWZvcmUtdmFsdWVcIiBvclxuXHRcdFwidmFsdWVcIlxuXHQqL1xuXHR2YXIgc3RhdGUgPSBcImJlZm9yZS1zZWxlY3RvclwiO1xuXG5cdHZhciBpbmRleDtcblx0dmFyIGJ1ZmZlciA9IFwiXCI7XG5cblx0dmFyIFNJR05JRklDQU5UX1dISVRFU1BBQ0UgPSB7XG5cdFx0XCJzZWxlY3RvclwiOiB0cnVlLFxuXHRcdFwidmFsdWVcIjogdHJ1ZSxcblx0XHRcImF0UnVsZVwiOiB0cnVlLFxuXHRcdFwiaW1wb3J0UnVsZS1iZWdpblwiOiB0cnVlLFxuXHRcdFwiaW1wb3J0UnVsZVwiOiB0cnVlLFxuXHRcdFwiYXRCbG9ja1wiOiB0cnVlLFxuXHRcdCdkb2N1bWVudFJ1bGUtYmVnaW4nOiB0cnVlXG5cdH07XG5cblx0dmFyIHN0eWxlU2hlZXQgPSBuZXcgQ1NTT00uQ1NTU3R5bGVTaGVldDtcblxuXHQvLyBAdHlwZSBDU1NTdHlsZVNoZWV0fENTU01lZGlhUnVsZXxDU1NGb250RmFjZVJ1bGV8Q1NTS2V5ZnJhbWVzUnVsZXxDU1NEb2N1bWVudFJ1bGVcblx0dmFyIGN1cnJlbnRTY29wZSA9IHN0eWxlU2hlZXQ7XG5cblx0Ly8gQHR5cGUgQ1NTTWVkaWFSdWxlfENTU0tleWZyYW1lc1J1bGV8Q1NTRG9jdW1lbnRSdWxlXG5cdHZhciBwYXJlbnRSdWxlO1xuXG5cdHZhciBzZWxlY3RvciwgbmFtZSwgdmFsdWUsIHByaW9yaXR5PVwiXCIsIHN0eWxlUnVsZSwgbWVkaWFSdWxlLCBpbXBvcnRSdWxlLCBmb250RmFjZVJ1bGUsIGtleWZyYW1lc1J1bGUsIGtleWZyYW1lUnVsZSwgZG9jdW1lbnRSdWxlO1xuXG5cdHZhciBhdEtleWZyYW1lc1JlZ0V4cCA9IC9AKC0oPzpcXHcrLSkrKT9rZXlmcmFtZXMvZztcblxuXHR2YXIgcGFyc2VFcnJvciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0XHR2YXIgbGluZXMgPSB0b2tlbi5zdWJzdHJpbmcoMCwgaSkuc3BsaXQoJ1xcbicpO1xuXHRcdHZhciBsaW5lQ291bnQgPSBsaW5lcy5sZW5ndGg7XG5cdFx0dmFyIGNoYXJDb3VudCA9IGxpbmVzLnBvcCgpLmxlbmd0aCArIDE7XG5cdFx0dmFyIGVycm9yID0gbmV3IEVycm9yKG1lc3NhZ2UgKyAnIChsaW5lICcgKyBsaW5lQ291bnQgKyAnLCBjaGFyICcgKyBjaGFyQ291bnQgKyAnKScpO1xuXHRcdGVycm9yLmxpbmUgPSBsaW5lQ291bnQ7XG5cdFx0ZXJyb3IuY2hhciA9IGNoYXJDb3VudDtcblx0XHRlcnJvci5zdHlsZVNoZWV0ID0gc3R5bGVTaGVldDtcblx0XHR0aHJvdyBlcnJvcjtcblx0fTtcblxuXHRmb3IgKHZhciBjaGFyYWN0ZXI7IGNoYXJhY3RlciA9IHRva2VuLmNoYXJBdChpKTsgaSsrKSB7XG5cblx0XHRzd2l0Y2ggKGNoYXJhY3Rlcikge1xuXG5cdFx0Y2FzZSBcIiBcIjpcblx0XHRjYXNlIFwiXFx0XCI6XG5cdFx0Y2FzZSBcIlxcclwiOlxuXHRcdGNhc2UgXCJcXG5cIjpcblx0XHRjYXNlIFwiXFxmXCI6XG5cdFx0XHRpZiAoU0lHTklGSUNBTlRfV0hJVEVTUEFDRVtzdGF0ZV0pIHtcblx0XHRcdFx0YnVmZmVyICs9IGNoYXJhY3Rlcjtcblx0XHRcdH1cblx0XHRcdGJyZWFrO1xuXG5cdFx0Ly8gU3RyaW5nXG5cdFx0Y2FzZSAnXCInOlxuXHRcdFx0aW5kZXggPSBpICsgMTtcblx0XHRcdGRvIHtcblx0XHRcdFx0aW5kZXggPSB0b2tlbi5pbmRleE9mKCdcIicsIGluZGV4KSArIDE7XG5cdFx0XHRcdGlmICghaW5kZXgpIHtcblx0XHRcdFx0XHRwYXJzZUVycm9yKCdVbm1hdGNoZWQgXCInKTtcblx0XHRcdFx0fVxuXHRcdFx0fSB3aGlsZSAodG9rZW5baW5kZXggLSAyXSA9PT0gJ1xcXFwnKVxuXHRcdFx0YnVmZmVyICs9IHRva2VuLnNsaWNlKGksIGluZGV4KTtcblx0XHRcdGkgPSBpbmRleCAtIDE7XG5cdFx0XHRzd2l0Y2ggKHN0YXRlKSB7XG5cdFx0XHRcdGNhc2UgJ2JlZm9yZS12YWx1ZSc6XG5cdFx0XHRcdFx0c3RhdGUgPSAndmFsdWUnO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdpbXBvcnRSdWxlLWJlZ2luJzpcblx0XHRcdFx0XHRzdGF0ZSA9ICdpbXBvcnRSdWxlJztcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBcIidcIjpcblx0XHRcdGluZGV4ID0gaSArIDE7XG5cdFx0XHRkbyB7XG5cdFx0XHRcdGluZGV4ID0gdG9rZW4uaW5kZXhPZihcIidcIiwgaW5kZXgpICsgMTtcblx0XHRcdFx0aWYgKCFpbmRleCkge1xuXHRcdFx0XHRcdHBhcnNlRXJyb3IoXCJVbm1hdGNoZWQgJ1wiKTtcblx0XHRcdFx0fVxuXHRcdFx0fSB3aGlsZSAodG9rZW5baW5kZXggLSAyXSA9PT0gJ1xcXFwnKVxuXHRcdFx0YnVmZmVyICs9IHRva2VuLnNsaWNlKGksIGluZGV4KTtcblx0XHRcdGkgPSBpbmRleCAtIDE7XG5cdFx0XHRzd2l0Y2ggKHN0YXRlKSB7XG5cdFx0XHRcdGNhc2UgJ2JlZm9yZS12YWx1ZSc6XG5cdFx0XHRcdFx0c3RhdGUgPSAndmFsdWUnO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdpbXBvcnRSdWxlLWJlZ2luJzpcblx0XHRcdFx0XHRzdGF0ZSA9ICdpbXBvcnRSdWxlJztcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGJyZWFrO1xuXG5cdFx0Ly8gQ29tbWVudFxuXHRcdGNhc2UgXCIvXCI6XG5cdFx0XHRpZiAodG9rZW4uY2hhckF0KGkgKyAxKSA9PT0gXCIqXCIpIHtcblx0XHRcdFx0aSArPSAyO1xuXHRcdFx0XHRpbmRleCA9IHRva2VuLmluZGV4T2YoXCIqL1wiLCBpKTtcblx0XHRcdFx0aWYgKGluZGV4ID09PSAtMSkge1xuXHRcdFx0XHRcdHBhcnNlRXJyb3IoXCJNaXNzaW5nICovXCIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGkgPSBpbmRleCArIDE7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGJ1ZmZlciArPSBjaGFyYWN0ZXI7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc3RhdGUgPT09IFwiaW1wb3J0UnVsZS1iZWdpblwiKSB7XG5cdFx0XHRcdGJ1ZmZlciArPSBcIiBcIjtcblx0XHRcdFx0c3RhdGUgPSBcImltcG9ydFJ1bGVcIjtcblx0XHRcdH1cblx0XHRcdGJyZWFrO1xuXG5cdFx0Ly8gQXQtcnVsZVxuXHRcdGNhc2UgXCJAXCI6XG5cdFx0XHRpZiAodG9rZW4uaW5kZXhPZihcIkAtbW96LWRvY3VtZW50XCIsIGkpID09PSBpKSB7XG5cdFx0XHRcdHN0YXRlID0gXCJkb2N1bWVudFJ1bGUtYmVnaW5cIjtcblx0XHRcdFx0ZG9jdW1lbnRSdWxlID0gbmV3IENTU09NLkNTU0RvY3VtZW50UnVsZTtcblx0XHRcdFx0ZG9jdW1lbnRSdWxlLl9fc3RhcnRzID0gaTtcblx0XHRcdFx0aSArPSBcIi1tb3otZG9jdW1lbnRcIi5sZW5ndGg7XG5cdFx0XHRcdGJ1ZmZlciA9IFwiXCI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fSBlbHNlIGlmICh0b2tlbi5pbmRleE9mKFwiQG1lZGlhXCIsIGkpID09PSBpKSB7XG5cdFx0XHRcdHN0YXRlID0gXCJhdEJsb2NrXCI7XG5cdFx0XHRcdG1lZGlhUnVsZSA9IG5ldyBDU1NPTS5DU1NNZWRpYVJ1bGU7XG5cdFx0XHRcdG1lZGlhUnVsZS5fX3N0YXJ0cyA9IGk7XG5cdFx0XHRcdGkgKz0gXCJtZWRpYVwiLmxlbmd0aDtcblx0XHRcdFx0YnVmZmVyID0gXCJcIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9IGVsc2UgaWYgKHRva2VuLmluZGV4T2YoXCJAaW1wb3J0XCIsIGkpID09PSBpKSB7XG5cdFx0XHRcdHN0YXRlID0gXCJpbXBvcnRSdWxlLWJlZ2luXCI7XG5cdFx0XHRcdGkgKz0gXCJpbXBvcnRcIi5sZW5ndGg7XG5cdFx0XHRcdGJ1ZmZlciArPSBcIkBpbXBvcnRcIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9IGVsc2UgaWYgKHRva2VuLmluZGV4T2YoXCJAZm9udC1mYWNlXCIsIGkpID09PSBpKSB7XG5cdFx0XHRcdHN0YXRlID0gXCJmb250RmFjZVJ1bGUtYmVnaW5cIjtcblx0XHRcdFx0aSArPSBcImZvbnQtZmFjZVwiLmxlbmd0aDtcblx0XHRcdFx0Zm9udEZhY2VSdWxlID0gbmV3IENTU09NLkNTU0ZvbnRGYWNlUnVsZTtcblx0XHRcdFx0Zm9udEZhY2VSdWxlLl9fc3RhcnRzID0gaTtcblx0XHRcdFx0YnVmZmVyID0gXCJcIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhdEtleWZyYW1lc1JlZ0V4cC5sYXN0SW5kZXggPSBpO1xuXHRcdFx0XHR2YXIgbWF0Y2hLZXlmcmFtZXMgPSBhdEtleWZyYW1lc1JlZ0V4cC5leGVjKHRva2VuKTtcblx0XHRcdFx0aWYgKG1hdGNoS2V5ZnJhbWVzICYmIG1hdGNoS2V5ZnJhbWVzLmluZGV4ID09PSBpKSB7XG5cdFx0XHRcdFx0c3RhdGUgPSBcImtleWZyYW1lc1J1bGUtYmVnaW5cIjtcblx0XHRcdFx0XHRrZXlmcmFtZXNSdWxlID0gbmV3IENTU09NLkNTU0tleWZyYW1lc1J1bGU7XG5cdFx0XHRcdFx0a2V5ZnJhbWVzUnVsZS5fX3N0YXJ0cyA9IGk7XG5cdFx0XHRcdFx0a2V5ZnJhbWVzUnVsZS5fdmVuZG9yUHJlZml4ID0gbWF0Y2hLZXlmcmFtZXNbMV07IC8vIFdpbGwgY29tZSBvdXQgYXMgdW5kZWZpbmVkIGlmIG5vIHByZWZpeCB3YXMgZm91bmRcblx0XHRcdFx0XHRpICs9IG1hdGNoS2V5ZnJhbWVzWzBdLmxlbmd0aCAtIDE7XG5cdFx0XHRcdFx0YnVmZmVyID0gXCJcIjtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fSBlbHNlIGlmIChzdGF0ZSA9PSBcInNlbGVjdG9yXCIpIHtcblx0XHRcdFx0XHRzdGF0ZSA9IFwiYXRSdWxlXCI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGJ1ZmZlciArPSBjaGFyYWN0ZXI7XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgXCJ7XCI6XG5cdFx0XHRpZiAoc3RhdGUgPT09IFwic2VsZWN0b3JcIiB8fCBzdGF0ZSA9PT0gXCJhdFJ1bGVcIikge1xuXHRcdFx0XHRzdHlsZVJ1bGUuc2VsZWN0b3JUZXh0ID0gYnVmZmVyLnRyaW0oKTtcblx0XHRcdFx0c3R5bGVSdWxlLnN0eWxlLl9fc3RhcnRzID0gaTtcblx0XHRcdFx0YnVmZmVyID0gXCJcIjtcblx0XHRcdFx0c3RhdGUgPSBcImJlZm9yZS1uYW1lXCI7XG5cdFx0XHR9IGVsc2UgaWYgKHN0YXRlID09PSBcImF0QmxvY2tcIikge1xuXHRcdFx0XHRtZWRpYVJ1bGUubWVkaWEubWVkaWFUZXh0ID0gYnVmZmVyLnRyaW0oKTtcblx0XHRcdFx0Y3VycmVudFNjb3BlID0gcGFyZW50UnVsZSA9IG1lZGlhUnVsZTtcblx0XHRcdFx0bWVkaWFSdWxlLnBhcmVudFN0eWxlU2hlZXQgPSBzdHlsZVNoZWV0O1xuXHRcdFx0XHRidWZmZXIgPSBcIlwiO1xuXHRcdFx0XHRzdGF0ZSA9IFwiYmVmb3JlLXNlbGVjdG9yXCI7XG5cdFx0XHR9IGVsc2UgaWYgKHN0YXRlID09PSBcImZvbnRGYWNlUnVsZS1iZWdpblwiKSB7XG5cdFx0XHRcdGlmIChwYXJlbnRSdWxlKSB7XG5cdFx0XHRcdFx0Zm9udEZhY2VSdWxlLnBhcmVudFJ1bGUgPSBwYXJlbnRSdWxlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGZvbnRGYWNlUnVsZS5wYXJlbnRTdHlsZVNoZWV0ID0gc3R5bGVTaGVldDtcblx0XHRcdFx0c3R5bGVSdWxlID0gZm9udEZhY2VSdWxlO1xuXHRcdFx0XHRidWZmZXIgPSBcIlwiO1xuXHRcdFx0XHRzdGF0ZSA9IFwiYmVmb3JlLW5hbWVcIjtcblx0XHRcdH0gZWxzZSBpZiAoc3RhdGUgPT09IFwia2V5ZnJhbWVzUnVsZS1iZWdpblwiKSB7XG5cdFx0XHRcdGtleWZyYW1lc1J1bGUubmFtZSA9IGJ1ZmZlci50cmltKCk7XG5cdFx0XHRcdGlmIChwYXJlbnRSdWxlKSB7XG5cdFx0XHRcdFx0a2V5ZnJhbWVzUnVsZS5wYXJlbnRSdWxlID0gcGFyZW50UnVsZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRrZXlmcmFtZXNSdWxlLnBhcmVudFN0eWxlU2hlZXQgPSBzdHlsZVNoZWV0O1xuXHRcdFx0XHRjdXJyZW50U2NvcGUgPSBwYXJlbnRSdWxlID0ga2V5ZnJhbWVzUnVsZTtcblx0XHRcdFx0YnVmZmVyID0gXCJcIjtcblx0XHRcdFx0c3RhdGUgPSBcImtleWZyYW1lUnVsZS1iZWdpblwiO1xuXHRcdFx0fSBlbHNlIGlmIChzdGF0ZSA9PT0gXCJrZXlmcmFtZVJ1bGUtYmVnaW5cIikge1xuXHRcdFx0XHRzdHlsZVJ1bGUgPSBuZXcgQ1NTT00uQ1NTS2V5ZnJhbWVSdWxlO1xuXHRcdFx0XHRzdHlsZVJ1bGUua2V5VGV4dCA9IGJ1ZmZlci50cmltKCk7XG5cdFx0XHRcdHN0eWxlUnVsZS5fX3N0YXJ0cyA9IGk7XG5cdFx0XHRcdGJ1ZmZlciA9IFwiXCI7XG5cdFx0XHRcdHN0YXRlID0gXCJiZWZvcmUtbmFtZVwiO1xuXHRcdFx0fSBlbHNlIGlmIChzdGF0ZSA9PT0gXCJkb2N1bWVudFJ1bGUtYmVnaW5cIikge1xuXHRcdFx0XHQvLyBGSVhNRTogd2hhdCBpZiB0aGlzICd7JyBpcyBpbiB0aGUgdXJsIHRleHQgb2YgdGhlIG1hdGNoIGZ1bmN0aW9uP1xuXHRcdFx0XHRkb2N1bWVudFJ1bGUubWF0Y2hlci5tYXRjaGVyVGV4dCA9IGJ1ZmZlci50cmltKCk7XG5cdFx0XHRcdGlmIChwYXJlbnRSdWxlKSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnRSdWxlLnBhcmVudFJ1bGUgPSBwYXJlbnRSdWxlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN1cnJlbnRTY29wZSA9IHBhcmVudFJ1bGUgPSBkb2N1bWVudFJ1bGU7XG5cdFx0XHRcdGRvY3VtZW50UnVsZS5wYXJlbnRTdHlsZVNoZWV0ID0gc3R5bGVTaGVldDtcblx0XHRcdFx0YnVmZmVyID0gXCJcIjtcblx0XHRcdFx0c3RhdGUgPSBcImJlZm9yZS1zZWxlY3RvclwiO1xuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIFwiOlwiOlxuXHRcdFx0aWYgKHN0YXRlID09PSBcIm5hbWVcIikge1xuXHRcdFx0XHRuYW1lID0gYnVmZmVyLnRyaW0oKTtcblx0XHRcdFx0YnVmZmVyID0gXCJcIjtcblx0XHRcdFx0c3RhdGUgPSBcImJlZm9yZS12YWx1ZVwiO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YnVmZmVyICs9IGNoYXJhY3Rlcjtcblx0XHRcdH1cblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSAnKCc6XG5cdFx0XHRpZiAoc3RhdGUgPT09ICd2YWx1ZScpIHtcblx0XHRcdFx0Ly8gaWUgY3NzIGV4cHJlc3Npb24gbW9kZVxuXHRcdFx0XHRpZiAoYnVmZmVyLnRyaW0oKSA9PSAnZXhwcmVzc2lvbicpIHtcblx0XHRcdFx0XHR2YXIgaW5mbyA9IChuZXcgQ1NTT00uQ1NTVmFsdWVFeHByZXNzaW9uKHRva2VuLCBpKSkucGFyc2UoKTtcblxuXHRcdFx0XHRcdGlmIChpbmZvLmVycm9yKSB7XG5cdFx0XHRcdFx0XHRwYXJzZUVycm9yKGluZm8uZXJyb3IpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRidWZmZXIgKz0gaW5mby5leHByZXNzaW9uO1xuXHRcdFx0XHRcdFx0aSA9IGluZm8uaWR4O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpbmRleCA9IHRva2VuLmluZGV4T2YoJyknLCBpICsgMSk7XG5cdFx0XHRcdFx0aWYgKGluZGV4ID09PSAtMSkge1xuXHRcdFx0XHRcdFx0cGFyc2VFcnJvcignVW5tYXRjaGVkIFwiKFwiJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJ1ZmZlciArPSB0b2tlbi5zbGljZShpLCBpbmRleCArIDEpO1xuXHRcdFx0XHRcdGkgPSBpbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YnVmZmVyICs9IGNoYXJhY3Rlcjtcblx0XHRcdH1cblxuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIFwiIVwiOlxuXHRcdFx0aWYgKHN0YXRlID09PSBcInZhbHVlXCIgJiYgdG9rZW4uaW5kZXhPZihcIiFpbXBvcnRhbnRcIiwgaSkgPT09IGkpIHtcblx0XHRcdFx0cHJpb3JpdHkgPSBcImltcG9ydGFudFwiO1xuXHRcdFx0XHRpICs9IFwiaW1wb3J0YW50XCIubGVuZ3RoO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YnVmZmVyICs9IGNoYXJhY3Rlcjtcblx0XHRcdH1cblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBcIjtcIjpcblx0XHRcdHN3aXRjaCAoc3RhdGUpIHtcblx0XHRcdFx0Y2FzZSBcInZhbHVlXCI6XG5cdFx0XHRcdFx0c3R5bGVSdWxlLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIGJ1ZmZlci50cmltKCksIHByaW9yaXR5KTtcblx0XHRcdFx0XHRwcmlvcml0eSA9IFwiXCI7XG5cdFx0XHRcdFx0YnVmZmVyID0gXCJcIjtcblx0XHRcdFx0XHRzdGF0ZSA9IFwiYmVmb3JlLW5hbWVcIjtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBcImF0UnVsZVwiOlxuXHRcdFx0XHRcdGJ1ZmZlciA9IFwiXCI7XG5cdFx0XHRcdFx0c3RhdGUgPSBcImJlZm9yZS1zZWxlY3RvclwiO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFwiaW1wb3J0UnVsZVwiOlxuXHRcdFx0XHRcdGltcG9ydFJ1bGUgPSBuZXcgQ1NTT00uQ1NTSW1wb3J0UnVsZTtcblx0XHRcdFx0XHRpbXBvcnRSdWxlLnBhcmVudFN0eWxlU2hlZXQgPSBpbXBvcnRSdWxlLnN0eWxlU2hlZXQucGFyZW50U3R5bGVTaGVldCA9IHN0eWxlU2hlZXQ7XG5cdFx0XHRcdFx0aW1wb3J0UnVsZS5jc3NUZXh0ID0gYnVmZmVyICsgY2hhcmFjdGVyO1xuXHRcdFx0XHRcdHN0eWxlU2hlZXQuY3NzUnVsZXMucHVzaChpbXBvcnRSdWxlKTtcblx0XHRcdFx0XHRidWZmZXIgPSBcIlwiO1xuXHRcdFx0XHRcdHN0YXRlID0gXCJiZWZvcmUtc2VsZWN0b3JcIjtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRidWZmZXIgKz0gY2hhcmFjdGVyO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIFwifVwiOlxuXHRcdFx0c3dpdGNoIChzdGF0ZSkge1xuXHRcdFx0XHRjYXNlIFwidmFsdWVcIjpcblx0XHRcdFx0XHRzdHlsZVJ1bGUuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgYnVmZmVyLnRyaW0oKSwgcHJpb3JpdHkpO1xuXHRcdFx0XHRcdHByaW9yaXR5ID0gXCJcIjtcblx0XHRcdFx0Y2FzZSBcImJlZm9yZS1uYW1lXCI6XG5cdFx0XHRcdGNhc2UgXCJuYW1lXCI6XG5cdFx0XHRcdFx0c3R5bGVSdWxlLl9fZW5kcyA9IGkgKyAxO1xuXHRcdFx0XHRcdGlmIChwYXJlbnRSdWxlKSB7XG5cdFx0XHRcdFx0XHRzdHlsZVJ1bGUucGFyZW50UnVsZSA9IHBhcmVudFJ1bGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN0eWxlUnVsZS5wYXJlbnRTdHlsZVNoZWV0ID0gc3R5bGVTaGVldDtcblx0XHRcdFx0XHRjdXJyZW50U2NvcGUuY3NzUnVsZXMucHVzaChzdHlsZVJ1bGUpO1xuXHRcdFx0XHRcdGJ1ZmZlciA9IFwiXCI7XG5cdFx0XHRcdFx0aWYgKGN1cnJlbnRTY29wZS5jb25zdHJ1Y3RvciA9PT0gQ1NTT00uQ1NTS2V5ZnJhbWVzUnVsZSkge1xuXHRcdFx0XHRcdFx0c3RhdGUgPSBcImtleWZyYW1lUnVsZS1iZWdpblwiO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRzdGF0ZSA9IFwiYmVmb3JlLXNlbGVjdG9yXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFwia2V5ZnJhbWVSdWxlLWJlZ2luXCI6XG5cdFx0XHRcdGNhc2UgXCJiZWZvcmUtc2VsZWN0b3JcIjpcblx0XHRcdFx0Y2FzZSBcInNlbGVjdG9yXCI6XG5cdFx0XHRcdFx0Ly8gRW5kIG9mIG1lZGlhL2RvY3VtZW50IHJ1bGUuXG5cdFx0XHRcdFx0aWYgKCFwYXJlbnRSdWxlKSB7XG5cdFx0XHRcdFx0XHRwYXJzZUVycm9yKFwiVW5leHBlY3RlZCB9XCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjdXJyZW50U2NvcGUuX19lbmRzID0gaSArIDE7XG5cdFx0XHRcdFx0Ly8gTmVzdGluZyBydWxlcyBhcmVuJ3Qgc3VwcG9ydGVkIHlldFxuXHRcdFx0XHRcdHN0eWxlU2hlZXQuY3NzUnVsZXMucHVzaChjdXJyZW50U2NvcGUpO1xuXHRcdFx0XHRcdGN1cnJlbnRTY29wZSA9IHN0eWxlU2hlZXQ7XG5cdFx0XHRcdFx0cGFyZW50UnVsZSA9IG51bGw7XG5cdFx0XHRcdFx0YnVmZmVyID0gXCJcIjtcblx0XHRcdFx0XHRzdGF0ZSA9IFwiYmVmb3JlLXNlbGVjdG9yXCI7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRicmVhaztcblxuXHRcdGRlZmF1bHQ6XG5cdFx0XHRzd2l0Y2ggKHN0YXRlKSB7XG5cdFx0XHRcdGNhc2UgXCJiZWZvcmUtc2VsZWN0b3JcIjpcblx0XHRcdFx0XHRzdGF0ZSA9IFwic2VsZWN0b3JcIjtcblx0XHRcdFx0XHRzdHlsZVJ1bGUgPSBuZXcgQ1NTT00uQ1NTU3R5bGVSdWxlO1xuXHRcdFx0XHRcdHN0eWxlUnVsZS5fX3N0YXJ0cyA9IGk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJiZWZvcmUtbmFtZVwiOlxuXHRcdFx0XHRcdHN0YXRlID0gXCJuYW1lXCI7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJiZWZvcmUtdmFsdWVcIjpcblx0XHRcdFx0XHRzdGF0ZSA9IFwidmFsdWVcIjtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBcImltcG9ydFJ1bGUtYmVnaW5cIjpcblx0XHRcdFx0XHRzdGF0ZSA9IFwiaW1wb3J0UnVsZVwiO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0YnVmZmVyICs9IGNoYXJhY3Rlcjtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBzdHlsZVNoZWV0O1xufTtcblxuXG4vLy5Db21tb25KU1xuZXhwb3J0cy5wYXJzZSA9IENTU09NLnBhcnNlO1xuLy8gVGhlIGZvbGxvd2luZyBtb2R1bGVzIGNhbm5vdCBiZSBpbmNsdWRlZCBzb29uZXIgZHVlIHRvIHRoZSBtdXR1YWwgZGVwZW5kZW5jeSB3aXRoIHBhcnNlLmpzXG5DU1NPTS5DU1NTdHlsZVNoZWV0ID0gcmVxdWlyZShcIi4vQ1NTU3R5bGVTaGVldFwiKS5DU1NTdHlsZVNoZWV0O1xuQ1NTT00uQ1NTU3R5bGVSdWxlID0gcmVxdWlyZShcIi4vQ1NTU3R5bGVSdWxlXCIpLkNTU1N0eWxlUnVsZTtcbkNTU09NLkNTU0ltcG9ydFJ1bGUgPSByZXF1aXJlKFwiLi9DU1NJbXBvcnRSdWxlXCIpLkNTU0ltcG9ydFJ1bGU7XG5DU1NPTS5DU1NNZWRpYVJ1bGUgPSByZXF1aXJlKFwiLi9DU1NNZWRpYVJ1bGVcIikuQ1NTTWVkaWFSdWxlO1xuQ1NTT00uQ1NTRm9udEZhY2VSdWxlID0gcmVxdWlyZShcIi4vQ1NTRm9udEZhY2VSdWxlXCIpLkNTU0ZvbnRGYWNlUnVsZTtcbkNTU09NLkNTU1N0eWxlRGVjbGFyYXRpb24gPSByZXF1aXJlKCcuL0NTU1N0eWxlRGVjbGFyYXRpb24nKS5DU1NTdHlsZURlY2xhcmF0aW9uO1xuQ1NTT00uQ1NTS2V5ZnJhbWVSdWxlID0gcmVxdWlyZSgnLi9DU1NLZXlmcmFtZVJ1bGUnKS5DU1NLZXlmcmFtZVJ1bGU7XG5DU1NPTS5DU1NLZXlmcmFtZXNSdWxlID0gcmVxdWlyZSgnLi9DU1NLZXlmcmFtZXNSdWxlJykuQ1NTS2V5ZnJhbWVzUnVsZTtcbkNTU09NLkNTU1ZhbHVlRXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vQ1NTVmFsdWVFeHByZXNzaW9uJykuQ1NTVmFsdWVFeHByZXNzaW9uO1xuQ1NTT00uQ1NTRG9jdW1lbnRSdWxlID0gcmVxdWlyZSgnLi9DU1NEb2N1bWVudFJ1bGUnKS5DU1NEb2N1bWVudFJ1bGU7XG4vLy9Db21tb25KU1xuIiwidmFyIFRyZWUgPSByZXF1aXJlKCcuL3NyYy90cmVlJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGRhdGFUcmVlID0gKGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgY3JlYXRlOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIG5ldyBUcmVlKCk7XG4gICAgfVxuICB9O1xufSgpKTtcbiIsIlxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKXtcblxuICAvLyBGbGFnIGJhZCBwcmFjdGlzZXNcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBCYXNpYyBTZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogQGNsYXNzIFRyYXZlcnNlclxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQGNsYXNzZGVzYyBSZXByZXNlbnRzIGEgdHJhdmVyc2VyIHdoaWNoIHNlYXJjaGVzL3RyYXZlcnNlcyB0aGUgdHJlZSBpbiBCRlMgYW5kIERGUyBmYXNoaW9uLlxuICAgKiBAcGFyYW0gdHJlZSAtIHtAbGluayBUcmVlfSB0aGF0IGhhcyB0byBiZSB0cmF2ZXJzZWQgb3Igc2VhcmNoLlxuICAgKi9cbiAgZnVuY3Rpb24gVHJhdmVyc2VyKHRyZWUpe1xuXG4gICAgaWYoIXRyZWUpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBhIHRyZWUgdGhhdCBpcyB0byBiZSB0cmF2ZXJzZWQnKTtcblxuICAgIC8qKlxuICAgICAqIFJlcHJlc2VudHMgdGhlIHtAbGluayBUcmVlfSB3aGljaCBoYXMgdG8gYmUgdHJhdmVyc2VkLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IF90cmVlXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAZGVmYXVsdCBcIm51bGxcIlxuICAgICAqL1xuICAgIHRoaXMuX3RyZWUgPSB0cmVlO1xuXG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gTWV0aG9kc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogU2VhcmNoZXMgYSB0cmVlIGluIERGUyBmYXNoaW9uLiBSZXF1aXJlcyBhIHNlYXJjaCBjcml0ZXJpYSB0byBiZSBwcm92aWRlZC5cbiAgICpcbiAgICogQG1ldGhvZCBzZWFyY2hERlNcbiAgICogQG1lbWJlcm9mIFRyYXZlcnNlclxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY3JpdGVyaWEgLSBNVVNUIEJFIGEgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBzcGVjaWZpZXMgdGhlIHNlYXJjaCBjcml0ZXJpYS5cbiAgICogQ3JpdGVyaWEgY2FsbGJhY2sgaGVyZSByZWNlaXZlcyB7QGxpbmsgVHJlZU5vZGUjX2RhdGF9IGluIHBhcmFtZXRlciBhbmQgTVVTVCByZXR1cm4gYm9vbGVhblxuICAgKiBpbmRpY2F0aW5nIHdoZXRoZXIgdGhhdCBkYXRhIHNhdGlzZmllcyB5b3VyIGNyaXRlcmlhLlxuICAgKiBAcmV0dXJuIHtvYmplY3R9IC0gZmlyc3Qge0BsaW5rIFRyZWVOb2RlfSBpbiB0cmVlIHRoYXQgbWF0Y2hlcyB0aGUgZ2l2ZW4gY3JpdGVyaWEuXG4gICAqIEBleGFtcGxlXG4gICAqIC8vIFNlYXJjaCBERlNcbiAgICogdmFyIG5vZGUgPSB0cmVlLnRyYXZlcnNlcigpLnNlYXJjaERGUyhmdW5jdGlvbihkYXRhKXtcbiAgICogIHJldHVybiBkYXRhLmtleSA9PT0gJyNncmVlbmFwcGxlJztcbiAgICogfSk7XG4gICAqL1xuICBUcmF2ZXJzZXIucHJvdG90eXBlLnNlYXJjaERGUyA9IGZ1bmN0aW9uKGNyaXRlcmlhKXtcblxuICAgIC8vIEhvbGQgdGhlIG5vZGUgd2hlbiBmb3VuZFxuICAgIHZhciBmb3VuZE5vZGUgPSBudWxsO1xuXG4gICAgLy8gRmluZCBub2RlIHJlY3Vyc2l2ZWx5XG4gICAgKGZ1bmN0aW9uIHJlY3VyKG5vZGUpe1xuICAgICAgaWYobm9kZS5tYXRjaENyaXRlcmlhKGNyaXRlcmlhKSl7XG4gICAgICAgIGZvdW5kTm9kZSA9IG5vZGU7XG4gICAgICAgIHJldHVybiBmb3VuZE5vZGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlLl9jaGlsZE5vZGVzLnNvbWUocmVjdXIpO1xuICAgICAgfVxuICAgIH0odGhpcy5fdHJlZS5fcm9vdE5vZGUpKTtcblxuICAgIHJldHVybiBmb3VuZE5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNlYXJjaGVzIGEgdHJlZSBpbiBCRlMgZmFzaGlvbi4gUmVxdWlyZXMgYSBzZWFyY2ggY3JpdGVyaWEgdG8gYmUgcHJvdmlkZWQuXG4gICAqXG4gICAqIEBtZXRob2Qgc2VhcmNoQkZTXG4gICAqIEBtZW1iZXJvZiBUcmF2ZXJzZXJcbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNyaXRlcmlhIC0gTVVTVCBCRSBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgc3BlY2lmaWVzIHRoZSBzZWFyY2ggY3JpdGVyaWEuXG4gICAqIENyaXRlcmlhIGNhbGxiYWNrIGhlcmUgcmVjZWl2ZXMge0BsaW5rIFRyZWVOb2RlI19kYXRhfSBpbiBwYXJhbWV0ZXIgYW5kIE1VU1QgcmV0dXJuIGJvb2xlYW5cbiAgICogaW5kaWNhdGluZyB3aGV0aGVyIHRoYXQgZGF0YSBzYXRpc2ZpZXMgeW91ciBjcml0ZXJpYS5cbiAgICogQHJldHVybiB7b2JqZWN0fSAtIGZpcnN0IHtAbGluayBUcmVlTm9kZX0gaW4gdHJlZSB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIGNyaXRlcmlhLlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBTZWFyY2ggQkZTXG4gICAqIHZhciBub2RlID0gdHJlZS50cmF2ZXJzZXIoKS5zZWFyY2hCRlMoZnVuY3Rpb24oZGF0YSl7XG4gICAqICByZXR1cm4gZGF0YS5rZXkgPT09ICcjZ3JlZW5hcHBsZSc7XG4gICAqIH0pO1xuICAgKi9cbiAgVHJhdmVyc2VyLnByb3RvdHlwZS5zZWFyY2hCRlMgPSBmdW5jdGlvbihjcml0ZXJpYSl7XG5cbiAgICAvLyBIb2xkIHRoZSBub2RlIHdoZW4gZm91bmRcbiAgICB2YXIgZm91bmROb2RlID0gbnVsbDtcblxuICAgIC8vIEZpbmQgbm9kZXMgcmVjdXJzaXZlbHlcbiAgICAoZnVuY3Rpb24gZXhwYW5kKHF1ZXVlKXtcbiAgICAgIHdoaWxlKHF1ZXVlLmxlbmd0aCl7XG4gICAgICAgIHZhciBjdXJyZW50ID0gcXVldWUuc3BsaWNlKDAsIDEpWzBdO1xuICAgICAgICBpZihjdXJyZW50Lm1hdGNoQ3JpdGVyaWEoY3JpdGVyaWEpKXtcbiAgICAgICAgICBmb3VuZE5vZGUgPSBjdXJyZW50O1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50Ll9jaGlsZE5vZGVzLmZvckVhY2goZnVuY3Rpb24oX2NoaWxkKXtcbiAgICAgICAgICBxdWV1ZS5wdXNoKF9jaGlsZCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0oW3RoaXMuX3RyZWUuX3Jvb3ROb2RlXSkpO1xuXG5cbiAgICByZXR1cm4gZm91bmROb2RlO1xuXG4gIH07XG5cbiAgLyoqXG4gICAqIFRyYXZlcnNlcyBhbiBlbnRpcmUgdHJlZSBpbiBERlMgZmFzaGlvbi5cbiAgICpcbiAgICogQG1ldGhvZCB0cmF2ZXJzZURGU1xuICAgKiBAbWVtYmVyb2YgVHJhdmVyc2VyXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIEdldHMgdHJpZ2dlcmVkIHdoZW4gQHtsaW5rIFRyZWVOb2RlfSBpcyBleHBsb3JlZC4gRXhwbG9yZWQgbm9kZSBpcyBwYXNzZWQgYXMgcGFyYW1ldGVyIHRvIGNhbGxiYWNrLlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBUcmF2ZXJzZSBERlNcbiAgICogdHJlZS50cmF2ZXJzZXIoKS50cmF2ZXJzZURGUyhmdW5jdGlvbihub2RlKXtcbiAgICogIGNvbnNvbGUubG9nKG5vZGUuZGF0YSk7XG4gICAqIH0pO1xuICAgKi9cbiAgVHJhdmVyc2VyLnByb3RvdHlwZS50cmF2ZXJzZURGUyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAoZnVuY3Rpb24gcmVjdXIobm9kZSl7XG4gICAgICBjYWxsYmFjayhub2RlKTtcbiAgICAgIG5vZGUuX2NoaWxkTm9kZXMuZm9yRWFjaChyZWN1cik7XG4gICAgfSh0aGlzLl90cmVlLl9yb290Tm9kZSkpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBUcmF2ZXJzZXMgYW4gZW50aXJlIHRyZWUgaW4gQkZTIGZhc2hpb24uXG4gICAqXG4gICAqIEBtZXRob2QgdHJhdmVyc2VCRlNcbiAgICogQG1lbWJlcm9mIFRyYXZlcnNlclxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBHZXRzIHRyaWdnZXJlZCB3aGVuIG5vZGUgaXMgZXhwbG9yZWQuIEV4cGxvcmVkIG5vZGUgaXMgcGFzc2VkIGFzIHBhcmFtZXRlciB0byBjYWxsYmFjay5cbiAgICogQGV4YW1wbGVcbiAgICogLy8gVHJhdmVyc2UgQkZTXG4gICAqIHRyZWUudHJhdmVyc2VyKCkudHJhdmVyc2VCRlMoZnVuY3Rpb24obm9kZSl7XG4gICAqICBjb25zb2xlLmxvZyhub2RlLmRhdGEpO1xuICAgKiB9KTtcbiAgICovXG4gIFRyYXZlcnNlci5wcm90b3R5cGUudHJhdmVyc2VCRlMgPSBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgKGZ1bmN0aW9uIGV4cGFuZChxdWV1ZSl7XG4gICAgICB3aGlsZShxdWV1ZS5sZW5ndGgpe1xuICAgICAgICB2YXIgY3VycmVudCA9IHF1ZXVlLnNwbGljZSgwLCAxKVswXTtcbiAgICAgICAgY2FsbGJhY2soY3VycmVudCk7XG4gICAgICAgIGN1cnJlbnQuX2NoaWxkTm9kZXMuZm9yRWFjaChmdW5jdGlvbihfY2hpbGQpe1xuICAgICAgICAgIHF1ZXVlLnB1c2goX2NoaWxkKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfShbdGhpcy5fdHJlZS5fcm9vdE5vZGVdKSk7XG4gIH07XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIEV4cG9ydFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4gVHJhdmVyc2VyO1xuXG59KCkpO1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xuXG4gIC8vIEZsYWcgYmFkIHByYWN0aXNlc1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIEJhc2ljIFNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBAY2xhc3MgVHJlZU5vZGVcbiAgICogQGNsYXNzZGVzYyBSZXByZXNlbnRzIGEgbm9kZSBpbiB0aGUgdHJlZS5cbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gdGhhdCBpcyB0byBiZSBzdG9yZWQgaW4gYSBub2RlXG4gICAqL1xuICBmdW5jdGlvbiBUcmVlTm9kZShkYXRhKXtcblxuICAgIC8qKlxuICAgICAqIFJlcHJlc2VudHMgdGhlIHBhcmVudCBub2RlXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgX3BhcmVudE5vZGVcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBkZWZhdWx0IFwibnVsbFwiXG4gICAgICovXG4gICAgdGhpcy5fcGFyZW50Tm9kZSA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBSZXByZXNlbnRzIHRoZSBjaGlsZCBub2Rlc1xuICAgICAqXG4gICAgICogQHByb3BlcnR5IF9jaGlsZE5vZGVzXG4gICAgICogQHR5cGUge2FycmF5fVxuICAgICAqIEBkZWZhdWx0IFwiW11cIlxuICAgICAqL1xuICAgIHRoaXMuX2NoaWxkTm9kZXMgPSBbXTtcblxuICAgIC8qKlxuICAgICAqIFJlcHJlc2VudHMgdGhlIGRhdGEgbm9kZSBoYXNcbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBfZGF0YVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQGRlZmF1bHQgXCJudWxsXCJcbiAgICAgKi9cbiAgICB0aGlzLl9kYXRhID0gZGF0YTtcblxuICAgIC8qKlxuICAgICAqIERlcHRoIG9mIHRoZSBub2RlIHJlcHJlc2VudHMgbGV2ZWwgaW4gaGllcmFyY2h5XG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgX2RlcHRoXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKiBAZGVmYXVsdCAtMVxuICAgICAqL1xuICAgIHRoaXMuX2RlcHRoID0gLTE7XG5cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBHZXR0ZXJzIGFuZCBTZXR0ZXJzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgcGFyZW50IG5vZGUgb2YgY3VycmVudCBub2RlXG4gICAqXG4gICAqIEBtZXRob2QgcGFyZW50Tm9kZVxuICAgKiBAbWVtYmVyb2YgVHJlZU5vZGVcbiAgICogQGluc3RhbmNlXG4gICAqIEByZXR1cm4ge1RyZWVOb2RlfSAtIHBhcmVudCBvZiBjdXJyZW50IG5vZGVcbiAgICovXG4gIFRyZWVOb2RlLnByb3RvdHlwZS5wYXJlbnROb2RlID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fcGFyZW50Tm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyBhbiBhcnJheSBvZiBjaGlsZCBub2Rlc1xuICAgKlxuICAgKiBAbWV0aG9kIGNoaWxkTm9kZXNcbiAgICogQG1lbWJlcm9mIFRyZWVOb2RlXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcmV0dXJuIHthcnJheX0gLSBhcnJheSBvZiBjaGlsZCBub2Rlc1xuICAgKi9cbiAgVHJlZU5vZGUucHJvdG90eXBlLmNoaWxkTm9kZXMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLl9jaGlsZE5vZGVzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXRzIG9yIGdldHMgdGhlIGRhdGEgYmVsb25naW5nIHRvIHRoaXMgbm9kZS4gRGF0YSBpcyB3aGF0IHVzZXIgc2V0cyB1c2luZyBgaW5zZXJ0YCBhbmQgYGluc2VydFRvYCBtZXRob2RzLlxuICAgKlxuICAgKiBAbWV0aG9kIGRhdGFcbiAgICogQG1lbWJlcm9mIFRyZWVOb2RlXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge29iamVjdCB8IGFycmF5IHwgc3RyaW5nIHwgbnVtYmVyIHwgbnVsbH0gX2RhdGEgLSBkYXRhIHdoaWNoIGlzIHRvIGJlIHN0b3JlZFxuICAgKiBAcmV0dXJuIHtvYmplY3QgfCBhcnJheSB8IHN0cmluZyB8IG51bWJlciB8IG51bGx9IC0gZGF0YSBiZWxvbmdpbmcgdG8gdGhpcyBub2RlXG4gICAqL1xuICBUcmVlTm9kZS5wcm90b3R5cGUuZGF0YSA9IGZ1bmN0aW9uKF9kYXRhKXtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoID4gMCl7XG4gICAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEZXB0aCBvZiB0aGUgbm9kZS4gSW5kaWNhdGVzIHRoZSBsZXZlbCBhdCB3aGljaCBub2RlIGxpZXMgaW4gYSB0cmVlLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlcHRoXG4gICAqIEBtZW1iZXJvZiBUcmVlTm9kZVxuICAgKiBAaW5zdGFuY2VcbiAgICogQHJldHVybiB7bnVtYmVyfSAtIGRlcHRoIG9mIG5vZGVcbiAgICovXG4gIFRyZWVOb2RlLnByb3RvdHlwZS5kZXB0aCA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gIH07XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIE1ldGhvZHNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB3aGV0aGVyIHRoaXMgbm9kZSBtYXRjaGVzIHRoZSBzcGVjaWZpZWQgY3JpdGVyaWEuIEl0IHRyaWdnZXJzIGEgY2FsbGJhY2sgY3JpdGVyaWEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHNvbWV0aGluZy5cbiAgICpcbiAgICogQG1ldGhvZCBtYXRjaENyaXRlcmlhXG4gICAqIEBtZW1iZXJvZiBUcmVlTm9kZVxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHNwZWNpZmllcyBzb21lIGNyaXRlcmlhLiBJdCByZWNlaXZlcyB7QGxpbmsgVHJlZU5vZGUjX2RhdGF9IGluIHBhcmFtZXRlciBhbmQgZXhwZWN0cyBkaWZmZXJlbnQgdmFsdWVzIGluIGRpZmZlcmVudCBzY2VuYXJpb3MuXG4gICAqIGBtYXRjaENyaXRlcmlhYCBpcyB1c2VkIGJ5IGZvbGxvd2luZyBmdW5jdGlvbnMgYW5kIGV4cGVjdHM6XG4gICAqIDEuIHtAbGluayBUcmVlI3NlYXJjaEJGU30gLSB7Ym9vbGVhbn0gaW4gcmV0dXJuIGluZGljYXRpbmcgd2hldGhlciBnaXZlbiBub2RlIHNhdGlzZmllcyBjcml0ZXJpYS5cbiAgICogMi4ge0BsaW5rIFRyZWUjc2VhcmNoREZTfSAtIHtib29sZWFufSBpbiByZXR1cm4gaW5kaWNhdGluZyB3aGV0aGVyIGdpdmVuIG5vZGUgc2F0aXNmaWVzIGNyaXRlcmlhLlxuICAgKiAzLiB7QGxpbmsgVHJlZSNleHBvcnR9IC0ge29iamVjdH0gaW4gcmV0dXJuIGluZGljYXRpbmcgZm9ybWF0dGVkIGRhdGEgb2JqZWN0LlxuICAgKi9cbiAgVHJlZU5vZGUucHJvdG90eXBlLm1hdGNoQ3JpdGVyaWEgPSBmdW5jdGlvbihjcml0ZXJpYSl7XG4gICAgcmV0dXJuIGNyaXRlcmlhKHRoaXMuX2RhdGEpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBnZXQgc2libGluZyBub2Rlcy5cbiAgICpcbiAgICogQG1ldGhvZCBzaWJsaW5nc1xuICAgKiBAbWVtYmVyb2YgVHJlZU5vZGVcbiAgICogQGluc3RhbmNlXG4gICAqIEByZXR1cm4ge2FycmF5fSAtIGFycmF5IG9mIGluc3RhbmNlcyBvZiB7QGxpbmsgVHJlZU5vZGV9XG4gICAqL1xuICBUcmVlTm9kZS5wcm90b3R5cGUuc2libGluZ3MgPSBmdW5jdGlvbigpe1xuICAgIHZhciB0aGlzcyA9IHRoaXM7XG4gICAgcmV0dXJuICF0aGlzLl9wYXJlbnROb2RlID8gW10gOiB0aGlzLl9wYXJlbnROb2RlLl9jaGlsZE5vZGVzLmZpbHRlcihmdW5jdGlvbihfY2hpbGQpe1xuICAgICAgcmV0dXJuIF9jaGlsZCAhPT0gdGhpc3M7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIEV4cG9ydFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4gVHJlZU5vZGU7XG5cbn0oKSk7XG4iLCJ2YXIgVHJlZU5vZGUgPSByZXF1aXJlKCcuL3RyZWUtbm9kZScpO1xudmFyIFRyYXZlcnNlciA9IHJlcXVpcmUoJy4vdHJhdmVyc2VyJyk7XG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xuXG4gIC8vIEZsYWcgYmFkIHByYWN0aXNlc1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIEJhc2ljIFNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBAY2xhc3MgVHJlZVxuICAgKiBAY2xhc3NkZXNjIFJlcHJlc2VudHMgdGhlIHRyZWUgaW4gd2hpY2ggZGF0YSBub2RlcyBjYW4gYmUgaW5zZXJ0ZWRcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICAgZnVuY3Rpb24gVHJlZSgpe1xuXG4gICAgLyoqXG4gICAgICogUmVwcmVzZW50cyB0aGUgcm9vdCBub2RlIG9mIHRoZSB0cmVlLlxuICAgICAqXG4gICAgICogQG1lbWJlclxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICogQGRlZmF1bHQgXCJudWxsXCJcbiAgICAgKi9cbiAgICB0aGlzLl9yb290Tm9kZSA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBSZXByZXNlbnRzIHRoZSBjdXJyZW50IG5vZGUgaW4gcXVlc3Rpb24uIGBfY3VycmVudE5vZGVgIHBvaW50cyB0byBtb3N0IHJlY2VudFxuICAgICAqIG5vZGUgaW5zZXJ0ZWQgb3IgcGFyZW50IG5vZGUgb2YgbW9zdCByZWNlbnQgbm9kZSByZW1vdmVkLlxuICAgICAqXG4gICAgICogQG1lbWJlclxuICAgICogQG1lbWJlcm9mIFRyZWUuXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAZGVmYXVsdCBcIm51bGxcIlxuICAgICAqL1xuICAgIHRoaXMuX2N1cnJlbnROb2RlID0gbnVsbDtcblxuICAgIC8qKlxuICAgICAqIFJlcHJlc2VudHMgdGhlIHRyYXZlcnNlciB3aGljaCBzZWFyY2gvdHJhdmVyc2UgYSB0cmVlIGluIERGUyBhbmQgQkZTIGZhc2hpb24uXG4gICAgICpcbiAgICAgKiBAbWVtYmVyXG4gICAgICogQG1lbWJlcm9mIFRyZWVcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBpbnN0YW5jZVxuICAgICAqIEBkZWZhdWx0IHtAbGluayBUcmF2ZXJzZXJ9XG4gICAgICovXG4gICAgdGhpcy5fdHJhdmVyc2VyID0gbmV3IFRyYXZlcnNlcih0aGlzKTtcblxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIEdldHRlcnMgYW5kIFNldHRlcnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSByb290IG5vZGUgb2YgdGhlIHRyZWUuXG4gICAqXG4gICAqIEBtZXRob2Qgcm9vdE5vZGVcbiAgICogQG1lbWJlcm9mIFRyZWVcbiAgICogQGluc3RhbmNlXG4gICAqIEByZXR1cm4ge1RyZWVOb2RlfSAtIHJvb3Qgbm9kZSBvZiB0aGUgdHJlZS5cbiAgICovXG4gIFRyZWUucHJvdG90eXBlLnJvb3ROb2RlID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fcm9vdE5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjdXJyZW50IG5vZGUgaW4gYSB0cmVlXG4gICAqXG4gICAqIEBtZXRob2QgY3VycmVudE5vZGVcbiAgICogQG1lbWJlcm9mIFRyZWVcbiAgICogQGluc3RhbmNlXG4gICAqIEByZXR1cm4ge1RyZWVOb2RlfSAtIGN1cnJlbnQgbm9kZSBvZiB0aGUgdHJlZS5cbiAgICovXG4gIFRyZWUucHJvdG90eXBlLmN1cnJlbnROb2RlID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudE5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldHRlciBmdW5jdGlvbiB0aGF0IHJldHVybnMge0BsaW5rIFRyYXZlcnNlcn0uXG4gICAqXG4gICAqIEBtZXRob2QgdHJhdmVyc2VyXG4gICAqIEBtZW1iZXJvZiBUcmVlXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcmV0dXJuIHtAbGluayBUcmF2ZXJzZXJ9IGZvciB0aGUgdHJlZS5cbiAgICovXG4gIFRyZWUucHJvdG90eXBlLnRyYXZlcnNlciA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX3RyYXZlcnNlcjtcbiAgfTtcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gTWV0aG9kc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdHJlZSBpcyBlbXB0eS5cbiAgICpcbiAgICogQG1ldGhvZCBpc0VtcHR5XG4gICAqIEBtZW1iZXJvZiBUcmVlXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcmV0dXJuIHtib29sZWFufSB3aGV0aGVyIHRyZWUgaXMgZW1wdHkuXG4gICAqL1xuICBUcmVlLnByb3RvdHlwZS5pc0VtcHR5ID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fcm9vdE5vZGUgPT09IG51bGwgJiYgdGhpcy5fY3VycmVudE5vZGUgPT09IG51bGw7XG4gIH07XG5cbiAgLyoqXG4gICAqIEVtcHRpZXMgdGhlIHRyZWUuIFJlbW92ZXMgYWxsIG5vZGVzIGZyb20gdHJlZS5cbiAgICpcbiAgICogQG1ldGhvZCBwcnVuZUFsbE5vZGVzXG4gICAqIEBtZW1iZXJvZiBUcmVlXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcmV0dXJuIHtAbGluayBUcmVlfSBlbXB0eSB0cmVlLlxuICAgKi9cbiAgVHJlZS5wcm90b3R5cGUucHJ1bmVBbGxOb2RlcyA9IGZ1bmN0aW9uKCl7XG4gICAgaWYodGhpcy5fcm9vdE5vZGUgJiYgdGhpcy5fY3VycmVudE5vZGUpIHRoaXMudHJpbUJyYW5jaEZyb20odGhpcy5fcm9vdE5vZGUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEge0BsaW5rIFRyZWVOb2RlfSB0aGF0IGNvbnRhaW5zIHRoZSBkYXRhIHByb3ZpZGVkIGFuZCBpbnNlcnQgaXQgaW4gYSB0cmVlLlxuICAgKiBOZXcgbm9kZSBnZXRzIGluc2VydGVkIHRvIHRoZSBgX2N1cnJlbnROb2RlYCB3aGljaCB1cGRhdGVzIGl0c2VsZiB1cG9uIGV2ZXJ5IGluc2VydGlvbiBhbmQgZGVsZXRpb24uXG4gICAqXG4gICAqIEBtZXRob2QgaW5zZXJ0XG4gICAqIEBtZW1iZXJvZiBUcmVlXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIGRhdGEgdGhhdCBoYXMgdG8gYmUgc3RvcmVkIGluIHRyZWUtbm9kZS5cbiAgICogQHJldHVybiB7b2JqZWN0fSAtIGluc3RhbmNlIG9mIHtAbGluayBUcmVlTm9kZX0gdGhhdCByZXByZXNlbnRzIG5vZGUgaW5zZXJ0ZWQuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIC8vIEluc2VydCBzaW5nbGUgdmFsdWVcbiAgICogdHJlZS5pbnNlcnQoMTgzKTtcbiAgICpcbiAgICogLy8gSW5zZXJ0IGFycmF5IG9mIHZhbHVlc1xuICAgKiB0cmVlLmluc2VydChbMzQsIDU2NSwgNzhdKTtcbiAgICpcbiAgKiAvLyBJbnNlcnQgY29tcGxleCBkYXRhXG4gICAqIHRyZWUuaW5zZXJ0KHtcbiAgICogICBrZXk6ICcjYmVycmllcycsXG4gICAqICAgdmFsdWU6IHsgbmFtZTogJ0FwcGxlJywgY29sb3I6ICdSZWQnfVxuICAgKiB9KTtcbiAgICovXG4gIFRyZWUucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uKGRhdGEpe1xuICAgIHZhciBub2RlID0gbmV3IFRyZWVOb2RlKGRhdGEpO1xuICAgIGlmKHRoaXMuX3Jvb3ROb2RlID09PSBudWxsICYmIHRoaXMuX2N1cnJlbnROb2RlID09PSBudWxsKXtcbiAgICAgIG5vZGUuX2RlcHRoID0gMTtcbiAgICAgIHRoaXMuX3Jvb3ROb2RlID0gdGhpcy5fY3VycmVudE5vZGUgPSBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLl9wYXJlbnROb2RlID0gdGhpcy5fY3VycmVudE5vZGU7XG4gICAgICB0aGlzLl9jdXJyZW50Tm9kZS5fY2hpbGROb2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgdGhpcy5fY3VycmVudE5vZGUgPSBub2RlO1xuICAgICAgbm9kZS5kZXB0aCA9IG5vZGUuX3BhcmVudE5vZGUuX2RlcHRoICsgMTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBub2RlIGZyb20gdHJlZSBhbmQgdXBkYXRlcyBgX2N1cnJlbnROb2RlYCB0byBwYXJlbnQgbm9kZSBvZiBub2RlIHJlbW92ZWQuXG4gICAqXG4gICAqIEBtZXRob2QgcmVtb3ZlXG4gICAqIEBtZW1iZXJvZiBUcmVlXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge29iamVjdH0gbm9kZSAtIHtAbGluayBUcmVlTm9kZX0gdGhhdCBoYXMgdG8gYmUgcmVtb3ZlZC5cbiAgICogQHBhcmFtIHtib29sZWFufSB0cmltIC0gaW5kaWNhdGVzIHdoZXRoZXIgdG8gcmVtb3ZlIGVudGlyZSBicmFuY2ggZnJvbSB0aGUgc3BlY2lmaWVkIG5vZGUuXG4gICAqL1xuICBUcmVlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihub2RlLCB0cmltKXtcbiAgICBpZih0cmltIHx8IG5vZGUgPT09IHRoaXMuX3Jvb3ROb2RlKXtcblxuICAgICAgLy8gVHJpbSBFbnRpcmUgYnJhbmNoXG4gICAgICB0aGlzLnRyaW1CcmFuY2hGcm9tKG5vZGUpO1xuXG4gICAgfSBlbHNlIHtcblxuICAgICAgLy8gVXBhdGUgY2hpbGRyZW4ncyBwYXJlbnQgdG8gZ3JhbmRwYXJlbnRcbiAgICAgIG5vZGUuX2NoaWxkTm9kZXMuZm9yRWFjaChmdW5jdGlvbihfY2hpbGQpe1xuICAgICAgICBfY2hpbGQuX3BhcmVudE5vZGUgPSBub2RlLl9wYXJlbnROb2RlO1xuICAgICAgICBub2RlLl9wYXJlbnROb2RlLl9jaGlsZE5vZGVzLnB1c2goX2NoaWxkKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBEZWxldGUgaXRzbGVmIGZyb20gcGFyZW50IGNoaWxkIGFycmF5XG4gICAgICBub2RlLl9wYXJlbnROb2RlLl9jaGlsZE5vZGVzLnNwbGljZShub2RlLl9wYXJlbnROb2RlLl9jaGlsZE5vZGVzLmluZGV4T2Yobm9kZSksIDEpO1xuXG4gICAgICAvLyBVcGRhdGUgQ3VycmVudCBOb2RlXG4gICAgICB0aGlzLl9jdXJyZW50Tm9kZSA9IG5vZGUuX3BhcmVudE5vZGU7XG5cbiAgICAgIC8vIENsZWFyIENoaWxkIEFycmF5XG4gICAgICBub2RlLl9jaGlsZE5vZGVzID0gW107XG4gICAgICBub2RlLl9wYXJlbnROb2RlID0gbnVsbDtcbiAgICAgIG5vZGUuX2RhdGEgPSBudWxsO1xuXG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmUgYW4gZW50aXJlIGJyYW5jaCBzdGFydGluZyB3aXRoIHNwZWNpZmllZCBub2RlLlxuICAgKlxuICAgKiBAbWV0aG9kIHRyaW1CcmFuY2hGcm9tXG4gICAqIEBtZW1iZXJvZiBUcmVlXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge29iamVjdH0gbm9kZSAtIHtAbGluayBUcmVlTm9kZX0gZnJvbSB3aGljaCBlbnRpcmUgYnJhbmNoIGhhcyB0byBiZSByZW1vdmVkLlxuICAgKi9cbiAgVHJlZS5wcm90b3R5cGUudHJpbUJyYW5jaEZyb20gPSBmdW5jdGlvbihub2RlKXtcblxuICAgIC8vIEhvbGQgYHRoaXNgXG4gICAgdmFyIHRoaXNzID0gdGhpcztcblxuICAgIC8vIHRyaW0gYnJhY2ggcmVjdXJzaXZlbHlcbiAgICAoZnVuY3Rpb24gcmVjdXIobm9kZSl7XG4gICAgICBub2RlLl9jaGlsZE5vZGVzLmZvckVhY2gocmVjdXIpO1xuICAgICAgbm9kZS5fY2hpbGROb2RlcyA9IFtdO1xuICAgICAgbm9kZS5fZGF0YSA9IG51bGw7XG4gICAgfShub2RlKSk7XG5cbiAgICAvLyBVcGRhdGUgQ3VycmVudCBOb2RlXG4gICAgaWYobm9kZS5fcGFyZW50Tm9kZSl7XG4gICAgICBub2RlLl9wYXJlbnROb2RlLl9jaGlsZE5vZGVzLnNwbGljZShub2RlLl9wYXJlbnROb2RlLl9jaGlsZE5vZGVzLmluZGV4T2Yobm9kZSksIDEpO1xuICAgICAgdGhpc3MuX2N1cnJlbnROb2RlID0gbm9kZS5fcGFyZW50Tm9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpc3MuX3Jvb3ROb2RlID0gdGhpc3MuX2N1cnJlbnROb2RlID0gbnVsbDtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEluc2VydHMgbm9kZSB0byBhIHBhcnRpY3VsYXIgbm9kZSBwcmVzZW50IGluIHRoZSB0cmVlLiBQYXJ0aWN1bGFyIG5vZGUgaGVyZSBpcyBzZWFyY2hlZFxuICAgKiBpbiB0aGUgdHJlZSBiYXNlZCBvbiB0aGUgY3JpdGVyaWEgcHJvdmlkZWQuXG4gICAqXG4gICAqIEBtZXRob2QgaW5zZXJ0VG9cbiAgICogQG1lbWJlcm9mIFRyZWVcbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNyaXRlcmlhIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBzcGVjaWZpZXMgdGhlIHNlYXJjaCBjcml0ZXJpYVxuICAgKiBmb3Igbm9kZSB0byB3aGljaCBuZXcgbm9kZSBpcyB0byBiZSBpbnNlcnRlZC4gQ3JpdGVyaWEgY2FsbGJhY2sgaGVyZSByZWNlaXZlcyB7QGxpbmsgVHJlZU5vZGUjX2RhdGF9XG4gICAqIGluIHBhcmFtZXRlciBhbmQgTVVTVCByZXR1cm4gYm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdGhhdCBkYXRhIHNhdGlzZmllcyB5b3VyIGNyaXRlcmlhLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIHRoYXQgaGFzIHRvIGJlIHN0b3JlZCBpbiB0cmVlLW5vZGUuXG4gICAqIEByZXR1cm4ge29iamVjdH0gLSBpbnN0YW5jZSBvZiB7QGxpbmsgVHJlZU5vZGV9IHRoYXQgcmVwcmVzZW50cyBub2RlIGluc2VydGVkLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiAvLyBJbnNlcnQgZGF0YVxuICAgKiB0cmVlLmluc2VydCh7XG4gICAqICAga2V5OiAnI2FwcGxlJyxcbiAgICogICB2YWx1ZTogeyBuYW1lOiAnQXBwbGUnLCBjb2xvcjogJ1JlZCd9XG4gICAqIH0pO1xuICAgKlxuICAgKiAvLyBOZXcgRGF0YVxuICAgKiB2YXIgZ3JlZW5BcHBsZSA9IHtcbiAgICogIGtleTogJyNncmVlbmFwcGxlJyxcbiAgICogIHZhbHVlOiB7IG5hbWU6ICdHcmVlbiBBcHBsZScsIGNvbG9yOiAnR3JlZW4nIH1cbiAgICogfTtcbiAgICpcbiAgICogLy8gSW5zZXJ0IGRhdGEgdG8gbm9kZSB3aGljaCBoYXMgYGtleWAgPSAjYXBwbGVcbiAgICogdHJlZS5pbnNlcnRUbyhmdW5jdGlvbihkYXRhKXtcbiAgICogIHJldHVybiBkYXRhLmtleSA9PT0gJyNhcHBsZSdcbiAgICogfSwgZ3JlZW5BcHBsZSk7XG4gICAqL1xuICBUcmVlLnByb3RvdHlwZS5pbnNlcnRUbyA9IGZ1bmN0aW9uKGNyaXRlcmlhLCBkYXRhKXtcbiAgICB2YXIgbm9kZSA9IHRoaXMudHJhdmVyc2VyKCkuc2VhcmNoREZTKGNyaXRlcmlhKTtcbiAgICByZXR1cm4gdGhpcy5pbnNlcnRUb05vZGUobm9kZSwgZGF0YSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluc2VydHMgbm9kZSB0byBhIHBhcnRpY3VsYXIgbm9kZSBwcmVzZW50IGluIHRoZSB0cmVlLiBQYXJ0aWN1bGFyIG5vZGUgaGVyZSBpcyBhbiBpbnN0YW5jZSBvZiB7QGxpbmsgVHJlZU5vZGV9XG4gICAqXG4gICAqIEBtZXRob2QgaW5zZXJ0VG9Ob2RlXG4gICAqIEBtZW1iZXJvZiBUcmVlXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBub2RlIC0gIHtAbGluayBUcmVlTm9kZX0gdG8gd2hpY2ggZGF0YSBub2RlIGlzIHRvIGJlIGluc2VydGVkLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIHRoYXQgaGFzIHRvIGJlIHN0b3JlZCBpbiB0cmVlLW5vZGUuXG4gICAqIEByZXR1cm4ge29iamVjdH0gLSBpbnN0YW5jZSBvZiB7QGxpbmsgVHJlZU5vZGV9IHRoYXQgcmVwcmVzZW50cyBub2RlIGluc2VydGVkLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiAvLyBJbnNlcnQgZGF0YVxuICAgKiB2YXIgbm9kZSA9IHRyZWUuaW5zZXJ0KHtcbiAgICogICBrZXk6ICcjYXBwbGUnLFxuICAgKiAgIHZhbHVlOiB7IG5hbWU6ICdBcHBsZScsIGNvbG9yOiAnUmVkJ31cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIE5ldyBEYXRhXG4gICAqIHZhciBncmVlbkFwcGxlID0ge1xuICAgKiAga2V5OiAnI2dyZWVuYXBwbGUnLFxuICAgKiAgdmFsdWU6IHsgbmFtZTogJ0dyZWVuIEFwcGxlJywgY29sb3I6ICdHcmVlbicgfVxuICAgKiB9O1xuICAgKlxuICAgKiAvLyBJbnNlcnQgZGF0YSB0byBub2RlXG4gICAqIHRyZWUuaW5zZXJ0VG9Ob2RlKG5vZGUsIGdyZWVuQXBwbGUpO1xuICAgKi9cbiAgVHJlZS5wcm90b3R5cGUuaW5zZXJ0VG9Ob2RlID0gZnVuY3Rpb24obm9kZSwgZGF0YSl7XG4gICAgdmFyIG5ld05vZGUgPSBuZXcgVHJlZU5vZGUoZGF0YSk7XG4gICAgbmV3Tm9kZS5fcGFyZW50Tm9kZSA9IG5vZGU7XG4gICAgbmV3Tm9kZS5fZGVwdGggPSBuZXdOb2RlLl9wYXJlbnROb2RlLl9kZXB0aCArIDE7XG4gICAgbm9kZS5fY2hpbGROb2Rlcy5wdXNoKG5ld05vZGUpO1xuICAgIHRoaXMuX2N1cnJlbnROb2RlID0gbmV3Tm9kZTtcbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogRXhwb3J0cyB0aGUgdHJlZSBkYXRhIGluIGZvcm1hdCBzcGVjaWZpZWQuIEl0IG1haW50YWlucyBoZXJpcmFjaHkgYnkgYWRkaW5nXG4gICAqIGFkZGl0aW9uYWwgXCJjaGlsZHJlblwiIHByb3BlcnR5IHRvIHJldHVybmVkIHZhbHVlIG9mIGBjcml0ZXJpYWAgY2FsbGJhY2suXG4gICAqXG4gICAqIEBtZXRob2QgZXhwb3J0XG4gICAqIEBtZW1iZXJvZiBUcmVlXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge1RyZWV+Y3JpdGVyaWF9IGNyaXRlcmlhIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCByZWNlaXZlcyBkYXRhIGluIHBhcmFtZXRlclxuICAgKiBhbmQgTVVTVCByZXR1cm4gYSBmb3JtYXR0ZWQgZGF0YSB0aGF0IGhhcyB0byBiZSBleHBvcnRlZC4gQSBuZXcgcHJvcGVydHkgXCJjaGlsZHJlblwiIGlzIGFkZGVkIHRvIG9iamVjdCByZXR1cm5lZFxuICAgKiB0aGF0IG1haW50YWlucyB0aGUgaGVpcmFyY2h5IG9mIG5vZGVzLlxuICAgKiBAcmV0dXJuIHtvYmplY3R9IC0ge0BsaW5rIFRyZWVOb2RlfS5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogdmFyIHJvb3ROb2RlID0gdHJlZS5pbnNlcnQoe1xuICAgKiAgIGtleTogJyNhcHBsZScsXG4gICAqICAgdmFsdWU6IHsgbmFtZTogJ0FwcGxlJywgY29sb3I6ICdSZWQnfVxuICAgKiB9KTtcbiAgICpcbiAgICogdHJlZS5pbnNlcnQoe1xuICAgKiAgIGtleTogJyNncmVlbmFwcGxlJyxcbiAgICogICB2YWx1ZTogeyBuYW1lOiAnR3JlZW4gQXBwbGUnLCBjb2xvcjogJ0dyZWVuJ31cbiAgICogfSk7XG4gICAqXG4gICAqIHRyZWUuaW5zZXJ0VG9Ob2RlKHJvb3ROb2RlLCAge1xuICAgKiAga2V5OiAnI3NvbWVhbm90aGVyYXBwbGUnLFxuICAgKiAgdmFsdWU6IHsgbmFtZTogJ1NvbWUgQXBwbGUnLCBjb2xvcjogJ1NvbWUgQ29sb3InIH1cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIEV4cG9ydCB0aGUgdHJlZVxuICAgKiB2YXIgZXhwb3J0ZWQgPSB0cmVlLmV4cG9ydChmdW5jdGlvbihkYXRhKXtcbiAgICogIHJldHVybiB7IG5hbWU6IGRhdGEudmFsdWUubmFtZSB9O1xuICAgKiB9KTtcbiAgICpcbiAgICogLy8gUmVzdWx0IGluIGBleHBvcnRlZGBcbiAgICoge1xuICAgKsKgXCJuYW1lXCI6IFwiQXBwbGVcIixcbiAgICrCoFwiY2hpbGRyZW5cIjogW1xuICAgKsKgwqDCoHtcbiAgICrCoMKgwqDCoMKgXCJuYW1lXCI6IFwiR3JlZW4gQXBwbGVcIixcbiAgICrCoMKgwqDCoMKgXCJjaGlsZHJlblwiOiBbXVxuICAgKsKgwqDCoH0sXG4gICAqwqDCoMKge1xuICAgKsKgwqDCoMKgwqBcIm5hbWVcIjogXCJTb21lIEFwcGxlXCIsXG4gICAqwqDCoMKgwqDCoFwiY2hpbGRyZW5cIjogW11cbiAgICrCoMKgfVxuICAgKsKgXVxuICAgKn1cbiAgICpcbiAgICovXG4gIFRyZWUucHJvdG90eXBlLmV4cG9ydCA9IGZ1bmN0aW9uKGNyaXRlcmlhKXtcblxuICAgIC8vIENoZWNrIGlmIGNyaXRlcmlhIGlzIHNwZWNpZmllZFxuICAgIGlmKCFjcml0ZXJpYSB8fCB0eXBlb2YgY3JpdGVyaWEgIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdFeHBvcnQgY3JpdGVyaWEgbm90IHNwZWNpZmllZCcpO1xuXG4gICAgLy8gQ2hlY2sgaWYgcm9vdE5vZGUgaXMgbm90IG51bGxcbiAgICBpZighdGhpcy5fcm9vdE5vZGUpe1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRXhwb3J0IGV2ZXJ5IG5vZGUgcmVjdXJzaXZlbHlcbiAgICB2YXIgZXhwb3J0UmVjdXIgPSBmdW5jdGlvbihub2RlKXtcbiAgICAgIHZhciBleHBvcnRlZCA9IG5vZGUubWF0Y2hDcml0ZXJpYShjcml0ZXJpYSk7XG4gICAgICBpZighZXhwb3J0ZWQgfHwgdHlwZW9mIGV4cG9ydGVkICE9PSAnb2JqZWN0Jyl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRXhwb3J0IGNyaXRlcmlhIHNob3VsZCBhbHdheXMgcmV0dXJuIGFuIG9iamVjdCBhbmQgaXQgY2Fubm90IGJlIG51bGwuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBleHBvcnRlZC5jaGlsZHJlbiA9IFtdO1xuICAgICAgICBub2RlLl9jaGlsZE5vZGVzLmZvckVhY2goZnVuY3Rpb24oX2NoaWxkKXtcbiAgICAgICAgICBleHBvcnRlZC5jaGlsZHJlbi5wdXNoKGV4cG9ydFJlY3VyKF9jaGlsZCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZXhwb3J0ZWQ7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBleHBvcnRSZWN1cih0aGlzLl9yb290Tm9kZSk7XG4gIH07XG5cblxuICAvKipcbiAgICogSW1wb3J0cyB0aGUgSlNPTiBkYXRhIGludG8gYSB0cmVlIHVzaW5nIHRoZSBjcml0ZXJpYSBwcm92aWRlZC5cbiAgICogQSBwcm9wZXJ0eSBpbmRpY2F0aW5nIHRoZSBuZXN0aW5nIG9mIG9iamVjdCBtdXN0IGJlIHNwZWNpZmllZC5cbiAgICpcbiAgICogQG1ldGhvZCBpbXBvcnRcbiAgICogQG1lbWJlcm9mIFRyZWVcbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gSlNPTiBkYXRhIHRoYXQgaGFzIGJlIGltcG9ydGVkXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjaGlsZFByb3BlcnR5IC0gTmFtZSBvZiB0aGUgcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgbmVzdGVkIGRhdGEuXG4gICAqIEBwYXJhbSB7VHJlZX5jcml0ZXJpYX0gY3JpdGVyaWEgLSBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJlY2VpdmVzIGRhdGEgaW4gcGFyYW1ldGVyXG4gICAqIGFuZCBNVVNUIHJldHVybiBhIGZvcm1hdHRlZCBkYXRhIHRoYXQgaGFzIHRvIGJlIGltcG9ydGVkIGluIGEgdHJlZS5cbiAgICogQHJldHVybiB7b2JqZWN0fSAtIHtAbGluayBUcmVlfS5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogdmFyIGRhdGEgPSB7XG4gICAqICAgXCJ0cmFpbElkXCI6IFwiaDJlNjdkNGVhLWY4NWY0MGUyYWU0YTA2ZjQ3Nzc4NjRkZVwiLFxuICAgKiAgIFwiaW5pdGlhdGVkQXRcIjogMTQ0ODM5MzQ5MjQ4OCxcbiAgICogICBcInNuYXBzaG90c1wiOiB7XG4gICAqICAgICAgXCJzbmFwc2hvdElkXCI6IFwiYjNkMTMyMTMxLTIxM2MyMGYxNTYzMzllYTdiZGNiNjI3M1wiLFxuICAgKiAgICAgIFwiY2FwdHVyZWRBdFwiOiAxNDQ4MzkzNDk1MzUzLFxuICAgKiAgICAgIFwidGh1bWJuYWlsXCI6IFwiZGF0YTppbWdcIixcbiAgICogICAgICBcImNoaWxkcmVuXCI6IFtcbiAgICogICAgICAge1xuICAgKiAgICAgICAgXCJzbmFwc2hvdElkXCI6IFwieWViN2FiMjdjLWIzNmZmMWIwNGFlZmFmYTk2NjEyNDNkZVwiLFxuICAgKiAgICAgICAgXCJjYXB0dXJlZEF0XCI6IDE0NDgzOTM0OTk2ODUsXG4gICAqICAgICAgICBcInRodW1ibmFpbFwiOiBcImRhdGE6aW1hZ2UvXCIsXG4gICAqICAgICAgICBcImNoaWxkcmVuXCI6IFtcbiAgICogICAgICAgICAge1xuICAgKiAgICAgICAgICAgIFwic25hcHNob3RJZFwiOiBcImEwMGM5ODI4Zi1lMmJlMGZjNDczMmY1NjQ3MWU3Nzk0N2FcIixcbiAgICogICAgICAgICAgICBcImNhcHR1cmVkQXRcIjogMTQ0ODM5MzUwMzA2MSxcbiAgICogICAgICAgICAgICBcInRodW1ibmFpbFwiOiBcImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NFwiLFxuICAgKiAgICAgICAgICAgIFwiY2hpbGRyZW5cIjogW11cbiAgICogICAgICAgICAgfVxuICAgKiAgICAgICAgXVxuICAgKiAgICAgIH1cbiAgICogICAgIF1cbiAgICogICB9XG4gICAqIH07XG4gICAqXG4gICAqICAvLyBJbXBvcnRcbiAgICogIC8vIFRoaXMgd2lsbCByZXN1bHQgaW4gYSB0cmVlIGhhdmluZyBub2RlcyBjb250YWluaW5nIGBpZGAgYW5kIGB0aHVtYm5haWxgIGFzIGRhdGFcbiAgICogIHRyZWUuaW1wb3J0KGRhdGEsICdjaGlsZHJlbicsIGZ1bmN0aW9uKG5vZGVEYXRhKXtcbiAgICogICAgcmV0dXJuIHtcbiAgICogICAgICBpZDogbm9kZURhdGEuc25hcHNob3RJZCxcbiAgICogICAgICB0aHVtYm5haWw6IG5vZGVEYXRhLnRodW1ibmFpbFxuICAgKiAgICAgfVxuICAgKiAgfSk7XG4gICAqXG4gICAqL1xuICBUcmVlLnByb3RvdHlwZS5pbXBvcnQgPSBmdW5jdGlvbihkYXRhLCBjaGlsZFByb3BlcnR5LCBjcml0ZXJpYSl7XG5cbiAgICAvLyBFbXB0eSBhbGwgdHJlZVxuICAgIGlmKHRoaXMuX3Jvb3ROb2RlKSB0aGlzLnRyaW1CcmFuY2hGcm9tKHRoaXMuX3Jvb3ROb2RlKTtcblxuICAgIC8vIFNldCBDdXJyZW50IE5vZGUgdG8gcm9vdCBub2RlIGFzIG51bGxcbiAgICB0aGlzLl9jdXJyZW50Tm9kZSA9IHRoaXMuX3Jvb3ROb2RlID0gbnVsbDtcblxuICAgIC8vIEhvbGQgYHRoaXNgXG4gICAgdmFyIHRoaXNzID0gdGhpcztcblxuICAgIC8vIEltcG9ydCByZWN1cnNpdmVseVxuICAgIChmdW5jdGlvbiBpbXBvcnRSZWN1cihub2RlLCByZWN1ckRhdGEpe1xuXG4gICAgICAvLyBGb3JtYXQgZGF0YSBmcm9tIGdpdmVuIGNyaXRlcmlhXG4gICAgICB2YXIgX2RhdGEgPSBjcml0ZXJpYShyZWN1ckRhdGEpO1xuXG4gICAgICAvLyBDcmVhdGUgUm9vdCBOb2RlXG4gICAgICBpZighbm9kZSl7XG4gICAgICAgIG5vZGUgPSB0aGlzcy5pbnNlcnQoX2RhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZSA9IHRoaXNzLmluc2VydFRvTm9kZShub2RlLCBfZGF0YSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEZvciBFdmVyeSBDaGlsZFxuICAgICAgcmVjdXJEYXRhW2NoaWxkUHJvcGVydHldLmZvckVhY2goZnVuY3Rpb24oX2NoaWxkKXtcbiAgICAgICAgaW1wb3J0UmVjdXIobm9kZSwgX2NoaWxkKTtcbiAgICAgIH0pO1xuXG4gICAgfSh0aGlzLl9yb290Tm9kZSwgZGF0YSkpO1xuXG4gICAgLy8gU2V0IEN1cnJlbnQgTm9kZSB0byByb290IG5vZGVcbiAgICB0aGlzLl9jdXJyZW50Tm9kZSA9IHRoaXMuX3Jvb3ROb2RlO1xuXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgfTtcblxuICAvKipcbiAgICogQ2FsbGJhY2sgdGhhdCByZWNlaXZlcyBhIG5vZGUgZGF0YSBpbiBwYXJhbWV0ZXIgYW5kIGV4cGVjdHMgdXNlciB0byByZXR1cm4gb25lIG9mIGZvbGxvd2luZzpcbiAgICogMS4ge0BsaW5rIFRyYXZlcnNlciNzZWFyY2hCRlN9IC0ge2Jvb2xlYW59IGluIHJldHVybiBpbmRpY2F0aW5nIHdoZXRoZXIgZ2l2ZW4gbm9kZSBzYXRpc2ZpZXMgY3JpdGVyaWEuXG4gICAqIDIuIHtAbGluayBUcmF2ZXJzZXIjc2VhcmNoREZTfSAtIHtib29sZWFufSBpbiByZXR1cm4gaW5kaWNhdGluZyB3aGV0aGVyIGdpdmVuIG5vZGUgc2F0aXNmaWVzIGNyaXRlcmlhLlxuICAgKiAzLiB7QGxpbmsgVHJlZSNleHBvcnR9IC0ge29iamVjdH0gaW4gcmV0dXJuIGluZGljYXRpbmcgZm9ybWF0dGVkIGRhdGEgb2JqZWN0LlxuICAgKiBAY2FsbGJhY2sgY3JpdGVyaWFcbiAgICogQHBhcmFtIGRhdGEge29iamVjdH0gLSBkYXRhIG9mIHBhcnRpY3VsYXIge0BsaW5rIFRyZWVOb2RlfVxuICAgKi9cblxuICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAvLyBFeHBvcnRcbiAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiBUcmVlO1xuXG59KCkpO1xuIiwiLyohIEBzb3VyY2UgaHR0cDovL3B1cmwuZWxpZ3JleS5jb20vZ2l0aHViL0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9GaWxlU2F2ZXIuanMgKi9cbnZhciBzYXZlQXM9c2F2ZUFzfHxmdW5jdGlvbihlKXtcInVzZSBzdHJpY3RcIjtpZihcInVuZGVmaW5lZFwiPT10eXBlb2YgbmF2aWdhdG9yfHwhL01TSUUgWzEtOV1cXC4vLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpe3ZhciB0PWUuZG9jdW1lbnQsbj1mdW5jdGlvbigpe3JldHVybiBlLlVSTHx8ZS53ZWJraXRVUkx8fGV9LG89dC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsXCJhXCIpLHI9XCJkb3dubG9hZFwiaW4gbyxpPWZ1bmN0aW9uKGUpe3ZhciB0PW5ldyBNb3VzZUV2ZW50KFwiY2xpY2tcIik7ZS5kaXNwYXRjaEV2ZW50KHQpfSxhPWUud2Via2l0UmVxdWVzdEZpbGVTeXN0ZW0sYz1lLnJlcXVlc3RGaWxlU3lzdGVtfHxhfHxlLm1velJlcXVlc3RGaWxlU3lzdGVtLHU9ZnVuY3Rpb24odCl7KGUuc2V0SW1tZWRpYXRlfHxlLnNldFRpbWVvdXQpKGZ1bmN0aW9uKCl7dGhyb3cgdH0sMCl9LGY9XCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIixzPTAsZD01MDAsbD1mdW5jdGlvbih0KXt2YXIgbz1mdW5jdGlvbigpe1wic3RyaW5nXCI9PXR5cGVvZiB0P24oKS5yZXZva2VPYmplY3RVUkwodCk6dC5yZW1vdmUoKX07ZS5jaHJvbWU/bygpOnNldFRpbWVvdXQobyxkKX0sdj1mdW5jdGlvbihlLHQsbil7dD1bXS5jb25jYXQodCk7Zm9yKHZhciBvPXQubGVuZ3RoO28tLTspe3ZhciByPWVbXCJvblwiK3Rbb11dO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHIpdHJ5e3IuY2FsbChlLG58fGUpfWNhdGNoKGkpe3UoaSl9fX0scD1mdW5jdGlvbihlKXtyZXR1cm4vXlxccyooPzp0ZXh0XFwvXFxTKnxhcHBsaWNhdGlvblxcL3htbHxcXFMqXFwvXFxTKlxcK3htbClcXHMqOy4qY2hhcnNldFxccyo9XFxzKnV0Zi04L2kudGVzdChlLnR5cGUpP25ldyBCbG9iKFtcIu+7v1wiLGVdLHt0eXBlOmUudHlwZX0pOmV9LHc9ZnVuY3Rpb24odCx1LGQpe2R8fCh0PXAodCkpO3ZhciB3LHksbSxTPXRoaXMsaD10LnR5cGUsTz0hMSxSPWZ1bmN0aW9uKCl7dihTLFwid3JpdGVzdGFydCBwcm9ncmVzcyB3cml0ZSB3cml0ZWVuZFwiLnNwbGl0KFwiIFwiKSl9LGI9ZnVuY3Rpb24oKXtpZigoT3x8IXcpJiYodz1uKCkuY3JlYXRlT2JqZWN0VVJMKHQpKSx5KXkubG9jYXRpb24uaHJlZj13O2Vsc2V7dmFyIG89ZS5vcGVuKHcsXCJfYmxhbmtcIik7dm9pZCAwPT1vJiZcInVuZGVmaW5lZFwiIT10eXBlb2Ygc2FmYXJpJiYoZS5sb2NhdGlvbi5ocmVmPXcpfVMucmVhZHlTdGF0ZT1TLkRPTkUsUigpLGwodyl9LGc9ZnVuY3Rpb24oZSl7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIFMucmVhZHlTdGF0ZSE9PVMuRE9ORT9lLmFwcGx5KHRoaXMsYXJndW1lbnRzKTp2b2lkIDB9fSxFPXtjcmVhdGU6ITAsZXhjbHVzaXZlOiExfTtyZXR1cm4gUy5yZWFkeVN0YXRlPVMuSU5JVCx1fHwodT1cImRvd25sb2FkXCIpLHI/KHc9bigpLmNyZWF0ZU9iamVjdFVSTCh0KSxvLmhyZWY9dyxvLmRvd25sb2FkPXUsdm9pZCBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7aShvKSxSKCksbCh3KSxTLnJlYWR5U3RhdGU9Uy5ET05FfSkpOihlLmNocm9tZSYmaCYmaCE9PWYmJihtPXQuc2xpY2V8fHQud2Via2l0U2xpY2UsdD1tLmNhbGwodCwwLHQuc2l6ZSxmKSxPPSEwKSxhJiZcImRvd25sb2FkXCIhPT11JiYodSs9XCIuZG93bmxvYWRcIiksKGg9PT1mfHxhKSYmKHk9ZSksYz8ocys9dC5zaXplLHZvaWQgYyhlLlRFTVBPUkFSWSxzLGcoZnVuY3Rpb24oZSl7ZS5yb290LmdldERpcmVjdG9yeShcInNhdmVkXCIsRSxnKGZ1bmN0aW9uKGUpe3ZhciBuPWZ1bmN0aW9uKCl7ZS5nZXRGaWxlKHUsRSxnKGZ1bmN0aW9uKGUpe2UuY3JlYXRlV3JpdGVyKGcoZnVuY3Rpb24obil7bi5vbndyaXRlZW5kPWZ1bmN0aW9uKHQpe3kubG9jYXRpb24uaHJlZj1lLnRvVVJMKCksUy5yZWFkeVN0YXRlPVMuRE9ORSx2KFMsXCJ3cml0ZWVuZFwiLHQpLGwoZSl9LG4ub25lcnJvcj1mdW5jdGlvbigpe3ZhciBlPW4uZXJyb3I7ZS5jb2RlIT09ZS5BQk9SVF9FUlImJmIoKX0sXCJ3cml0ZXN0YXJ0IHByb2dyZXNzIHdyaXRlIGFib3J0XCIuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24oZSl7bltcIm9uXCIrZV09U1tcIm9uXCIrZV19KSxuLndyaXRlKHQpLFMuYWJvcnQ9ZnVuY3Rpb24oKXtuLmFib3J0KCksUy5yZWFkeVN0YXRlPVMuRE9ORX0sUy5yZWFkeVN0YXRlPVMuV1JJVElOR30pLGIpfSksYil9O2UuZ2V0RmlsZSh1LHtjcmVhdGU6ITF9LGcoZnVuY3Rpb24oZSl7ZS5yZW1vdmUoKSxuKCl9KSxnKGZ1bmN0aW9uKGUpe2UuY29kZT09PWUuTk9UX0ZPVU5EX0VSUj9uKCk6YigpfSkpfSksYil9KSxiKSk6dm9pZCBiKCkpfSx5PXcucHJvdG90eXBlLG09ZnVuY3Rpb24oZSx0LG4pe3JldHVybiBuZXcgdyhlLHQsbil9O3JldHVyblwidW5kZWZpbmVkXCIhPXR5cGVvZiBuYXZpZ2F0b3ImJm5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iP2Z1bmN0aW9uKGUsdCxuKXtyZXR1cm4gbnx8KGU9cChlKSksbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IoZSx0fHxcImRvd25sb2FkXCIpfTooeS5hYm9ydD1mdW5jdGlvbigpe3ZhciBlPXRoaXM7ZS5yZWFkeVN0YXRlPWUuRE9ORSx2KGUsXCJhYm9ydFwiKX0seS5yZWFkeVN0YXRlPXkuSU5JVD0wLHkuV1JJVElORz0xLHkuRE9ORT0yLHkuZXJyb3I9eS5vbndyaXRlc3RhcnQ9eS5vbnByb2dyZXNzPXkub253cml0ZT15Lm9uYWJvcnQ9eS5vbmVycm9yPXkub253cml0ZWVuZD1udWxsLG0pfX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIHNlbGYmJnNlbGZ8fFwidW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3cmJndpbmRvd3x8dGhpcy5jb250ZW50KTtcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cy5zYXZlQXM9c2F2ZUFzOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBkZWZpbmUmJm51bGwhPT1kZWZpbmUmJm51bGwhPWRlZmluZS5hbWQmJmRlZmluZShbXSxmdW5jdGlvbigpe3JldHVybiBzYXZlQXN9KTsiLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsIi8vIFNpbXBsZSwgc3R1cGlkIFwiYmFja2dyb3VuZFwiL1wiYmFja2dyb3VuZC1pbWFnZVwiIHZhbHVlIHBhcnNlciB0aGF0IGp1c3QgYWltcyBhdCBleHBvc2luZyB0aGUgaW1hZ2UgVVJMc1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBjc3NTdXBwb3J0ID0gcmVxdWlyZSgnLi9jc3NTdXBwb3J0Jyk7XG5cblxudmFyIHRyaW1DU1NXaGl0ZXNwYWNlID0gZnVuY3Rpb24gKHVybCkge1xuICAgIHZhciB3aGl0ZXNwYWNlUmVnZXggPSAvXltcXHRcXHJcXGZcXG4gXSooLis/KVtcXHRcXHJcXGZcXG4gXSokLztcblxuICAgIHJldHVybiB1cmwucmVwbGFjZSh3aGl0ZXNwYWNlUmVnZXgsIFwiJDFcIik7XG59O1xuXG4vLyBUT0RPIGV4cG9ydGluZyB0aGlzIGZvciB0aGUgc2FrZSBvZiB1bml0IHRlc3RpbmcuIFNob3VsZCByYXRoZXIgdGVzdCB0aGUgYmFja2dyb3VuZCB2YWx1ZSBwYXJzZXIgZXhwbGljaXRseS5cbmV4cG9ydHMuZXh0cmFjdENzc1VybCA9IGZ1bmN0aW9uIChjc3NVcmwpIHtcbiAgICB2YXIgdXJsUmVnZXggPSAvXnVybFxcKChbXlxcKV0rKVxcKS8sXG4gICAgICAgIHF1b3RlZFVybDtcblxuICAgIGlmICghdXJsUmVnZXgudGVzdChjc3NVcmwpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdXJsXCIpO1xuICAgIH1cblxuICAgIHF1b3RlZFVybCA9IHVybFJlZ2V4LmV4ZWMoY3NzVXJsKVsxXTtcbiAgICByZXR1cm4gY3NzU3VwcG9ydC51bnF1b3RlU3RyaW5nKHRyaW1DU1NXaGl0ZXNwYWNlKHF1b3RlZFVybCkpO1xufTtcblxudmFyIHNsaWNlQmFja2dyb3VuZERlY2xhcmF0aW9uID0gZnVuY3Rpb24gKGJhY2tncm91bmREZWNsYXJhdGlvblRleHQpIHtcbiAgICB2YXIgZnVuY3Rpb25QYXJhbVJlZ2V4UyA9IFwiXFxcXHMqKD86XFxcIlteXFxcIl0qXFxcInwnW14nXSonfFteXFxcXChdKylcXFxccypcIixcbiAgICAgICAgdmFsdWVSZWdleFMgPSBcIihcIiArIFwidXJsXFxcXChcIiArIGZ1bmN0aW9uUGFyYW1SZWdleFMgKyBcIlxcXFwpXCIgKyBcInxcIiArIFwiW14sXFxcXHNdK1wiICsgXCIpXCIsXG4gICAgICAgIHNpbXBsZVNpbmd1bGFyQmFja2dyb3VuZFJlZ2V4UyA9IFwiKD86XFxcXHMqXCIgKyB2YWx1ZVJlZ2V4UyArIFwiKStcIixcbiAgICAgICAgc2ltcGxlQmFja2dyb3VuZFJlZ2V4UyA9IFwiXlxcXFxzKihcIiArIHNpbXBsZVNpbmd1bGFyQmFja2dyb3VuZFJlZ2V4UyArIFwiKVwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIig/OlxcXFxzKixcXFxccyooXCIgKyBzaW1wbGVTaW5ndWxhckJhY2tncm91bmRSZWdleFMgKyBcIikpKlwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlxcXFxzKiRcIixcbiAgICAgICAgc2ltcGxlU2luZ3VsYXJCYWNrZ3JvdW5kUmVnZXggPSBuZXcgUmVnRXhwKHNpbXBsZVNpbmd1bGFyQmFja2dyb3VuZFJlZ2V4UywgXCJnXCIpLFxuICAgICAgICBvdXRlclJlcGVhdGVkTWF0Y2gsXG4gICAgICAgIGJhY2tncm91bmRMYXllcnMgPSBbXSxcbiAgICAgICAgZ2V0VmFsdWVzID0gZnVuY3Rpb24gKHNpbmd1bGFyQmFja2dyb3VuZERlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVSZWdleCA9IG5ldyBSZWdFeHAodmFsdWVSZWdleFMsIFwiZ1wiKSxcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kVmFsdWVzID0gW10sXG4gICAgICAgICAgICAgICAgcmVwZWF0ZWRNYXRjaDtcblxuICAgICAgICAgICAgcmVwZWF0ZWRNYXRjaCA9IHZhbHVlUmVnZXguZXhlYyhzaW5ndWxhckJhY2tncm91bmREZWNsYXJhdGlvbik7XG4gICAgICAgICAgICB3aGlsZSAocmVwZWF0ZWRNYXRjaCkge1xuICAgICAgICAgICAgICAgIGJhY2tncm91bmRWYWx1ZXMucHVzaChyZXBlYXRlZE1hdGNoWzFdKTtcbiAgICAgICAgICAgICAgICByZXBlYXRlZE1hdGNoID0gdmFsdWVSZWdleC5leGVjKHNpbmd1bGFyQmFja2dyb3VuZERlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBiYWNrZ3JvdW5kVmFsdWVzO1xuICAgICAgICB9O1xuXG4gICAgaWYgKGJhY2tncm91bmREZWNsYXJhdGlvblRleHQubWF0Y2gobmV3IFJlZ0V4cChzaW1wbGVCYWNrZ3JvdW5kUmVnZXhTKSkpIHtcbiAgICAgICAgb3V0ZXJSZXBlYXRlZE1hdGNoID0gc2ltcGxlU2luZ3VsYXJCYWNrZ3JvdW5kUmVnZXguZXhlYyhiYWNrZ3JvdW5kRGVjbGFyYXRpb25UZXh0KTtcbiAgICAgICAgd2hpbGUgKG91dGVyUmVwZWF0ZWRNYXRjaCkge1xuICAgICAgICAgICAgYmFja2dyb3VuZExheWVycy5wdXNoKGdldFZhbHVlcyhvdXRlclJlcGVhdGVkTWF0Y2hbMF0pKTtcbiAgICAgICAgICAgIG91dGVyUmVwZWF0ZWRNYXRjaCA9IHNpbXBsZVNpbmd1bGFyQmFja2dyb3VuZFJlZ2V4LmV4ZWMoYmFja2dyb3VuZERlY2xhcmF0aW9uVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYmFja2dyb3VuZExheWVycztcbiAgICB9XG4gICAgcmV0dXJuIFtdO1xufTtcblxudmFyIGZpbmRCYWNrZ3JvdW5kSW1hZ2VVcmxJblZhbHVlcyA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICB2YXIgaSwgdXJsO1xuXG4gICAgZm9yKGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB1cmwgPSBleHBvcnRzLmV4dHJhY3RDc3NVcmwodmFsdWVzW2ldKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgaWR4OiBpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cbn07XG5cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoYmFja2dyb3VuZFZhbHVlKSB7XG4gICAgdmFyIGJhY2tncm91bmRMYXllcnMgPSBzbGljZUJhY2tncm91bmREZWNsYXJhdGlvbihiYWNrZ3JvdW5kVmFsdWUpO1xuXG4gICAgcmV0dXJuIGJhY2tncm91bmRMYXllcnMubWFwKGZ1bmN0aW9uIChiYWNrZ3JvdW5kTGF5ZXJWYWx1ZXMpIHtcbiAgICAgICAgdmFyIHVybE1hdGNoID0gZmluZEJhY2tncm91bmRJbWFnZVVybEluVmFsdWVzKGJhY2tncm91bmRMYXllclZhbHVlcyk7XG5cbiAgICAgICAgaWYgKHVybE1hdGNoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHByZVVybDogYmFja2dyb3VuZExheWVyVmFsdWVzLnNsaWNlKDAsIHVybE1hdGNoLmlkeCksXG4gICAgICAgICAgICAgICAgdXJsOiB1cmxNYXRjaC51cmwsXG4gICAgICAgICAgICAgICAgcG9zdFVybDogYmFja2dyb3VuZExheWVyVmFsdWVzLnNsaWNlKHVybE1hdGNoLmlkeCsxKSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHByZVVybDogYmFja2dyb3VuZExheWVyVmFsdWVzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5leHBvcnRzLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChwYXJzZWRCYWNrZ3JvdW5kKSB7XG4gICAgdmFyIGJhY2tncm91bmRMYXllcnMgPSBwYXJzZWRCYWNrZ3JvdW5kLm1hcChmdW5jdGlvbiAoYmFja2dyb3VuZExheWVyKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXS5jb25jYXQoYmFja2dyb3VuZExheWVyLnByZVVybCk7XG5cbiAgICAgICAgaWYgKGJhY2tncm91bmRMYXllci51cmwpIHtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKCd1cmwoXCInICsgYmFja2dyb3VuZExheWVyLnVybCArICdcIiknKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYmFja2dyb3VuZExheWVyLnBvc3RVcmwpIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHZhbHVlcy5jb25jYXQoYmFja2dyb3VuZExheWVyLnBvc3RVcmwpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlcy5qb2luKCcgJyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gYmFja2dyb3VuZExheWVycy5qb2luKCcsICcpO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgY3Nzb20gPSByZXF1aXJlKCdjc3NvbScpO1xuXG5cbmV4cG9ydHMudW5xdW90ZVN0cmluZyA9IGZ1bmN0aW9uIChxdW90ZWRVcmwpIHtcbiAgICB2YXIgZG91YmxlUXVvdGVSZWdleCA9IC9eXCIoLiopXCIkLyxcbiAgICAgICAgc2luZ2xlUXVvdGVSZWdleCA9IC9eJyguKiknJC87XG5cbiAgICBpZiAoZG91YmxlUXVvdGVSZWdleC50ZXN0KHF1b3RlZFVybCkpIHtcbiAgICAgICAgcmV0dXJuIHF1b3RlZFVybC5yZXBsYWNlKGRvdWJsZVF1b3RlUmVnZXgsIFwiJDFcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHNpbmdsZVF1b3RlUmVnZXgudGVzdChxdW90ZWRVcmwpKSB7XG4gICAgICAgICAgICByZXR1cm4gcXVvdGVkVXJsLnJlcGxhY2Uoc2luZ2xlUXVvdGVSZWdleCwgXCIkMVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBxdW90ZWRVcmw7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgcnVsZXNGb3JDc3NUZXh0RnJvbUJyb3dzZXIgPSBmdW5jdGlvbiAoc3R5bGVDb250ZW50KSB7XG4gICAgdmFyIGRvYyA9IGRvY3VtZW50LmltcGxlbWVudGF0aW9uLmNyZWF0ZUhUTUxEb2N1bWVudChcIlwiKSxcbiAgICAgICAgc3R5bGVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpLFxuICAgICAgICBydWxlcztcblxuICAgIHN0eWxlRWxlbWVudC50ZXh0Q29udGVudCA9IHN0eWxlQ29udGVudDtcbiAgICAvLyB0aGUgc3R5bGUgd2lsbCBvbmx5IGJlIHBhcnNlZCBvbmNlIGl0IGlzIGFkZGVkIHRvIGEgZG9jdW1lbnRcbiAgICBkb2MuYm9keS5hcHBlbmRDaGlsZChzdHlsZUVsZW1lbnQpO1xuICAgIHJ1bGVzID0gc3R5bGVFbGVtZW50LnNoZWV0LmNzc1J1bGVzO1xuXG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHJ1bGVzKTtcbn07XG5cbnZhciBicm93c2VySGFzQmFja2dyb3VuZEltYWdlVXJsSXNzdWUgPSAoZnVuY3Rpb24gKCkge1xuICAgIC8vIENoZWNrcyBmb3IgaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9MTYxNjQ0XG4gICAgdmFyIHJ1bGVzID0gcnVsZXNGb3JDc3NUZXh0RnJvbUJyb3dzZXIoJ2F7YmFja2dyb3VuZDp1cmwoaSl9Jyk7XG4gICAgcmV0dXJuICFydWxlcy5sZW5ndGggfHwgcnVsZXNbMF0uY3NzVGV4dC5pbmRleE9mKCd1cmwoKScpID49IDA7XG59KCkpO1xuXG5leHBvcnRzLnJ1bGVzRm9yQ3NzVGV4dCA9IGZ1bmN0aW9uIChzdHlsZUNvbnRlbnQpIHtcbiAgICBpZiAoYnJvd3Nlckhhc0JhY2tncm91bmRJbWFnZVVybElzc3VlICYmIGNzc29tLnBhcnNlKSB7XG4gICAgICAgIHJldHVybiBjc3NvbS5wYXJzZShzdHlsZUNvbnRlbnQpLmNzc1J1bGVzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBydWxlc0ZvckNzc1RleHRGcm9tQnJvd3NlcihzdHlsZUNvbnRlbnQpO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuY3NzUnVsZXNUb1RleHQgPSBmdW5jdGlvbiAoY3NzUnVsZXMpIHtcbiAgICByZXR1cm4gY3NzUnVsZXMucmVkdWNlKGZ1bmN0aW9uIChjc3NUZXh0LCBydWxlKSB7XG4gICAgICAgIHJldHVybiBjc3NUZXh0ICsgcnVsZS5jc3NUZXh0O1xuICAgIH0sICcnKTtcbn07XG5cbmV4cG9ydHMuZXhjaGFuZ2VSdWxlID0gZnVuY3Rpb24gKGNzc1J1bGVzLCBydWxlLCBuZXdSdWxlVGV4dCkge1xuICAgIHZhciBydWxlSWR4ID0gY3NzUnVsZXMuaW5kZXhPZihydWxlKSxcbiAgICAgICAgc3R5bGVTaGVldCA9IHJ1bGUucGFyZW50U3R5bGVTaGVldDtcblxuICAgIC8vIEdlbmVyYXRlIGEgbmV3IHJ1bGVcbiAgICBzdHlsZVNoZWV0Lmluc2VydFJ1bGUobmV3UnVsZVRleHQsIHJ1bGVJZHgrMSk7XG4gICAgc3R5bGVTaGVldC5kZWxldGVSdWxlKHJ1bGVJZHgpO1xuICAgIC8vIEV4Y2hhbmdlIHdpdGggdGhlIG5ld1xuICAgIGNzc1J1bGVzW3J1bGVJZHhdID0gc3R5bGVTaGVldC5jc3NSdWxlc1tydWxlSWR4XTtcbn07XG5cbi8vIFdvcmthcm91bmQgZm9yIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTQ0Mzk3OFxuZXhwb3J0cy5jaGFuZ2VGb250RmFjZVJ1bGVTcmMgPSBmdW5jdGlvbiAoY3NzUnVsZXMsIHJ1bGUsIG5ld1NyYykge1xuICAgIHZhciBuZXdSdWxlVGV4dCA9ICdAZm9udC1mYWNlIHsgZm9udC1mYW1pbHk6ICcgKyBydWxlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUoXCJmb250LWZhbWlseVwiKSArICc7ICc7XG5cbiAgICBpZiAocnVsZS5zdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKFwiZm9udC1zdHlsZVwiKSkge1xuICAgICAgICBuZXdSdWxlVGV4dCArPSAnZm9udC1zdHlsZTogJyArIHJ1bGUuc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShcImZvbnQtc3R5bGVcIikgKyAnOyAnO1xuICAgIH1cblxuICAgIGlmIChydWxlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUoXCJmb250LXdlaWdodFwiKSkge1xuICAgICAgICBuZXdSdWxlVGV4dCArPSAnZm9udC13ZWlnaHQ6ICcgKyBydWxlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUoXCJmb250LXdlaWdodFwiKSArICc7ICc7XG4gICAgfVxuXG4gICAgbmV3UnVsZVRleHQgKz0gJ3NyYzogJyArIG5ld1NyYyArICd9JztcbiAgICBleHBvcnRzLmV4Y2hhbmdlUnVsZShjc3NSdWxlcywgcnVsZSwgbmV3UnVsZVRleHQpO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLFxuICAgIGlubGluZUltYWdlID0gcmVxdWlyZSgnLi9pbmxpbmVJbWFnZScpLFxuICAgIGlubGluZVNjcmlwdCA9IHJlcXVpcmUoJy4vaW5saW5lU2NyaXB0JyksXG4gICAgaW5saW5lQ3NzID0gcmVxdWlyZSgnLi9pbmxpbmVDc3MnKSxcbiAgICBjc3NTdXBwb3J0ID0gcmVxdWlyZSgnLi9jc3NTdXBwb3J0Jyk7XG5cblxudmFyIGdldFVybEJhc2VQYXRoID0gZnVuY3Rpb24gKHVybCkge1xuICAgIHJldHVybiB1dGlsLmpvaW5VcmwodXJsLCAnLicpO1xufTtcblxudmFyIHBhcmFtZXRlckhhc2hGdW5jdGlvbiA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAvLyBIQUNLIEpTT04uc3RyaW5naWZ5IGlzIHBvb3IgbWFuJ3MgaGFzaGluZztcbiAgICAvLyBzYW1lIG9iamVjdHMgbWlnaHQgbm90IHJlY2VpdmUgc2FtZSByZXN1bHQgYXMga2V5IG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkXG4gICAgdmFyIGEgPSBwYXJhbXMubWFwKGZ1bmN0aW9uIChwYXJhbSwgaWR4KSB7XG4gICAgICAgIC8vIE9ubHkgaW5jbHVkZSBvcHRpb25zIHJlbGV2YW50IGZvciBtZXRob2RcbiAgICAgICAgaWYgKGlkeCA9PT0gKHBhcmFtcy5sZW5ndGggLSAxKSkge1xuICAgICAgICAgICAgcGFyYW0gPSB7XG4gICAgICAgICAgICAgICAgLy8gVHdvIGRpZmZlcmVudCBIVE1MIHBhZ2VzIG9uIHRoZSBzYW1lIHBhdGggbGV2ZWwgaGF2ZSB0aGUgc2FtZSBiYXNlIHBhdGgsIGJ1dCBhIGRpZmZlcmVudCBVUkxcbiAgICAgICAgICAgICAgICBiYXNlVXJsOiBnZXRVcmxCYXNlUGF0aChwYXJhbS5iYXNlVXJsKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocGFyYW0pO1xuICAgIH0pO1xuICAgIHJldHVybiBhO1xufTtcblxudmFyIG1lbW9pemVGdW5jdGlvbk9uQ2FjaGluZyA9IGZ1bmN0aW9uIChmdW5jLCBvcHRpb25zKSB7XG4gICAgaWYgKChvcHRpb25zLmNhY2hlICE9PSBmYWxzZSAmJiBvcHRpb25zLmNhY2hlICE9PSAnbm9uZScpICYmIG9wdGlvbnMuY2FjaGVCdWNrZXQpIHtcbiAgICAgICAgcmV0dXJuIHV0aWwubWVtb2l6ZShmdW5jLCBwYXJhbWV0ZXJIYXNoRnVuY3Rpb24sIG9wdGlvbnMuY2FjaGVCdWNrZXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmdW5jO1xuICAgIH1cbn07XG5cbi8qIFN0eWxlIGlubGluaW5nICovXG5cbnZhciByZXF1ZXN0RXh0ZXJuYWxzRm9yU3R5bGVzaGVldCA9IGZ1bmN0aW9uIChzdHlsZUNvbnRlbnQsIGFscmVhZHlMb2FkZWRDc3NVcmxzLCBvcHRpb25zKSB7XG4gICAgdmFyIGNzc1J1bGVzID0gY3NzU3VwcG9ydC5ydWxlc0ZvckNzc1RleHQoc3R5bGVDb250ZW50KTtcblxuICAgIHJldHVybiBpbmxpbmVDc3MubG9hZENTU0ltcG9ydHNGb3JSdWxlcyhjc3NSdWxlcywgYWxyZWFkeUxvYWRlZENzc1VybHMsIG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24gKGNzc0ltcG9ydFJlc3VsdCkge1xuICAgICAgICByZXR1cm4gaW5saW5lQ3NzLmxvYWRBbmRJbmxpbmVDU1NSZXNvdXJjZXNGb3JSdWxlcyhjc3NSdWxlcywgb3B0aW9ucykudGhlbihmdW5jdGlvbiAoY3NzUmVzb3VyY2VzUmVzdWx0KSB7XG4gICAgICAgICAgICB2YXIgZXJyb3JzID0gY3NzSW1wb3J0UmVzdWx0LmVycm9ycy5jb25jYXQoY3NzUmVzb3VyY2VzUmVzdWx0LmVycm9ycyksXG4gICAgICAgICAgICAgICAgaGFzQ2hhbmdlcyA9IGNzc0ltcG9ydFJlc3VsdC5oYXNDaGFuZ2VzIHx8IGNzc1Jlc291cmNlc1Jlc3VsdC5oYXNDaGFuZ2VzO1xuXG4gICAgICAgICAgICBpZiAoaGFzQ2hhbmdlcykge1xuICAgICAgICAgICAgICAgIHN0eWxlQ29udGVudCA9IGNzc1N1cHBvcnQuY3NzUnVsZXNUb1RleHQoY3NzUnVsZXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGhhc0NoYW5nZXM6IGhhc0NoYW5nZXMsXG4gICAgICAgICAgICAgICAgY29udGVudDogc3R5bGVDb250ZW50LFxuICAgICAgICAgICAgICAgIGVycm9yczogZXJyb3JzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnZhciBsb2FkQW5kSW5saW5lQ3NzRm9yU3R5bGUgPSBmdW5jdGlvbiAoc3R5bGUsIG9wdGlvbnMsIGFscmVhZHlMb2FkZWRDc3NVcmxzKSB7XG4gICAgdmFyIHN0eWxlQ29udGVudCA9IHN0eWxlLnRleHRDb250ZW50LFxuICAgICAgICBwcm9jZXNzRXh0ZXJuYWxzID0gbWVtb2l6ZUZ1bmN0aW9uT25DYWNoaW5nKHJlcXVlc3RFeHRlcm5hbHNGb3JTdHlsZXNoZWV0LCBvcHRpb25zKTtcblxuICAgIHJldHVybiBwcm9jZXNzRXh0ZXJuYWxzKHN0eWxlQ29udGVudCwgYWxyZWFkeUxvYWRlZENzc1VybHMsIG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0Lmhhc0NoYW5nZXMpIHtcbiAgICAgICAgICAgIHN0eWxlLmNoaWxkTm9kZXNbMF0ubm9kZVZhbHVlID0gcmVzdWx0LmNvbnRlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdXRpbC5jbG9uZUFycmF5KHJlc3VsdC5lcnJvcnMpO1xuICAgIH0pO1xufTtcblxudmFyIGdldENzc1N0eWxlRWxlbWVudHMgPSBmdW5jdGlvbiAoZG9jKSB7XG4gICAgdmFyIHN0eWxlcyA9IGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN0eWxlXCIpO1xuXG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5maWx0ZXIuY2FsbChzdHlsZXMsIGZ1bmN0aW9uIChzdHlsZSkge1xuICAgICAgICByZXR1cm4gIXN0eWxlLmF0dHJpYnV0ZXMudHlwZSB8fCBzdHlsZS5hdHRyaWJ1dGVzLnR5cGUubm9kZVZhbHVlID09PSBcInRleHQvY3NzXCI7XG4gICAgfSk7XG59O1xuXG5leHBvcnRzLmxvYWRBbmRJbmxpbmVTdHlsZXMgPSBmdW5jdGlvbiAoZG9jLCBvcHRpb25zKSB7XG4gICAgdmFyIHN0eWxlcyA9IGdldENzc1N0eWxlRWxlbWVudHMoZG9jKSxcbiAgICAgICAgYWxsRXJyb3JzID0gW10sXG4gICAgICAgIGFscmVhZHlMb2FkZWRDc3NVcmxzID0gW10sXG4gICAgICAgIGlubGluZU9wdGlvbnM7XG5cbiAgICBpbmxpbmVPcHRpb25zID0gdXRpbC5jbG9uZShvcHRpb25zKTtcbiAgICBpbmxpbmVPcHRpb25zLmJhc2VVcmwgPSBpbmxpbmVPcHRpb25zLmJhc2VVcmwgfHwgdXRpbC5nZXREb2N1bWVudEJhc2VVcmwoZG9jKTtcblxuICAgIHJldHVybiB1dGlsLmFsbChzdHlsZXMubWFwKGZ1bmN0aW9uIChzdHlsZSkge1xuICAgICAgICByZXR1cm4gbG9hZEFuZElubGluZUNzc0ZvclN0eWxlKHN0eWxlLCBpbmxpbmVPcHRpb25zLCBhbHJlYWR5TG9hZGVkQ3NzVXJscykudGhlbihmdW5jdGlvbiAoZXJyb3JzKSB7XG4gICAgICAgICAgICBhbGxFcnJvcnMgPSBhbGxFcnJvcnMuY29uY2F0KGVycm9ycyk7XG4gICAgICAgIH0pO1xuICAgIH0pKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFsbEVycm9ycztcbiAgICB9KTtcbn07XG5cbi8qIENTUyBsaW5rIGlubGluaW5nICovXG5cbnZhciBzdWJzdGl0dXRlTGlua1dpdGhJbmxpbmVTdHlsZSA9IGZ1bmN0aW9uIChvbGRMaW5rTm9kZSwgc3R5bGVDb250ZW50KSB7XG4gICAgdmFyIHBhcmVudCA9IG9sZExpbmtOb2RlLnBhcmVudE5vZGUsXG4gICAgICAgIHN0eWxlTm9kZTtcblxuICAgIHN0eWxlQ29udGVudCA9IHN0eWxlQ29udGVudC50cmltKCk7XG4gICAgaWYgKHN0eWxlQ29udGVudCkge1xuICAgICAgICBzdHlsZU5vZGUgPSBvbGRMaW5rTm9kZS5vd25lckRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgc3R5bGVOb2RlLnR5cGUgPSBcInRleHQvY3NzXCI7XG4gICAgICAgIHN0eWxlTm9kZS5hcHBlbmRDaGlsZChvbGRMaW5rTm9kZS5vd25lckRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0eWxlQ29udGVudCkpO1xuXG4gICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoc3R5bGVOb2RlLCBvbGRMaW5rTm9kZSk7XG4gICAgfVxuXG4gICAgcGFyZW50LnJlbW92ZUNoaWxkKG9sZExpbmtOb2RlKTtcbn07XG5cbnZhciByZXF1ZXN0U3R5bGVzaGVldEFuZElubGluZVJlc291cmNlcyA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdXRpbC5hamF4KHVybCwgb3B0aW9ucylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgICAgICAgICAgIHZhciBjc3NSdWxlcyA9IGNzc1N1cHBvcnQucnVsZXNGb3JDc3NUZXh0KGNvbnRlbnQpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgY3NzUnVsZXM6IGNzc1J1bGVzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICB2YXIgaGFzQ2hhbmdlc0Zyb21QYXRoQWRqdXN0bWVudCA9IGlubGluZUNzcy5hZGp1c3RQYXRoc09mQ3NzUmVzb3VyY2VzKHVybCwgcmVzdWx0LmNzc1J1bGVzKTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBjb250ZW50OiByZXN1bHQuY29udGVudCxcbiAgICAgICAgICAgICAgICBjc3NSdWxlczogcmVzdWx0LmNzc1J1bGVzLFxuICAgICAgICAgICAgICAgIGhhc0NoYW5nZXM6IGhhc0NoYW5nZXNGcm9tUGF0aEFkanVzdG1lbnRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbmxpbmVDc3MubG9hZENTU0ltcG9ydHNGb3JSdWxlcyhyZXN1bHQuY3NzUnVsZXMsIFtdLCBvcHRpb25zKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChjc3NJbXBvcnRSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHJlc3VsdC5jb250ZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgY3NzUnVsZXM6IHJlc3VsdC5jc3NSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NoYW5nZXM6IHJlc3VsdC5oYXNDaGFuZ2VzIHx8IGNzc0ltcG9ydFJlc3VsdC5oYXNDaGFuZ2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JzOiBjc3NJbXBvcnRSZXN1bHQuZXJyb3JzXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbmxpbmVDc3MubG9hZEFuZElubGluZUNTU1Jlc291cmNlc0ZvclJ1bGVzKHJlc3VsdC5jc3NSdWxlcywgb3B0aW9ucylcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoY3NzUmVzb3VyY2VzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiByZXN1bHQuY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNzc1J1bGVzOiByZXN1bHQuY3NzUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNDaGFuZ2VzOiByZXN1bHQuaGFzQ2hhbmdlcyB8fCBjc3NSZXNvdXJjZXNSZXN1bHQuaGFzQ2hhbmdlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yczogcmVzdWx0LmVycm9ycy5jb25jYXQoY3NzUmVzb3VyY2VzUmVzdWx0LmVycm9ycylcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSByZXN1bHQuY29udGVudDtcbiAgICAgICAgICAgIGlmIChyZXN1bHQuaGFzQ2hhbmdlcykge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBjc3NTdXBwb3J0LmNzc1J1bGVzVG9UZXh0KHJlc3VsdC5jc3NSdWxlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgZXJyb3JzOiByZXN1bHQuZXJyb3JzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbn07XG5cbnZhciBsb2FkTGlua2VkQ1NTID0gZnVuY3Rpb24gKGxpbmssIG9wdGlvbnMpIHtcbiAgICB2YXIgY3NzSHJlZiA9IGxpbmsuYXR0cmlidXRlcy5ocmVmLm5vZGVWYWx1ZSxcbiAgICAgICAgZG9jdW1lbnRCYXNlVXJsID0gdXRpbC5nZXREb2N1bWVudEJhc2VVcmwobGluay5vd25lckRvY3VtZW50KSxcbiAgICAgICAgYWpheE9wdGlvbnMgPSB1dGlsLmNsb25lKG9wdGlvbnMpO1xuXG4gICAgaWYgKCFhamF4T3B0aW9ucy5iYXNlVXJsICYmIGRvY3VtZW50QmFzZVVybCkge1xuICAgICAgICBhamF4T3B0aW9ucy5iYXNlVXJsID0gZG9jdW1lbnRCYXNlVXJsO1xuICAgIH1cblxuICAgIHZhciBwcm9jZXNzU3R5bGVzaGVldCA9IG1lbW9pemVGdW5jdGlvbk9uQ2FjaGluZyhyZXF1ZXN0U3R5bGVzaGVldEFuZElubGluZVJlc291cmNlcywgb3B0aW9ucyk7XG5cbiAgICByZXR1cm4gcHJvY2Vzc1N0eWxlc2hlZXQoY3NzSHJlZiwgYWpheE9wdGlvbnMpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29udGVudDogcmVzdWx0LmNvbnRlbnQsXG4gICAgICAgICAgICBlcnJvcnM6IHV0aWwuY2xvbmVBcnJheShyZXN1bHQuZXJyb3JzKVxuICAgICAgICB9O1xuICAgIH0pO1xufTtcblxudmFyIGdldENzc1N0eWxlc2hlZXRMaW5rcyA9IGZ1bmN0aW9uIChkb2MpIHtcbiAgICB2YXIgbGlua3MgPSBkb2MuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIpO1xuXG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5maWx0ZXIuY2FsbChsaW5rcywgZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgcmV0dXJuIGxpbmsuYXR0cmlidXRlcy5yZWwgJiYgbGluay5hdHRyaWJ1dGVzLnJlbC5ub2RlVmFsdWUgPT09IFwic3R5bGVzaGVldFwiICYmXG4gICAgICAgICAgICAoIWxpbmsuYXR0cmlidXRlcy50eXBlIHx8IGxpbmsuYXR0cmlidXRlcy50eXBlLm5vZGVWYWx1ZSA9PT0gXCJ0ZXh0L2Nzc1wiKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydHMubG9hZEFuZElubGluZUNzc0xpbmtzID0gZnVuY3Rpb24gKGRvYywgb3B0aW9ucykge1xuICAgIHZhciBsaW5rcyA9IGdldENzc1N0eWxlc2hlZXRMaW5rcyhkb2MpLFxuICAgICAgICBlcnJvcnMgPSBbXTtcblxuICAgIHJldHVybiB1dGlsLmFsbChsaW5rcy5tYXAoZnVuY3Rpb24gKGxpbmspIHtcbiAgICAgICAgcmV0dXJuIGxvYWRMaW5rZWRDU1MobGluaywgb3B0aW9ucykudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgIHN1YnN0aXR1dGVMaW5rV2l0aElubGluZVN0eWxlKGxpbmssIHJlc3VsdC5jb250ZW50ICsgXCJcXG5cIik7XG5cbiAgICAgICAgICAgIGVycm9ycyA9IGVycm9ycy5jb25jYXQocmVzdWx0LmVycm9ycyk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgcmVzb3VyY2VUeXBlOiBcInN0eWxlc2hlZXRcIixcbiAgICAgICAgICAgICAgICB1cmw6IGUudXJsLFxuICAgICAgICAgICAgICAgIG1zZzogXCJVbmFibGUgdG8gbG9hZCBzdHlsZXNoZWV0IFwiICsgZS51cmxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBlcnJvcnM7XG4gICAgfSk7XG59O1xuXG4vKiBNYWluICovXG5cbmV4cG9ydHMubG9hZEFuZElubGluZUltYWdlcyA9IGlubGluZUltYWdlLmlubGluZTtcbmV4cG9ydHMubG9hZEFuZElubGluZVNjcmlwdCA9IGlubGluZVNjcmlwdC5pbmxpbmU7XG5cbmV4cG9ydHMuaW5saW5lUmVmZXJlbmNlcyA9IGZ1bmN0aW9uIChkb2MsIG9wdGlvbnMpIHtcbiAgICB2YXIgYWxsRXJyb3JzID0gW10sXG4gICAgICAgIGlubGluZUZ1bmNzID0gW1xuICAgICAgICAgICAgZXhwb3J0cy5sb2FkQW5kSW5saW5lSW1hZ2VzLFxuICAgICAgICAgICAgZXhwb3J0cy5sb2FkQW5kSW5saW5lU3R5bGVzLFxuICAgICAgICAgICAgZXhwb3J0cy5sb2FkQW5kSW5saW5lQ3NzTGlua3NdO1xuXG4gICAgaWYgKG9wdGlvbnMuaW5saW5lU2NyaXB0cyAhPT0gZmFsc2UpIHtcbiAgICAgICAgaW5saW5lRnVuY3MucHVzaChleHBvcnRzLmxvYWRBbmRJbmxpbmVTY3JpcHQpO1xuICAgIH1cblxuICAgIHJldHVybiB1dGlsLmFsbChpbmxpbmVGdW5jcy5tYXAoZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMoZG9jLCBvcHRpb25zKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGVycm9ycykge1xuICAgICAgICAgICAgICAgIGFsbEVycm9ycyA9IGFsbEVycm9ycy5jb25jYXQoZXJyb3JzKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFsbEVycm9ycztcbiAgICB9KTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGF5ZXByb21pc2UgPSByZXF1aXJlKCdheWVwcm9taXNlJyksXG4gICAgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLFxuICAgIGNzc1N1cHBvcnQgPSByZXF1aXJlKCcuL2Nzc1N1cHBvcnQnKSxcbiAgICBiYWNrZ3JvdW5kVmFsdWVQYXJzZXIgPSByZXF1aXJlKCcuL2JhY2tncm91bmRWYWx1ZVBhcnNlcicpLFxuICAgIGZvbnRGYWNlU3JjVmFsdWVQYXJzZXIgPSByZXF1aXJlKCdjc3MtZm9udC1mYWNlLXNyYycpO1xuXG5cbnZhciB1cGRhdGVDc3NQcm9wZXJ0eVZhbHVlID0gZnVuY3Rpb24gKHJ1bGUsIHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIHJ1bGUuc3R5bGUuc2V0UHJvcGVydHkocHJvcGVydHksIHZhbHVlLCBydWxlLnN0eWxlLmdldFByb3BlcnR5UHJpb3JpdHkocHJvcGVydHkpKTtcbn07XG5cbnZhciBmaW5kQmFja2dyb3VuZEltYWdlUnVsZXMgPSBmdW5jdGlvbiAoY3NzUnVsZXMpIHtcbiAgICByZXR1cm4gY3NzUnVsZXMuZmlsdGVyKGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgIHJldHVybiBydWxlLnR5cGUgPT09IHdpbmRvdy5DU1NSdWxlLlNUWUxFX1JVTEUgJiYgKHJ1bGUuc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYmFja2dyb3VuZC1pbWFnZScpIHx8IHJ1bGUuc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYmFja2dyb3VuZCcpKTtcbiAgICB9KTtcbn07XG5cbnZhciBmaW5kQmFja2dyb3VuZERlY2xhcmF0aW9ucyA9IGZ1bmN0aW9uIChydWxlcykge1xuICAgIHZhciBiYWNrZ3JvdW5kRGVjbGFyYXRpb25zID0gW107XG5cbiAgICBydWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgIGlmIChydWxlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JhY2tncm91bmQtaW1hZ2UnKSkge1xuICAgICAgICAgICAgYmFja2dyb3VuZERlY2xhcmF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eTogJ2JhY2tncm91bmQtaW1hZ2UnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBydWxlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JhY2tncm91bmQtaW1hZ2UnKSxcbiAgICAgICAgICAgICAgICBydWxlOiBydWxlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChydWxlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JhY2tncm91bmQnKSkge1xuICAgICAgICAgICAgYmFja2dyb3VuZERlY2xhcmF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eTogJ2JhY2tncm91bmQnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBydWxlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JhY2tncm91bmQnKSxcbiAgICAgICAgICAgICAgICBydWxlOiBydWxlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGJhY2tncm91bmREZWNsYXJhdGlvbnM7XG59O1xuXG52YXIgZmluZEZvbnRGYWNlUnVsZXMgPSBmdW5jdGlvbiAoY3NzUnVsZXMpIHtcbiAgICByZXR1cm4gY3NzUnVsZXMuZmlsdGVyKGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgIHJldHVybiBydWxlLnR5cGUgPT09IHdpbmRvdy5DU1NSdWxlLkZPTlRfRkFDRV9SVUxFICYmIHJ1bGUuc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShcInNyY1wiKTtcbiAgICB9KTtcbn07XG5cbnZhciBmaW5kQ1NTSW1wb3J0UnVsZXMgPSBmdW5jdGlvbiAoY3NzUnVsZXMpIHtcbiAgICByZXR1cm4gY3NzUnVsZXMuZmlsdGVyKGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgIHJldHVybiBydWxlLnR5cGUgPT09IHdpbmRvdy5DU1NSdWxlLklNUE9SVF9SVUxFICYmIHJ1bGUuaHJlZjtcbiAgICB9KTtcbn07XG5cbnZhciBmaW5kRXh0ZXJuYWxCYWNrZ3JvdW5kVXJscyA9IGZ1bmN0aW9uIChwYXJzZWRCYWNrZ3JvdW5kKSB7XG4gICAgdmFyIG1hdGNoSW5kaWNlcyA9IFtdO1xuXG4gICAgcGFyc2VkQmFja2dyb3VuZC5mb3JFYWNoKGZ1bmN0aW9uIChiYWNrZ3JvdW5kTGF5ZXIsIGkpIHtcbiAgICAgICAgaWYgKGJhY2tncm91bmRMYXllci51cmwgJiYgIXV0aWwuaXNEYXRhVXJpKGJhY2tncm91bmRMYXllci51cmwpKSB7XG4gICAgICAgICAgICBtYXRjaEluZGljZXMucHVzaChpKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1hdGNoSW5kaWNlcztcbn07XG5cbnZhciBmaW5kRXh0ZXJuYWxGb250RmFjZVVybHMgPSBmdW5jdGlvbiAocGFyc2VkRm9udEZhY2VTb3VyY2VzKSB7XG4gICAgdmFyIHNvdXJjZUluZGljZXMgPSBbXTtcbiAgICBwYXJzZWRGb250RmFjZVNvdXJjZXMuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlSXRlbSwgaSkge1xuICAgICAgICBpZiAoc291cmNlSXRlbS51cmwgJiYgIXV0aWwuaXNEYXRhVXJpKHNvdXJjZUl0ZW0udXJsKSkge1xuICAgICAgICAgICAgc291cmNlSW5kaWNlcy5wdXNoKGkpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHNvdXJjZUluZGljZXM7XG59O1xuXG5leHBvcnRzLmFkanVzdFBhdGhzT2ZDc3NSZXNvdXJjZXMgPSBmdW5jdGlvbiAoYmFzZVVybCwgY3NzUnVsZXMpIHtcbiAgICB2YXIgYmFja2dyb3VuZFJ1bGVzID0gZmluZEJhY2tncm91bmRJbWFnZVJ1bGVzKGNzc1J1bGVzKSxcbiAgICAgICAgYmFja2dyb3VuZERlY2xhcmF0aW9ucyA9IGZpbmRCYWNrZ3JvdW5kRGVjbGFyYXRpb25zKGJhY2tncm91bmRSdWxlcyksXG4gICAgICAgIGNoYW5nZSA9IGZhbHNlO1xuXG4gICAgYmFja2dyb3VuZERlY2xhcmF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChkZWNsYXJhdGlvbikge1xuICAgICAgICB2YXIgcGFyc2VkQmFja2dyb3VuZCA9IGJhY2tncm91bmRWYWx1ZVBhcnNlci5wYXJzZShkZWNsYXJhdGlvbi52YWx1ZSksXG4gICAgICAgICAgICBleHRlcm5hbEJhY2tncm91bmRJbmRpY2VzID0gZmluZEV4dGVybmFsQmFja2dyb3VuZFVybHMocGFyc2VkQmFja2dyb3VuZCksXG4gICAgICAgICAgICBiYWNrZ3JvdW5kVmFsdWU7XG5cbiAgICAgICAgaWYgKGV4dGVybmFsQmFja2dyb3VuZEluZGljZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZXh0ZXJuYWxCYWNrZ3JvdW5kSW5kaWNlcy5mb3JFYWNoKGZ1bmN0aW9uIChiYWNrZ3JvdW5kTGF5ZXJJbmRleCkge1xuICAgICAgICAgICAgICAgIHZhciByZWxhdGl2ZVVybCA9IHBhcnNlZEJhY2tncm91bmRbYmFja2dyb3VuZExheWVySW5kZXhdLnVybCxcbiAgICAgICAgICAgICAgICAgICAgdXJsID0gdXRpbC5qb2luVXJsKGJhc2VVcmwsIHJlbGF0aXZlVXJsKTtcbiAgICAgICAgICAgICAgICBwYXJzZWRCYWNrZ3JvdW5kW2JhY2tncm91bmRMYXllckluZGV4XS51cmwgPSB1cmw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYmFja2dyb3VuZFZhbHVlID0gYmFja2dyb3VuZFZhbHVlUGFyc2VyLnNlcmlhbGl6ZShwYXJzZWRCYWNrZ3JvdW5kKTtcblxuICAgICAgICAgICAgdXBkYXRlQ3NzUHJvcGVydHlWYWx1ZShkZWNsYXJhdGlvbi5ydWxlLCBkZWNsYXJhdGlvbi5wcm9wZXJ0eSwgYmFja2dyb3VuZFZhbHVlKTtcblxuICAgICAgICAgICAgY2hhbmdlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGZpbmRGb250RmFjZVJ1bGVzKGNzc1J1bGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgIHZhciBmb250RmFjZVNyY0RlY2xhcmF0aW9uID0gcnVsZS5zdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKFwic3JjXCIpLFxuICAgICAgICAgICAgcGFyc2VkRm9udEZhY2VTb3VyY2VzLCBleHRlcm5hbEZvbnRGYWNlVXJsSW5kaWNlcztcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcGFyc2VkRm9udEZhY2VTb3VyY2VzID0gZm9udEZhY2VTcmNWYWx1ZVBhcnNlci5wYXJzZShmb250RmFjZVNyY0RlY2xhcmF0aW9uKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGV4dGVybmFsRm9udEZhY2VVcmxJbmRpY2VzID0gZmluZEV4dGVybmFsRm9udEZhY2VVcmxzKHBhcnNlZEZvbnRGYWNlU291cmNlcyk7XG5cbiAgICAgICAgaWYgKGV4dGVybmFsRm9udEZhY2VVcmxJbmRpY2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGV4dGVybmFsRm9udEZhY2VVcmxJbmRpY2VzLmZvckVhY2goZnVuY3Rpb24gKGZvbnRGYWNlVXJsSW5kZXgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVsYXRpdmVVcmwgPSBwYXJzZWRGb250RmFjZVNvdXJjZXNbZm9udEZhY2VVcmxJbmRleF0udXJsLFxuICAgICAgICAgICAgICAgICAgICB1cmwgPSB1dGlsLmpvaW5VcmwoYmFzZVVybCwgcmVsYXRpdmVVcmwpO1xuXG4gICAgICAgICAgICAgICAgcGFyc2VkRm9udEZhY2VTb3VyY2VzW2ZvbnRGYWNlVXJsSW5kZXhdLnVybCA9IHVybDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjc3NTdXBwb3J0LmNoYW5nZUZvbnRGYWNlUnVsZVNyYyhjc3NSdWxlcywgcnVsZSwgZm9udEZhY2VTcmNWYWx1ZVBhcnNlci5zZXJpYWxpemUocGFyc2VkRm9udEZhY2VTb3VyY2VzKSk7XG5cbiAgICAgICAgICAgIGNoYW5nZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBmaW5kQ1NTSW1wb3J0UnVsZXMoY3NzUnVsZXMpLmZvckVhY2goZnVuY3Rpb24gKHJ1bGUpIHtcbiAgICAgICAgdmFyIGNzc1VybCA9IHJ1bGUuaHJlZixcbiAgICAgICAgICAgIHVybCA9IHV0aWwuam9pblVybChiYXNlVXJsLCBjc3NVcmwpO1xuXG4gICAgICAgIGNzc1N1cHBvcnQuZXhjaGFuZ2VSdWxlKGNzc1J1bGVzLCBydWxlLCBcIkBpbXBvcnQgdXJsKFwiICsgdXJsICsgXCIpO1wiKTtcblxuICAgICAgICBjaGFuZ2UgPSB0cnVlO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNoYW5nZTtcbn07XG5cbi8qIENTUyBpbXBvcnQgaW5saW5pbmcgKi9cblxudmFyIHN1YnN0aXR1dGVSdWxlID0gZnVuY3Rpb24gKGNzc1J1bGVzLCBydWxlLCBuZXdDc3NSdWxlcykge1xuICAgIHZhciBwb3NpdGlvbiA9IGNzc1J1bGVzLmluZGV4T2YocnVsZSk7XG5cbiAgICBjc3NSdWxlcy5zcGxpY2UocG9zaXRpb24sIDEpO1xuXG4gICAgbmV3Q3NzUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAobmV3UnVsZSwgaSkge1xuICAgICAgICBjc3NSdWxlcy5zcGxpY2UocG9zaXRpb24gKyBpLCAwLCBuZXdSdWxlKTtcbiAgICB9KTtcbn07XG5cbnZhciBmdWxmaWxsZWRQcm9taXNlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGRlZmVyID0gYXllcHJvbWlzZS5kZWZlcigpO1xuICAgIGRlZmVyLnJlc29sdmUodmFsdWUpO1xuICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xufTtcblxudmFyIGxvYWRBbmRJbmxpbmVDU1NJbXBvcnQgPSBmdW5jdGlvbiAoY3NzUnVsZXMsIHJ1bGUsIGFscmVhZHlMb2FkZWRDc3NVcmxzLCBvcHRpb25zKSB7XG4gICAgdmFyIHVybCA9IHJ1bGUuaHJlZixcbiAgICAgICAgY3NzSHJlZlJlbGF0aXZlVG9Eb2M7XG5cbiAgICB1cmwgPSBjc3NTdXBwb3J0LnVucXVvdGVTdHJpbmcodXJsKTtcblxuICAgIGNzc0hyZWZSZWxhdGl2ZVRvRG9jID0gdXRpbC5qb2luVXJsKG9wdGlvbnMuYmFzZVVybCwgdXJsKTtcblxuICAgIGlmIChhbHJlYWR5TG9hZGVkQ3NzVXJscy5pbmRleE9mKGNzc0hyZWZSZWxhdGl2ZVRvRG9jKSA+PSAwKSB7XG4gICAgICAgIC8vIFJlbW92ZSBVUkwgYnkgYWRkaW5nIGVtcHR5IHN0cmluZ1xuICAgICAgICBzdWJzdGl0dXRlUnVsZShjc3NSdWxlcywgcnVsZSwgW10pO1xuICAgICAgICByZXR1cm4gZnVsZmlsbGVkUHJvbWlzZShbXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYWxyZWFkeUxvYWRlZENzc1VybHMucHVzaChjc3NIcmVmUmVsYXRpdmVUb0RvYyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHV0aWwuYWpheCh1cmwsIG9wdGlvbnMpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChjc3NUZXh0KSB7XG4gICAgICAgICAgICB2YXIgZXh0ZXJuYWxDc3NSdWxlcyA9IGNzc1N1cHBvcnQucnVsZXNGb3JDc3NUZXh0KGNzc1RleHQpO1xuXG4gICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBmb2xsb3cgQGltcG9ydCBzdGF0ZW1lbnRzXG4gICAgICAgICAgICByZXR1cm4gZXhwb3J0cy5sb2FkQ1NTSW1wb3J0c0ZvclJ1bGVzKGV4dGVybmFsQ3NzUnVsZXMsIGFscmVhZHlMb2FkZWRDc3NVcmxzLCBvcHRpb25zKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwb3J0cy5hZGp1c3RQYXRoc09mQ3NzUmVzb3VyY2VzKHVybCwgZXh0ZXJuYWxDc3NSdWxlcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgc3Vic3RpdHV0ZVJ1bGUoY3NzUnVsZXMsIHJ1bGUsIGV4dGVybmFsQ3NzUnVsZXMpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQuZXJyb3JzO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhyb3cge1xuICAgICAgICAgICAgICAgIHJlc291cmNlVHlwZTogXCJzdHlsZXNoZWV0XCIsXG4gICAgICAgICAgICAgICAgdXJsOiBlLnVybCxcbiAgICAgICAgICAgICAgICBtc2c6IFwiVW5hYmxlIHRvIGxvYWQgc3R5bGVzaGVldCBcIiArIGUudXJsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbn07XG5cbmV4cG9ydHMubG9hZENTU0ltcG9ydHNGb3JSdWxlcyA9IGZ1bmN0aW9uIChjc3NSdWxlcywgYWxyZWFkeUxvYWRlZENzc1VybHMsIG9wdGlvbnMpIHtcbiAgICB2YXIgcnVsZXNUb0lubGluZSA9IGZpbmRDU1NJbXBvcnRSdWxlcyhjc3NSdWxlcyksXG4gICAgICAgIGVycm9ycyA9IFtdLFxuICAgICAgICBoYXNDaGFuZ2VzID0gZmFsc2U7XG5cbiAgICByZXR1cm4gdXRpbC5hbGwocnVsZXNUb0lubGluZS5tYXAoZnVuY3Rpb24gKHJ1bGUpIHtcbiAgICAgICAgcmV0dXJuIGxvYWRBbmRJbmxpbmVDU1NJbXBvcnQoY3NzUnVsZXMsIHJ1bGUsIGFscmVhZHlMb2FkZWRDc3NVcmxzLCBvcHRpb25zKS50aGVuKGZ1bmN0aW9uIChtb3JlRXJyb3JzKSB7XG4gICAgICAgICAgICBlcnJvcnMgPSBlcnJvcnMuY29uY2F0KG1vcmVFcnJvcnMpO1xuXG4gICAgICAgICAgICBoYXNDaGFuZ2VzID0gdHJ1ZTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKGUpO1xuICAgICAgICB9KTtcbiAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoYXNDaGFuZ2VzOiBoYXNDaGFuZ2VzLFxuICAgICAgICAgICAgZXJyb3JzOiBlcnJvcnNcbiAgICAgICAgfTtcbiAgICB9KTtcbn07XG5cbi8qIENTUyBsaW5rZWQgcmVzb3VyY2UgaW5saW5pbmcgKi9cblxudmFyIGxvYWRBbmRJbmxpbmVCYWNrZ3JvdW5kSW1hZ2VzID0gZnVuY3Rpb24gKGJhY2tncm91bmRWYWx1ZSwgb3B0aW9ucykge1xuICAgIHZhciBwYXJzZWRCYWNrZ3JvdW5kID0gYmFja2dyb3VuZFZhbHVlUGFyc2VyLnBhcnNlKGJhY2tncm91bmRWYWx1ZSksXG4gICAgICAgIGV4dGVybmFsQmFja2dyb3VuZExheWVySW5kaWNlcyA9IGZpbmRFeHRlcm5hbEJhY2tncm91bmRVcmxzKHBhcnNlZEJhY2tncm91bmQpLFxuICAgICAgICBoYXNDaGFuZ2VzID0gZmFsc2U7XG5cbiAgICByZXR1cm4gdXRpbC5jb2xsZWN0QW5kUmVwb3J0RXJyb3JzKGV4dGVybmFsQmFja2dyb3VuZExheWVySW5kaWNlcy5tYXAoZnVuY3Rpb24gKGJhY2tncm91bmRMYXllckluZGV4KSB7XG4gICAgICAgIHZhciB1cmwgPSBwYXJzZWRCYWNrZ3JvdW5kW2JhY2tncm91bmRMYXllckluZGV4XS51cmw7XG5cbiAgICAgICAgcmV0dXJuIHV0aWwuZ2V0RGF0YVVSSUZvckltYWdlVVJMKHVybCwgb3B0aW9ucylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhVVJJKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkQmFja2dyb3VuZFtiYWNrZ3JvdW5kTGF5ZXJJbmRleF0udXJsID0gZGF0YVVSSTtcblxuICAgICAgICAgICAgICAgIGhhc0NoYW5nZXMgPSB0cnVlO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB7XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlVHlwZTogXCJiYWNrZ3JvdW5kSW1hZ2VcIixcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlLnVybCxcbiAgICAgICAgICAgICAgICAgICAgbXNnOiBcIlVuYWJsZSB0byBsb2FkIGJhY2tncm91bmQtaW1hZ2UgXCIgKyBlLnVybFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICB9KSkudGhlbihmdW5jdGlvbiAoZXJyb3JzKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kVmFsdWU6IGJhY2tncm91bmRWYWx1ZVBhcnNlci5zZXJpYWxpemUocGFyc2VkQmFja2dyb3VuZCksXG4gICAgICAgICAgICBoYXNDaGFuZ2VzOiBoYXNDaGFuZ2VzLFxuICAgICAgICAgICAgZXJyb3JzOiBlcnJvcnNcbiAgICAgICAgfTtcbiAgICB9KTtcbn07XG5cbnZhciBpdGVyYXRlT3ZlclJ1bGVzQW5kSW5saW5lQmFja2dyb3VuZEltYWdlcyA9IGZ1bmN0aW9uIChjc3NSdWxlcywgb3B0aW9ucykge1xuICAgIHZhciBydWxlc1RvSW5saW5lID0gZmluZEJhY2tncm91bmRJbWFnZVJ1bGVzKGNzc1J1bGVzKSxcbiAgICAgICAgYmFja2dyb3VuZERlY2xhcmF0aW9ucyA9IGZpbmRCYWNrZ3JvdW5kRGVjbGFyYXRpb25zKHJ1bGVzVG9JbmxpbmUpLFxuICAgICAgICBlcnJvcnMgPSBbXSxcbiAgICAgICAgY3NzSGFzQ2hhbmdlcyA9IGZhbHNlO1xuXG4gICAgcmV0dXJuIHV0aWwuYWxsKGJhY2tncm91bmREZWNsYXJhdGlvbnMubWFwKGZ1bmN0aW9uIChkZWNsYXJhdGlvbikge1xuICAgICAgICByZXR1cm4gbG9hZEFuZElubGluZUJhY2tncm91bmRJbWFnZXMoZGVjbGFyYXRpb24udmFsdWUsIG9wdGlvbnMpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5oYXNDaGFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUNzc1Byb3BlcnR5VmFsdWUoZGVjbGFyYXRpb24ucnVsZSwgZGVjbGFyYXRpb24ucHJvcGVydHksIHJlc3VsdC5iYWNrZ3JvdW5kVmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNzc0hhc0NoYW5nZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGVycm9ycyA9IGVycm9ycy5jb25jYXQocmVzdWx0LmVycm9ycyk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoYXNDaGFuZ2VzOiBjc3NIYXNDaGFuZ2VzLFxuICAgICAgICAgICAgZXJyb3JzOiBlcnJvcnNcbiAgICAgICAgfTtcbiAgICB9KTtcbn07XG5cbnZhciBsb2FkQW5kSW5saW5lRm9udEZhY2UgPSBmdW5jdGlvbiAoc3JjRGVjbGFyYXRpb25WYWx1ZSwgb3B0aW9ucykge1xuICAgIHZhciBoYXNDaGFuZ2VzID0gZmFsc2UsXG4gICAgICAgIHBhcnNlZEZvbnRGYWNlU291cmNlcywgZXh0ZXJuYWxGb250RmFjZVVybEluZGljZXM7XG5cbiAgICB0cnkge1xuICAgICAgICBwYXJzZWRGb250RmFjZVNvdXJjZXMgPSBmb250RmFjZVNyY1ZhbHVlUGFyc2VyLnBhcnNlKHNyY0RlY2xhcmF0aW9uVmFsdWUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcGFyc2VkRm9udEZhY2VTb3VyY2VzID0gW107XG4gICAgfVxuICAgIGV4dGVybmFsRm9udEZhY2VVcmxJbmRpY2VzID0gZmluZEV4dGVybmFsRm9udEZhY2VVcmxzKHBhcnNlZEZvbnRGYWNlU291cmNlcyk7XG5cbiAgICByZXR1cm4gdXRpbC5jb2xsZWN0QW5kUmVwb3J0RXJyb3JzKGV4dGVybmFsRm9udEZhY2VVcmxJbmRpY2VzLm1hcChmdW5jdGlvbiAodXJsSW5kZXgpIHtcbiAgICAgICAgdmFyIGZvbnRTcmMgPSBwYXJzZWRGb250RmFjZVNvdXJjZXNbdXJsSW5kZXhdLFxuICAgICAgICAgICAgZm9ybWF0ID0gZm9udFNyYy5mb3JtYXQgfHwgXCJ3b2ZmXCI7XG5cbiAgICAgICAgcmV0dXJuIHV0aWwuYmluYXJ5QWpheChmb250U3JjLnVybCwgb3B0aW9ucylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIGJhc2U2NENvbnRlbnQgPSBidG9hKGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIGZvbnRTcmMudXJsID0gJ2RhdGE6Zm9udC8nICsgZm9ybWF0ICsgJztiYXNlNjQsJyArIGJhc2U2NENvbnRlbnQ7XG5cbiAgICAgICAgICAgICAgICBoYXNDaGFuZ2VzID0gdHJ1ZTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cge1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZVR5cGU6IFwiZm9udEZhY2VcIixcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBlLnVybCxcbiAgICAgICAgICAgICAgICAgICAgbXNnOiBcIlVuYWJsZSB0byBsb2FkIGZvbnQtZmFjZSBcIiArIGUudXJsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pKS50aGVuKGZ1bmN0aW9uIChlcnJvcnMpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNyY0RlY2xhcmF0aW9uVmFsdWU6IGZvbnRGYWNlU3JjVmFsdWVQYXJzZXIuc2VyaWFsaXplKHBhcnNlZEZvbnRGYWNlU291cmNlcyksXG4gICAgICAgICAgICBoYXNDaGFuZ2VzOiBoYXNDaGFuZ2VzLFxuICAgICAgICAgICAgZXJyb3JzOiBlcnJvcnNcbiAgICAgICAgfTtcbiAgICB9KTtcbn07XG5cbnZhciBpdGVyYXRlT3ZlclJ1bGVzQW5kSW5saW5lRm9udEZhY2UgPSBmdW5jdGlvbiAoY3NzUnVsZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgcnVsZXNUb0lubGluZSA9IGZpbmRGb250RmFjZVJ1bGVzKGNzc1J1bGVzKSxcbiAgICAgICAgZXJyb3JzID0gW10sXG4gICAgICAgIGhhc0NoYW5nZXMgPSBmYWxzZTtcblxuICAgIHJldHVybiB1dGlsLmFsbChydWxlc1RvSW5saW5lLm1hcChmdW5jdGlvbiAocnVsZSkge1xuICAgICAgICB2YXIgc3JjRGVjbGFyYXRpb25WYWx1ZSA9IHJ1bGUuc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShcInNyY1wiKTtcblxuICAgICAgICByZXR1cm4gbG9hZEFuZElubGluZUZvbnRGYWNlKHNyY0RlY2xhcmF0aW9uVmFsdWUsIG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5oYXNDaGFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgY3NzU3VwcG9ydC5jaGFuZ2VGb250RmFjZVJ1bGVTcmMoY3NzUnVsZXMsIHJ1bGUsIHJlc3VsdC5zcmNEZWNsYXJhdGlvblZhbHVlKTtcblxuICAgICAgICAgICAgICAgIGhhc0NoYW5nZXMgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlcnJvcnMgPSBlcnJvcnMuY29uY2F0KHJlc3VsdC5lcnJvcnMpO1xuICAgICAgICB9KTtcbiAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoYXNDaGFuZ2VzOiBoYXNDaGFuZ2VzLFxuICAgICAgICAgICAgZXJyb3JzOiBlcnJvcnNcbiAgICAgICAgfTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydHMubG9hZEFuZElubGluZUNTU1Jlc291cmNlc0ZvclJ1bGVzID0gZnVuY3Rpb24gKGNzc1J1bGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIGhhc0NoYW5nZXMgPSBmYWxzZSxcbiAgICAgICAgZXJyb3JzID0gW107XG5cbiAgICByZXR1cm4gdXRpbC5hbGwoW2l0ZXJhdGVPdmVyUnVsZXNBbmRJbmxpbmVCYWNrZ3JvdW5kSW1hZ2VzLCBpdGVyYXRlT3ZlclJ1bGVzQW5kSW5saW5lRm9udEZhY2VdLm1hcChmdW5jdGlvbiAoZnVuYykge1xuICAgICAgICByZXR1cm4gZnVuYyhjc3NSdWxlcywgb3B0aW9ucylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBoYXNDaGFuZ2VzID0gaGFzQ2hhbmdlcyB8fCByZXN1bHQuaGFzQ2hhbmdlcztcbiAgICAgICAgICAgICAgICBlcnJvcnMgPSBlcnJvcnMuY29uY2F0KHJlc3VsdC5lcnJvcnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgfSkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGFzQ2hhbmdlczogaGFzQ2hhbmdlcyxcbiAgICAgICAgICAgIGVycm9yczogZXJyb3JzXG4gICAgICAgIH07XG4gICAgfSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cblxudmFyIGVuY29kZUltYWdlQXNEYXRhVVJJID0gZnVuY3Rpb24gKGltYWdlLCBvcHRpb25zKSB7XG4gICAgdmFyIHVybCA9IGltYWdlLmF0dHJpYnV0ZXMuc3JjID8gaW1hZ2UuYXR0cmlidXRlcy5zcmMubm9kZVZhbHVlIDogbnVsbCxcbiAgICAgICAgZG9jdW1lbnRCYXNlID0gdXRpbC5nZXREb2N1bWVudEJhc2VVcmwoaW1hZ2Uub3duZXJEb2N1bWVudCksXG4gICAgICAgIGFqYXhPcHRpb25zID0gdXRpbC5jbG9uZShvcHRpb25zKTtcblxuICAgIGlmICghYWpheE9wdGlvbnMuYmFzZVVybCAmJiBkb2N1bWVudEJhc2UpIHtcbiAgICAgICAgYWpheE9wdGlvbnMuYmFzZVVybCA9IGRvY3VtZW50QmFzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdXRpbC5nZXREYXRhVVJJRm9ySW1hZ2VVUkwodXJsLCBhamF4T3B0aW9ucylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGRhdGFVUkkpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJJO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhyb3cge1xuICAgICAgICAgICAgICAgIHJlc291cmNlVHlwZTogXCJpbWFnZVwiLFxuICAgICAgICAgICAgICAgIHVybDogZS51cmwsXG4gICAgICAgICAgICAgICAgbXNnOiBcIlVuYWJsZSB0byBsb2FkIGltYWdlIFwiICsgZS51cmxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xufTtcblxudmFyIGZpbHRlckV4dGVybmFsSW1hZ2VzID0gZnVuY3Rpb24gKGltYWdlcykge1xuICAgIHJldHVybiBpbWFnZXMuZmlsdGVyKGZ1bmN0aW9uIChpbWFnZSkge1xuICAgICAgICB2YXIgdXJsID0gaW1hZ2UuYXR0cmlidXRlcy5zcmMgPyBpbWFnZS5hdHRyaWJ1dGVzLnNyYy5ub2RlVmFsdWUgOiBudWxsO1xuXG4gICAgICAgIHJldHVybiB1cmwgIT09IG51bGwgJiYgIXV0aWwuaXNEYXRhVXJpKHVybCk7XG4gICAgfSk7XG59O1xuXG52YXIgZmlsdGVySW5wdXRzRm9ySW1hZ2VUeXBlID0gZnVuY3Rpb24gKGlucHV0cykge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuZmlsdGVyLmNhbGwoaW5wdXRzLCBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIGlucHV0LnR5cGUgPT09IFwiaW1hZ2VcIjtcbiAgICB9KTtcbn07XG5cbnZhciB0b0FycmF5ID0gZnVuY3Rpb24gKGFycmF5TGlrZSkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnJheUxpa2UpO1xufTtcblxuZXhwb3J0cy5pbmxpbmUgPSBmdW5jdGlvbiAoZG9jLCBvcHRpb25zKSB7XG4gICAgdmFyIGltYWdlcyA9IHRvQXJyYXkoZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW1nXCIpKSxcbiAgICAgICAgaW1hZ2VJbnB1dHMgPSBmaWx0ZXJJbnB1dHNGb3JJbWFnZVR5cGUoZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5wdXRcIikpLFxuICAgICAgICBleHRlcm5hbEltYWdlcyA9IGZpbHRlckV4dGVybmFsSW1hZ2VzKGltYWdlcy5jb25jYXQoaW1hZ2VJbnB1dHMpKTtcblxuICAgIHJldHVybiB1dGlsLmNvbGxlY3RBbmRSZXBvcnRFcnJvcnMoZXh0ZXJuYWxJbWFnZXMubWFwKGZ1bmN0aW9uIChpbWFnZSkge1xuICAgICAgICByZXR1cm4gZW5jb2RlSW1hZ2VBc0RhdGFVUkkoaW1hZ2UsIG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24gKGRhdGFVUkkpIHtcbiAgICAgICAgICAgIGltYWdlLmF0dHJpYnV0ZXMuc3JjLm5vZGVWYWx1ZSA9IGRhdGFVUkk7XG4gICAgICAgIH0pO1xuICAgIH0pKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuXG52YXIgbG9hZExpbmtlZFNjcmlwdCA9IGZ1bmN0aW9uIChzY3JpcHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgc3JjID0gc2NyaXB0LmF0dHJpYnV0ZXMuc3JjLm5vZGVWYWx1ZSxcbiAgICAgICAgZG9jdW1lbnRCYXNlID0gdXRpbC5nZXREb2N1bWVudEJhc2VVcmwoc2NyaXB0Lm93bmVyRG9jdW1lbnQpLFxuICAgICAgICBhamF4T3B0aW9ucyA9IHV0aWwuY2xvbmUob3B0aW9ucyk7XG5cbiAgICBpZiAoIWFqYXhPcHRpb25zLmJhc2VVcmwgJiYgZG9jdW1lbnRCYXNlKSB7XG4gICAgICAgIGFqYXhPcHRpb25zLmJhc2VVcmwgPSBkb2N1bWVudEJhc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHV0aWwuYWpheChzcmMsIGFqYXhPcHRpb25zKVxuICAgICAgICAuZmFpbChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhyb3cge1xuICAgICAgICAgICAgICAgIHJlc291cmNlVHlwZTogXCJzY3JpcHRcIixcbiAgICAgICAgICAgICAgICB1cmw6IGUudXJsLFxuICAgICAgICAgICAgICAgIG1zZzogXCJVbmFibGUgdG8gbG9hZCBzY3JpcHQgXCIgKyBlLnVybFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG59O1xuXG52YXIgZXNjYXBlQ2xvc2luZ1RhZ3MgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvOTI0NjM4Mi9lc2NhcGluZy1zY3JpcHQtdGFnLWluc2lkZS1qYXZhc2NyaXB0XG4gICAgcmV0dXJuIHRleHQucmVwbGFjZSgvPFxcLy9nLCAnPFxcXFwvJyk7XG59O1xuXG52YXIgc3Vic3RpdHV0ZUV4dGVybmFsU2NyaXB0V2l0aElubGluZSA9IGZ1bmN0aW9uIChzY3JpcHROb2RlLCBqc0NvZGUpIHtcbiAgICBzY3JpcHROb2RlLmF0dHJpYnV0ZXMucmVtb3ZlTmFtZWRJdGVtKCdzcmMnKTtcbiAgICBzY3JpcHROb2RlLnRleHRDb250ZW50ID0gZXNjYXBlQ2xvc2luZ1RhZ3MoanNDb2RlKTtcbn07XG5cbnZhciBnZXRTY3JpcHRzID0gZnVuY3Rpb24gKGRvYykge1xuICAgIHZhciBzY3JpcHRzID0gZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic2NyaXB0XCIpO1xuXG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5maWx0ZXIuY2FsbChzY3JpcHRzLCBmdW5jdGlvbiAoc2NyaXB0KSB7XG4gICAgICAgIHJldHVybiAhIXNjcmlwdC5hdHRyaWJ1dGVzLnNyYztcbiAgICB9KTtcbn07XG5cbmV4cG9ydHMuaW5saW5lID0gZnVuY3Rpb24gKGRvYywgb3B0aW9ucykge1xuICAgIHZhciBzY3JpcHRzID0gZ2V0U2NyaXB0cyhkb2MpO1xuXG4gICAgcmV0dXJuIHV0aWwuY29sbGVjdEFuZFJlcG9ydEVycm9ycyhzY3JpcHRzLm1hcChmdW5jdGlvbiAoc2NyaXB0KSB7XG4gICAgICAgIHJldHVybiBsb2FkTGlua2VkU2NyaXB0KHNjcmlwdCwgb3B0aW9ucykudGhlbihmdW5jdGlvbiAoanNDb2RlKSB7XG4gICAgICAgICAgICBzdWJzdGl0dXRlRXh0ZXJuYWxTY3JpcHRXaXRoSW5saW5lKHNjcmlwdCwganNDb2RlKTtcbiAgICAgICAgfSk7XG4gICAgfSkpO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdXJsID0gcmVxdWlyZSgndXJsJyksXG4gICAgYXllcHJvbWlzZSA9IHJlcXVpcmUoJ2F5ZXByb21pc2UnKTtcblxuXG5leHBvcnRzLmdldERvY3VtZW50QmFzZVVybCA9IGZ1bmN0aW9uIChkb2MpIHtcbiAgICBpZiAoZG9jLmJhc2VVUkkgIT09ICdhYm91dDpibGFuaycpIHtcbiAgICAgICAgcmV0dXJuIGRvYy5iYXNlVVJJO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xufTtcblxuZXhwb3J0cy5jbG9uZSA9IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICB2YXIgdGhlQ2xvbmUgPSB7fSxcbiAgICAgICAgaTtcbiAgICBmb3IgKGkgaW4gb2JqZWN0KSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgdGhlQ2xvbmVbaV0gPSBvYmplY3RbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoZUNsb25lO1xufTtcblxuZXhwb3J0cy5jbG9uZUFycmF5ID0gZnVuY3Rpb24gKG5vZGVMaXN0KSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5hcHBseShub2RlTGlzdCwgWzBdKTtcbn07XG5cbmV4cG9ydHMuam9pblVybCA9IGZ1bmN0aW9uIChiYXNlVXJsLCByZWxVcmwpIHtcbiAgICBpZiAoIWJhc2VVcmwpIHtcbiAgICAgICAgcmV0dXJuIHJlbFVybDtcbiAgICB9XG4gICAgcmV0dXJuIHVybC5yZXNvbHZlKGJhc2VVcmwsIHJlbFVybCk7XG59O1xuXG5leHBvcnRzLmlzRGF0YVVyaSA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgICByZXR1cm4gKC9eZGF0YTovKS50ZXN0KHVybCk7XG59O1xuXG5leHBvcnRzLmFsbCA9IGZ1bmN0aW9uIChwcm9taXNlcykge1xuICAgIHZhciBkZWZlciA9IGF5ZXByb21pc2UuZGVmZXIoKSxcbiAgICAgICAgcGVuZGluZ1Byb21pc2VDb3VudCA9IHByb21pc2VzLmxlbmd0aCxcbiAgICAgICAgcmVzb2x2ZWRWYWx1ZXMgPSBbXTtcblxuICAgIGlmIChwcm9taXNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZGVmZXIucmVzb2x2ZShbXSk7XG4gICAgICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xuICAgIH1cblxuICAgIHByb21pc2VzLmZvckVhY2goZnVuY3Rpb24gKHByb21pc2UsIGlkeCkge1xuICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBwZW5kaW5nUHJvbWlzZUNvdW50IC09IDE7XG4gICAgICAgICAgICByZXNvbHZlZFZhbHVlc1tpZHhdID0gdmFsdWU7XG5cbiAgICAgICAgICAgIGlmIChwZW5kaW5nUHJvbWlzZUNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZGVmZXIucmVzb2x2ZShyZXNvbHZlZFZhbHVlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBkZWZlci5yZWplY3QoZSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xufTtcblxuZXhwb3J0cy5jb2xsZWN0QW5kUmVwb3J0RXJyb3JzID0gZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgdmFyIGVycm9ycyA9IFtdO1xuXG4gICAgcmV0dXJuIGV4cG9ydHMuYWxsKHByb21pc2VzLm1hcChmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS5mYWlsKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChlKTtcbiAgICAgICAgfSk7XG4gICAgfSkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZXJyb3JzO1xuICAgIH0pO1xufTtcblxudmFyIGxhc3RDYWNoZURhdGUgPSBudWxsO1xuXG52YXIgZ2V0VW5jYWNoYWJsZVVSTCA9IGZ1bmN0aW9uICh1cmwsIGNhY2hlKSB7XG4gICAgaWYgKGNhY2hlID09PSBmYWxzZSB8fCBjYWNoZSA9PT0gJ25vbmUnIHx8IGNhY2hlID09PSAncmVwZWF0ZWQnKSB7XG4gICAgICAgIGlmIChsYXN0Q2FjaGVEYXRlID09PSBudWxsIHx8IGNhY2hlICE9PSAncmVwZWF0ZWQnKSB7XG4gICAgICAgICAgICBsYXN0Q2FjaGVEYXRlID0gRGF0ZS5ub3coKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsICsgXCI/Xz1cIiArIGxhc3RDYWNoZURhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG59O1xuXG5leHBvcnRzLmFqYXggPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gICAgdmFyIGFqYXhSZXF1ZXN0ID0gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpLFxuICAgICAgICBkZWZlciA9IGF5ZXByb21pc2UuZGVmZXIoKSxcbiAgICAgICAgam9pbmVkVXJsID0gZXhwb3J0cy5qb2luVXJsKG9wdGlvbnMuYmFzZVVybCwgdXJsKSxcbiAgICAgICAgYXVnbWVudGVkVXJsO1xuXG4gICAgdmFyIGRvUmVqZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBkZWZlci5yZWplY3Qoe1xuICAgICAgICAgICAgbXNnOiAnVW5hYmxlIHRvIGxvYWQgdXJsJyxcbiAgICAgICAgICAgIHVybDogam9pbmVkVXJsXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhdWdtZW50ZWRVcmwgPSBnZXRVbmNhY2hhYmxlVVJMKGpvaW5lZFVybCwgb3B0aW9ucy5jYWNoZSk7XG5cbiAgICBhamF4UmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChhamF4UmVxdWVzdC5zdGF0dXMgPT09IDIwMCB8fCBhamF4UmVxdWVzdC5zdGF0dXMgPT09IDApIHtcbiAgICAgICAgICAgIGRlZmVyLnJlc29sdmUoYWpheFJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9SZWplY3QoKTtcbiAgICAgICAgfVxuICAgIH0sIGZhbHNlKTtcblxuICAgIGFqYXhSZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBkb1JlamVjdCwgZmFsc2UpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgYWpheFJlcXVlc3Qub3BlbignR0VUJywgYXVnbWVudGVkVXJsLCB0cnVlKTtcbiAgICAgICAgYWpheFJlcXVlc3Qub3ZlcnJpZGVNaW1lVHlwZShvcHRpb25zLm1pbWVUeXBlKTtcbiAgICAgICAgYWpheFJlcXVlc3Quc2VuZChudWxsKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGRvUmVqZWN0KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVyLnByb21pc2U7XG59O1xuXG5leHBvcnRzLmJpbmFyeUFqYXggPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gICAgdmFyIGFqYXhPcHRpb25zID0gZXhwb3J0cy5jbG9uZShvcHRpb25zKTtcblxuICAgIGFqYXhPcHRpb25zLm1pbWVUeXBlID0gJ3RleHQvcGxhaW47IGNoYXJzZXQ9eC11c2VyLWRlZmluZWQnO1xuXG4gICAgcmV0dXJuIGV4cG9ydHMuYWpheCh1cmwsIGFqYXhPcHRpb25zKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoY29udGVudCkge1xuICAgICAgICAgICAgdmFyIGJpbmFyeUNvbnRlbnQgPSBcIlwiO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnRlbnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBiaW5hcnlDb250ZW50ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29udGVudC5jaGFyQ29kZUF0KGkpICYgMHhGRik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBiaW5hcnlDb250ZW50O1xuICAgICAgICB9KTtcbn07XG5cbnZhciBkZXRlY3RNaW1lVHlwZSA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gICAgdmFyIHN0YXJ0c1dpdGggPSBmdW5jdGlvbiAoc3RyaW5nLCBzdWJzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHN0cmluZy5zdWJzdHJpbmcoMCwgc3Vic3RyaW5nLmxlbmd0aCkgPT09IHN1YnN0cmluZztcbiAgICB9O1xuXG4gICAgaWYgKHN0YXJ0c1dpdGgoY29udGVudCwgJzw/eG1sJykgfHwgc3RhcnRzV2l0aChjb250ZW50LCAnPHN2ZycpKSB7XG4gICAgICAgIHJldHVybiAnaW1hZ2Uvc3ZnK3htbCc7XG4gICAgfVxuICAgIHJldHVybiAnaW1hZ2UvcG5nJztcbn07XG5cbmV4cG9ydHMuZ2V0RGF0YVVSSUZvckltYWdlVVJMID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICAgIHJldHVybiBleHBvcnRzLmJpbmFyeUFqYXgodXJsLCBvcHRpb25zKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoY29udGVudCkge1xuICAgICAgICAgICAgdmFyIGJhc2U2NENvbnRlbnQgPSBidG9hKGNvbnRlbnQpLFxuICAgICAgICAgICAgICAgIG1pbWVUeXBlID0gZGV0ZWN0TWltZVR5cGUoY29udGVudCk7XG5cbiAgICAgICAgICAgIHJldHVybiAnZGF0YTonICsgbWltZVR5cGUgKyAnO2Jhc2U2NCwnICsgYmFzZTY0Q29udGVudDtcbiAgICAgICAgfSk7XG59O1xuXG52YXIgdW5pcXVlSWRMaXN0ID0gW107XG5cbnZhciBjb25zdGFudFVuaXF1ZUlkRm9yID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAvLyBIQUNLLCB1c2luZyBhIGxpc3QgcmVzdWx0cyBpbiBPKG4pLCBidXQgaG93IGRvIHdlIGhhc2ggYSBmdW5jdGlvbj9cbiAgICBpZiAodW5pcXVlSWRMaXN0LmluZGV4T2YoZWxlbWVudCkgPCAwKSB7XG4gICAgICAgIHVuaXF1ZUlkTGlzdC5wdXNoKGVsZW1lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gdW5pcXVlSWRMaXN0LmluZGV4T2YoZWxlbWVudCk7XG59O1xuXG5leHBvcnRzLm1lbW9pemUgPSBmdW5jdGlvbiAoZnVuYywgaGFzaGVyLCBtZW1vKSB7XG4gICAgaWYgKHR5cGVvZiBtZW1vICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImNhY2hlQnVja2V0IGlzIG5vdCBhbiBvYmplY3RcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgICAgIHZhciBhcmd1bWVudEhhc2ggPSBoYXNoZXIoYXJncyksXG4gICAgICAgICAgICBmdW5jSGFzaCA9IGNvbnN0YW50VW5pcXVlSWRGb3IoZnVuYyksXG4gICAgICAgICAgICByZXRWYWx1ZTtcblxuICAgICAgICBpZiAobWVtb1tmdW5jSGFzaF0gJiYgbWVtb1tmdW5jSGFzaF1bYXJndW1lbnRIYXNoXSkge1xuICAgICAgICAgICAgcmV0dXJuIG1lbW9bZnVuY0hhc2hdW2FyZ3VtZW50SGFzaF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXRWYWx1ZSA9IGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7XG5cbiAgICAgICAgICAgIG1lbW9bZnVuY0hhc2hdID0gbWVtb1tmdW5jSGFzaF0gfHwge307XG4gICAgICAgICAgICBtZW1vW2Z1bmNIYXNoXVthcmd1bWVudEhhc2hdID0gcmV0VmFsdWU7XG5cbiAgICAgICAgICAgIHJldHVybiByZXRWYWx1ZTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuIiwiLyohIGh0dHBzOi8vbXRocy5iZS9wdW55Y29kZSB2MS4zLjIgYnkgQG1hdGhpYXMgKi9cbjsoZnVuY3Rpb24ocm9vdCkge1xuXG5cdC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZXMgKi9cblx0dmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cyAmJlxuXHRcdCFleHBvcnRzLm5vZGVUeXBlICYmIGV4cG9ydHM7XG5cdHZhciBmcmVlTW9kdWxlID0gdHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiZcblx0XHQhbW9kdWxlLm5vZGVUeXBlICYmIG1vZHVsZTtcblx0dmFyIGZyZWVHbG9iYWwgPSB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbDtcblx0aWYgKFxuXHRcdGZyZWVHbG9iYWwuZ2xvYmFsID09PSBmcmVlR2xvYmFsIHx8XG5cdFx0ZnJlZUdsb2JhbC53aW5kb3cgPT09IGZyZWVHbG9iYWwgfHxcblx0XHRmcmVlR2xvYmFsLnNlbGYgPT09IGZyZWVHbG9iYWxcblx0KSB7XG5cdFx0cm9vdCA9IGZyZWVHbG9iYWw7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIGBwdW55Y29kZWAgb2JqZWN0LlxuXHQgKiBAbmFtZSBwdW55Y29kZVxuXHQgKiBAdHlwZSBPYmplY3Rcblx0ICovXG5cdHZhciBwdW55Y29kZSxcblxuXHQvKiogSGlnaGVzdCBwb3NpdGl2ZSBzaWduZWQgMzItYml0IGZsb2F0IHZhbHVlICovXG5cdG1heEludCA9IDIxNDc0ODM2NDcsIC8vIGFrYS4gMHg3RkZGRkZGRiBvciAyXjMxLTFcblxuXHQvKiogQm9vdHN0cmluZyBwYXJhbWV0ZXJzICovXG5cdGJhc2UgPSAzNixcblx0dE1pbiA9IDEsXG5cdHRNYXggPSAyNixcblx0c2tldyA9IDM4LFxuXHRkYW1wID0gNzAwLFxuXHRpbml0aWFsQmlhcyA9IDcyLFxuXHRpbml0aWFsTiA9IDEyOCwgLy8gMHg4MFxuXHRkZWxpbWl0ZXIgPSAnLScsIC8vICdcXHgyRCdcblxuXHQvKiogUmVndWxhciBleHByZXNzaW9ucyAqL1xuXHRyZWdleFB1bnljb2RlID0gL154bi0tLyxcblx0cmVnZXhOb25BU0NJSSA9IC9bXlxceDIwLVxceDdFXS8sIC8vIHVucHJpbnRhYmxlIEFTQ0lJIGNoYXJzICsgbm9uLUFTQ0lJIGNoYXJzXG5cdHJlZ2V4U2VwYXJhdG9ycyA9IC9bXFx4MkVcXHUzMDAyXFx1RkYwRVxcdUZGNjFdL2csIC8vIFJGQyAzNDkwIHNlcGFyYXRvcnNcblxuXHQvKiogRXJyb3IgbWVzc2FnZXMgKi9cblx0ZXJyb3JzID0ge1xuXHRcdCdvdmVyZmxvdyc6ICdPdmVyZmxvdzogaW5wdXQgbmVlZHMgd2lkZXIgaW50ZWdlcnMgdG8gcHJvY2VzcycsXG5cdFx0J25vdC1iYXNpYyc6ICdJbGxlZ2FsIGlucHV0ID49IDB4ODAgKG5vdCBhIGJhc2ljIGNvZGUgcG9pbnQpJyxcblx0XHQnaW52YWxpZC1pbnB1dCc6ICdJbnZhbGlkIGlucHV0J1xuXHR9LFxuXG5cdC8qKiBDb252ZW5pZW5jZSBzaG9ydGN1dHMgKi9cblx0YmFzZU1pbnVzVE1pbiA9IGJhc2UgLSB0TWluLFxuXHRmbG9vciA9IE1hdGguZmxvb3IsXG5cdHN0cmluZ0Zyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUsXG5cblx0LyoqIFRlbXBvcmFyeSB2YXJpYWJsZSAqL1xuXHRrZXk7XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBlcnJvciB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgZXJyb3IgdHlwZS5cblx0ICogQHJldHVybnMge0Vycm9yfSBUaHJvd3MgYSBgUmFuZ2VFcnJvcmAgd2l0aCB0aGUgYXBwbGljYWJsZSBlcnJvciBtZXNzYWdlLlxuXHQgKi9cblx0ZnVuY3Rpb24gZXJyb3IodHlwZSkge1xuXHRcdHRocm93IFJhbmdlRXJyb3IoZXJyb3JzW3R5cGVdKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgYEFycmF5I21hcGAgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5IGFycmF5XG5cdCAqIGl0ZW0uXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgb2YgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcChhcnJheSwgZm4pIHtcblx0XHR2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHRcdHZhciByZXN1bHQgPSBbXTtcblx0XHR3aGlsZSAobGVuZ3RoLS0pIHtcblx0XHRcdHJlc3VsdFtsZW5ndGhdID0gZm4oYXJyYXlbbGVuZ3RoXSk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHQvKipcblx0ICogQSBzaW1wbGUgYEFycmF5I21hcGAtbGlrZSB3cmFwcGVyIHRvIHdvcmsgd2l0aCBkb21haW4gbmFtZSBzdHJpbmdzIG9yIGVtYWlsXG5cdCAqIGFkZHJlc3Nlcy5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUgb3IgZW1haWwgYWRkcmVzcy5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5XG5cdCAqIGNoYXJhY3Rlci5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBzdHJpbmcgb2YgY2hhcmFjdGVycyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2tcblx0ICogZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXBEb21haW4oc3RyaW5nLCBmbikge1xuXHRcdHZhciBwYXJ0cyA9IHN0cmluZy5zcGxpdCgnQCcpO1xuXHRcdHZhciByZXN1bHQgPSAnJztcblx0XHRpZiAocGFydHMubGVuZ3RoID4gMSkge1xuXHRcdFx0Ly8gSW4gZW1haWwgYWRkcmVzc2VzLCBvbmx5IHRoZSBkb21haW4gbmFtZSBzaG91bGQgYmUgcHVueWNvZGVkLiBMZWF2ZVxuXHRcdFx0Ly8gdGhlIGxvY2FsIHBhcnQgKGkuZS4gZXZlcnl0aGluZyB1cCB0byBgQGApIGludGFjdC5cblx0XHRcdHJlc3VsdCA9IHBhcnRzWzBdICsgJ0AnO1xuXHRcdFx0c3RyaW5nID0gcGFydHNbMV07XG5cdFx0fVxuXHRcdC8vIEF2b2lkIGBzcGxpdChyZWdleClgIGZvciBJRTggY29tcGF0aWJpbGl0eS4gU2VlICMxNy5cblx0XHRzdHJpbmcgPSBzdHJpbmcucmVwbGFjZShyZWdleFNlcGFyYXRvcnMsICdcXHgyRScpO1xuXHRcdHZhciBsYWJlbHMgPSBzdHJpbmcuc3BsaXQoJy4nKTtcblx0XHR2YXIgZW5jb2RlZCA9IG1hcChsYWJlbHMsIGZuKS5qb2luKCcuJyk7XG5cdFx0cmV0dXJuIHJlc3VsdCArIGVuY29kZWQ7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1lcmljIGNvZGUgcG9pbnRzIG9mIGVhY2ggVW5pY29kZVxuXHQgKiBjaGFyYWN0ZXIgaW4gdGhlIHN0cmluZy4gV2hpbGUgSmF2YVNjcmlwdCB1c2VzIFVDUy0yIGludGVybmFsbHksXG5cdCAqIHRoaXMgZnVuY3Rpb24gd2lsbCBjb252ZXJ0IGEgcGFpciBvZiBzdXJyb2dhdGUgaGFsdmVzIChlYWNoIG9mIHdoaWNoXG5cdCAqIFVDUy0yIGV4cG9zZXMgYXMgc2VwYXJhdGUgY2hhcmFjdGVycykgaW50byBhIHNpbmdsZSBjb2RlIHBvaW50LFxuXHQgKiBtYXRjaGluZyBVVEYtMTYuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZW5jb2RlYFxuXHQgKiBAc2VlIDxodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZGVjb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgVGhlIFVuaWNvZGUgaW5wdXQgc3RyaW5nIChVQ1MtMikuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gVGhlIG5ldyBhcnJheSBvZiBjb2RlIHBvaW50cy5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJkZWNvZGUoc3RyaW5nKSB7XG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBjb3VudGVyID0gMCxcblx0XHQgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aCxcblx0XHQgICAgdmFsdWUsXG5cdFx0ICAgIGV4dHJhO1xuXHRcdHdoaWxlIChjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHR2YWx1ZSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHRcdC8vIGhpZ2ggc3Vycm9nYXRlLCBhbmQgdGhlcmUgaXMgYSBuZXh0IGNoYXJhY3RlclxuXHRcdFx0XHRleHRyYSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRcdGlmICgoZXh0cmEgJiAweEZDMDApID09IDB4REMwMCkgeyAvLyBsb3cgc3Vycm9nYXRlXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goKCh2YWx1ZSAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNGRikgKyAweDEwMDAwKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyB1bm1hdGNoZWQgc3Vycm9nYXRlOyBvbmx5IGFwcGVuZCB0aGlzIGNvZGUgdW5pdCwgaW4gY2FzZSB0aGUgbmV4dFxuXHRcdFx0XHRcdC8vIGNvZGUgdW5pdCBpcyB0aGUgaGlnaCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpclxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdFx0XHRjb3VudGVyLS07XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgc3RyaW5nIGJhc2VkIG9uIGFuIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZGVjb2RlYFxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBlbmNvZGVcblx0ICogQHBhcmFtIHtBcnJheX0gY29kZVBvaW50cyBUaGUgYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIG5ldyBVbmljb2RlIHN0cmluZyAoVUNTLTIpLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmVuY29kZShhcnJheSkge1xuXHRcdHJldHVybiBtYXAoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHR2YXIgb3V0cHV0ID0gJyc7XG5cdFx0XHRpZiAodmFsdWUgPiAweEZGRkYpIHtcblx0XHRcdFx0dmFsdWUgLT0gMHgxMDAwMDtcblx0XHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMCk7XG5cdFx0XHRcdHZhbHVlID0gMHhEQzAwIHwgdmFsdWUgJiAweDNGRjtcblx0XHRcdH1cblx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUpO1xuXHRcdFx0cmV0dXJuIG91dHB1dDtcblx0XHR9KS5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGJhc2ljIGNvZGUgcG9pbnQgaW50byBhIGRpZ2l0L2ludGVnZXIuXG5cdCAqIEBzZWUgYGRpZ2l0VG9CYXNpYygpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gY29kZVBvaW50IFRoZSBiYXNpYyBudW1lcmljIGNvZGUgcG9pbnQgdmFsdWUuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludCAoZm9yIHVzZSBpblxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGluIHRoZSByYW5nZSBgMGAgdG8gYGJhc2UgLSAxYCwgb3IgYGJhc2VgIGlmXG5cdCAqIHRoZSBjb2RlIHBvaW50IGRvZXMgbm90IHJlcHJlc2VudCBhIHZhbHVlLlxuXHQgKi9cblx0ZnVuY3Rpb24gYmFzaWNUb0RpZ2l0KGNvZGVQb2ludCkge1xuXHRcdGlmIChjb2RlUG9pbnQgLSA0OCA8IDEwKSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gMjI7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA2NSA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gNjU7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA5NyA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gOTc7XG5cdFx0fVxuXHRcdHJldHVybiBiYXNlO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgZGlnaXQvaW50ZWdlciBpbnRvIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHNlZSBgYmFzaWNUb0RpZ2l0KClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBkaWdpdCBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBiYXNpYyBjb2RlIHBvaW50IHdob3NlIHZhbHVlICh3aGVuIHVzZWQgZm9yXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaXMgYGRpZ2l0YCwgd2hpY2ggbmVlZHMgdG8gYmUgaW4gdGhlIHJhbmdlXG5cdCAqIGAwYCB0byBgYmFzZSAtIDFgLiBJZiBgZmxhZ2AgaXMgbm9uLXplcm8sIHRoZSB1cHBlcmNhc2UgZm9ybSBpc1xuXHQgKiB1c2VkOyBlbHNlLCB0aGUgbG93ZXJjYXNlIGZvcm0gaXMgdXNlZC4gVGhlIGJlaGF2aW9yIGlzIHVuZGVmaW5lZFxuXHQgKiBpZiBgZmxhZ2AgaXMgbm9uLXplcm8gYW5kIGBkaWdpdGAgaGFzIG5vIHVwcGVyY2FzZSBmb3JtLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGlnaXRUb0Jhc2ljKGRpZ2l0LCBmbGFnKSB7XG5cdFx0Ly8gIDAuLjI1IG1hcCB0byBBU0NJSSBhLi56IG9yIEEuLlpcblx0XHQvLyAyNi4uMzUgbWFwIHRvIEFTQ0lJIDAuLjlcblx0XHRyZXR1cm4gZGlnaXQgKyAyMiArIDc1ICogKGRpZ2l0IDwgMjYpIC0gKChmbGFnICE9IDApIDw8IDUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEJpYXMgYWRhcHRhdGlvbiBmdW5jdGlvbiBhcyBwZXIgc2VjdGlvbiAzLjQgb2YgUkZDIDM0OTIuXG5cdCAqIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM0OTIjc2VjdGlvbi0zLjRcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIGFkYXB0KGRlbHRhLCBudW1Qb2ludHMsIGZpcnN0VGltZSkge1xuXHRcdHZhciBrID0gMDtcblx0XHRkZWx0YSA9IGZpcnN0VGltZSA/IGZsb29yKGRlbHRhIC8gZGFtcCkgOiBkZWx0YSA+PiAxO1xuXHRcdGRlbHRhICs9IGZsb29yKGRlbHRhIC8gbnVtUG9pbnRzKTtcblx0XHRmb3IgKC8qIG5vIGluaXRpYWxpemF0aW9uICovOyBkZWx0YSA+IGJhc2VNaW51c1RNaW4gKiB0TWF4ID4+IDE7IGsgKz0gYmFzZSkge1xuXHRcdFx0ZGVsdGEgPSBmbG9vcihkZWx0YSAvIGJhc2VNaW51c1RNaW4pO1xuXHRcdH1cblx0XHRyZXR1cm4gZmxvb3IoayArIChiYXNlTWludXNUTWluICsgMSkgKiBkZWx0YSAvIChkZWx0YSArIHNrZXcpKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMgdG8gYSBzdHJpbmcgb2YgVW5pY29kZVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBkZWNvZGUoaW5wdXQpIHtcblx0XHQvLyBEb24ndCB1c2UgVUNTLTJcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHRcdCAgICBvdXQsXG5cdFx0ICAgIGkgPSAwLFxuXHRcdCAgICBuID0gaW5pdGlhbE4sXG5cdFx0ICAgIGJpYXMgPSBpbml0aWFsQmlhcyxcblx0XHQgICAgYmFzaWMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIGluZGV4LFxuXHRcdCAgICBvbGRpLFxuXHRcdCAgICB3LFxuXHRcdCAgICBrLFxuXHRcdCAgICBkaWdpdCxcblx0XHQgICAgdCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGJhc2VNaW51c1Q7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzOiBsZXQgYGJhc2ljYCBiZSB0aGUgbnVtYmVyIG9mIGlucHV0IGNvZGVcblx0XHQvLyBwb2ludHMgYmVmb3JlIHRoZSBsYXN0IGRlbGltaXRlciwgb3IgYDBgIGlmIHRoZXJlIGlzIG5vbmUsIHRoZW4gY29weVxuXHRcdC8vIHRoZSBmaXJzdCBiYXNpYyBjb2RlIHBvaW50cyB0byB0aGUgb3V0cHV0LlxuXG5cdFx0YmFzaWMgPSBpbnB1dC5sYXN0SW5kZXhPZihkZWxpbWl0ZXIpO1xuXHRcdGlmIChiYXNpYyA8IDApIHtcblx0XHRcdGJhc2ljID0gMDtcblx0XHR9XG5cblx0XHRmb3IgKGogPSAwOyBqIDwgYmFzaWM7ICsraikge1xuXHRcdFx0Ly8gaWYgaXQncyBub3QgYSBiYXNpYyBjb2RlIHBvaW50XG5cdFx0XHRpZiAoaW5wdXQuY2hhckNvZGVBdChqKSA+PSAweDgwKSB7XG5cdFx0XHRcdGVycm9yKCdub3QtYmFzaWMnKTtcblx0XHRcdH1cblx0XHRcdG91dHB1dC5wdXNoKGlucHV0LmNoYXJDb2RlQXQoaikpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZGVjb2RpbmcgbG9vcDogc3RhcnQganVzdCBhZnRlciB0aGUgbGFzdCBkZWxpbWl0ZXIgaWYgYW55IGJhc2ljIGNvZGVcblx0XHQvLyBwb2ludHMgd2VyZSBjb3BpZWQ7IHN0YXJ0IGF0IHRoZSBiZWdpbm5pbmcgb3RoZXJ3aXNlLlxuXG5cdFx0Zm9yIChpbmRleCA9IGJhc2ljID4gMCA/IGJhc2ljICsgMSA6IDA7IGluZGV4IDwgaW5wdXRMZW5ndGg7IC8qIG5vIGZpbmFsIGV4cHJlc3Npb24gKi8pIHtcblxuXHRcdFx0Ly8gYGluZGV4YCBpcyB0aGUgaW5kZXggb2YgdGhlIG5leHQgY2hhcmFjdGVyIHRvIGJlIGNvbnN1bWVkLlxuXHRcdFx0Ly8gRGVjb2RlIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXIgaW50byBgZGVsdGFgLFxuXHRcdFx0Ly8gd2hpY2ggZ2V0cyBhZGRlZCB0byBgaWAuIFRoZSBvdmVyZmxvdyBjaGVja2luZyBpcyBlYXNpZXJcblx0XHRcdC8vIGlmIHdlIGluY3JlYXNlIGBpYCBhcyB3ZSBnbywgdGhlbiBzdWJ0cmFjdCBvZmYgaXRzIHN0YXJ0aW5nXG5cdFx0XHQvLyB2YWx1ZSBhdCB0aGUgZW5kIHRvIG9idGFpbiBgZGVsdGFgLlxuXHRcdFx0Zm9yIChvbGRpID0gaSwgdyA9IDEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXG5cdFx0XHRcdGlmIChpbmRleCA+PSBpbnB1dExlbmd0aCkge1xuXHRcdFx0XHRcdGVycm9yKCdpbnZhbGlkLWlucHV0Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkaWdpdCA9IGJhc2ljVG9EaWdpdChpbnB1dC5jaGFyQ29kZUF0KGluZGV4KyspKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPj0gYmFzZSB8fCBkaWdpdCA+IGZsb29yKChtYXhJbnQgLSBpKSAvIHcpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpICs9IGRpZ2l0ICogdztcblx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0IDwgdCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRpZiAodyA+IGZsb29yKG1heEludCAvIGJhc2VNaW51c1QpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR3ICo9IGJhc2VNaW51c1Q7XG5cblx0XHRcdH1cblxuXHRcdFx0b3V0ID0gb3V0cHV0Lmxlbmd0aCArIDE7XG5cdFx0XHRiaWFzID0gYWRhcHQoaSAtIG9sZGksIG91dCwgb2xkaSA9PSAwKTtcblxuXHRcdFx0Ly8gYGlgIHdhcyBzdXBwb3NlZCB0byB3cmFwIGFyb3VuZCBmcm9tIGBvdXRgIHRvIGAwYCxcblx0XHRcdC8vIGluY3JlbWVudGluZyBgbmAgZWFjaCB0aW1lLCBzbyB3ZSdsbCBmaXggdGhhdCBub3c6XG5cdFx0XHRpZiAoZmxvb3IoaSAvIG91dCkgPiBtYXhJbnQgLSBuKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRuICs9IGZsb29yKGkgLyBvdXQpO1xuXHRcdFx0aSAlPSBvdXQ7XG5cblx0XHRcdC8vIEluc2VydCBgbmAgYXQgcG9zaXRpb24gYGlgIG9mIHRoZSBvdXRwdXRcblx0XHRcdG91dHB1dC5zcGxpY2UoaSsrLCAwLCBuKTtcblxuXHRcdH1cblxuXHRcdHJldHVybiB1Y3MyZW5jb2RlKG91dHB1dCk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzIChlLmcuIGEgZG9tYWluIG5hbWUgbGFiZWwpIHRvIGFcblx0ICogUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZW5jb2RlKGlucHV0KSB7XG5cdFx0dmFyIG4sXG5cdFx0ICAgIGRlbHRhLFxuXHRcdCAgICBoYW5kbGVkQ1BDb3VudCxcblx0XHQgICAgYmFzaWNMZW5ndGgsXG5cdFx0ICAgIGJpYXMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIG0sXG5cdFx0ICAgIHEsXG5cdFx0ICAgIGssXG5cdFx0ICAgIHQsXG5cdFx0ICAgIGN1cnJlbnRWYWx1ZSxcblx0XHQgICAgb3V0cHV0ID0gW10sXG5cdFx0ICAgIC8qKiBgaW5wdXRMZW5ndGhgIHdpbGwgaG9sZCB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIGluIGBpbnB1dGAuICovXG5cdFx0ICAgIGlucHV0TGVuZ3RoLFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgaGFuZGxlZENQQ291bnRQbHVzT25lLFxuXHRcdCAgICBiYXNlTWludXNULFxuXHRcdCAgICBxTWludXNUO1xuXG5cdFx0Ly8gQ29udmVydCB0aGUgaW5wdXQgaW4gVUNTLTIgdG8gVW5pY29kZVxuXHRcdGlucHV0ID0gdWNzMmRlY29kZShpbnB1dCk7XG5cblx0XHQvLyBDYWNoZSB0aGUgbGVuZ3RoXG5cdFx0aW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGg7XG5cblx0XHQvLyBJbml0aWFsaXplIHRoZSBzdGF0ZVxuXHRcdG4gPSBpbml0aWFsTjtcblx0XHRkZWx0YSA9IDA7XG5cdFx0YmlhcyA9IGluaXRpYWxCaWFzO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50c1xuXHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCAweDgwKSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShjdXJyZW50VmFsdWUpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRoYW5kbGVkQ1BDb3VudCA9IGJhc2ljTGVuZ3RoID0gb3V0cHV0Lmxlbmd0aDtcblxuXHRcdC8vIGBoYW5kbGVkQ1BDb3VudGAgaXMgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyB0aGF0IGhhdmUgYmVlbiBoYW5kbGVkO1xuXHRcdC8vIGBiYXNpY0xlbmd0aGAgaXMgdGhlIG51bWJlciBvZiBiYXNpYyBjb2RlIHBvaW50cy5cblxuXHRcdC8vIEZpbmlzaCB0aGUgYmFzaWMgc3RyaW5nIC0gaWYgaXQgaXMgbm90IGVtcHR5IC0gd2l0aCBhIGRlbGltaXRlclxuXHRcdGlmIChiYXNpY0xlbmd0aCkge1xuXHRcdFx0b3V0cHV0LnB1c2goZGVsaW1pdGVyKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGVuY29kaW5nIGxvb3A6XG5cdFx0d2hpbGUgKGhhbmRsZWRDUENvdW50IDwgaW5wdXRMZW5ndGgpIHtcblxuXHRcdFx0Ly8gQWxsIG5vbi1iYXNpYyBjb2RlIHBvaW50cyA8IG4gaGF2ZSBiZWVuIGhhbmRsZWQgYWxyZWFkeS4gRmluZCB0aGUgbmV4dFxuXHRcdFx0Ly8gbGFyZ2VyIG9uZTpcblx0XHRcdGZvciAobSA9IG1heEludCwgaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID49IG4gJiYgY3VycmVudFZhbHVlIDwgbSkge1xuXHRcdFx0XHRcdG0gPSBjdXJyZW50VmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSW5jcmVhc2UgYGRlbHRhYCBlbm91Z2ggdG8gYWR2YW5jZSB0aGUgZGVjb2RlcidzIDxuLGk+IHN0YXRlIHRvIDxtLDA+LFxuXHRcdFx0Ly8gYnV0IGd1YXJkIGFnYWluc3Qgb3ZlcmZsb3dcblx0XHRcdGhhbmRsZWRDUENvdW50UGx1c09uZSA9IGhhbmRsZWRDUENvdW50ICsgMTtcblx0XHRcdGlmIChtIC0gbiA+IGZsb29yKChtYXhJbnQgLSBkZWx0YSkgLyBoYW5kbGVkQ1BDb3VudFBsdXNPbmUpKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRkZWx0YSArPSAobSAtIG4pICogaGFuZGxlZENQQ291bnRQbHVzT25lO1xuXHRcdFx0biA9IG07XG5cblx0XHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCBuICYmICsrZGVsdGEgPiBtYXhJbnQpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPT0gbikge1xuXHRcdFx0XHRcdC8vIFJlcHJlc2VudCBkZWx0YSBhcyBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyXG5cdFx0XHRcdFx0Zm9yIChxID0gZGVsdGEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXHRcdFx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cdFx0XHRcdFx0XHRpZiAocSA8IHQpIHtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRxTWludXNUID0gcSAtIHQ7XG5cdFx0XHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdFx0XHRvdXRwdXQucHVzaChcblx0XHRcdFx0XHRcdFx0c3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyh0ICsgcU1pbnVzVCAlIGJhc2VNaW51c1QsIDApKVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdHEgPSBmbG9vcihxTWludXNUIC8gYmFzZU1pbnVzVCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyhxLCAwKSkpO1xuXHRcdFx0XHRcdGJpYXMgPSBhZGFwdChkZWx0YSwgaGFuZGxlZENQQ291bnRQbHVzT25lLCBoYW5kbGVkQ1BDb3VudCA9PSBiYXNpY0xlbmd0aCk7XG5cdFx0XHRcdFx0ZGVsdGEgPSAwO1xuXHRcdFx0XHRcdCsraGFuZGxlZENQQ291bnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0KytkZWx0YTtcblx0XHRcdCsrbjtcblxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIG9yIGFuIGVtYWlsIGFkZHJlc3Ncblx0ICogdG8gVW5pY29kZS4gT25seSB0aGUgUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBpbnB1dCB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLlxuXHQgKiBpdCBkb2Vzbid0IG1hdHRlciBpZiB5b3UgY2FsbCBpdCBvbiBhIHN0cmluZyB0aGF0IGhhcyBhbHJlYWR5IGJlZW5cblx0ICogY29udmVydGVkIHRvIFVuaWNvZGUuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlZCBkb21haW4gbmFtZSBvciBlbWFpbCBhZGRyZXNzIHRvXG5cdCAqIGNvbnZlcnQgdG8gVW5pY29kZS5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFVuaWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIFB1bnljb2RlXG5cdCAqIHN0cmluZy5cblx0ICovXG5cdGZ1bmN0aW9uIHRvVW5pY29kZShpbnB1dCkge1xuXHRcdHJldHVybiBtYXBEb21haW4oaW5wdXQsIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4UHVueWNvZGUudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gZGVjb2RlKHN0cmluZy5zbGljZSg0KS50b0xvd2VyQ2FzZSgpKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIG9yIGFuIGVtYWlsIGFkZHJlc3MgdG9cblx0ICogUHVueWNvZGUuIE9ubHkgdGhlIG5vbi1BU0NJSSBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsXG5cdCAqIGkuZS4gaXQgZG9lc24ndCBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgd2l0aCBhIGRvbWFpbiB0aGF0J3MgYWxyZWFkeSBpblxuXHQgKiBBU0NJSS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgZG9tYWluIG5hbWUgb3IgZW1haWwgYWRkcmVzcyB0byBjb252ZXJ0LCBhcyBhXG5cdCAqIFVuaWNvZGUgc3RyaW5nLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgUHVueWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGRvbWFpbiBuYW1lIG9yXG5cdCAqIGVtYWlsIGFkZHJlc3MuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b0FTQ0lJKGlucHV0KSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihpbnB1dCwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKiBEZWZpbmUgdGhlIHB1YmxpYyBBUEkgKi9cblx0cHVueWNvZGUgPSB7XG5cdFx0LyoqXG5cdFx0ICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IFB1bnljb2RlLmpzIHZlcnNpb24gbnVtYmVyLlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIFN0cmluZ1xuXHRcdCAqL1xuXHRcdCd2ZXJzaW9uJzogJzEuMy4yJyxcblx0XHQvKipcblx0XHQgKiBBbiBvYmplY3Qgb2YgbWV0aG9kcyB0byBjb252ZXJ0IGZyb20gSmF2YVNjcmlwdCdzIGludGVybmFsIGNoYXJhY3RlclxuXHRcdCAqIHJlcHJlc2VudGF0aW9uIChVQ1MtMikgdG8gVW5pY29kZSBjb2RlIHBvaW50cywgYW5kIGJhY2suXG5cdFx0ICogQHNlZSA8aHR0cHM6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgT2JqZWN0XG5cdFx0ICovXG5cdFx0J3VjczInOiB7XG5cdFx0XHQnZGVjb2RlJzogdWNzMmRlY29kZSxcblx0XHRcdCdlbmNvZGUnOiB1Y3MyZW5jb2RlXG5cdFx0fSxcblx0XHQnZGVjb2RlJzogZGVjb2RlLFxuXHRcdCdlbmNvZGUnOiBlbmNvZGUsXG5cdFx0J3RvQVNDSUknOiB0b0FTQ0lJLFxuXHRcdCd0b1VuaWNvZGUnOiB0b1VuaWNvZGVcblx0fTtcblxuXHQvKiogRXhwb3NlIGBwdW55Y29kZWAgKi9cblx0Ly8gU29tZSBBTUQgYnVpbGQgb3B0aW1pemVycywgbGlrZSByLmpzLCBjaGVjayBmb3Igc3BlY2lmaWMgY29uZGl0aW9uIHBhdHRlcm5zXG5cdC8vIGxpa2UgdGhlIGZvbGxvd2luZzpcblx0aWYgKFxuXHRcdHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJlxuXHRcdHR5cGVvZiBkZWZpbmUuYW1kID09ICdvYmplY3QnICYmXG5cdFx0ZGVmaW5lLmFtZFxuXHQpIHtcblx0XHRkZWZpbmUoJ3B1bnljb2RlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcHVueWNvZGU7XG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAoZnJlZUV4cG9ydHMgJiYgZnJlZU1vZHVsZSkge1xuXHRcdGlmIChtb2R1bGUuZXhwb3J0cyA9PSBmcmVlRXhwb3J0cykgeyAvLyBpbiBOb2RlLmpzIG9yIFJpbmdvSlMgdjAuOC4wK1xuXHRcdFx0ZnJlZU1vZHVsZS5leHBvcnRzID0gcHVueWNvZGU7XG5cdFx0fSBlbHNlIHsgLy8gaW4gTmFyd2hhbCBvciBSaW5nb0pTIHYwLjcuMC1cblx0XHRcdGZvciAoa2V5IGluIHB1bnljb2RlKSB7XG5cdFx0XHRcdHB1bnljb2RlLmhhc093blByb3BlcnR5KGtleSkgJiYgKGZyZWVFeHBvcnRzW2tleV0gPSBwdW55Y29kZVtrZXldKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7IC8vIGluIFJoaW5vIG9yIGEgd2ViIGJyb3dzZXJcblx0XHRyb290LnB1bnljb2RlID0gcHVueWNvZGU7XG5cdH1cblxufSh0aGlzKSk7XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBJZiBvYmouaGFzT3duUHJvcGVydHkgaGFzIGJlZW4gb3ZlcnJpZGRlbiwgdGhlbiBjYWxsaW5nXG4vLyBvYmouaGFzT3duUHJvcGVydHkocHJvcCkgd2lsbCBicmVhay5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2lzc3Vlcy8xNzA3XG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHFzLCBzZXAsIGVxLCBvcHRpb25zKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICB2YXIgb2JqID0ge307XG5cbiAgaWYgKHR5cGVvZiBxcyAhPT0gJ3N0cmluZycgfHwgcXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIHZhciByZWdleHAgPSAvXFwrL2c7XG4gIHFzID0gcXMuc3BsaXQoc2VwKTtcblxuICB2YXIgbWF4S2V5cyA9IDEwMDA7XG4gIGlmIChvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zLm1heEtleXMgPT09ICdudW1iZXInKSB7XG4gICAgbWF4S2V5cyA9IG9wdGlvbnMubWF4S2V5cztcbiAgfVxuXG4gIHZhciBsZW4gPSBxcy5sZW5ndGg7XG4gIC8vIG1heEtleXMgPD0gMCBtZWFucyB0aGF0IHdlIHNob3VsZCBub3QgbGltaXQga2V5cyBjb3VudFxuICBpZiAobWF4S2V5cyA+IDAgJiYgbGVuID4gbWF4S2V5cykge1xuICAgIGxlbiA9IG1heEtleXM7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgdmFyIHggPSBxc1tpXS5yZXBsYWNlKHJlZ2V4cCwgJyUyMCcpLFxuICAgICAgICBpZHggPSB4LmluZGV4T2YoZXEpLFxuICAgICAgICBrc3RyLCB2c3RyLCBrLCB2O1xuXG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBrc3RyID0geC5zdWJzdHIoMCwgaWR4KTtcbiAgICAgIHZzdHIgPSB4LnN1YnN0cihpZHggKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAga3N0ciA9IHg7XG4gICAgICB2c3RyID0gJyc7XG4gICAgfVxuXG4gICAgayA9IGRlY29kZVVSSUNvbXBvbmVudChrc3RyKTtcbiAgICB2ID0gZGVjb2RlVVJJQ29tcG9uZW50KHZzdHIpO1xuXG4gICAgaWYgKCFoYXNPd25Qcm9wZXJ0eShvYmosIGspKSB7XG4gICAgICBvYmpba10gPSB2O1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICBvYmpba10ucHVzaCh2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2tdID0gW29ialtrXSwgdl07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHN0cmluZ2lmeVByaW1pdGl2ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgc3dpdGNoICh0eXBlb2Ygdikge1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICByZXR1cm4gdjtcblxuICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgcmV0dXJuIHYgPyAndHJ1ZScgOiAnZmFsc2UnO1xuXG4gICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgIHJldHVybiBpc0Zpbml0ZSh2KSA/IHYgOiAnJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJyc7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqLCBzZXAsIGVxLCBuYW1lKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG1hcChvYmplY3RLZXlzKG9iaiksIGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBrcyA9IGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUoaykpICsgZXE7XG4gICAgICBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICAgIHJldHVybiBtYXAob2JqW2tdLCBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgcmV0dXJuIGtzICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZSh2KSk7XG4gICAgICAgIH0pLmpvaW4oc2VwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqW2tdKSk7XG4gICAgICB9XG4gICAgfSkuam9pbihzZXApO1xuXG4gIH1cblxuICBpZiAoIW5hbWUpIHJldHVybiAnJztcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUobmFtZSkpICsgZXEgK1xuICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShvYmopKTtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG5mdW5jdGlvbiBtYXAgKHhzLCBmKSB7XG4gIGlmICh4cy5tYXApIHJldHVybiB4cy5tYXAoZik7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIHJlcy5wdXNoKGYoeHNbaV0sIGkpKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHJlcy5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuZGVjb2RlID0gZXhwb3J0cy5wYXJzZSA9IHJlcXVpcmUoJy4vZGVjb2RlJyk7XG5leHBvcnRzLmVuY29kZSA9IGV4cG9ydHMuc3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9lbmNvZGUnKTtcbiIsIi8qISByYXN0ZXJpemVIVE1MLmpzIC0gdjEuMi4xIC0gMjAxNS0xMS0yNlxuKiBodHRwOi8vd3d3LmdpdGh1Yi5jb20vY2J1cmdtZXIvcmFzdGVyaXplSFRNTC5qc1xuKiBDb3B5cmlnaHQgKGMpIDIwMTUgQ2hyaXN0b3BoIEJ1cmdtZXI7IExpY2Vuc2VkIE1JVCAqL1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUgdW5sZXNzIGFtZE1vZHVsZUlkIGlzIHNldFxuICAgIGRlZmluZShbXCJ1cmxcIixcImNzcy1tZWRpYXF1ZXJ5XCIsXCJ4bWxzZXJpYWxpemVyXCIsXCJzYW5lLWRvbXBhcnNlci1lcnJvclwiLFwiYXllcHJvbWlzZVwiLFwiaW5saW5lcmVzb3VyY2VzXCJdLCBmdW5jdGlvbiAoYTAsYjEsYzIsZDMsZTQsZjUpIHtcbiAgICAgIHJldHVybiAocm9vdFsncmFzdGVyaXplSFRNTCddID0gZmFjdG9yeShhMCxiMSxjMixkMyxlNCxmNSkpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIE5vZGUuIERvZXMgbm90IHdvcmsgd2l0aCBzdHJpY3QgQ29tbW9uSlMsIGJ1dFxuICAgIC8vIG9ubHkgQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLFxuICAgIC8vIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZShcInVybFwiKSxyZXF1aXJlKFwiY3NzLW1lZGlhcXVlcnlcIikscmVxdWlyZShcInhtbHNlcmlhbGl6ZXJcIikscmVxdWlyZShcInNhbmUtZG9tcGFyc2VyLWVycm9yXCIpLHJlcXVpcmUoXCJheWVwcm9taXNlXCIpLHJlcXVpcmUoXCJpbmxpbmVyZXNvdXJjZXNcIikpO1xuICB9IGVsc2Uge1xuICAgIHJvb3RbJ3Jhc3Rlcml6ZUhUTUwnXSA9IGZhY3RvcnkodXJsLGNzc01lZGlhUXVlcnkseG1sc2VyaWFsaXplcixzYW5lZG9tcGFyc2VyZXJyb3IsYXllcHJvbWlzZSxpbmxpbmVyZXNvdXJjZXMpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uICh1cmwsIGNzc01lZGlhUXVlcnksIHhtbHNlcmlhbGl6ZXIsIHNhbmVkb21wYXJzZXJlcnJvciwgYXllcHJvbWlzZSwgaW5saW5lcmVzb3VyY2VzKSB7XG5cbnZhciB1dGlsID0gKGZ1bmN0aW9uICh1cmwpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBtb2R1bGUgPSB7fTtcblxuICAgIHZhciB1bmlxdWVJZExpc3QgPSBbXTtcblxuICAgIG1vZHVsZS5qb2luVXJsID0gZnVuY3Rpb24gKGJhc2VVcmwsIHJlbFVybCkge1xuICAgICAgICBpZiAoIWJhc2VVcmwpIHtcbiAgICAgICAgICAgIHJldHVybiByZWxVcmw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybC5yZXNvbHZlKGJhc2VVcmwsIHJlbFVybCk7XG4gICAgfTtcblxuICAgIG1vZHVsZS5nZXRDb25zdGFudFVuaXF1ZUlkRm9yID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgLy8gSEFDSywgdXNpbmcgYSBsaXN0IHJlc3VsdHMgaW4gTyhuKSwgYnV0IGhvdyBkbyB3ZSBoYXNoIGUuZy4gYSBET00gbm9kZT9cbiAgICAgICAgaWYgKHVuaXF1ZUlkTGlzdC5pbmRleE9mKGVsZW1lbnQpIDwgMCkge1xuICAgICAgICAgICAgdW5pcXVlSWRMaXN0LnB1c2goZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuaXF1ZUlkTGlzdC5pbmRleE9mKGVsZW1lbnQpO1xuICAgIH07XG5cbiAgICBtb2R1bGUuY2xvbmUgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHZhciB0aGVDbG9uZSA9IHt9LFxuICAgICAgICAgICAgaTtcbiAgICAgICAgZm9yIChpIGluIG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgICAgIHRoZUNsb25lW2ldID0gb2JqZWN0W2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGVDbG9uZTtcbiAgICB9O1xuXG4gICAgdmFyIGlzT2JqZWN0ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIiAmJiBvYmogIT09IG51bGw7XG4gICAgfTtcblxuICAgIHZhciBpc0NhbnZhcyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIGlzT2JqZWN0KG9iaikgJiZcbiAgICAgICAgICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkob2JqKS5tYXRjaCgvXFxbb2JqZWN0IChDYW52YXN8SFRNTENhbnZhc0VsZW1lbnQpXFxdL2kpO1xuICAgIH07XG5cbiAgICAvLyBhcmdzOiBjYW52YXMsIG9wdGlvbnNcbiAgICBtb2R1bGUucGFyc2VPcHRpb25hbFBhcmFtZXRlcnMgPSBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICB2YXIgcGFyYW1ldGVycyA9IHtcbiAgICAgICAgICAgIGNhbnZhczogbnVsbCxcbiAgICAgICAgICAgIG9wdGlvbnM6IHt9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGFyZ3NbMF0gPT0gbnVsbCB8fCBpc0NhbnZhcyhhcmdzWzBdKSkge1xuICAgICAgICAgICAgcGFyYW1ldGVycy5jYW52YXMgPSBhcmdzWzBdIHx8IG51bGw7XG5cbiAgICAgICAgICAgIHBhcmFtZXRlcnMub3B0aW9ucyA9IG1vZHVsZS5jbG9uZShhcmdzWzFdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhcmFtZXRlcnMub3B0aW9ucyA9IG1vZHVsZS5jbG9uZShhcmdzWzBdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYXJhbWV0ZXJzO1xuICAgIH07XG5cbiAgICByZXR1cm4gbW9kdWxlO1xufSh1cmwpKTtcblxuLy8gUHJveHkgb2JqZWN0cyBieSBtb25rZXkgcGF0Y2hpbmdcbnZhciBwcm94aWVzID0gKGZ1bmN0aW9uICh1dGlsLCBheWVwcm9taXNlKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgbW9kdWxlID0ge307XG5cbiAgICB2YXIgbW9ua2V5UGF0Y2hJbnN0YW5jZU1ldGhvZCA9IGZ1bmN0aW9uIChvYmplY3QsIG1ldGhvZE5hbWUsIHByb3h5RnVuYykge1xuICAgICAgICB2YXIgb3JpZ2luYWxGdW5jID0gb2JqZWN0W21ldGhvZE5hbWVdO1xuXG4gICAgICAgIG9iamVjdFttZXRob2ROYW1lXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgcmV0dXJuIHByb3h5RnVuYy5hcHBseSh0aGlzLCBbYXJncywgb3JpZ2luYWxGdW5jXSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsRnVuYztcbiAgICB9O1xuXG4gICAgLy8gQmFzZXMgYWxsIFhIUiBjYWxscyBvbiB0aGUgZ2l2ZW4gYmFzZSBVUkxcbiAgICBtb2R1bGUuYmFzZVVybFJlc3BlY3RpbmdYaHIgPSBmdW5jdGlvbiAoWEhST2JqZWN0LCBiYXNlVXJsKSB7XG4gICAgICAgIHZhciB4aHJDb25zdHJ1Y3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB4aHIgPSBuZXcgWEhST2JqZWN0KCk7XG5cbiAgICAgICAgICAgIG1vbmtleVBhdGNoSW5zdGFuY2VNZXRob2QoeGhyLCAnb3BlbicsIGZ1bmN0aW9uIChhcmdzLCBvcmlnaW5hbE9wZW4pIHtcbiAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYXJncy5zaGlmdCgpLFxuICAgICAgICAgICAgICAgICAgICB1cmwgPSBhcmdzLnNoaWZ0KCksXG4gICAgICAgICAgICAgICAgICAgIGpvaW5lZFVybCA9IHV0aWwuam9pblVybChiYXNlVXJsLCB1cmwpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsT3Blbi5hcHBseSh0aGlzLCBbbWV0aG9kLCBqb2luZWRVcmxdLmNvbmNhdChhcmdzKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4geGhyQ29uc3RydWN0b3I7XG4gICAgfTtcblxuICAgIC8vIFByb3ZpZGVzIGEgY29udmVuaWVudCB3YXkgb2YgYmVpbmcgbm90aWZpZWQgd2hlbiBhbGwgcGVuZGluZyBYSFIgY2FsbHMgYXJlIGZpbmlzaGVkXG4gICAgbW9kdWxlLmZpbmlzaE5vdGlmeWluZ1hociA9IGZ1bmN0aW9uIChYSFJPYmplY3QpIHtcbiAgICAgICAgdmFyIHRvdGFsWGhyQ291bnQgPSAwLFxuICAgICAgICAgICAgZG9uZVhockNvdW50ID0gMCxcbiAgICAgICAgICAgIHdhaXRpbmdGb3JQZW5kaW5nVG9DbG9zZSA9IGZhbHNlLFxuICAgICAgICAgICAgZGVmZXIgPSBheWVwcm9taXNlLmRlZmVyKCk7XG5cbiAgICAgICAgdmFyIGNoZWNrQWxsUmVxdWVzdHNGaW5pc2hlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBwZW5kaW5nWGhyQ291bnQgPSB0b3RhbFhockNvdW50IC0gZG9uZVhockNvdW50O1xuXG4gICAgICAgICAgICBpZiAocGVuZGluZ1hockNvdW50IDw9IDAgJiYgd2FpdGluZ0ZvclBlbmRpbmdUb0Nsb3NlKSB7XG4gICAgICAgICAgICAgICAgZGVmZXIucmVzb2x2ZSh7dG90YWxDb3VudDogdG90YWxYaHJDb3VudH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB4aHJDb25zdHJ1Y3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB4aHIgPSBuZXcgWEhST2JqZWN0KCk7XG5cbiAgICAgICAgICAgIG1vbmtleVBhdGNoSW5zdGFuY2VNZXRob2QoeGhyLCAnc2VuZCcsIGZ1bmN0aW9uIChfLCBvcmlnaW5hbFNlbmQpIHtcbiAgICAgICAgICAgICAgICB0b3RhbFhockNvdW50ICs9IDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsU2VuZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHhoci5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvbmVYaHJDb3VudCArPSAxO1xuXG4gICAgICAgICAgICAgICAgY2hlY2tBbGxSZXF1ZXN0c0ZpbmlzaGVkKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgfTtcblxuICAgICAgICB4aHJDb25zdHJ1Y3Rvci53YWl0Rm9yUmVxdWVzdHNUb0ZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHdhaXRpbmdGb3JQZW5kaW5nVG9DbG9zZSA9IHRydWU7XG4gICAgICAgICAgICBjaGVja0FsbFJlcXVlc3RzRmluaXNoZWQoKTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB4aHJDb25zdHJ1Y3RvcjtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG1vZHVsZTtcbn0odXRpbCwgYXllcHJvbWlzZSkpO1xuXG52YXIgZG9jdW1lbnRVdGlsID0gKGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBtb2R1bGUgPSB7fTtcblxuICAgIHZhciBhc0FycmF5ID0gZnVuY3Rpb24gKGFycmF5TGlrZSkge1xuICAgICAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyYXlMaWtlKTtcbiAgICB9O1xuXG4gICAgbW9kdWxlLmFkZENsYXNzTmFtZSA9IGZ1bmN0aW9uIChlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICAgICAgZWxlbWVudC5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICAgIH07XG5cbiAgICBtb2R1bGUuYWRkQ2xhc3NOYW1lUmVjdXJzaXZlbHkgPSBmdW5jdGlvbiAoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgICAgIG1vZHVsZS5hZGRDbGFzc05hbWUoZWxlbWVudCwgY2xhc3NOYW1lKTtcblxuICAgICAgICBpZiAoZWxlbWVudC5wYXJlbnROb2RlICE9PSBlbGVtZW50Lm93bmVyRG9jdW1lbnQpIHtcbiAgICAgICAgICAgIG1vZHVsZS5hZGRDbGFzc05hbWVSZWN1cnNpdmVseShlbGVtZW50LnBhcmVudE5vZGUsIGNsYXNzTmFtZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNoYW5nZUNzc1J1bGUgPSBmdW5jdGlvbiAocnVsZSwgbmV3UnVsZVRleHQpIHtcbiAgICAgICAgdmFyIHN0eWxlU2hlZXQgPSBydWxlLnBhcmVudFN0eWxlU2hlZXQsXG4gICAgICAgICAgICBydWxlSWR4ID0gYXNBcnJheShzdHlsZVNoZWV0LmNzc1J1bGVzKS5pbmRleE9mKHJ1bGUpO1xuXG4gICAgICAgIC8vIEV4Y2hhbmdlIHJ1bGUgd2l0aCB0aGUgbmV3IHRleHRcbiAgICAgICAgc3R5bGVTaGVldC5pbnNlcnRSdWxlKG5ld1J1bGVUZXh0LCBydWxlSWR4KzEpO1xuICAgICAgICBzdHlsZVNoZWV0LmRlbGV0ZVJ1bGUocnVsZUlkeCk7XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGVSdWxlU2VsZWN0b3IgPSBmdW5jdGlvbiAocnVsZSwgdXBkYXRlZFNlbGVjdG9yKSB7XG4gICAgICAgIHZhciBzdHlsZURlZmluaXRpb25zID0gcnVsZS5jc3NUZXh0LnJlcGxhY2UoL15bXlxce10rLywgJycpLFxuICAgICAgICAgICAgbmV3UnVsZSA9IHVwZGF0ZWRTZWxlY3RvciArICcgJyArIHN0eWxlRGVmaW5pdGlvbnM7XG5cbiAgICAgICAgY2hhbmdlQ3NzUnVsZShydWxlLCBuZXdSdWxlKTtcbiAgICB9O1xuXG4gICAgdmFyIGNzc1J1bGVzVG9UZXh0ID0gZnVuY3Rpb24gKGNzc1J1bGVzKSB7XG4gICAgICAgIHJldHVybiBhc0FycmF5KGNzc1J1bGVzKS5yZWR1Y2UoZnVuY3Rpb24gKGNzc1RleHQsIHJ1bGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjc3NUZXh0ICsgcnVsZS5jc3NUZXh0O1xuICAgICAgICB9LCAnJyk7XG4gICAgfTtcblxuICAgIHZhciByZXdyaXRlU3R5bGVDb250ZW50ID0gZnVuY3Rpb24gKHN0eWxlRWxlbWVudCkge1xuICAgICAgICBzdHlsZUVsZW1lbnQudGV4dENvbnRlbnQgPSBjc3NSdWxlc1RvVGV4dChzdHlsZUVsZW1lbnQuc2hlZXQuY3NzUnVsZXMpO1xuICAgIH07XG5cbiAgICB2YXIgbWF0Y2hpbmdTaW1wbGVTZWxlY3RvcnNSZWdleCA9IGZ1bmN0aW9uIChzaW1wbGVTZWxlY3Rvckxpc3QpIHtcbiAgICAgICAgcmV0dXJuICcoJyArXG4gICAgICAgICAgICAnKD86XnxbXi4jOlxcXFx3XSknICsgICAgICAgICAgICAvLyBzdGFydCBvZiBzdHJpbmcgb3Igbm90IGEgc2ltcGxlIHNlbGVjdG9yIGNoYXJhY3RlcixcbiAgICAgICAgICAgICd8JyArICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAuLi4gb3IgLi4uXG4gICAgICAgICAgICAnKD89XFxcXFcpJyArICAgICAgICAgICAgICAgICAgICAvLyB0aGUgbmV4dCBjaGFyYWN0ZXIgcGFyc2VkIGlzIG5vdCBhbiBhbHBoYWJldGljIGNoYXJhY3RlciAoYW5kIHRodXMgYSBuYXR1cmFsIGJvdW5kYXJ5KVxuICAgICAgICAgICAgJyknICtcbiAgICAgICAgICAgICcoJyArXG4gICAgICAgICAgICBzaW1wbGVTZWxlY3Rvckxpc3Quam9pbignfCcpICsgLy8gb25lIG91dCBvZiB0aGUgZ2l2ZW4gc2ltcGxlIHNlbGVjdG9yc1xuICAgICAgICAgICAgJyknICtcbiAgICAgICAgICAgICcoPz1cXFxcV3wkKSc7ICAgICAgICAgICAgICAgICAgIC8vIGZvbGxvd2VkIGVpdGhlciBieSBhIG5vbi1hbHBoYWJldGljIGNoYXJhY3RlciBvciB0aGUgZW5kIG9mIHRoZSBzdHJpbmdcbiAgICB9O1xuXG4gICAgdmFyIHJlcGxhY2VTaW1wbGVTZWxlY3RvcnNCeSA9IGZ1bmN0aW9uIChkb2MsIHNpbXBsZVNlbGVjdG9yTGlzdCwgY2FzZUluc2Vuc2l0aXZlUmVwbGFjZUZ1bmMpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yUmVnZXggPSBtYXRjaGluZ1NpbXBsZVNlbGVjdG9yc1JlZ2V4KHNpbXBsZVNlbGVjdG9yTGlzdCk7XG5cbiAgICAgICAgYXNBcnJheShkb2MucXVlcnlTZWxlY3RvckFsbCgnc3R5bGUnKSkuZm9yRWFjaChmdW5jdGlvbiAoc3R5bGVFbGVtZW50KSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2hpbmdSdWxlcyA9IGFzQXJyYXkoc3R5bGVFbGVtZW50LnNoZWV0LmNzc1J1bGVzKS5maWx0ZXIoZnVuY3Rpb24gKHJ1bGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnVsZS5zZWxlY3RvclRleHQgJiYgbmV3IFJlZ0V4cChzZWxlY3RvclJlZ2V4LCAnaScpLnRlc3QocnVsZS5zZWxlY3RvclRleHQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChtYXRjaGluZ1J1bGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG1hdGNoaW5nUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAocnVsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3U2VsZWN0b3IgPSBydWxlLnNlbGVjdG9yVGV4dC5yZXBsYWNlKG5ldyBSZWdFeHAoc2VsZWN0b3JSZWdleCwgJ2dpJyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKF8sIHByZWZpeE1hdGNoLCBzZWxlY3Rvck1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJlZml4TWF0Y2ggKyBjYXNlSW5zZW5zaXRpdmVSZXBsYWNlRnVuYyhzZWxlY3Rvck1hdGNoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1NlbGVjdG9yICE9PSBydWxlLnNlbGVjdG9yVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUnVsZVNlbGVjdG9yKHJ1bGUsIG5ld1NlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV3cml0ZVN0eWxlQ29udGVudChzdHlsZUVsZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgbW9kdWxlLnJld3JpdGVDc3NTZWxlY3RvcldpdGggPSBmdW5jdGlvbiAoZG9jLCBvbGRTZWxlY3RvciwgbmV3U2VsZWN0b3IpIHtcbiAgICAgICAgcmVwbGFjZVNpbXBsZVNlbGVjdG9yc0J5KGRvYywgW29sZFNlbGVjdG9yXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ld1NlbGVjdG9yO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgbW9kdWxlLmxvd2VyY2FzZUNzc1R5cGVTZWxlY3RvcnMgPSBmdW5jdGlvbiAoZG9jLCBtYXRjaGluZ1RhZ05hbWVzKSB7XG4gICAgICAgIHJlcGxhY2VTaW1wbGVTZWxlY3RvcnNCeShkb2MsIG1hdGNoaW5nVGFnTmFtZXMsIGZ1bmN0aW9uIChtYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBtb2R1bGUuZmluZEh0bWxPbmx5Tm9kZU5hbWVzID0gZnVuY3Rpb24gKGRvYykge1xuICAgICAgICB2YXIgdHJlZVdhbGtlciA9IGRvYy5jcmVhdGVUcmVlV2Fsa2VyKGRvYywgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQpLFxuICAgICAgICAgICAgaHRtbE5vZGVOYW1lcyA9IHt9LFxuICAgICAgICAgICAgbm9uSHRtbE5vZGVOYW1lcyA9IHt9LFxuICAgICAgICAgICAgY3VycmVudFRhZ05hbWU7XG5cbiAgICAgICAgd2hpbGUodHJlZVdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgICAgICAgICBjdXJyZW50VGFnTmFtZSA9IHRyZWVXYWxrZXIuY3VycmVudE5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKHRyZWVXYWxrZXIuY3VycmVudE5vZGUubmFtZXNwYWNlVVJJID09PSAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCcpIHtcbiAgICAgICAgICAgICAgICBodG1sTm9kZU5hbWVzW2N1cnJlbnRUYWdOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vbkh0bWxOb2RlTmFtZXNbY3VycmVudFRhZ05hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhodG1sTm9kZU5hbWVzKS5maWx0ZXIoZnVuY3Rpb24gKHRhZ05hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiAhbm9uSHRtbE5vZGVOYW1lc1t0YWdOYW1lXTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBtb2R1bGU7XG59KCkpO1xuXG52YXIgZG9jdW1lbnRIZWxwZXIgPSAoZnVuY3Rpb24gKGRvY3VtZW50VXRpbCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIG1vZHVsZSA9IHt9O1xuXG4gICAgdmFyIGFzQXJyYXkgPSBmdW5jdGlvbiAoYXJyYXlMaWtlKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnJheUxpa2UpO1xuICAgIH07XG5cbiAgICB2YXIgY2FzY2FkaW5nQWN0aW9uID0ge1xuICAgICAgICBhY3RpdmU6IHRydWUsXG4gICAgICAgIGhvdmVyOiB0cnVlLFxuICAgICAgICBmb2N1czogZmFsc2UsXG4gICAgICAgIHRhcmdldDogZmFsc2VcbiAgICB9O1xuXG4gICAgbW9kdWxlLmZha2VVc2VyQWN0aW9uID0gZnVuY3Rpb24gKGRvYywgc2VsZWN0b3IsIGFjdGlvbikge1xuICAgICAgICB2YXIgZWxlbSA9IGRvYy5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSxcbiAgICAgICAgICAgIHBzZXVkb0NsYXNzID0gJzonICsgYWN0aW9uLFxuICAgICAgICAgICAgZmFrZUFjdGlvbkNsYXNzID0gJ3Jhc3Rlcml6ZWh0bWwnICsgYWN0aW9uO1xuICAgICAgICBpZiAoISBlbGVtKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2FzY2FkaW5nQWN0aW9uW2FjdGlvbl0pIHtcbiAgICAgICAgICAgIGRvY3VtZW50VXRpbC5hZGRDbGFzc05hbWVSZWN1cnNpdmVseShlbGVtLCBmYWtlQWN0aW9uQ2xhc3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnRVdGlsLmFkZENsYXNzTmFtZShlbGVtLCBmYWtlQWN0aW9uQ2xhc3MpO1xuICAgICAgICB9XG4gICAgICAgIGRvY3VtZW50VXRpbC5yZXdyaXRlQ3NzU2VsZWN0b3JXaXRoKGRvYywgcHNldWRvQ2xhc3MsICcuJyArIGZha2VBY3Rpb25DbGFzcyk7XG4gICAgfTtcblxuICAgIG1vZHVsZS5wZXJzaXN0SW5wdXRWYWx1ZXMgPSBmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHZhciBpbnB1dHMgPSBkb2MucXVlcnlTZWxlY3RvckFsbCgnaW5wdXQnKSxcbiAgICAgICAgICAgIHRleHRhcmVhcyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKCd0ZXh0YXJlYScpLFxuICAgICAgICAgICAgaXNDaGVja2FibGUgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXQudHlwZSA9PT0gJ2NoZWNrYm94JyB8fCBpbnB1dC50eXBlID09PSAncmFkaW8nO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICBhc0FycmF5KGlucHV0cykuZmlsdGVyKGlzQ2hlY2thYmxlKVxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCdjaGVja2VkJywgJycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnJlbW92ZUF0dHJpYnV0ZSgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGFzQXJyYXkoaW5wdXRzKS5maWx0ZXIoZnVuY3Rpb24gKGlucHV0KSB7IHJldHVybiAhaXNDaGVja2FibGUoaW5wdXQpOyB9KVxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCd2YWx1ZScsIGlucHV0LnZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGFzQXJyYXkodGV4dGFyZWFzKVxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKHRleHRhcmVhKSB7XG4gICAgICAgICAgICAgICAgdGV4dGFyZWEudGV4dENvbnRlbnQgPSB0ZXh0YXJlYS52YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBtb2R1bGUucmV3cml0ZVRhZ05hbWVTZWxlY3RvcnNUb0xvd2VyQ2FzZSA9IGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgZG9jdW1lbnRVdGlsLmxvd2VyY2FzZUNzc1R5cGVTZWxlY3RvcnMoZG9jLCBkb2N1bWVudFV0aWwuZmluZEh0bWxPbmx5Tm9kZU5hbWVzKGRvYykpO1xuICAgIH07XG5cbiAgICByZXR1cm4gbW9kdWxlO1xufShkb2N1bWVudFV0aWwpKTtcblxudmFyIG1lZGlhUXVlcnlIZWxwZXIgPSAoZnVuY3Rpb24gKGNzc01lZGlhUXVlcnkpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBtb2R1bGUgPSB7fTtcblxuICAgIHZhciBzdmdJbWdCbHVlQnlFbU1lZGlhUXVlcnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzdmcgPSAnPHN2ZyBpZD1cInN2Z1wiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB3aWR0aD1cIjEwXCIgaGVpZ2h0PVwiMTBcIj4nICtcbiAgICAgICAgICAgICAgICAnPHN0eWxlPkBtZWRpYSAobWF4LXdpZHRoOiAxZW0pIHsgc3ZnIHsgYmFja2dyb3VuZDogIzAwZjsgfSB9PC9zdHlsZT4nICtcbiAgICAgICAgICAgICAgICAnPC9zdmc+JztcblxuICAgICAgICB2YXIgdXJsID0gXCJkYXRhOmltYWdlL3N2Zyt4bWw7Y2hhcnNldD11dGYtOCxcIiArIGVuY29kZVVSSUNvbXBvbmVudChzdmcpLFxuICAgICAgICAgICAgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cbiAgICAgICAgaW1nLnNyYyA9IHVybDtcblxuICAgICAgICByZXR1cm4gaW1nO1xuICAgIH07XG5cbiAgICB2YXIgZmlyc3RQaXhlbEhhc0NvbG9yID0gZnVuY3Rpb24gKGltZywgciwgZywgYikge1xuICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcbiAgICAgICAgY2FudmFzLndpZHRoID0gaW1nLndpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaW1nLmhlaWdodDtcblxuICAgICAgICB2YXIgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIiksXG4gICAgICAgICAgICBkYXRhO1xuXG4gICAgICAgIGNvbnRleHQuZHJhd0ltYWdlKGltZywgMCwgMCk7XG4gICAgICAgIGRhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCAxLCAxKS5kYXRhO1xuICAgICAgICByZXR1cm4gZGF0YVswXSA9PT0gciAmJiBkYXRhWzFdID09PSBnICYmIGRhdGFbMl0gPT09IGI7XG4gICAgfTtcblxuICAgIHZhciBoYXNFbU1lZGlhUXVlcnlJc3N1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGltZyA9IHN2Z0ltZ0JsdWVCeUVtTWVkaWFRdWVyeSgpLFxuICAgICAgICAgICAgZGVmZXIgPSBheWVwcm9taXNlLmRlZmVyKCk7XG5cbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYm9keScpLmFwcGVuZENoaWxkKGltZyk7XG5cbiAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHknKS5yZW1vdmVDaGlsZChpbWcpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBkZWZlci5yZXNvbHZlKCFmaXJzdFBpeGVsSGFzQ29sb3IoaW1nLCAwLCAwLCAyNTUpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBGYWlscyBpbiBQaGFudG9tSlMsIGxldCdzIGFzc3VtZSB0aGUgaXNzdWUgZXhpc3RzXG4gICAgICAgICAgICAgICAgZGVmZXIucmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaW1nLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkZWZlci5yZWplY3QoKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gZGVmZXIucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyIGhhc0VtSXNzdWU7XG5cbiAgICBtb2R1bGUubmVlZHNFbVdvcmthcm91bmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChoYXNFbUlzc3VlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGhhc0VtSXNzdWUgPSBoYXNFbU1lZGlhUXVlcnlJc3N1ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBoYXNFbUlzc3VlO1xuICAgIH07XG5cbiAgICB2YXIgYXNBcnJheSA9IGZ1bmN0aW9uIChhcnJheUxpa2UpIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycmF5TGlrZSk7XG4gICAgfTtcblxuICAgIHZhciBjc3NSdWxlc1RvVGV4dCA9IGZ1bmN0aW9uIChjc3NSdWxlcykge1xuICAgICAgICByZXR1cm4gYXNBcnJheShjc3NSdWxlcykubWFwKGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgICAgICByZXR1cm4gcnVsZS5jc3NUZXh0O1xuICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICB9O1xuXG4gICAgdmFyIG1lZGlhUXVlcnlSdWxlID0gZnVuY3Rpb24gKG1lZGlhUXVlcnksIGNzc1J1bGVzKSB7XG4gICAgICAgIHJldHVybiAnQG1lZGlhICcgKyBtZWRpYVF1ZXJ5ICsgJ3snICtcbiAgICAgICAgICAgIGNzc1J1bGVzVG9UZXh0KGNzc1J1bGVzKSArXG4gICAgICAgICAgICAnfSc7XG4gICAgfTtcblxuICAgIHZhciBleGNoYW5nZVJ1bGVXaXRoTmV3Q29udGVudCA9IGZ1bmN0aW9uIChzdHlsZVNoZWV0LCBydWxlSWR4LCBuZXdSdWxlVGV4dCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3R5bGVTaGVldC5pbnNlcnRSdWxlKG5ld1J1bGVUZXh0LCBydWxlSWR4KzEpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBJbiBjYXNlIHRoZSBicm93c2VyIGRvZXMgbm90IGxpa2Ugb3VyIG5ldyBydWxlIHdlIGp1c3Qga2VlcCB0aGUgZXhpc3Rpbmcgb25lIGFuZCBxdWlldGx5IGxlYXZlXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3R5bGVTaGVldC5kZWxldGVSdWxlKHJ1bGVJZHgpO1xuICAgIH07XG5cbiAgICB2YXIgY2hhbmdlQ3NzUnVsZSA9IGZ1bmN0aW9uIChydWxlLCBuZXdSdWxlVGV4dCkge1xuICAgICAgICB2YXIgc3R5bGVTaGVldCA9IHJ1bGUucGFyZW50U3R5bGVTaGVldCxcbiAgICAgICAgICAgIHJ1bGVJZHggPSBhc0FycmF5KHN0eWxlU2hlZXQuY3NzUnVsZXMpLmluZGV4T2YocnVsZSk7XG5cbiAgICAgICAgZXhjaGFuZ2VSdWxlV2l0aE5ld0NvbnRlbnQoc3R5bGVTaGVldCwgcnVsZUlkeCwgbmV3UnVsZVRleHQpO1xuICAgIH07XG5cbiAgICB2YXIgcmV3cml0ZVN0eWxlQ29udGVudCA9IGZ1bmN0aW9uIChzdHlsZUVsZW1lbnQpIHtcbiAgICAgICAgc3R5bGVFbGVtZW50LnRleHRDb250ZW50ID0gY3NzUnVsZXNUb1RleHQoc3R5bGVFbGVtZW50LnNoZWV0LmNzc1J1bGVzKTtcbiAgICB9O1xuXG4gICAgdmFyIHNlcmlhbGl6ZUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoZXhwKSB7XG4gICAgICAgIHZhciBmZWF0dXJlID0gZXhwLm1vZGlmaWVyID8gZXhwLm1vZGlmaWVyICsgJy0nICsgZXhwLmZlYXR1cmUgOiBleHAuZmVhdHVyZTtcbiAgICAgICAgaWYgKGV4cC52YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuICcoJyArIGZlYXR1cmUgKyAnOiAnICsgZXhwLnZhbHVlICsgJyknO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICcoJyArIGZlYXR1cmUgKyAnKSc7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHNlcmlhbGl6ZVF1ZXJ5UGFydCA9IGZ1bmN0aW9uIChxKSB7XG4gICAgICAgIHZhciBzZWdtZW50cyA9IFtdO1xuXG4gICAgICAgIGlmIChxLmludmVyc2UpIHtcbiAgICAgICAgICAgIHNlZ21lbnRzLnB1c2goXCJub3RcIik7XG4gICAgICAgIH1cblxuICAgICAgICBzZWdtZW50cy5wdXNoKHEudHlwZSk7XG5cbiAgICAgICAgaWYgKHEuZXhwcmVzc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgc2VnbWVudHMucHVzaCgnYW5kICcgKyBxLmV4cHJlc3Npb25zLm1hcChzZXJpYWxpemVFeHByZXNzaW9uKS5qb2luKCcgYW5kICcpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZWdtZW50cy5qb2luKCcgJyk7XG4gICAgfTtcblxuICAgIC8vIHBvb3IgbWFuJ3MgdGVzdGFiaWxpdHlcbiAgICBtb2R1bGUuc2VyaWFsaXplUXVlcnkgPSBmdW5jdGlvbiAocSkge1xuICAgICAgICB2YXIgcXVlcnlQYXJ0cyA9IHEubWFwKHNlcmlhbGl6ZVF1ZXJ5UGFydCk7XG4gICAgICAgIHJldHVybiBxdWVyeVBhcnRzLmpvaW4oJywgJyk7XG4gICAgfTtcblxuICAgIHZhciB0cmFuc2Zvcm1FbUludG9QeCA9IGZ1bmN0aW9uIChlbSkge1xuICAgICAgICByZXR1cm4gZW0gKiAxNjtcbiAgICB9O1xuXG4gICAgdmFyIHJlcGxhY2VFbVZhbHVlV2l0aFB4ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIE1hdGNoIGEgbnVtYmVyIHdpdGggZW0gdW5pdC4gRG9lc24ndCBtYXRjaCBhbGwsIGJ1dCBzaG91bGQgYmUgZW5vdWdoIGZvciBub3dcbiAgICAgICAgdmFyIG1hdGNoID0gL14oKD86XFxkK1xcLik/XFxkKyllbS8uZXhlYyh2YWx1ZSk7XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIHRyYW5zZm9ybUVtSW50b1B4KHBhcnNlRmxvYXQobWF0Y2hbMV0pKSArICdweCc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG5cbiAgICB2YXIgc3Vic3RpdHV0ZUVtV2l0aFB4ID0gZnVuY3Rpb24gKG1lZGlhUXVlcnkpIHtcbiAgICAgICAgdmFyIHBhcnNlZFF1ZXJ5ID0gY3NzTWVkaWFRdWVyeS5wYXJzZShtZWRpYVF1ZXJ5KSxcbiAgICAgICAgICAgIGhhc0NoYW5nZXMgPSBmYWxzZTtcblxuICAgICAgICBwYXJzZWRRdWVyeS5mb3JFYWNoKGZ1bmN0aW9uIChxKSB7XG4gICAgICAgICAgICBxLmV4cHJlc3Npb25zLmZvckVhY2goZnVuY3Rpb24gKGV4cCkge1xuICAgICAgICAgICAgICAgIHZhciByZXdyaXR0ZW5WYWx1ZSA9IHJlcGxhY2VFbVZhbHVlV2l0aFB4KGV4cC52YWx1ZSk7XG5cbiAgICAgICAgICAgICAgICBoYXNDaGFuZ2VzIHw9IHJld3JpdHRlblZhbHVlICE9PSBleHAudmFsdWU7XG4gICAgICAgICAgICAgICAgZXhwLnZhbHVlID0gcmV3cml0dGVuVmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGhhc0NoYW5nZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBtb2R1bGUuc2VyaWFsaXplUXVlcnkocGFyc2VkUXVlcnkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciByZXBsYWNlRW1zV2l0aFB4ID0gZnVuY3Rpb24gKG1lZGlhUXVlcnlSdWxlcykge1xuICAgICAgICB2YXIgYW55UnVsZUhhc0NoYW5nZXMgPSBmYWxzZTtcblxuICAgICAgICBtZWRpYVF1ZXJ5UnVsZXMuZm9yRWFjaChmdW5jdGlvbiAocnVsZSkge1xuICAgICAgICAgICAgdmFyIHJld3JpdHRlbk1lZGlhUXVlcnkgPSBzdWJzdGl0dXRlRW1XaXRoUHgocnVsZS5tZWRpYS5tZWRpYVRleHQpO1xuXG4gICAgICAgICAgICBpZiAocmV3cml0dGVuTWVkaWFRdWVyeSkge1xuICAgICAgICAgICAgICAgIGNoYW5nZUNzc1J1bGUocnVsZSwgbWVkaWFRdWVyeVJ1bGUocmV3cml0dGVuTWVkaWFRdWVyeSwgcnVsZS5jc3NSdWxlcykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhbnlSdWxlSGFzQ2hhbmdlcyB8PSAhIXJld3JpdHRlbk1lZGlhUXVlcnk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBhbnlSdWxlSGFzQ2hhbmdlcztcbiAgICB9O1xuXG4gICAgbW9kdWxlLndvcmtBcm91bmRXZWJLaXRFbVNpemVJc3N1ZSA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xuICAgICAgICB2YXIgc3R5bGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnc3R5bGUnKTtcblxuICAgICAgICBhc0FycmF5KHN0eWxlcykuZm9yRWFjaChmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICAgICAgICAgIHZhciBtZWRpYVF1ZXJ5UnVsZXMgPSBhc0FycmF5KHN0eWxlLnNoZWV0LmNzc1J1bGVzKS5maWx0ZXIoZnVuY3Rpb24gKHJ1bGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnVsZS50eXBlID09PSB3aW5kb3cuQ1NTUnVsZS5NRURJQV9SVUxFO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBoYXNDaGFuZ2VzID0gcmVwbGFjZUVtc1dpdGhQeChtZWRpYVF1ZXJ5UnVsZXMpO1xuICAgICAgICAgICAgaWYgKGhhc0NoYW5nZXMpIHtcbiAgICAgICAgICAgICAgICByZXdyaXRlU3R5bGVDb250ZW50KHN0eWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBtb2R1bGU7XG59KGNzc01lZGlhUXVlcnkpKTtcblxudmFyIGJyb3dzZXIgPSAoZnVuY3Rpb24gKHV0aWwsIHByb3hpZXMsIGF5ZXByb21pc2UsIHNhbmVkb21wYXJzZXJlcnJvciwgdGhlV2luZG93KSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgbW9kdWxlID0ge307XG5cbiAgICB2YXIgY3JlYXRlSGlkZGVuRWxlbWVudCA9IGZ1bmN0aW9uIChkb2MsIHRhZ05hbWUsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2MuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgICAgICAgLy8gJ2Rpc3BsYXk6IG5vbmUnIGRvZXNuJ3QgY3V0IGl0LCBhcyBicm93c2VycyBzZWVtIHRvIGJlIGxhenkgbG9hZGluZyBDU1NcbiAgICAgICAgZWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcbiAgICAgICAgZWxlbWVudC5zdHlsZS53aWR0aCA9IHdpZHRoICsgXCJweFwiO1xuICAgICAgICBlbGVtZW50LnN0eWxlLmhlaWdodCA9IGhlaWdodCArIFwicHhcIjtcbiAgICAgICAgZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgICAgICAgZWxlbWVudC5zdHlsZS50b3AgPSAoLTEwMDAwIC0gaGVpZ2h0KSArIFwicHhcIjtcbiAgICAgICAgZWxlbWVudC5zdHlsZS5sZWZ0ID0gKC0xMDAwMCAtIHdpZHRoKSArIFwicHhcIjtcbiAgICAgICAgLy8gV2UgbmVlZCB0byBhZGQgdGhlIGVsZW1lbnQgdG8gdGhlIGRvY3VtZW50IHNvIHRoYXQgaXRzIGNvbnRlbnQgZ2V0cyBsb2FkZWRcbiAgICAgICAgZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYm9keVwiKVswXS5hcHBlbmRDaGlsZChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfTtcblxuICAgIG1vZHVsZS5leGVjdXRlSmF2YXNjcmlwdCA9IGZ1bmN0aW9uIChkb2MsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGlmcmFtZSA9IGNyZWF0ZUhpZGRlbkVsZW1lbnQodGhlV2luZG93LmRvY3VtZW50LCBcImlmcmFtZVwiLCBvcHRpb25zLndpZHRoLCBvcHRpb25zLmhlaWdodCksXG4gICAgICAgICAgICBodG1sID0gZG9jLmRvY3VtZW50RWxlbWVudC5vdXRlckhUTUwsXG4gICAgICAgICAgICBpZnJhbWVFcnJvcnNNZXNzYWdlcyA9IFtdLFxuICAgICAgICAgICAgZGVmZXIgPSBheWVwcm9taXNlLmRlZmVyKCksXG4gICAgICAgICAgICB0aW1lb3V0ID0gb3B0aW9ucy5leGVjdXRlSnNUaW1lb3V0IHx8IDA7XG5cbiAgICAgICAgdmFyIGRvUmVzb2x2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBkb2MgPSBpZnJhbWUuY29udGVudERvY3VtZW50O1xuICAgICAgICAgICAgdGhlV2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYm9keVwiKVswXS5yZW1vdmVDaGlsZChpZnJhbWUpO1xuICAgICAgICAgICAgZGVmZXIucmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQ6IGRvYyxcbiAgICAgICAgICAgICAgICBlcnJvcnM6IGlmcmFtZUVycm9yc01lc3NhZ2VzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgd2FpdEZvckphdmFTY3JpcHRUb1J1biA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBkID0gYXllcHJvbWlzZS5kZWZlcigpO1xuICAgICAgICAgICAgaWYgKHRpbWVvdXQgPiAwKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChkLnJlc29sdmUsIHRpbWVvdXQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkLnJlc29sdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkLnByb21pc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWZyYW1lLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHdhaXRGb3JKYXZhU2NyaXB0VG9SdW4oKVxuICAgICAgICAgICAgICAgIC50aGVuKGZpbmlzaE5vdGlmeVhoclByb3h5LndhaXRGb3JSZXF1ZXN0c1RvRmluaXNoKVxuICAgICAgICAgICAgICAgIC50aGVuKGRvUmVzb2x2ZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHhociA9IGlmcmFtZS5jb250ZW50V2luZG93LlhNTEh0dHBSZXF1ZXN0LFxuICAgICAgICAgICAgZmluaXNoTm90aWZ5WGhyUHJveHkgPSBwcm94aWVzLmZpbmlzaE5vdGlmeWluZ1hocih4aHIpLFxuICAgICAgICAgICAgYmFzZVVybFhoclByb3h5ID0gcHJveGllcy5iYXNlVXJsUmVzcGVjdGluZ1hocihmaW5pc2hOb3RpZnlYaHJQcm94eSwgb3B0aW9ucy5iYXNlVXJsKTtcblxuICAgICAgICBpZnJhbWUuY29udGVudERvY3VtZW50Lm9wZW4oKTtcbiAgICAgICAgaWZyYW1lLmNvbnRlbnRXaW5kb3cuWE1MSHR0cFJlcXVlc3QgPSBiYXNlVXJsWGhyUHJveHk7XG4gICAgICAgIGlmcmFtZS5jb250ZW50V2luZG93Lm9uZXJyb3IgPSBmdW5jdGlvbiAobXNnKSB7XG4gICAgICAgICAgICBpZnJhbWVFcnJvcnNNZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICByZXNvdXJjZVR5cGU6IFwic2NyaXB0RXhlY3V0aW9uXCIsXG4gICAgICAgICAgICAgICAgbXNnOiBtc2dcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmcmFtZS5jb250ZW50RG9jdW1lbnQud3JpdGUoJzwhRE9DVFlQRSBodG1sPicpO1xuICAgICAgICBpZnJhbWUuY29udGVudERvY3VtZW50LndyaXRlKGh0bWwpO1xuICAgICAgICBpZnJhbWUuY29udGVudERvY3VtZW50LmNsb3NlKCk7XG5cbiAgICAgICAgcmV0dXJuIGRlZmVyLnByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciBjcmVhdGVIaWRkZW5TYW5kYm94ZWRJRnJhbWUgPSBmdW5jdGlvbiAoZG9jLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBpZnJhbWUgPSBkb2MuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgIGlmcmFtZS5zdHlsZS53aWR0aCA9IHdpZHRoICsgXCJweFwiO1xuICAgICAgICBpZnJhbWUuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAvLyAnZGlzcGxheTogbm9uZScgZG9lc24ndCBjdXQgaXQsIGFzIGJyb3dzZXJzIHNlZW0gdG8gYmUgbGF6eSBsb2FkaW5nIGNvbnRlbnRcbiAgICAgICAgaWZyYW1lLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xuICAgICAgICBpZnJhbWUuc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICAgIGlmcmFtZS5zdHlsZS50b3AgPSAoLTEwMDAwIC0gaGVpZ2h0KSArIFwicHhcIjtcbiAgICAgICAgaWZyYW1lLnN0eWxlLmxlZnQgPSAoLTEwMDAwIC0gd2lkdGgpICsgXCJweFwiO1xuICAgICAgICAvLyBEb24ndCBleGVjdXRlIEpTLCBhbGwgd2UgbmVlZCBmcm9tIHNhbmRib3hpbmcgaXMgYWNjZXNzIHRvIHRoZSBpZnJhbWUncyBkb2N1bWVudFxuICAgICAgICBpZnJhbWUuc2FuZGJveCA9ICdhbGxvdy1zYW1lLW9yaWdpbic7XG4gICAgICAgIC8vIERvbid0IGluY2x1ZGUgYSBzY3JvbGxiYXIgb24gTGludXhcbiAgICAgICAgaWZyYW1lLnNjcm9sbGluZyA9ICdubyc7XG4gICAgICAgIHJldHVybiBpZnJhbWU7XG4gICAgfTtcblxuICAgIHZhciBjcmVhdGVJZnJhbWVXaXRoU2l6ZUF0Wm9vbUxldmVsMSA9IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0LCB6b29tKSB7XG4gICAgICAgIHZhciBzY2FsZWRWaWV3cG9ydFdpZHRoID0gTWF0aC5mbG9vcih3aWR0aCAvIHpvb20pLFxuICAgICAgICAgICAgc2NhbGVkVmlld3BvcnRIZWlnaHQgPSBNYXRoLmZsb29yKGhlaWdodCAvIHpvb20pO1xuXG4gICAgICAgIHJldHVybiBjcmVhdGVIaWRkZW5TYW5kYm94ZWRJRnJhbWUodGhlV2luZG93LmRvY3VtZW50LCBzY2FsZWRWaWV3cG9ydFdpZHRoLCBzY2FsZWRWaWV3cG9ydEhlaWdodCk7XG4gICAgfTtcblxuICAgIHZhciBjYWxjdWxhdGVab29tZWRDb250ZW50U2l6ZUFuZFJvdW5kVXAgPSBmdW5jdGlvbiAoYWN0dWFsVmlld3BvcnQsIHJlcXVlc3RlZFdpZHRoLCByZXF1ZXN0ZWRIZWlnaHQsIHpvb20pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdpZHRoOiBNYXRoLm1heChhY3R1YWxWaWV3cG9ydC53aWR0aCAqIHpvb20sIHJlcXVlc3RlZFdpZHRoKSxcbiAgICAgICAgICAgIGhlaWdodDogTWF0aC5tYXgoYWN0dWFsVmlld3BvcnQuaGVpZ2h0ICogem9vbSwgcmVxdWVzdGVkSGVpZ2h0KVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgY2FsY3VsYXRlQ29udGVudFNpemUgPSBmdW5jdGlvbiAoZG9jLCBzZWxlY3RvciwgcmVxdWVzdGVkV2lkdGgsIHJlcXVlc3RlZEhlaWdodCwgem9vbSkge1xuICAgICAgICAgICAgLy8gY2xpZW50V2lkdGgvY2xpZW50SGVpZ2h0IG5lZWRlZCBmb3IgUGhhbnRvbUpTXG4gICAgICAgIHZhciBhY3R1YWxWaWV3cG9ydFdpZHRoID0gTWF0aC5tYXgoZG9jLmRvY3VtZW50RWxlbWVudC5zY3JvbGxXaWR0aCwgZG9jLmJvZHkuY2xpZW50V2lkdGgpLFxuICAgICAgICAgICAgYWN0dWFsVmlld3BvcnRIZWlnaHQgPSBNYXRoLm1heChkb2MuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCwgZG9jLmJvZHkuc2Nyb2xsSGVpZ2h0LCBkb2MuYm9keS5jbGllbnRIZWlnaHQpLFxuICAgICAgICAgICAgdG9wLCBsZWZ0LCBvcmlnaW5hbFdpZHRoLCBvcmlnaW5hbEhlaWdodCwgcm9vdEZvbnRTaXplLFxuICAgICAgICAgICAgZWxlbWVudCwgcmVjdCwgY29udGVudFNpemU7XG5cbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBlbGVtZW50ID0gZG9jLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuXG4gICAgICAgICAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiQ2xpcHBpbmcgc2VsZWN0b3Igbm90IGZvdW5kXCJcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICAgICAgdG9wID0gcmVjdC50b3A7XG4gICAgICAgICAgICBsZWZ0ID0gcmVjdC5sZWZ0O1xuICAgICAgICAgICAgb3JpZ2luYWxXaWR0aCA9IHJlY3Qud2lkdGg7XG4gICAgICAgICAgICBvcmlnaW5hbEhlaWdodCA9IHJlY3QuaGVpZ2h0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdG9wID0gMDtcbiAgICAgICAgICAgIGxlZnQgPSAwO1xuICAgICAgICAgICAgb3JpZ2luYWxXaWR0aCA9IGFjdHVhbFZpZXdwb3J0V2lkdGg7XG4gICAgICAgICAgICBvcmlnaW5hbEhlaWdodCA9IGFjdHVhbFZpZXdwb3J0SGVpZ2h0O1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGVudFNpemUgPSBjYWxjdWxhdGVab29tZWRDb250ZW50U2l6ZUFuZFJvdW5kVXAoe1xuICAgICAgICAgICAgICAgIHdpZHRoOiBvcmlnaW5hbFdpZHRoLFxuICAgICAgICAgICAgICAgIGhlaWdodDogb3JpZ2luYWxIZWlnaHRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXF1ZXN0ZWRXaWR0aCxcbiAgICAgICAgICAgIHJlcXVlc3RlZEhlaWdodCxcbiAgICAgICAgICAgIHpvb20pO1xuXG4gICAgICAgIHJvb3RGb250U2l6ZSA9IHRoZVdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGRvYy5kb2N1bWVudEVsZW1lbnQpLmZvbnRTaXplO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBsZWZ0OiBsZWZ0LFxuICAgICAgICAgICAgdG9wOiB0b3AsXG4gICAgICAgICAgICB3aWR0aDogY29udGVudFNpemUud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IGNvbnRlbnRTaXplLmhlaWdodCxcbiAgICAgICAgICAgIHZpZXdwb3J0V2lkdGg6IGFjdHVhbFZpZXdwb3J0V2lkdGgsXG4gICAgICAgICAgICB2aWV3cG9ydEhlaWdodDogYWN0dWFsVmlld3BvcnRIZWlnaHQsXG5cbiAgICAgICAgICAgIHJvb3RGb250U2l6ZTogcm9vdEZvbnRTaXplXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIG1vZHVsZS5jYWxjdWxhdGVEb2N1bWVudENvbnRlbnRTaXplID0gZnVuY3Rpb24gKGRvYywgb3B0aW9ucykge1xuICAgICAgICB2YXIgaHRtbCA9IGRvYy5kb2N1bWVudEVsZW1lbnQub3V0ZXJIVE1MLFxuICAgICAgICAgICAgZGVmZXIgPSBheWVwcm9taXNlLmRlZmVyKCksXG4gICAgICAgICAgICB6b29tID0gb3B0aW9ucy56b29tIHx8IDEsXG4gICAgICAgICAgICBpZnJhbWU7XG5cblxuICAgICAgICBpZnJhbWUgPSBjcmVhdGVJZnJhbWVXaXRoU2l6ZUF0Wm9vbUxldmVsMShvcHRpb25zLndpZHRoLCBvcHRpb25zLmhlaWdodCwgem9vbSk7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gYWRkIHRoZSBlbGVtZW50IHRvIHRoZSBkb2N1bWVudCBzbyB0aGF0IGl0cyBjb250ZW50IGdldHMgbG9hZGVkXG4gICAgICAgIHRoZVdpbmRvdy5kb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJvZHlcIilbMF0uYXBwZW5kQ2hpbGQoaWZyYW1lKTtcblxuICAgICAgICBpZnJhbWUub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGRvYyA9IGlmcmFtZS5jb250ZW50RG9jdW1lbnQsXG4gICAgICAgICAgICAgICAgc2l6ZTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzaXplID0gY2FsY3VsYXRlQ29udGVudFNpemUoZG9jLCBvcHRpb25zLmNsaXAsIG9wdGlvbnMud2lkdGgsIG9wdGlvbnMuaGVpZ2h0LCB6b29tKTtcblxuICAgICAgICAgICAgICAgIGRlZmVyLnJlc29sdmUoc2l6ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgZGVmZXIucmVqZWN0KGUpO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICB0aGVXaW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJib2R5XCIpWzBdLnJlbW92ZUNoaWxkKGlmcmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gc3JjZG9jIGRvZXNuJ3Qgd29yayBpbiBQaGFudG9tSlMgeWV0XG4gICAgICAgIGlmcmFtZS5jb250ZW50RG9jdW1lbnQub3BlbigpO1xuICAgICAgICBpZnJhbWUuY29udGVudERvY3VtZW50LndyaXRlKCc8IURPQ1RZUEUgaHRtbD4nKTtcbiAgICAgICAgaWZyYW1lLmNvbnRlbnREb2N1bWVudC53cml0ZShodG1sKTtcbiAgICAgICAgaWZyYW1lLmNvbnRlbnREb2N1bWVudC5jbG9zZSgpO1xuXG4gICAgICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgYWRkSFRNTFRhZ0F0dHJpYnV0ZXMgPSBmdW5jdGlvbiAoZG9jLCBodG1sKSB7XG4gICAgICAgIHZhciBhdHRyaWJ1dGVNYXRjaCA9IC88aHRtbCgoPzpcXHMrW14+XSopPyk+L2ltLmV4ZWMoaHRtbCksXG4gICAgICAgICAgICBoZWxwZXJEb2MgPSB0aGVXaW5kb3cuZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlSFRNTERvY3VtZW50KCcnKSxcbiAgICAgICAgICAgIGh0bWxUYWdTdWJzdGl0dXRlLFxuICAgICAgICAgICAgaSwgZWxlbWVudFN1YnN0aXR1dGUsIGF0dHJpYnV0ZTtcblxuICAgICAgICBpZiAoIWF0dHJpYnV0ZU1hdGNoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBodG1sVGFnU3Vic3RpdHV0ZSA9ICc8ZGl2JyArIGF0dHJpYnV0ZU1hdGNoWzFdICsgJz48L2Rpdj4nO1xuICAgICAgICBoZWxwZXJEb2MuZG9jdW1lbnRFbGVtZW50LmlubmVySFRNTCA9IGh0bWxUYWdTdWJzdGl0dXRlO1xuICAgICAgICBlbGVtZW50U3Vic3RpdHV0ZSA9IGhlbHBlckRvYy5xdWVyeVNlbGVjdG9yKCdkaXYnKTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZWxlbWVudFN1YnN0aXR1dGUuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXR0cmlidXRlID0gZWxlbWVudFN1YnN0aXR1dGUuYXR0cmlidXRlc1tpXTtcbiAgICAgICAgICAgIGRvYy5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLCBhdHRyaWJ1dGUudmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG1vZHVsZS5wYXJzZUhUTUwgPSBmdW5jdGlvbiAoaHRtbCkge1xuICAgICAgICAvLyBXZSBzaG91bGQgYmUgdXNpbmcgdGhlIERPTVBhcnNlciwgYnV0IGl0IGlzIG5vdCBzdXBwb3J0ZWQgaW4gb2xkZXIgYnJvd3NlcnNcbiAgICAgICAgdmFyIGRvYyA9IHRoZVdpbmRvdy5kb2N1bWVudC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQoJycpO1xuICAgICAgICBkb2MuZG9jdW1lbnRFbGVtZW50LmlubmVySFRNTCA9IGh0bWw7XG5cbiAgICAgICAgYWRkSFRNTFRhZ0F0dHJpYnV0ZXMoZG9jLCBodG1sKTtcbiAgICAgICAgcmV0dXJuIGRvYztcbiAgICB9O1xuXG4gICAgdmFyIGZhaWxPbkludmFsaWRTb3VyY2UgPSBmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gc2FuZWRvbXBhcnNlcmVycm9yLmZhaWxPblBhcnNlRXJyb3IoZG9jKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhyb3cge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiSW52YWxpZCBzb3VyY2VcIixcbiAgICAgICAgICAgICAgICBvcmlnaW5hbEVycm9yOiBlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG1vZHVsZS52YWxpZGF0ZVhIVE1MID0gZnVuY3Rpb24gKHhodG1sKSB7XG4gICAgICAgIHZhciBwID0gbmV3IERPTVBhcnNlcigpLFxuICAgICAgICAgICAgZG9jID0gcC5wYXJzZUZyb21TdHJpbmcoeGh0bWwsIFwiYXBwbGljYXRpb24veG1sXCIpO1xuXG4gICAgICAgIGZhaWxPbkludmFsaWRTb3VyY2UoZG9jKTtcbiAgICB9O1xuXG4gICAgdmFyIGxhc3RDYWNoZURhdGUgPSBudWxsO1xuXG4gICAgdmFyIGdldFVuY2FjaGFibGVVUkwgPSBmdW5jdGlvbiAodXJsLCBjYWNoZSkge1xuICAgICAgICBpZiAoY2FjaGUgPT09ICdub25lJyB8fCBjYWNoZSA9PT0gJ3JlcGVhdGVkJykge1xuICAgICAgICAgICAgaWYgKGxhc3RDYWNoZURhdGUgPT09IG51bGwgfHwgY2FjaGUgIT09ICdyZXBlYXRlZCcpIHtcbiAgICAgICAgICAgICAgICBsYXN0Q2FjaGVEYXRlID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB1cmwgKyBcIj9fPVwiICsgbGFzdENhY2hlRGF0ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1cmw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGRvRG9jdW1lbnRMb2FkID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICAgICAgICB2YXIgeGhyID0gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpLFxuICAgICAgICAgICAgam9pbmVkVXJsID0gdXRpbC5qb2luVXJsKG9wdGlvbnMuYmFzZVVybCwgdXJsKSxcbiAgICAgICAgICAgIGF1Z21lbnRlZFVybCA9IGdldFVuY2FjaGFibGVVUkwoam9pbmVkVXJsLCBvcHRpb25zLmNhY2hlKSxcbiAgICAgICAgICAgIGRlZmVyID0gYXllcHJvbWlzZS5kZWZlcigpLFxuICAgICAgICAgICAgZG9SZWplY3QgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGRlZmVyLnJlamVjdCh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiVW5hYmxlIHRvIGxvYWQgcGFnZVwiLFxuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbEVycm9yOiBlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIHhoci5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gMjAwIHx8IHhoci5zdGF0dXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBkZWZlci5yZXNvbHZlKHhoci5yZXNwb25zZVhNTCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRvUmVqZWN0KHhoci5zdGF0dXNUZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgIHhoci5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGRvUmVqZWN0KGUpO1xuICAgICAgICB9LCBmYWxzZSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHhoci5vcGVuKCdHRVQnLCBhdWdtZW50ZWRVcmwsIHRydWUpO1xuICAgICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9IFwiZG9jdW1lbnRcIjtcbiAgICAgICAgICAgIHhoci5zZW5kKG51bGwpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBkb1JlamVjdChlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xuICAgIH07XG5cbiAgICBtb2R1bGUubG9hZERvY3VtZW50ID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICAgICAgICByZXR1cm4gZG9Eb2N1bWVudExvYWQodXJsLCBvcHRpb25zKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGRvYykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWlsT25JbnZhbGlkU291cmNlKGRvYyk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG1vZHVsZTtcbn0odXRpbCwgcHJveGllcywgYXllcHJvbWlzZSwgc2FuZWRvbXBhcnNlcmVycm9yLCB3aW5kb3cpKTtcblxudmFyIHN2ZzJpbWFnZSA9IChmdW5jdGlvbiAoYXllcHJvbWlzZSwgd2luZG93KSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgbW9kdWxlID0ge307XG5cbiAgICB2YXIgdXJsRm9yU3ZnID0gZnVuY3Rpb24gKHN2ZywgdXNlQmxvYnMpIHtcbiAgICAgICAgaWYgKHVzZUJsb2JzKSB7XG4gICAgICAgICAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbc3ZnXSwge1widHlwZVwiOiBcImltYWdlL3N2Zyt4bWxcIn0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBcImRhdGE6aW1hZ2Uvc3ZnK3htbDtjaGFyc2V0PXV0Zi04LFwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHN2Zyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNsZWFuVXBVcmwgPSBmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgIGlmICh1cmwgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHNpbXBsZUZvcmVpZ25PYmplY3RTdmcgPSAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCIxXCIgaGVpZ2h0PVwiMVwiPjxmb3JlaWduT2JqZWN0PjwvZm9yZWlnbk9iamVjdD48L3N2Zz4nO1xuXG4gICAgdmFyIHN1cHBvcnRzUmVhZGluZ09iamVjdEZyb21DYW52YXMgPSBmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLFxuICAgICAgICAgICAgaW1hZ2UgPSBuZXcgSW1hZ2UoKSxcbiAgICAgICAgICAgIGRlZmVyID0gYXllcHJvbWlzZS5kZWZlcigpO1xuXG4gICAgICAgIGltYWdlLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIDAsIDApO1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgd2lsbCBmYWlsIGluIENocm9tZSAmIFNhZmFyaVxuICAgICAgICAgICAgICAgIGNhbnZhcy50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIik7XG4gICAgICAgICAgICAgICAgZGVmZXIucmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBkZWZlci5yZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaW1hZ2Uub25lcnJvciA9IGRlZmVyLnJlamVjdDtcbiAgICAgICAgaW1hZ2Uuc3JjID0gdXJsO1xuXG4gICAgICAgIHJldHVybiBkZWZlci5wcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgcmVhZGluZ0JhY2tGcm9tQ2FudmFzQmVuZWZpdHNGcm9tT2xkU2Nob29sRGF0YVVyaXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIENoZWNrIGZvciB3b3JrIGFyb3VuZCBmb3IgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTI5NDEyOVxuICAgICAgICB2YXIgYmxvYlVybCA9IHVybEZvclN2ZyhzaW1wbGVGb3JlaWduT2JqZWN0U3ZnLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHN1cHBvcnRzUmVhZGluZ09iamVjdEZyb21DYW52YXMoYmxvYlVybClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChzdXBwb3J0c1JlYWRpbmdGcm9tQmxvYnMpIHtcbiAgICAgICAgICAgICAgICBjbGVhblVwVXJsKGJsb2JVcmwpO1xuICAgICAgICAgICAgICAgIGlmIChzdXBwb3J0c1JlYWRpbmdGcm9tQmxvYnMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc3VwcG9ydHNSZWFkaW5nT2JqZWN0RnJvbUNhbnZhcyh1cmxGb3JTdmcoc2ltcGxlRm9yZWlnbk9iamVjdFN2ZywgZmFsc2UpKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgc3VwcG9ydHNCbG9iQnVpbGRpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh3aW5kb3cuQmxvYikge1xuICAgICAgICAgICAgLy8gQXZhaWxhYmxlIGFzIGNvbnN0cnVjdG9yIG9ubHkgaW4gbmV3ZXIgYnVpbGRzIGZvciBhbGwgYnJvd3NlcnNcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbmV3IEJsb2IoWyc8Yj48L2I+J10sIHsgXCJ0eXBlXCIgOiBcInRleHQveG1sXCIgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHt9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICB2YXIgY2hlY2tCbG9iU3VwcG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlZmVyID0gYXllcHJvbWlzZS5kZWZlcigpO1xuXG4gICAgICAgIGlmIChzdXBwb3J0c0Jsb2JCdWlsZGluZyAmJiB3aW5kb3cuVVJMKSB7XG4gICAgICAgICAgICByZWFkaW5nQmFja0Zyb21DYW52YXNCZW5lZml0c0Zyb21PbGRTY2hvb2xEYXRhVXJpcygpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGRvZXNCZW5lZml0KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmVyLnJlc29sdmUoISBkb2VzQmVuZWZpdCk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBkZWZlci5yZWplY3QoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlZmVyLnJlc29sdmUoZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRlZmVyLnByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciBjaGVja0ZvckJsb2JzUmVzdWx0O1xuXG4gICAgdmFyIGNoZWNrRm9yQmxvYnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjaGVja0ZvckJsb2JzUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNoZWNrRm9yQmxvYnNSZXN1bHQgPSBjaGVja0Jsb2JTdXBwb3J0KCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hlY2tGb3JCbG9ic1Jlc3VsdDtcbiAgICB9O1xuXG4gICAgdmFyIGJ1aWxkSW1hZ2VVcmwgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHJldHVybiBjaGVja0ZvckJsb2JzKCkudGhlbihmdW5jdGlvbiAodXNlQmxvYnMpIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxGb3JTdmcoc3ZnLCB1c2VCbG9icyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBtb2R1bGUucmVuZGVyU3ZnID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgdXJsLCBpbWFnZSxcbiAgICAgICAgICAgIGRlZmVyID0gYXllcHJvbWlzZS5kZWZlcigpLFxuICAgICAgICAgICAgcmVzZXRFdmVudEhhbmRsZXJzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGltYWdlLm9ubG9hZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgaW1hZ2Uub25lcnJvciA9IG51bGw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2xlYW5VcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFuVXBVcmwodXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIGltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICAgIGltYWdlLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmVzZXRFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgICAgICBjbGVhblVwKCk7XG5cbiAgICAgICAgICAgIGRlZmVyLnJlc29sdmUoaW1hZ2UpO1xuICAgICAgICB9O1xuICAgICAgICBpbWFnZS5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2xlYW5VcCgpO1xuXG4gICAgICAgICAgICAvLyBXZWJraXQgY2FsbHMgdGhlIG9uZXJyb3IgaGFuZGxlciBpZiB0aGUgU1ZHIGlzIGZhdWx0eVxuICAgICAgICAgICAgZGVmZXIucmVqZWN0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgYnVpbGRJbWFnZVVybChzdmcpLnRoZW4oZnVuY3Rpb24gKGltYWdlVXJsKSB7XG4gICAgICAgICAgICB1cmwgPSBpbWFnZVVybDtcbiAgICAgICAgICAgIGltYWdlLnNyYyA9IHVybDtcbiAgICAgICAgfSwgZGVmZXIucmVqZWN0KTtcblxuICAgICAgICByZXR1cm4gZGVmZXIucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG1vZHVsZTtcbn0oYXllcHJvbWlzZSwgd2luZG93KSk7XG5cbnZhciBkb2N1bWVudDJzdmcgPSAoZnVuY3Rpb24gKHV0aWwsIGJyb3dzZXIsIGRvY3VtZW50SGVscGVyLCBtZWRpYVF1ZXJ5SGVscGVyLCB4bWxzZXJpYWxpemVyKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgbW9kdWxlID0ge307XG5cbiAgICB2YXIgc3ZnQXR0cmlidXRlcyA9IGZ1bmN0aW9uIChzaXplLCB6b29tKSB7XG4gICAgICAgIHZhciB6b29tRmFjdG9yID0gem9vbSB8fCAxO1xuXG4gICAgICAgIHZhciBhdHRyaWJ1dGVzID0ge1xuICAgICAgICAgICAgd2lkdGg6IHNpemUud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IHNpemUuaGVpZ2h0LFxuICAgICAgICAgICAgJ2ZvbnQtc2l6ZSc6IHNpemUucm9vdEZvbnRTaXplXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHpvb21GYWN0b3IgIT09IDEpIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMuc3R5bGUgPSAndHJhbnNmb3JtOnNjYWxlKCcgKyB6b29tRmFjdG9yICsgJyk7IHRyYW5zZm9ybS1vcmlnaW46IDAgMDsnO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZXM7XG4gICAgfTtcblxuICAgIHZhciBmb3JlaWduT2JqZWN0QXR0cmlidXRlcyA9IGZ1bmN0aW9uIChzaXplKSB7XG4gICAgICAgIHZhciBjbG9zZXN0U2NhbGVkV2l0aCwgY2xvc2VzdFNjYWxlZEhlaWdodCxcbiAgICAgICAgICAgIG9mZnNldFgsIG9mZnNldFk7XG5cbiAgICAgICAgY2xvc2VzdFNjYWxlZFdpdGggPSBNYXRoLnJvdW5kKHNpemUudmlld3BvcnRXaWR0aCk7XG4gICAgICAgIGNsb3Nlc3RTY2FsZWRIZWlnaHQgPSBNYXRoLnJvdW5kKHNpemUudmlld3BvcnRIZWlnaHQpO1xuXG4gICAgICAgIG9mZnNldFggPSAtc2l6ZS5sZWZ0O1xuICAgICAgICBvZmZzZXRZID0gLXNpemUudG9wO1xuXG4gICAgICAgIHZhciBhdHRyaWJ1dGVzID0ge1xuICAgICAgICAgICAgICd4Jzogb2Zmc2V0WCxcbiAgICAgICAgICAgICAneSc6IG9mZnNldFksXG4gICAgICAgICAgICAgJ3dpZHRoJzogY2xvc2VzdFNjYWxlZFdpdGgsXG4gICAgICAgICAgICAgJ2hlaWdodCc6IGNsb3Nlc3RTY2FsZWRIZWlnaHRcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gYXR0cmlidXRlcztcbiAgICB9O1xuXG4gICAgdmFyIHdvcmtBcm91bmRDb2xsYXBzaW5nTWFyZ2luc0Fjcm9zc1NWR0VsZW1lbnRJbldlYktpdExpa2UgPSBmdW5jdGlvbiAoYXR0cmlidXRlcykge1xuICAgICAgICB2YXIgc3R5bGUgPSBhdHRyaWJ1dGVzLnN0eWxlIHx8ICcnO1xuICAgICAgICBhdHRyaWJ1dGVzLnN0eWxlID0gc3R5bGUgKyAnZmxvYXQ6IGxlZnQ7JztcbiAgICB9O1xuXG4gICAgdmFyIHdvcmtBcm91bmRTYWZhcmlTb21ldGltZXNOb3RTaG93aW5nRXh0ZXJuYWxSZXNvdXJjZXMgPSBmdW5jdGlvbiAoYXR0cmlidXRlcykge1xuICAgICAgICAvKiBMZXQncyBob3BlIHRoYXQgd29ya3Mgc29tZSBtYWdpYy4gVGhlIHNwZWMgc2F5cyBTVkdMb2FkIG9ubHkgZmlyZXNcbiAgICAgICAgICogbm93IHdoZW4gYWxsIGV4dGVybmFscyBhcmUgYXZhaWxhYmxlLlxuICAgICAgICAgKiBodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcvc3RydWN0Lmh0bWwjRXh0ZXJuYWxSZXNvdXJjZXNSZXF1aXJlZCAqL1xuICAgICAgICBhdHRyaWJ1dGVzLmV4dGVybmFsUmVzb3VyY2VzUmVxdWlyZWQgPSB0cnVlO1xuICAgIH07XG5cbiAgICB2YXIgd29ya0Fyb3VuZENocm9tZVNob3dpbmdTY3JvbGxiYXJzVW5kZXJMaW51eElmSHRtbElzT3ZlcmZsb3dTY3JvbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAnPHN0eWxlIHNjb3BlZD1cIlwiPmh0bWw6Oi13ZWJraXQtc2Nyb2xsYmFyIHsgZGlzcGxheTogbm9uZTsgfTwvc3R5bGU+JztcbiAgICB9O1xuXG4gICAgdmFyIHNlcmlhbGl6ZUF0dHJpYnV0ZXMgPSBmdW5jdGlvbiAoYXR0cmlidXRlcykge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpO1xuICAgICAgICBpZiAoIWtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJyAnICsga2V5cy5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIGtleSArICc9XCInICsgYXR0cmlidXRlc1trZXldICsgJ1wiJztcbiAgICAgICAgfSkuam9pbignICcpO1xuICAgIH07XG5cbiAgICB2YXIgY29udmVydERvY3VtZW50VG9TdmcgPSBmdW5jdGlvbiAoZG9jLCBzaXplLCB6b29tRmFjdG9yKSB7XG4gICAgICAgIHZhciB4aHRtbCA9IHhtbHNlcmlhbGl6ZXIuc2VyaWFsaXplVG9TdHJpbmcoZG9jKTtcblxuICAgICAgICBicm93c2VyLnZhbGlkYXRlWEhUTUwoeGh0bWwpO1xuXG4gICAgICAgIHZhciBmb3JlaWduT2JqZWN0QXR0cnMgPSBmb3JlaWduT2JqZWN0QXR0cmlidXRlcyhzaXplKTtcbiAgICAgICAgd29ya0Fyb3VuZENvbGxhcHNpbmdNYXJnaW5zQWNyb3NzU1ZHRWxlbWVudEluV2ViS2l0TGlrZShmb3JlaWduT2JqZWN0QXR0cnMpO1xuICAgICAgICB3b3JrQXJvdW5kU2FmYXJpU29tZXRpbWVzTm90U2hvd2luZ0V4dGVybmFsUmVzb3VyY2VzKGZvcmVpZ25PYmplY3RBdHRycyk7XG5cbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIicgK1xuICAgICAgICAgICAgICAgIHNlcmlhbGl6ZUF0dHJpYnV0ZXMoc3ZnQXR0cmlidXRlcyhzaXplLCB6b29tRmFjdG9yKSkgK1xuICAgICAgICAgICAgICAgICc+JyArXG4gICAgICAgICAgICAgICAgd29ya0Fyb3VuZENocm9tZVNob3dpbmdTY3JvbGxiYXJzVW5kZXJMaW51eElmSHRtbElzT3ZlcmZsb3dTY3JvbGwoKSArXG4gICAgICAgICAgICAgICAgJzxmb3JlaWduT2JqZWN0JyArIHNlcmlhbGl6ZUF0dHJpYnV0ZXMoZm9yZWlnbk9iamVjdEF0dHJzKSArICc+JyArXG4gICAgICAgICAgICAgICAgeGh0bWwgK1xuICAgICAgICAgICAgICAgICc8L2ZvcmVpZ25PYmplY3Q+JyArXG4gICAgICAgICAgICAgICAgJzwvc3ZnPidcbiAgICAgICAgKTtcbiAgICB9O1xuXG4gICAgbW9kdWxlLmdldFN2Z0ZvckRvY3VtZW50ID0gZnVuY3Rpb24gKGRvYywgc2l6ZSwgem9vbUZhY3Rvcikge1xuICAgICAgICBkb2N1bWVudEhlbHBlci5yZXdyaXRlVGFnTmFtZVNlbGVjdG9yc1RvTG93ZXJDYXNlKGRvYyk7XG5cbiAgICAgICAgcmV0dXJuIG1lZGlhUXVlcnlIZWxwZXIubmVlZHNFbVdvcmthcm91bmQoKS50aGVuKGZ1bmN0aW9uIChuZWVkc1dvcmthcm91bmQpIHtcbiAgICAgICAgICAgIGlmIChuZWVkc1dvcmthcm91bmQpIHtcbiAgICAgICAgICAgICAgICBtZWRpYVF1ZXJ5SGVscGVyLndvcmtBcm91bmRXZWJLaXRFbVNpemVJc3N1ZShkb2MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY29udmVydERvY3VtZW50VG9TdmcoZG9jLCBzaXplLCB6b29tRmFjdG9yKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIG1vZHVsZS5kcmF3RG9jdW1lbnRBc1N2ZyA9IGZ1bmN0aW9uIChkb2MsIG9wdGlvbnMpIHtcbiAgICAgICAgWydob3ZlcicsICdhY3RpdmUnLCAnZm9jdXMnLCAndGFyZ2V0J10uZm9yRWFjaChmdW5jdGlvbiAoYWN0aW9uKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9uc1thY3Rpb25dKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnRIZWxwZXIuZmFrZVVzZXJBY3Rpb24oZG9jLCBvcHRpb25zW2FjdGlvbl0sIGFjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBicm93c2VyLmNhbGN1bGF0ZURvY3VtZW50Q29udGVudFNpemUoZG9jLCBvcHRpb25zKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHNpemUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9kdWxlLmdldFN2Z0ZvckRvY3VtZW50KGRvYywgc2l6ZSwgb3B0aW9ucy56b29tKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gbW9kdWxlO1xufSh1dGlsLCBicm93c2VyLCBkb2N1bWVudEhlbHBlciwgbWVkaWFRdWVyeUhlbHBlciwgeG1sc2VyaWFsaXplcikpO1xuXG52YXIgcmFzdGVyaXplID0gKGZ1bmN0aW9uICh1dGlsLCBicm93c2VyLCBkb2N1bWVudEhlbHBlciwgZG9jdW1lbnQyc3ZnLCBzdmcyaW1hZ2UsIGlubGluZXJlc291cmNlcykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIG1vZHVsZSA9IHt9O1xuXG4gICAgdmFyIGdlbmVyYWxEcmF3RXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbWVzc2FnZTogXCJFcnJvciByZW5kZXJpbmcgcGFnZVwiLFxuICAgICAgICAgICAgb3JpZ2luYWxFcnJvcjogZVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgZHJhd1N2Z0FzSW1nID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICByZXR1cm4gc3ZnMmltYWdlLnJlbmRlclN2ZyhzdmcpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoaW1hZ2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBpbWFnZTogaW1hZ2UsXG4gICAgICAgICAgICAgICAgICAgIHN2Zzogc3ZnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZ2VuZXJhbERyYXdFcnJvcihlKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgZHJhd0ltYWdlT25DYW52YXMgPSBmdW5jdGlvbiAoaW1hZ2UsIGNhbnZhcykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY2FudmFzLmdldENvbnRleHQoXCIyZFwiKS5kcmF3SW1hZ2UoaW1hZ2UsIDAsIDApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBGaXJlZm94IHRocm93cyBhICdOU19FUlJPUl9OT1RfQVZBSUxBQkxFJyBpZiB0aGUgU1ZHIGlzIGZhdWx0eVxuICAgICAgICAgICAgdGhyb3cgZ2VuZXJhbERyYXdFcnJvcihlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZG9EcmF3ID0gZnVuY3Rpb24gKGRvYywgY2FudmFzLCBvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudDJzdmcuZHJhd0RvY3VtZW50QXNTdmcoZG9jLCBvcHRpb25zKVxuICAgICAgICAgICAgLnRoZW4oZHJhd1N2Z0FzSW1nKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGlmIChjYW52YXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZHJhd0ltYWdlT25DYW52YXMocmVzdWx0LmltYWdlLCBjYW52YXMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIG9wZXJhdGVKYXZhU2NyaXB0T25Eb2N1bWVudCA9IGZ1bmN0aW9uIChkb2MsIG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIGJyb3dzZXIuZXhlY3V0ZUphdmFzY3JpcHQoZG9jLCBvcHRpb25zKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHZhciBkb2N1bWVudCA9IHJlc3VsdC5kb2N1bWVudDtcbiAgICAgICAgICAgICAgICBkb2N1bWVudEhlbHBlci5wZXJzaXN0SW5wdXRWYWx1ZXMoZG9jdW1lbnQpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQ6IGRvY3VtZW50LFxuICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IHJlc3VsdC5lcnJvcnNcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIG1vZHVsZS5yYXN0ZXJpemUgPSBmdW5jdGlvbiAoZG9jLCBjYW52YXMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGlubGluZU9wdGlvbnM7XG5cbiAgICAgICAgaW5saW5lT3B0aW9ucyA9IHV0aWwuY2xvbmUob3B0aW9ucyk7XG4gICAgICAgIGlubGluZU9wdGlvbnMuaW5saW5lU2NyaXB0cyA9IG9wdGlvbnMuZXhlY3V0ZUpzID09PSB0cnVlO1xuXG4gICAgICAgIHJldHVybiBpbmxpbmVyZXNvdXJjZXMuaW5saW5lUmVmZXJlbmNlcyhkb2MsIGlubGluZU9wdGlvbnMpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZXJyb3JzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZXhlY3V0ZUpzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcGVyYXRlSmF2YVNjcmlwdE9uRG9jdW1lbnQoZG9jLCBvcHRpb25zKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50OiByZXN1bHQuZG9jdW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yczogZXJyb3JzLmNvbmNhdChyZXN1bHQuZXJyb3JzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQ6IGRvYyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yczogZXJyb3JzXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvRHJhdyhyZXN1bHQuZG9jdW1lbnQsIGNhbnZhcywgb3B0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGRyYXdSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2U6IGRyYXdSZXN1bHQuaW1hZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ZnOiBkcmF3UmVzdWx0LnN2ZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IHJlc3VsdC5lcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBtb2R1bGU7XG59KHV0aWwsIGJyb3dzZXIsIGRvY3VtZW50SGVscGVyLCBkb2N1bWVudDJzdmcsIHN2ZzJpbWFnZSwgaW5saW5lcmVzb3VyY2VzKSk7XG5cbnZhciByYXN0ZXJpemVIVE1MID0gKGZ1bmN0aW9uICh1dGlsLCBicm93c2VyLCByYXN0ZXJpemUpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBtb2R1bGUgPSB7fTtcblxuICAgIHZhciBnZXRWaWV3cG9ydFNpemUgPSBmdW5jdGlvbiAoY2FudmFzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBkZWZhdWx0V2lkdGggPSAzMDAsXG4gICAgICAgICAgICBkZWZhdWx0SGVpZ2h0ID0gMjAwLFxuICAgICAgICAgICAgZmFsbGJhY2tXaWR0aCA9IGNhbnZhcyA/IGNhbnZhcy53aWR0aCA6IGRlZmF1bHRXaWR0aCxcbiAgICAgICAgICAgIGZhbGxiYWNrSGVpZ2h0ID0gY2FudmFzID8gY2FudmFzLmhlaWdodCA6IGRlZmF1bHRIZWlnaHQsXG4gICAgICAgICAgICB3aWR0aCA9IG9wdGlvbnMud2lkdGggIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMud2lkdGggOiBmYWxsYmFja1dpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuaGVpZ2h0IDogZmFsbGJhY2tIZWlnaHQ7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdpZHRoOiB3aWR0aCxcbiAgICAgICAgICAgIGhlaWdodDogaGVpZ2h0XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHZhciBjb25zdHJ1Y3RPcHRpb25zID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICB2YXIgdmlld3BvcnQgPSBnZXRWaWV3cG9ydFNpemUocGFyYW1zLmNhbnZhcywgcGFyYW1zLm9wdGlvbnMpLFxuICAgICAgICAgICAgb3B0aW9ucztcblxuICAgICAgICBvcHRpb25zID0gdXRpbC5jbG9uZShwYXJhbXMub3B0aW9ucyk7XG4gICAgICAgIG9wdGlvbnMud2lkdGggPSB2aWV3cG9ydC53aWR0aDtcbiAgICAgICAgb3B0aW9ucy5oZWlnaHQgPSB2aWV3cG9ydC5oZWlnaHQ7XG5cbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERyYXdzIGEgRG9jdW1lbnQgdG8gdGhlIGNhbnZhcy5cbiAgICAgKiByYXN0ZXJpemVIVE1MLmRyYXdEb2N1bWVudCggZG9jdW1lbnQgWywgY2FudmFzXSBbLCBvcHRpb25zXSApLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkgeyAuLi4gfSk7XG4gICAgICovXG4gICAgbW9kdWxlLmRyYXdEb2N1bWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRvYyA9IGFyZ3VtZW50c1swXSxcbiAgICAgICAgICAgIG9wdGlvbmFsQXJndW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcbiAgICAgICAgICAgIHBhcmFtcyA9IHV0aWwucGFyc2VPcHRpb25hbFBhcmFtZXRlcnMob3B0aW9uYWxBcmd1bWVudHMpO1xuXG4gICAgICAgIHJldHVybiByYXN0ZXJpemUucmFzdGVyaXplKGRvYywgcGFyYW1zLmNhbnZhcywgY29uc3RydWN0T3B0aW9ucyhwYXJhbXMpKTtcbiAgICB9O1xuXG4gICAgdmFyIGRyYXdIVE1MID0gZnVuY3Rpb24gKGh0bWwsIGNhbnZhcywgb3B0aW9ucykge1xuICAgICAgICB2YXIgZG9jID0gYnJvd3Nlci5wYXJzZUhUTUwoaHRtbCk7XG5cbiAgICAgICAgcmV0dXJuIG1vZHVsZS5kcmF3RG9jdW1lbnQoZG9jLCBjYW52YXMsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyBhIEhUTUwgc3RyaW5nIHRvIHRoZSBjYW52YXMuXG4gICAgICogcmFzdGVyaXplSFRNTC5kcmF3SFRNTCggaHRtbCBbLCBjYW52YXNdIFssIG9wdGlvbnNdICkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7IC4uLiB9KTtcbiAgICAgKi9cbiAgICBtb2R1bGUuZHJhd0hUTUwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBodG1sID0gYXJndW1lbnRzWzBdLFxuICAgICAgICAgICAgb3B0aW9uYWxBcmd1bWVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuICAgICAgICAgICAgcGFyYW1zID0gdXRpbC5wYXJzZU9wdGlvbmFsUGFyYW1ldGVycyhvcHRpb25hbEFyZ3VtZW50cyk7XG5cbiAgICAgICAgcmV0dXJuIGRyYXdIVE1MKGh0bWwsIHBhcmFtcy5jYW52YXMsIHBhcmFtcy5vcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy8gd29yayBhcm91bmQgaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9OTI1NDkzXG4gICAgdmFyIHdvcmtBcm91bmRGaXJlZm94Tm90TG9hZGluZ1N0eWxlc2hlZXRTdHlsZXMgPSBmdW5jdGlvbiAoZG9jLCB1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGQgPSBkb2N1bWVudC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQoJycpO1xuICAgICAgICBkLnJlcGxhY2VDaGlsZChkb2MuZG9jdW1lbnRFbGVtZW50LCBkLmRvY3VtZW50RWxlbWVudCk7XG5cbiAgICAgICAgdmFyIGV4dGVuZGVkT3B0aW9ucyA9IG9wdGlvbnMgPyB1dGlsLmNsb25lKG9wdGlvbnMpIDoge307XG5cbiAgICAgICAgaWYgKCFvcHRpb25zLmJhc2VVcmwpIHtcbiAgICAgICAgICAgIGV4dGVuZGVkT3B0aW9ucy5iYXNlVXJsID0gdXJsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRvY3VtZW50OiBkLFxuICAgICAgICAgICAgb3B0aW9uczogZXh0ZW5kZWRPcHRpb25zXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHZhciBkcmF3VVJMID0gZnVuY3Rpb24gKHVybCwgY2FudmFzLCBvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBicm93c2VyLmxvYWREb2N1bWVudCh1cmwsIG9wdGlvbnMpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgICAgICAgICAgdmFyIHdvcmthcm91bmQgPSB3b3JrQXJvdW5kRmlyZWZveE5vdExvYWRpbmdTdHlsZXNoZWV0U3R5bGVzKGRvYywgdXJsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9kdWxlLmRyYXdEb2N1bWVudCh3b3JrYXJvdW5kLmRvY3VtZW50LCBjYW52YXMsIHdvcmthcm91bmQub3B0aW9ucyk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRHJhd3MgYSBwYWdlIHRvIHRoZSBjYW52YXMuXG4gICAgICogcmFzdGVyaXplSFRNTC5kcmF3VVJMKCB1cmwgWywgY2FudmFzXSBbLCBvcHRpb25zXSApLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkgeyAuLi4gfSk7XG4gICAgICovXG4gICAgbW9kdWxlLmRyYXdVUkwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1cmwgPSBhcmd1bWVudHNbMF0sXG4gICAgICAgICAgICBvcHRpb25hbEFyZ3VtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG4gICAgICAgICAgICBwYXJhbXMgPSB1dGlsLnBhcnNlT3B0aW9uYWxQYXJhbWV0ZXJzKG9wdGlvbmFsQXJndW1lbnRzKTtcblxuICAgICAgICByZXR1cm4gZHJhd1VSTCh1cmwsIHBhcmFtcy5jYW52YXMsIHBhcmFtcy5vcHRpb25zKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG1vZHVsZTtcbn0odXRpbCwgYnJvd3NlciwgcmFzdGVyaXplKSk7XG5cbnJldHVybiByYXN0ZXJpemVIVE1MO1xuXG59KSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbm5lclhNTCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgdmFyIHMgPSBuZXcgWE1MU2VyaWFsaXplcigpO1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwobm9kZS5jaGlsZE5vZGVzLCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICByZXR1cm4gcy5zZXJpYWxpemVUb1N0cmluZyhub2RlKTtcbiAgICB9KS5qb2luKCcnKTtcbn07XG5cbnZhciBnZXRQYXJzZUVycm9yID0gZnVuY3Rpb24gKGRvYykge1xuICAgIC8vIEZpcmVmb3hcbiAgICBpZiAoZG9jLmRvY3VtZW50RWxlbWVudC50YWdOYW1lID09PSAncGFyc2VyZXJyb3InICYmXG4gICAgICAgIGRvYy5kb2N1bWVudEVsZW1lbnQubmFtZXNwYWNlVVJJID09PSAnaHR0cDovL3d3dy5tb3ppbGxhLm9yZy9uZXdsYXlvdXQveG1sL3BhcnNlcmVycm9yLnhtbCcpIHtcbiAgICAgICAgcmV0dXJuIGRvYy5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfVxuXG4gICAgLy8gQ2hyb21lLCBTYWZhcmlcbiAgICBpZiAoKGRvYy5kb2N1bWVudEVsZW1lbnQudGFnTmFtZSA9PT0gJ3htbCcgfHwgZG9jLmRvY3VtZW50RWxlbWVudC50YWdOYW1lID09PSAnaHRtbCcpICYmXG4gICAgICAgIGRvYy5kb2N1bWVudEVsZW1lbnQuY2hpbGROb2RlcyAmJlxuICAgICAgICBkb2MuZG9jdW1lbnRFbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoID4gMCAmJlxuICAgICAgICBkb2MuZG9jdW1lbnRFbGVtZW50LmNoaWxkTm9kZXNbMF0ubm9kZU5hbWUgPT09ICdwYXJzZXJlcnJvcicpIHtcbiAgICAgICAgcmV0dXJuIGRvYy5kb2N1bWVudEVsZW1lbnQuY2hpbGROb2Rlc1swXTtcbiAgICB9XG5cbiAgICAvLyBQaGFudG9tSlNcbiAgICBpZiAoZG9jLmRvY3VtZW50RWxlbWVudC50YWdOYW1lID09PSAnaHRtbCcgJiZcbiAgICAgICAgZG9jLmRvY3VtZW50RWxlbWVudC5jaGlsZE5vZGVzICYmXG4gICAgICAgIGRvYy5kb2N1bWVudEVsZW1lbnQuY2hpbGROb2Rlcy5sZW5ndGggPiAwICYmXG4gICAgICAgIGRvYy5kb2N1bWVudEVsZW1lbnQuY2hpbGROb2Rlc1swXS5ub2RlTmFtZSA9PT0gJ2JvZHknICYmXG4gICAgICAgIGRvYy5kb2N1bWVudEVsZW1lbnQuY2hpbGROb2Rlc1swXS5jaGlsZE5vZGVzICYmXG4gICAgICAgIGRvYy5kb2N1bWVudEVsZW1lbnQuY2hpbGROb2Rlc1swXS5jaGlsZE5vZGVzLmxlbmd0aCAmJlxuICAgICAgICBkb2MuZG9jdW1lbnRFbGVtZW50LmNoaWxkTm9kZXNbMF0uY2hpbGROb2Rlc1swXS5ub2RlTmFtZSA9PT0gJ3BhcnNlcmVycm9yJykge1xuICAgICAgICByZXR1cm4gZG9jLmRvY3VtZW50RWxlbWVudC5jaGlsZE5vZGVzWzBdLmNoaWxkTm9kZXNbMF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbnZhciBlcnJvck1lc3NhZ2VQYXR0ZXJucyA9IFtcbiAgICAvLyBDaHJvbWUsIFNhZmFyaSwgUGhhbnRvbUpTXG4gICAgbmV3IFJlZ0V4cCgnXjxoM1tePl0qPlRoaXMgcGFnZSBjb250YWlucyB0aGUgZm9sbG93aW5nIGVycm9yczo8XFwvaDM+PGRpdltePl0qPiguKz8pXFxuPzxcXC9kaXY+JyksXG4gICAgLy8gRmlyZWZveFxuICAgIG5ldyBSZWdFeHAoJ14oLispXFxuJylcbl07XG5cbnZhciBleHRyYWN0UGFyc2VFcnJvciA9IGZ1bmN0aW9uIChlcnJvck5vZGUpIHtcbiAgICB2YXIgY29udGVudCA9IGlubmVyWE1MKGVycm9yTm9kZSk7XG4gICAgdmFyIGksIG1hdGNoO1xuXG4gICAgZm9yKGkgPSAwOyBpIDwgZXJyb3JNZXNzYWdlUGF0dGVybnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbWF0Y2ggPSBlcnJvck1lc3NhZ2VQYXR0ZXJuc1tpXS5leGVjKGNvbnRlbnQpO1xuXG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoWzFdO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG52YXIgZmFpbE9uUGFyc2VFcnJvciA9IGZ1bmN0aW9uIChkb2MpIHtcbiAgICB2YXIgZXJyb3JNZXNzYWdlO1xuXG4gICAgaWYgKGRvYyA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BhcnNlIGVycm9yJyk7XG4gICAgfVxuXG4gICAgdmFyIHBhcnNlRXJyb3IgPSBnZXRQYXJzZUVycm9yKGRvYyk7XG4gICAgaWYgKHBhcnNlRXJyb3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBlcnJvck1lc3NhZ2UgPSBleHRyYWN0UGFyc2VFcnJvcihwYXJzZUVycm9yKSB8fCAnUGFyc2UgZXJyb3InO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICB9XG59O1xuXG5leHBvcnRzLmZhaWxPblBhcnNlRXJyb3IgPSBmdW5jdGlvbiAoZG9jKSB7XG4gICAgZmFpbE9uUGFyc2VFcnJvcihkb2MpO1xuXG4gICAgcmV0dXJuIGRvYztcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIHB1bnljb2RlID0gcmVxdWlyZSgncHVueWNvZGUnKTtcblxuZXhwb3J0cy5wYXJzZSA9IHVybFBhcnNlO1xuZXhwb3J0cy5yZXNvbHZlID0gdXJsUmVzb2x2ZTtcbmV4cG9ydHMucmVzb2x2ZU9iamVjdCA9IHVybFJlc29sdmVPYmplY3Q7XG5leHBvcnRzLmZvcm1hdCA9IHVybEZvcm1hdDtcblxuZXhwb3J0cy5VcmwgPSBVcmw7XG5cbmZ1bmN0aW9uIFVybCgpIHtcbiAgdGhpcy5wcm90b2NvbCA9IG51bGw7XG4gIHRoaXMuc2xhc2hlcyA9IG51bGw7XG4gIHRoaXMuYXV0aCA9IG51bGw7XG4gIHRoaXMuaG9zdCA9IG51bGw7XG4gIHRoaXMucG9ydCA9IG51bGw7XG4gIHRoaXMuaG9zdG5hbWUgPSBudWxsO1xuICB0aGlzLmhhc2ggPSBudWxsO1xuICB0aGlzLnNlYXJjaCA9IG51bGw7XG4gIHRoaXMucXVlcnkgPSBudWxsO1xuICB0aGlzLnBhdGhuYW1lID0gbnVsbDtcbiAgdGhpcy5wYXRoID0gbnVsbDtcbiAgdGhpcy5ocmVmID0gbnVsbDtcbn1cblxuLy8gUmVmZXJlbmNlOiBSRkMgMzk4NiwgUkZDIDE4MDgsIFJGQyAyMzk2XG5cbi8vIGRlZmluZSB0aGVzZSBoZXJlIHNvIGF0IGxlYXN0IHRoZXkgb25seSBoYXZlIHRvIGJlXG4vLyBjb21waWxlZCBvbmNlIG9uIHRoZSBmaXJzdCBtb2R1bGUgbG9hZC5cbnZhciBwcm90b2NvbFBhdHRlcm4gPSAvXihbYS16MC05ListXSs6KS9pLFxuICAgIHBvcnRQYXR0ZXJuID0gLzpbMC05XSokLyxcblxuICAgIC8vIFJGQyAyMzk2OiBjaGFyYWN0ZXJzIHJlc2VydmVkIGZvciBkZWxpbWl0aW5nIFVSTHMuXG4gICAgLy8gV2UgYWN0dWFsbHkganVzdCBhdXRvLWVzY2FwZSB0aGVzZS5cbiAgICBkZWxpbXMgPSBbJzwnLCAnPicsICdcIicsICdgJywgJyAnLCAnXFxyJywgJ1xcbicsICdcXHQnXSxcblxuICAgIC8vIFJGQyAyMzk2OiBjaGFyYWN0ZXJzIG5vdCBhbGxvd2VkIGZvciB2YXJpb3VzIHJlYXNvbnMuXG4gICAgdW53aXNlID0gWyd7JywgJ30nLCAnfCcsICdcXFxcJywgJ14nLCAnYCddLmNvbmNhdChkZWxpbXMpLFxuXG4gICAgLy8gQWxsb3dlZCBieSBSRkNzLCBidXQgY2F1c2Ugb2YgWFNTIGF0dGFja3MuICBBbHdheXMgZXNjYXBlIHRoZXNlLlxuICAgIGF1dG9Fc2NhcGUgPSBbJ1xcJyddLmNvbmNhdCh1bndpc2UpLFxuICAgIC8vIENoYXJhY3RlcnMgdGhhdCBhcmUgbmV2ZXIgZXZlciBhbGxvd2VkIGluIGEgaG9zdG5hbWUuXG4gICAgLy8gTm90ZSB0aGF0IGFueSBpbnZhbGlkIGNoYXJzIGFyZSBhbHNvIGhhbmRsZWQsIGJ1dCB0aGVzZVxuICAgIC8vIGFyZSB0aGUgb25lcyB0aGF0IGFyZSAqZXhwZWN0ZWQqIHRvIGJlIHNlZW4sIHNvIHdlIGZhc3QtcGF0aFxuICAgIC8vIHRoZW0uXG4gICAgbm9uSG9zdENoYXJzID0gWyclJywgJy8nLCAnPycsICc7JywgJyMnXS5jb25jYXQoYXV0b0VzY2FwZSksXG4gICAgaG9zdEVuZGluZ0NoYXJzID0gWycvJywgJz8nLCAnIyddLFxuICAgIGhvc3RuYW1lTWF4TGVuID0gMjU1LFxuICAgIGhvc3RuYW1lUGFydFBhdHRlcm4gPSAvXlthLXowLTlBLVpfLV17MCw2M30kLyxcbiAgICBob3N0bmFtZVBhcnRTdGFydCA9IC9eKFthLXowLTlBLVpfLV17MCw2M30pKC4qKSQvLFxuICAgIC8vIHByb3RvY29scyB0aGF0IGNhbiBhbGxvdyBcInVuc2FmZVwiIGFuZCBcInVud2lzZVwiIGNoYXJzLlxuICAgIHVuc2FmZVByb3RvY29sID0ge1xuICAgICAgJ2phdmFzY3JpcHQnOiB0cnVlLFxuICAgICAgJ2phdmFzY3JpcHQ6JzogdHJ1ZVxuICAgIH0sXG4gICAgLy8gcHJvdG9jb2xzIHRoYXQgbmV2ZXIgaGF2ZSBhIGhvc3RuYW1lLlxuICAgIGhvc3RsZXNzUHJvdG9jb2wgPSB7XG4gICAgICAnamF2YXNjcmlwdCc6IHRydWUsXG4gICAgICAnamF2YXNjcmlwdDonOiB0cnVlXG4gICAgfSxcbiAgICAvLyBwcm90b2NvbHMgdGhhdCBhbHdheXMgY29udGFpbiBhIC8vIGJpdC5cbiAgICBzbGFzaGVkUHJvdG9jb2wgPSB7XG4gICAgICAnaHR0cCc6IHRydWUsXG4gICAgICAnaHR0cHMnOiB0cnVlLFxuICAgICAgJ2Z0cCc6IHRydWUsXG4gICAgICAnZ29waGVyJzogdHJ1ZSxcbiAgICAgICdmaWxlJzogdHJ1ZSxcbiAgICAgICdodHRwOic6IHRydWUsXG4gICAgICAnaHR0cHM6JzogdHJ1ZSxcbiAgICAgICdmdHA6JzogdHJ1ZSxcbiAgICAgICdnb3BoZXI6JzogdHJ1ZSxcbiAgICAgICdmaWxlOic6IHRydWVcbiAgICB9LFxuICAgIHF1ZXJ5c3RyaW5nID0gcmVxdWlyZSgncXVlcnlzdHJpbmcnKTtcblxuZnVuY3Rpb24gdXJsUGFyc2UodXJsLCBwYXJzZVF1ZXJ5U3RyaW5nLCBzbGFzaGVzRGVub3RlSG9zdCkge1xuICBpZiAodXJsICYmIGlzT2JqZWN0KHVybCkgJiYgdXJsIGluc3RhbmNlb2YgVXJsKSByZXR1cm4gdXJsO1xuXG4gIHZhciB1ID0gbmV3IFVybDtcbiAgdS5wYXJzZSh1cmwsIHBhcnNlUXVlcnlTdHJpbmcsIHNsYXNoZXNEZW5vdGVIb3N0KTtcbiAgcmV0dXJuIHU7XG59XG5cblVybC5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbih1cmwsIHBhcnNlUXVlcnlTdHJpbmcsIHNsYXNoZXNEZW5vdGVIb3N0KSB7XG4gIGlmICghaXNTdHJpbmcodXJsKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQYXJhbWV0ZXIgJ3VybCcgbXVzdCBiZSBhIHN0cmluZywgbm90IFwiICsgdHlwZW9mIHVybCk7XG4gIH1cblxuICB2YXIgcmVzdCA9IHVybDtcblxuICAvLyB0cmltIGJlZm9yZSBwcm9jZWVkaW5nLlxuICAvLyBUaGlzIGlzIHRvIHN1cHBvcnQgcGFyc2Ugc3R1ZmYgbGlrZSBcIiAgaHR0cDovL2Zvby5jb20gIFxcblwiXG4gIHJlc3QgPSByZXN0LnRyaW0oKTtcblxuICB2YXIgcHJvdG8gPSBwcm90b2NvbFBhdHRlcm4uZXhlYyhyZXN0KTtcbiAgaWYgKHByb3RvKSB7XG4gICAgcHJvdG8gPSBwcm90b1swXTtcbiAgICB2YXIgbG93ZXJQcm90byA9IHByb3RvLnRvTG93ZXJDYXNlKCk7XG4gICAgdGhpcy5wcm90b2NvbCA9IGxvd2VyUHJvdG87XG4gICAgcmVzdCA9IHJlc3Quc3Vic3RyKHByb3RvLmxlbmd0aCk7XG4gIH1cblxuICAvLyBmaWd1cmUgb3V0IGlmIGl0J3MgZ290IGEgaG9zdFxuICAvLyB1c2VyQHNlcnZlciBpcyAqYWx3YXlzKiBpbnRlcnByZXRlZCBhcyBhIGhvc3RuYW1lLCBhbmQgdXJsXG4gIC8vIHJlc29sdXRpb24gd2lsbCB0cmVhdCAvL2Zvby9iYXIgYXMgaG9zdD1mb28scGF0aD1iYXIgYmVjYXVzZSB0aGF0J3NcbiAgLy8gaG93IHRoZSBicm93c2VyIHJlc29sdmVzIHJlbGF0aXZlIFVSTHMuXG4gIGlmIChzbGFzaGVzRGVub3RlSG9zdCB8fCBwcm90byB8fCByZXN0Lm1hdGNoKC9eXFwvXFwvW15AXFwvXStAW15AXFwvXSsvKSkge1xuICAgIHZhciBzbGFzaGVzID0gcmVzdC5zdWJzdHIoMCwgMikgPT09ICcvLyc7XG4gICAgaWYgKHNsYXNoZXMgJiYgIShwcm90byAmJiBob3N0bGVzc1Byb3RvY29sW3Byb3RvXSkpIHtcbiAgICAgIHJlc3QgPSByZXN0LnN1YnN0cigyKTtcbiAgICAgIHRoaXMuc2xhc2hlcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFob3N0bGVzc1Byb3RvY29sW3Byb3RvXSAmJlxuICAgICAgKHNsYXNoZXMgfHwgKHByb3RvICYmICFzbGFzaGVkUHJvdG9jb2xbcHJvdG9dKSkpIHtcblxuICAgIC8vIHRoZXJlJ3MgYSBob3N0bmFtZS5cbiAgICAvLyB0aGUgZmlyc3QgaW5zdGFuY2Ugb2YgLywgPywgOywgb3IgIyBlbmRzIHRoZSBob3N0LlxuICAgIC8vXG4gICAgLy8gSWYgdGhlcmUgaXMgYW4gQCBpbiB0aGUgaG9zdG5hbWUsIHRoZW4gbm9uLWhvc3QgY2hhcnMgKmFyZSogYWxsb3dlZFxuICAgIC8vIHRvIHRoZSBsZWZ0IG9mIHRoZSBsYXN0IEAgc2lnbiwgdW5sZXNzIHNvbWUgaG9zdC1lbmRpbmcgY2hhcmFjdGVyXG4gICAgLy8gY29tZXMgKmJlZm9yZSogdGhlIEAtc2lnbi5cbiAgICAvLyBVUkxzIGFyZSBvYm5veGlvdXMuXG4gICAgLy9cbiAgICAvLyBleDpcbiAgICAvLyBodHRwOi8vYUBiQGMvID0+IHVzZXI6YUBiIGhvc3Q6Y1xuICAgIC8vIGh0dHA6Ly9hQGI/QGMgPT4gdXNlcjphIGhvc3Q6YyBwYXRoOi8/QGNcblxuICAgIC8vIHYwLjEyIFRPRE8oaXNhYWNzKTogVGhpcyBpcyBub3QgcXVpdGUgaG93IENocm9tZSBkb2VzIHRoaW5ncy5cbiAgICAvLyBSZXZpZXcgb3VyIHRlc3QgY2FzZSBhZ2FpbnN0IGJyb3dzZXJzIG1vcmUgY29tcHJlaGVuc2l2ZWx5LlxuXG4gICAgLy8gZmluZCB0aGUgZmlyc3QgaW5zdGFuY2Ugb2YgYW55IGhvc3RFbmRpbmdDaGFyc1xuICAgIHZhciBob3N0RW5kID0gLTE7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3N0RW5kaW5nQ2hhcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBoZWMgPSByZXN0LmluZGV4T2YoaG9zdEVuZGluZ0NoYXJzW2ldKTtcbiAgICAgIGlmIChoZWMgIT09IC0xICYmIChob3N0RW5kID09PSAtMSB8fCBoZWMgPCBob3N0RW5kKSlcbiAgICAgICAgaG9zdEVuZCA9IGhlYztcbiAgICB9XG5cbiAgICAvLyBhdCB0aGlzIHBvaW50LCBlaXRoZXIgd2UgaGF2ZSBhbiBleHBsaWNpdCBwb2ludCB3aGVyZSB0aGVcbiAgICAvLyBhdXRoIHBvcnRpb24gY2Fubm90IGdvIHBhc3QsIG9yIHRoZSBsYXN0IEAgY2hhciBpcyB0aGUgZGVjaWRlci5cbiAgICB2YXIgYXV0aCwgYXRTaWduO1xuICAgIGlmIChob3N0RW5kID09PSAtMSkge1xuICAgICAgLy8gYXRTaWduIGNhbiBiZSBhbnl3aGVyZS5cbiAgICAgIGF0U2lnbiA9IHJlc3QubGFzdEluZGV4T2YoJ0AnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYXRTaWduIG11c3QgYmUgaW4gYXV0aCBwb3J0aW9uLlxuICAgICAgLy8gaHR0cDovL2FAYi9jQGQgPT4gaG9zdDpiIGF1dGg6YSBwYXRoOi9jQGRcbiAgICAgIGF0U2lnbiA9IHJlc3QubGFzdEluZGV4T2YoJ0AnLCBob3N0RW5kKTtcbiAgICB9XG5cbiAgICAvLyBOb3cgd2UgaGF2ZSBhIHBvcnRpb24gd2hpY2ggaXMgZGVmaW5pdGVseSB0aGUgYXV0aC5cbiAgICAvLyBQdWxsIHRoYXQgb2ZmLlxuICAgIGlmIChhdFNpZ24gIT09IC0xKSB7XG4gICAgICBhdXRoID0gcmVzdC5zbGljZSgwLCBhdFNpZ24pO1xuICAgICAgcmVzdCA9IHJlc3Quc2xpY2UoYXRTaWduICsgMSk7XG4gICAgICB0aGlzLmF1dGggPSBkZWNvZGVVUklDb21wb25lbnQoYXV0aCk7XG4gICAgfVxuXG4gICAgLy8gdGhlIGhvc3QgaXMgdGhlIHJlbWFpbmluZyB0byB0aGUgbGVmdCBvZiB0aGUgZmlyc3Qgbm9uLWhvc3QgY2hhclxuICAgIGhvc3RFbmQgPSAtMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vbkhvc3RDaGFycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGhlYyA9IHJlc3QuaW5kZXhPZihub25Ib3N0Q2hhcnNbaV0pO1xuICAgICAgaWYgKGhlYyAhPT0gLTEgJiYgKGhvc3RFbmQgPT09IC0xIHx8IGhlYyA8IGhvc3RFbmQpKVxuICAgICAgICBob3N0RW5kID0gaGVjO1xuICAgIH1cbiAgICAvLyBpZiB3ZSBzdGlsbCBoYXZlIG5vdCBoaXQgaXQsIHRoZW4gdGhlIGVudGlyZSB0aGluZyBpcyBhIGhvc3QuXG4gICAgaWYgKGhvc3RFbmQgPT09IC0xKVxuICAgICAgaG9zdEVuZCA9IHJlc3QubGVuZ3RoO1xuXG4gICAgdGhpcy5ob3N0ID0gcmVzdC5zbGljZSgwLCBob3N0RW5kKTtcbiAgICByZXN0ID0gcmVzdC5zbGljZShob3N0RW5kKTtcblxuICAgIC8vIHB1bGwgb3V0IHBvcnQuXG4gICAgdGhpcy5wYXJzZUhvc3QoKTtcblxuICAgIC8vIHdlJ3ZlIGluZGljYXRlZCB0aGF0IHRoZXJlIGlzIGEgaG9zdG5hbWUsXG4gICAgLy8gc28gZXZlbiBpZiBpdCdzIGVtcHR5LCBpdCBoYXMgdG8gYmUgcHJlc2VudC5cbiAgICB0aGlzLmhvc3RuYW1lID0gdGhpcy5ob3N0bmFtZSB8fCAnJztcblxuICAgIC8vIGlmIGhvc3RuYW1lIGJlZ2lucyB3aXRoIFsgYW5kIGVuZHMgd2l0aCBdXG4gICAgLy8gYXNzdW1lIHRoYXQgaXQncyBhbiBJUHY2IGFkZHJlc3MuXG4gICAgdmFyIGlwdjZIb3N0bmFtZSA9IHRoaXMuaG9zdG5hbWVbMF0gPT09ICdbJyAmJlxuICAgICAgICB0aGlzLmhvc3RuYW1lW3RoaXMuaG9zdG5hbWUubGVuZ3RoIC0gMV0gPT09ICddJztcblxuICAgIC8vIHZhbGlkYXRlIGEgbGl0dGxlLlxuICAgIGlmICghaXB2Nkhvc3RuYW1lKSB7XG4gICAgICB2YXIgaG9zdHBhcnRzID0gdGhpcy5ob3N0bmFtZS5zcGxpdCgvXFwuLyk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGhvc3RwYXJ0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcnQgPSBob3N0cGFydHNbaV07XG4gICAgICAgIGlmICghcGFydCkgY29udGludWU7XG4gICAgICAgIGlmICghcGFydC5tYXRjaChob3N0bmFtZVBhcnRQYXR0ZXJuKSkge1xuICAgICAgICAgIHZhciBuZXdwYXJ0ID0gJyc7XG4gICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGsgPSBwYXJ0Lmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICAgICAgaWYgKHBhcnQuY2hhckNvZGVBdChqKSA+IDEyNykge1xuICAgICAgICAgICAgICAvLyB3ZSByZXBsYWNlIG5vbi1BU0NJSSBjaGFyIHdpdGggYSB0ZW1wb3JhcnkgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgLy8gd2UgbmVlZCB0aGlzIHRvIG1ha2Ugc3VyZSBzaXplIG9mIGhvc3RuYW1lIGlzIG5vdFxuICAgICAgICAgICAgICAvLyBicm9rZW4gYnkgcmVwbGFjaW5nIG5vbi1BU0NJSSBieSBub3RoaW5nXG4gICAgICAgICAgICAgIG5ld3BhcnQgKz0gJ3gnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbmV3cGFydCArPSBwYXJ0W2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyB3ZSB0ZXN0IGFnYWluIHdpdGggQVNDSUkgY2hhciBvbmx5XG4gICAgICAgICAgaWYgKCFuZXdwYXJ0Lm1hdGNoKGhvc3RuYW1lUGFydFBhdHRlcm4pKSB7XG4gICAgICAgICAgICB2YXIgdmFsaWRQYXJ0cyA9IGhvc3RwYXJ0cy5zbGljZSgwLCBpKTtcbiAgICAgICAgICAgIHZhciBub3RIb3N0ID0gaG9zdHBhcnRzLnNsaWNlKGkgKyAxKTtcbiAgICAgICAgICAgIHZhciBiaXQgPSBwYXJ0Lm1hdGNoKGhvc3RuYW1lUGFydFN0YXJ0KTtcbiAgICAgICAgICAgIGlmIChiaXQpIHtcbiAgICAgICAgICAgICAgdmFsaWRQYXJ0cy5wdXNoKGJpdFsxXSk7XG4gICAgICAgICAgICAgIG5vdEhvc3QudW5zaGlmdChiaXRbMl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vdEhvc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJlc3QgPSAnLycgKyBub3RIb3N0LmpvaW4oJy4nKSArIHJlc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhvc3RuYW1lID0gdmFsaWRQYXJ0cy5qb2luKCcuJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5ob3N0bmFtZS5sZW5ndGggPiBob3N0bmFtZU1heExlbikge1xuICAgICAgdGhpcy5ob3N0bmFtZSA9ICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBob3N0bmFtZXMgYXJlIGFsd2F5cyBsb3dlciBjYXNlLlxuICAgICAgdGhpcy5ob3N0bmFtZSA9IHRoaXMuaG9zdG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICBpZiAoIWlwdjZIb3N0bmFtZSkge1xuICAgICAgLy8gSUROQSBTdXBwb3J0OiBSZXR1cm5zIGEgcHVueSBjb2RlZCByZXByZXNlbnRhdGlvbiBvZiBcImRvbWFpblwiLlxuICAgICAgLy8gSXQgb25seSBjb252ZXJ0cyB0aGUgcGFydCBvZiB0aGUgZG9tYWluIG5hbWUgdGhhdFxuICAgICAgLy8gaGFzIG5vbiBBU0NJSSBjaGFyYWN0ZXJzLiBJLmUuIGl0IGRvc2VudCBtYXR0ZXIgaWZcbiAgICAgIC8vIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCBhbHJlYWR5IGlzIGluIEFTQ0lJLlxuICAgICAgdmFyIGRvbWFpbkFycmF5ID0gdGhpcy5ob3N0bmFtZS5zcGxpdCgnLicpO1xuICAgICAgdmFyIG5ld091dCA9IFtdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb21haW5BcnJheS5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgcyA9IGRvbWFpbkFycmF5W2ldO1xuICAgICAgICBuZXdPdXQucHVzaChzLm1hdGNoKC9bXkEtWmEtejAtOV8tXS8pID9cbiAgICAgICAgICAgICd4bi0tJyArIHB1bnljb2RlLmVuY29kZShzKSA6IHMpO1xuICAgICAgfVxuICAgICAgdGhpcy5ob3N0bmFtZSA9IG5ld091dC5qb2luKCcuJyk7XG4gICAgfVxuXG4gICAgdmFyIHAgPSB0aGlzLnBvcnQgPyAnOicgKyB0aGlzLnBvcnQgOiAnJztcbiAgICB2YXIgaCA9IHRoaXMuaG9zdG5hbWUgfHwgJyc7XG4gICAgdGhpcy5ob3N0ID0gaCArIHA7XG4gICAgdGhpcy5ocmVmICs9IHRoaXMuaG9zdDtcblxuICAgIC8vIHN0cmlwIFsgYW5kIF0gZnJvbSB0aGUgaG9zdG5hbWVcbiAgICAvLyB0aGUgaG9zdCBmaWVsZCBzdGlsbCByZXRhaW5zIHRoZW0sIHRob3VnaFxuICAgIGlmIChpcHY2SG9zdG5hbWUpIHtcbiAgICAgIHRoaXMuaG9zdG5hbWUgPSB0aGlzLmhvc3RuYW1lLnN1YnN0cigxLCB0aGlzLmhvc3RuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgaWYgKHJlc3RbMF0gIT09ICcvJykge1xuICAgICAgICByZXN0ID0gJy8nICsgcmVzdDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBub3cgcmVzdCBpcyBzZXQgdG8gdGhlIHBvc3QtaG9zdCBzdHVmZi5cbiAgLy8gY2hvcCBvZmYgYW55IGRlbGltIGNoYXJzLlxuICBpZiAoIXVuc2FmZVByb3RvY29sW2xvd2VyUHJvdG9dKSB7XG5cbiAgICAvLyBGaXJzdCwgbWFrZSAxMDAlIHN1cmUgdGhhdCBhbnkgXCJhdXRvRXNjYXBlXCIgY2hhcnMgZ2V0XG4gICAgLy8gZXNjYXBlZCwgZXZlbiBpZiBlbmNvZGVVUklDb21wb25lbnQgZG9lc24ndCB0aGluayB0aGV5XG4gICAgLy8gbmVlZCB0byBiZS5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGF1dG9Fc2NhcGUubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgYWUgPSBhdXRvRXNjYXBlW2ldO1xuICAgICAgdmFyIGVzYyA9IGVuY29kZVVSSUNvbXBvbmVudChhZSk7XG4gICAgICBpZiAoZXNjID09PSBhZSkge1xuICAgICAgICBlc2MgPSBlc2NhcGUoYWUpO1xuICAgICAgfVxuICAgICAgcmVzdCA9IHJlc3Quc3BsaXQoYWUpLmpvaW4oZXNjKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIGNob3Agb2ZmIGZyb20gdGhlIHRhaWwgZmlyc3QuXG4gIHZhciBoYXNoID0gcmVzdC5pbmRleE9mKCcjJyk7XG4gIGlmIChoYXNoICE9PSAtMSkge1xuICAgIC8vIGdvdCBhIGZyYWdtZW50IHN0cmluZy5cbiAgICB0aGlzLmhhc2ggPSByZXN0LnN1YnN0cihoYXNoKTtcbiAgICByZXN0ID0gcmVzdC5zbGljZSgwLCBoYXNoKTtcbiAgfVxuICB2YXIgcW0gPSByZXN0LmluZGV4T2YoJz8nKTtcbiAgaWYgKHFtICE9PSAtMSkge1xuICAgIHRoaXMuc2VhcmNoID0gcmVzdC5zdWJzdHIocW0pO1xuICAgIHRoaXMucXVlcnkgPSByZXN0LnN1YnN0cihxbSArIDEpO1xuICAgIGlmIChwYXJzZVF1ZXJ5U3RyaW5nKSB7XG4gICAgICB0aGlzLnF1ZXJ5ID0gcXVlcnlzdHJpbmcucGFyc2UodGhpcy5xdWVyeSk7XG4gICAgfVxuICAgIHJlc3QgPSByZXN0LnNsaWNlKDAsIHFtKTtcbiAgfSBlbHNlIGlmIChwYXJzZVF1ZXJ5U3RyaW5nKSB7XG4gICAgLy8gbm8gcXVlcnkgc3RyaW5nLCBidXQgcGFyc2VRdWVyeVN0cmluZyBzdGlsbCByZXF1ZXN0ZWRcbiAgICB0aGlzLnNlYXJjaCA9ICcnO1xuICAgIHRoaXMucXVlcnkgPSB7fTtcbiAgfVxuICBpZiAocmVzdCkgdGhpcy5wYXRobmFtZSA9IHJlc3Q7XG4gIGlmIChzbGFzaGVkUHJvdG9jb2xbbG93ZXJQcm90b10gJiZcbiAgICAgIHRoaXMuaG9zdG5hbWUgJiYgIXRoaXMucGF0aG5hbWUpIHtcbiAgICB0aGlzLnBhdGhuYW1lID0gJy8nO1xuICB9XG5cbiAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICBpZiAodGhpcy5wYXRobmFtZSB8fCB0aGlzLnNlYXJjaCkge1xuICAgIHZhciBwID0gdGhpcy5wYXRobmFtZSB8fCAnJztcbiAgICB2YXIgcyA9IHRoaXMuc2VhcmNoIHx8ICcnO1xuICAgIHRoaXMucGF0aCA9IHAgKyBzO1xuICB9XG5cbiAgLy8gZmluYWxseSwgcmVjb25zdHJ1Y3QgdGhlIGhyZWYgYmFzZWQgb24gd2hhdCBoYXMgYmVlbiB2YWxpZGF0ZWQuXG4gIHRoaXMuaHJlZiA9IHRoaXMuZm9ybWF0KCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZm9ybWF0IGEgcGFyc2VkIG9iamVjdCBpbnRvIGEgdXJsIHN0cmluZ1xuZnVuY3Rpb24gdXJsRm9ybWF0KG9iaikge1xuICAvLyBlbnN1cmUgaXQncyBhbiBvYmplY3QsIGFuZCBub3QgYSBzdHJpbmcgdXJsLlxuICAvLyBJZiBpdCdzIGFuIG9iaiwgdGhpcyBpcyBhIG5vLW9wLlxuICAvLyB0aGlzIHdheSwgeW91IGNhbiBjYWxsIHVybF9mb3JtYXQoKSBvbiBzdHJpbmdzXG4gIC8vIHRvIGNsZWFuIHVwIHBvdGVudGlhbGx5IHdvbmt5IHVybHMuXG4gIGlmIChpc1N0cmluZyhvYmopKSBvYmogPSB1cmxQYXJzZShvYmopO1xuICBpZiAoIShvYmogaW5zdGFuY2VvZiBVcmwpKSByZXR1cm4gVXJsLnByb3RvdHlwZS5mb3JtYXQuY2FsbChvYmopO1xuICByZXR1cm4gb2JqLmZvcm1hdCgpO1xufVxuXG5VcmwucHJvdG90eXBlLmZvcm1hdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYXV0aCA9IHRoaXMuYXV0aCB8fCAnJztcbiAgaWYgKGF1dGgpIHtcbiAgICBhdXRoID0gZW5jb2RlVVJJQ29tcG9uZW50KGF1dGgpO1xuICAgIGF1dGggPSBhdXRoLnJlcGxhY2UoLyUzQS9pLCAnOicpO1xuICAgIGF1dGggKz0gJ0AnO1xuICB9XG5cbiAgdmFyIHByb3RvY29sID0gdGhpcy5wcm90b2NvbCB8fCAnJyxcbiAgICAgIHBhdGhuYW1lID0gdGhpcy5wYXRobmFtZSB8fCAnJyxcbiAgICAgIGhhc2ggPSB0aGlzLmhhc2ggfHwgJycsXG4gICAgICBob3N0ID0gZmFsc2UsXG4gICAgICBxdWVyeSA9ICcnO1xuXG4gIGlmICh0aGlzLmhvc3QpIHtcbiAgICBob3N0ID0gYXV0aCArIHRoaXMuaG9zdDtcbiAgfSBlbHNlIGlmICh0aGlzLmhvc3RuYW1lKSB7XG4gICAgaG9zdCA9IGF1dGggKyAodGhpcy5ob3N0bmFtZS5pbmRleE9mKCc6JykgPT09IC0xID9cbiAgICAgICAgdGhpcy5ob3N0bmFtZSA6XG4gICAgICAgICdbJyArIHRoaXMuaG9zdG5hbWUgKyAnXScpO1xuICAgIGlmICh0aGlzLnBvcnQpIHtcbiAgICAgIGhvc3QgKz0gJzonICsgdGhpcy5wb3J0O1xuICAgIH1cbiAgfVxuXG4gIGlmICh0aGlzLnF1ZXJ5ICYmXG4gICAgICBpc09iamVjdCh0aGlzLnF1ZXJ5KSAmJlxuICAgICAgT2JqZWN0LmtleXModGhpcy5xdWVyeSkubGVuZ3RoKSB7XG4gICAgcXVlcnkgPSBxdWVyeXN0cmluZy5zdHJpbmdpZnkodGhpcy5xdWVyeSk7XG4gIH1cblxuICB2YXIgc2VhcmNoID0gdGhpcy5zZWFyY2ggfHwgKHF1ZXJ5ICYmICgnPycgKyBxdWVyeSkpIHx8ICcnO1xuXG4gIGlmIChwcm90b2NvbCAmJiBwcm90b2NvbC5zdWJzdHIoLTEpICE9PSAnOicpIHByb3RvY29sICs9ICc6JztcblxuICAvLyBvbmx5IHRoZSBzbGFzaGVkUHJvdG9jb2xzIGdldCB0aGUgLy8uICBOb3QgbWFpbHRvOiwgeG1wcDosIGV0Yy5cbiAgLy8gdW5sZXNzIHRoZXkgaGFkIHRoZW0gdG8gYmVnaW4gd2l0aC5cbiAgaWYgKHRoaXMuc2xhc2hlcyB8fFxuICAgICAgKCFwcm90b2NvbCB8fCBzbGFzaGVkUHJvdG9jb2xbcHJvdG9jb2xdKSAmJiBob3N0ICE9PSBmYWxzZSkge1xuICAgIGhvc3QgPSAnLy8nICsgKGhvc3QgfHwgJycpO1xuICAgIGlmIChwYXRobmFtZSAmJiBwYXRobmFtZS5jaGFyQXQoMCkgIT09ICcvJykgcGF0aG5hbWUgPSAnLycgKyBwYXRobmFtZTtcbiAgfSBlbHNlIGlmICghaG9zdCkge1xuICAgIGhvc3QgPSAnJztcbiAgfVxuXG4gIGlmIChoYXNoICYmIGhhc2guY2hhckF0KDApICE9PSAnIycpIGhhc2ggPSAnIycgKyBoYXNoO1xuICBpZiAoc2VhcmNoICYmIHNlYXJjaC5jaGFyQXQoMCkgIT09ICc/Jykgc2VhcmNoID0gJz8nICsgc2VhcmNoO1xuXG4gIHBhdGhuYW1lID0gcGF0aG5hbWUucmVwbGFjZSgvWz8jXS9nLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQobWF0Y2gpO1xuICB9KTtcbiAgc2VhcmNoID0gc2VhcmNoLnJlcGxhY2UoJyMnLCAnJTIzJyk7XG5cbiAgcmV0dXJuIHByb3RvY29sICsgaG9zdCArIHBhdGhuYW1lICsgc2VhcmNoICsgaGFzaDtcbn07XG5cbmZ1bmN0aW9uIHVybFJlc29sdmUoc291cmNlLCByZWxhdGl2ZSkge1xuICByZXR1cm4gdXJsUGFyc2Uoc291cmNlLCBmYWxzZSwgdHJ1ZSkucmVzb2x2ZShyZWxhdGl2ZSk7XG59XG5cblVybC5wcm90b3R5cGUucmVzb2x2ZSA9IGZ1bmN0aW9uKHJlbGF0aXZlKSB7XG4gIHJldHVybiB0aGlzLnJlc29sdmVPYmplY3QodXJsUGFyc2UocmVsYXRpdmUsIGZhbHNlLCB0cnVlKSkuZm9ybWF0KCk7XG59O1xuXG5mdW5jdGlvbiB1cmxSZXNvbHZlT2JqZWN0KHNvdXJjZSwgcmVsYXRpdmUpIHtcbiAgaWYgKCFzb3VyY2UpIHJldHVybiByZWxhdGl2ZTtcbiAgcmV0dXJuIHVybFBhcnNlKHNvdXJjZSwgZmFsc2UsIHRydWUpLnJlc29sdmVPYmplY3QocmVsYXRpdmUpO1xufVxuXG5VcmwucHJvdG90eXBlLnJlc29sdmVPYmplY3QgPSBmdW5jdGlvbihyZWxhdGl2ZSkge1xuICBpZiAoaXNTdHJpbmcocmVsYXRpdmUpKSB7XG4gICAgdmFyIHJlbCA9IG5ldyBVcmwoKTtcbiAgICByZWwucGFyc2UocmVsYXRpdmUsIGZhbHNlLCB0cnVlKTtcbiAgICByZWxhdGl2ZSA9IHJlbDtcbiAgfVxuXG4gIHZhciByZXN1bHQgPSBuZXcgVXJsKCk7XG4gIE9iamVjdC5rZXlzKHRoaXMpLmZvckVhY2goZnVuY3Rpb24oaykge1xuICAgIHJlc3VsdFtrXSA9IHRoaXNba107XG4gIH0sIHRoaXMpO1xuXG4gIC8vIGhhc2ggaXMgYWx3YXlzIG92ZXJyaWRkZW4sIG5vIG1hdHRlciB3aGF0LlxuICAvLyBldmVuIGhyZWY9XCJcIiB3aWxsIHJlbW92ZSBpdC5cbiAgcmVzdWx0Lmhhc2ggPSByZWxhdGl2ZS5oYXNoO1xuXG4gIC8vIGlmIHRoZSByZWxhdGl2ZSB1cmwgaXMgZW1wdHksIHRoZW4gdGhlcmUncyBub3RoaW5nIGxlZnQgdG8gZG8gaGVyZS5cbiAgaWYgKHJlbGF0aXZlLmhyZWYgPT09ICcnKSB7XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIGhyZWZzIGxpa2UgLy9mb28vYmFyIGFsd2F5cyBjdXQgdG8gdGhlIHByb3RvY29sLlxuICBpZiAocmVsYXRpdmUuc2xhc2hlcyAmJiAhcmVsYXRpdmUucHJvdG9jb2wpIHtcbiAgICAvLyB0YWtlIGV2ZXJ5dGhpbmcgZXhjZXB0IHRoZSBwcm90b2NvbCBmcm9tIHJlbGF0aXZlXG4gICAgT2JqZWN0LmtleXMocmVsYXRpdmUpLmZvckVhY2goZnVuY3Rpb24oaykge1xuICAgICAgaWYgKGsgIT09ICdwcm90b2NvbCcpXG4gICAgICAgIHJlc3VsdFtrXSA9IHJlbGF0aXZlW2tdO1xuICAgIH0pO1xuXG4gICAgLy91cmxQYXJzZSBhcHBlbmRzIHRyYWlsaW5nIC8gdG8gdXJscyBsaWtlIGh0dHA6Ly93d3cuZXhhbXBsZS5jb21cbiAgICBpZiAoc2xhc2hlZFByb3RvY29sW3Jlc3VsdC5wcm90b2NvbF0gJiZcbiAgICAgICAgcmVzdWx0Lmhvc3RuYW1lICYmICFyZXN1bHQucGF0aG5hbWUpIHtcbiAgICAgIHJlc3VsdC5wYXRoID0gcmVzdWx0LnBhdGhuYW1lID0gJy8nO1xuICAgIH1cblxuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBpZiAocmVsYXRpdmUucHJvdG9jb2wgJiYgcmVsYXRpdmUucHJvdG9jb2wgIT09IHJlc3VsdC5wcm90b2NvbCkge1xuICAgIC8vIGlmIGl0J3MgYSBrbm93biB1cmwgcHJvdG9jb2wsIHRoZW4gY2hhbmdpbmdcbiAgICAvLyB0aGUgcHJvdG9jb2wgZG9lcyB3ZWlyZCB0aGluZ3NcbiAgICAvLyBmaXJzdCwgaWYgaXQncyBub3QgZmlsZTosIHRoZW4gd2UgTVVTVCBoYXZlIGEgaG9zdCxcbiAgICAvLyBhbmQgaWYgdGhlcmUgd2FzIGEgcGF0aFxuICAgIC8vIHRvIGJlZ2luIHdpdGgsIHRoZW4gd2UgTVVTVCBoYXZlIGEgcGF0aC5cbiAgICAvLyBpZiBpdCBpcyBmaWxlOiwgdGhlbiB0aGUgaG9zdCBpcyBkcm9wcGVkLFxuICAgIC8vIGJlY2F1c2UgdGhhdCdzIGtub3duIHRvIGJlIGhvc3RsZXNzLlxuICAgIC8vIGFueXRoaW5nIGVsc2UgaXMgYXNzdW1lZCB0byBiZSBhYnNvbHV0ZS5cbiAgICBpZiAoIXNsYXNoZWRQcm90b2NvbFtyZWxhdGl2ZS5wcm90b2NvbF0pIHtcbiAgICAgIE9iamVjdC5rZXlzKHJlbGF0aXZlKS5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgcmVzdWx0W2tdID0gcmVsYXRpdmVba107XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICByZXN1bHQucHJvdG9jb2wgPSByZWxhdGl2ZS5wcm90b2NvbDtcbiAgICBpZiAoIXJlbGF0aXZlLmhvc3QgJiYgIWhvc3RsZXNzUHJvdG9jb2xbcmVsYXRpdmUucHJvdG9jb2xdKSB7XG4gICAgICB2YXIgcmVsUGF0aCA9IChyZWxhdGl2ZS5wYXRobmFtZSB8fCAnJykuc3BsaXQoJy8nKTtcbiAgICAgIHdoaWxlIChyZWxQYXRoLmxlbmd0aCAmJiAhKHJlbGF0aXZlLmhvc3QgPSByZWxQYXRoLnNoaWZ0KCkpKTtcbiAgICAgIGlmICghcmVsYXRpdmUuaG9zdCkgcmVsYXRpdmUuaG9zdCA9ICcnO1xuICAgICAgaWYgKCFyZWxhdGl2ZS5ob3N0bmFtZSkgcmVsYXRpdmUuaG9zdG5hbWUgPSAnJztcbiAgICAgIGlmIChyZWxQYXRoWzBdICE9PSAnJykgcmVsUGF0aC51bnNoaWZ0KCcnKTtcbiAgICAgIGlmIChyZWxQYXRoLmxlbmd0aCA8IDIpIHJlbFBhdGgudW5zaGlmdCgnJyk7XG4gICAgICByZXN1bHQucGF0aG5hbWUgPSByZWxQYXRoLmpvaW4oJy8nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnBhdGhuYW1lID0gcmVsYXRpdmUucGF0aG5hbWU7XG4gICAgfVxuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgcmVzdWx0Lmhvc3QgPSByZWxhdGl2ZS5ob3N0IHx8ICcnO1xuICAgIHJlc3VsdC5hdXRoID0gcmVsYXRpdmUuYXV0aDtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSByZWxhdGl2ZS5ob3N0bmFtZSB8fCByZWxhdGl2ZS5ob3N0O1xuICAgIHJlc3VsdC5wb3J0ID0gcmVsYXRpdmUucG9ydDtcbiAgICAvLyB0byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICAgIGlmIChyZXN1bHQucGF0aG5hbWUgfHwgcmVzdWx0LnNlYXJjaCkge1xuICAgICAgdmFyIHAgPSByZXN1bHQucGF0aG5hbWUgfHwgJyc7XG4gICAgICB2YXIgcyA9IHJlc3VsdC5zZWFyY2ggfHwgJyc7XG4gICAgICByZXN1bHQucGF0aCA9IHAgKyBzO1xuICAgIH1cbiAgICByZXN1bHQuc2xhc2hlcyA9IHJlc3VsdC5zbGFzaGVzIHx8IHJlbGF0aXZlLnNsYXNoZXM7XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHZhciBpc1NvdXJjZUFicyA9IChyZXN1bHQucGF0aG5hbWUgJiYgcmVzdWx0LnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nKSxcbiAgICAgIGlzUmVsQWJzID0gKFxuICAgICAgICAgIHJlbGF0aXZlLmhvc3QgfHxcbiAgICAgICAgICByZWxhdGl2ZS5wYXRobmFtZSAmJiByZWxhdGl2ZS5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJ1xuICAgICAgKSxcbiAgICAgIG11c3RFbmRBYnMgPSAoaXNSZWxBYnMgfHwgaXNTb3VyY2VBYnMgfHxcbiAgICAgICAgICAgICAgICAgICAgKHJlc3VsdC5ob3N0ICYmIHJlbGF0aXZlLnBhdGhuYW1lKSksXG4gICAgICByZW1vdmVBbGxEb3RzID0gbXVzdEVuZEFicyxcbiAgICAgIHNyY1BhdGggPSByZXN1bHQucGF0aG5hbWUgJiYgcmVzdWx0LnBhdGhuYW1lLnNwbGl0KCcvJykgfHwgW10sXG4gICAgICByZWxQYXRoID0gcmVsYXRpdmUucGF0aG5hbWUgJiYgcmVsYXRpdmUucGF0aG5hbWUuc3BsaXQoJy8nKSB8fCBbXSxcbiAgICAgIHBzeWNob3RpYyA9IHJlc3VsdC5wcm90b2NvbCAmJiAhc2xhc2hlZFByb3RvY29sW3Jlc3VsdC5wcm90b2NvbF07XG5cbiAgLy8gaWYgdGhlIHVybCBpcyBhIG5vbi1zbGFzaGVkIHVybCwgdGhlbiByZWxhdGl2ZVxuICAvLyBsaW5rcyBsaWtlIC4uLy4uIHNob3VsZCBiZSBhYmxlXG4gIC8vIHRvIGNyYXdsIHVwIHRvIHRoZSBob3N0bmFtZSwgYXMgd2VsbC4gIFRoaXMgaXMgc3RyYW5nZS5cbiAgLy8gcmVzdWx0LnByb3RvY29sIGhhcyBhbHJlYWR5IGJlZW4gc2V0IGJ5IG5vdy5cbiAgLy8gTGF0ZXIgb24sIHB1dCB0aGUgZmlyc3QgcGF0aCBwYXJ0IGludG8gdGhlIGhvc3QgZmllbGQuXG4gIGlmIChwc3ljaG90aWMpIHtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSAnJztcbiAgICByZXN1bHQucG9ydCA9IG51bGw7XG4gICAgaWYgKHJlc3VsdC5ob3N0KSB7XG4gICAgICBpZiAoc3JjUGF0aFswXSA9PT0gJycpIHNyY1BhdGhbMF0gPSByZXN1bHQuaG9zdDtcbiAgICAgIGVsc2Ugc3JjUGF0aC51bnNoaWZ0KHJlc3VsdC5ob3N0KTtcbiAgICB9XG4gICAgcmVzdWx0Lmhvc3QgPSAnJztcbiAgICBpZiAocmVsYXRpdmUucHJvdG9jb2wpIHtcbiAgICAgIHJlbGF0aXZlLmhvc3RuYW1lID0gbnVsbDtcbiAgICAgIHJlbGF0aXZlLnBvcnQgPSBudWxsO1xuICAgICAgaWYgKHJlbGF0aXZlLmhvc3QpIHtcbiAgICAgICAgaWYgKHJlbFBhdGhbMF0gPT09ICcnKSByZWxQYXRoWzBdID0gcmVsYXRpdmUuaG9zdDtcbiAgICAgICAgZWxzZSByZWxQYXRoLnVuc2hpZnQocmVsYXRpdmUuaG9zdCk7XG4gICAgICB9XG4gICAgICByZWxhdGl2ZS5ob3N0ID0gbnVsbDtcbiAgICB9XG4gICAgbXVzdEVuZEFicyA9IG11c3RFbmRBYnMgJiYgKHJlbFBhdGhbMF0gPT09ICcnIHx8IHNyY1BhdGhbMF0gPT09ICcnKTtcbiAgfVxuXG4gIGlmIChpc1JlbEFicykge1xuICAgIC8vIGl0J3MgYWJzb2x1dGUuXG4gICAgcmVzdWx0Lmhvc3QgPSAocmVsYXRpdmUuaG9zdCB8fCByZWxhdGl2ZS5ob3N0ID09PSAnJykgP1xuICAgICAgICAgICAgICAgICAgcmVsYXRpdmUuaG9zdCA6IHJlc3VsdC5ob3N0O1xuICAgIHJlc3VsdC5ob3N0bmFtZSA9IChyZWxhdGl2ZS5ob3N0bmFtZSB8fCByZWxhdGl2ZS5ob3N0bmFtZSA9PT0gJycpID9cbiAgICAgICAgICAgICAgICAgICAgICByZWxhdGl2ZS5ob3N0bmFtZSA6IHJlc3VsdC5ob3N0bmFtZTtcbiAgICByZXN1bHQuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHJlc3VsdC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIHNyY1BhdGggPSByZWxQYXRoO1xuICAgIC8vIGZhbGwgdGhyb3VnaCB0byB0aGUgZG90LWhhbmRsaW5nIGJlbG93LlxuICB9IGVsc2UgaWYgKHJlbFBhdGgubGVuZ3RoKSB7XG4gICAgLy8gaXQncyByZWxhdGl2ZVxuICAgIC8vIHRocm93IGF3YXkgdGhlIGV4aXN0aW5nIGZpbGUsIGFuZCB0YWtlIHRoZSBuZXcgcGF0aCBpbnN0ZWFkLlxuICAgIGlmICghc3JjUGF0aCkgc3JjUGF0aCA9IFtdO1xuICAgIHNyY1BhdGgucG9wKCk7XG4gICAgc3JjUGF0aCA9IHNyY1BhdGguY29uY2F0KHJlbFBhdGgpO1xuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gIH0gZWxzZSBpZiAoIWlzTnVsbE9yVW5kZWZpbmVkKHJlbGF0aXZlLnNlYXJjaCkpIHtcbiAgICAvLyBqdXN0IHB1bGwgb3V0IHRoZSBzZWFyY2guXG4gICAgLy8gbGlrZSBocmVmPSc/Zm9vJy5cbiAgICAvLyBQdXQgdGhpcyBhZnRlciB0aGUgb3RoZXIgdHdvIGNhc2VzIGJlY2F1c2UgaXQgc2ltcGxpZmllcyB0aGUgYm9vbGVhbnNcbiAgICBpZiAocHN5Y2hvdGljKSB7XG4gICAgICByZXN1bHQuaG9zdG5hbWUgPSByZXN1bHQuaG9zdCA9IHNyY1BhdGguc2hpZnQoKTtcbiAgICAgIC8vb2NjYXRpb25hbHkgdGhlIGF1dGggY2FuIGdldCBzdHVjayBvbmx5IGluIGhvc3RcbiAgICAgIC8vdGhpcyBlc3BlY2lhbHkgaGFwcGVucyBpbiBjYXNlcyBsaWtlXG4gICAgICAvL3VybC5yZXNvbHZlT2JqZWN0KCdtYWlsdG86bG9jYWwxQGRvbWFpbjEnLCAnbG9jYWwyQGRvbWFpbjInKVxuICAgICAgdmFyIGF1dGhJbkhvc3QgPSByZXN1bHQuaG9zdCAmJiByZXN1bHQuaG9zdC5pbmRleE9mKCdAJykgPiAwID9cbiAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0Lmhvc3Quc3BsaXQoJ0AnKSA6IGZhbHNlO1xuICAgICAgaWYgKGF1dGhJbkhvc3QpIHtcbiAgICAgICAgcmVzdWx0LmF1dGggPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICAgIHJlc3VsdC5ob3N0ID0gcmVzdWx0Lmhvc3RuYW1lID0gYXV0aEluSG9zdC5zaGlmdCgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXN1bHQuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHJlc3VsdC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgICBpZiAoIWlzTnVsbChyZXN1bHQucGF0aG5hbWUpIHx8ICFpc051bGwocmVzdWx0LnNlYXJjaCkpIHtcbiAgICAgIHJlc3VsdC5wYXRoID0gKHJlc3VsdC5wYXRobmFtZSA/IHJlc3VsdC5wYXRobmFtZSA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgIChyZXN1bHQuc2VhcmNoID8gcmVzdWx0LnNlYXJjaCA6ICcnKTtcbiAgICB9XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGlmICghc3JjUGF0aC5sZW5ndGgpIHtcbiAgICAvLyBubyBwYXRoIGF0IGFsbC4gIGVhc3kuXG4gICAgLy8gd2UndmUgYWxyZWFkeSBoYW5kbGVkIHRoZSBvdGhlciBzdHVmZiBhYm92ZS5cbiAgICByZXN1bHQucGF0aG5hbWUgPSBudWxsO1xuICAgIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgICBpZiAocmVzdWx0LnNlYXJjaCkge1xuICAgICAgcmVzdWx0LnBhdGggPSAnLycgKyByZXN1bHQuc2VhcmNoO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucGF0aCA9IG51bGw7XG4gICAgfVxuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBpZiBhIHVybCBFTkRzIGluIC4gb3IgLi4sIHRoZW4gaXQgbXVzdCBnZXQgYSB0cmFpbGluZyBzbGFzaC5cbiAgLy8gaG93ZXZlciwgaWYgaXQgZW5kcyBpbiBhbnl0aGluZyBlbHNlIG5vbi1zbGFzaHksXG4gIC8vIHRoZW4gaXQgbXVzdCBOT1QgZ2V0IGEgdHJhaWxpbmcgc2xhc2guXG4gIHZhciBsYXN0ID0gc3JjUGF0aC5zbGljZSgtMSlbMF07XG4gIHZhciBoYXNUcmFpbGluZ1NsYXNoID0gKFxuICAgICAgKHJlc3VsdC5ob3N0IHx8IHJlbGF0aXZlLmhvc3QpICYmIChsYXN0ID09PSAnLicgfHwgbGFzdCA9PT0gJy4uJykgfHxcbiAgICAgIGxhc3QgPT09ICcnKTtcblxuICAvLyBzdHJpcCBzaW5nbGUgZG90cywgcmVzb2x2ZSBkb3VibGUgZG90cyB0byBwYXJlbnQgZGlyXG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBzcmNQYXRoLmxlbmd0aDsgaSA+PSAwOyBpLS0pIHtcbiAgICBsYXN0ID0gc3JjUGF0aFtpXTtcbiAgICBpZiAobGFzdCA9PSAnLicpIHtcbiAgICAgIHNyY1BhdGguc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgc3JjUGF0aC5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHNyY1BhdGguc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmICghbXVzdEVuZEFicyAmJiAhcmVtb3ZlQWxsRG90cykge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgc3JjUGF0aC51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChtdXN0RW5kQWJzICYmIHNyY1BhdGhbMF0gIT09ICcnICYmXG4gICAgICAoIXNyY1BhdGhbMF0gfHwgc3JjUGF0aFswXS5jaGFyQXQoMCkgIT09ICcvJykpIHtcbiAgICBzcmNQYXRoLnVuc2hpZnQoJycpO1xuICB9XG5cbiAgaWYgKGhhc1RyYWlsaW5nU2xhc2ggJiYgKHNyY1BhdGguam9pbignLycpLnN1YnN0cigtMSkgIT09ICcvJykpIHtcbiAgICBzcmNQYXRoLnB1c2goJycpO1xuICB9XG5cbiAgdmFyIGlzQWJzb2x1dGUgPSBzcmNQYXRoWzBdID09PSAnJyB8fFxuICAgICAgKHNyY1BhdGhbMF0gJiYgc3JjUGF0aFswXS5jaGFyQXQoMCkgPT09ICcvJyk7XG5cbiAgLy8gcHV0IHRoZSBob3N0IGJhY2tcbiAgaWYgKHBzeWNob3RpYykge1xuICAgIHJlc3VsdC5ob3N0bmFtZSA9IHJlc3VsdC5ob3N0ID0gaXNBYnNvbHV0ZSA/ICcnIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNyY1BhdGgubGVuZ3RoID8gc3JjUGF0aC5zaGlmdCgpIDogJyc7XG4gICAgLy9vY2NhdGlvbmFseSB0aGUgYXV0aCBjYW4gZ2V0IHN0dWNrIG9ubHkgaW4gaG9zdFxuICAgIC8vdGhpcyBlc3BlY2lhbHkgaGFwcGVucyBpbiBjYXNlcyBsaWtlXG4gICAgLy91cmwucmVzb2x2ZU9iamVjdCgnbWFpbHRvOmxvY2FsMUBkb21haW4xJywgJ2xvY2FsMkBkb21haW4yJylcbiAgICB2YXIgYXV0aEluSG9zdCA9IHJlc3VsdC5ob3N0ICYmIHJlc3VsdC5ob3N0LmluZGV4T2YoJ0AnKSA+IDAgP1xuICAgICAgICAgICAgICAgICAgICAgcmVzdWx0Lmhvc3Quc3BsaXQoJ0AnKSA6IGZhbHNlO1xuICAgIGlmIChhdXRoSW5Ib3N0KSB7XG4gICAgICByZXN1bHQuYXV0aCA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICAgIHJlc3VsdC5ob3N0ID0gcmVzdWx0Lmhvc3RuYW1lID0gYXV0aEluSG9zdC5zaGlmdCgpO1xuICAgIH1cbiAgfVxuXG4gIG11c3RFbmRBYnMgPSBtdXN0RW5kQWJzIHx8IChyZXN1bHQuaG9zdCAmJiBzcmNQYXRoLmxlbmd0aCk7XG5cbiAgaWYgKG11c3RFbmRBYnMgJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBzcmNQYXRoLnVuc2hpZnQoJycpO1xuICB9XG5cbiAgaWYgKCFzcmNQYXRoLmxlbmd0aCkge1xuICAgIHJlc3VsdC5wYXRobmFtZSA9IG51bGw7XG4gICAgcmVzdWx0LnBhdGggPSBudWxsO1xuICB9IGVsc2Uge1xuICAgIHJlc3VsdC5wYXRobmFtZSA9IHNyY1BhdGguam9pbignLycpO1xuICB9XG5cbiAgLy90byBzdXBwb3J0IHJlcXVlc3QuaHR0cFxuICBpZiAoIWlzTnVsbChyZXN1bHQucGF0aG5hbWUpIHx8ICFpc051bGwocmVzdWx0LnNlYXJjaCkpIHtcbiAgICByZXN1bHQucGF0aCA9IChyZXN1bHQucGF0aG5hbWUgPyByZXN1bHQucGF0aG5hbWUgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgKHJlc3VsdC5zZWFyY2ggPyByZXN1bHQuc2VhcmNoIDogJycpO1xuICB9XG4gIHJlc3VsdC5hdXRoID0gcmVsYXRpdmUuYXV0aCB8fCByZXN1bHQuYXV0aDtcbiAgcmVzdWx0LnNsYXNoZXMgPSByZXN1bHQuc2xhc2hlcyB8fCByZWxhdGl2ZS5zbGFzaGVzO1xuICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblVybC5wcm90b3R5cGUucGFyc2VIb3N0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBob3N0ID0gdGhpcy5ob3N0O1xuICB2YXIgcG9ydCA9IHBvcnRQYXR0ZXJuLmV4ZWMoaG9zdCk7XG4gIGlmIChwb3J0KSB7XG4gICAgcG9ydCA9IHBvcnRbMF07XG4gICAgaWYgKHBvcnQgIT09ICc6Jykge1xuICAgICAgdGhpcy5wb3J0ID0gcG9ydC5zdWJzdHIoMSk7XG4gICAgfVxuICAgIGhvc3QgPSBob3N0LnN1YnN0cigwLCBob3N0Lmxlbmd0aCAtIHBvcnQubGVuZ3RoKTtcbiAgfVxuICBpZiAoaG9zdCkgdGhpcy5ob3N0bmFtZSA9IGhvc3Q7XG59O1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCI7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuICBhcmcgPT0gbnVsbDtcbn1cbiIsInZhciByZW1vdmVJbnZhbGlkQ2hhcmFjdGVycyA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gICAgLy8gU2VlIGh0dHA6Ly93d3cudzMub3JnL1RSL3htbC8jTlQtQ2hhciBmb3IgdmFsaWQgWE1MIDEuMCBjaGFyYWN0ZXJzXG4gICAgcmV0dXJuIGNvbnRlbnQucmVwbGFjZSgvW1xceDAwLVxceDA4XFx4MEJcXHgwQ1xceDBFLVxceDFGXS9nLCAnJyk7XG59O1xuXG52YXIgc2VyaWFsaXplQXR0cmlidXRlVmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWVcbiAgICAgICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcbiAgICAgICAgLnJlcGxhY2UoLycvZywgJyZhcG9zOycpO1xufTtcblxudmFyIHNlcmlhbGl6ZVRleHRDb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgICByZXR1cm4gY29udGVudFxuICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7Jyk7XG59O1xuXG52YXIgc2VyaWFsaXplQXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHIpIHtcbiAgICB2YXIgdmFsdWUgPSBhdHRyLnZhbHVlO1xuXG4gICAgcmV0dXJuICcgJyArIGF0dHIubmFtZSArICc9XCInICsgc2VyaWFsaXplQXR0cmlidXRlVmFsdWUodmFsdWUpICsgJ1wiJztcbn07XG5cbnZhciBnZXRUYWdOYW1lID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICB2YXIgdGFnTmFtZSA9IG5vZGUudGFnTmFtZTtcblxuICAgIC8vIEFpZCBpbiBzZXJpYWxpemluZyBvZiBvcmlnaW5hbCBIVE1MIGRvY3VtZW50c1xuICAgIGlmIChub2RlLm5hbWVzcGFjZVVSSSA9PT0gJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwnKSB7XG4gICAgICAgIHRhZ05hbWUgPSB0YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIHJldHVybiB0YWdOYW1lO1xufTtcblxudmFyIHNlcmlhbGl6ZU5hbWVzcGFjZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgdmFyIG5vZGVIYXNYbWxuc0F0dHIgPSBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwobm9kZS5hdHRyaWJ1dGVzIHx8IG5vZGUuYXR0cnMsIGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgICAgICByZXR1cm4gYXR0ci5uYW1lO1xuICAgICAgICB9KVxuICAgICAgICAuaW5kZXhPZigneG1sbnMnKSA+PSAwO1xuICAgIC8vIFNlcmlhbGl6ZSB0aGUgbmFtZXNwYWNlIGFzIGFuIHhtbG5zIGF0dHJpYnV0ZSB3aGVuZXZlciB0aGUgZWxlbWVudFxuICAgIC8vIGRvZXNuJ3QgYWxyZWFkeSBoYXZlIG9uZSBhbmQgdGhlIGluaGVyaXRlZCBuYW1lc3BhY2UgZG9lcyBub3QgbWF0Y2hcbiAgICAvLyB0aGUgZWxlbWVudCdzIG5hbWVzcGFjZS5cbiAgICAvLyBBcyBhIHNwZWNpYWwgY2FzZSwgYWx3YXlzIGluY2x1ZGUgYW4geG1sbnMgZm9yIGh0bWwgZWxlbWVudHMsIGluIGNhc2VcbiAgICAvLyBvZiBicm9rZW4gbmFtZXNwYWNlVVJJIGhhbmRsaW5nIGJ5IGJyb3dzZXJzLlxuICAgIGlmICghbm9kZUhhc1htbG5zQXR0ciAmJlxuICAgICAgICAgICAgKCFub2RlLnBhcmVudE5vZGUgfHxcbiAgICAgICAgICAgICBub2RlLm5hbWVzcGFjZVVSSSAhPT0gbm9kZS5wYXJlbnROb2RlLm5hbWVzcGFjZVVSSSB8fFxuICAgICAgICAgICAgIGdldFRhZ05hbWUobm9kZSkgPT09ICdodG1sJykpIHtcbiAgICAgICAgIHJldHVybiAnIHhtbG5zPVwiJyArIG5vZGUubmFtZXNwYWNlVVJJICsgJ1wiJztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgfVxufTtcblxudmFyIHNlcmlhbGl6ZUNoaWxkcmVuID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKG5vZGUuY2hpbGROb2RlcywgZnVuY3Rpb24gKGNoaWxkTm9kZSkge1xuICAgICAgICByZXR1cm4gbm9kZVRyZWVUb1hIVE1MKGNoaWxkTm9kZSk7XG4gICAgfSkuam9pbignJyk7XG59O1xuXG52YXIgc2VyaWFsaXplVGFnID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICB2YXIgb3V0cHV0ID0gJzwnICsgZ2V0VGFnTmFtZShub2RlKTtcbiAgICBvdXRwdXQgKz0gc2VyaWFsaXplTmFtZXNwYWNlKG5vZGUpO1xuXG4gICAgQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChub2RlLmF0dHJpYnV0ZXMgfHwgbm9kZS5hdHRycywgZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgb3V0cHV0ICs9IHNlcmlhbGl6ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICB9KTtcblxuICAgIGlmIChub2RlLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBvdXRwdXQgKz0gJz4nO1xuICAgICAgICBvdXRwdXQgKz0gc2VyaWFsaXplQ2hpbGRyZW4obm9kZSk7XG4gICAgICAgIG91dHB1dCArPSAnPC8nICsgZ2V0VGFnTmFtZShub2RlKSArICc+JztcbiAgICB9IGVsc2Uge1xuICAgICAgICBvdXRwdXQgKz0gJy8+JztcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbnZhciBzZXJpYWxpemVUZXh0ID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICB2YXIgdGV4dCA9IG5vZGUubm9kZVZhbHVlIHx8IG5vZGUudmFsdWUgfHwgJyc7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZVRleHRDb250ZW50KHRleHQpO1xufTtcblxudmFyIHNlcmlhbGl6ZUNvbW1lbnQgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIHJldHVybiAnPCEtLScgK1xuICAgICAgICBub2RlLmRhdGFcbiAgICAgICAgICAgIC5yZXBsYWNlKC8tL2csICcmIzQ1OycpICtcbiAgICAgICAgJy0tPic7XG59O1xuXG52YXIgc2VyaWFsaXplQ0RBVEEgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIHJldHVybiAnPCFbQ0RBVEFbJyArIG5vZGUubm9kZVZhbHVlICsgJ11dPic7XG59O1xuXG52YXIgbm9kZVRyZWVUb1hIVE1MID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5ub2RlTmFtZSA9PT0gJyNkb2N1bWVudCcgfHxcbiAgICAgICAgbm9kZS5ub2RlTmFtZSA9PT0gJyNkb2N1bWVudC1mcmFnbWVudCcpIHtcbiAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZUNoaWxkcmVuKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChub2RlLnRhZ05hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBzZXJpYWxpemVUYWcobm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5ub2RlTmFtZSA9PT0gJyN0ZXh0Jykge1xuICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZVRleHQobm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5ub2RlTmFtZSA9PT0gJyNjb21tZW50Jykge1xuICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZUNvbW1lbnQobm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5ub2RlTmFtZSA9PT0gJyNjZGF0YS1zZWN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZUNEQVRBKG5vZGUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0cy5zZXJpYWxpemVUb1N0cmluZyA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xuICAgIHJldHVybiByZW1vdmVJbnZhbGlkQ2hhcmFjdGVycyhub2RlVHJlZVRvWEhUTUwoZG9jdW1lbnQpKTtcbn07XG4iLCJcclxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcclxudmFyIFNuYXBzaG90ID0gcmVxdWlyZSgnLi9zbmFwc2hvdCcpO1xyXG52YXIgZGF0YVRyZWUgPSByZXF1aXJlKCdkYXRhLXRyZWUnKTtcclxudmFyIENoYW5nZXMgPSByZXF1aXJlKCcuL2NoYW5nZXMnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG4gIC8vIEZsYWcgYmFkIHByYWN0aXNlc1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBBY3Rpb25cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICB2YXIgQWN0aW9uID0gZnVuY3Rpb24ocGxheUNhbGxiYWNrKXtcclxuXHJcbiAgICB0aGlzLl9wbGF5Q2FsbGJhY2sgPSBwbGF5Q2FsbGJhY2s7XHJcbiAgICB0aGlzLl9kb25lQ2FsbGJhY2sgPSBudWxsO1xyXG5cclxuICB9O1xyXG5cclxuICBBY3Rpb24ucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoID4gMCl7XHJcbiAgICAgIHRoaXMuX2RvbmVDYWxsYmFjayA9IGNhbGxiYWNrO1xyXG4gICAgfSBlbHNlIGlmKHRoaXMuX2RvbmVDYWxsYmFjayl7XHJcbiAgICAgIHRoaXMuX2RvbmVDYWxsYmFjaygpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIEFjdGlvbi5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGN1cnJlbnRDaGFuZ2VzLCBwYXJlbnRJblN1YiwgcGFyZW50SW5NYXN0ZXIpe1xyXG4gICAgaWYodGhpcy5fcGxheUNhbGxiYWNrKSB0aGlzLl9wbGF5Q2FsbGJhY2soY3VycmVudENoYW5nZXMsIHBhcmVudEluU3ViLCBwYXJlbnRJbk1hc3Rlcik7XHJcbiAgfTtcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBFeHBvcnRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICByZXR1cm4gQWN0aW9uO1xyXG5cclxufSgpKTtcclxuIiwiXHJcbnZhciBoZWxwZXJzID0gcmVxdWlyZSgnLi9oZWxwZXJzJyk7XHJcbnZhciByYXN0ZXJpemVIVE1MID0gcmVxdWlyZSgncmFzdGVyaXplaHRtbCcpO1xyXG52YXIgY2xvbmUgPSByZXF1aXJlKCdjbG9uZScpO1xyXG52YXIgQWN0aW9uID0gcmVxdWlyZSgnLi9hY3Rpb24nKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG4gIC8vIEZsYWcgYmFkIHByYWN0aXNlc1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBDaGFuZ2VzXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVwcmVzZW50cyB0aGUgY2hhbmdlcyBjYXB0dXJlZCBpbiB2aXN1YWxpemF0aW9uIGF0IHBhcnRpY3VsYXIgbW9tZW50XHJcbiAgICpcclxuICAgKiBAY2xhc3NcclxuICAgKiBAa2luZCBjbGFzc1xyXG4gICAqIEBjb25zdHJ1Y3RvclxyXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBzdWJUcmFpbCAtIHN1YiB0cmFpbCB0byB3aGljaCBjaGFuZ2VzIGJlbG9uZ3NcclxuICAgKiBAcGFyYW0ge29iamVjdCB8IGFycmF5IHwgc3RyaW5nIHwgbnVtYmVyIHwgbnVsbH0gZGF0YSAtIGRhdGEgdGhhdCB3YXMgY2hhbmdlZFxyXG4gICAqL1xyXG4gIHZhciBDaGFuZ2VzID0gZnVuY3Rpb24oc3ViVHJhaWwsIGRhdGEpe1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXV0by1nZW5lcmF0ZWQgYWxwaGFudW1lcmljIGlkIHRoYXQgdW5pcWVseSBpZGVudGlmaWVzIHRoZSBjaGFuZ2UuXHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF9pZFxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgdGhpcy5faWQgPSBoZWxwZXJzLmd1aWQoKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIHtAbGluayBTdWJUcmFpbH0gdG8gd2hpY2ggdGhpcyBjaGFuZ2VzIGFyZSBhc3NvY2lhdGVkLlxyXG4gICAgICpcclxuICAgICAqIEBwcm9wZXJ0eSBfc3ViVHJhaWxcclxuICAgICAqIEB0eXBlIHtvYmplY3R9XHJcbiAgICAgKiBAZGVmYXVsdCBcIm51bGxcIlxyXG4gICAgICovXHJcbiAgICB0aGlzLl9zdWJUcmFpbCA9IHN1YlRyYWlsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGF0YSB0aGF0IHdhcyByZWNvcmRlZCBhcyBjaGFuZ2UuXHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF9kYXRhXHJcbiAgICAgKiBAdHlwZSB7b2JqZWN0IHwgYXJyYXkgfCBudW1iZXIgfCBzdHJpbmcgfCBudWxsfVxyXG4gICAgICogQGRlZmF1bHQgXCJudWxsXCJcclxuICAgICAqL1xyXG4gICAgdGhpcy5fZGF0YSA9IGNsb25lKGRhdGEpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGF0YSB0aGF0IHJlcHJlc2VudHMgYSBjaGVja3BvaW50IHN0YXRlXHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF9jaGVja3BvaW50RGF0YVxyXG4gICAgICogQHR5cGUge29iamVjdCB8IGFycmF5IHwgbnVtYmVyIHwgc3RyaW5nIHwgbnVsbH1cclxuICAgICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2NoZWNrcG9pbnREYXRhID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNob3VsZCB1c2UgYXMgYSBjaGVja3BvaW50XHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF91c2VBc0NoZWNrcG9pbnRcclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICogQGRlZmF1bHQgXCJmYWxzZVwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX3VzZUFzQ2hlY2twb2ludCA9IGZhbHNlO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGltZXN0YW1wIGF0IHdoaWNoIGNoYW5nZXMgd2VyZSByZWNvcmRlZC5cclxuICAgICAqXHJcbiAgICAgKiBAcHJvcGVydHkgX3JlY29yZGVkQXRcclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKiBAZGVmYXVsdCBcInRpbWVzdGFtcFwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX3JlY29yZGVkQXQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRodW1ibmFpbCBjYXB0dXJlZC5cclxuICAgICAqXHJcbiAgICAgKiBAcHJvcGVydHkgX3RodW1ibmFpbFxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX3RodW1ibmFpbCA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBMZXZlbCBvZiBzbmFwc2hvdCBpbiBhIHN1Yi10cmFpbCB0cmVlXHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF9sZXZlbFxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqIEBkZWZhdWx0IC0xXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2xldmVsSW5TdWJUcmFpbCA9IC0xO1xyXG5cclxuICAvKipcclxuICAgKiBMZXZlbCBvZiBzbmFwc2hvdCBpbiBhIG1hc3Rlci10cmFpbCB0cmVlXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkgX2xldmVsXHJcbiAgICogQHR5cGUge251bWJlcn1cclxuICAgKiBAZGVmYXVsdCAtMVxyXG4gICAqL1xyXG4gIHRoaXMuX2xldmVsSW5NYXN0ZXJUcmFpbCA9IC0xO1xyXG5cclxuICAvKipcclxuICAgKiBOb2RlIHRoYXQgZW5jYXBzdWxhdGVzIGNoYW5nZSBpbiBtYXN0ZXIgdHJhaWxcclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSBfbm9kZUluTWFzdGVyVHJhaWxcclxuICAgKiBAdHlwZSB7b2JqZWN0fVxyXG4gICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICovXHJcbiAgdGhpcy5fbm9kZUluTWFzdGVyVHJhaWwgPSBudWxsO1xyXG5cclxuICAvKipcclxuICAgKiBOb2RlIHRoYXQgZW5jYXBzdWxhdGVzIGNoYW5nZSBpbiBzdWIgdHJhaWxcclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSBfbm9kZUluU3ViVHJhaWxcclxuICAgKiBAdHlwZSB7b2JqZWN0fVxyXG4gICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICovXHJcbiAgdGhpcy5fbm9kZUluU3ViVHJhaWwgPSBudWxsO1xyXG5cclxuICAvKipcclxuICAgKiBGb3J3YXJkIGFjdGlvbiBjYWxsYmFja1xyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IF9mb3J3YXJkQWN0aW9uQ2FsbGJhY2tcclxuICAgKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAgICogQGRlZmF1bHQgbnVsbFxyXG4gICAqL1xyXG4gICB0aGlzLl9mb3J3YXJkQWN0aW9uID0gbnVsbDtcclxuXHJcbiAgIC8qKlxyXG4gICAgKiBJbnZlcnNlIGFjdGlvbiBjYWxsYmFja1xyXG4gICAgKlxyXG4gICAgKiBAcHJvcGVydHkgX2ludmVyc2VBY3Rpb25DYWxsYmFja1xyXG4gICAgKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAgICAqIEBkZWZhdWx0IG51bGxcclxuICAgICovXHJcbiAgICB0aGlzLl9pbnZlcnNlQWN0aW9uID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFjdGlvbiBEb25lIENhbGxiYWNrXHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF9hY3Rpb25Eb25lQ2FsbGJhY2tcclxuICAgICAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICAgICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2FjdGlvbkRvbmVDYWxsYmFjayA9IG51bGw7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gR2V0dGVycyBhbmQgU2V0dGVyc1xyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIC8qKlxyXG4gICAqIFNldHMgb3IgZ2V0cyB0aGUgaWRcclxuICAgKlxyXG4gICAqIEBtZXRob2QgaWRcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBpZCBvZiB0aGUgY2hhbmdlXHJcbiAgICovXHJcbiAgQ2hhbmdlcy5wcm90b3R5cGUuaWQgPSBmdW5jdGlvbihpZCl7XHJcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoID4gMCl7XHJcbiAgICAgIHRoaXMuX2lkID0gaWQ7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHRoaXMuX2lkO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFN1YiBUcmFpbCB0byB3aGljaCBjaGFuZ2VzIGJlbG9uZ3NcclxuICAgKlxyXG4gICAqIEBtZXRob2Qgc3ViVHJhaWxcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBpZCBvZiB0aGUgY2hhbmdlXHJcbiAgICovXHJcbiAgQ2hhbmdlcy5wcm90b3R5cGUuc3ViVHJhaWwgPSBmdW5jdGlvbigpe1xyXG4gICAgcmV0dXJuIHRoaXMuX3N1YlRyYWlsO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldHMgb3IgZ2V0cyB0aGUgZGF0YS5cclxuICAgKlxyXG4gICAqIEBtZXRob2QgZGF0YVxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7b2JqZWN0IHwgYXJyYXkgfCBzdHJpbmcgfCBudW1iZXIgfCBudWxsIH0gZGF0YSAtIGRhdGEgdGhhdCBoYXMgdG8gYmUgcmVjb3JkZWQuXHJcbiAgICovXHJcbiAgQ2hhbmdlcy5wcm90b3R5cGUuZGF0YSA9IGZ1bmN0aW9uKGRhdGEpe1xyXG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA+IDApe1xyXG4gICAgICB0aGlzLl9kYXRhID0gY2xvbmUoZGF0YSk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogUmV0dXJucyBhIGNoZWNrcG9pbnQgZGF0YVxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBkYXRhXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICovXHJcbiAgQ2hhbmdlcy5wcm90b3R5cGUuY2hlY2twb2ludERhdGEgPSBmdW5jdGlvbigpe1xyXG4gICAgcmV0dXJuIHRoaXMuX2NoZWNrcG9pbnREYXRhO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldHMgb3IgZ2V0cyB0aGUgdGltZXN0YW1wIGF0IHdoaWNoIGNoYW5nZXMgd2VyZSByZWNvcmRlZC5cclxuICAgKlxyXG4gICAqIEBtZXRob2QgcmVjb3JkZWRBdFxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXAgLSB0aW1lIGF0IHdoaWNoIGNoYW5nZXMgd2VyZSByZWNvcmRlZFxyXG4gICAqL1xyXG4gIENoYW5nZXMucHJvdG90eXBlLnJlY29yZGVkQXQgPSBmdW5jdGlvbih0aW1lc3RhbXApe1xyXG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA+IDApe1xyXG4gICAgICB0aGlzLl9yZWNvcmRlZEF0ID0gdGltZXN0YW1wO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiB0aGlzLl9yZWNvcmRlZEF0O1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldHMgb3IgZ2V0cyB0aGUgdGh1bWJuYWlsXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIHRodW1ibmFpbFxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0aHVtYm5haWwgLSBiYXNlNjQgcmVwcmVzZW50YXRpb24gb2YgdGh1bWJuYWlsXHJcbiAgICovXHJcbiAgQ2hhbmdlcy5wcm90b3R5cGUudGh1bWJuYWlsID0gZnVuY3Rpb24odGh1bWJuYWlsKXtcclxuICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPiAwKXtcclxuICAgICAgdGhpcy5fdGh1bWJuYWlsID0gdGh1bWJuYWlsO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiB0aGlzLl90aHVtYm5haWw7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgbGV2ZWwgaW4gTWFzdGVyIFRyYWlsXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIGxldmVsSW5NYXN0ZXJUcmFpbFxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEByZXR1cm4ge251bWJlcn0gbGV2ZWwgLSBsZXZlbCBpbiBtYXN0ZXIgdHJhaWxcclxuICAgKi9cclxuICBDaGFuZ2VzLnByb3RvdHlwZS5sZXZlbEluTWFzdGVyVHJhaWwgPSBmdW5jdGlvbigpe1xyXG4gICAgcmV0dXJuIHRoaXMuX2xldmVsSW5NYXN0ZXJUcmFpbDtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBHZXRzIHRoZSBsZXZlbCBpbiBTdWIgVHJhaWxcclxuICAgKlxyXG4gICAqIEBtZXRob2QgbGV2ZWxJblN1YlRyYWlsXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHJldHVybiB7bnVtYmVyfSBsZXZlbCAtIGxldmVsIGluIHN1YiB0cmFpbFxyXG4gICAqL1xyXG4gIENoYW5nZXMucHJvdG90eXBlLmxldmVsSW5TdWJUcmFpbCA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5fbGV2ZWxJblN1YlRyYWlsO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIG5vZGUgdGhhdCBlbmNhcHN1bGF0ZXMgY2hhbmdlcyBpbiBtYXN0ZXIgdHJhaWxcclxuICAgKlxyXG4gICAqIEBtZXRob2Qgbm9kZUluTWFzdGVyVHJhaWxcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcmV0dXJuIHtvYmplY3R9IG5vZGUgLSBub2RlIGluIG1hc3RlciB0cmFpbFxyXG4gICAqL1xyXG4gIENoYW5nZXMucHJvdG90eXBlLm5vZGVJbk1hc3RlclRyYWlsID0gZnVuY3Rpb24oKXtcclxuICAgIHJldHVybiB0aGlzLl9ub2RlSW5NYXN0ZXJUcmFpbDtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBHZXRzIHRoZSBub2RlIHRoYXQgZW5jYXBzdWxhdGVzIGNoYW5nZXMgaW4gc3ViIHRyYWlsXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIG5vZGVJblN1YlRyYWlsXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHJldHVybiB7b2JqZWN0fSBub2RlIC0gbm9kZSBpbiBzdWIgdHJhaWxcclxuICAgKi9cclxuICBDaGFuZ2VzLnByb3RvdHlwZS5ub2RlSW5TdWJUcmFpbCA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5fbm9kZUluU3ViVHJhaWw7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogU2V0cyB0aGUgZm9yd2FyZCBhY3Rpb25cclxuICAgKlxyXG4gICAqIEBtZXRob2Qgc2V0Rm9yd2FyZEFjdGlvblxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gY2FsbGJhY2sgdGhhdCBpbXBsZW1lbnRzIGZvcndhcmQgYWN0aW9uXHJcbiAgICovXHJcbiAgQ2hhbmdlcy5wcm90b3R5cGUuc2V0Rm9yd2FyZEFjdGlvbiA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuICAgIGlmKGNhbGxiYWNrICYmIHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgIHRoaXMuX2ZvcndhcmRBY3Rpb24gPSBuZXcgQWN0aW9uKGNhbGxiYWNrKTtcclxuICAgICAgcmV0dXJuIHRoaXMuX2ZvcndhcmRBY3Rpb247XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogU2V0cyB0aGUgaW52ZXJzZSBhY3Rpb25cclxuICAgKlxyXG4gICAqIEBtZXRob2Qgc2V0SW52ZXJzZUFjdGlvblxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gY2FsbGJhY2sgdGhhdCBpbXBsZW1lbnRzIGludmVyc2UgYWN0aW9uXHJcbiAgICovXHJcbiAgQ2hhbmdlcy5wcm90b3R5cGUuc2V0SW52ZXJzZUFjdGlvbiA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuICAgIGlmKGNhbGxiYWNrICYmIHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgIHRoaXMuX2ludmVyc2VBY3Rpb24gPSBuZXcgQWN0aW9uKGNhbGxiYWNrKTtcclxuICAgICAgcmV0dXJuIHRoaXMuX2ludmVyc2VBY3Rpb247XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2tzIGlmIG5vZGUgaXMgY2hlY2twb2ludFxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBpc0NoZWNrcG9pbnRcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKi9cclxuICBDaGFuZ2VzLnByb3RvdHlwZS5pc0NoZWNrcG9pbnQgPSBmdW5jdGlvbigpe1xyXG4gICAgcmV0dXJuIHRoaXMuX3VzZUFzQ2hlY2twb2ludDtcclxuICB9O1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIE1ldGhvZHNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAvKipcclxuICAgKiBDYXB0dXJlcyBhIHRodW1ibmFpbCBvZiBnaXZlbiBjYXB0dXJlQXJlYVxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBjYXB0dXJlVGh1bWJuYWlsXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHBhcmFtIHtzdHJpbmd9IGNhcHR1cmVBcmVhIC0gcXVlcnkgc2VsZWN0b3Igd2hpY2ggaGFzIHRvIHJlbmRlcmVkIGFzIHRodW1ibmFpbC5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gZGVsYXkgLSBkZWxheSBpbiBtaWxsaXNlY29uZHMgYWZ0ZXIgd2hpY2ggdGh1bWJuYWlsIHNob3VsZCBiZSBjYXB0dXJlZC5cclxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIGdldHMgdHJpZ2dlcmVkIHdoZW4gc25hcHNob3QgZmluaXNoZXMgcmVuZGVyaW5nIHRodW1ibmFpbC5cclxuICAgKi9cclxuICAgIENoYW5nZXMucHJvdG90eXBlLmNhcHR1cmVUaHVtYm5haWwgPSBmdW5jdGlvbihlbGVtZW50LCBkZWxheSl7XHJcblxyXG4gICAgICAvLyBIb2xkIGB0aGlzYFxyXG4gICAgICB2YXIgdGhpc3MgPSB0aGlzO1xyXG5cclxuICAgICAgLy8gQ2FwdHVyZVxyXG4gICAgICBpZihlbGVtZW50ICYmIHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJyl7XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgcmFzdGVyaXplKHRoaXNzLCBlbGVtZW50LCBmdW5jdGlvbihpbWFnZUJhc2U2NCl7XHJcbiAgICAgICAgICAgIHRoaXNzLnN1YlRyYWlsKCkuX2V2ZW50cy5vblRodW1ibmFpbENhcHR1cmVkLmZvckVhY2goZnVuY3Rpb24oaGFuZGxlcil7XHJcbiAgICAgICAgICAgICAgaGFuZGxlcih0aGlzcyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSwgZGVsYXkgJiYgdHlwZW9mIGRlbGF5ID09PSAnbnVtYmVyJyA/IGRlbGF5IDogMCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW52ZXJ0IHRoZSBjaGFuZ2VzXHJcbiAgICAgKlxyXG4gICAgICogQG1ldGhvZCBpbnZlcnNlXHJcbiAgICAgKiBAa2luZCBtZW1iZXJcclxuICAgICAqL1xyXG4gICAgQ2hhbmdlcy5wcm90b3R5cGUuaW52ZXJzZSA9IGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhcIkludmVyc2VcIiwgdGhpcyk7XHJcblxyXG4gICAgICAvLyBHZXQgUGFyZW50cyBmcm9tIE1hc3RlciBhbmQgU3ViIFRyZWVcclxuICAgICAgdmFyIHBhcmVudEluTWFzdGVyID0gdGhpcy5ub2RlSW5NYXN0ZXJUcmFpbCgpLl9wYXJlbnROb2RlID8gdGhpcy5ub2RlSW5NYXN0ZXJUcmFpbCgpLl9wYXJlbnROb2RlLl9kYXRhLmNoYW5nZXMgOiBudWxsO1xyXG4gICAgICB2YXIgcGFyZW50SW5TdWIgPSB0aGlzLm5vZGVJblN1YlRyYWlsKCkuX3BhcmVudE5vZGUgPyB0aGlzLm5vZGVJblN1YlRyYWlsKCkuX3BhcmVudE5vZGUuX2RhdGEuY2hhbmdlcyA6IG51bGw7XHJcblxyXG4gICAgICAvLyBDYWxsIEludmVyc2VcclxuICAgICAgaWYodGhpcy5faW52ZXJzZUFjdGlvbil7XHJcbiAgICAgICAgdGhpcy5faW52ZXJzZUFjdGlvbi5wbGF5KHRoaXMsIHBhcmVudEluU3ViLCBwYXJlbnRJbk1hc3Rlcik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFVwZGF0ZSBDdXJyZW50IE5vZGVcclxuICAgICAgaWYodGhpcy5ub2RlSW5TdWJUcmFpbCgpLl9wYXJlbnROb2RlKSB0aGlzLnN1YlRyYWlsKCkuX2N1cnJlbnRWZXJzaW9uTm9kZSA9IHRoaXMubm9kZUluU3ViVHJhaWwoKS5fcGFyZW50Tm9kZTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLl9pbnZlcnNlQWN0aW9uO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGb3J3YXJkIHRoZSBjaGFuZ2VzXHJcbiAgICAgKlxyXG4gICAgICogQG1ldGhvZCBmb3J3YXJkXHJcbiAgICAgKiBAa2luZCBtZW1iZXJcclxuICAgICAqL1xyXG4gICAgQ2hhbmdlcy5wcm90b3R5cGUuZm9yd2FyZCA9IGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhcIkZvcndhcmRcIiwgdGhpcyk7XHJcblxyXG4gICAgICAvLyBHZXQgQ2hpbGRzIEZyb20gTWFzdGVyIGFuZCBTdWIgVHJhaWxcclxuICAgICAgdmFyIGxhc3RDaGlsZEluTWFzdGVyID0gdGhpcy5ub2RlSW5NYXN0ZXJUcmFpbCgpLl9jaGlsZE5vZGVzLmxlbmd0aCA/IHRoaXMubm9kZUluTWFzdGVyVHJhaWwoKS5fY2hpbGROb2Rlc1sgdGhpcy5ub2RlSW5NYXN0ZXJUcmFpbCgpLl9jaGlsZE5vZGVzLmxlbmd0aCAtMSBdLl9kYXRhLmNoYW5nZXMgOiBudWxsO1xyXG4gICAgICB2YXIgbGFzdENoaWxkSW5TdWIgPSB0aGlzLm5vZGVJblN1YlRyYWlsKCkuX2NoaWxkTm9kZXMubGVuZ3RoID8gdGhpcy5ub2RlSW5TdWJUcmFpbCgpLl9jaGlsZE5vZGVzWyB0aGlzLm5vZGVJblN1YlRyYWlsKCkuX2NoaWxkTm9kZXMubGVuZ3RoIC0xIF0uX2RhdGEuY2hhbmdlcyA6IG51bGw7XHJcblxyXG4gICAgICAvLyBDYWxsIEZvcndhcmRcclxuICAgICAgaWYodGhpcy5fZm9yd2FyZEFjdGlvbil7XHJcbiAgICAgICAgdGhpcy5fZm9yd2FyZEFjdGlvbi5wbGF5KHRoaXMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBVcGRhdGUgQ3VycmVudCBOb2RlXHJcbiAgICAgIGlmKGxhc3RDaGlsZEluTWFzdGVyICYmIGxhc3RDaGlsZEluTWFzdGVyID09PSBsYXN0Q2hpbGRJblN1YikgdGhpcy5zdWJUcmFpbCgpLl9jdXJyZW50VmVyc2lvbk5vZGUgPSB0aGlzLm5vZGVJblN1YlRyYWlsKCkuX2NoaWxkTm9kZXNbIHRoaXMubm9kZUluU3ViVHJhaWwoKS5fY2hpbGROb2Rlcy5sZW5ndGggLTEgXTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLl9mb3J3YXJkQWN0aW9uO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBkb25lcyB0aGUgYWN0aW9uXHJcbiAgICAgKlxyXG4gICAgICogQG1ldGhvZCBkb25lXHJcbiAgICAgKiBAa2luZCBtZW1iZXJcclxuICAgICAqL1xyXG4gICAgQ2hhbmdlcy5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgIGlmKHRoaXMuX2FjdGlvbkRvbmVDYWxsYmFjayl7XHJcbiAgICAgICAgdGhpcy5fYWN0aW9uRG9uZUNhbGxiYWNrKCk7XHJcbiAgICAgIH0gcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBQcml2YXRlIE1ldGhvZHNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICB2YXIgcmFzdGVyaXplID0gZnVuY3Rpb24odGhpc3MsIGVsZW1lbnQsIGNhbGxiYWNrKXtcclxuXHJcbiAgICAvLyBJZiByZXF1aXJlZCBhcmd1bWVudHMgYXJlIHBhc3NlZFxyXG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA+IDApe1xyXG5cclxuICAgICAgLy8gQ2hlY2sgSWYgcmFzdGVyaXplSFRNTCBpcyBpbmNsdWRlZFxyXG4gICAgICBpZighcmFzdGVyaXplSFRNTCB8fCByYXN0ZXJpemVIVE1MID09PSAndW5kZWZpbmVkJyl7XHJcbiAgICAgICAgaWYoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbWVudCkpe1xyXG4gICAgICAgIGlmKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENsb25lIGFuZCBIb2xkIGN1cnJlbnQgZG9jdW1lbnRcclxuICAgICAgdmFyIGN1cnJlbnREb2N1bWVudCA9IGRvY3VtZW50O1xyXG4gICAgICB2YXIgY2xvbm5lZERvY3VtZW50ID0gY3VycmVudERvY3VtZW50LmNsb25lTm9kZSh0cnVlKTtcclxuXHJcbiAgICAgIC8vIEdldCBCb2R5IGFuZCBIVE1MXHJcbiAgICAgIHZhciBib2R5ID0gY3VycmVudERvY3VtZW50LmJvZHksXHJcbiAgICAgICAgICBodG1sID0gY3VycmVudERvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcclxuXHJcbiAgICAgIC8vIENvbXB1dGUgTWF4IEhlaWdodFxyXG4gICAgICB2YXIgbWF4SGVpZ2h0ID0gTWF0aC5tYXgoYm9keS5zY3JvbGxIZWlnaHQsIGJvZHkub2Zmc2V0SGVpZ2h0LFxyXG4gICAgICBodG1sLmNsaWVudEhlaWdodCwgaHRtbC5zY3JvbGxIZWlnaHQsIGh0bWwub2Zmc2V0SGVpZ2h0KTtcclxuXHJcbiAgICAgIC8vIENvbXB1dGUgTWF4IFdpZHRoXHJcbiAgICAgIHZhciBtYXhXaWR0aCA9IE1hdGgubWF4KGJvZHkuc2Nyb2xsV2lkdGgsIGJvZHkub2Zmc2V0V2lkdGgsXHJcbiAgICAgIGh0bWwuY2xpZW50V2lkdGgsIGh0bWwuc2Nyb2xsV2lkdGgsIGh0bWwub2Zmc2V0V2lkdGgpO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIHRlbXBvcmFyeSBjYW52YXMgZWxlbWVudFxyXG4gICAgICB2YXIgY2FudmFzID0gY2xvbm5lZERvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcbiAgICAgIGNhbnZhcy53aWR0aCA9IG1heFdpZHRoO1xyXG4gICAgICBjYW52YXMuaGVpZ2h0ID0gbWF4SGVpZ2h0O1xyXG4gICAgICBjYW52YXMuaWQgPSBcInJhLWNhbnZhc1wiO1xyXG5cclxuICAgICAgLy8gTW9kaWZ5IENvbnRleHQgb2YgQ2FudmFzXHJcbiAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBcIiNGRkZGRkZcIjtcclxuICAgICAgY29udGV4dC5maWxsUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgICAgLy8gUmFzdGVyaXplIHRoZSBlbnRpcmUgZG9jdW1lbnRcclxuICAgICAgdmFyIGVsZW1lbnRET00gPSBjdXJyZW50RG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtZW50KTtcclxuXHJcbiAgICAgIC8vIFNpemUgYW5kIE9mZnNldHNcclxuICAgICAgdmFyIGhlaWdodCA9IE1hdGgubWF4KGVsZW1lbnRET00uY2xpZW50SGVpZ2h0LCBlbGVtZW50RE9NLnNjcm9sbEhlaWdodCksXHJcbiAgICAgICAgICB3aWR0aCA9IE1hdGgubWF4KGVsZW1lbnRET00uY2xpZW50V2lkdGgsIGVsZW1lbnRET00uc2Nyb2xsV2lkdGgpLFxyXG4gICAgICAgICAgdG9wT2Zmc2V0ID0gZWxlbWVudERPTS5vZmZzZXRUb3AsXHJcbiAgICAgICAgICBsZWZ0T2Zmc2V0ID0gZWxlbWVudERPTS5vZmZzZXRMZWZ0O1xyXG5cclxuICAgICAgLy8gRHJhdyByYXN0ZXJpemVkIGRvY3VtZW50XHJcbiAgICAgIHJhc3Rlcml6ZUhUTUwuZHJhd0RvY3VtZW50KGNsb25uZWREb2N1bWVudCwgY2FudmFzKS50aGVuKGZ1bmN0aW9uKHJlbmRlclJlc3VsdCkge1xyXG5cclxuICAgICAgICAvLyBHZXQgQ2FudmFzIGNvbnRleHRcclxuICAgICAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbiAgICAgICAgLy8gR2V0IEltYWdlIERhdGFcclxuICAgICAgICB2YXIgaW1hZ2VEYXRhID0gY3R4LmdldEltYWdlRGF0YShsZWZ0T2Zmc2V0LCB0b3BPZmZzZXQsIHdpZHRoLCBoZWlnaHQpO1xyXG5cclxuICAgICAgICAvLyBDbGVhciBDYW52YXMgUmVjdFxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgLy8gUmVzaXplIENhbnZhc1xyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XHJcblxyXG4gICAgICAgIC8vIFB1dCBjcm9wcGVkIGRhdGEgYmFja1xyXG4gICAgICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcclxuXHJcbiAgICAgICAgLy8gR2V0IGJhc2U2NFxyXG4gICAgICAgIHZhciBpbWFnZUJhc2U2NCA9IGNhbnZhcy50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIiwgMS4wKTtcclxuXHJcbiAgICAgICAgLy8gU2F2ZSBUaHVtYm5haWxcclxuICAgICAgICB0aGlzcy50aHVtYm5haWwoaW1hZ2VCYXNlNjQpO1xyXG5cclxuICAgICAgICAvLyBTZW5kIHJlc3VsdCBiYWNrXHJcbiAgICAgICAgaWYoY2FsbGJhY2spIGNhbGxiYWNrKGltYWdlQmFzZTY0KTtcclxuXHJcbiAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBFeHBvcnRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICByZXR1cm4gQ2hhbmdlcztcclxuXHJcbn0oKSk7XHJcbiIsIlxyXG52YXIgUnVsZSA9IHJlcXVpcmUoJy4vcnVsZScpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKXtcclxuXHJcbiAgLy8gRmxhZyBiYWQgcHJhY3Rpc2VzXHJcbiAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gQ2hlY2twb2ludCBNYW5hZ2VyXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdmFyIENoZWNrcG9pbnRNYW5hZ2VyID0gZnVuY3Rpb24oKXtcclxuXHJcbiAgLyoqXHJcbiAgICogUnVsZXMgZm9yIGNoZWNrcG9pbnRpbmcuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkgX3J1bGVzXHJcbiAgICogQHR5cGUge2FycmF5fVxyXG4gICAqIEBkZWZhdWx0IFwiW11cIlxyXG4gICAqL1xyXG4gICAgdGhpcy5fcnVsZXMgPSBbXTtcclxuXHJcbiAgICAvL1xyXG4gICAgdGhpcy5fc2V0Q2hlY2twb2ludENhbGxiYWNrID0gbnVsbDtcclxuICAgIHRoaXMuX2dldENoZWNrcG9pbnRDYWxsYmFjayA9IG51bGw7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gR2V0dGVycyBhbmQgU2V0dGVyc1xyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIHJ1bGVzIGFkZGVkIGZvciBjaGVja3BvaW50aW5nXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIHJ1bGVzXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHJldHVybiB7YXJyYXl9IC0gYXJyYXkgb2YgcnVsZXMgYWRkZWQgZm9yIGNoZWNrcG9pbnRpbmdcclxuICAgKi9cclxuICBDaGVja3BvaW50TWFuYWdlci5wcm90b3R5cGUucnVsZXMgPSBmdW5jdGlvbigpe1xyXG4gICAgcmV0dXJuIHRoaXMuX3J1bGVzO1xyXG4gIH07XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gTWV0aG9kc1xyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgYSBjaGVja3BvaW50aW5nIHJ1bGVcclxuICAgKlxyXG4gICAqIEBtZXRob2QgYWRkUnVsZVxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEByZXR1cm4ge2Z1bmN0aW9ufSAtIGZ1bmN0aW9uIGRlZmluaW5nIHJ1bGUgZm9yIGNoZWNrcG9pbnRpbmdcclxuICAgKi9cclxuICBDaGVja3BvaW50TWFuYWdlci5wcm90b3R5cGUuYWRkUnVsZSA9IGZ1bmN0aW9uKHJ1bGUpe1xyXG4gICAgaWYocnVsZSAmJiB0eXBlb2YgcnVsZSA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgIHJldHVybiB0aGlzLl9ydWxlc1t0aGlzLl9ydWxlcy5wdXNoKG5ldyBSdWxlKHJ1bGUpKSAtIDFdO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgbXVsdGlwbGUgY2hlY2twb2ludGluZyBydWxlcy5cclxuICAgKlxyXG4gICAqIEBtZXRob2QgYWRkUnVsZXNcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcmV0dXJuIHthcnJheX0gLSBhcnJheSBvZiBmdW5jdGlvbnMgZGVmaW5pbmcgcnVsZSBmb3IgY2hlY2twb2ludGluZ1xyXG4gICAqL1xyXG4gIENoZWNrcG9pbnRNYW5hZ2VyLnByb3RvdHlwZS5hZGRSdWxlcyA9IGZ1bmN0aW9uKHJ1bGVzKXtcclxuICAgIHZhciB0aGlzcyA9IHRoaXM7XHJcbiAgICBpZihydWxlcyAmJiBBcnJheS5pc0FycmF5KHJ1bGVzKSl7XHJcbiAgICAgIHJ1bGVzLmZvckVhY2goZnVuY3Rpb24ocnVsZSl7XHJcbiAgICAgICAgdGhpc3MuYWRkUnVsZShydWxlKTtcclxuICAgICAgfSk7XHJcbiAgICB9IHJldHVybiB0aGlzO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEFwcGx5IGFsbCBydWxlcyB0byBnaXZlbiBjaGFuZ2VzXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIGFwcGx5UnVsZXNcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcGFyYW0ge29iamVjdH0gc25hcHNob3QgLSBzbmFwc2hvdCB0aGF0IGlzIGNhcHR1cmVkXHJcbiAgICovXHJcbiAgQ2hlY2twb2ludE1hbmFnZXIucHJvdG90eXBlLmFwcGx5UnVsZXNUbyA9IGZ1bmN0aW9uKGNoYW5nZXMpe1xyXG4gICAgdmFyIHRoaXNzID0gdGhpcztcclxuICAgIHRoaXMucnVsZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHJ1bGUpe1xyXG4gICAgICBpZihydWxlLnBsYXkoY2hhbmdlcykpe1xyXG4gICAgICAgIGNoYW5nZXMuX3VzZUFzQ2hlY2twb2ludCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldHMgYSBjaGVja3BvaW50IGZ1bmN0aW9uXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIHNldENoZWNrcG9pbnRGdW5jXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IGdldHMgdGhlIGNoZWNrcG9pbnQgZGF0YVxyXG4gICAqL1xyXG4gIENoZWNrcG9pbnRNYW5hZ2VyLnByb3RvdHlwZS5zZXRDaGVja3BvaW50RnVuYyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuICAgIHRoaXMuX3NldENoZWNrcG9pbnRDYWxsYmFjayA9IGNhbGxiYWNrO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldHMgYSBjaGVja3BvaW50IGZ1bmN0aW9uXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIHNldENoZWNrcG9pbnRGdW5jXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IGdldHMgdGhlIGNoZWNrcG9pbnQgZGF0YVxyXG4gICAqL1xyXG4gIENoZWNrcG9pbnRNYW5hZ2VyLnByb3RvdHlwZS5nZXRDaGVja3BvaW50RnVuYyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuICAgIHRoaXMuX2dldENoZWNrcG9pbnRDYWxsYmFjayA9IGNhbGxiYWNrO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgYSBjaGVja3BvaW50XHJcbiAgICpcclxuICAgKiBAbWV0aG9kIGdldENoZWNrcG9pbnREYXRhXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICovXHJcbiAgQ2hlY2twb2ludE1hbmFnZXIucHJvdG90eXBlLmdldENoZWNrcG9pbnREYXRhID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG4gICAgaWYodGhpcy5fc2V0Q2hlY2twb2ludENhbGxiYWNrKSByZXR1cm4gdGhpcy5fc2V0Q2hlY2twb2ludENhbGxiYWNrKCk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogTG9hZHMgYVxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBnZXRDaGVja3BvaW50RGF0YVxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqL1xyXG4gIENoZWNrcG9pbnRNYW5hZ2VyLnByb3RvdHlwZS5zZXRDaGVja3BvaW50RGF0YSA9IGZ1bmN0aW9uKGRhdGEpe1xyXG4gICAgaWYodGhpcy5fZ2V0Q2hlY2twb2ludENhbGxiYWNrKSByZXR1cm4gdGhpcy5fZ2V0Q2hlY2twb2ludENhbGxiYWNrKGRhdGEpO1xyXG4gIH07XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gRXhwb3J0XHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgcmV0dXJuIENoZWNrcG9pbnRNYW5hZ2VyO1xyXG5cclxufSgpKTtcclxuIiwiXHJcbnZhciBDaGVja3BvaW50TWFuYWdlciA9IHJlcXVpcmUoJy4vY2hlY2twb2ludE1hbmFnZXInKTtcclxudmFyIFJ1bGUgPSByZXF1aXJlKCcuL3J1bGUnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcbiAgcmV0dXJuIHtcclxuICAgIGNoZWNrcG9pbnRNYW5hZ2VyOiBDaGVja3BvaW50TWFuYWdlcixcclxuICAgIHJ1bGU6IFJ1bGVcclxuICB9O1xyXG59KCkpO1xyXG4iLCJcclxudmFyIGNsb25lID0gcmVxdWlyZSgnY2xvbmUnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG4gIC8vIEZsYWcgYmFkIHByYWN0aXNlc1xyXG4gJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIFJ1bGVcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICB2YXIgUnVsZSA9IGZ1bmN0aW9uKHBsYXlDYWxsYmFjayl7XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcnVucyB0aGUgbG9naWMgZm9yIHJ1bGUgYW5kIHJldHVybnMgYm9vbGVhblxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IF9wbGF5Q2FsbGJhY2tcclxuICAgKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAgICogQGRlZmF1bHQgXCJudWxsXCJcclxuICAgKi9cclxuICAgIHRoaXMuX3BsYXlDYWxsYmFjayA9IHBsYXlDYWxsYmFjaztcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBHZXR0ZXJzIGFuZCBTZXR0ZXJzXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBNZXRob2RzXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgUnVsZS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKGF0dHJzKXtcclxuXHJcbiAgICAvLyBIb2xkIGB0aGlzYFxyXG4gICAgdmFyIHRoaXNzID0gdGhpcztcclxuXHJcbiAgICAvLyBJZiB2YWxpZCBvYmplY3QgaXMgcGFzc2VkOyBjb3B5IGF0dHJzIHRvIGB0aGlzYCBvYmplY3RcclxuICAgIGlmKGF0dHJzICYmIHR5cGVvZiBhdHRycyA9PT0gJ29iamVjdCcpe1xyXG4gICAgICBPYmplY3Qua2V5cyhhdHRycykuZm9yRWFjaChmdW5jdGlvbihhdHRyKXtcclxuICAgICAgICB0aGlzc1thdHRyXSA9IGF0dHJzW2F0dHJdO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBbGxvdyBtZXRob2QgY2hhaW5pbmdcclxuICAgIHJldHVybiB0aGlzO1xyXG5cclxuICB9O1xyXG5cclxuICBSdWxlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oY2hhbmdlcyl7XHJcbiAgICByZXR1cm4gdGhpcy5fcGxheUNhbGxiYWNrKGNoYW5nZXMpO1xyXG4gIH07XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gRXhwb3J0XHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgcmV0dXJuIFJ1bGU7XHJcblxyXG59KCkpO1xyXG4iLCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKGRvYyl7XHJcblxyXG4gIC8vIEZsYWcgYmFkIHByYWN0aXNlc1xyXG4gJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIEJhc2ljIFNldHVwXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdmFyIGNvbnRyb2xCb3ggPSB7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gTWV0aG9kc1xyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGNvbnRyb2xCb3guY3JlYXRlID0gZnVuY3Rpb24odHJhaWwpe1xyXG5cclxuICAgIC8vIENyZWF0ZSBtYWluIGNvbnRhaW5lclxyXG4gICAgdmFyIGNvbnRhaW5lciA9IGRvYy5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cclxuICAgIC8vIEFwcGVuZCBQcm9wZXJ0aWVzXHJcbiAgICBkMy5zZWxlY3QoY29udGFpbmVyKVxyXG4gICAgICAuYXR0cignaWQnLCB0cmFpbC5faWQgKyAnLWNvbnRyb2wtYm94LWNvbnRhaW5lcicpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsICd0cmFpbHMtY29udHJvbC1ib3gtY29udGFpbmVyJyk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGNvbnRyb2wgYm94XHJcbiAgICB2YXIgYm94ID0gZDMuc2VsZWN0KGNvbnRhaW5lcilcclxuICAgICAgLmFwcGVuZChcImRpdlwiKVxyXG4gICAgICAuYXR0cignaWQnLCB0cmFpbC5faWQgKyAnLWNvbnRyb2wtYm94JylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RyYWlscy1jb250cm9sLWJveCcpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhbmQgYXBwZW5kIHRpdGxlLWNvbnRhaW5lciBhbmQgdGl0bGVcclxuICAgIHZhciB0aXRsZWJhciA9IGJveC5hcHBlbmQoJ2RpdicpXHJcbiAgICAgIC5hdHRyKCdpZCcsIHRyYWlsLl9pZCArICctdGl0bGUtY29udGFpbmVyJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RyYWlscy10aXRsZS1jb250YWluZXInKVxyXG4gICAgICAuYXBwZW5kKCdwJylcclxuICAgICAgLmF0dHIoJ2lkJywgdHJhaWwuX2lkICsgJy10cmFpbHMtdGl0bGUnKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCAndHJhaWxzLXRpdGxlJylcclxuICAgICAgLnRleHQoJ3RyYWlsLScgKyB0cmFpbC5faWQuc3BsaXQoJy0nKVswXSArICcuLi4nKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgYW5kIGFwcGVuZCBjb250cm9scy1jb250YWluZXJcclxuICAgIHZhciBjb250cm9sc0NvbnRhaW5lciA9IGJveC5hcHBlbmQoJ2RpdicpXHJcbiAgICAgIC5hdHRyKCdpZCcsIHRyYWlsLl9pZCArICctY29udHJvbHMtY29udGFpbmVyJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RyYWlscy1jb250cm9scy1jb250YWluZXInKTtcclxuXHJcbiAgICB2YXIgY29udHJvbHNEcm9wZG93biA9IGNvbnRyb2xzQ29udGFpbmVyLmFwcGVuZCgndWwnKVxyXG4gICAgICAuYXR0cignaWQnLCB0cmFpbC5faWQgKyAnLWNvbnRyb2xzLWRyb3Bkb3duJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RyYWlscy1jb250cm9scy1kcm9wZG93bicpO1xyXG5cclxuICAgIHZhciBjb250cm9sc0Ryb3Bkb3duUmlnaHQgPSBjb250cm9sc0NvbnRhaW5lci5hcHBlbmQoJ3VsJylcclxuICAgICAgLmF0dHIoJ2lkJywgdHJhaWwuX2lkICsgJy1jb250cm9scy1kcm9wZG93bi1yaWdodCcpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsICd0cmFpbHMtY29udHJvbHMtZHJvcGRvd24tcmlnaHQnKTtcclxuXHJcbiAgICB2YXIgY29udHJvbHNNYWluTWVudUxpID0gY29udHJvbHNEcm9wZG93bi5hcHBlbmQoJ2xpJylcclxuICAgICAgLmF0dHIoJ2lkJywgdHJhaWwuX2lkICsgJy1jb250cm9scy1kcm9wZG93bi1tZW51LWl0ZW0nKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCAndHJhaWxzLWNvbnRyb2xzLW1lbnUtaXRlbScpXHJcbiAgICAgIC50ZXh0KFwiQWN0aW9uc1wiKTtcclxuXHJcbiAgICB2YXIgY29udHJvbHNTdWJNZW51ID0gY29udHJvbHNNYWluTWVudUxpLmFwcGVuZCgndWwnKVxyXG4gICAgICAuYXR0cignaWQnLCB0cmFpbC5faWQgKyAnLWNvbnRyb2xzLWRyb3Bkb3duLXN1Yi1tZW51JylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RyYWlscy1jb250cm9scy1kcm9wZG93bi1zdWItbWVudScpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhbmQgYXBwZW5kIGdhbGxlcnktY29udGFpbmVyXHJcbiAgICBib3guYXBwZW5kKCdkaXYnKVxyXG4gICAgICAuYXR0cignaWQnLCB0cmFpbC5faWQgKyAnLXRodW1ibmFpbHMtY29udGFpbmVyJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RyYWlscy10aHVtYm5haWxzLWNvbnRhaW5lcicpXHJcbiAgICAgIC5hcHBlbmQoJ2RpdicpXHJcbiAgICAgIC5hdHRyKCdpZCcsIHRyYWlsLl9pZCArICctdGh1bWJuYWlscy1jb250YWluZXItaW5uZXItd3JhcHBlcicpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsICd0cmFpbHMtdGh1bWJuYWlscy1jb250YWluZXItaW5uZXItd3JhcHBlcicpXHJcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDApXHJcbiAgICAgIC5hcHBlbmQoJ2RpdicpXHJcbiAgICAgIC5hdHRyKCdpZCcsIHRyYWlsLl9pZCArICctdGh1bWJuYWlscy1nYWxsZXJ5JylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RyYWlscy10aHVtYm5haWxzLWdhbGxlcnknKTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBhbmQgYXBwZW5kIGNvbW1lbnRzIGNvbnRhaW5lclxyXG4gICAgICBib3guYXBwZW5kKCdkaXYnKVxyXG4gICAgICAgIC5hdHRyKCdpZCcsIHRyYWlsLl9pZCArICctY29tbWVudHMtY29udGFpbmVyJylcclxuICAgICAgICAuYXR0cignY2xhc3MnLCAndHJhaWxzLWNvbW1lbnRzLWNvbnRhaW5lcicpO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIGFuZCBhcHBlbmQgb3ZlcmxheVxyXG4gICAgICBkMy5zZWxlY3QoZG9jLmJvZHkpLmFwcGVuZCgnZGl2JylcclxuICAgICAgICAuYXR0cignaWQnLCB0cmFpbC5faWQgKyAnLXRyYWlscy1vdmVybGF5JylcclxuICAgICAgICAuYXR0cignY2xhc3MnLCAndHJhaWxzLW92ZXJsYXknKVxyXG4gICAgICAgIC5hcHBlbmQoJ2RpdicpXHJcbiAgICAgICAgLmF0dHIoJ2lkJywgdHJhaWwuX2lkICsgJy10cmFpbHMtb3ZlcmxheS1pbm5lci13cmFwcGVyJylcclxuICAgICAgICAuYXR0cignY2xhc3MnLCAndHJhaWxzLW92ZXJsYXktaW5uZXItd3JhcHBlcicpO1xyXG5cclxuICAgICAgLy8gRHJhZ1xyXG4gICAgICB2YXIgZHJhZ3N0YXJ0c1RhcmdldElkID0gbnVsbDtcclxuICAgICAgdmFyIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKClcclxuICAgICAgICAub3JpZ2luKGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgIHJldHVybiB7eDogY29udGFpbmVyLm9mZnNldExlZnQsIHk6IGNvbnRhaW5lci5vZmZzZXRUb3B9O1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLm9uKFwiZHJhZ3N0YXJ0XCIsIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICBkcmFnc3RhcnRzVGFyZ2V0SWQgPSBkMy5ldmVudC5zb3VyY2VFdmVudC50YXJnZXQuaWQ7XHJcbiAgICAgICAgICBkMy5ldmVudC5zb3VyY2VFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgIGQzLnNlbGVjdChjb250YWluZXIpLmNsYXNzZWQoXCJkcmFnZ2luZ1wiLCB0cnVlKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5vbihcImRyYWdcIiwgZnVuY3Rpb24oKXtcclxuICAgICAgICAgIGlmKGRyYWdzdGFydHNUYXJnZXRJZCA9PT0gdHJhaWwuX2lkICsgJy10cmFpbHMtdGl0bGUnKXtcclxuICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLmxlZnQgPSAoK2QzLmV2ZW50LngpICsgXCJweFwiO1xyXG4gICAgICAgICAgICBjb250YWluZXIuc3R5bGUudG9wID0gKCtkMy5ldmVudC55KSArIFwicHhcIjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICAgIC5vbihcImRyYWdlbmRcIiwgZnVuY3Rpb24oKXtcclxuICAgICAgICAgIGQzLnNlbGVjdChjb250YWluZXIpLmNsYXNzZWQoXCJkcmFnZ2luZ1wiLCBmYWxzZSk7XHJcbiAgICAgICAgICBkcmFnc3RhcnRzVGFyZ2V0SWQgPSBudWxsO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQ2FsbCBkcmFnIG9uIGNvbnRhaW5lclxyXG4gICAgICBkMy5zZWxlY3QoY29udGFpbmVyKS5jYWxsKGRyYWcpO1xyXG5cclxuICAgICAgcmV0dXJuIGNvbnRhaW5lcjtcclxuXHJcbiAgfTtcclxuXHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gRXhwb3J0XHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgcmV0dXJuIGNvbnRyb2xCb3g7XHJcblxyXG59KTtcclxuIiwidmFyIGV4cG9ydGVyID0gcmVxdWlyZSgnLi4vc2hhcmUvZXhwb3J0ZXInKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKGRvYyl7XHJcblxyXG4gIC8vIEZsYWcgYmFkIHByYWN0aXNlc1xyXG4gJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIEJhc2ljIFNldHVwXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdmFyIGdpc3RDb250cm9sID0ge1xyXG5cclxuICAgIC8vIENyZWF0ZSBjb250cm9sXHJcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKHRyYWlsKXtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBXcmFwcGVyXHJcbiAgICAgIHZhciBjb250cm9sID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgY29udHJvbHNcclxuICAgICAgZDMuc2VsZWN0KGNvbnRyb2wpXHJcbiAgICAgIC5hdHRyKCdpZCcsICd0cmFpbHMtJyArIHRyYWlsLl9pZCArICctY29udHJvbC1naXN0JylcclxuICAgICAgLmF0dHIoJ2Nsc2FzJywgJ3RyYWlscy1jb250cm9sIGNvbnRyb2wtZ2lzdCcpXHJcbiAgICAgIC50ZXh0KCdFeHBvcnQgR2lzdCcpXHJcbiAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpe1xyXG5cclxuICAgICAgICAvLyBFeHBvcnQgYW5kIEZvcm1hdCBHaXN0XHJcbiAgICAgICAgdmFyIGdpc3QgPSBnaXN0Q29udHJvbC5mb3JtYXRHaXN0KHRyYWlsLCBleHBvcnRlci5leHBvcnQodHJhaWwpKTtcclxuXHJcbiAgICAgICAgLy8gVXNlIGQzIHhociB0byBwb3N0IGdpc3RcclxuICAgICAgICB2YXIgdXJsID0gdHJhaWwuZ2l0aHViQWNjZXNzVG9rZW4oKSA/IFwiaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9naXN0cz9hY2Nlc3NfdG9rZW49XCIgKyB0cmFpbC5naXRodWJBY2Nlc3NUb2tlbigpIDogJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20vZ2lzdHMnO1xyXG4gICAgICAgIGQzLnhocih1cmwpXHJcbiAgICAgICAgICAuaGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKVxyXG4gICAgICAgICAgLnBvc3QoZ2lzdCwgZnVuY3Rpb24oZXJyLCBkYXRhKXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXNwb25zZVwiLCBkYXRhKTtcclxuICAgICAgICAgICAgaWYoZGF0YSAmJiBkYXRhLnJlc3BvbnNlKXtcclxuICAgICAgICAgICAgICB2YXIgcGFyc2VkID0gSlNPTi5wYXJzZShkYXRhLnJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICBpZihwYXJzZWQgJiYgcGFyc2VkLmlkKXtcclxuICAgICAgICAgICAgICAgIGFsZXJ0KFwiRXhwb3J0ZWQgdG8gZ2lzdDogXCIgKyBwYXJzZWQuaWQpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBhbGVydCgnRXJyb3IgcG9zdGluZyBnaXN0LlxcblxcbicrJ1Vua25vd24gRXJyb3InKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgdmFyIG1zZyA9IHRyYWlsLmdpdGh1YkFjY2Vzc1Rva2VuKCkgPyAnTWFrZSBzdXJlIHRoYXQgcHJvdmlkZWQgYWNjZXNzIHRva2VuIGlzIHZhbGlkLicgOiAnVW5rbm93biBFcnJvcic7XHJcbiAgICAgICAgICAgICAgYWxlcnQoJ0Vycm9yIHBvc3RpbmcgZ2lzdC5cXG5cXG4nK21zZyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBBcHBlbmRcclxuICAgICAgZDMuc2VsZWN0KHRyYWlsLl9jb250cm9sQm94KVxyXG4gICAgICAgIC5zZWxlY3QoJy50cmFpbHMtY29udHJvbHMtZHJvcGRvd24tc3ViLW1lbnUnKVswXVswXVxyXG4gICAgICAgIC5hcHBlbmRDaGlsZChjb250cm9sKTtcclxuXHJcbiAgICAgIHJldHVybiBjb250cm9sO1xyXG5cclxuICAgIH0sXHJcblxyXG5cclxuICAgIGZvcm1hdEdpc3Q6IGZ1bmN0aW9uKHRyYWlsLCBleHBvcnRhYmxlKXtcclxuXHJcbiAgICAgIC8vIE1vbnRoIE5hbWVzXHJcbiAgICAgIHZhciBtb250aHMgPSBbJ0phbicsJ0ZlYicsJ01hcicsJ0FwcicsJ01heScsJ0p1bicsJ0p1bCcsJ0F1ZycsJ1NlcCcsJ09jdCcsJ05vdicsJ0RlYyddO1xyXG5cclxuICAgICAgLy8gRm9ybWF0IERhdGVcclxuICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICB2YXIgZm9ybWF0dGVkVGltZSA9IG1vbnRoc1tkYXRlLmdldE1vbnRoKCldICsgXCIgXCIgKyBkYXRlLmdldERhdGUoKSArIFwiLCBcIiArIGRhdGUuZ2V0RnVsbFllYXIoKSArICBcIiAtIFwiICsgZGF0ZS5nZXRIb3VycygpICsgXCI6XCIgKyAgZGF0ZS5nZXRNaW51dGVzKCkgKyBcIjpcIiArIGRhdGUuZ2V0U2Vjb25kcygpO1xyXG5cclxuICAgICAgLy8gVGVtcGxhdGVcclxuICAgICAgdmFyIGdpc3RUZW1wbGF0ZSA9IHtcclxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwianNUcmFpbCBleHBvcnRlZCBhdDogXCIgKyBmb3JtYXR0ZWRUaW1lLFxyXG4gICAgICAgIFwicHVibGljXCI6IHRyYWlsLmdpdGh1YkFjY2Vzc1Rva2VuKCkgPT09IG51bGwsXHJcbiAgICAgICAgXCJmaWxlc1wiOiB7IH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIEFkZCBGaWxlXHJcbiAgICAgIGdpc3RUZW1wbGF0ZS5maWxlc1sgXCJ0cmFpbC1cIiArIHRyYWlsLmlkKCkgKyBcIi5qc29uXCJdID0ge307XHJcbiAgICAgIGdpc3RUZW1wbGF0ZS5maWxlc1sgXCJ0cmFpbC1cIiArIHRyYWlsLmlkKCkgKyBcIi5qc29uXCJdLmNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShleHBvcnRhYmxlLCBudWxsLCAyKTtcclxuXHJcbiAgICAgIC8vIFJldHVybiBmb3JtYXR0ZWQgZ2lzdFxyXG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZ2lzdFRlbXBsYXRlKTtcclxuXHJcbiAgICB9LFxyXG5cclxuICB9O1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIEV4cG9ydFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHJldHVybiBnaXN0Q29udHJvbDtcclxuXHJcbn0pO1xyXG4iLCJ2YXIgdHJlZVZpZXcgPSByZXF1aXJlKCcuL3RyZWVWaWV3Jyk7XHJcbnZhciB0YWJsZVZpZXcgPSByZXF1aXJlKCcuL3RhYmxlVmlldycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oZG9jKXtcclxuXHJcbiAgLy8gRmxhZyBiYWQgcHJhY3Rpc2VzXHJcbiAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gQmFzaWMgU2V0dXBcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICB2YXIgZ2FsbGVyeUNvbnRyb2wgPSB7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGNvbnRyb2xcclxuICAgIGNyZWF0ZTogZnVuY3Rpb24odHJhaWwpe1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIFdyYXBwZXJcclxuICAgICAgdmFyIGNvbnRyb2wgPSBkb2MuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBjb250cm9sc1xyXG4gICAgICBkMy5zZWxlY3QoY29udHJvbClcclxuICAgICAgLmF0dHIoJ2lkJywgJ3RyYWlscy0nICsgdHJhaWwuX2lkICsgJy1jb250cm9sLWdhbGxlcnknKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCAndHJhaWxzLWNvbnRyb2wgY29udHJvbC1nYWxsZXJ5IGNvbnRyb2wtcmlnaHQnKVxyXG4gICAgICAudGV4dCgnRycpXHJcbiAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpe1xyXG5cclxuICAgICAgICAvLyBPdmVybGF5IGFuZCB3cmFwcGVyXHJcbiAgICAgICAgdmFyIG92ZXJsYXkgPSBkMy5zZWxlY3QoJyMnICsgdHJhaWwuX2lkICsgJy10cmFpbHMtb3ZlcmxheScpLnN0eWxlKFwiZGlzcGxheVwiLCBcImJsb2NrXCIpO1xyXG4gICAgICAgIHZhciBvdmVybGF5V3JhcHBlciA9IGQzLnNlbGVjdCgnIycgKyB0cmFpbC5faWQgKyAnLXRyYWlscy1vdmVybGF5LWlubmVyLXdyYXBwZXInKS5odG1sKFwiXCIpO1xyXG5cclxuICAgICAgICAvLyBEaXNhYmxlIEJvZHkgU2Nyb2xsaW5nXHJcbiAgICAgICAgZDMuc2VsZWN0KGRvYy5ib2R5KS5zdHlsZShcIm92ZXJmbG93XCIsIFwiaGlkZGVuXCIpO1xyXG5cclxuICAgICAgICAvLyBPbiBQcmVzc2luZyBlc2MgaGlkZSBvdmVybGF5XHJcbiAgICAgICAgZDMuc2VsZWN0KGRvYy5ib2R5KVxyXG4gICAgICAgIC5vbihcImtleWRvd25cIiwgZnVuY3Rpb24oKXtcclxuICAgICAgICAgIGlmKGQzLmV2ZW50LmtleUNvZGUgPT09IDI3KXtcclxuICAgICAgICAgICAgZDMuc2VsZWN0KCcjJyArIHRyYWlsLl9pZCArICctdHJhaWxzLW92ZXJsYXknKS5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XHJcbiAgICAgICAgICAgIGQzLnNlbGVjdChkb2MuYm9keSkuc3R5bGUoXCJvdmVyZmxvd1wiLCBcImF1dG9cIik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEV4cG9ydCBhbGwgU25hcHNob3RzXHJcbiAgICAgICAgdmFyIHZlcnNpb25MaXN0ID0gW107XHJcbiAgICAgICAgdmFyIHZlcnNpb25UcmVlID0gdHJhaWwudmVyc2lvblRyZWUoKS5leHBvcnQoZnVuY3Rpb24oZGF0YSl7XHJcbiAgICAgICAgICB2ZXJzaW9uTGlzdC5wdXNoKGRhdGEuY2hhbmdlcyk7XHJcbiAgICAgICAgICByZXR1cm4gZGF0YS5jaGFuZ2VzID8ge1xyXG4gICAgICAgICAgICBjaGFuZ2VzSWQ6IGRhdGEuY2hhbmdlcy5pZCgpLFxyXG4gICAgICAgICAgICByZWNvcmRlZEF0OiBkYXRhLmNoYW5nZXMucmVjb3JkZWRBdCgpLFxyXG4gICAgICAgICAgICB0aHVtYm5haWw6IGRhdGEuY2hhbmdlcy50aHVtYm5haWwoKSxcclxuICAgICAgICAgICAgdml6RGF0YTogZGF0YS5jaGFuZ2VzLmRhdGEoKSxcclxuICAgICAgICAgICAgaXNDaGVja3BvaW50OiBkYXRhLmNoYW5nZXMuaXNDaGVja3BvaW50KCksXHJcbiAgICAgICAgICB9IDogeyBjaGFuZ2VzSWQ6IG51bGwsIHRodW1ibmFpbDogbnVsbH07XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFNob3cgVGFibGVcclxuICAgICAgICB0YWJsZVZpZXcuc2hvdyh0cmFpbCwgb3ZlcmxheVdyYXBwZXIsIHZlcnNpb25MaXN0LCBkb2MpO1xyXG4gICAgICAgIHRyZWVWaWV3LnNob3codHJhaWwsIG92ZXJsYXlXcmFwcGVyLCB2ZXJzaW9uVHJlZSwgZG9jKTtcclxuXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQXBwZW5kXHJcbiAgICAgIGQzLnNlbGVjdCh0cmFpbC5fY29udHJvbEJveClcclxuICAgICAgICAuc2VsZWN0KCcudHJhaWxzLWNvbnRyb2xzLWRyb3Bkb3duLXJpZ2h0JylbMF1bMF1cclxuICAgICAgICAuYXBwZW5kQ2hpbGQoY29udHJvbCk7XHJcblxyXG4gICAgICByZXR1cm4gY29udHJvbDtcclxuXHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBFeHBvcnRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICByZXR1cm4gZ2FsbGVyeUNvbnRyb2w7XHJcblxyXG59KTtcclxuIiwidmFyIGltcG9ydGVyID0gcmVxdWlyZSgnLi4vc2hhcmUvaW1wb3J0ZXInKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKGRvYyl7XHJcblxyXG4gIC8vIEZsYWcgYmFkIHByYWN0aXNlc1xyXG4gJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIEJhc2ljIFNldHVwXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdmFyIGdpc3RJbXBvcnQgPSB7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGNvbnRyb2xcclxuICAgIGNyZWF0ZTogZnVuY3Rpb24odHJhaWwpe1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIFdyYXBwZXJcclxuICAgICAgdmFyIGNvbnRyb2wgPSBkb2MuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBjb250cm9sc1xyXG4gICAgICBkMy5zZWxlY3QoY29udHJvbClcclxuICAgICAgLmF0dHIoJ2lkJywgJ3RyYWlscy0nICsgdHJhaWwuX2lkICsgJy1pbXBvcnQtZ2lzdCcpXHJcbiAgICAgIC5hdHRyKCdjbHNhcycsICd0cmFpbHMtY29udHJvbCBjb250cm9sLWltcG9ydC1naXN0JylcclxuICAgICAgLnRleHQoJ0ltcG9ydCBHaXN0JylcclxuICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgICAgIC8vIEdldCBnaXN0IElkXHJcbiAgICAgICAgdmFyIGdpc3RJZCA9IHByb21wdChcIkVudGVyIGEgZ2lzdCBpZFwiKTtcclxuICAgICAgICBpZihnaXN0SWQpe1xyXG5cclxuICAgICAgICAgIHZhciByZXNwb25zZSA9IGdpc3RJbXBvcnQuZ2V0R2lzdERhdGEoJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20vZ2lzdHMvJyArIGdpc3RJZCwgZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgICAgICBpZihyZXNwb25zZSAmJiByZXNwb25zZS5pZCl7XHJcbiAgICAgICAgICAgICAgdmFyIGZpbGVOYW1lID0gT2JqZWN0LmtleXMocmVzcG9uc2UuZmlsZXMpWzBdO1xyXG4gICAgICAgICAgICAgIHZhciBjb250ZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICBpZihyZXNwb25zZS5maWxlc1tmaWxlTmFtZV0udHJ1bmNhdGVkKXtcclxuICAgICAgICAgICAgICAgIGdpc3RJbXBvcnQuZ2V0R2lzdERhdGEocmVzcG9uc2UuZmlsZXNbZmlsZU5hbWVdLnJhd191cmwsIGZ1bmN0aW9uKF9jb250ZW50KXtcclxuICAgICAgICAgICAgICAgICAgY29udGVudCA9IF9jb250ZW50O1xyXG4gICAgICAgICAgICAgICAgICBpbXBvcnRlci5pbXBvcnQodHJhaWwsIGNvbnRlbnQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBKU09OLnBhcnNlKHJlc3BvbnNlLmZpbGVzW2ZpbGVOYW1lXS5jb250ZW50KTtcclxuICAgICAgICAgICAgICAgIGltcG9ydGVyLmltcG9ydCh0cmFpbCwgY29udGVudCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuXHJcblxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEFwcGVuZFxyXG4gICAgICBkMy5zZWxlY3QodHJhaWwuX2NvbnRyb2xCb3gpXHJcbiAgICAgICAgLnNlbGVjdCgnLnRyYWlscy1jb250cm9scy1kcm9wZG93bi1zdWItbWVudScpWzBdWzBdXHJcbiAgICAgICAgLmFwcGVuZENoaWxkKGNvbnRyb2wpO1xyXG5cclxuICAgICAgcmV0dXJuIGNvbnRyb2w7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBnZXRHaXN0RGF0YTogZnVuY3Rpb24odXJsLCBjYWxsYmFjayl7XHJcblxyXG4gICAgICAvLyBYTUxIVFRQXHJcbiAgICAgIHZhciB4bWxodHRwID0gd2luZG93LlhNTEh0dHBSZXF1ZXN0ID8gbmV3IFhNTEh0dHBSZXF1ZXN0KCkgOiBuZXcgQWN0aXZlWE9iamVjdChcIk1pY3Jvc29mdC5YTUxIVFRQXCIpO1xyXG5cclxuICAgICAgLy8gT24gUmVhZHkgU3RhdGUgQ2hhbmdlXHJcbiAgICAgIHhtbGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcclxuICAgICAgICBpZiAoeG1saHR0cC5yZWFkeVN0YXRlID09IFhNTEh0dHBSZXF1ZXN0LkRPTkUgKSB7XHJcbiAgICAgICAgICAgaWYoeG1saHR0cC5zdGF0dXMgPT0gMjAwKXtcclxuICAgICAgICAgICAgIHZhciByZXNwb25zZSA9IEpTT04ucGFyc2UoeG1saHR0cC5yZXNwb25zZVRleHQpO1xyXG4gICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xyXG4gICAgICAgICAgIH0gZWxzZSBpZih4bWxodHRwLnN0YXR1cyA9PSA0MDApIHtcclxuICAgICAgICAgICAgICBhbGVydCgnRXJyb3IgNDAwJyk7XHJcbiAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgYWxlcnQoJ1Vua25vd24gRXJyb3IuJyk7XHJcbiAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIFNlbmQgUmVxdWVzdFxyXG4gICAgICB4bWxodHRwLm9wZW4oXCJHRVRcIiwgdXJsLCB0cnVlKTtcclxuICAgICAgeG1saHR0cC5zZW5kKCk7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBFeHBvcnRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICByZXR1cm4gZ2lzdEltcG9ydDtcclxuXHJcbn0pO1xyXG4iLCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKGRvYyl7XHJcblxyXG4gIHJldHVybiB7XHJcblxyXG4gICAgLy8gQ29udHJvbEJveCB0aGF0IGhvbGRzIHRoZSBzbmFwc2hvdCBnYWxsZXJ5IGFuZCBjb250cm9sc1xyXG4gICAgY29udHJvbEJveDogcmVxdWlyZSgnLi9jb250cm9sQm94JykoZG9jKSxcclxuXHJcbiAgICAvLyBMaXN0IG9mIHBvc2libGUgY29udHJvbHNcclxuICAgIGxpc3Q6IHtcclxuICAgICAgaW1wb3J0R2lzdDogcmVxdWlyZSgnLi9pbXBvcnRHaXN0JykoZG9jKSxcclxuICAgICAgZXhwb3J0R2lzdDogcmVxdWlyZSgnLi9leHBvcnRHaXN0JykoZG9jKSxcclxuICAgICAgc2F2ZUpTT046IHJlcXVpcmUoJy4vc2F2ZUpTT04nKShkb2MpLFxyXG4gICAgICBsb2FkSlNPTjogcmVxdWlyZSgnLi9sb2FkSlNPTicpKGRvYyksXHJcbiAgICAgIG5hdmlnYXRpb246IHJlcXVpcmUoJy4vbmF2aWdhdGlvbicpKGRvYyksXHJcbiAgICAgIGdhbGxlcnk6IHJlcXVpcmUoJy4vZ2FsbGVyeScpKGRvYyksXHJcbiAgICB9LFxyXG5cclxuICAgIGFsbDogZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMubGlzdCk7XHJcbiAgICB9LFxyXG5cclxuICB9O1xyXG5cclxuXHJcbn0pO1xyXG4iLCJcclxudmFyIGltcG9ydGVyID0gcmVxdWlyZSgnLi4vc2hhcmUvaW1wb3J0ZXInKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKGRvYyl7XHJcblxyXG4gIC8vIEZsYWcgYmFkIHByYWN0aXNlc1xyXG4gJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIEJhc2ljIFNldHVwXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdmFyIGxvYWRDb250cm9sID0ge1xyXG5cclxuICAgIC8vIENyZWF0ZSBjb250cm9sXHJcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKHRyYWlsKXtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBXcmFwcGVyXHJcbiAgICAgIHZhciBjb250cm9sID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgIHZhciBpbnB1dEJveCA9IGRvYy5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIGNvbnRyb2xzXHJcbiAgICAgIGQzLnNlbGVjdChjb250cm9sKVxyXG4gICAgICAgIC5hdHRyKCdpZCcsICd0cmFpbHMtJyArIHRyYWlsLl9pZCArICctY29udHJvbC1sb2FkJylcclxuICAgICAgICAuYXR0cignY2xhc3MnLCAndHJhaWxzLWNvbnRyb2wgY29udHJvbC1sb2FkJylcclxuICAgICAgICAudGV4dCgnTG9hZCBKU09OJylcclxuICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcclxuICAgICAgICAgIGlucHV0Qm94LmNsaWNrKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgQ29udHJvbCBCb3hcclxuICAgICAgZDMuc2VsZWN0KGlucHV0Qm94KVxyXG4gICAgICAgIC5hdHRyKCdpZCcsICd0cmFpbHMtJyArIHRyYWlsLl9pZCArICctY29udHJvbC1pbnB1dCcpXHJcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2NvbnRyb2wtaW5wdXQnKVxyXG4gICAgICAgIC5hdHRyKCd0eXBlJywgJ2ZpbGUnKVxyXG4gICAgICAgIC5zdHlsZSgnZGlzcGxheScsICdub25lJylcclxuICAgICAgICAub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICBpZih3aW5kb3cuRmlsZVJlYWRlcil7XHJcbiAgICAgICAgICAgIHZhciBmaWxlID0gZDMuZXZlbnQudGFyZ2V0LmZpbGVzWzBdO1xyXG4gICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuICAgICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgIHZhciBmaWxlQ29udGVudHMgPSBlLnRhcmdldC5yZXN1bHQ7XHJcbiAgICAgICAgICAgICB2YXIgZGF0YU9iamVjdCA9IEpTT04ucGFyc2UoZmlsZUNvbnRlbnRzKTtcclxuICAgICAgICAgICAgIGltcG9ydGVyLmltcG9ydCh0cmFpbCwgZGF0YU9iamVjdCk7XHJcbiAgICAgICAgICAgfTtcclxuICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcclxuICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgYWxlcnQoXCJZb3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBGaWxlUmVhZGVyLiBQbGVhc2UgY29uc2lkZXIgdXBncmFkaW5nLlwiKTtcclxuICAgICAgICAgfVxyXG4gICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBBcHBlbmRcclxuICAgICAgZDMuc2VsZWN0KHRyYWlsLl9jb250cm9sQm94KVxyXG4gICAgICAgIC5zZWxlY3QoJy50cmFpbHMtY29udHJvbHMtZHJvcGRvd24tc3ViLW1lbnUnKVswXVswXVxyXG4gICAgICAgIC5hcHBlbmRDaGlsZChjb250cm9sKTtcclxuXHJcbiAgICAgIC8vIEFwcGVuZFxyXG4gICAgICBkMy5zZWxlY3QodHJhaWwuX2NvbnRyb2xCb3gpXHJcbiAgICAgICAgLnNlbGVjdCgnLnRyYWlscy1jb250cm9sLWJveCcpWzBdWzBdXHJcbiAgICAgICAgLmFwcGVuZENoaWxkKGlucHV0Qm94KTtcclxuXHJcbiAgICAgIHJldHVybiBjb250cm9sO1xyXG5cclxuICAgIH1cclxuICB9O1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIEV4cG9ydFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHJldHVybiBsb2FkQ29udHJvbDtcclxuXHJcbn0pO1xyXG4iLCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKGRvYyl7XHJcblxyXG4gIC8vIEZsYWcgYmFkIHByYWN0aXNlc1xyXG4gJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIEJhc2ljIFNldHVwXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdmFyIHNuYXBzaG90Q29udHJvbCA9IHtcclxuXHJcbiAgICAvLyBDcmVhdGUgY29udHJvbFxyXG4gICAgY3JlYXRlOiBmdW5jdGlvbih0cmFpbCl7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgV3JhcHBlclxyXG4gICAgICB2YXIgY29udHJvbFByZXYgPSBkb2MuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgdmFyIGNvbnRyb2xOZXh0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcblxyXG4gICAgICAvLyBHZXQgdGh1bWJuYWlsIGdhbGxlcnlcclxuICAgICAgdmFyIHRodW1ibmFpbEdhbGxlcnkgPSBkMy5zZWxlY3QodHJhaWwuX2NvbnRyb2xCb3gpLnNlbGVjdEFsbCgnLnRyYWlscy10aHVtYm5haWxzLWdhbGxlcnknKTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBjb250cm9scyBwcmV2XHJcbiAgICAgIGQzLnNlbGVjdChjb250cm9sUHJldilcclxuICAgICAgLmF0dHIoJ2lkJywgJ3RyYWlscy0nICsgdHJhaWwuX2lkICsgJy1jb250cm9sLXNuYXBzaG90LXByZXYnKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCAndHJhaWxzLWNvbnRyb2wgY29udHJvbC1zbmFwc2hvdC1wcmV2JylcclxuICAgICAgLnRleHQoJzw8IFByZXYnKVxyXG4gICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcclxuXHJcbiAgICAgICAgLy8gR2V0IEN1cnJlbnQgVmVyc2lvbiBOb2RlXHJcbiAgICAgICAgdmFyIGZyb21WZXJzaW9uTm9kZSA9IHRyYWlsLl9jdXJyZW50VmVyc2lvbk5vZGU7XHJcblxyXG4gICAgICAgIC8vIElmIGhhcyBwYXJlbnQgbm9kZVxyXG4gICAgICAgIGlmKGZyb21WZXJzaW9uTm9kZS5fcGFyZW50Tm9kZSl7XHJcblxyXG4gICAgICAgICAgLy8gR2V0IFN1YiBUcmFpbFxyXG4gICAgICAgICAgdHJhaWwuc3ViVHJhaWxzKCkuZm9yRWFjaChmdW5jdGlvbihzdWJUcmFpbCl7XHJcbiAgICAgICAgICAgIGlmKHN1YlRyYWlsID09PSBmcm9tVmVyc2lvbk5vZGUuX2RhdGEuY2hhbmdlcy5zdWJUcmFpbCgpKXtcclxuXHJcbiAgICAgICAgICAgICAgLy8gQ2FsbCBJbnZlcnNlIG9uIFN1YiBUcmFpbFxyXG4gICAgICAgICAgICAgIHRyYWlsLndhaXRGb3IoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIGZyb21WZXJzaW9uTm9kZS5fZGF0YS5jaGFuZ2VzLmludmVyc2UoKS5kb25lKCk7XHJcbiAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSBjdXJyZW50IG5vZGUgdG8gcGFyZW50IG5vZGVcclxuICAgICAgICAgICAgICB0cmFpbC5fY3VycmVudFZlcnNpb25Ob2RlID0gZnJvbVZlcnNpb25Ob2RlLl9wYXJlbnROb2RlO1xyXG5cclxuICAgICAgICAgICAgICAvLyBVcGRhdGUgSGlnaGxpZ2h0ZWQgVGh1bWJuYWlsXHJcbiAgICAgICAgICAgICAgdGh1bWJuYWlsR2FsbGVyeS5zZWxlY3RBbGwoJ2ltZycpLmNsYXNzZWQoJ2hpZ2hsaWdodCcsIGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYWlsLl9jdXJyZW50VmVyc2lvbk5vZGUuX2RhdGEuY2hhbmdlcyA/IGQuX2RhdGEuY2hhbmdlcy5pZCgpID09PSB0cmFpbC5fY3VycmVudFZlcnNpb25Ob2RlLl9kYXRhLmNoYW5nZXMuaWQoKSA6IGZhbHNlO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIGNvbnRyb2xzIG5leHRcclxuICAgICAgZDMuc2VsZWN0KGNvbnRyb2xOZXh0KVxyXG4gICAgICAuYXR0cignaWQnLCAndHJhaWxzLScgKyB0cmFpbC5faWQgKyAnLWNvbnRyb2wtc25hcHNob3QtbmV4dCcpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsICd0cmFpbHMtY29udHJvbCBjb250cm9sLXNuYXBzaG90LW5leHQnKVxyXG4gICAgICAudGV4dCgnTmV4dCA+PicpXHJcbiAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpe1xyXG5cclxuICAgICAgICAvLyBHZXQgQ3VycmVudCBzbmFwc2hvdFxyXG4gICAgICAgIHZhciBmcm9tVmVyc2lvbk5vZGUgPSB0cmFpbC5fY3VycmVudFZlcnNpb25Ob2RlO1xyXG5cclxuICAgICAgICAvLyBJZiBoYXMgcGFyZW50IG5vZGVcclxuICAgICAgICBpZihmcm9tVmVyc2lvbk5vZGUuX2NoaWxkTm9kZXMubGVuZ3RoKXtcclxuXHJcbiAgICAgICAgICAvLyBHZXQgSW5kZXggZnJvbSBjdXJyZW50IHZlcnNpb25cclxuICAgICAgICAgIHZhciBpZHggPSB0cmFpbC5fY3VycmVudEJyYW5jaFZlcnNpb25zLmluZGV4T2YoZnJvbVZlcnNpb25Ob2RlKTtcclxuXHJcbiAgICAgICAgICAvLyBJZiBUaGVyZSBpcyBhIHRyYWlsIGFoZWFkIG9mIGN1cnJlbnQgbm9kZSBhbHJlYWR5IGluIGN1cnJlbnQgYnJhbmNoXHJcbiAgICAgICAgICB2YXIgbmV4dENoaWxkVmVyc2lvbiA9IGlkeCA8IHRyYWlsLl9jdXJyZW50QnJhbmNoVmVyc2lvbnMubGVuZ3RoIC0gMSA/IHRyYWlsLl9jdXJyZW50QnJhbmNoVmVyc2lvbnNbaWR4ICsgMV0gOiBmcm9tVmVyc2lvbk5vZGUuX2NoaWxkTm9kZXNbZnJvbVZlcnNpb25Ob2RlLl9jaGlsZE5vZGVzLmxlbmd0aCAtIDFdO1xyXG5cclxuICAgICAgICAgIC8vIEZvcndhcmQgb24gY3VycmVudCBub2RlXHJcbiAgICAgICAgICB0cmFpbC53YWl0Rm9yKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIG5leHRDaGlsZFZlcnNpb24uX2RhdGEuY2hhbmdlcy5mb3J3YXJkKCkuZG9uZSgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gVXBkYXRlIGN1cnJlbnQgbm9kZSB0byBwYXJlbnQgbm9kZVxyXG4gICAgICAgICAgdHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZSA9IG5leHRDaGlsZFZlcnNpb247XHJcblxyXG4gICAgICAgICAgLy8gVXBkYXRlIEhpZ2hsaWdodGVkIFRodW1ibmFpbFxyXG4gICAgICAgICAgdGh1bWJuYWlsR2FsbGVyeS5zZWxlY3RBbGwoJ2ltZycpLmNsYXNzZWQoJ2hpZ2hsaWdodCcsIGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICByZXR1cm4gdHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZS5fZGF0YS5jaGFuZ2VzID8gZC5fZGF0YS5jaGFuZ2VzLmlkKCkgPT09IHRyYWlsLl9jdXJyZW50VmVyc2lvbk5vZGUuX2RhdGEuY2hhbmdlcy5pZCgpIDogZmFsc2U7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZXQgY29udGFpbmVyIHRvIEFwcGVuZFxyXG4gICAgICB2YXIgY29udGFpbmVyID0gZDMuc2VsZWN0KHRyYWlsLl9jb250cm9sQm94KVxyXG4gICAgICAgIC5zZWxlY3QoJy50cmFpbHMtY29udHJvbHMtZHJvcGRvd24nKVswXVswXTtcclxuXHJcbiAgICAgIC8vIEFwcGVuZFxyXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY29udHJvbFByZXYpO1xyXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY29udHJvbE5leHQpO1xyXG5cclxuICAgICAgcmV0dXJuIGNvbnRyb2xQcmV2O1xyXG5cclxuICAgIH1cclxuICB9O1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIEV4cG9ydFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHJldHVybiBzbmFwc2hvdENvbnRyb2w7XHJcblxyXG59KTtcclxuIiwiXHJcbnZhciBmaWxlU2F2ZXIgPSByZXF1aXJlKCdmaWxlc2F2ZXIuanMvRmlsZVNhdmVyLm1pbi5qcycpO1xyXG52YXIgZXhwb3J0ZXIgPSByZXF1aXJlKCcuLi9zaGFyZS9leHBvcnRlcicpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oZG9jKXtcclxuXHJcbiAgLy8gRmxhZyBiYWQgcHJhY3Rpc2VzXHJcbiAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gQmFzaWMgU2V0dXBcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHJcblxyXG4gIHZhciBzYXZlQ29udHJvbCA9IHtcclxuXHJcbiAgICAvLyBDcmVhdGUgY29udHJvbFxyXG4gICAgY3JlYXRlOiBmdW5jdGlvbih0cmFpbCl7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgV3JhcHBlclxyXG4gICAgICB2YXIgY29udHJvbCA9IGRvYy5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIGNvbnRyb2xzXHJcbiAgICAgIGQzLnNlbGVjdChjb250cm9sKVxyXG4gICAgICAgIC5hdHRyKCdpZCcsICd0cmFpbHMtJyArIHRyYWlsLl9pZCArICctY29udHJvbC1zYXZlJylcclxuICAgICAgICAuYXR0cignY2xzYXMnLCAndHJhaWxzLWNvbnRyb2wgY29udHJvbC1zYXZlJylcclxuICAgICAgICAudGV4dCgnU2F2ZSBKU09OJylcclxuICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcclxuICAgICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW0pTT04uc3RyaW5naWZ5KGV4cG9ydGVyLmV4cG9ydCh0cmFpbCkpXSwge3R5cGU6IFwidGV4dC9qc29uO2NoYXJzZXQ9dXRmLThcIn0pO1xyXG4gICAgICAgICAgZmlsZVNhdmVyLnNhdmVBcyhibG9iLCAndHJhaWwtJyArIHRyYWlsLmlkKCkgKyAnLmpzb24nKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEFwcGVuZFxyXG4gICAgICBkMy5zZWxlY3QodHJhaWwuX2NvbnRyb2xCb3gpXHJcbiAgICAgICAgLnNlbGVjdCgnLnRyYWlscy1jb250cm9scy1kcm9wZG93bi1zdWItbWVudScpWzBdWzBdXHJcbiAgICAgICAgLmFwcGVuZENoaWxkKGNvbnRyb2wpO1xyXG5cclxuICAgICAgcmV0dXJuIGNvbnRyb2w7XHJcblxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gRXhwb3J0XHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgcmV0dXJuIHNhdmVDb250cm9sO1xyXG5cclxufSk7XHJcbiIsIlxyXG52YXIgc3RhdGVMb2FkZXIgPSByZXF1aXJlKCcuLi9uYXZpZ2F0aW9uL3N0YXRlTG9hZGVyJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIFRhYmxlIFZpZXdcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICB2YXIgdGFibGVWaWV3ID0ge1xyXG5cclxuICB9O1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIE1ldGhvZHNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICB0YWJsZVZpZXcuc2hvdyA9IGZ1bmN0aW9uKHRyYWlsLCBvdmVybGF5V3JhcHBlciwgdmVyc2lvbkxpc3QsIGRvYyl7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGFuZCBBcHBlbmQgVGFibGUgQ29udGFpbmVyXHJcbiAgICB2YXIgdGFibGVDb250YWluZXIgPSBvdmVybGF5V3JhcHBlci5hcHBlbmQoJ2RpdicpXHJcbiAgICAgIC5hdHRyKCdpZCcsIHRyYWlsLl9pZCArICctdHJhaWxzLW92ZXJsYXktdGFibGUtY29udGFpbmVyJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RyYWlscy1vdmVybGF5LXRhYmxlLWNvbnRhaW5lcicpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhbmQgYXBwZW5kIHRhYmxlXHJcbiAgICB2YXIgdGFibGUgPSB0YWJsZUNvbnRhaW5lci5hcHBlbmQoJ3RhYmxlJylcclxuICAgICAgLmF0dHIoJ2lkJywgdHJhaWwuX2lkICsgJy10cmFpbHMtb3ZlcmxheS10YWJsZScpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsICd0cmFpbHMtb3ZlcmxheS10YWJsZScpXHJcbiAgICAgIC5hdHRyKCdjZWxscGFkZGluZycsIDApXHJcbiAgICAgIC5hdHRyKCdjZWxsc3BhY2luZycsIDApO1xyXG5cclxuICAgIC8vIEFwcGVuZCB0aGVhZFxyXG4gICAgdmFyIHRoZWFkID0gdGFibGUuYXBwZW5kKCd0aGVhZCcpXHJcbiAgICAgIC5hdHRyKCdpZCcsIHRyYWlsLl9pZCArICctdHJhaWxzLW92ZXJsYXktdGFibGUtdGhlYWQnKVxyXG4gICAgICAuYXR0cignY2xhc3MnLCAndHJhaWxzLW92ZXJsYXktdGFibGUtdGhlYWQnKVxyXG4gICAgICAuYXBwZW5kKFwidHJcIik7XHJcblxyXG4gICAgLy8gQXBwZW5kIHRib2R5XHJcbiAgICB2YXIgdGJvZHkgPSB0YWJsZS5hcHBlbmQoJ3Rib2R5JylcclxuICAgICAgLmF0dHIoJ2lkJywgdHJhaWwuX2lkICsgJy10cmFpbHMtb3ZlcmxheS10YWJsZS10Ym9keScpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsICd0cmFpbHMtb3ZlcmxheS10YWJsZS10Ym9keScpO1xyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyBBcHBlbmRpbmcgSGVhZGVyc1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAvLyBJZCBjb2xcclxuICAgIHZhciBjb2xJZCA9IHRoZWFkLmFwcGVuZCgndGgnKVxyXG4gICAgICAuYXR0cignc29ydGluZycsICdub25lJylcclxuICAgICAgLmF0dHIoJ2lkJywgJ2NvbC1pZCcpXHJcbiAgICAgIC50ZXh0KCdJZCcpO1xyXG5cclxuICAgIC8vIElkIGNvbENhcHR1cmVkQXRcclxuICAgIHZhciBjb2xSZWNvcmRlZEF0ID0gdGhlYWQuYXBwZW5kKCd0aCcpXHJcbiAgICAgIC5hdHRyKCdpZCcsICdjb2wtcmVjb3JkZWQtYXQnKVxyXG4gICAgICAuYXR0cignc29ydGluZycsICdhc2NlbmRpbmcnKVxyXG4gICAgICAuc3R5bGUoJ2N1cnNvcicsICdzLXJlc2l6ZScpXHJcbiAgICAgIC50ZXh0KCdSZWNvcmRlZCBBdCcpXHJcbiAgICAgIC5vbignY2xpY2snLCBzb3J0UmVjb3JkZWRBdENvbCk7XHJcblxyXG4gICAgLy8gSWQgY29sVGh1bWJuYWlsXHJcbiAgICB2YXIgY29sVGh1bWJuYWlsID0gdGhlYWQuYXBwZW5kKCd0aCcpXHJcbiAgICAgIC5hdHRyKCdpZCcsICdjb2wtdGh1bWJuYWlsJylcclxuICAgICAgLnRleHQoJ1RodW1ibmFpbCcpO1xyXG5cclxuICAgIC8vIEFjdGlvbnNcclxuICAgIHZhciBjb2xBY3Rpb25zID0gdGhlYWQuYXBwZW5kKCd0aCcpXHJcbiAgICAgIC5hdHRyKCdpZCcsICdjb2wtYWN0aW9uJylcclxuICAgICAgLnRleHQoJ0FjdGlvbnMnKTtcclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gQXBwZW5kaW5nIFJvd3MgYW5kIENvbHVtbnNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgLy8gTW9udGggTmFtZXNcclxuICAgIHZhciBtb250aHMgPSBbJ0phbicsJ0ZlYicsJ01hcicsJ0FwcicsJ01heScsJ0p1bicsJ0p1bCcsJ0F1ZycsJ1NlcCcsJ09jdCcsJ05vdicsJ0RlYyddO1xyXG5cclxuICAgIC8vIEFwcGVuZCByb3dzICh0cilcclxuICAgIHZhciB0ciA9IHRib2R5LnNlbGVjdEFsbCgndHInKVxyXG4gICAgICAuZGF0YSh2ZXJzaW9uTGlzdClcclxuICAgICAgLmVudGVyKCkuYXBwZW5kKCd0cicpXHJcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uKGQpeyByZXR1cm4gZCA/ICdyb3ctJyArIGQuaWQoKSA6ICdyb290LW5vZGUnOyB9KTtcclxuXHJcbiAgICAvLyBBcHBlbmQgSWRcclxuICAgIHRyLmFwcGVuZCgndGQnKVxyXG4gICAgICAuYXBwZW5kKCdkaXYnKVxyXG4gICAgICAudGV4dChmdW5jdGlvbihkLCBpKXtcclxuICAgICAgICByZXR1cm4gZCA/IGQuaWQoKS5zcGxpdCgnLScpWzBdIDogJ09yaWdpbmFsIFN0YXRlJztcclxuICAgICAgfSk7XHJcblxyXG4gICAgLy8gQXBwZW5kIENhcHR1cmUgQXRcclxuICAgIHRyLmFwcGVuZCgndGQnKVxyXG4gICAgICAuYXBwZW5kKCdkaXYnKVxyXG4gICAgICAuaHRtbChmdW5jdGlvbihkLCBpKXtcclxuICAgICAgICBpZihkKXtcclxuICAgICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoK2QucmVjb3JkZWRBdCgpKTtcclxuICAgICAgICAgIHJldHVybiBtb250aHNbZGF0ZS5nZXRNb250aCgpXSArIFwiIFwiICsgZGF0ZS5nZXREYXRlKCkgKyBcIiwgXCIgKyBkYXRlLmdldEZ1bGxZZWFyKCkgKyBcIjxiciAvPlwiICsgZGF0ZS5nZXRIb3VycygpICsgXCI6XCIgKyAgZGF0ZS5nZXRNaW51dGVzKCkgKyBcIjpcIiArIGRhdGUuZ2V0U2Vjb25kcygpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXR1cm4gJ04vQSc7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAvLyBBcHBlbmQgVGh1bWJuYWlsXHJcbiAgICB0ci5hcHBlbmQoJ3RkJylcclxuICAgICAgLmFwcGVuZCgnZGl2JylcclxuICAgICAgLmFwcGVuZCgnaW1nJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RhYmxlLXRodW1ibmFpbCcpXHJcbiAgICAgIC5hdHRyKCdzcmMnLCBmdW5jdGlvbihkKXtcclxuICAgICAgICBpZihkKXsgcmV0dXJuIGQudGh1bWJuYWlsKCk7IH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgLy8gQXBwZW5kIExvYWRcclxuICAgIHRyLmFwcGVuZCgndGQnKVxyXG4gICAgICAuYXBwZW5kKCdkaXYnKVxyXG4gICAgICAuYXBwZW5kKCdzcGFuJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2xvYWQtY2hhbmdlcycpXHJcbiAgICAgIC5hdHRyKCdjaGFuZ2VzLWlkJywgZnVuY3Rpb24oZCl7IHJldHVybiBkID8gJ3Jvdy0nICsgZC5pZCgpIDogJ3Jvb3Qtbm9kZSc7IH0pXHJcbiAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbihkKXtcclxuXHJcbiAgICAgICAgLy8gTG9hZCBTdGF0ZVxyXG4gICAgICAgIHRyYWlsLndhaXRGb3IoZnVuY3Rpb24oKXtcclxuICAgICAgICAgIHN0YXRlTG9hZGVyLmxvYWRTdGF0ZSh0cmFpbCwgZCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEV4aXQgT3ZlcmxheVxyXG4gICAgICAgIGQzLnNlbGVjdCgnIycgKyB0cmFpbC5faWQgKyAnLXRyYWlscy1vdmVybGF5Jykuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xyXG4gICAgICAgIGQzLnNlbGVjdChkb2MuYm9keSkuc3R5bGUoXCJvdmVyZmxvd1wiLCBcImF1dG9cIik7XHJcblxyXG4gICAgICB9KS50ZXh0KCdMb2FkIFN0YXRlJyk7XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIEV2ZW50c1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBmdW5jdGlvbiBzb3J0UmVjb3JkZWRBdENvbCgpe1xyXG5cclxuICAgICAgLy8gU2VsZWN0IGVsZW1lbnRcclxuICAgICAgdmFyIGVsZW1lbnQgPSBkMy5zZWxlY3QodGhpcyk7XHJcblxyXG4gICAgICAvLyBTb3J0XHJcbiAgICAgIHRyLnNvcnQoZnVuY3Rpb24oY2hhbmdlQSwgY2hhbmdlQil7XHJcbiAgICAgICAgcmV0dXJuICFjaGFuZ2VBIHx8ICFjaGFuZ2VCID8gLTEgOmVsZW1lbnQuYXR0cignc29ydGluZycpICE9PSAnYXNjZW5kaW5nJyA/IGQzLmFzY2VuZGluZyhjaGFuZ2VBLnJlY29yZGVkQXQoKSwgY2hhbmdlQi5yZWNvcmRlZEF0KCkpIDogZDMuZGVzY2VuZGluZyhjaGFuZ2VBLnJlY29yZGVkQXQoKSwgY2hhbmdlQi5yZWNvcmRlZEF0KCkpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFRvZ2dsZSBhdHRyXHJcbiAgICAgIGVsZW1lbnQuYXR0cignc29ydGluZycsIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQuYXR0cignc29ydGluZycpICE9PSAnYXNjZW5kaW5nJyA/ICdhc2NlbmRpbmcnIDogJ2Rlc2NlbmRpbmcnO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFRvZ2dsZSBjdXJzb3JcclxuICAgICAgZWxlbWVudC5zdHlsZSgnY3Vyc29yJywgZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4gZWxlbWVudC5hdHRyKCdzb3J0aW5nJykgPT09ICdhc2NlbmRpbmcnID8gJ3MtcmVzaXplJyA6ICduLXJlc2l6ZSc7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBFeHBvcnRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICByZXR1cm4gdGFibGVWaWV3O1xyXG5cclxufSgpKTtcclxuIiwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIFRyZWUgVmlld1xyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHZhciB0cmVlVmlldyA9IHtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBNZXRob2RzXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdHJlZVZpZXcuc2hvdyA9IGZ1bmN0aW9uKHRyYWlsLCBvdmVybGF5V3JhcHBlciwgdmVyc2lvblRyZWUsIGRvYyl7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGFuZCBBcHBlbmQgVHJlZSBDb250YWluZXJcclxuICAgIHZhciB0cmVlQ29udGFpbmVyID0gb3ZlcmxheVdyYXBwZXIuYXBwZW5kKCdkaXYnKVxyXG4gICAgICAuYXR0cignaWQnLCB0cmFpbC5faWQgKyAnLXRyYWlscy1vdmVybGF5LXRyZWUtY29udGFpbmVyJylcclxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RyYWlscy1vdmVybGF5LXRyZWUtY29udGFpbmVyJyk7XHJcblxyXG4gICAgLy8gTWFyZ2luIHRvIHRoZSB0cmVlXHJcbiAgICB2YXIgbWFyZ2luID0geyB0b3A6IDEwLCByaWdodDogMCwgYm90dG9tOiAwLCBsZWZ0OiAxMCB9LFxyXG4gICAgd2lkdGggPSA4MDAgLSBtYXJnaW4ucmlnaHQgLSBtYXJnaW4ubGVmdCxcclxuICAgIGhlaWdodCA9IDYwMCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tO1xyXG5cclxuICAgIC8vIENyZWF0ZSBab29tXHJcbiAgICB2YXIgem9vbSA9IGQzLmJlaGF2aW9yLnpvb20oKVxyXG4gICAgICAuc2NhbGVFeHRlbnQoWzAuNSwgMl0pXHJcbiAgICAgIC5vbihcInpvb21cIiwgem9vbWVkKTtcclxuXHJcbiAgICAvLyBBcHBlbmQgU1ZHXHJcbiAgICB2YXIgc3ZnID0gdHJlZUNvbnRhaW5lci5hcHBlbmQoJ3N2ZycpXHJcbiAgICAgIC5hdHRyKCd3aWR0aCcsIHdpZHRoKVxyXG4gICAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0KVxyXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIG1hcmdpbi5sZWZ0ICsgXCIsXCIgKyBtYXJnaW4udG9wICsgXCIpXCIpXHJcbiAgICAgIC5jYWxsKHpvb20pO1xyXG5cclxuICAgIC8vIFpvb21hYmxlIEdyb3VwXHJcbiAgICB2YXIgY29udGFpbmVyID0gc3ZnLmFwcGVuZCgnZycpXHJcbiAgICAgIC5hdHRyKCdjbGFzcycsICd6b29tYWJsZScpO1xyXG5cclxuICAgIC8vIENvdW50ZXJcclxuICAgIHZhciBpID0gMDtcclxuXHJcbiAgICAvLyB0cmVlIExheW91dFxyXG4gICAgdmFyIHRyZWUgPSBkMy5sYXlvdXQudHJlZSgpXHJcbiAgICAgIC5zZXBhcmF0aW9uKGZ1bmN0aW9uIHNlcGFyYXRpb24oYSwgYikgeyByZXR1cm4gYS5wYXJlbnQgPT09IGIucGFyZW50ID8gMSA6IDEuNTsgfSlcclxuICAgICAgLm5vZGVTaXplKFs4MCwgODBdKTtcclxuXHJcbiAgICAvLyBQcm9qZWN0aW9uXHJcbiAgICB2YXIgZGlhZ29uYWwgPSBkMy5zdmcuZGlhZ29uYWwoKVxyXG4gICAgIC5wcm9qZWN0aW9uKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFtkLnggKyB3aWR0aCAvIDIsIGQueSArIDUwXTsgfSk7XHJcblxyXG4gICAgLy8gTnVtZXJpYyBTZXR0aW5nc1xyXG4gICAgdmFyIG5vZGVEZXB0aCA9IDEwMDtcclxuXHJcbiAgICAvLyBVcGRhdGUgVHJlZVxyXG4gICAgdXBkYXRlKHZlcnNpb25UcmVlKTtcclxuXHJcbiAgICAvLyBIb2xkIEN1cnJlbnQgU2NhbGVcclxuICAgIHZhciBzY2FsZSA9IDE7XHJcblxyXG4gICAgLy8gT24gWm9vbWVkXHJcbiAgICBmdW5jdGlvbiB6b29tZWQoKXtcclxuXHJcbiAgICAgIC8vIENoZWNrIEV2ZW50IGFuZCBVcGRhdGVcclxuICAgICAgaWYoc2NhbGUgIT0gZDMuZXZlbnQuc2NhbGUpe1xyXG4gICAgICAgIGNvbnRhaW5lci50cmFuc2l0aW9uKClcclxuICAgICAgICAuZHVyYXRpb24oMjAwKVxyXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgZDMuZXZlbnQudHJhbnNsYXRlICsgXCIpc2NhbGUoXCIgKyBkMy5ldmVudC5zY2FsZSArIFwiKVwiKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb250YWluZXIuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGQzLmV2ZW50LnRyYW5zbGF0ZSArIFwiKXNjYWxlKFwiICsgZDMuZXZlbnQuc2NhbGUgKyBcIilcIik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFVwZGF0ZSBTY2FsZVxyXG4gICAgICBzY2FsZSA9IGQzLmV2ZW50LnNjYWxlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyBVcGRhdGUgVHJlZVxyXG4gICAgZnVuY3Rpb24gdXBkYXRlKHZlcnNpb25UcmVlKXtcclxuXHJcbiAgICAgIC8vIENvbXB1dGUgdGhlIG5ldyB0cmVlIGxheW91dC5cclxuICAgICAgdmFyIG5vZGVzID0gdHJlZS5ub2Rlcyh2ZXJzaW9uVHJlZSk7XHJcbiAgICAgIHZhciBsaW5rcyA9IHRyZWUubGlua3Mobm9kZXMpO1xyXG5cclxuICAgICAgLy8gTm9ybWFsaXplIGZvciBmaXhlZC1kZXB0aC5cclxuICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkKSB7IGQueSA9IGQuZGVwdGggKiBub2RlRGVwdGg7IH0pO1xyXG5cclxuICAgICAgLy8gRGVjbGFyZSB0aGUgbm9kZXPigKZcclxuICAgICAgdmFyIG5vZGUgPSBjb250YWluZXIuc2VsZWN0QWxsKFwiZy5ub2RlXCIpXHJcbiAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQgfHwgKGQuaWQgPSArK2kpOyB9KTtcclxuXHJcbiAgICAgIC8vIEVudGVyIHRoZSBub2Rlcy5cclxuICAgICAgdmFyIG5vZGVFbnRlciA9IG5vZGUuZW50ZXIoKS5hcHBlbmQoXCJnXCIpXHJcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcclxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyAoZC54ICsgd2lkdGggLyAyICkrIFwiLFwiICsgKGQueSArIDUwKSArIFwiKVwiO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQXBwZW5kIEltYWdlXHJcbiAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJjaXJjbGVcIilcclxuICAgICAgICAuYXR0cihcInJcIiwgMTApXHJcbiAgICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jaGFuZ2VzSWQgPyAoJ25vZGUtJyArIGQuY2hhbmdlc0lkKSA6ICdyb290LW5vZGUnIDsgfSlcclxuICAgICAgICAuYXR0cignY2xhc3MnLCAndHJlZS1ub2RlJylcclxuICAgICAgICAvLyAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIFsxMDAsIDEwMF0gKyBcIilcIilcclxuICAgICAgICAuY2xhc3NlZCgncm9vdC1ub2RlJywgZnVuY3Rpb24oZCl7IHJldHVybiBkLmNoYW5nZXNJZCA9PT0gbnVsbDsgfSlcclxuICAgICAgICAuY2xhc3NlZCgnY2hlY2twb2ludCcsIGZ1bmN0aW9uKGQpeyByZXR1cm4gZC5jaGFuZ2VzSWQgJiYgZC5pc0NoZWNrcG9pbnQ7IH0pXHJcbiAgICAgICAgLmNsYXNzZWQoJ2N1cnJlbnQnLCBmdW5jdGlvbihkKXtcclxuICAgICAgICAgIHJldHVybiB0cmFpbC5fY3VycmVudFZlcnNpb25Ob2RlLl9kYXRhLmNoYW5nZXMgJiYgZC5jaGFuZ2VzSWQgPyBkLmNoYW5nZXNJZCA9PT0gdHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZS5fZGF0YS5jaGFuZ2VzLl9pZCA6IHRyYWlsLl9jdXJyZW50VmVyc2lvbk5vZGUuX2RhdGEuY2hhbmdlcyA9PT0gZC5jaGFuZ2VzSWQ7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAub24oJ2NsaWNrJywgaGlnaGxpZ2h0Tm9kZSk7XHJcblxyXG4gICAgICAvLyBBcHBlbmQgTGFiZWxzXHJcbiAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJ0ZXh0XCIpXHJcbiAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY2hpbGRyZW4gfHwgZC5fY2hpbGRyZW4gPyAtMzAgOiAzMDsgfSlcclxuICAgICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcclxuICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXHJcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jaGFuZ2VzSWQgPyBkLmNoYW5nZXNJZC5zcGxpdChcIi1cIilbMF0gOiAnT3JpZ2luYWwgU3RhdGUnOyB9KVxyXG4gICAgICAgIC5zdHlsZShcImZpbGwtb3BhY2l0eVwiLCAxKTtcclxuXHJcbiAgICAgIC8vIERlY2xhcmUgdGhlIGxpbmtz4oCmXHJcbiAgICAgIHZhciBsaW5rID0gY29udGFpbmVyLnNlbGVjdEFsbChcInBhdGgubGlua1wiKVxyXG4gICAgICAgIC5kYXRhKGxpbmtzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC5pZDsgfSk7XHJcblxyXG4gICAgICAvLyBFbnRlciB0aGUgbGlua3MuXHJcbiAgICAgIGxpbmsuZW50ZXIoKS5pbnNlcnQoXCJwYXRoXCIsIFwiZ1wiKVxyXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5rXCIpXHJcbiAgICAgICAgLmF0dHIoXCJkXCIsIGRpYWdvbmFsKTtcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGhpZ2hsaWdodE5vZGUoZCl7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBFeHBvcnRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICByZXR1cm4gdHJlZVZpZXc7XHJcblxyXG59KCkpO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG4gIHJldHVybiBmdW5jdGlvbigpIHtcclxuICAgIGZ1bmN0aW9uIHMxKCkge1xyXG4gICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSg5NyArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDI2KSk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBzNCgpIHtcclxuICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApLnRvU3RyaW5nKDE2KS5zdWJzdHJpbmcoMSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gczEoKSArIHM0KCkgKyBzNCgpICsgJy0nICsgczQoKSArIHM0KCkgKyBzNCgpICsgczQoKSArIHM0KCkgKyBzNCgpO1xyXG4gIH07XHJcbn0oKSk7XHJcbiIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG4gIHJldHVybiB7XHJcbiAgICBndWlkOiByZXF1aXJlKCcuL2d1aWQnKVxyXG4gIH07XHJcbn0oKSk7XHJcbiIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuICB2YXIgbmVhcmVzdENoZWNrcG9pbnQgPSB7XHJcblxyXG4gICAgZmluZDogZnVuY3Rpb24odHJhaWwsIHRvTm9kZSl7XHJcblxyXG4gICAgICAvLyBDaGVjayBpZiBkZXN0aW5hdGlvbiBpdHNlbGYgaXMgY2hlY2twb2ludFxyXG4gICAgICBpZih0b05vZGUgJiYgdG9Ob2RlLl9kYXRhLmNoYW5nZXMgJiYgdG9Ob2RlLl9kYXRhLmNoYW5nZXMuaXNDaGVja3BvaW50KCkpe1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBub2RlOiB0b05vZGUsXHJcbiAgICAgICAgICBkaXN0YW5jZTogMCxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBSYWRpdXMgb2Ygc2VhcmNoXHJcbiAgICAgIHZhciBtYXhEaXN0YW5jZSA9IDU7XHJcblxyXG4gICAgICAvLyBDdXJyZW50IENoZWNrcG9pbnQgYW5kIERpc3RhbmNlXHJcbiAgICAgIHZhciBjaGtEaXN0YW5jZSA9IDEwMDAwMDAwMDAwO1xyXG4gICAgICB2YXIgY2hlY2twb2ludCA9IG51bGw7XHJcblxyXG4gICAgICAvLyBSZWN1ciBvdmVyIG91dGVyIG5vZGVzXHJcbiAgICAgIChmdW5jdGlvbiByZWN1ck91dGVyKG91dGVyTm9kZSwgdmlzaXRlZCwgZGlzdGFuY2Upe1xyXG5cclxuICAgICAgICAvLyBTdGFydCBFeHBsb3JpbmcgQ2hpbGRyZW5cclxuICAgICAgICB2YXIgZm91bmQgPSAoZnVuY3Rpb24gcmVjdXIobm9kZSwgdmlzaXRlZCwgZGlzdGFuY2Upe1xyXG5cclxuICAgICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgdmlzaXRlZFxyXG4gICAgICAgICAgaWYodmlzaXRlZC5pbmRleE9mKG5vZGUpID4gLTEpXHJcbiAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgLy8gQ2hlY2sgRGlzdGFuY2VcclxuICAgICAgICAgIGlmKGRpc3RhbmNlID4gbWF4RGlzdGFuY2UgfHwgZGlzdGFuY2UgPiBjaGtEaXN0YW5jZSlcclxuICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAvLyBDaGVjayBmb3IgY2hlY2twb2ludFxyXG4gICAgICAgICAgaWYobm9kZSAmJiBub2RlLl9kYXRhLmNoYW5nZXMgJiYgbm9kZS5fZGF0YS5jaGFuZ2VzLmlzQ2hlY2twb2ludCgpICYmIGRpc3RhbmNlIDwgY2hrRGlzdGFuY2Upe1xyXG4gICAgICAgICAgICBjaGVja3BvaW50ID0gbm9kZTtcclxuICAgICAgICAgICAgY2hrRGlzdGFuY2UgPSBkaXN0YW5jZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gUmVjdXIgb3ZlciBjaGlsZHNcclxuICAgICAgICAgIG5vZGUuX2NoaWxkTm9kZXMuc29tZShmdW5jdGlvbihfY2hpbGQpe1xyXG4gICAgICAgICAgICByZXR1cm4gcmVjdXIoX2NoaWxkLCB2aXNpdGVkLCBkaXN0YW5jZSArIDEpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH0ob3V0ZXJOb2RlLCB2aXNpdGVkLCBkaXN0YW5jZSkpO1xyXG5cclxuICAgICAgICAvLyBSZXR1cm4gaWYgY2hlY2twb2ludCBpcyBmb3VuZFxyXG4gICAgICAgIGlmKGZvdW5kKSByZXR1cm47XHJcblxyXG4gICAgICAgIC8vIEdvIHRvIFBhcmVudFxyXG4gICAgICAgIGlmKG91dGVyTm9kZS5fcGFyZW50Tm9kZSl7XHJcbiAgICAgICAgICByZXR1cm4gcmVjdXJPdXRlcihvdXRlck5vZGUuX3BhcmVudE5vZGUsIHZpc2l0ZWQsIGRpc3RhbmNlICsgMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgfSh0b05vZGUsIFtdLCAwKSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIG5vZGU6IGNoZWNrcG9pbnQsXHJcbiAgICAgICAgZGlzdGFuY2U6IGNoa0Rpc3RhbmNlLFxyXG4gICAgICB9O1xyXG5cclxuICAgIH1cclxuXHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIG5lYXJlc3RDaGVja3BvaW50O1xyXG5cclxufSgpKTtcclxuIiwiXHJcbnZhciBuZWFyZXN0Q2hlY2twb2ludCA9IHJlcXVpcmUoJy4vbmVhcmVzdENoZWNrcG9pbnQnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG4gIGZ1bmN0aW9uIGdvSW52ZXJzZShmcm9tTm9kZSwgdG9Ob2RlLCBjYWxsYmFjayl7XHJcbiAgICAoZnVuY3Rpb24gcmVjdXIobm9kZSl7XHJcbiAgICAgIHZhciByZXR1cm5lZFZhbHVlID0gY2FsbGJhY2sobm9kZSk7XHJcbiAgICAgIGlmKHJldHVybmVkVmFsdWUpIHJldHVybiByZXR1cm5lZFZhbHVlO1xyXG4gICAgICBpZihub2RlLl9wYXJlbnROb2RlICYmIG5vZGUuX3BhcmVudE5vZGUgIT09IHRvTm9kZSkgcmVjdXIobm9kZS5fcGFyZW50Tm9kZSk7XHJcbiAgICB9KGZyb21Ob2RlKSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnb0ZvcndhcmQoZnJvbU5vZGUsIHRvTm9kZSwgY2FsbGJhY2spe1xyXG4gICAgKGZ1bmN0aW9uIHJlY3VyKG5vZGUpe1xyXG4gICAgICBpZihub2RlLl9wYXJlbnROb2RlICYmIG5vZGUuX3BhcmVudE5vZGUgIT09IGZyb21Ob2RlKSByZWN1cihub2RlLl9wYXJlbnROb2RlKTtcclxuICAgICAgY2FsbGJhY2sobm9kZSk7XHJcbiAgICB9KHRvTm9kZSkpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZGlzdEJldHdlZW4oZnJvbU5vZGUsIHRvTm9kZSl7XHJcbiAgICByZXR1cm4gZGlzdGFuY2VUb1Jvb3QoZnJvbU5vZGUpICsgZGlzdGFuY2VUb1Jvb3QodG9Ob2RlKSAtIDIgKiBkaXN0YW5jZVRvUm9vdChmaW5kQ29tbW9uUGFyZW50KGZyb21Ob2RlLCB0b05vZGUpKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGRpc3RhbmNlVG9Sb290KG5vZGUpe1xyXG4gICAgdmFyIGRpc3RhbmNlID0gMDtcclxuICAgIChmdW5jdGlvbiByZWN1cihub2RlKXtcclxuICAgICAgaWYobm9kZS5fcGFyZW50Tm9kZSl7XHJcbiAgICAgICAgZGlzdGFuY2UrKztcclxuICAgICAgICByZWN1cihub2RlLl9wYXJlbnROb2RlKTtcclxuICAgICAgfVxyXG4gICAgfShub2RlKSk7XHJcbiAgICByZXR1cm4gZGlzdGFuY2U7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmaW5kQ29tbW9uUGFyZW50KGZyb21Ob2RlLCB0b05vZGUpe1xyXG5cclxuICAgIC8vIEdldCBQYXJlbnRzXHJcbiAgICB2YXIgZnJvbU5vZGVQYXJlbnRzID0gZ2V0UGFyZW50cyhmcm9tTm9kZSk7XHJcbiAgICB2YXIgdG9Ob2RlUGFyZW50cyA9IGdldFBhcmVudHModG9Ob2RlKTtcclxuXHJcbiAgICAvLyBGaW5kIENvbW1vbnRcclxuICAgIHZhciBjb21tb24gPSBudWxsO1xyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGZyb21Ob2RlUGFyZW50cy5sZW5ndGg7IGkrKyl7XHJcbiAgICAgIGlmKHRvTm9kZVBhcmVudHMuaW5kZXhPZihmcm9tTm9kZVBhcmVudHNbaV0pICE9PSAtMSl7XHJcbiAgICAgICAgY29tbW9uID0gZnJvbU5vZGVQYXJlbnRzW2ldO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmV0dXJuIENvbW1vblxyXG4gICAgcmV0dXJuIGNvbW1vbjtcclxuXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXRQYXJlbnRzKGZyb21Ob2RlKXtcclxuICAgIHZhciBwYXJlbnRzID0gW107XHJcbiAgICAoZnVuY3Rpb24gcmVjdXIobm9kZSl7XHJcbiAgICAgIHBhcmVudHMucHVzaChub2RlKTtcclxuICAgICAgaWYobm9kZS5fcGFyZW50Tm9kZSkgcmVjdXIobm9kZS5fcGFyZW50Tm9kZSk7XHJcbiAgICB9KGZyb21Ob2RlKSk7XHJcbiAgICByZXR1cm4gcGFyZW50cztcclxuICB9XHJcblxyXG5cclxuICBmdW5jdGlvbiByZXNldFZpeihmcm9tTm9kZSl7XHJcbiAgICB0cmFpbC53YWl0Rm9yKGZ1bmN0aW9uKCl7XHJcbiAgICAgIChmdW5jdGlvbiByZWN1cihub2RlKXtcclxuICAgICAgICBpZihub2RlLl9kYXRhLmNoYW5nZXMpe1xyXG4gICAgICAgICAgaWYobm9kZS5fcGFyZW50Tm9kZSAmJiBub2RlLl9wYXJlbnROb2RlLl9kYXRhLmNoYW5nZXMpe1xyXG4gICAgICAgICAgICBub2RlLl9kYXRhLmNoYW5nZXMuaW52ZXJzZSgpO1xyXG4gICAgICAgICAgICByZWN1cihub2RlLl9wYXJlbnROb2RlKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5vZGUuX2RhdGEuY2hhbmdlcy5pbnZlcnNlKCkuZG9uZSgpO1xyXG4gICAgICAgICAgICBub2RlLl9kYXRhLmNoYW5nZXMuZG9uZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfShmcm9tTm9kZSkpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB2YXIgc3RhdGVMb2FkZXIgPSB7XHJcblxyXG4gICAgbG9hZFN0YXRlOiBmdW5jdGlvbih0cmFpbCwgZCl7XHJcblxyXG4gICAgICAvLyBHZXQgU3RhcnQgYW5kIEVuZCBOb2Rlc1xyXG4gICAgICB2YXIgZnJvbU5vZGUgPSB0cmFpbC5fY3VycmVudFZlcnNpb25Ob2RlO1xyXG4gICAgICB2YXIgdG9Ob2RlID0gZDtcclxuXHJcbiAgICAgIC8vIFJvb3QgTm9kZSBDbGlja2VkXHJcbiAgICAgIHRvTm9kZSA9ICF0b05vZGUgPyB0cmFpbC52ZXJzaW9uVHJlZSgpLl9yb290Tm9kZSA6IHRvTm9kZS5ub2RlSW5NYXN0ZXJUcmFpbCgpO1xyXG5cclxuICAgICAgLy8gTG9hZGluZyBjdXJyZW50IHZlcnNpb25cclxuICAgICAgaWYoZnJvbU5vZGUgPT09IHRvTm9kZSkgcmV0dXJuO1xyXG5cclxuICAgICAgLy8gRmluZCBOZWFyZXN0IENoZWNrcG9pbnRcclxuICAgICAgdmFyIGNoayA9IG5lYXJlc3RDaGVja3BvaW50LmZpbmQodHJhaWwsIHRvTm9kZSk7XHJcbiAgICAgIHZhciBjaGVja3BvaW50Tm9kZSA9IGNoay5ub2RlO1xyXG4gICAgICB2YXIgY2hlY2twb2ludERpc3RhbmNlID0gY2hrLmRpc3RhbmNlO1xyXG5cclxuICAgICAgLy8gRGlzdGFuY2UgQmV0d2VlbiBUd28gTm9kZXNcclxuICAgICAgdmFyIGRpc3RhbmNlID0gZGlzdEJldHdlZW4oZnJvbU5vZGUsIHRvTm9kZSk7XHJcblxyXG4gICAgICAvLyBJZiBjaGVja3BvaW50IGlzIG5lYXIgdGhhbiBmcm9tTm9kLCBsb2FkIGNoZWNrcG9pbnQgYW5kIHBlcmZvcm0gYWN0aW9uc1xyXG4gICAgICAvLyBVcGRhdGUgZnJvbU5vZGVcclxuICAgICAgaWYoKGNoZWNrcG9pbnREaXN0YW5jZSA8IGRpc3RhbmNlICkgJiYgY2hlY2twb2ludE5vZGUpe1xyXG4gICAgICAgIHRyYWlsLmNoZWNrcG9pbnRNYW5hZ2VyKCkuc2V0Q2hlY2twb2ludERhdGEoY2hlY2twb2ludE5vZGUuX2RhdGEuY2hhbmdlcy5fY2hlY2twb2ludERhdGEpO1xyXG4gICAgICAgIGZyb21Ob2RlID0gY2hlY2twb2ludE5vZGU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEZpbmQgQ29tbW9uIFBhcmVudHNcclxuICAgICAgdmFyIGNvbW1vblBhcmVudCA9IGZpbmRDb21tb25QYXJlbnQoZnJvbU5vZGUsIHRvTm9kZSk7XHJcblxyXG4gICAgICBpZih0b05vZGUuX2RhdGEuY2hhbmdlcyAmJiB0b05vZGUuX2RhdGEuY2hhbmdlcy5pc0NoZWNrcG9pbnQoKSl7XHJcbiAgICAgICAgaWYodHJhaWwuX3VwZGF0ZVZpekNhbGxiYWNrKXtcclxuICAgICAgICAgIHRyYWlsLl91cGRhdGVWaXpDYWxsYmFjaygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmKGNvbW1vblBhcmVudCA9PT0gZnJvbU5vZGUpe1xyXG5cclxuICAgICAgICAvLyBGb3J3YXJkIEFsbCBDaGFuZ2VzIHRpbGwgZGVzdGluYXRpb25cclxuICAgICAgICBnb0ZvcndhcmQoZnJvbU5vZGUsIHRvTm9kZSwgZnVuY3Rpb24obm9kZSl7XHJcbiAgICAgICAgICB2YXIgZm9yd2FyZEFjdGlvbiA9IG5vZGUuX2RhdGEuY2hhbmdlcy5mb3J3YXJkKCk7XHJcbiAgICAgICAgICBpZihub2RlID09PSB0b05vZGUpe1xyXG4gICAgICAgICAgICBmb3J3YXJkQWN0aW9uLmRvbmUoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgIH0gZWxzZSBpZihjb21tb25QYXJlbnQgPT09IHRvTm9kZSl7XHJcblxyXG4gICAgICAgIC8vIEludmVyc2UgQWxsIENoYW5nZXMgdGlsbCBkZXN0aW5hdGlvblxyXG4gICAgICAgIGdvSW52ZXJzZShmcm9tTm9kZSwgdG9Ob2RlLCBmdW5jdGlvbihub2RlKXtcclxuICAgICAgICAgIHZhciBpbnZlcnNlQWN0aW9uID0gbm9kZS5fZGF0YS5jaGFuZ2VzLmludmVyc2UoKTtcclxuICAgICAgICAgIGlmKG5vZGUuX3BhcmVudE5vZGUgPT09IGNvbW1vblBhcmVudCl7XHJcbiAgICAgICAgICAgIGludmVyc2VBY3Rpb24uZG9uZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgLy8gSW52ZXJzZSBBbGwgQ2hhbmdlcyB0aWxsIGNvbW1vbiBub2RlXHJcbiAgICAgICAgZ29JbnZlcnNlKGZyb21Ob2RlLCBjb21tb25QYXJlbnQsIGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgICAgdmFyIGludmVyc2VBY3Rpb24gPSBub2RlLl9kYXRhLmNoYW5nZXMuaW52ZXJzZSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBGb3J3YXJkIEFsbCBDaGFuZ2VzIHRpbGwgZGVzdGluYXRpb25cclxuICAgICAgICBnb0ZvcndhcmQoY29tbW9uUGFyZW50LCB0b05vZGUsIGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgICAgdmFyIGZvcndhcmRBY3Rpb24gPSBub2RlLl9kYXRhLmNoYW5nZXMuZm9yd2FyZCgpO1xyXG4gICAgICAgICAgaWYobm9kZSA9PT0gdG9Ob2RlKXtcclxuICAgICAgICAgICAgZm9yd2FyZEFjdGlvbi5kb25lKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDbGVhciBjdXJyZW50IGJyYW5jaFxyXG4gICAgICB0cmFpbC5fY3VycmVudEJyYW5jaFZlcnNpb25zID0gW107XHJcblxyXG4gICAgICAvLyBSZWN1cnNpdmVseSBhZGQgdGh1bWJuYWlsc1xyXG4gICAgICAoZnVuY3Rpb24gcmVjdXIobm9kZSl7XHJcbiAgICAgICAgaWYobm9kZS5fcGFyZW50Tm9kZSl7XHJcbiAgICAgICAgICByZWN1cihub2RlLl9wYXJlbnROb2RlKTtcclxuICAgICAgICAgIHRyYWlsLl9jdXJyZW50QnJhbmNoVmVyc2lvbnMucHVzaChub2RlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0odG9Ob2RlKSk7XHJcblxyXG4gICAgICAvLyBBZGQgdGh1bWJuYWlscyBiZWxvdyB0aGUgIHRhcmdldHRlZCBub2RlXHJcbiAgICAgIGlmKHRvTm9kZS5fY2hpbGROb2Rlcy5sZW5ndGgpXHJcbiAgICAgIChmdW5jdGlvbiByZWN1cihub2RlKXtcclxuICAgICAgICB0cmFpbC5fY3VycmVudEJyYW5jaFZlcnNpb25zLnB1c2gobm9kZSk7XHJcbiAgICAgICAgaWYobm9kZS5fY2hpbGROb2Rlcy5sZW5ndGgpXHJcbiAgICAgICAgICByZWN1cihub2RlLl9jaGlsZE5vZGVzW25vZGUuX2NoaWxkTm9kZXMubGVuZ3RoIC0gMV0pO1xyXG4gICAgICB9KHRvTm9kZS5fY2hpbGROb2Rlc1t0b05vZGUuX2NoaWxkTm9kZXMubGVuZ3RoIC0gMV0pKTtcclxuXHJcbiAgICAgIC8vIFVwZGF0ZSBDdXJyZW50IE5vZGVcclxuICAgICAgdHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZSA9IHRvTm9kZTtcclxuXHJcbiAgICAgIC8vIFVwZGF0ZSBUaHVtYm5haWwgR2FsbGVyeVxyXG4gICAgICB0cmFpbC5yZWZyZXNoVGh1bWJuYWlsR2FsbGVyeSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIHN0YXRlTG9hZGVyO1xyXG5cclxufSgpKTtcclxuIiwiXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG4gIHZhciBleHBvcnRlciA9IHtcclxuXHJcbiAgICAvLyBFeHBvcnQgdGhlIGdpdmVuIHRyYWlsIGFsb25nIHdpdGggZXZlcnl0aGluZ1xyXG4gICAgZXhwb3J0OiBmdW5jdGlvbih0cmFpbCl7XHJcblxyXG4gICAgICAvLyBNYXN0ZXIgVHJhaWwgSW5mb1xyXG4gICAgICB2YXIgZXhwb3J0ZWRNYXN0ZXJUcmFpbCA9IGV4cG9ydGVyLmV4dHJhY3RUcmFpbEluZm8odHJhaWwpO1xyXG5cclxuICAgICAgLy8gRXh0cmFjdCBTdWIgVHJhaWxzXHJcbiAgICAgIHZhciBleHBvcnRlZFN1YlRyYWlscyA9IHRyYWlsLnN1YlRyYWlscygpLm1hcChmdW5jdGlvbihzdWJUcmFpbCl7XHJcbiAgICAgICAgcmV0dXJuIGV4cG9ydGVyLmV4dHJhY3RTdWJUcmFpbChzdWJUcmFpbCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQWRkIGV4cG9ydGVkIHN1YiB0cmFpbHMgaW4gbWFzdGVyIHRyYWlsXHJcbiAgICAgIGV4cG9ydGVkTWFzdGVyVHJhaWwuc3ViVHJhaWxzID0gZXhwb3J0ZWRTdWJUcmFpbHM7XHJcblxyXG4gICAgICAvLyBSZXR1cm5cclxuICAgICAgcmV0dXJuIGV4cG9ydGVkTWFzdGVyVHJhaWw7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBleHRyYWN0VHJhaWxJbmZvOiBmdW5jdGlvbih0cmFpbCl7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdHJhaWxJZDogdHJhaWwuaWQoKSxcclxuICAgICAgICBpbml0aWF0ZWRBdDogdHJhaWwuX2luaXRpYXRlZEF0LFxyXG4gICAgICAgIGF0dHJzOiB0cmFpbC5fYXR0cnMsXHJcbiAgICAgICAgY29udHJvbHM6IHRyYWlsLl9jb250cm9sc1NlbGVjdGVkLFxyXG4gICAgICAgIHJlbmRlclRvOiB0cmFpbC5fcmVuZGVyVG8sXHJcbiAgICAgICAgaXNNYXN0ZXI6IHRydWUsXHJcbiAgICAgICAgdmVyc2lvblRyZWU6IGV4cG9ydGVyLmV4cG9ydFZlcnNpb25UcmVlKHRyYWlsLCB0cmFpbC52ZXJzaW9uVHJlZSgpKSxcclxuICAgICAgICBjdXJyZW50VmVyc2lvbk5vZGVJZDogdHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZS5fZGF0YS5jaGFuZ2VzID8gdHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZS5fZGF0YS5jaGFuZ2VzLmlkKCkgOiBudWxsLFxyXG4gICAgICAgIGN1cnJlbnRCcmFuY2hWZXJzaW9uczogdHJhaWwuX2N1cnJlbnRCcmFuY2hWZXJzaW9ucy5tYXAoZnVuY3Rpb24obm9kZSl7XHJcbiAgICAgICAgICByZXR1cm4gbm9kZS5fZGF0YS5jaGFuZ2VzLmlkKCk7XHJcbiAgICAgICAgfSlcclxuICAgICAgfTtcclxuICAgIH0sXHJcblxyXG4gICAgZXh0cmFjdFN1YlRyYWlsOiBmdW5jdGlvbihzdWJUcmFpbCl7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3ViVHJhaWxJZDogc3ViVHJhaWwuaWQoKSxcclxuICAgICAgICBpZGVudGlmaWVyOiBzdWJUcmFpbC5faWRlbnRpZmllcixcclxuICAgICAgICBpbml0aWF0ZWRBdDogc3ViVHJhaWwuX2luaXRpYXRlZEF0LFxyXG4gICAgICAgIGF0dHJzOiBzdWJUcmFpbC5fYXR0cnMsXHJcbiAgICAgICAgbWFzdGVyVHJhaWxJZDogc3ViVHJhaWwubWFzdGVyVHJhaWwoKS5pZCgpLFxyXG4gICAgICAgIGN1cnJlbnRWZXJzaW9uTm9kZUlkOiBzdWJUcmFpbC5fY3VycmVudFZlcnNpb25Ob2RlLl9kYXRhLmNoYW5nZXMgPyB0cmFpbC5fY3VycmVudFZlcnNpb25Ob2RlLl9kYXRhLmNoYW5nZXMuaWQoKSA6IG51bGwsXHJcbiAgICAgICAgdmVyc2lvblRyZWU6IGV4cG9ydGVyLmV4cG9ydFN1YlRyYWlsVmVyc2lvblRyZWUoc3ViVHJhaWwsIHN1YlRyYWlsLnZlcnNpb25UcmVlKCkpXHJcbiAgICAgIH07XHJcbiAgICB9LFxyXG5cclxuICAgIGV4cG9ydFZlcnNpb25UcmVlOiBmdW5jdGlvbih0cmFpbCwgdHJlZSl7XHJcbiAgICAgIHJldHVybiB0cmVlLmV4cG9ydChmdW5jdGlvbihkYXRhKXtcclxuICAgICAgICByZXR1cm4gZGF0YS5jaGFuZ2VzID8ge1xyXG4gICAgICAgICAgY2hhbmdlSWQ6IGRhdGEuY2hhbmdlcy5pZCgpLFxyXG4gICAgICAgICAgc3ViVHJhaWxJZDogZGF0YS5jaGFuZ2VzLnN1YlRyYWlsKCkuaWQoKSxcclxuICAgICAgICB9IDogeyBpc01hc3RlcjogdHJ1ZX07XHJcbiAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICBleHBvcnRTdWJUcmFpbFZlcnNpb25UcmVlOiBmdW5jdGlvbihzdWJUcmFpbCwgdHJlZSl7XHJcbiAgICAgIHJldHVybiB0cmVlLmV4cG9ydChmdW5jdGlvbihkYXRhKXtcclxuICAgICAgICByZXR1cm4gZGF0YS5rZXkgPyB7XHJcbiAgICAgICAgICBjaGFuZ2VJZDogZGF0YS5jaGFuZ2VzLmlkKCksXHJcbiAgICAgICAgICByZWNvcmRlZEF0OiBkYXRhLmNoYW5nZXMucmVjb3JkZWRBdCgpLFxyXG4gICAgICAgICAgdGh1bWJuYWlsOiBkYXRhLmNoYW5nZXMudGh1bWJuYWlsKCksXHJcbiAgICAgICAgICBzdWJUcmFpbElkOiBkYXRhLmNoYW5nZXMuc3ViVHJhaWwoKS5pZCgpLFxyXG4gICAgICAgICAgZGF0YTogZGF0YS5jaGFuZ2VzLmRhdGEoKSxcclxuICAgICAgICAgIGNoZWNrcG9pbnREYXRhOiBkYXRhLmNoYW5nZXMuY2hlY2twb2ludERhdGEoKSxcclxuICAgICAgICAgIHVzZUFzQ2hlY2twb2ludDogZGF0YS5jaGFuZ2VzLmlzQ2hlY2twb2ludCgpLFxyXG4gICAgICAgICAgbGV2ZWxJbk1hc3RlclRyYWlsOiBkYXRhLmNoYW5nZXMubGV2ZWxJbk1hc3RlclRyYWlsKCksXHJcbiAgICAgICAgICBsZXZlbEluU3ViVHJhaWw6IGRhdGEuY2hhbmdlcy5sZXZlbEluU3ViVHJhaWwoKSxcclxuICAgICAgICB9IDogeyBpc01hc3RlcjogdHJ1ZSB9O1xyXG4gICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gIH07XHJcblxyXG4gIHJldHVybiBleHBvcnRlcjtcclxuXHJcbn0oKSk7XHJcbiIsIlxyXG52YXIgZGF0YVRyZWUgPSByZXF1aXJlKCdkYXRhLXRyZWUnKTtcclxudmFyIENoYW5nZXMgPSByZXF1aXJlKCcuLi9jaGFuZ2VzJyk7XHJcbnZhciBzdGF0ZUxvYWRlciA9IHJlcXVpcmUoJy4uL25hdmlnYXRpb24vc3RhdGVMb2FkZXInKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG4gIHZhciBpbXBvcnRlciA9IHtcclxuXHJcbiAgICBpbXBvcnQ6IGZ1bmN0aW9uKHRyYWlsLCB0cmFpbERhdGEpe1xyXG5cclxuICAgICAgLy8gVmFsaWRhdGVcclxuICAgICAgaWYoIXRyYWlsRGF0YSB8fCAhdHJhaWxEYXRhLnRyYWlsSWQgfHwgdHlwZW9mIHRyYWlsRGF0YS50cmFpbElkICE9PSAnc3RyaW5nJylcclxuICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgLy8gUmVzZXQgVml6IERhdGFcclxuICAgICAgdHJhaWwud2FpdEZvcihmdW5jdGlvbigpe1xyXG4gICAgICAgIHRyYWlsLl9ldmVudHMub25UcmFpbExvYWRzLmZvckVhY2goZnVuY3Rpb24oX2NiKXtcclxuICAgICAgICAgIF9jYigpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEltcG9ydCBUcmFpbCBJbmZvcm1hdGlvblxyXG4gICAgICBpbXBvcnRlci5pbXBvcnRUcmFpbEluZm8odHJhaWwsIHRyYWlsRGF0YSk7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBpbXBvcnRUcmFpbEluZm86IGZ1bmN0aW9uKHRyYWlsLCB0cmFpbERhdGEpe1xyXG5cclxuICAgICAgLy8gT3ZlcnJpZGUgUHJvcGVydGllc1xyXG4gICAgICB0cmFpbC5faWQgPSB0cmFpbERhdGEudHJhaWxJZDtcclxuICAgICAgdHJhaWwuX2luaXRpYXRlZEF0ID0gdHJhaWxEYXRhLmluaXRpYXRlZEF0O1xyXG5cclxuICAgICAgT2JqZWN0LmtleXModHJhaWxEYXRhLmF0dHJzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgICAgdHJhaWwuYXR0cihrZXksIHRyYWlsRGF0YS5hdHRyc1trZXldKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBPdmVycmlkZSBzdWJUcmFpbHNcclxuICAgICAgdHJhaWwuc3ViVHJhaWxzKCkuZm9yRWFjaChmdW5jdGlvbihzdWJUcmFpbCl7XHJcbiAgICAgICAgdHJhaWxEYXRhLnN1YlRyYWlscy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlRyYWlsRGF0YSl7XHJcbiAgICAgICAgICBpZihzdWJUcmFpbC5faWRlbnRpZmllciA9PT0gc3ViVHJhaWxEYXRhLmlkZW50aWZpZXIpe1xyXG4gICAgICAgICAgICBpbXBvcnRlci5pbXBvcnRTdWJUcmFpbEluZm8odHJhaWwsIHN1YlRyYWlsLCBzdWJUcmFpbERhdGEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFJlbW92ZSBDb250cm9sIEJveFxyXG4gICAgICB0cmFpbC5yZWNyZWF0ZUNvbnRyb2xCb3goKTtcclxuXHJcbiAgICAgIC8vIENsZWFyIHNlbGVjdGVkIGNvbnRyb2xzXHJcbiAgICAgIHRyYWlsLl9jb250cm9sc1NlbGVjdGVkID0gW107XHJcblxyXG4gICAgICAvLyBBZGQgQ29udHJvbHNcclxuICAgICAgdHJhaWwuYWRkQ29udHJvbHModHJhaWxEYXRhLmNvbnRyb2xzKTtcclxuICAgICAgdHJhaWwucmVuZGVyVG8odHJhaWxEYXRhLnJlbmRlclRvKTtcclxuXHJcbiAgICAgIC8vIEltcG9ydCBWZXJzaW9uIFRyZWUgaW4gU3ViIFRyYWlsc1xyXG4gICAgICBpbXBvcnRlci5pbXBvcnRNYXN0ZXJUcmFpbFZlcnNpb25UcmVlKHRyYWlsLCB0cmFpbERhdGEpO1xyXG5cclxuXHJcbiAgICB9LFxyXG5cclxuICAgIGltcG9ydFN1YlRyYWlsSW5mbzogZnVuY3Rpb24odHJhaWwsIHN1YlRyYWlsLCBzdWJUcmFpbERhdGEpe1xyXG4gICAgICBzdWJUcmFpbC5faWQgPSBzdWJUcmFpbERhdGEuc3ViVHJhaWxJZDtcclxuICAgICAgc3ViVHJhaWwuX2luaXRpYXRlZEF0ID0gc3ViVHJhaWxEYXRhLmluaXRpYXRlZEF0O1xyXG4gICAgICBpbXBvcnRlci5pbXBvcnRTdWJUcmFpbFZlcnNpb25UcmVlKHN1YlRyYWlsLCBzdWJUcmFpbERhdGEpO1xyXG4gICAgICBPYmplY3Qua2V5cyhzdWJUcmFpbERhdGEuYXR0cnMpLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcclxuICAgICAgICBzdWJUcmFpbC5hdHRyKGtleSwgc3ViVHJhaWxEYXRhLmF0dHJzW2tleV0pO1xyXG4gICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgaW1wb3J0U3ViVHJhaWxWZXJzaW9uVHJlZTogZnVuY3Rpb24oc3ViVHJhaWwsIHN1YlRyYWlsRGF0YSl7XHJcblxyXG4gICAgICAvLyBHZXQgdHJlZSBkYXRhXHJcbiAgICAgIHRyZWVEYXRhID0gc3ViVHJhaWxEYXRhLnZlcnNpb25UcmVlO1xyXG5cclxuICAgICAgLy8gQ2xlYXIgb2xkIHRyZWVcclxuICAgICAgc3ViVHJhaWwuX3ZlcnNpb25UcmVlID0gZGF0YVRyZWUuY3JlYXRlKCk7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgRHVtbXkgQ2hhbmdlc1xyXG4gICAgICB2YXIgZHVtbXlDaGFuZ2UgPSBuZXcgQ2hhbmdlcyhzdWJUcmFpbCwgbnVsbCk7XHJcblxyXG4gICAgICAvLyBJbXBvcnQgRGF0YVxyXG4gICAgICBzdWJUcmFpbC5fdmVyc2lvblRyZWUuaW1wb3J0KHRyZWVEYXRhLCAnY2hpbGRyZW4nLCBmdW5jdGlvbihub2RlRGF0YSl7XHJcblxyXG4gICAgICAgaWYobm9kZURhdGEuaXNNYXN0ZXIpe1xyXG4gICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgIGtleTogbnVsbCxcclxuICAgICAgICAgICBjaGFuZ2VzOiBkdW1teUNoYW5nZVxyXG4gICAgICAgICB9O1xyXG4gICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgIC8vIENyZWF0ZSBDaGFuZ2UgYW5kIE92ZXJyaWRlXHJcbiAgICAgICAgIHZhciBjaGFuZ2VzID0gbmV3IENoYW5nZXMoc3ViVHJhaWwsIG5vZGVEYXRhLmRhdGEpO1xyXG4gICAgICAgICBjaGFuZ2VzLmlkKG5vZGVEYXRhLmNoYW5nZUlkKTtcclxuICAgICAgICAgY2hhbmdlcy5yZWNvcmRlZEF0KG5vZGVEYXRhLnJlY29yZGVkQXQpO1xyXG4gICAgICAgICBjaGFuZ2VzLmRhdGEobm9kZURhdGEuZGF0YSk7XHJcbiAgICAgICAgIGNoYW5nZXMuX2NoZWNrcG9pbnREYXRhID0gbm9kZURhdGEuY2hlY2twb2ludERhdGE7XHJcbiAgICAgICAgIGNoYW5nZXMuX2xldmVsSW5TdWJUcmFpbCA9IG5vZGVEYXRhLmxldmVsSW5TdWJUcmFpbDtcclxuICAgICAgICAgY2hhbmdlcy5fbGV2ZWxJbk1hc3RlclRyYWlsID0gbm9kZURhdGEubGV2ZWxJbk1hc3RlclRyYWlsO1xyXG4gICAgICAgICBjaGFuZ2VzLl9zdWJUcmFpbCA9IHN1YlRyYWlsO1xyXG4gICAgICAgICBjaGFuZ2VzLl90aHVtYm5haWwgPSBub2RlRGF0YS50aHVtYm5haWw7XHJcbiAgICAgICAgIGNoYW5nZXMuX3VzZUFzQ2hlY2twb2ludCA9IG5vZGVEYXRhLnVzZUFzQ2hlY2twb2ludDtcclxuICAgICAgICAgY2hhbmdlcy5fZm9yd2FyZEFjdGlvbiA9IHN1YlRyYWlsLl9mb3J3YXJkQWN0aW9uO1xyXG4gICAgICAgICBjaGFuZ2VzLl9pbnZlcnNlQWN0aW9uID0gc3ViVHJhaWwuX2ludmVyc2VBY3Rpb247XHJcbiAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAga2V5OiBub2RlRGF0YS5jaGFuZ2VJZCxcclxuICAgICAgICAgICBjaGFuZ2VzOiBjaGFuZ2VzXHJcbiAgICAgICAgIH07XHJcbiAgICAgICB9XHJcblxyXG4gICAgIH0pO1xyXG5cclxuICAgICBzdWJUcmFpbC5fY3VycmVudFZlcnNpb25Ob2RlID0gc3ViVHJhaWwuX3ZlcnNpb25UcmVlLl9yb290Tm9kZTtcclxuICAgICBzdWJUcmFpbC5fdmVyc2lvblRyZWUudHJhdmVyc2VyKCkudHJhdmVyc2VCRlMoZnVuY3Rpb24obm9kZSl7XHJcbiAgICAgICBpZihzdWJUcmFpbERhdGEuY3VycmVudFZlcnNpb25Ob2RlSWQgJiYgbm9kZS5fZGF0YS5jaGFuZ2VzICYmIG5vZGUuX2RhdGEuY2hhbmdlcy5pZCgpID09PSBzdWJUcmFpbERhdGEuY3VycmVudFZlcnNpb25Ob2RlSWQpe1xyXG4gICAgICAgICBzdWJUcmFpbC5fY3VycmVudFZlcnNpb25Ob2RlID0gbm9kZTtcclxuICAgICAgIH1cclxuICAgICAgIGlmKG5vZGUuX2RhdGEuY2hhbmdlcyl7XHJcbiAgICAgICAgIG5vZGUuX2RhdGEuY2hhbmdlcy5fbm9kZUluU3ViVHJhaWwgPSBub2RlO1xyXG4gICAgICAgfVxyXG4gICAgIH0pO1xyXG5cclxuICAgfSxcclxuXHJcbiAgIGltcG9ydE1hc3RlclRyYWlsVmVyc2lvblRyZWU6IGZ1bmN0aW9uKHRyYWlsLCB0cmFpbERhdGEpe1xyXG4gICAgIHRyZWVEYXRhID0gIHRyYWlsRGF0YS52ZXJzaW9uVHJlZTtcclxuICAgICB0cmFpbC5fdmVyc2lvblRyZWUgPSBkYXRhVHJlZS5jcmVhdGUoKTtcclxuICAgICB0cmFpbC5fY3VycmVudEJyYW5jaFZlcnNpb25zID0gW107XHJcbiAgICAgdHJhaWwuX3ZlcnNpb25UcmVlLmltcG9ydCh0cmVlRGF0YSwgJ2NoaWxkcmVuJywgZnVuY3Rpb24obm9kZURhdGEpe1xyXG5cclxuICAgICAgIGlmKG5vZGVEYXRhLmlzTWFzdGVyKXtcclxuICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICBrZXk6IG51bGwsXHJcbiAgICAgICAgICAgY2hhbmdlczogbnVsbFxyXG4gICAgICAgICB9O1xyXG4gICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgIC8vIEZldGNoIENoYW5nZVxyXG4gICAgICAgICB2YXIgY2hhbmdlTm9kZSA9IG51bGw7XHJcbiAgICAgICAgIHRyYWlsLnN1YlRyYWlscygpLnNvbWUoZnVuY3Rpb24oc3ViVHJhaWwpe1xyXG4gICAgICAgICAgIGlmKHN1YlRyYWlsLmlkKCkgPT09IG5vZGVEYXRhLnN1YlRyYWlsSWQpe1xyXG4gICAgICAgICAgICAgY2hhbmdlTm9kZSA9IHN1YlRyYWlsLnZlcnNpb25UcmVlKCkudHJhdmVyc2VyKCkuc2VhcmNoQkZTKGZ1bmN0aW9uKG5vZGVEKXtcclxuICAgICAgICAgICAgICAgcmV0dXJuIG5vZGVELmNoYW5nZXMgJiYgbm9kZUQuY2hhbmdlcy5pZCgpID09PSBub2RlRGF0YS5jaGFuZ2VJZDtcclxuICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgaWYoY2hhbmdlTm9kZSkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgfVxyXG4gICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgIHZhciBjaGFuZ2VzID0gY2hhbmdlTm9kZS5fZGF0YS5jaGFuZ2VzO1xyXG5cclxuICAgICAgICAgcmV0dXJuIGNoYW5nZXMgPyB7XHJcbiAgICAgICAgICAga2V5OiBjaGFuZ2VzLmlkKCksXHJcbiAgICAgICAgICAgY2hhbmdlczogY2hhbmdlc1xyXG4gICAgICAgICB9IDoge2tleTogbnVsbCxcclxuICAgICAgICAgY2hhbmdlczogbnVsbH0gO1xyXG5cclxuICAgICAgIH1cclxuICAgICB9KTtcclxuXHJcbiAgICAgdHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZSA9IHRyYWlsLl92ZXJzaW9uVHJlZS5fcm9vdE5vZGU7XHJcbiAgICAgdmFyIHRvTm9kZSA9IHRyYWlsLl92ZXJzaW9uVHJlZS5fcm9vdE5vZGU7XHJcbiAgICAgdHJhaWwuX3ZlcnNpb25UcmVlLnRyYXZlcnNlcigpLnRyYXZlcnNlQkZTKGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgaWYodHJhaWxEYXRhLmN1cnJlbnRWZXJzaW9uTm9kZUlkICYmIG5vZGUuX2RhdGEuY2hhbmdlcyAmJiBub2RlLl9kYXRhLmNoYW5nZXMuaWQoKSA9PT0gdHJhaWxEYXRhLmN1cnJlbnRWZXJzaW9uTm9kZUlkKXtcclxuICAgICAgICAgdG9Ob2RlID0gbm9kZTtcclxuICAgICAgIH1cclxuICAgICAgIGlmKG5vZGUuX2RhdGEuY2hhbmdlcyl7XHJcbiAgICAgICAgIG5vZGUuX2RhdGEuY2hhbmdlcy5fbm9kZUluTWFzdGVyVHJhaWwgPSBub2RlO1xyXG4gICAgICAgfVxyXG4gICAgIH0pO1xyXG5cclxuXHJcbiAgICAgIC8vICB0cmFpbC5yZWZyZXNoVGh1bWJuYWlsR2FsbGVyeSgpO1xyXG4gICAgICB0cmFpbC53YWl0Rm9yKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgc3RhdGVMb2FkZXIubG9hZFN0YXRlKHRyYWlsLCB0b05vZGUuX2RhdGEuY2hhbmdlcyk7XHJcbiAgICAgIH0pO1xyXG5cclxuXHJcbiAgICAgY29uc29sZS5sb2coXCJUcmFpbFwiLCB0cmFpbCwgdG9Ob2RlKTtcclxuXHJcblxyXG4gICB9LFxyXG5cclxuXHJcblxyXG5cclxuICB9O1xyXG5cclxuICByZXR1cm4gaW1wb3J0ZXI7XHJcblxyXG59KCkpO1xyXG4iLCJcclxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcclxudmFyIFNuYXBzaG90ID0gcmVxdWlyZSgnLi9zbmFwc2hvdCcpO1xyXG52YXIgZGF0YVRyZWUgPSByZXF1aXJlKCdkYXRhLXRyZWUnKTtcclxudmFyIHJhc3Rlcml6ZUhUTUwgPSByZXF1aXJlKCdyYXN0ZXJpemVodG1sJyk7XHJcbnZhciBjbG9uZSA9IHJlcXVpcmUoJ2Nsb25lJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuICAvLyBGbGFnIGJhZCBwcmFjdGlzZXNcclxuICd1c2Ugc3RyaWN0JztcclxuXHJcbiAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gLy8gVHJhaWxcclxuIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gLyoqXHJcbiAgKiBSZXByZXNlbnRzIHNuYXBzaG90IHRoYXQgaG9sZHMgdGhlIHN0YXRlIG9mIHZpc3VhbGl6YXRpb24uXHJcbiAgKlxyXG4gICogQGNsYXNzXHJcbiAgKiBAa2luZCBjbGFzc1xyXG4gICogQGNvbnN0cnVjdG9yXHJcbiAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIGRhdGEgdGhhdCBoYXMgdG8gc3RvcmVkIGluIHNuYXBzaG90LlxyXG4gICovXHJcbiB2YXIgU25hcHNob3QgPSBmdW5jdGlvbihkYXRhKXtcclxuXHJcbiAgIC8qKlxyXG4gICAgKiBJZCB0aGF0IHVuaXFlbHkgaWRlbnRpZmllcyB0aGUgc25hcHNob3QuXHJcbiAgICAqXHJcbiAgICAqIEBwcm9wZXJ0eSBfaWRcclxuICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICogQGRlZmF1bHQgXCJ0aW1lc3RhbXBcIlxyXG4gICAgKi9cclxuICAgdGhpcy5faWQgPSBoZWxwZXJzLmd1aWQoKTtcclxuXHJcbiAgIC8qKlxyXG4gICAgKiBJZCBvZiB0aGUgdHJhaWwgdG8gd2hpY2ggc25hcHNob3QgYmVsb25nc1xyXG4gICAgKlxyXG4gICAgKiBAcHJvcGVydHkgX3RyYWlsSWRcclxuICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICogQGRlZmF1bHQgXCJudWxsXCJcclxuICAgICovXHJcbiAgIHRoaXMuX3RyYWlsSWQgPSBudWxsO1xyXG5cclxuICAgLyoqXHJcbiAgICAqIFRpbWVzdGFtcCBhdCB3aGljaCBzbmFwc2hvdCB3YXMgY2FwdHVyZWQuXHJcbiAgICAqXHJcbiAgICAqIEBwcm9wZXJ0eSBfY2FwdHVyZWRBdFxyXG4gICAgKiBAdHlwZSB7c3RyaW5nfVxyXG4gICAgKiBAZGVmYXVsdCBcInRpbWVzdGFtcFwiXHJcbiAgICAqL1xyXG4gICB0aGlzLl9jYXB0dXJlZEF0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcblxyXG4gICAvKipcclxuICAgICogRGF0YSB0aGF0IHdhcyBjYXB0dXJlZC5cclxuICAgICpcclxuICAgICogQHByb3BlcnR5IF9kYXRhXHJcbiAgICAqIEB0eXBlIHtvYmplY3QgfCBhcnJheSB8IG51bWJlciB8IHN0cmluZyB8IG51bGx9XHJcbiAgICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICAqL1xyXG4gICB0aGlzLl9kYXRhID0gY2xvbmUoZGF0YSk7XHJcblxyXG4gICAvKipcclxuICAgICogRGF0YSB0aGF0IHJlcHJlc2VudHMgY2hlY2twb2ludFxyXG4gICAgKlxyXG4gICAgKiBAcHJvcGVydHkgX2NoZWNrcG9pbnREYXRhXHJcbiAgICAqIEB0eXBlIHtvYmplY3QgfCBhcnJheSB8IG51bWJlciB8IHN0cmluZyB8IG51bGx9XHJcbiAgICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICAqL1xyXG4gICB0aGlzLl9jaGVja3BvaW50RGF0YSA9IG51bGw7XHJcblxyXG4gICAvKipcclxuICAgICogVGh1bWJuYWlsIGNhcHR1cmVkLlxyXG4gICAgKlxyXG4gICAgKiBAcHJvcGVydHkgX3RodW1ibmFpbFxyXG4gICAgKiBAdHlwZSB7c3RyaW5nfVxyXG4gICAgKiBAZGVmYXVsdCBcIm51bGxcIlxyXG4gICAgKi9cclxuICAgdGhpcy5fdGh1bWJuYWlsID0gbnVsbDtcclxuXHJcbiAgIC8qKlxyXG4gICAgKiBMZXZlbCBvZiBzbmFwc2hvdCBpbiBhIHN1Yi10cmFpbCB0cmVlXHJcbiAgICAqXHJcbiAgICAqIEBwcm9wZXJ0eSBfbGV2ZWxcclxuICAgICogQHR5cGUge251bWJlcn1cclxuICAgICogQGRlZmF1bHQgLTFcclxuICAgICovXHJcbiAgIHRoaXMuX2xldmVsSW5TdWJUcmFpbCA9IC0xO1xyXG5cclxuICAgLyoqXHJcbiAgICAqIExldmVsIG9mIHNuYXBzaG90IGluIGEgbWFzdGVyLXRyYWlsIHRyZWVcclxuICAgICpcclxuICAgICogQHByb3BlcnR5IF9sZXZlbFxyXG4gICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgKiBAZGVmYXVsdCAtMVxyXG4gICAgKi9cclxuICAgdGhpcy5fbGV2ZWxJbk1hc3RlclRyYWlsID0gLTE7XHJcblxyXG5cclxuICAgLyoqXHJcbiAgICAqIFJlcHJlc2VudHMgUHJldmlvdXMgU3RhdGUgaW4gU3ViIFRyYWlsXHJcbiAgICAqXHJcbiAgICAqIEBwcm9wZXJ0eSBfcHJldlN0YXRlSW5TdWJUcmFpbFxyXG4gICAgKiBAdHlwZSB7b2JlamN0fVxyXG4gICAgKiBAZGVmYXVsdCBcIm51bGxcIlxyXG4gICAgKi9cclxuICAgdGhpcy5fcHJldlN0YXRlRnJvbVN1YlRyYWlsID0gbnVsbDtcclxuXHJcbiAgIC8qKlxyXG4gICAgKiBSZXByZXNlbnRzIFByZXZpb3VzIFN0YXRlIGluIE1hc3RlciBUcmFpbFxyXG4gICAgKlxyXG4gICAgKiBAcHJvcGVydHkgX3ByZXZTdGF0ZUluTWFzdGVyVHJhaWxcclxuICAgICogQHR5cGUge29iZWpjdH1cclxuICAgICogQGRlZmF1bHQgXCJudWxsXCJcclxuICAgICovXHJcbiAgIHRoaXMuX3ByZXZTdGF0ZUZyb21NYXN0ZXJUcmFpbCA9IG51bGw7XHJcblxyXG4gfTtcclxuXHJcbiAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gLy8gTWV0aG9kc1xyXG4gLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAvKipcclxuICAqIFNldHMgb3IgZ2V0cyB0aGUgZGF0YS5cclxuICAqXHJcbiAgKiBAbWV0aG9kIGRhdGFcclxuICAqIEBraW5kIG1lbWJlclxyXG4gICogQHBhcmFtIHtvYmplY3QgfCBhcnJheSB8IHN0cmluZyB8IG51bWJlciB8IG51bGwgfSBkYXRhIC0gZGF0YSB0aGF0IGhhcyB0byBiZSBjYXB0dXJlZC5cclxuICAqL1xyXG4gU25hcHNob3QucHJvdG90eXBlLmRhdGEgPSBmdW5jdGlvbihkYXRhKXtcclxuICAgaWYoYXJndW1lbnRzLmxlbmd0aCA+IDApe1xyXG4gICAgIHRoaXMuX2RhdGEgPSBjbG9uZShkYXRhKTtcclxuICAgICByZXR1cm4gdGhpcztcclxuICAgfSBlbHNlIHtcclxuICAgICByZXR1cm4gdGhpcy5fZGF0YTtcclxuICAgfVxyXG4gfTtcclxuXHJcbiAvKipcclxuICAqIFNldHMgb3IgZ2V0cyB0aGUgdHJhaWxJZC5cclxuICAqXHJcbiAgKiBAbWV0aG9kIHRyYWlsSWRcclxuICAqIEBraW5kIG1lbWJlclxyXG4gICogQHBhcmFtIHtzdHJpbmcgdHJhaWxJZCAtIElkIG9mIHRoZSB0cmFpbCB0byB3aGljaCBzbmFwc2hvdCBiZWxvbmdzXHJcbiAgKi9cclxuIFNuYXBzaG90LnByb3RvdHlwZS50cmFpbElkID0gZnVuY3Rpb24oaWQpe1xyXG4gICBpZihhcmd1bWVudHMubGVuZ3RoID4gMCl7XHJcbiAgICAgdGhpcy5fdHJhaWxJZCA9IGlkO1xyXG4gICAgIHJldHVybiB0aGlzO1xyXG4gICB9IGVsc2Uge1xyXG4gICAgIHJldHVybiB0aGlzLl90cmFpbElkO1xyXG4gICB9XHJcbiB9O1xyXG5cclxuIC8qKlxyXG4gICogQ2FwdHVyZXMgYSB0aHVtYm5haWwgb2YgZ2l2ZW4gY2FwdHVyZUFyZWFcclxuICAqXHJcbiAgKiBAbWV0aG9kIGNhcHR1cmVUaHVtYm5haWxcclxuICAqIEBraW5kIG1lbWJlclxyXG4gICogQHBhcmFtIHtzdHJpbmd9IGNhcHR1cmVBcmVhIC0gcXVlcnkgc2VsZWN0b3Igd2hpY2ggaGFzIHRvIHJlbmRlcmVkIGFzIHRodW1ibmFpbC5cclxuICAqIEBwYXJhbSB7bnVtYmVyfSBkZWxheSAtIGRlbGF5IGluIG1pbGxpc2Vjb25kcyBhZnRlciB3aGljaCB0aHVtYm5haWwgc2hvdWxkIGJlIGNhcHR1cmVkLlxyXG4gICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBnZXRzIHRyaWdnZXJlZCB3aGVuIHNuYXBzaG90IGZpbmlzaGVzIHJlbmRlcmluZyB0aHVtYm5haWwuXHJcbiAgKi9cclxuICAgU25hcHNob3QucHJvdG90eXBlLmNhcHR1cmVUaHVtYm5haWwgPSBmdW5jdGlvbihlbGVtZW50LCBkZWxheSwgY2FsbGJhY2spe1xyXG5cclxuICAgICAvLyBIb2xkIGB0aGlzYFxyXG4gICAgIHZhciB0aGlzcyA9IHRoaXM7XHJcblxyXG4gICAgIC8vIElmIHJlcXVpcmVkIGFyZ3VtZW50cyBhcmUgcGFzc2VkXHJcbiAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA+IDApe1xyXG5cclxuICAgICAgIC8vIENoZWNrIElmIHJhc3Rlcml6ZUhUTUwgaXMgaW5jbHVkZWRcclxuICAgICAgIGlmKCFyYXN0ZXJpemVIVE1MIHx8IHJhc3Rlcml6ZUhUTUwgPT09ICd1bmRlZmluZWQnKXtcclxuICAgICAgICAgY2FsbGJhY2sobnVsbCk7XHJcbiAgICAgICAgIHJldHVybjtcclxuICAgICAgIH1cclxuXHJcbiAgICAgICBpZighZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtZW50KSl7XHJcbiAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xyXG4gICAgICAgICByZXR1cm47XHJcbiAgICAgICB9XHJcblxyXG4gICAgICAgLy8gQ2xvbmUgYW5kIEhvbGQgY3VycmVudCBkb2N1bWVudFxyXG4gICAgICAgdmFyIGN1cnJlbnREb2N1bWVudCA9IGRvY3VtZW50O1xyXG4gICAgICAgdmFyIGNsb25uZWREb2N1bWVudCA9IGN1cnJlbnREb2N1bWVudC5jbG9uZU5vZGUodHJ1ZSk7XHJcblxyXG4gICAgICAgLy8gR2V0IEJvZHkgYW5kIEhUTUxcclxuICAgICAgIHZhciBib2R5ID0gY3VycmVudERvY3VtZW50LmJvZHksXHJcbiAgICAgICAgICAgaHRtbCA9IGN1cnJlbnREb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XHJcblxyXG4gICAgICAgLy8gQ29tcHV0ZSBNYXggSGVpZ2h0XHJcbiAgICAgICB2YXIgbWF4SGVpZ2h0ID0gTWF0aC5tYXgoYm9keS5zY3JvbGxIZWlnaHQsIGJvZHkub2Zmc2V0SGVpZ2h0LFxyXG4gICAgICAgaHRtbC5jbGllbnRIZWlnaHQsIGh0bWwuc2Nyb2xsSGVpZ2h0LCBodG1sLm9mZnNldEhlaWdodCk7XHJcblxyXG4gICAgICAgLy8gQ29tcHV0ZSBNYXggV2lkdGhcclxuICAgICAgIHZhciBtYXhXaWR0aCA9IE1hdGgubWF4KGJvZHkuc2Nyb2xsV2lkdGgsIGJvZHkub2Zmc2V0V2lkdGgsXHJcbiAgICAgICBodG1sLmNsaWVudFdpZHRoLCBodG1sLnNjcm9sbFdpZHRoLCBodG1sLm9mZnNldFdpZHRoKTtcclxuXHJcbiAgICAgICAvLyBDcmVhdGUgdGVtcG9yYXJ5IGNhbnZhcyBlbGVtZW50XHJcbiAgICAgICB2YXIgY2FudmFzID0gY2xvbm5lZERvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcbiAgICAgICBjYW52YXMud2lkdGggPSBtYXhXaWR0aDtcclxuICAgICAgIGNhbnZhcy5oZWlnaHQgPSBtYXhIZWlnaHQ7XHJcbiAgICAgICBjYW52YXMuaWQgPSBcInJhLWNhbnZhc1wiO1xyXG5cclxuICAgICAgIC8vIE1vZGlmeSBDb250ZXh0IG9mIENhbnZhc1xyXG4gICAgICAgdmFyIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBcIiNGRkZGRkZcIjtcclxuICAgICAgIGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuXHJcbiAgICAgICAvLyBSYXN0ZXJpemUgdGhlIGVudGlyZSBkb2N1bWVudFxyXG4gICAgICAgdmFyIGVsZW1lbnRET00gPSBjdXJyZW50RG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtZW50KTtcclxuXHJcbiAgICAgICAvLyBTaXplIGFuZCBPZmZzZXRzXHJcbiAgICAgICB2YXIgaGVpZ2h0ID0gTWF0aC5tYXgoZWxlbWVudERPTS5jbGllbnRIZWlnaHQsIGVsZW1lbnRET00uc2Nyb2xsSGVpZ2h0KSxcclxuICAgICAgICAgICB3aWR0aCA9IE1hdGgubWF4KGVsZW1lbnRET00uY2xpZW50V2lkdGgsIGVsZW1lbnRET00uc2Nyb2xsV2lkdGgpLFxyXG4gICAgICAgICAgIHRvcE9mZnNldCA9IGVsZW1lbnRET00ub2Zmc2V0VG9wLFxyXG4gICAgICAgICAgIGxlZnRPZmZzZXQgPSBlbGVtZW50RE9NLm9mZnNldExlZnQ7XHJcblxyXG4gICAgICAgLy8gRHJhdyByYXN0ZXJpemVkIGRvY3VtZW50XHJcbiAgICAgICByYXN0ZXJpemVIVE1MLmRyYXdEb2N1bWVudChjbG9ubmVkRG9jdW1lbnQsIGNhbnZhcykudGhlbihmdW5jdGlvbihyZW5kZXJSZXN1bHQpIHtcclxuXHJcbiAgICAgICAgIC8vIEdldCBDYW52YXMgY29udGV4dFxyXG4gICAgICAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbiAgICAgICAgIC8vIEdldCBJbWFnZSBEYXRhXHJcbiAgICAgICAgIHZhciBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKGxlZnRPZmZzZXQsIHRvcE9mZnNldCwgd2lkdGgsIGhlaWdodCk7XHJcblxyXG4gICAgICAgICAvLyBDbGVhciBDYW52YXMgUmVjdFxyXG4gICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcblxyXG4gICAgICAgICAvLyBSZXNpemUgQ2FudmFzXHJcbiAgICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xyXG4gICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG5cclxuICAgICAgICAgLy8gUHV0IGNyb3BwZWQgZGF0YSBiYWNrXHJcbiAgICAgICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcclxuXHJcbiAgICAgICAgIC8vIEdldCBiYXNlNjRcclxuICAgICAgICAgdmFyIGltYWdlQmFzZTY0ID0gY2FudmFzLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiLCAxLjApO1xyXG5cclxuICAgICAgICAgLy8gU2V0IFRodW1ibmFpbFxyXG4gICAgICAgICB0aGlzcy50aHVtYm5haWwoaW1hZ2VCYXNlNjQpO1xyXG5cclxuICAgICAgICAgLy8gU2VuZCByZXN1bHQgYmFja1xyXG4gICAgICAgICBpZihjYWxsYmFjaykgY2FsbGJhY2soaW1hZ2VCYXNlNjQpO1xyXG5cclxuICAgICAgIH0pO1xyXG5cclxuICAgICB9XHJcblxyXG4gICB9O1xyXG5cclxuICAgLyoqXHJcbiAgICAqIFNldHMgb3IgZ2V0cyB0aGUgdGh1bWJuYWlsLlxyXG4gICAgKlxyXG4gICAgKiBAbWV0aG9kIHRodW1ibmFpbFxyXG4gICAgKiBAa2luZCBtZW1iZXJcclxuICAgICogQHBhcmFtIHtzdHJpbmd9IGNhcHR1cmVBcmVhIC0gcXVlcnkgc2VsZWN0b3Igd2hpY2ggaGFzIHRvIHJlbmRlcmVkIGFzIHRodW1ibmFpbC5cclxuICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBnZXRzIHRyaWdnZXJlZCB3aGVuIHNuYXBzaG90IGZpbmlzaGVzIHJlbmRlcmluZyB0aHVtYm5haWwuXHJcbiAgICAqL1xyXG4gICAgIFNuYXBzaG90LnByb3RvdHlwZS50aHVtYm5haWwgPSBmdW5jdGlvbih0aHVtYm5haWwpe1xyXG4gICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgdHlwZW9mIHRodW1ibmFpbCAgPT09ICdzdHJpbmcnKXtcclxuICAgICAgICAgdGhpcy5fdGh1bWJuYWlsID0gdGh1bWJuYWlsO1xyXG4gICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgIHJldHVybiB0aGlzLl90aHVtYm5haWw7XHJcbiAgICAgICB9XHJcbiAgICAgfTtcclxuXHJcbiAgIC8qKlxyXG4gICAgKiBHZXRzIHRoZSB0aHVtYm5haWwuXHJcbiAgICAqXHJcbiAgICAqIEBtZXRob2QgY2FwdHVyZWRBdFxyXG4gICAgKiBAa2luZCBtZW1iZXJcclxuICAgICovXHJcbiAgICAgU25hcHNob3QucHJvdG90eXBlLmNhcHR1cmVkQXQgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgcmV0dXJuIHRoaXMuX2NhcHR1cmVkQXQ7XHJcbiAgICAgfTtcclxuXHJcbiAgICAgLyoqXHJcbiAgICAgICogR2V0cyB0aGUgZGF0YS5cclxuICAgICAgKlxyXG4gICAgICAqIEBtZXRob2QgZGF0YVxyXG4gICAgICAqIEBraW5kIG1lbWJlclxyXG4gICAgICAqL1xyXG4gICAgICAgU25hcHNob3QucHJvdG90eXBlLmNoZWNrcG9pbnREYXRhID0gZnVuY3Rpb24oZGF0YSl7XHJcbiAgICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGRhdGEpe1xyXG4gICAgICAgICAgIHRoaXMuX2NoZWNrcG9pbnREYXRhID0gZGF0YTtcclxuICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICByZXR1cm4gdGhpcy5fY2hlY2twb2ludERhdGE7XHJcbiAgICAgICAgIH1cclxuICAgICAgIH07XHJcblxyXG4gICAvKipcclxuICAgICogR2V0cyB0aGUgZGF0YS5cclxuICAgICpcclxuICAgICogQG1ldGhvZCBpc0NoZWNrcG9pbnRcclxuICAgICogQGtpbmQgbWVtYmVyXHJcbiAgICAqIEByZXR1cm4ge2Jvb2xlYW59IC0gd2hldGhlciBzbmFwc2hvdCBpcyBjaGVja3BvaW50XHJcbiAgICAqL1xyXG4gICAgIFNuYXBzaG90LnByb3RvdHlwZS5pc0NoZWNrcG9pbnQgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgcmV0dXJuIHRoaXMuX2NoZWNrcG9pbnREYXRhICE9PSBudWxsO1xyXG4gICAgIH07XHJcblxyXG4gICAvKipcclxuICAgICogR2V0cyB0aGUgbGV2ZWxvZiBzbmFwc2hvdCBpbiBzdWItdHJhaWwuXHJcbiAgICAqXHJcbiAgICAqIEBtZXRob2QgbGV2ZWxJblN1YlRyYWlsXHJcbiAgICAqIEBraW5kIG1lbWJlclxyXG4gICAgKiBAcmV0dXJuIG51bWJlciAtIGxldmVsIG9mIHNuYXBzaG90XHJcbiAgICAqL1xyXG4gICAgIFNuYXBzaG90LnByb3RvdHlwZS5sZXZlbEluU3ViVHJhaWwgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgcmV0dXJuIHRoaXMuX2xldmVsSW5TdWJUcmFpbDtcclxuICAgICB9O1xyXG5cclxuICAgLyoqXHJcbiAgICAqIEdldHMgdGhlIGxldmVsb2Ygc25hcHNob3QgaW4gbWFzdGVyLXRyYWlsLlxyXG4gICAgKlxyXG4gICAgKiBAbWV0aG9kIGxldmVsSW5NYXN0ZXJUcmFpbFxyXG4gICAgKiBAa2luZCBtZW1iZXJcclxuICAgICogQHJldHVybiBudW1iZXIgLSBsZXZlbCBvZiBzbmFwc2hvdFxyXG4gICAgKi9cclxuICAgICBTbmFwc2hvdC5wcm90b3R5cGUubGV2ZWxJbk1hc3RlclRyYWlsID0gZnVuY3Rpb24oKXtcclxuICAgICAgIHJldHVybiB0aGlzLl9sZXZlbEluTWFzdGVyVHJhaWw7XHJcbiAgICAgfTtcclxuXHJcbiAgIC8qKlxyXG4gICAgKiBHZXRzIHRoZSBsZXZlbG9mIHNuYXBzaG90IGluIG1hc3Rlci10cmFpbC5cclxuICAgICpcclxuICAgICogQG1ldGhvZCBsZXZlbFxyXG4gICAgKiBAa2luZCBtZW1iZXJcclxuICAgICogQHJldHVybiBudW1iZXIgLSBsZXZlbCBvZiBzbmFwc2hvdFxyXG4gICAgKi9cclxuICAgICBTbmFwc2hvdC5wcm90b3R5cGUubGV2ZWwgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgcmV0dXJuIHRoaXMuX2xldmVsSW5NYXN0ZXJUcmFpbDtcclxuICAgICB9O1xyXG5cclxuICAgLyoqXHJcbiAgICAqIEdldHMgdGhlIGlkIG9mIHNuYXBzaG90XHJcbiAgICAqXHJcbiAgICAqIEBtZXRob2QgaWRcclxuICAgICogQGtpbmQgbWVtYmVyXHJcbiAgICAqIEByZXR1cm4gc3RyaW5nIC0gaWQgb2Ygc25hcHNob3RcclxuICAgICovXHJcbiAgICAgU25hcHNob3QucHJvdG90eXBlLmlkID0gZnVuY3Rpb24oKXtcclxuICAgICAgIHJldHVybiB0aGlzLl9pZDtcclxuICAgICB9O1xyXG5cclxuICAgICBTbmFwc2hvdC5wcm90b3R5cGUucHJldlN0YXRlRnJvbVN1YlRyYWlsID0gZnVuY3Rpb24oKXtcclxuICAgICAgIHJldHVybiB0aGlzLl9wcmV2U3RhdGVGcm9tU3ViVHJhaWw7XHJcbiAgICAgfTtcclxuXHJcbiAgICAgU25hcHNob3QucHJvdG90eXBlLnByZXZTdGF0ZUZyb21NYXN0ZXJUcmFpbCA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICByZXR1cm4gdGhpcy5fcHJldlN0YXRlRnJvbU1hc3RlclRyYWlsO1xyXG4gICAgIH07XHJcblxyXG4gLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuIC8vIEV4cG9ydFxyXG4gLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiByZXR1cm4gU25hcHNob3Q7XHJcblxyXG5cclxuXHJcbiB9KCkpO1xyXG4iLCJcclxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcclxudmFyIFNuYXBzaG90ID0gcmVxdWlyZSgnLi9zbmFwc2hvdCcpO1xyXG52YXIgZGF0YVRyZWUgPSByZXF1aXJlKCdkYXRhLXRyZWUnKTtcclxudmFyIENoYW5nZXMgPSByZXF1aXJlKCcuL2NoYW5nZXMnKTtcclxudmFyIGNsb25lID0gcmVxdWlyZSgnY2xvbmUnKTtcclxudmFyIEFjdGlvbiA9IHJlcXVpcmUoJy4vYWN0aW9uJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuICAvLyBGbGFnIGJhZCBwcmFjdGlzZXNcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gU3ViIFRyYWlsXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVwcmVzZW50cyB0aGUgc3ViLXRyYWlsIHRoYXQgdHJhY2tzIG9mIHRoZSBzdGF0ZXMgb2YgdmlzdWFsaXphdGlvbi5cclxuICAgKlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBraW5kIGNsYXNzXHJcbiAgICogQGNvbnN0cnVjdG9yXHJcbiAgICogQHBhcmFtIG1hc3RlclRyYWlsIC0ge0BsaW5rIFRyYWlsfSB0byB3aGljaCB0aGlzIHN1Yi10cmFpbCBpcyBhc3NvY2lhdGVkLlxyXG4gICAqL1xyXG4gIHZhciBTdWJUcmFpbCA9IGZ1bmN0aW9uKG1hc3RlclRyYWlsLCB1aWQpe1xyXG5cclxuICAgIGlmKCF1aWQpe1xyXG4gICAgICB0aHJvdyBFcnJvcignU3ViIFRyYWlsIG11c3QgaGF2ZSBpZGVudGlmaWVyIGluIHBhcmFtZXRlcicpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX2lkZW50aWZpZXIgPSB1aWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdXRvLWdlbmVyYXRlZCBhbHBoYW51bWVyaWMgaWQgdGhhdCB1bmlxZWx5IGlkZW50aWZpZXMgdGhlIHRyYWlsLlxyXG4gICAgICpcclxuICAgICAqIEBwcm9wZXJ0eSBfaWRcclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2lkID0gaGVscGVycy5ndWlkKCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaW1lc3RhbXAgYXQgd2hpY2ggc3ViIHRyYWlsIHdhcyBpbml0aWF0ZWRcclxuICAgICAqXHJcbiAgICAgKiBAcHJvcGVydHkgX2luaXRpYXRlZEF0XHJcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICovXHJcbiAgICB0aGlzLl9pbml0aWF0ZWRBdCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXR0cmlidXRlcyB0aGF0IGRlZmluZXMgdGhlIHN0YXRlIG9mIHRyYWlsLlxyXG4gICAgICpcclxuICAgICAqIEBwcm9wZXJ0eSBfYXR0cnNcclxuICAgICAqIEB0eXBlIHtvYmplY3R9XHJcbiAgICAgKiBAZGVmYXVsdCBcIm51bGxcIlxyXG4gICAgICovXHJcbiAgICB0aGlzLl9hdHRycyA9IHt9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICoge0BsaW5rIFRyYWlsfSB0byB3aGljaCB0aGlzIHN1Yi10cmFpbCBpcyBhc3NvY2lhdGVkLlxyXG4gICAgICpcclxuICAgICAqIEBwcm9wZXJ0eSBfbWFzdGVyVHJhaWxcclxuICAgICAqIEB0eXBlIHtvYmplY3R9XHJcbiAgICAgKiBAZGVmYXVsdCBcIm51bGxcIlxyXG4gICAgICovXHJcbiAgICB0aGlzLl9tYXN0ZXJUcmFpbCA9IG1hc3RlclRyYWlsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVHJlZSBvZiB0aGUgY2hhbmdlcyBjYXB0dXJlZFxyXG4gICAgICpcclxuICAgICAqIEBwcm9wZXJ0eSBfdmVyc2lvblRyZWVcclxuICAgICAqIEB0eXBlIHtvYmplY3R9XHJcbiAgICAgKiBAZGVmYXVsdCBcIm51bGxcIlxyXG4gICAgICovXHJcbiAgICB0aGlzLl92ZXJzaW9uVHJlZSA9IGRhdGFUcmVlLmNyZWF0ZSgpO1xyXG5cclxuICAgIC8vIER1bW15IENoYW5nZVxyXG4gICAgdmFyIGR1bW15Q2hhbmdlID0gbmV3IENoYW5nZXModGhpcywgbnVsbCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXByZXNlbnRzIHRoZSBjdXJyZW50IHZlcnNpb24gaW4gYSBzdWItdHJhaWxcclxuICAgICAqXHJcbiAgICAgKiBAcHJvcGVydHkgX2N1cnJlbnRWZXJzaW9uTm9kZVxyXG4gICAgICogQHR5cGUge29iamVjdH1cclxuICAgICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2N1cnJlbnRWZXJzaW9uTm9kZSA9IHRoaXMudmVyc2lvblRyZWUoKS5pbnNlcnQoe1xyXG4gICAgICBrZXk6IG51bGwsXHJcbiAgICAgIGNoYW5nZXM6IGR1bW15Q2hhbmdlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEV2ZW50cyB0aGF0IHRyYWlsIGNhbiBmaXJlXHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF9ldmVudHNcclxuICAgICAqIEB0eXBlIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2V2ZW50cyA9IHtcclxuICAgICAgJ29uQ2hhbmdlc1JlY29yZGVkJzogW10sXHJcbiAgICAgICdvblRodW1ibmFpbENhcHR1cmVkJzogW10sXHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRm9yd2FyZCBhY3Rpb24gY2FsbGJhY2tcclxuICAgICAqXHJcbiAgICAgKiBAcHJvcGVydHkgX2ZvcndhcmRBY3Rpb25DYWxsYmFja1xyXG4gICAgICogQHR5cGUge2Z1bmN0aW9ufVxyXG4gICAgICogQGRlZmF1bHQgbnVsbFxyXG4gICAgICovXHJcbiAgICAgdGhpcy5fZm9yd2FyZEFjdGlvbiA9IG51bGw7XHJcblxyXG4gICAgIC8qKlxyXG4gICAgICAqIEludmVyc2UgYWN0aW9uIGNhbGxiYWNrXHJcbiAgICAgICpcclxuICAgICAgKiBAcHJvcGVydHkgX2ludmVyc2VBY3Rpb25DYWxsYmFja1xyXG4gICAgICAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICAgICAgKiBAZGVmYXVsdCBudWxsXHJcbiAgICAgICovXHJcbiAgICAgIHRoaXMuX2ludmVyc2VBY3Rpb24gPSBudWxsO1xyXG5cclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBHZXR0ZXJzIGFuZCBTZXR0ZXJzXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgR1VJRCBvZiBjdXJyZW50IHN1YlRyYWlsLlxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBpZFxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEByZXR1cm4ge3N0cmluZ30gLSBBdXRvLWdlbmVyYXRlZCBhbHBoYW51bWVyaWMgaWQgdGhhdCB1bmlxZWx5IGlkZW50aWZpZXMgdGhlIHRyYWlsLlxyXG4gICAqL1xyXG4gIFN1YlRyYWlsLnByb3RvdHlwZS5pZCA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5faWQ7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyBvciBzZXRzIGF0dHJpYnV0ZSB0byB7QGxpbmsgVHJpYWx9IGluc3RhbmNlLlxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBhdHRyXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIHVzaW5nIHdoaWNoIHZhbHVlIGlzIHRvIGJlIHNldCBvciBnZXQuXHJcbiAgICogQHBhcmFtIHtvYmplY3R9IHZhbHVlIC0gY291bGQgYmUgYW55dGhpbmcgdGhhdCBuZWVkcyB0byBzdG9yZS5cclxuICAgKi9cclxuICBTdWJUcmFpbC5wcm90b3R5cGUuYXR0ciA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcclxuICAgIGlmICgha2V5IHx8IHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgdGhpcy5fYXR0cnNba2V5XSA9IHZhbHVlO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICB9IGVsc2UgaWYodGhpcy5fYXR0cnMuaGFzT3duUHJvcGVydHkoa2V5KSl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzW2tleV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBHZXRzIG9yIHNldHMgdGhlIG1hc3RlciB0cmFpbC5cclxuICAgKlxyXG4gICAqIEBtZXRob2QgbWFzdGVyVHJhaWxcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcGFyYW0ge29iamVjdH0gdHJhaWwgLSBtYXN0ZXIgdHJhaWwgdG8gd2hpY2ggdGhpcyBzdWItdHJhaWwgaXMgYXNzb2NpYXRlZFxyXG4gICAqL1xyXG4gIFN1YlRyYWlsLnByb3RvdHlwZS5tYXN0ZXJUcmFpbCA9IGZ1bmN0aW9uKHRyYWlsKSB7XHJcbiAgICBpZih0cmFpbCAmJiB0eXBlb2YgdHJhaWwgPT09ICdvYmplY3QnKXtcclxuICAgICAgdGhpcy5fbWFzdGVyVHJhaWwgPSB0cmFpbDtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gdGhpcy5fbWFzdGVyVHJhaWw7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgdmVyc2lvbiB0cmVlXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIHZlcnNpb25UcmVlXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHJldHVybiB7b2JqZWN0fSB0cmVlIC0gdmVyc2lvbiB0cmVlXHJcbiAgICovXHJcbiAgU3ViVHJhaWwucHJvdG90eXBlLnZlcnNpb25UcmVlID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmVyc2lvblRyZWU7XHJcbiAgfTtcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBNZXRob2RzXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBldmVudCBoYW5kbGVyXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIGFkZEV2ZW50SGFuZGxlclxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudE5hbWUgLSBuYW1lIG9mIHRoZSBldmVudFxyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhbmRsZXIgLSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhcyB0byBiZSBmaXJlZCB1cG9uIGV2ZW50XHJcbiAgICovXHJcbiAgU3ViVHJhaWwucHJvdG90eXBlLmFkZEV2ZW50SGFuZGxlciA9IGZ1bmN0aW9uKGV2ZW50TmFtZSwgaGFuZGxlcikge1xyXG5cclxuICAgIC8vIENoZWNrIGlmIHZhbGlkIGV2ZW50IG5hbWUgaXMgcGFzc2VkXHJcbiAgICBpZih0aGlzLl9ldmVudHMuaGFzT3duUHJvcGVydHkoZXZlbnROYW1lKSl7XHJcbiAgICAgIHRoaXMuX2V2ZW50c1tldmVudE5hbWVdLnB1c2goaGFuZGxlcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWxsb3cgbWV0aG9kIGNoYWluaW5nXHJcbiAgICByZXR1cm4gdGhpcztcclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ2FwdHVyZXMgYSBzbmFwc2hvdFxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBhdHRyc1xyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7b2JqZWN0IHwgYXJyYXkgfCBzdHJpbmcgfCBudW1iZXIgfCBudWxsfSBkYXRhIC0gRGF0YSB0aGF0IGhhcyB0byBiZSBjYXB0dXJlZCBpbiBzbmFwc2hvdC5cclxuICAgKiBAcGFyYW0ge3N0cmluZ30gY2FwdHVyZUFyZWEgLSBET00gc2VsZWN0b3Igd2hpY2ggaGFzIHRvIGJlIHJlbmRlcmVkIGFzIHRodW1ibmFpbC5cclxuICAgKiBAcGFyYW0ge251bW5lcn0gZGVsYXkgLSBkZWxheSBhZnRlciB3aGljaCB0aHVtYm5haWwgaGFzIHRvIGJlIHJhbmRlcmVkLiBTb21lIHZpc3VhbGl6YXRpb24gbWF5IHRha2Ugc29tZSB0aW1lIHRvIHVwZGF0ZSBhZnRlciBpbnRlcmFjdGlvbi5cclxuICAgKi9cclxuICBTdWJUcmFpbC5wcm90b3R5cGUuY2FwdHVyZSA9IGZ1bmN0aW9uKGRhdGEsIGNhcHR1cmVBcmVhLCBkZWxheSl7XHJcblxyXG4gICAgLy8gUmV0dXJuIGlmIG1hc3RlciB0cmFpbCBpcyB3YWl0aW5nXHJcbiAgICBpZih0aGlzLm1hc3RlclRyYWlsKCkuaXNJZGxlKCkpIHJldHVybjtcclxuXHJcbiAgICAvLyBDcmVhdGUgU25hcHNob3RcclxuICAgIHZhciBzbmFwc2hvdCA9IG5ldyBTbmFwc2hvdChkYXRhKS50cmFpbElkKHRoaXMuaWQoKSk7XHJcblxyXG4gICAgLy8gSG9sZCBgdGhpc2BcclxuICAgIHZhciB0aGlzcyA9IHRoaXM7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgY2FwdHVyZSBhcmVhIGFuZCBkZWxheSBhcmUgcHJvdmlkZWRcclxuICAgIC8vIENhcHR1cmUgc25hcHNob3QsIGFkZCBpdCB0byBsb2NhbCB0cmVlIGFuZCBzZW5kIGl0IHRvIGhhbmRsZXJzXHJcbiAgICBpZihjYXB0dXJlQXJlYSAmJiB0eXBlb2YgY2FwdHVyZUFyZWEgPT09ICdzdHJpbmcnKXtcclxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgIHNuYXBzaG90LmNhcHR1cmVUaHVtYm5haWwoY2FwdHVyZUFyZWEsIGZ1bmN0aW9uKGltYWdlQmFzZTY0KXtcclxuICAgICAgICAgIGFkZFNuYXBzaG90VG9UcmVlKHRoaXNzLCBzbmFwc2hvdCk7XHJcbiAgICAgICAgICB0aGlzcy5fZXZlbnRzLm9uU25hcHNob3RDYXB0dXJlZC5mb3JFYWNoKGZ1bmN0aW9uKGhhbmRsZXIpe1xyXG4gICAgICAgICAgICBoYW5kbGVyKHNuYXBzaG90KTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9LCBkZWxheSAmJiB0eXBlb2YgZGVsYXkgPT09ICdudW1iZXInID8gZGVsYXkgOiAwKTtcclxuICAgIH1cclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ2FwdHVyZXMgYSBzbmFwc2hvdCB3aXRoIGdpdmVuIHRodW1ibmFpbFxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBhdHRyc1xyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7b2JqZWN0IHwgYXJyYXkgfCBzdHJpbmcgfCBudW1iZXIgfCBudWxsfSBkYXRhIC0gRGF0YSB0aGF0IGhhcyB0byBiZSBjYXB0dXJlZCBpbiBzbmFwc2hvdC5cclxuICAgKiBAcGFyYW0ge3N0cmluZ30gaW1hZ2VCYXNlNjRVUkwgLSBCYXNlNjQgcmVwcmVzZW50YXRpb24gb2YgaW1hZ2UgdGhhdCBoYXMgdG8gYmUgY2FwdHVyZWQgYXMgdGh1bWJuYWlsLlxyXG4gICAqIEBwYXJhbSB7bnVtbmVyfSBkZWxheSAtIGRlbGF5IGFmdGVyIHdoaWNoIHRodW1ibmFpbCBoYXMgdG8gYmUgcmFuZGVyZWQuIFNvbWUgdmlzdWFsaXphdGlvbiBtYXkgdGFrZSBzb21lIHRpbWUgdG8gdXBkYXRlIGFmdGVyIGludGVyYWN0aW9uLlxyXG4gICAqL1xyXG4gIFN1YlRyYWlsLnByb3RvdHlwZS5jYXB0dXJlV2l0aEltYWdlID0gZnVuY3Rpb24oZGF0YSwgaW1hZ2VCYXNlNjRVUkwsIGRlbGF5KXtcclxuXHJcbiAgICAvLyBSZXR1cm4gaWYgbWFzdGVyIHRyYWlsIGlzIHdhaXRpbmdcclxuICAgIGlmKHRoaXMubWFzdGVyVHJhaWwoKS5pc0lkbGUoKSkgcmV0dXJuO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTbmFwc2hvdFxyXG4gICAgdmFyIHNuYXBzaG90ID0gbmV3IFNuYXBzaG90KGRhdGEpLnRyYWlsSWQodGhpcy5faWQpLnRodW1ibmFpbChpbWFnZUJhc2U2NFVSTCk7XHJcblxyXG4gICAgLy8gQWRkIFNuYXBzaG90IHRvIGEgdHJlZVxyXG4gICAgYWRkU25hcHNob3RUb1RyZWUodGhpcywgc25hcHNob3QpO1xyXG5cclxuICAgIC8vIFRyaWdnZXIgYG9uU25hcHNob3RDYXB0dXJlZGAgZXZlbnRcclxuICAgIHRoaXMuX2V2ZW50cy5vblNuYXBzaG90Q2FwdHVyZWQuZm9yRWFjaChmdW5jdGlvbihoYW5kbGVyKXtcclxuICAgICAgaGFuZGxlcihzbmFwc2hvdCk7XHJcbiAgICB9KTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkcyB0aGUgY2hhbmdlc1xyXG4gICAqXHJcbiAgICogQG1ldGhvZCByZWNvcmRDaGFuZ2VzXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHBhcmFtIHtvYmplY3QgfCBhcnJheSB8IHN0cmluZyB8IG51bWJlciB8IG51bGx9IGRhdGEgLSBEYXRhIHRoYXQgaGFzIHRvIGJlIHJlY29yZGVkIGluIGNoYW5nZS5cclxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBhY3Rpb25DYWxsYmFjayAtIENhbGxiYWNrIHRoYXQgZ2V0cyB0cmlnZ2VyZWQgYWZ0ZXIgY2hhbmdlcyBhcmUgY3JlYXRlZCBhbmQgcHJvdmlkZXMgaW52ZXJzZSBhbmQgZm9yd2FyZCBhY3Rpb25zLlxyXG4gICAqL1xyXG4gIFN1YlRyYWlsLnByb3RvdHlwZS5yZWNvcmRDaGFuZ2VzID0gZnVuY3Rpb24oZGF0YSwgYWN0aW9uQ2FsbGJhY2spe1xyXG5cclxuICAgIC8vIFJldHVybiBpZiBtYXN0ZXIgdHJhaWwgaXMgd2FpdGluZy4gQ2hhbmdlcyBhcmUgcmV0dXJuZWQgd2l0aG91dCBiZWluZyB0cmFja2VkLlxyXG4gICAgaWYodGhpcy5tYXN0ZXJUcmFpbCgpLmlzSWRsZSgpKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAvLyBDYXB0dXJlIENoYW5nZVxyXG4gICAgdmFyIGNoYW5nZXMgPSBuZXcgQ2hhbmdlcyh0aGlzLCBkYXRhKTtcclxuXHJcbiAgICAvLyBTZXRzIEFjdGlvbnNcclxuICAgIGNoYW5nZXMuX2ZvcndhcmRBY3Rpb24gPSB0aGlzLl9mb3J3YXJkQWN0aW9uO1xyXG4gICAgY2hhbmdlcy5faW52ZXJzZUFjdGlvbiA9IHRoaXMuX2ludmVyc2VBY3Rpb247XHJcblxyXG4gICAgLy8gRmlyZSBhY3Rpb25DYWxsYmFja1xyXG4gICAgaWYoYWN0aW9uQ2FsbGJhY2sgJiYgdHlwZW9mIGFjdGlvbkNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSBhY3Rpb25DYWxsYmFjayhjaGFuZ2VzKTtcclxuXHJcbiAgICAvLyBBZGQgQ2hhbmdlcyB0byBWZXJzaW9uIHRyZWVcclxuICAgIGFkZENoYW5nZXNUb1ZlcnNpb25UcmVlKHRoaXMsIGNoYW5nZXMpO1xyXG5cclxuICAgIC8vIFRyaWdnZXIgb24gQ2hhbmdlcyBSZWNvcmRlZCBjYWxsYmFja1xyXG4gICAgdGhpcy5fZXZlbnRzLm9uQ2hhbmdlc1JlY29yZGVkLmZvckVhY2goZnVuY3Rpb24oaGFuZGxlcil7XHJcbiAgICAgIGhhbmRsZXIoY2hhbmdlcyk7XHJcbiAgICB9KTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkcyB0aGUgY2hhbmdlc1xyXG4gICAqXHJcbiAgICogQG1ldGhvZCByZWNvcmRDaGFuZ2VzXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHBhcmFtIHtvYmplY3QgfCBhcnJheSB8IHN0cmluZyB8IG51bWJlciB8IG51bGx9IGRhdGEgLSBEYXRhIHRoYXQgaGFzIHRvIGJlIHJlY29yZGVkIGluIGNoYW5nZXMuXHJcbiAgICogQHBhcmFtIHtzdHJpbmd9IGltYWdlQmFzZTY0VVJMIC0gQmFzZTY0IHJlcHJlc2VudGF0aW9uIG9mIGltYWdlIHRoYXQgaGFzIHRvIGJlIGNhcHR1cmVkIGFzIHRodW1ibmFpbC5cclxuICAgKi9cclxuICBTdWJUcmFpbC5wcm90b3R5cGUucmVjb3JkQ2hhbmdlc1dpdGhJbWFnZSA9IGZ1bmN0aW9uKGRhdGEsIGltYWdlQmFzZTY0LCBhY3Rpb25DYWxsYmFjayl7XHJcblxyXG4gICAgLy8gQ2FwdHVyZSBDaGFuZ2VcclxuICAgIHZhciBjaGFuZ2VzID0gbmV3IENoYW5nZXModGhpcywgZGF0YSk7XHJcblxyXG4gICAgLy8gUmV0dXJuIGlmIG1hc3RlciB0cmFpbCBpcyB3YWl0aW5nLiBDaGFuZ2VzIGFyZSByZXR1cm5lZCB3aXRob3V0IGJlaW5nIHRyYWNrZWQuXHJcbiAgICBpZih0aGlzLm1hc3RlclRyYWlsKCkuaXNJZGxlKCkpIHJldHVybiBjaGFuZ2VzO1xyXG5cclxuICAgIC8vIFNldHMgQWN0aW9uc1xyXG4gICAgY2hhbmdlcy5fZm9yd2FyZEFjdGlvbiA9IHRoaXMuX2ZvcndhcmRBY3Rpb247XHJcbiAgICBjaGFuZ2VzLl9pbnZlcnNlQWN0aW9uID0gdGhpcy5faW52ZXJzZUFjdGlvbjtcclxuXHJcbiAgICAvLyBGaXJlIGFjdGlvbkNhbGxiYWNrXHJcbiAgICBpZihhY3Rpb25DYWxsYmFjayAmJiB0eXBlb2YgYWN0aW9uQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIGFjdGlvbkNhbGxiYWNrKGNoYW5nZXMpO1xyXG5cclxuICAgIC8vIEFkZCBUaHVtYm5haWxcclxuICAgIGNoYW5nZXMudGh1bWJuYWlsKGltYWdlQmFzZTY0KTtcclxuXHJcbiAgICAvLyBBZGQgQ2hhbmdlcyB0byB2ZXJzaW9uIHRyZWVcclxuICAgIGFkZENoYW5nZXNUb1ZlcnNpb25UcmVlKHRoaXMsIGNoYW5nZXMpO1xyXG5cclxuICAgIC8vIFRyaWdnZXIgb24gQ2hhbmdlcyBSZWNvcmRlZCBjYWxsYmFja1xyXG4gICAgdGhpcy5fZXZlbnRzLm9uQ2hhbmdlc1JlY29yZGVkLmZvckVhY2goZnVuY3Rpb24oaGFuZGxlcil7XHJcbiAgICAgIGhhbmRsZXIoY2hhbmdlcyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUcmlnZ2VyIGBvblRodW1ibmFpbENhcHR1cmVkYFxyXG4gICAgdGhpcy5fZXZlbnRzLm9uVGh1bWJuYWlsQ2FwdHVyZWQuZm9yRWFjaChmdW5jdGlvbihoYW5kbGVyKXtcclxuICAgICAgaGFuZGxlcihjaGFuZ2VzKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBjaGFuZ2VzO1xyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBTZXRzIHRoZSBmb3J3YXJkIGFjdGlvblxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBzZXRGb3J3YXJkQWN0aW9uXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBjYWxsYmFjayB0aGF0IGltcGxlbWVudHMgZm9yd2FyZCBhY3Rpb25cclxuICAgKi9cclxuICBTdWJUcmFpbC5wcm90b3R5cGUuc2V0Rm9yd2FyZEFjdGlvbiA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuICAgIGlmKGNhbGxiYWNrICYmIHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgIHRoaXMuX2ZvcndhcmRBY3Rpb24gPSBuZXcgQWN0aW9uKGNhbGxiYWNrKTtcclxuICAgICAgcmV0dXJuIHRoaXMuX2ZvcndhcmRBY3Rpb247XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogU2V0cyB0aGUgaW52ZXJzZSBhY3Rpb25cclxuICAgKlxyXG4gICAqIEBtZXRob2Qgc2V0SW52ZXJzZUFjdGlvblxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gY2FsbGJhY2sgdGhhdCBpbXBsZW1lbnRzIGludmVyc2UgYWN0aW9uXHJcbiAgICovXHJcbiAgU3ViVHJhaWwucHJvdG90eXBlLnNldEludmVyc2VBY3Rpb24gPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcbiAgICBpZihjYWxsYmFjayAmJiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICB0aGlzLl9pbnZlcnNlQWN0aW9uID0gbmV3IEFjdGlvbihjYWxsYmFjayk7XHJcbiAgICAgIHJldHVybiB0aGlzLl9pbnZlcnNlQWN0aW9uO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gUHJpdmF0ZSBNZXRob2RzXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBhIHNuYXBzaG90IHRvIHRoZSB0cmVlIGluIGN1cnJlbnQgdHJhaWwuXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIGFkZFNuYXBzaG90VG9UcmVlXHJcbiAgICogQHBhcmFtIHtAbGluayBUcmFpbH0gLSB0cmFpbCB0byB3aGljaCBzbmFwc2hvdCBoYXMgdG8gYmUgYWRkZWQuXHJcbiAgICogQHBhcmFtIHtAbGluayBDaGFuZ2VzfSAtIENoYW5nZSB3aGljaCBhcmUgdG8gYmUgYWRkZWQgaW4gYSB0cmVlLlxyXG4gICAqL1xyXG4gIHZhciBhZGRDaGFuZ2VzVG9WZXJzaW9uVHJlZSA9IGZ1bmN0aW9uKHN1YnRyYWlsLCBjaGFuZ2VzKXtcclxuXHJcbiAgICAvLyBBZGQgUHJldmlvdXMgU3RhdGUgRnJvbSBTdWIgVHJhaWxcclxuICAgIC8vIHNuYXBzaG90Ll9wcmV2U3RhdGVGcm9tU3ViVHJhaWwgPSBzdWJ0cmFpbC5fY3VycmVudFNuYXBzaG90Tm9kZS5fZGF0YS5zbmFwc2hvdC5kYXRhKCk7XHJcblxyXG4gICAgLy8gQWRkIGdpdmVuIHNuYXBzaG90IHRvIHRyZWVcclxuICAgIHN1YnRyYWlsLl9jdXJyZW50VmVyc2lvbk5vZGUgPSBzdWJ0cmFpbC52ZXJzaW9uVHJlZSgpLmluc2VydFRvTm9kZShzdWJ0cmFpbC5fY3VycmVudFZlcnNpb25Ob2RlLCB7XHJcbiAgICAgIGtleTogY2hhbmdlcy5pZCgpLFxyXG4gICAgICBjaGFuZ2VzOiBjaGFuZ2VzXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBEZXB0aFxyXG4gICAgY2hhbmdlcy5fbGV2ZWxJblN1YlRyYWlsID0gc3VidHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZS5fZGVwdGg7XHJcblxyXG4gICAgLy8gTm9kZVxyXG4gICAgY2hhbmdlcy5fbm9kZUluU3ViVHJhaWwgPSBzdWJ0cmFpbC5fY3VycmVudFZlcnNpb25Ob2RlO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIEV4cG9ydFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHJldHVybiBTdWJUcmFpbDtcclxuXHJcbn0oKSk7XHJcbiIsImNvbnNvbGUubG9nKFwiTmFtZVwiLCBfX2Rpcm5hbWUpO1xyXG52YXIgaGVscGVycyA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xyXG52YXIgU3ViVHJhaWwgPSByZXF1aXJlKCcuL3N1YlRyYWlsJyk7XHJcbnZhciBjb250cm9scyA9IHJlcXVpcmUoJy4vY29udHJvbHMnKSh3aW5kb3cuZG9jdW1lbnQpO1xyXG52YXIgZGF0YVRyZWUgPSByZXF1aXJlKCdkYXRhLXRyZWUnKTtcclxudmFyIENoZWNrcG9pbnRNYW5hZ2VyID0gcmVxdWlyZSgnLi9jaGVja3BvaW50cycpLmNoZWNrcG9pbnRNYW5hZ2VyO1xyXG52YXIgVmVyc2lvbiA9IHJlcXVpcmUoJy4vc25hcHNob3QnKTtcclxudmFyIHJhc3Rlcml6ZUhUTUwgPSByZXF1aXJlKCdyYXN0ZXJpemVodG1sJyk7XHJcbnZhciBmaWxlU2F2ZXIgPSByZXF1aXJlKCdmaWxlc2F2ZXIuanMvRmlsZVNhdmVyLm1pbi5qcycpO1xyXG5cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuICAvLyBGbGFnIGJhZCBwcmFjdGlzZXNcclxuICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBUcmFpbFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIC8qKlxyXG4gICAqIFJlcHJlc2VudHMgdGhlIG1hc3Rlci10cmFpbCB0aGF0IG1hbmFnZXMgc3ViLXRyYWlscyB0byBjYXB0dXJlIHByb3ZlbmFuY2VcclxuICAgKlxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBraW5kIGNsYXNzXHJcbiAgICogQGNvbnN0cnVjdG9yXHJcbiAgICogQHBhcmFtIGRhdGEgLSB1c2luZyB3aGljaCB0cmFpbCBpcyB0byBiZSBjcmVhdGVkXHJcbiAgICovXHJcbiAgdmFyIFRyYWlsID0gZnVuY3Rpb24oZGF0YSl7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdXRvLWdlbmVyYXRlZCBhbHBoYW51bWVyaWMgaWQgdGhhdCB1bmlxZWx5IGlkZW50aWZpZXMgdGhlIHRyYWlsLlxyXG4gICAgICpcclxuICAgICAqIEBwcm9wZXJ0eSBfaWRcclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2lkID0gaGVscGVycy5ndWlkKCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaW1lc3RhbXAgYXQgd2hpY2ggdHJhaWwgd2FzIGluaXRpYXRlZFxyXG4gICAgICpcclxuICAgICAqIEBwcm9wZXJ0eSBfaW5pdGlhdGVkQXRcclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2luaXRpYXRlZEF0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdHRyaWJ1dGVzIHRoYXQgZGVmaW5lcyB0aGUgc3RhdGUgb2YgdHJhaWwuXHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF9hdHRyc1xyXG4gICAgICogQHR5cGUge29iamVjdH1cclxuICAgICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2F0dHJzID0ge307XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzdWItdHJhaWxzIGFzc29jaWF0ZWQgd2l0aCB0aGlzIG1hc3RlciB0cmFpbC5cclxuICAgICAqXHJcbiAgICAgKiBAcHJvcGVydHkgX3N1YlRyYWlsc1xyXG4gICAgICogQHR5cGUge2FycmF5fVxyXG4gICAgICogQGRlZmF1bHQgXCJbXVwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX3N1YlRyYWlscyA9IFtdO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29udHJvbCBib3ggdGhhdCByZW5kZXJzIGNvbnRyb2xzXHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF9jdXJyZW50VmVyc2lvblxyXG4gICAgICogQHR5cGUge29iamVjdH1cclxuICAgICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2NvbnRyb2xCb3ggPSBjb250cm9scy5jb250cm9sQm94LmNyZWF0ZSh0aGlzKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbnRyb2xzIHRoYXQgYXJlIHNlbGVjdGVkXHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF9jb250cm9sc1NlbGVjdGVkXHJcbiAgICAgKiBAdHlwZSB7YXJyYXl9XHJcbiAgICAgKiBAZGVmYXVsdCBcIltdXCJcclxuICAgICAqL1xyXG4gICAgdGhpcy5fY29udHJvbHNTZWxlY3RlZCA9IFtdO1xyXG5cclxuICAgIHRoaXMuX3JlbmRlclRvID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRyZWUgb2YgdGhlIHNuYXBzaG90XHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF92ZXJzaW9uVHJlZVxyXG4gICAgICogQHR5cGUge29iamVjdH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5fdmVyc2lvblRyZWUgPSBkYXRhVHJlZS5jcmVhdGUoKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlcHJlc2VudHMgdGhlIGN1cnJlbnQgc25hcHNob3QgaW4gYSBzdWItdHJhaWxcclxuICAgICAqXHJcbiAgICAgKiBAcHJvcGVydHkgX2N1cnJlbnRWZXJzaW9uTm9kZVxyXG4gICAgICogQHR5cGUge29iamVjdH1cclxuICAgICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICAgKi9cclxuICAgICB0aGlzLl9jdXJyZW50VmVyc2lvbk5vZGUgPSB0aGlzLnZlcnNpb25UcmVlKCkuaW5zZXJ0KHtcclxuICAgICAgIGtleTogbnVsbCxcclxuICAgICAgIGNoYW5nZXM6IG51bGxcclxuICAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFZlcnNpb25zIGZyb20gY3VycmVudCB0cmFpbHNcclxuICAgICAqXHJcbiAgICAgKiBAcHJvcGVydHkgX2N1cnJlbnRCcmFuY2hWZXJzaW9uc1xyXG4gICAgICogQHR5cGUge2FycmF5fVxyXG4gICAgICogQGRlZmF1bHQgXCJbXVwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2N1cnJlbnRCcmFuY2hWZXJzaW9ucyA9IFtdO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRXZlbnRzIHRoYXQgdHJhaWwgY2FuIGZpcmVcclxuICAgICAqXHJcbiAgICAgKiBAcHJvcGVydHkgX2V2ZW50c1xyXG4gICAgICogQHR5cGUge29iamVjdH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5fZXZlbnRzID0ge1xyXG4gICAgICAnb25DaGFuZ2VzUmVjb3JkZWQnOiBbXSxcclxuICAgICAgJ29uQ2hlY2twb2ludFJlcXVlc3RlZCc6W10sXHJcbiAgICAgICdvblRyYWlsTG9hZHMnOiBbXSxcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDaGVja3BvaW50IGNhbGxiYWNrIHRoYXQgZ2V0cyB0aGUgY2hlY2twb2ludCBkYXRhXHJcbiAgICAgKlxyXG4gICAgICogQHByb3BlcnR5IF9jaGVja3BvaW50Q2FsbGJhY2tcclxuICAgICAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICAgICAqIEBkZWZhdWx0IFwibnVsbFwiXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2NoZWNrcG9pbnRDYWxsYmFjayA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmVzIHdoZXRoZXIgdHJhaWwgaXMgaWRsZVxyXG4gICAgICpcclxuICAgICAqIEBwcm9wZXJ0eSBfaXNJZGxlXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqIEBkZWZhdWx0IFwiZmFsc2VcIlxyXG4gICAgICovXHJcbiAgICB0aGlzLl9pc0lkbGUgPSBmYWxzZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE1hbmFnZXMgY2hlY2twb2ludFxyXG4gICAgICpcclxuICAgICAqIEBwcm9wZXJ0eSBfY2hlY2twb2ludE1hbmFnZXJcclxuICAgICAqIEB0eXBlIHtvYmplY3R9XHJcbiAgICAgKiBAZGVmYXVsdCBcImZhbHNlXCJcclxuICAgICAqL1xyXG4gICAgdGhpcy5fY2hlY2twb2ludE1hbmFnZXIgPSBuZXcgQ2hlY2twb2ludE1hbmFnZXIoKTtcclxuXHJcbiAgICAvLyBHaXRodWIgQWNjZXNzIFRva2VuXHJcbiAgICB0aGlzLl9naXRodWJBY2Nlc3NUb2tlbiA9IG51bGw7XHJcblxyXG4gICAgLy8gRGVmYXVsdCBDaGVja3BvaW50aW5nIFJ1bGVcclxuICAgIHRoaXMuY2hlY2twb2ludE1hbmFnZXIoKS5hZGRSdWxlKGZ1bmN0aW9uKGNoYW5nZXMpe1xyXG4gICAgICByZXR1cm4gY2hhbmdlcy5fY291bnQgJiYgY2hhbmdlcy5fY291bnQgJSA1ID09PSAwO1xyXG4gICAgfSk7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gU2V0dGVycyBhbmQgR2V0dGVyc1xyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIEdVSUQgb2YgY3VycmVudCBzdWJUcmFpbC5cclxuICAgKlxyXG4gICAqIEBtZXRob2QgaWRcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcmV0dXJuIHtzdHJpbmd9IC0gQXV0by1nZW5lcmF0ZWQgYWxwaGFudW1lcmljIGlkIHRoYXQgdW5pcWVseSBpZGVudGlmaWVzIHRoZSB0cmFpbC5cclxuICAgKi9cclxuICBUcmFpbC5wcm90b3R5cGUuaWQgPSBmdW5jdGlvbigpe1xyXG4gICAgcmV0dXJuIHRoaXMuX2lkO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgb3Igc2V0cyB0aGUgYWNjZXNzIHRva2VuXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIGdpdGh1YkFjY2Vzc1Rva2VuXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHJldHVybiB7c3RyaW5nfSAtIGFjY2VzcyB0b2tlbi5cclxuICAgKi9cclxuICBUcmFpbC5wcm90b3R5cGUuZ2l0aHViQWNjZXNzVG9rZW4gPSBmdW5jdGlvbih0b2tlbil7XHJcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoID4gMCl7XHJcbiAgICAgIHRoaXMuX2dpdGh1YkFjY2Vzc1Rva2VuID0gdG9rZW47XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHRoaXMuX2dpdGh1YkFjY2Vzc1Rva2VuO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgb3Igc2V0cyBhdHRyaWJ1dGUgdG8ge0BsaW5rIFRyaWFsfSBpbnN0YW5jZS5cclxuICAgKlxyXG4gICAqIEBtZXRob2QgYXR0clxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSB1c2luZyB3aGljaCB2YWx1ZSBpcyB0byBiZSBzZXQgb3IgZ2V0LlxyXG4gICAqIEBwYXJhbSB7b2JqZWN0fSB2YWx1ZSAtIGNvdWxkIGJlIGFueXRoaW5nIHRoYXQgbmVlZHMgdG8gc3RvcmUuXHJcbiAgICovXHJcbiAgVHJhaWwucHJvdG90eXBlLmF0dHIgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XHJcbiAgICBpZiAoIWtleSB8fCB0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgIHRoaXMuX2F0dHJzW2tleV0gPSB2YWx1ZTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgfSBlbHNlIGlmKHRoaXMuX2F0dHJzLmhhc093blByb3BlcnR5KGtleSkpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9hdHRyc1trZXldO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgYXJyYXkgb2Ygc3ViLXRyYWlsc1xyXG4gICAqXHJcbiAgICogQG1ldGhvZCBzdWJUcmFpbHNcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcmV0dXJuIHthcnJheX0gLSBzdWIgdHJhaWxzIGFzc29jaWF0ZWQgd2l0aCB0aGlzIG1hc3RlciB0cmFpbC5cclxuICAgKi9cclxuICBUcmFpbC5wcm90b3R5cGUuc3ViVHJhaWxzID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fc3ViVHJhaWxzO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIHNuYXBzaG90IHRyZWVcclxuICAgKlxyXG4gICAqIEBtZXRob2QgdmVyc2lvblRyZWVcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcmV0dXJuIHtvYmplY3R9IHRyZWUgLSBzbmFwc2hvdCB0cmVlXHJcbiAgICovXHJcbiAgVHJhaWwucHJvdG90eXBlLnZlcnNpb25UcmVlID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmVyc2lvblRyZWU7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgYGlzSWRsZWAgZmxhZ1xyXG4gICAqXHJcbiAgICogQG1ldGhvZCBpc0lkbGVcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcmV0dXJuIHtib29sZWFufSAgLSB3aGV0aGVyIHRyYWlsIGlzIGlkbGVcclxuICAgKi9cclxuICBUcmFpbC5wcm90b3R5cGUuaXNJZGxlID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5faXNJZGxlO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIGBfY3VycmVudFZlcnNpb25Ob2RlYFxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBpc0lkbGVcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcmV0dXJuIHtvYmplY3R9ICAtIE5vZGUgb2JqZWN0IHRoYXQgd3JhcHMgc25hcHNob3Qgb2JqZWN0XHJcbiAgICovXHJcbiAgVHJhaWwucHJvdG90eXBlLmN1cnJlbnRWZXJzaW9uTm9kZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRWZXJzaW9uTm9kZTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBHZXRzIHRoZSBgX2NoZWNrcG9pbnRNYW5hZ2VyYFxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBjaGVja3BvaW50TWFuYWdlclxyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEByZXR1cm4ge29iamVjdH0gIC0gTm9kZSBvYmplY3QgdGhhdCB3cmFwcyBzbmFwc2hvdCBvYmplY3RcclxuICAgKi9cclxuICBUcmFpbC5wcm90b3R5cGUuY2hlY2twb2ludE1hbmFnZXIgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLl9jaGVja3BvaW50TWFuYWdlcjtcclxuICB9O1xyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIE1ldGhvZHNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAvKipcclxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJcclxuICAgKlxyXG4gICAqIEBtZXRob2QgYWRkRXZlbnRIYW5kbGVyXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZSAtIG5hbWUgb2YgdGhlIGV2ZW50XHJcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gaGFuZGxlciAtIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgaGFzIHRvIGJlIGZpcmVkIHVwb24gZXZlbnRcclxuICAgKi9cclxuICBUcmFpbC5wcm90b3R5cGUuYWRkRXZlbnRIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnROYW1lLCBoYW5kbGVyKSB7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgdmFsaWQgZXZlbnQgbmFtZSBpcyBwYXNzZWRcclxuICAgIGlmKHRoaXMuX2V2ZW50cy5oYXNPd25Qcm9wZXJ0eShldmVudE5hbWUpKXtcclxuICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50TmFtZV0ucHVzaChoYW5kbGVyKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBbGxvdyBtZXRob2QgY2hhaW5pbmdcclxuICAgIHJldHVybiB0aGlzO1xyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgc3ViIHRyYWlsXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIHN1YlRyYWlsXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHJldHVybiB7QGxpbmsgU3ViVHJhaWx9IC0gTmV3bHkgY3JlYXRlZCBzdWItdHJhaWwuXHJcbiAgICovXHJcbiAgVHJhaWwucHJvdG90eXBlLnN1YlRyYWlsID0gZnVuY3Rpb24odWlkKSB7XHJcblxyXG4gICAgLy8gSG9sZCBgdGhpc2BcclxuICAgIHZhciB0aGlzcyA9IHRoaXM7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFN1YiBUcmFpbFxyXG4gICAgdmFyIHN1YlRyYWlsID0gbmV3IFN1YlRyYWlsKHRoaXMsIHVpZCk7XHJcblxyXG4gICAgLy8gQWRkIEV2ZW50IEhhbmRsZXI6IGBvbkNoYW5nZXNSZWNvcmRlZGBcclxuICAgIHN1YlRyYWlsLmFkZEV2ZW50SGFuZGxlcignb25DaGFuZ2VzUmVjb3JkZWQnLCBmdW5jdGlvbihjaGFuZ2VzKXtcclxuXHJcbiAgICAgIC8vIEFkZCBDaGFuZ2VzIGluIFZlcnNpb24gVHJlZVxyXG4gICAgICBhZGRDaGFuZ2VzVG9WZXJzaW9uVHJlZSh0aGlzcywgY2hhbmdlcyk7XHJcblxyXG4gICAgICAvLyBHZXQgQ2hlY2twb2ludCBEYXRhXHJcbiAgICAgIGNoYW5nZXMuX2NoZWNrcG9pbnREYXRhID0gdGhpc3MuY2hlY2twb2ludE1hbmFnZXIoKS5nZXRDaGVja3BvaW50RGF0YSgpO1xyXG5cclxuICAgICAgLy8gVHJpZ2dlciBgb25DaGFuZ2VzUmVjb3JkZWRgXHJcbiAgICAgIHRoaXNzLl9ldmVudHMub25DaGFuZ2VzUmVjb3JkZWQuZm9yRWFjaChmdW5jdGlvbihjYil7XHJcbiAgICAgICAgdmFyIG1vZGlmaWVkQ2hhbmdlcyA9IGNiKGNoYW5nZXMpO1xyXG4gICAgICAgIGlmKG1vZGlmaWVkQ2hhbmdlcyAmJiBtb2RpZmllZENoYW5nZXMuaWQoKSA9PT0gY2hhbmdlcy5pZCgpKXtcclxuICAgICAgICAgIGNoYW5nZXMgPSBtb2RpZmllZENoYW5nZXM7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFJlY3VyIGZvciBjaGVja3BvaW50XHJcbiAgICAgIGlmKHRoaXNzLmNoZWNrcG9pbnRNYW5hZ2VyKCkpe1xyXG4gICAgICAgIChmdW5jdGlvbiByZWN1cihub2RlKXtcclxuICAgICAgICAgIGlmKG5vZGUgJiYgbm9kZS5fZGF0YS5jaGFuZ2VzICYmICFub2RlLl9kYXRhLmNoYW5nZXMuaXNDaGVja3BvaW50KCkpe1xyXG4gICAgICAgICAgICB0aGlzcy5jaGVja3BvaW50TWFuYWdlcigpLmFwcGx5UnVsZXNUbyhub2RlLl9kYXRhLmNoYW5nZXMpO1xyXG4gICAgICAgICAgICBpZihub2RlLl9wYXJlbnROb2RlKXtcclxuICAgICAgICAgICAgICByZWN1cihub2RlLl9wYXJlbnROb2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0odGhpc3MuX2N1cnJlbnRWZXJzaW9uTm9kZSkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEV2ZW50IEhhbmRsZXI6IGBvblRodW1ibmFpbENhcHR1cmVkYFxyXG4gICAgc3ViVHJhaWwuYWRkRXZlbnRIYW5kbGVyKCdvblRodW1ibmFpbENhcHR1cmVkJywgZnVuY3Rpb24oY2hhbmdlcyl7XHJcbiAgICAgIGFkZFRodW1ibmFpbFRvR2FsbGVyeSh0aGlzcywgY2hhbmdlcyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgaXQgdG8gdGhlIGxpc3RcclxuICAgIHRoaXMuX3N1YlRyYWlscy5wdXNoKHN1YlRyYWlsKTtcclxuXHJcbiAgICAvLyBSZXR1cm5cclxuICAgIHJldHVybiBzdWJUcmFpbDtcclxuXHJcbiAgfTtcclxuXHJcbiAgICBUcmFpbC5wcm90b3R5cGUucmVjcmVhdGVDb250cm9sQm94ID0gZnVuY3Rpb24oKXtcclxuICAgICAgaWYodGhpcy5fY29udHJvbEJveClcclxuICAgICAgZDMuc2VsZWN0KHRoaXMuX2NvbnRyb2xCb3gpLnJlbW92ZSgpO1xyXG4gICAgICB0aGlzLl9jb250cm9sQm94ID0gY29udHJvbHMuY29udHJvbEJveC5jcmVhdGUodGhpcyk7XHJcbiAgICB9O1xyXG5cclxuICAvKipcclxuICAgKiBMZXRzIHlvdSBhZGQgc2luZ2xlIGNvbnRyb2wgdG8gdGhlIHRyYWlsLiBDb250cm9sIGNvdWxkIGJlOlxyXG4gICAqIDEuIGBnaXN0Q29udHJvbGAgLSBMZXRzIHlvdSBleHBvcnQgdHJhaWwgdG8gZ2lzdC5cclxuICAgKiAyLiBgc2F2ZUNvbnRyb2xgIC0gTGV0cyB5b3Ugc2F2ZSB0cmFpbCBsb2NhbGx5LlxyXG4gICAqIDMuIGBsb2FkQ29udHJvbGAgLSBMZXRzIHlvdSBsb2FkIGJhY2sgdGhlIGV4cG9ydGVkIHRyYWlsLlxyXG4gICAqIDQuIGBzbmFwc2hvdENvbnRyb2xgIC0gTGV0cyB5b3UgbmF2aWdhdGUgYmV0d2VlbiBzbmFwc2hvdHMuXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIGFkZENvbnRyb2xcclxuICAgKiBAa2luZCBtZW1iZXJcclxuICAgKiBAcGFyYW0ge3N0cmluZ30gY3RybCAtIG9uZSBvZiB0aGUgY29udHJvbCBvcHRpb24gc3BlY2lmaWVkIGFib3ZlLlxyXG4gICAqIEByZXR1cm4ge1RyYWlsfSAtIHVzZWZ1bCBmb3IgbWV0aG9kIGNoYWluaW5nXHJcbiAgICovXHJcbiAgVHJhaWwucHJvdG90eXBlLmFkZENvbnRyb2wgPSBmdW5jdGlvbihjdHJsTmFtZSl7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgdmFsaWQgY29udHJvbCBuYW1lIGlzIHBhc3NlZCBhbmQgaXMgbm90IHJlbmRlcmVkIGFscmVhZHlcclxuICAgIGlmKGNvbnRyb2xzLmxpc3QuaGFzT3duUHJvcGVydHkoY3RybE5hbWUpICYmIHRoaXMuX2NvbnRyb2xzU2VsZWN0ZWQuaW5kZXhPZihjdHJsTmFtZSkgPT09IC0xKXtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBhbmQgYXBwZW5kIGNvbnRyb2wgdG8gY29udHJvbCBib3hcclxuICAgICAgY29udHJvbHMubGlzdFtjdHJsTmFtZV0uY3JlYXRlKHRoaXMpO1xyXG5cclxuICAgICAgLy8gTWFyayBjb250cm9sIGFzIHJlZ2lzdGVyZWRcclxuICAgICAgdGhpcy5fY29udHJvbHNTZWxlY3RlZC5wdXNoKGN0cmxOYW1lKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBzcGVjaWZpZWQgY29udHJvbHMgdG8gdGhlIHRyYWlsLiBDb250cm9scyBjb3VsZCBiZTpcclxuICAgKiAxLiBgZ2lzdENvbnRyb2xgIC0gTGV0cyB5b3UgZXhwb3J0IHRyYWlsIHRvIGdpc3QuXHJcbiAgICogMi4gYHNhdmVDb250cm9sYCAtIExldHMgeW91IHNhdmUgdHJhaWwgbG9jYWxseS5cclxuICAgKiAzLiBgbG9hZENvbnRyb2xgIC0gTGV0cyB5b3UgbG9hZCBiYWNrIHRoZSBleHBvcnRlZCB0cmFpbC5cclxuICAgKiA0LiBgc25hcHNob3RDb250cm9sYCAtIExldHMgeW91IG5hdmlnYXRlIGJldHdlZW4gc25hcHNob3RzLlxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBhZGRDb250cm9sc1xyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7YXJyYXl9IGN0cmxBcnJheSAtIGFycmF5IGNvbnRhaW5pbmcgY29udHJvbCBvcHRpb25zIHNwZWNpZmllZCBhYm92ZS5cclxuICAgKiBAcmV0dXJuIHtUcmFpbH0gLSB1c2VmdWwgZm9yIG1ldGhvZCBjaGFpbmluZ1xyXG4gICAqL1xyXG4gIFRyYWlsLnByb3RvdHlwZS5hZGRDb250cm9scyA9IGZ1bmN0aW9uKGN0cmxBcnJheSl7XHJcblxyXG4gICAgLy8gQ2hlY2sgYXJyYXkgaXMgdmFsaWRcclxuICAgIGN0cmxBcnJheSA9IGN0cmxBcnJheSAmJiBBcnJheS5pc0FycmF5KGN0cmxBcnJheSkgJiYgY3RybEFycmF5Lmxlbmd0aCA+IDAgPyBjdHJsQXJyYXkgOiBPYmplY3Qua2V5cyhjb250cm9scy5saXN0KTtcclxuXHJcbiAgICAvLyBIb2xkIGB0aGlzYFxyXG4gICAgdmFyIHRoaXNzID0gdGhpcztcclxuXHJcbiAgICAvLyBBZGQgY29udHJvbCBmb3IgZXZlcnkgZW50cnkgaW4gYXJyYXlcclxuICAgIGN0cmxBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGN0cmwpe1xyXG4gICAgICB0aGlzcy5hZGRDb250cm9sKGN0cmwpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogcmVuZGVyIGNvbnRyb2wgdG8gZ2l2ZW4gcXVlcnkgc2VsZWN0b3IuXHJcbiAgICpcclxuICAgKiBAbWV0aG9kIGF0dHJzXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHBhcmFtIHtzdHJpbmcgfCBvYmplY3R9IGNvbnRyb2wgLSBxdWVyeSBzZWxlY3RvciBvciBET00gb2JqZWN0IHRvIHdoaWNoIGNvbnRyb2xzIGFyZSB0byBiZSBhcHBlbmRlZC5cclxuICAgKi9cclxuICBUcmFpbC5wcm90b3R5cGUucmVuZGVyVG8gPSBmdW5jdGlvbihyZW5kZXJUbyl7XHJcblxyXG4gICAgLy8gQ2hlY2sgSWYgYHJlbmRlclRvYCBpcyBxdWVyeSBzZWxlY3RvciBvciBET00gb2JqZWN0IGl0c2xlZlxyXG4gICAgaWYodHlwZW9mIHJlbmRlclRvID09PSAnc3RyaW5nJyl7XHJcbiAgICAgIHRoaXMuX3JlbmRlclRvID0gcmVuZGVyVG87XHJcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IocmVuZGVyVG8pLmFwcGVuZENoaWxkKHRoaXMuX2NvbnRyb2xCb3gpO1xyXG4gICAgfSBlbHNlIGlmKHR5cGVvZiByZW5kZXJUbyA9PT0gJ29iamVjdCcgJiYgcmVuZGVyVG8uYXBwZW5kQ2hpbGQpe1xyXG4gICAgICByZW5kZXJUby5hcHBlbmRDaGlsZCh0aGlzLl9jb250cm9sQm94KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICoga2VlcHMgdHJhaWwgaWRsZSB1bnRpbCBldmVudCBpcyBjb21wbGV0ZVxyXG4gICAqXHJcbiAgICogQG1ldGhvZCB3YWl0Rm9yXHJcbiAgICogQGtpbmQgbWVtYmVyXHJcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBmdW5jdGlvbiB0aGF0IHJlcXVpcmVzIHRyYWlsIHRvIGJlIGlkbGUuXHJcbiAgICovXHJcbiAgVHJhaWwucHJvdG90eXBlLndhaXRGb3IgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcbiAgICB0aGlzLl9pc0lkbGUgPSB0cnVlO1xyXG4gICAgY2FsbGJhY2soKTtcclxuICAgIHRoaXMuX2lzSWRsZSA9IGZhbHNlO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlcXVlc3RzIHVzZXIgdG8gcHJvdmlkZSBhIGNoZWNrcG9pbnQgZGF0YVxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBjaGVja3BvaW50c1xyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXHJcbiAgICovXHJcbiAgVHJhaWwucHJvdG90eXBlLmNoZWNrcG9pbnRzID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIGNhbGxiYWNrIHR5cGVcclxuICAgIGlmKCFjYWxsYmFjayB8fCB0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpe1xyXG4gICAgICB0aHJvdyBFcnJvcignUGFyYW1ldGVyIHRvIGNoZWNrcG9pbnRzIHNob3VsZCBiZSBhIGZ1bmN0aW9uIHJldHVybmluZyBjaGVja3BvaW50IGRhdGEnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZXQgY2hlY2twb2ludCBjYWxsYmFjay5cclxuICAgIHRoaXMuX2NoZWNrcG9pbnRDYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDaGVja3BvaW50c1xyXG4gICAgdGhpcy5fY2hlY2twb2ludE1hbmFnZXIgPSBuZXcgQ2hlY2twb2ludE1hbmFnZXIoKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gbWFuYWdlclxyXG4gICAgcmV0dXJuIHRoaXMuX2NoZWNrcG9pbnRNYW5hZ2VyO1xyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBTZXRzIGEgY2hlY2twb2ludCBjYWxsYmFja1xyXG4gICAqXHJcbiAgICogQG1ldGhvZCBjaGVja3BvaW50c1xyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXHJcbiAgICovXHJcbiAgVHJhaWwucHJvdG90eXBlLnNldENoZWNrcG9pbnRGdW5jID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG4gICAgaWYoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKVxyXG4gICAgdGhpcy5jaGVja3BvaW50TWFuYWdlcigpLnNldENoZWNrcG9pbnRGdW5jKGNhbGxiYWNrKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBnZXRzIGEgY2hlY2twb2ludCBjYWxsYmFja1xyXG4gICAqXHJcbiAgICogQG1ldGhvZCBjaGVja3BvaW50c1xyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXHJcbiAgICovXHJcbiAgVHJhaWwucHJvdG90eXBlLmdldENoZWNrcG9pbnRGdW5jID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG4gICAgaWYoY2FsbGJhY2sgJiYgdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKVxyXG4gICAgdGhpcy5jaGVja3BvaW50TWFuYWdlcigpLmdldENoZWNrcG9pbnRGdW5jKGNhbGxiYWNrKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBjYWxsYmFjayB0aGF0IHVwZGF0ZXMgYSB2aXpcclxuICAgKlxyXG4gICAqIEBtZXRob2QgdXBkYXRlVml6RnVuY1xyXG4gICAqIEBraW5kIG1lbWJlclxyXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXHJcbiAgICovXHJcbiAgVHJhaWwucHJvdG90eXBlLnVwZGF0ZVZpekZ1bmMgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcbiAgICBpZihjYWxsYmFjayAmJiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpXHJcbiAgICB0aGlzLl91cGRhdGVWaXpDYWxsYmFjayA9IGNhbGxiYWNrO1xyXG4gIH07XHJcblxyXG4gIFRyYWlsLnByb3RvdHlwZS5yZWZyZXNoVGh1bWJuYWlsR2FsbGVyeSA9IGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgLy8gSG9sZCBUaGlzXHJcbiAgICB2YXIgdHJhaWwgPSB0aGlzO1xyXG5cclxuICAgIC8vIENoZWNrIGlmIGNvbnRyb2xzIGFyZSByZW5kZXJlZFxyXG4gICAgaWYodHJhaWwuX2NvbnRyb2xCb3gpe1xyXG5cclxuICAgICAgLy8gR2V0IEdhbGxlcnlcclxuICAgICAgdmFyIGdhbGxlcnlXcmFwcGVyID0gZDMuc2VsZWN0KHRyYWlsLl9jb250cm9sQm94KS5zZWxlY3QoJy50cmFpbHMtdGh1bWJuYWlscy1jb250YWluZXItaW5uZXItd3JhcHBlcicpO1xyXG4gICAgICB2YXIgdGh1bWJuYWlsR2FsbGVyeSA9IGQzLnNlbGVjdCh0cmFpbC5fY29udHJvbEJveCkuc2VsZWN0QWxsKCcudHJhaWxzLXRodW1ibmFpbHMtZ2FsbGVyeScpO1xyXG5cclxuICAgICAgLy8gU2VsZWN0IEFsbCBJbWdcclxuICAgICAgdmFyIGFsbFRodW1icyA9IHRodW1ibmFpbEdhbGxlcnkuc2VsZWN0QWxsKFwiaW1nXCIpXHJcbiAgICAgICAgLmRhdGEodHJhaWwuX2N1cnJlbnRCcmFuY2hWZXJzaW9ucywgZnVuY3Rpb24oZCl7IHJldHVybiBkLl9kYXRhLmNoYW5nZXMuaWQoKTsgfSk7XHJcblxyXG4gICAgICAvLyBOZXcgSW1hZ2VcclxuICAgICAgYWxsVGh1bWJzLmVudGVyKClcclxuICAgICAgICAuYXBwZW5kKCdpbWcnKVxyXG4gICAgICAgIC5hdHRyKCdzcmMnLCBmdW5jdGlvbihkKXsgcmV0dXJuIGQuX2RhdGEuY2hhbmdlcy50aHVtYm5haWwoKTsgfSlcclxuICAgICAgICAuYXR0cignaGVpZ2h0JywgMjAwKVxyXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICd0cmFpbHMtdGh1bWJuYWlsJyk7XHJcblxyXG4gICAgICAvLyBVcGRhdGUgSGlnaGxpZ2h0aW5nXHJcbiAgICAgIGFsbFRodW1icy5jbGFzc2VkKCdoaWdobGlnaHQnLCBmdW5jdGlvbihkKXtcclxuICAgICAgICByZXR1cm4gdHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZS5fZGF0YS5jaGFuZ2VzICYmICB0cmFpbC5fY3VycmVudFZlcnNpb25Ob2RlLl9kYXRhLmNoYW5nZXMuaWQoKSA9PT0gZC5fZGF0YS5jaGFuZ2VzLmlkKCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gUmVtb3ZlIG91dGdvaW5nXHJcbiAgICAgIGFsbFRodW1icy5leGl0KCkucmVtb3ZlKCk7XHJcblxyXG4gICAgICAvLyBBcHBlbmQgTXVsdGlwbGUgY2xhc3NcclxuICAgICAgYWxsVGh1bWJzLmNsYXNzZWQoJ211bHRpcGxlJywgZnVuY3Rpb24oZCl7XHJcbiAgICAgICAgcmV0dXJuIGQuX2NoaWxkTm9kZXMubGVuZ3RoID4gMTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICB9O1xyXG5cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBQcml2YXRlIE1ldGhvZHNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAvKipcclxuICAgKiBBZGRzIGEgc25hcHNob3QgdG8gdGhlIHRyZWUgaW4gY3VycmVudCB0cmFpbC5cclxuICAgKlxyXG4gICAqIEBtZXRob2QgYWRkVmVyc2lvblRvVHJlZVxyXG4gICAqIEBwYXJhbSB7QGxpbmsgVHJhaWx9IC0gdHJhaWwgdG8gd2hpY2ggc25hcHNob3QgaGFzIHRvIGJlIGFkZGVkLlxyXG4gICAqIEBwYXJhbSB7QGxpbmsgVmVyc2lvbn0gLSBWZXJzaW9uIHdoaWNoIGlzIHRvIGJlIGFkZGVkIGluIGEgdHJlZS5cclxuICAgKi9cclxuICB2YXIgYWRkQ2hhbmdlc1RvVmVyc2lvblRyZWUgPSBmdW5jdGlvbih0cmFpbCwgY2hhbmdlcyl7XHJcblxyXG4gICAgLy8gQWRkIFByZXZpb3VzIFN0YXRlIEZyb20gTWFzdGVyIFRyYWlsXHJcbiAgICAvLyAgc25hcHNob3QuX3ByZXZTdGF0ZUZyb21NYXN0ZXJUcmFpbCA9IHRyYWlsLl9jdXJyZW50VmVyc2lvbk5vZGUuX2RhdGEuc25hcHNob3QuZGF0YSgpO1xyXG5cclxuICAgIC8vIEFkZCBnaXZlbiBzbmFwc2hvdCB0byB0cmVlXHJcbiAgICB0cmFpbC5fY3VycmVudFZlcnNpb25Ob2RlID0gdHJhaWwudmVyc2lvblRyZWUoKS5pbnNlcnRUb05vZGUodHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZSwge1xyXG4gICAgICBrZXk6IGNoYW5nZXMuaWQoKSxcclxuICAgICAgY2hhbmdlczogY2hhbmdlc1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRGVwdGhcclxuICAgIGNoYW5nZXMuX2xldmVsSW5NYXN0ZXJUcmFpbCA9IHRyYWlsLl9jdXJyZW50VmVyc2lvbk5vZGUuX2RlcHRoO1xyXG5cclxuICAgIC8vIE5vZGVcclxuICAgIGNoYW5nZXMuX25vZGVJbk1hc3RlclRyYWlsID0gdHJhaWwuX2N1cnJlbnRWZXJzaW9uTm9kZTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBhIHNuYXBzaG90IHRvIHRoZSBnYWxsZXJ5LlxyXG4gICAqXHJcbiAgICogQG1ldGhvZCBhZGRWZXJzaW9uVG9UcmVlXHJcbiAgICogQHBhcmFtIHtAbGluayBUcmFpbH0gLSB0cmFpbCB0byB3aGljaCBnYWxsZXJ5IGJlbG9uZ3MuXHJcbiAgICogQHBhcmFtIHtAbGluayBWZXJzaW9ufSAtIFZlcnNpb24gd2hpY2ggaXMgdG8gYmUgYWRkZWQgaW4gYSBnYWxsZXJ5LlxyXG4gICAqL1xyXG4gIHZhciBhZGRUaHVtYm5haWxUb0dhbGxlcnkgPSBmdW5jdGlvbih0cmFpbCwgY2hhbmdlcyl7XHJcblxyXG4gICAgLy8gRmlsdGVyIFNpYmxpbmdzXHJcbiAgICB0cmFpbC5fY3VycmVudEJyYW5jaFZlcnNpb25zID0gdHJhaWwuX2N1cnJlbnRCcmFuY2hWZXJzaW9ucy5maWx0ZXIoZnVuY3Rpb24obm9kZSl7XHJcbiAgICAgIHJldHVybiBub2RlLl9kYXRhLmNoYW5nZXMubGV2ZWxJbk1hc3RlclRyYWlsKCkgPCBjaGFuZ2VzLmxldmVsSW5NYXN0ZXJUcmFpbCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHJlbmRlcmVkIHNuYXBzaG90XHJcbiAgICAvLyBDdXJyZW50IFZlcnNpb24gaGFzIHJlZmVyZW5jZSB0byBub2RlIHRoYXQgY29udGFpbnMgcmVjZW50bHkgdGFrZW4gc25hcHNob3RcclxuICAgIHRyYWlsLl9jdXJyZW50QnJhbmNoVmVyc2lvbnMucHVzaChjaGFuZ2VzLm5vZGVJbk1hc3RlclRyYWlsKCkpO1xyXG5cclxuICAgIC8vIFJlZnJlc2ggVGh1bWJuYWlsIEdhbGxlcnlcclxuICAgIHRyYWlsLnJlZnJlc2hUaHVtYm5haWxHYWxsZXJ5KHRyYWlsLl9jdXJyZW50QnJhbmNoVmVyc2lvbnMpO1xyXG5cclxuICB9O1xyXG5cclxuICBUcmFpbC5wcm90b3R5cGUucmFzdGVyaXplQW5kQ3JvcCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNhbGxiYWNrKXtcclxuXHJcbiAgICAvLyBJZiByZXF1aXJlZCBhcmd1bWVudHMgYXJlIHBhc3NlZFxyXG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA+IDApe1xyXG5cclxuICAgICAgLy8gQ2hlY2sgSWYgcmFzdGVyaXplSFRNTCBpcyBpbmNsdWRlZFxyXG4gICAgICBpZighcmFzdGVyaXplSFRNTCB8fCByYXN0ZXJpemVIVE1MID09PSAndW5kZWZpbmVkJyl7XHJcbiAgICAgICAgaWYoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbWVudCkpe1xyXG4gICAgICAgIGlmKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENsb25lIGFuZCBIb2xkIGN1cnJlbnQgZG9jdW1lbnRcclxuICAgICAgdmFyIGN1cnJlbnREb2N1bWVudCA9IGRvY3VtZW50O1xyXG4gICAgICB2YXIgY2xvbm5lZERvY3VtZW50ID0gY3VycmVudERvY3VtZW50LmNsb25lTm9kZSh0cnVlKTtcclxuXHJcbiAgICAgIC8vIEdldCBCb2R5IGFuZCBIVE1MXHJcbiAgICAgIHZhciBib2R5ID0gY3VycmVudERvY3VtZW50LmJvZHksXHJcbiAgICAgICAgICBodG1sID0gY3VycmVudERvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcclxuXHJcbiAgICAgIC8vIENvbXB1dGUgTWF4IEhlaWdodFxyXG4gICAgICB2YXIgbWF4SGVpZ2h0ID0gTWF0aC5tYXgoYm9keS5zY3JvbGxIZWlnaHQsIGJvZHkub2Zmc2V0SGVpZ2h0LFxyXG4gICAgICBodG1sLmNsaWVudEhlaWdodCwgaHRtbC5zY3JvbGxIZWlnaHQsIGh0bWwub2Zmc2V0SGVpZ2h0KTtcclxuXHJcbiAgICAgIC8vIENvbXB1dGUgTWF4IFdpZHRoXHJcbiAgICAgIHZhciBtYXhXaWR0aCA9IE1hdGgubWF4KGJvZHkuc2Nyb2xsV2lkdGgsIGJvZHkub2Zmc2V0V2lkdGgsXHJcbiAgICAgIGh0bWwuY2xpZW50V2lkdGgsIGh0bWwuc2Nyb2xsV2lkdGgsIGh0bWwub2Zmc2V0V2lkdGgpO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIHRlbXBvcmFyeSBjYW52YXMgZWxlbWVudFxyXG4gICAgICB2YXIgY2FudmFzID0gY2xvbm5lZERvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcbiAgICAgIGNhbnZhcy53aWR0aCA9IG1heFdpZHRoO1xyXG4gICAgICBjYW52YXMuaGVpZ2h0ID0gbWF4SGVpZ2h0O1xyXG4gICAgICBjYW52YXMuaWQgPSBcInJhLWNhbnZhc1wiO1xyXG5cclxuICAgICAgLy8gTW9kaWZ5IENvbnRleHQgb2YgQ2FudmFzXHJcbiAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBcIiNGRkZGRkZcIjtcclxuICAgICAgY29udGV4dC5maWxsUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG5cclxuICAgICAgLy8gUmFzdGVyaXplIHRoZSBlbnRpcmUgZG9jdW1lbnRcclxuICAgICAgdmFyIGVsZW1lbnRET00gPSBjdXJyZW50RG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtZW50KTtcclxuXHJcbiAgICAgIC8vIFNpemUgYW5kIE9mZnNldHNcclxuICAgICAgdmFyIGhlaWdodCA9IE1hdGgubWF4KGVsZW1lbnRET00uY2xpZW50SGVpZ2h0LCBlbGVtZW50RE9NLnNjcm9sbEhlaWdodCksXHJcbiAgICAgICAgICB3aWR0aCA9IE1hdGgubWF4KGVsZW1lbnRET00uY2xpZW50V2lkdGgsIGVsZW1lbnRET00uc2Nyb2xsV2lkdGgpLFxyXG4gICAgICAgICAgdG9wT2Zmc2V0ID0gZWxlbWVudERPTS5vZmZzZXRUb3AsXHJcbiAgICAgICAgICBsZWZ0T2Zmc2V0ID0gZWxlbWVudERPTS5vZmZzZXRMZWZ0O1xyXG5cclxuICAgICAgLy8gRHJhdyByYXN0ZXJpemVkIGRvY3VtZW50XHJcbiAgICAgIHJhc3Rlcml6ZUhUTUwuZHJhd0RvY3VtZW50KGNsb25uZWREb2N1bWVudCwgY2FudmFzKS50aGVuKGZ1bmN0aW9uKHJlbmRlclJlc3VsdCkge1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhcIlJlbmRlcmVkXCIsIHJlbmRlclJlc3VsdCk7XHJcbiAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbcmVuZGVyUmVzdWx0LnN2Z10sIHt0eXBlOiBcInRleHQvc3ZnO2NoYXJzZXQ9dXRmLThcIn0pO1xyXG4gICAgICAgIGZpbGVTYXZlci5zYXZlQXMoYmxvYiwgJ1NuYXBzaG90LnN2ZycpO1xyXG5cclxuICAgICAgICAvLyBHZXQgQ2FudmFzIGNvbnRleHRcclxuICAgICAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbiAgICAgICAgLy8gR2V0IEltYWdlIERhdGFcclxuICAgICAgICB2YXIgaW1hZ2VEYXRhID0gY3R4LmdldEltYWdlRGF0YShsZWZ0T2Zmc2V0LCB0b3BPZmZzZXQsIHdpZHRoLCBoZWlnaHQpO1xyXG5cclxuICAgICAgICAvLyBDbGVhciBDYW52YXMgUmVjdFxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgLy8gUmVzaXplIENhbnZhc1xyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XHJcblxyXG4gICAgICAgIC8vIFB1dCBjcm9wcGVkIGRhdGEgYmFja1xyXG4gICAgICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcclxuXHJcbiAgICAgICAgLy8gR2V0IGJhc2U2NFxyXG4gICAgICAgIHZhciBpbWFnZUJhc2U2NCA9IGNhbnZhcy50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIiwgMS4wKTtcclxuXHJcbiAgICAgICAgLy8gU2VuZCByZXN1bHQgYmFja1xyXG4gICAgICAgIGlmKGNhbGxiYWNrKSBjYWxsYmFjayhpbWFnZUJhc2U2NCk7XHJcblxyXG4gICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gRXhwb3J0XHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgcmV0dXJuIFRyYWlsO1xyXG5cclxuXHJcbn0oKSk7XHJcbiJdfQ==

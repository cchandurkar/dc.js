(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

//==================================================//
//																									//
// 			trails.js (0.3.4)									          //
// 			javascript library for data provenance			//
//      http://cchandurkar.me/provenance/           //
//			@author Chaitanya Chandurkar								//
// 			@since Sept, 2015														//
//																									//
//==================================================//


// -----------------------------------------------------------------------|
// 	Terms used in this library:																						|
// -----------------------------------------------------------------------|
//                                                                        |
// 	1. User - He/She is the person who is using the library to develop		|
// 						the app and not the end-user who is using that app.					|
//                                                                        |
// -----------------------------------------------------------------------|


// -----------------------------------------------------------------------|
//  Future Work																		                        |
// -----------------------------------------------------------------------|
//                                                                        |
// 	1. Checkpoints - Add chcek points to snapshots so that loading back		|
// 						       any snapshot would not take much hops.					      |
//																																				|
//                                                                        |
// -----------------------------------------------------------------------|

module.exports = require('./src/js/');

},{"./src/js/":52}],2:[function(require,module,exports){
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

},{"../util":5}],4:[function(require,module,exports){
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

},{"./grammar":3}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{"./CSSRule":13,"./MatcherList":19}],8:[function(require,module,exports){
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

},{"./CSSRule":13,"./CSSStyleDeclaration":14}],9:[function(require,module,exports){
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

},{"./CSSRule":13,"./CSSStyleSheet":16,"./MediaList":20}],10:[function(require,module,exports){
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

},{"./CSSRule":13,"./CSSStyleDeclaration":14}],11:[function(require,module,exports){
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

},{"./CSSRule":13}],12:[function(require,module,exports){
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

},{"./CSSRule":13,"./MediaList":20}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{"./parse":24}],15:[function(require,module,exports){
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

},{"./CSSRule":13,"./CSSStyleDeclaration":14}],16:[function(require,module,exports){
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

},{"./CSSStyleRule":15,"./StyleSheet":21,"./parse":24}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{"./CSSValue":17}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{"./CSSKeyframeRule":10,"./CSSKeyframesRule":11,"./CSSMediaRule":12,"./CSSStyleDeclaration":14,"./CSSStyleRule":15,"./CSSStyleSheet":16}],23:[function(require,module,exports){
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

},{"./CSSDocumentRule":7,"./CSSFontFaceRule":8,"./CSSImportRule":9,"./CSSKeyframeRule":10,"./CSSKeyframesRule":11,"./CSSMediaRule":12,"./CSSRule":13,"./CSSStyleDeclaration":14,"./CSSStyleRule":15,"./CSSStyleSheet":16,"./CSSValue":17,"./CSSValueExpression":18,"./MatcherList":19,"./MediaList":20,"./StyleSheet":21,"./clone":22,"./parse":24}],24:[function(require,module,exports){
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

},{"./CSSDocumentRule":7,"./CSSFontFaceRule":8,"./CSSImportRule":9,"./CSSKeyframeRule":10,"./CSSKeyframesRule":11,"./CSSMediaRule":12,"./CSSStyleDeclaration":14,"./CSSStyleRule":15,"./CSSStyleSheet":16,"./CSSValueExpression":18}],25:[function(require,module,exports){
var Tree = require('./src/tree');
module.exports = dataTree = (function(){
  return {
    create: function(){
      return new Tree();
    }
  };
}());

},{"./src/tree":28}],26:[function(require,module,exports){

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
    callback(this._tree._rootNode);
    (function recur(node){
      node._childNodes.forEach(callback);
      node._childNodes.forEach(recur);
    }(this._tree._rootNode));
  };

  return Traverser;

}());

},{}],27:[function(require,module,exports){

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

  }

  /**
   * Indicates whether this node matches the specified criteria. It triggers a callback criteria function that returns something.
   *
   * @method matchCriteria
   * @memberof TreeNode
   * @instance
   * @memberof TreeNode
   * @param {function} callback - Callback function that specifies some criteria. It receives {@link TreeNode#_data} in parameter and expects different values in different scenarios.
   * `matchCriteria` is used by following functions and expects:
   * 1. {@link Tree#searchBFS} - {boolean} in return indicating whether given node satisfies criteria.
   * 2. {@link Tree#searchDFS} - {boolean} in return indicating whether given node satisfies criteria.
   * 3. {@link Tree#export} - {object} in return indicating formatted data object.
   */
  TreeNode.prototype.matchCriteria = function(criteria){
    return criteria(this._data);
  };

  return TreeNode;

}());

},{}],28:[function(require,module,exports){
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
      this._rootNode = this._currentNode = node;
    } else {
      node._parentNode = this._currentNode;
      this._currentNode._childNodes.push(node);
      this._currentNode = node;
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

    // Hold `this`
    var thiss = this;

    // if removeChildren ; remove all children recursively
    if(trim){
      node._childNodes.forEach(function(_child){
        thiss.remove(_child, removeChildren);
      });
    } else {

      // Check If node has parent node
      if(node._parentNode){

        // Take all child nodes and put in parent's _childNodes
        node._childNodes.forEach(function(_child){
          _child._parentNode = node._parentNode;
          node._parentNode._childNodes.push(_child);
        });

        // Remove node from parent's _childNodes
        var index = node._parentNode._childNodes.indexOf(node);
        node._parentNode._childNodes.splice(index, 1);

      } else {

        // Remove a rootNode
        this._rootNode = null;
        this._currentNode = null;

      }

      // Empty nodes `_childNodes`
      node._childNodes = [];

    }

    // Set parent and data to null
    node._parentNode = null;
    node._data = null;

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
    node._childNodes.push(newNode);
    this._currentNode = newNode;
    return newNode;
  };

  /**
   * Get all child nodes of {@link TreeNode} specified.
   *
   * @method getChildNodesOf
   * @memberof Tree
   * @instance
   * @param {object} - {@link TreeNode} of which child nodes are to be accessed.
   * @return {array} - array of {@link TreeNode}s.
   */
  Tree.prototype.getChildNodesOf = function(node){
    return node._childNodes;
  };

  /**
   * Get parent node of {@link TreeNode} specified.
   *
   * @method getParentNodeOf
   * @memberof Tree
   * @instance
   * @param {object} - {@link TreeNode} of which parent node is to be accessed.
   * @return {object} - {@link TreeNode}.
   */
  Tree.prototype.getParentNodeOf = function(node){
    return node._parentNode;
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
   * Callback that receives a node data in parameter and expects user to return one of following:
   * 1. {@link Traverser#searchBFS} - {boolean} in return indicating whether given node satisfies criteria.
   * 2. {@link Traverser#searchDFS} - {boolean} in return indicating whether given node satisfies criteria.
   * 3. {@link Tree#export} - {object} in return indicating formatted data object.
   * @callback criteria
   * @param data {object} - data of particular {@link TreeNode}
   */



  return Tree;

}());

},{"./traverser":26,"./tree-node":27}],29:[function(require,module,exports){
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

},{"./cssSupport":30}],30:[function(require,module,exports){
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

},{"cssom":23}],31:[function(require,module,exports){
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

},{"./cssSupport":30,"./inlineCss":32,"./inlineImage":33,"./inlineScript":34,"./util":35}],32:[function(require,module,exports){
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

},{"./backgroundValueParser":29,"./cssSupport":30,"./util":35,"ayepromise":2,"css-font-face-src":4}],33:[function(require,module,exports){
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

},{"./util":35}],34:[function(require,module,exports){
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

},{"./util":35}],35:[function(require,module,exports){
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

},{"ayepromise":2,"url":42}],36:[function(require,module,exports){
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
},{}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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

},{}],39:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":37,"./encode":38}],40:[function(require,module,exports){
/*! rasterizeHTML.js - v1.2.0 - 2015-10-03
* http://www.github.com/cburgmer/rasterizeHTML.js
* Copyright (c) 2015 Christoph Burgmer; Licensed MIT */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define(["url","cssMediaQuery","xmlserializer","sanedomparsererror","ayepromise","inlineresources"], function (a0,b1,c2,d3,e4,f5) {
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

    var zoomedElementSizingAttributes = function (size, zoomFactor) {
        var closestScaledWith, closestScaledHeight,
            offsetX, offsetY;

        zoomFactor = zoomFactor || 1;
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

        if (zoomFactor !== 1) {
            attributes.transform = 'scale(' + zoomFactor + ')';
        }

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

        var attributes = zoomedElementSizingAttributes(size, zoomFactor);

        workAroundCollapsingMarginsAcrossSVGElementInWebKitLike(attributes);
        workAroundSafariSometimesNotShowingExternalResources(attributes);

        return (
            '<svg xmlns="http://www.w3.org/2000/svg"' +
                ' width="' + size.width + '"' +
                ' height="' + size.height + '"' +
                ' font-size="' + size.rootFontSize + '"' +
                '>' +
                workAroundChromeShowingScrollbarsUnderLinuxIfHtmlIsOverflowScroll() +
                '<foreignObject' + serializeAttributes(attributes) + '>' +
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

},{"ayepromise":2,"css-mediaquery":6,"inlineresources":31,"sane-domparser-error":41,"url":42,"xmlserializer":43}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
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

},{"punycode":36,"querystring":39}],43:[function(require,module,exports){
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

},{}],44:[function(require,module,exports){
module.exports = (function(window, $){

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Namespace and Basic Setup
  // ------------------------------------

  /**
   * controlBox` creates and removes the UI element from DOM using jQuery.
   * @namespace
   */
  var controlBox = {};

  // ------------------------------------
  // Methods
  // ------------------------------------

  controlBox.create = function(trail){

    // Create Outer Control Box
    var box = $("<div>", {
      id: '' + trail._trailId + '-control-box',
      class: 'trails-control-box'
    });

    // Create Control Box Title
    var controlBoxTitle = $("<p>", {
      id: '' + trail._trailId + '-control-box-title',
      class: 'control-box-title',
      text: 'Trail #' + trail._trailId.split('-')[0] + '..'
    }).appendTo(box);

    // Create controls container
    var controlsBoxInnerWrapper = $("<div>", {
      id: '' + trail._trailId + '-control-box-inner-wrapper',
      class: 'trails-control-box-inner-wrapper'
    }).appendTo(box);

    // Create controls container
    var controlsContainer = $("<div>", {
      id: '' + trail._trailId + '-controls-container',
      class: 'trails-controls-container'
    }).appendTo(controlsBoxInnerWrapper);

    // Create thumbnail gallery container
    var thumbnailGalleryContainer = $("<div>", {
      id: '' + trail._trailId + '-thumbnail-gallery-gallery',
      class: 'trails-thumbnail-gallery-container'
    }).appendTo(controlsBoxInnerWrapper);

    // Create thumbnail gallery
    var thumbnailGallery = $("<div>", {
      id: '' + trail._trailId + '-thumbnail-gallery',
      class: 'trails-thumbnail-gallery'
    }).appendTo(thumbnailGalleryContainer);

    return box;

  };

  // ------------------------------------
  // Exports
  // ------------------------------------

  return controlBox;

}(window, window.jQuery));

},{}],45:[function(require,module,exports){

module.exports = (function(document, $){

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Namespace and Basic Setup
  // ------------------------------------

  var gistControl = {};

  // ------------------------------------
  // Method
  // ------------------------------------

  gistControl.create = function(trail){

    // Create Control Wrapper
    var wrapper = $("<div>", {
      id: '' + trail._trailId + '-control-wrapper-gist',
      class: 'trails-control-wrapper',
    });

    // Create Control
    var ctrl = $("<div>", {
      id: '' + trail._trailId + '-control-gist',
      class: 'trails-control',
      text: 'Export to Gist'
    }).appendTo(wrapper);

    // Add Listener
    $(document).on('click', '#' + ctrl.attr('id'), function(){
      alert("Gist Clicked");
    });

    return wrapper;

  };

  return gistControl;

}(window.document, window.jQuery));

},{}],46:[function(require,module,exports){
module.exports = (function($, document){
  return {

    // ControlBox that holds the snapshot gallery and controls
    controlBox: require('./controlBox'),

    // List of posible controls
    list: {
      gistControl: require('./gistControl'),
      saveControl: require('./saveControl'),
      loadControl: require('./loadControl'),
      snapshotControl: require('./snapshotControl')
    },

    // Checks if control was rendered
    isAttached: function(control){
      return $.contains(document, control);
    }

  };
}(window.jQuery, window.document));

},{"./controlBox":44,"./gistControl":45,"./loadControl":47,"./saveControl":48,"./snapshotControl":49}],47:[function(require,module,exports){

module.exports = (function(document, $){

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Namespace and Basic Setup
  // ------------------------------------

  var loadJSON = {};

  // ------------------------------------
  // Method
  // ------------------------------------

  loadJSON.create = function(trail){

    // Create Control Wrapper
    var wrapper = $("<div>", {
      id: '' + trail._trailId + '-control-wrapper-load-json',
      class: 'trails-control-wrapper',
    });

    // Create Control
    var ctrl = $("<div>", {
      id: '' + trail._trailId + '-control-load',
      class: 'trails-control',
      text: 'Load JSON'
    }).appendTo(wrapper);

    // Add Listener
    $(document).on('click', '#' + ctrl.attr('id'), function(){
      alert("Load Clicked");
    });

    return wrapper;

  };

  return loadJSON;

}(window.document, window.jQuery));

},{}],48:[function(require,module,exports){

module.exports = (function(document, $){

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Namespace and Basic Setup
  // ------------------------------------

  var saveControl = {};

  // ------------------------------------
  // Method
  // ------------------------------------

  saveControl.create = function(trail){

    // Create Control Wrapper
    var wrapper = $("<div>", {
      id: '' + trail._trailId + '-control-wrapper-save',
      class: 'trails-control-wrapper',
    });

    // Create Control
    var ctrl = $("<div>", {
      id: '' + trail._trailId + '-control-save',
      class: 'trails-control',
      text: 'Save JSON'
    }).appendTo(wrapper);

    // Add Listener
    $(document).on('click', '#' + ctrl.attr('id'), function(){
      alert("Save Clicked");
    });

    return wrapper;

  };

  return saveControl;

}(window.document, window.jQuery));

},{}],49:[function(require,module,exports){

module.exports = (function(document, $){

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Namespace and Basic Setup
  // ------------------------------------

  var snapshotControls = {};

  // ------------------------------------
  // Method
  // ------------------------------------

  snapshotControls.create = function(trail){

    // Create Control Wrapper
    var wrapper = $("<div>", {
      id: '' + trail._trailId + '-control-wrapper-snapshot',
      class: 'trails-control-wrapper',
    });

    // Create Control
    var ctrlPrev = $("<div>", {
      id: '' + trail._trailId + '-control-snapshot-prev',
      class: 'trails-control snapshot-prev',
      text: ' Prev '
    }).appendTo(wrapper);

    // Create Control
    var ctrlNext = $("<div>", {
      id: '' + trail._trailId + '-control-snapshot-next',
      class: 'trails-control snapshot-next',
      text: ' Next >> '
    }).appendTo(wrapper);

    // Add Listener on ctrlPrev
    $(document).on('click', '#' + ctrlPrev.attr('id'), function(){
      alert("Prev Clicked");
    });

    // Add Listener on ctrlNext
    $(document).on('click', '#' + ctrlNext.attr('id'), function(){
      alert("Next Clicked");
    });

    return wrapper;

  };

  return snapshotControls;

}(window.document, window.jQuery));

},{}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){

module.exports = (function(){
  return {
    guid: require('./guid')
  };
}());

},{"./guid":50}],52:[function(require,module,exports){

var Trail = require('./trail');

module.exports = trails = (function(_window, _$) {

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Namespace and Basic Setup
  // ------------------------------------

  /**
   * trail` encapsulates entire functionality and allow users to create trail objects.
   * @namespace
   */
  var trails = {};

  // ------------------------------------
  // Fields
  // ------------------------------------

  /**
   * defines the window in which trail was created.
   */
  trails.window = _window;

  /**
   * jQuery which is required to draw controls
   * @type {object}
   */
  trails.$ = _$ || null;

  /**
   * tracks the multiple trails created on same document
   * @type {array}
   */
  trails.list = [];

  // ------------------------------------
  // Methods
  // ------------------------------------

  /**
   * creates an instance of {@Trail}
   * @param {object} data - using which trails is to be created
   * @param {callback} callback - that returns the trail created or error occured.
   */
  trails.create = function() {
    if (!trails.$) throw new Error("trails.js could not find jQuery.");
    return trails.list[trails.list.push(new Trail()) - 1];
  };

  // Return to export
  return trails;

}(window, window.jQuery));

},{"./trail":54}],53:[function(require,module,exports){
var helpers = require('./helpers');
var rasterizeHTML = require('rasterizehtml');

module.exports = (function(){

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Basic Setup
  // ------------------------------------

  var snapshot = {};

  // ------------------------------------
  // Methods
  // ------------------------------------

  snapshot.create = function(data, thumbnail){
    return new Snapshot(data, thumbnail);
  };

  snapshot.createFrom = function(data){

    // Check if valid data is provided
    if(data && (typeof data !=='object' || !data.snapshotId)){
      throw new Error('Invalid snapshot data.', data);
    }

    // Create new snapshot and override attributes
    var snapshot = new Snapshot();
    return snapshot;

  };

  // ------------------------------------
  // Contextual Function
  // ------------------------------------

  /**
   * Represents the snapshot that holds the data about state of visualization.
   *
   * @class
   * @kind class
   * @constructor
   * @param data - using which trail is to be created
   */
  var Snapshot = function(data, thumbnail) {

    this._snapshotId = helpers.guid();
    this._vizData = data;
    this._thumbnail = thumbnail;
    this._capturedAt = new Date().getTime();

  };

  // ------------------------------------
  // Methods
  // ------------------------------------

  Snapshot.prototype.thumbnail = function(element, callback){

    // Hold `this`
    var thiss = this;

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
        thiss._thumbnail = imageBase64;

        // Send result back
        callback(imageBase64);

      });

    } else {
      return this._thumbnail;
    }

  };

  // ------------------------------------
  // Export
  // ------------------------------------

  return snapshot;

}());

},{"./helpers":51,"rasterizehtml":40}],54:[function(require,module,exports){
var controls = require('./controls');
var helpers = require('./helpers');
var snapshot = require('./snapshot');
var dataTree = require('data-tree');

module.exports = (function() {

  // Flag bad practises
  'use strict';

  // ------------------------------------
  // Basic Setup
  // ------------------------------------

  /**
   * Represents the trail that tracks of the states of visualization.
   *
   * @class
   * @kind class
   * @constructor
   * @param data - using which trail is to be created
   */
  var Trail = function() {

    /**
     * Id that uniqely identifies the trail.
     *
     * @property _trailId
     * @type {string}
     * @default "current timestamp"
     */
    this._trailId = helpers.guid();


    /**
     * Attributes that defines the state of trail.
     *
     * @property _attrs
     * @type {object}
     * @default "null"
     */
    this._attrs = {};

    this._initiatedAt = new Date().getTime();

    this._lastExportedAt = null;

    this._controlBox = controls.controlBox.create(this);

    this._controls = {};

    this._renderTo = null;

    this._dataTree = dataTree.create(this);

    this._currentNode = null;

  };

  // ------------------------------------
  // Methods
  // ------------------------------------

  Trail.prototype.importFrom = function(data){
    return this;
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
      } else {
        return this._attrs[key];
      }
    }
  };

  /**
   * Gets or sets the set of attributes to {@link Trail#_attrs}
   *
   * @method attrs
   * @kind member
   * @param {object} attrs - object that needs to be imported as attributes.
   */
  Trail.prototype.attrs = function(attrs) {
    if (!attrs || typeof attrs !== 'object') {
      return this._attrs;
    } else {
      var thiss = this;
      Object.keys(attrs).forEach(function(key) {
        thiss._attrs[key] = attrs[key];
      });
    }
  };

  /**
   * Captures the {@link Snapshot}.
   *
   * @method capture
   * @kind member
   * @param {object|string|number|null} data - that needs to be captured in snapshot.
   * @param {string} selector - whose snapshot is to be taken.
   * @param {function} callback - triggers when `trail` finishes capturing thumbnail.
   */
  Trail.prototype.capture = function(data, selector, callback) {

    // Create Snapshot with data provided
    var snap = snapshot.create(data);

    // Insert in Data Tree
    this._currentNode = this._dataTree.insert({
      'id': snap._snapshotId,
      'snapshot': snap
    });

    // Hold `this`
    var thiss = this;

    // Capture Thumbnail
    if(selector && typeof selector === 'string'){

      snap.thumbnail(selector, function(imageDataUrl){

        // Add thumbnail to thumbnail gallery
        addSnapshotToGallery(thiss, snap);

        // trigger callback
        if(callback && typeof callback === 'function')
        callback(imageDataUrl);

      });
    }

  };

  /**
   * Captures the snapshot after provided delay. It is helpful when your
   * visualization has some transitions to complete that take certain amount of time.
   *
   * @method captureWithDelay
   * @kind member
   * @param {object|string|number|null} data - any type of data that needs to be tracked.
   * @param {string} selector - selector which has to be rasterized as thumbnail.
   * @param {number} delay - delay after which snapshot should be captured.
   * @param {function} callback - triggers when {@link Trail} finishes capturing thumbnail.
   */
  Trail.prototype.captureWithDelay = function(data, selector, delay, callback) {
    var thiss = this;
    setTimeout(function() {
      thiss.capture(data, area, callback);
    }, delay);
  };


  /**
   * Captures the snapshot with provided data and image. {@link Trail} does not capture
   * the thumbnail on it's own but uses the provided image instead. Use this when you are
   * trying to capture snapshot from canvas and use `canvas.toDataUrl()` get `imageDataUrl`.
   *
   * @method captureWithImage
   * @kind member
   * @param {object|string|number|null} data - any type of data that needs to be tracked.
   * @param {string} imageDataUrl - represents the image data url for snapshot.
   */
  Trail.prototype.captureWithImage = function(data, imageDataUrl) {

    // Create Snapshot
    var snap = snapshot.create(data, imageDataUrl);

    // Insert in Data Tree
    this._currentNode = this._dataTree.insert({
      'id': snap._snapshotId,
      'snapshot': snap
    });

    // Add Image to gallery
    addSnapshotToGallery(this, snap);

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
  Trail.prototype.addControls = function(ctrlArray) {

    // Check if valid array is passed
    ctrlArray = ctrlArray && Array.isArray(ctrlArray) ? ctrlArray : Object.keys(controls.list);

    // Hold `this`
    var thiss = this;

    // Create control in array
    ctrlArray.forEach(function(ctrl){
      thiss.addControl(ctrl);
    });

    return this;

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
  Trail.prototype.addControl = function(ctrl) {
    if(controls.list.hasOwnProperty(ctrl) && !this._controls.hasOwnProperty(ctrl)){
      this._controls[ctrl] = controls.list[ctrl].create(this);
      this._controlBox.find('.trails-controls-container').append(this._controls[ctrl]);
    } return this;
  };

  /**
   * Checks whether given control is added to the trail.
   *
   * @method hasControl
   * @kind member
   * @param {string} ctrl - control option in question.
   * @return {boolean} - whether control is added or not.
   */
  Trail.prototype.hasControl = function(ctrl) {
    return this._controls.hasOwnProperty(ctrl);
  };

  /**
   * Checks whether given control is added to the trail.
   *
   * @method hasControl
   * @kind member
   * @param {string} ctrl - control option in question.
   * @return {Trail} - allows method chaining
   */
  Trail.prototype.renderTo = function(selector) {

    // If controls are already attached; remove them
    if(controls.isAttached(this._controlBox)){
      this._controlBox.remove();
    }

    // Update `_renderTo`
    this._renderTo = selector;

    // Attached control box to given selector
    this._controlBox.appendTo(selector);

    return this;
  };

  /**
   * Exports the state of trail in JSON
   *
   * @method export
   * @kind member
   * @return {object} state - JSON object representing state of trail.
   */
  Trail.prototype.export = function() {

    // Hold `this`
    var thiss = this;

    // Update `_lastExportedAt`
    this._lastExportedAt = new Date().getTime();

    // Export all Snapshots
    var exportedSnaps = thiss._dataTree.export(function(data){
      return {
        snapshotId: data.snapshot._snapshotId,
        capturedAt: data.snapshot._capturedAt,
        thumbnail: data.snapshot._thumbnail,
        vizData: data.snapshot._vizData
      };
    });

    // Export Trail and Snapshot data
    return {
      trailId: thiss._trailId,
      initiatedAt: thiss._initiatedAt,
      lastExportedAt: thiss._lastExportedAt,
      controls: {
        options: Object.keys(thiss._controls),
        renderTo: thiss._renderTo
      },
      snapshots: exportedSnaps
    };

  };

  /**
   * Exports the state of trail to gist
   *
   * @method exportToGist
   * @kind member
   * @param {string} accessToken - Valid github access token
   */
  Trail.prototype.exportToGist = function(accessToken) {

  };

  /**
   * Saves the state of trail locally in JSON
   *
   * @method saveToJSON
   * @kind member
   */
  Trail.prototype.saveToJSON = function() {

  };

  /**
   * Loads the state of trail back to visualization.
   *
   * @param json - JSON object representing the state of trail.
   * @method saveToJSON
   * @kind member
   */
  Trail.prototype.loadJSON = function(json) {

  };

  // ------------------------------------
  // Callbacks and private methods
  // ------------------------------------

  var addSnapshotToGallery = function(trail, snapshot) {

    console.log("addSnapshotToGallery", snapshot);

    // Create Image element and append to gallery
    var img = $("<img>", {
      id: 'thumb-' + snapshot._snapshotId,
      class: 'trails-thumbnail',
      src: snapshot._thumbnail
    }).appendTo(trail._controlBox.find('.trails-thumbnail-gallery'));

    console.log("adding image", img);

  };

  // ------------------------------------
  // Export
  // ------------------------------------

  return Trail;

}());

},{"./controls":46,"./helpers":51,"./snapshot":53,"data-tree":25}]},{},[1]);

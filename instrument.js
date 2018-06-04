function instrument() {

  // Monkey patch the environment to speed up time, since some
  // tracking pixels and fingerprinting javascript only runs
  // after a delay
  var originalTimeout = setTimeout;
  window.setTimeout = function(func, time) {
    return originalTimeout(func, time/20);
  }

  var originalInterval = setInterval;
  window.setInterval = function(func, time) {
    return originalInterval(func, time/20);
  }

  // Intrumentation injection code is based on OpenWPM, in-term based on privacybadgerfirefox
  // https://github.com/EFForg/privacybadgerfirefox/blob/master/data/fingerprinting.js

    // from Underscore v1.6.0
    function debounce(func, wait, immediate) {
      var timeout, args, context, timestamp, result;

      var later = function () {
        var last = Date.now() - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
            context = args = null;
          }
        }
      };

      return function () {
        context = this;
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && !timeout;
        if (!timeout) {
          timeout = setTimeout(later, wait);
        }
        if (callNow) {
          result = func.apply(context, args);
          context = args = null;
        }

        return result;
      };
    }
    // End of Debounce

    // messages the injected script
    var send = (function () {
      var messages = [];
      // debounce sending queued messages
      var _send = debounce(function () {
        document.dispatchEvent(new CustomEvent(event_id, {
          detail: messages
        }));

        // clear the queue
        messages = [];
      }, 100);

      return function (msgType, msg) {
        // queue the message
        messages.push({'type':msgType,'content':msg});
        _send();
      };
    }());

    var event_id = document.currentScript.getAttribute('data-event-id');

    /*
     * Instrumentation helpers
     */

    var testing = false;

    function logErrorToConsole(error) {
      console.log("Error name: " + error.name);
      console.log("Error message: " + error.message);
      console.log("Error filename: " + error.fileName);
      console.log("Error line number: " + error.lineNumber);
      console.log("Error stack: " + error.stack);
    }

    // Helper to get originating script urls
    function getStackTrace() {
      var stack;

      try {
        throw new Error();
      } catch (err) {
        stack = err.stack;
      }

      return stack;
    }

    // from http://stackoverflow.com/a/5202185
    String.prototype.rsplit = function(sep, maxsplit) {
      var split = this.split(sep);
      return maxsplit ? [split.slice(0, -maxsplit).join(sep)].concat(split.slice(-maxsplit)) : split;
    }

    var stackTraceUrlRegex = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&//=,]*)):\d+:\d+/
    var stackTracePathRegex = /\((\/.+):\d+:\d+\)/;
    var stackTraceLocalRegex = /\((.+):\d+:\d+\)/;
    function getOriginatingScriptContext(getCallStack=false) {
      var trace = getStackTrace().trim().split('\n');

      // return a context object even if there is an error
      var empty_context = {scriptUrl: "",scriptLine: "",
                           scriptCol: "", funcName: "",
                           scriptLocEval: "", callStack: "" };
      if (trace.length < 4) {
        return empty_context;
      }
      // 0, 1 and 2 are OpenWPM's own functions (e.g. getStackTrace), skip them.
      var callSite = trace[3];
      if (!callSite){
        return empty_context;
      }
      /*
       * Stack frame format is simply: FUNC_NAME@FILENAME:LINE_NO:COLUMN_NO
       *
       * If eval or Function is involved we have an additional part after the FILENAME, e.g.:
       * FUNC_NAME@FILENAME line 123 > eval line 1 > eval:LINE_NO:COLUMN_NO
       * or FUNC_NAME@FILENAME line 234 > Function:LINE_NO:COLUMN_NO
       *
       * We store the part between the FILENAME and the LINE_NO in scriptLocEval
       */
      try{
        var scriptLocEval = ""; // for eval or Function calls
        var callSiteParts = callSite.split(" at ");
        var funcName = callSiteParts[0] || '';
        var items = callSiteParts[1].rsplit(":", 2);
        var columnNo = items[items.length-1];
        var lineNo = items[items.length-2];
        var scriptFileName = items[items.length-3] || '';
        var lineNoIdx = scriptFileName.indexOf(" line ");  // line in the URL means eval or Function
        if (lineNoIdx != -1) {
          scriptLocEval = scriptFileName.slice(lineNoIdx+1, scriptFileName.length);
        }

        var lineUrl = trace.find((line) => {
          return line.match(stackTraceUrlRegex);
        });
        var linePath = trace.find((line) => {
          return line.match(stackTracePathRegex);
        });
        var lineLocal = trace.find((line) => {
          return line.match(stackTraceLocalRegex);
        });
        var scriptUrl = lineUrl   ? lineUrl.match(stackTraceUrlRegex)[1] :
                        linePath  ? (window.location.href.split('/')[0] + linePath.match(stackTracePathRegex)[1]) :
                        lineLocal ? (window.location.href.split('#')[0]) : 'unknown';
        var callContext = {
          scriptUrl: scriptUrl,
          scriptLine: lineNo,
          scriptCol: columnNo,
          funcName: funcName,
          scriptLocEval: scriptLocEval,
          callStack: getCallStack ? trace.slice(3).join("\n").trim() : ""
        };
        return callContext;
      } catch (e) {
        console.log("Error parsing the script context", e, callSite);
        return empty_context;
      }
    }

    // Counter to cap # of calls logged for each script/api combination
    var maxLogCount = 500;
    var logCounter = new Object();
    function updateCounterAndCheckIfOver(scriptUrl, symbol) {
      var key = scriptUrl + '|' + symbol;
      if ((key in logCounter) && (logCounter[key] >= maxLogCount)) {
        return true;
      } else if (!(key in logCounter)) {
        logCounter[key] = 1;
      } else {
        logCounter[key] += 1;
      }
      return false;
    }

    // Prevent logging of gets arising from logging
    var inLog = false;

    // For gets, sets, etc. on a single value
    function logValue(instrumentedVariableName, value, operation, callContext, logSettings) {
      if(inLog)
        return;
      inLog = true;

      var overLimit = updateCounterAndCheckIfOver(callContext.scriptUrl, instrumentedVariableName);
      if (overLimit) {
        inLog = false;
        return;
      }

      var msg = {
        name: instrumentedVariableName,
        scriptUrl: callContext.scriptUrl
      };

      try {
        send('logValue', msg);
      }
      catch(error) {
        console.log("Unsuccessful value log!");
        logErrorToConsole(error);
      }

      inLog = false;
    }

    // For functions
    function logCall(instrumentedFunctionName, args, callContext, logSettings) {
      if(inLog)
        return;
      inLog = true;

      var overLimit = updateCounterAndCheckIfOver(callContext.scriptUrl, instrumentedFunctionName);
      if (overLimit) {
        inLog = false;
        return;
      }

      try {
        var msg = {
          name: instrumentedFunctionName,
          scriptUrl: callContext.scriptUrl
        }
        send('logCall', msg);
      }
      catch(error) {
        console.log("Unsuccessful call log: " + instrumentedFunctionName);
        logErrorToConsole(error);
      }
      inLog = false;
    }

    // Rough implementations of Object.getPropertyDescriptor and Object.getPropertyNames
    // See http://wiki.ecmascript.org/doku.php?id=harmony:extended_object_api
    Object.getPropertyDescriptor = function (subject, name) {
      var pd = Object.getOwnPropertyDescriptor(subject, name);
      var proto = Object.getPrototypeOf(subject);
      while (pd === undefined && proto !== null) {
        pd = Object.getOwnPropertyDescriptor(proto, name);
        proto = Object.getPrototypeOf(proto);
      }
      return pd;
    };

    Object.getPropertyNames = function (subject, name) {
      var props = Object.getOwnPropertyNames(subject);
      var proto = Object.getPrototypeOf(subject);
      while (proto !== null) {
        props = props.concat(Object.getOwnPropertyNames(proto));
        proto = Object.getPrototypeOf(proto);
      }
      // FIXME: remove duplicate property names from props
      return props;
    };

    /*
     *  Direct instrumentation of javascript objects
     */

    function isObject(object, propertyName) {
      try {
        var property = object[propertyName];
      } catch(error) {
        return false;
      }
      if (property === null) { // null is type "object"
        return false;
      }
      return typeof property === 'object';
    }

    function instrumentObject(object, objectName, logSettings={}) {
      // Use for objects or object prototypes
      //
      // Parameters
      // ----------
      //   object : Object
      //     Object to instrument
      //   objectName : String
      //     Name of the object to be instrumented (saved to database)
      //   logSettings : Object
      //     (optional) object that can be used to specify additional logging
      //     configurations. See available options below.
      //
      // logSettings options (all optional)
      // -------------------
      //   propertiesToInstrument : Array
      //     An array of properties to instrument on this object. Default is
      //     all properties.
      //   excludedProperties : Array
      //     Properties excluded from instrumentation. Default is an empty
      //     array.
      //   logCallStack : boolean
      //     Set to true save the call stack info with each property call.
      //     Default is `false`.
      //   logFunctionsAsStrings : boolean
      //     Set to true to save functional arguments as strings during
      //     argument serialization. Default is `false`.
      //   preventSets : boolean
      //     Set to true to prevent nested objects and functions from being
      //     overwritten (and thus having their instrumentation removed).
      //     Other properties (static values) can still be set with this is
      //     enabled. Default is `false`.
      //   recursive : boolean
      //     Set to `true` to recursively instrument all object properties of
      //     the given `object`. Default is `false`
      //     NOTE:
      //       (1)`logSettings['propertiesToInstrument']` does not propagate
      //           to sub-objects.
      //       (2) Sub-objects of prototypes can not be instrumented
      //           recursively as these properties can not be accessed
      //           until an instance of the prototype is created.
      //   depth : integer
      //     Recursion limit when instrumenting object recursively.
      //     Default is `5`.
      var properties = logSettings.propertiesToInstrument ?
        logSettings.propertiesToInstrument : Object.getPropertyNames(object);
      for (var i = 0; i < properties.length; i++) {
        if (logSettings.excludedProperties &&
            logSettings.excludedProperties.indexOf(properties[i]) > -1) {
          continue;
        }
        // If `recursive` flag set we want to recursively instrument any
        // object properties that aren't the prototype object. Only recurse if
        // depth not set (at which point its set to default) or not at limit.
        if (!!logSettings.recursive && properties[i] != '__proto__' &&
            isObject(object, properties[i]) &&
            (!('depth' in logSettings) || logSettings.depth > 0)) {

          // set recursion limit to default if not specified
          if (!('depth' in logSettings)) {
            logSettings['depth'] = 5;
          }
          instrumentObject(object[properties[i]], objectName + '.' + properties[i], {
                'excludedProperties': logSettings['excludedProperties'],
                'logCallStack': logSettings['logCallStack'],
                'logFunctionsAsStrings': logSettings['logFunctionsAsStrings'],
                'preventSets': logSettings['preventSets'],
                'recursive': logSettings['recursive'],
                'depth': logSettings['depth'] - 1
          });
        }
        try {
          instrumentObjectProperty(object, objectName, properties[i], logSettings);
        } catch(error) {
          logErrorToConsole(error);
        }
      }
    }
    if (testing) {
      window.instrumentObject = instrumentObject;
    }

    // Log calls to a given function
    // This helper function returns a wrapper around `func` which logs calls
    // to `func`. `objectName` and `methodName` are used strictly to identify
    // which object method `func` is coming from in the logs
    function instrumentFunction(objectName, methodName, func, logSettings) {
      return function () {
        var callContext = getOriginatingScriptContext(!!logSettings.logCallStack);
        logCall(objectName + '.' + methodName, arguments, callContext, logSettings);
        return func.apply(this, arguments);
      };
    }

    // Log properties of prototypes and objects
    function instrumentObjectProperty(object, objectName, propertyName, logSettings={}) {

      // Store original descriptor in closure
      var propDesc = Object.getPropertyDescriptor(object, propertyName);
      if (!propDesc){
        return;
      }

      // Instrument data or accessor property descriptors
      var originalGetter = propDesc.get;
      var originalSetter = propDesc.set;
      var originalValue = propDesc.value;

      // We overwrite both data and accessor properties as an instrumented
      // accessor property
      Object.defineProperty(object, propertyName, {
        configurable: true,
        get: (function() {
          return function() {
            var origProperty;
            var callContext = getOriginatingScriptContext(!!logSettings.logCallStack);

            // get original value
            if (originalGetter) { // if accessor property
              origProperty = originalGetter.call(this);
            } else if ('value' in propDesc) { // if data property
              origProperty = originalValue;
            } else {
              console.error("Property descriptor for",
                            objectName + '.' + propertyName,
                            "doesn't have getter or value?");
              logValue(objectName + '.' + propertyName, "",
                  "get(failed)", callContext, logSettings);
              return;
            }

            // Log `gets` except those that have instrumented return values
            // * All returned functions are instrumented with a wrapper
            // * Returned objects may be instrumented if recursive
            //   instrumentation is enabled and this isn't at the depth limit.
            if (typeof origProperty == 'function') {
              logValue(objectName + '.' + propertyName, origProperty, "get", callContext, logSettings);
              return instrumentFunction(objectName, propertyName, origProperty, logSettings);
            } else if (typeof origProperty == 'object' &&
              !!logSettings.recursive &&
              (!('depth' in logSettings) || logSettings.depth > 0)) {
              return origProperty;
            } else {
              logValue(objectName + '.' + propertyName, origProperty,
                  "get", callContext, logSettings);
              return origProperty;
            }
          }
        })(),
        set: (function() {
          return function(value) {
            var callContext = getOriginatingScriptContext(!!logSettings.logCallStack);
            var returnValue;

            // Prevent sets for functions and objects if enabled
            if (!!logSettings.preventSets && (
                typeof originalValue === 'function' ||
                typeof originalValue === 'object')) {
              logValue(objectName + '.' + propertyName, value,
                  "set(prevented)", callContext, logSettings);
              return value;
            }

            // set new value to original setter/location
            if (originalSetter) { // if accessor property
              returnValue = originalSetter.call(this, value);
            } else if ('value' in propDesc) { // if data property
              originalValue = value;
              returnValue = value;
            } else {
              console.error("Property descriptor for",
                            objectName + '.' + propertyName,
                            "doesn't have setter or value?");
              logValue(objectName + '.' + propertyName, value,
                  "set(failed)", callContext, logSettings);
              return value;
            }

            // log set
            logValue(objectName + '.' + propertyName, value,
                "set", callContext, logSettings);

            // return new value
            return returnValue;
          }
        })()
      });
    }

    /*
     * Start Instrumentation
     */
    // TODO: user should be able to choose what to instrument

    // Access to navigator properties
    var navigatorProperties = [ "appCodeName", "appName", "appVersion",
                                "buildID", "cookieEnabled", "doNotTrack",
                                "geolocation", "language", "languages",
                                "onLine", "oscpu", "platform", "product",
                                "productSub", "userAgent", "vendorSub",
                                "vendor", "browserLanguage", "userLanguage",
                                "appName", "cpuClass" , "mimeTypes", "plugins",
                                "deviceMemory", "hardwareConcurrency",
                                "maxTouchPoints"];
    navigatorProperties.forEach(function(property) {
      instrumentObjectProperty(window.navigator, "window.navigator", property);
    });

    // Access to screen properties
    //instrumentObject(window.screen, "window.screen");
    // TODO: why do we instrument only two screen properties
    var screenProperties =  [ "pixelDepth", "colorDepth", "width", "height", "availWidth", "availHeight" ];
    screenProperties.forEach(function(property) {
      instrumentObjectProperty(window.screen, "window.screen", property);
    });

    // Name, localStorage, and sessionsStorage logging
    // Instrumenting window.localStorage directly doesn't seem to work, so the Storage
    // prototype must be instrumented instead. Unfortunately this fails to differentiate
    // between sessionStorage and localStorage. Instead, you'll have to look for a sequence
    // of a get for the localStorage object followed by a getItem/setItem for the Storage object.
    var windowProperties = [ "name", "localStorage", "sessionStorage",
      "WebGLRenderingContext", "devicePixelRatio", "indexedDB", "openDatabase"
    ];
    windowProperties.forEach(function(property) {
      instrumentObjectProperty(window, "window", property);
    });
    instrumentObject(window.Storage.prototype, "window.Storage");

    // Access to document.cookie
    instrumentObjectProperty(window.document, "window.document", "cookie", {
      logCallStack: true
    });

    // Access to canvas
    instrumentObject(window.HTMLCanvasElement.prototype,"HTMLCanvasElement");

    var excludedProperties = [ "quadraticCurveTo", "lineTo", "transform",
                               "globalAlpha", "moveTo", "drawImage",
                               "setTransform", "clearRect", "closePath",
                               "beginPath", "canvas", "translate" ];
    instrumentObject(
        window.CanvasRenderingContext2D.prototype,
        "CanvasRenderingContext2D",
        {'excludedProperties': excludedProperties}
    );

    instrumentObjectProperty(window.Date.prototype, "window.Date", "getTimezoneOffset");

    // Access to webRTC
    instrumentObject(window.RTCPeerConnection.prototype,"RTCPeerConnection");

    // Access to Audio API
    instrumentObject(window.AudioContext.prototype, "AudioContext");
    instrumentObject(window.OfflineAudioContext.prototype, "OfflineAudioContext");
    instrumentObject(window.OscillatorNode.prototype, "OscillatorNode");
    instrumentObject(window.AnalyserNode.prototype, "AnalyserNode");
    instrumentObject(window.GainNode.prototype, "GainNode");
    instrumentObject(window.ScriptProcessorNode.prototype, "ScriptProcessorNode");

    console.debug("Privacy Crawler: Successfully started all instrumentation.");
}

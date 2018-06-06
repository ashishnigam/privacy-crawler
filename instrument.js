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

  // Intrumentation injection code is based on OpenWPM, in-tern based on privacybadgerfirefox
  // https://github.com/EFForg/privacybadgerfirefox/blob/master/data/fingerprinting.js

  // https://stackoverflow.com/a/27078401
  function throttle(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : Date.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = Date.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = originalTimeout(later, remaining);
      }
      return result;
    };
  }

  var send = (function () {
    var messages = [];
    var _send = throttle(function () {
      document.dispatchEvent(new CustomEvent(event_id, {
        detail: messages
      }));

      messages = [];
    }, 100);

    return function (msgType, msg) {
      messages.push({'type':msgType,'content':msg});
      _send();
    };
  }());

  var event_id = document.currentScript.getAttribute('data-event-id');

  function logErrorToConsole(error) {
    console.log("Error name: " + error.name);
    console.log("Error message: " + error.message);
    console.log("Error filename: " + error.fileName);
    console.log("Error line number: " + error.lineNumber);
    console.log("Error stack: " + error.stack);
  }

  function getStackTrace() {
    var stack;

    try {
      throw new Error();
    } catch (err) {
      stack = err.stack;
    }

    return stack;
  }

  var stackTraceUrlRegex = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&//=,]*)):\d+:\d+/
  var stackTracePathRegex = /\((\/.+):\d+:\d+\)/;
  var stackTraceLocalRegex = /\((.+):\d+:\d+\)/;
  function getOriginatingScriptContext() {
    var trace = getStackTrace().trim().split('\n');

    try {
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
    } catch (e) {
      console.log("Error parsing the script context", e, callSite);
      scriptUrl = 'unknown';
    }
    return {
      scriptUrl: scriptUrl
    };
  }

  // Counter to cap # of calls logged for each script/api combination
  var maxLogCount = 500;
  var logCounter = new Object();
  function updateCounterAndCheckIfOver(scriptUrl, symbol) {
    var key = '___URL___' + scriptUrl + '___SYMBOL___' + symbol;
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
  function logValue(instrumentedVariableName, callContext) {
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
  function logCall(instrumentedFunctionName, callContext) {
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
  function getPropertyDescriptor(subject, name) {
    var pd = Object.getOwnPropertyDescriptor(subject, name);
    var proto = Object.getPrototypeOf(subject);
    while (pd === undefined && proto !== null) {
      pd = Object.getOwnPropertyDescriptor(proto, name);
      proto = Object.getPrototypeOf(proto);
    }
    return pd;
  };

  function getPropertyNames(subject, name) {
    var props = Object.getOwnPropertyNames(subject);
    var proto = Object.getPrototypeOf(subject);
    while (proto !== null) {
      props = props.concat(Object.getOwnPropertyNames(proto));
      proto = Object.getPrototypeOf(proto);
    }
    // FIXME: remove duplicate property names from props
    return props;
  };

  function isObject(object, propertyName) {
    try {
      var property = object[propertyName];
    } catch(error) {
      return false;
    }
    if (property === null) {
      return false;
    }
    return typeof property === 'object';
  }

  function instrumentObject(object, objectName, logSettings={}) {
    var properties = getPropertyNames(object);
    var exclude = logSettings.excludedProperties || [];
    for (var i = 0; i < properties.length; i++) {
      if (exclude.indexOf(properties[i]) !== -1) {
        continue;
      }
      try {
        instrumentObjectProperty(object, objectName, properties[i], logSettings);
      } catch(error) {
        logErrorToConsole(error);
      }
    }
  }

  function instrumentFunction(objectName, methodName, func) {
    return function () {
      var callContext = getOriginatingScriptContext();
      logCall(objectName + '.' + methodName, callContext);
      return func.apply(this, arguments);
    };
  }

  function instrumentObjectProperty(object, objectName, propertyName, logSettings={}) {

    var propDesc = getPropertyDescriptor(object, propertyName);
    if (!propDesc) {
      return;
    }

    var originalGetter = propDesc.get;
    var originalSetter = propDesc.set;
    var originalValue = propDesc.value;

    Object.defineProperty(object, propertyName, {
      configurable: true,
      get: function() {
        var origProperty;
        var callContext = getOriginatingScriptContext();

        if (originalGetter) {
          origProperty = originalGetter.call(this);
        } else if ('value' in propDesc) { 
          origProperty = originalValue;
        } else {
          console.error("Property descriptor for", objectName + '.' + propertyName, "doesn't have getter or value?");
          logValue(objectName + '.' + propertyName, callContext);
          return;
        }

        if (typeof origProperty == 'function') {
          logValue(objectName + '.' + propertyName, callContext);
          return instrumentFunction(objectName, propertyName, origProperty);
        } else {
          logValue(objectName + '.' + propertyName, callContext);
          return origProperty;
        }
      },
      set: function(value) {
        var callContext = getOriginatingScriptContext();
        var returnValue;

        if (originalSetter) {
          returnValue = originalSetter.call(this, value);
        } else if ('value' in propDesc) {
          originalValue = value;
          returnValue = value;
        } else {
          console.error("Property descriptor for", objectName + '.' + propertyName, "doesn't have setter or value?");
          returnValue = value;
        }

        logValue(objectName + '.' + propertyName, callContext);
        return returnValue;
      }
    });
  }

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

  instrumentObjectProperty(window.document, "window.document", "cookie");

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

  instrumentObject(window.RTCPeerConnection.prototype,"RTCPeerConnection");

  instrumentObject(window.AudioContext.prototype, "AudioContext");
  instrumentObject(window.OfflineAudioContext.prototype, "OfflineAudioContext");
  instrumentObject(window.OscillatorNode.prototype, "OscillatorNode");
  instrumentObject(window.AnalyserNode.prototype, "AnalyserNode");
  instrumentObject(window.GainNode.prototype, "GainNode");
  instrumentObject(window.ScriptProcessorNode.prototype, "ScriptProcessorNode");

  console.debug("Privacy Crawler: Successfully started all instrumentation.");
}

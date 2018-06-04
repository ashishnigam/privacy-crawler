var settings = {
    get maxDepth() { return localStorage["max-crawl-depth"]!=null?localStorage["max-crawl-depth"]:2; },
    set maxDepth(val) { localStorage['max-crawl-depth'] = val; },
    get root() { return localStorage["root"]!=null?localStorage["root"]:""; },
    set root(val) { localStorage['root'] = val; },
}

function startsWith(s, str){
    return (s.indexOf(str) === 0);
}

function tabQuery(query) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query(query, resolve);
    });
}

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

function timeout(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

function symbolKey(symbol) {
    return '__URL__' + symbol.scriptUrl + '__NAME__' + symbol.name;
}

function uniq(a, keyFunc) {
    var seen = {};
    return a.filter(function(item) {
        var key = keyFunc(item);
        return (key in seen) ? false : (seen[key] = true);
    });
}

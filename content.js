var event_id = Math.random();

// Setting the text of the script rather than using src,
// since this results in the script running before existing
// ones in the page
var scriptElement = document.createElement('script');
scriptElement.text = '(' + instrument + ')();'
scriptElement.setAttribute('data-event-id', event_id);
scriptElement.async = false;
scriptElement.onload = () => {
    scriptElement.remove();
};

var parent = document.documentElement;
parent.insertBefore(scriptElement, parent.firstChild);

var symbols_accessed = [];
var symbolNames = {};
document.addEventListener(event_id, (e) => {
    e.detail.forEach((d) => {
        var name = d.content.symbol;
        if (!(name in symbolNames)) {
            symbolNames[name] = true;
            symbols_accessed.push({
                name: name,
                scriptUrl: d.content.scriptUrl,
            });
        }
    });
});

function timeout(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

var port = chrome.runtime.connect();

var loaded = new Promise((resolve, reject) => {
    window.addEventListener('load', () => {
        resolve();
    });
});

loaded.then(() => {
    return timeout(1000);
}).then(() => {
    var links = Array.from(document.body.getElementsByTagName("a")).map(function(a) {
        return a.href;
    });
    port.postMessage({links: links, symbols_accessed: symbols_accessed});
});

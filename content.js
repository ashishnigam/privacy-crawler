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
        var key = symbolKey(d.content);
        if (!(key in symbolNames)) {
            symbolNames[key] = true;
            symbols_accessed.push({
                name: d.content.name,
                scriptUrl: d.content.scriptUrl,
            });
        }
    });
});

var loaded = new Promise((resolve, reject) => {
    window.addEventListener('load', () => {
        resolve();
    });
});

function onMessage(type) {
    return new Promise((resolve, reject) => {
        var listener = (message, sender, sendResponse) => {
            if (message.type == type) {
                resolve(message);
                chrome.runtime.onMessage.removeListener(listener);
            }
        }
        chrome.runtime.onMessage.addListener(listener);
    });
}

async function sendAnalysisOnNextRequest(type) {
    console.debug('Privacy Crawler: content script waiting for message');
    var requestPromise = onMessage('get_analysis');
    await loaded;
    await timeout(1000);
    var request = await requestPromise;
    console.debug('Privacy Crawler: content script received message', request);

    var links = Array.from(document.body.getElementsByTagName("a")).map(function(a) {
        return a.href;
    });
    console.debug('Privacy Crawler: content script sending message');
    chrome.runtime.sendMessage({
        type: 'get_analysis_response',
        url: request.url,
        links: links,
        symbols_accessed: symbols_accessed
    });

    symbols_accessed = [];
    sendAnalysisOnNextRequest();
}
sendAnalysisOnNextRequest();

// This could be an iframe loaded after we started pausing, so we continue
// until we've stopped
function disablePatching() {
    document.dispatchEvent(new CustomEvent(event_id + '-patching-disable'))
}
function shouldDisable(appState) {
    return appState == 'stopped' || appState == 'paused';
}
chrome.runtime.sendMessage({message: 'app_state_request'}, (app_state) => {
    if (shouldDisable(app_state)) {
        disablePatching();
    }
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message == 'app_state' && shouldDisable(request.app_state)) {
        disablePatching();
    }
});

var tabs = ["Report","Queued","Crawling","Crawled","Errors"];
var allPages = {};
var allCookiesSeen = {};
var allCookies = [];
var allSymbolsSeen = {};
var allSymbols = {};
var startingPages = [];
var latestUpdate = new Date();
var appState = "stopped";

var targetTabId = null;

// If the tab isn't complete, or we get no response to messages
// then we'll fail the page with an error
var pageLoadTimeout = 10000;

// There are multiple content scripts, i.e. from iframes
// so we need a bit of state to accumulate them
var _anaylses = {};

// We can't predict how many messages well have: one for each iframe
// Hopefully it's reasonable to wait 500ms after each message to see
// if more will appear.
var _anaylsesDebounceTimeout = 500;
chrome.runtime.onMessage.addListener((message) => {
    if (message.type != 'get_analysis_response') return;
    if (!(message.url in _anaylses)) return;
    var url = message.url;
    _anaylses[url] = _anaylses[url] || {};
    _anaylses[url].links = (_anaylses[url].links || []).concat(message.links);
    _anaylses[url].symbols_accessed = (_anaylses[url].symbols_accessed || []).concat(message.symbols_accessed);
    _anaylses[url].done(_anaylses[url]);
});

function getAnalysis(tabId, url) {
    _anaylses[url] = {};
    sendMessage(tabId, {
        type: 'get_analysis',
        url: url
    });

    return new Promise((resolve, reject) => {
        _anaylses[url].done = debounce(() => {
            resolve(_anaylses[url]);
            delete _anaylses[url];
        }, _anaylsesDebounceTimeout);
    });
}

async function beginCrawl(url, maxDepth) { 
    reset();    
    appState = "crawling";
    settings.root = url;
    settings.maxDepth = maxDepth;
    var urls = url.split(',');
    urls.forEach((singleUrl) => {
        allPages[singleUrl] = {url:singleUrl, state:"queued", depth:0};
    });
    startingPages = urls;
    var allCookies = await getCookies();
    console.log("Privacy Crawler: Deleting all cookies");
    await Promise.all(allCookies.map(removeCookie));
    console.log("Privacy Crawler: All cookies deleted");

    var tabs = await tabQuery({active: true, currentWindow: true});
    targetTabId = tabs[0].id;

    crawlMore();
}

function getCookies() {
    return new Promise((resolve, reject) => {
        chrome.cookies.getAll({}, resolve);
    });
}

function removeCookie(cookie) {
    var url = (cookie.secure ? "https" : "http") + "://" + cookie.domain + cookie.path;
    return new Promise((resolve, reject) => {
        chrome.cookies.remove({"url": url, "name": cookie.name}, (details) => {
            details === null ? reject() : resolve();
        });
    });  
};

function onTabStatusComplete(tabId) {
    return new Promise((resolve, reject) => {
        var listener = (updatedTabId, info) => {
            if (updatedTabId == tabId && info.status == 'complete') {
                resolve();
                chrome.tabs.onUpdated.removeListener(listener);
            }
        }
        chrome.tabs.onUpdated.addListener(listener);
    });
}

function sendMessage(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, resolve);
    });
}

function cookieKey(cookie) {
    return  '___DOMAIN___' + cookie.domain + "___NAME___" + cookie.name + "___PATH___" + cookie.path;
}

async function crawlPage(page) {
    chrome.tabs.update(targetTabId, {
        url: page.url
    });

    await onTabStatusComplete(targetTabId);

    // Wait for page (and iframes) to load
    await timeout(1000);

    var analysis = await getAnalysis(targetTabId, page.url);
    var newPages = analysis.links.filter(function(linkURL) {
        var anyStartsWith = startingPages.some(function(startingPage) {
            return startsWith(linkURL, startingPage);
        });
        return anyStartsWith && !allPages[linkURL];
    }).map((linkURL) => {
        return {
            depth: page.depth+1,
            url: linkURL,
            state: page.depth == settings.maxDepth ? "max_depth" : "queued"
        }
    });

    return [newPages, analysis.symbols_accessed];
}

async function getNewCookies(page) {
    var cookies = await getCookies();

    return cookies.filter(function(cookie) {
        return !(cookieKey(cookie) in allCookiesSeen)
    }).map((cookie) => {
        var expires = cookie.session ? 'session' : dateFns.distanceInWordsStrict(
            new Date(),
            cookie.expirationDate * 1000,
            {partialMethod: 'ceil'}
        );
        return {
            domain: cookie.domain,
            path: cookie.path,
            name: cookie.name,
            expirationDate: expires,
            firstSeen: page.url,
            firstValue: cookie.value
        };
    });
}

function getNewSymbols(page, symbols) {
    return symbols.filter((symbol) => {
        return !(symbolKey(symbol) in allSymbolsSeen);
    }).map((symbol) => {
        return {
            name: symbol.name,
            scriptUrl: symbol.scriptUrl,
            firstSeen: page.url,
            isExtraSuspicious: isExtraSuspicious(symbol.name)
        };
    });
}

function timeoutUntilReject(ms, message) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(message);
        }, ms);
    });
}

async function crawlMore() {
    appState = "crawling";

    while (appState == "crawling" && getURLsInTab("Queued").length > 0) {
        var page = getURLsInTab("Queued")[0];
        page.state = "crawling";
        refreshPage();

        var newPages;
        var symbolsAccessed;
        try {
            console.log("Privacy Crawler: Crawling " + page.url);
            [newPages, symbolsAccessed] = await Promise.race([crawlPage(page), timeoutUntilReject(pageLoadTimeout)]);
            console.log("Privacy Crawler: Crawled " + page.url);
        } catch(e) {
            console.error("Privacy Crawler: Error crawling " + page.url, e);
            page.state = "error";
            newPages = [];
            symbolsAccessed = [];
        } finally {
            page.state = page.state != "error" ? "crawled" : page.state;
        }

        newPages.forEach(function(page) {
            allPages[page.url] = page;
        });

        // Even in the case of error, cookies, might have changed
        var newCookies = await getNewCookies(page);
        newCookies.forEach(function(cookie) {
            allCookiesSeen[cookieKey(cookie)] = true
            allCookies.push(cookie)
        });

        getNewSymbols(page, symbolsAccessed).forEach((symbol) => {
            allSymbolsSeen[symbolKey(symbol)] = true;
            allSymbols[symbol.scriptUrl] = allSymbols[symbol.scriptUrl] || [];
            allSymbols[symbol.scriptUrl].push(symbol);
        });

        // Sort each in place
        Object.values(allSymbols).forEach((symbolList) => {
            symbolList.sort((a, b) => {
                return  isExtraSuspicious(a.name) && !isExtraSuspicious(b.name) ? -1 :
                       !isExtraSuspicious(a.name) &&  isExtraSuspicious(b.name) ?  1 :
                       a.name < b.name                                          ? -1 :
                       a.name > b.name                                          ?  1 :
                       0;
            });
        });

        var sortedAllValues = Object.values(allSymbols).sort((a, b) => {
            var numExtraSuspiciousA = a.filter((symbol) => {
                return isExtraSuspicious(symbol.name);
            }).length;
            var numA = a.length;
            var numExtraSuspiciousB = b.filter((symbol) => {
                return isExtraSuspicious(symbol.name);
            }).length;
            var numB = b.length;
            return numExtraSuspiciousA < numExtraSuspiciousB ?  1 :
                   numExtraSuspiciousA > numExtraSuspiciousB ? -1 :
                   numA < numB                               ?  1 :
                   numA > numB                               ? -1 :
                   a[0].scriptUrl < b[0].scriptUrl           ? -1 :
                   a[0].scriptUrl > b[0].scriptUrl           ?  1 :
                   a[0].firstSeen < b[0].firstSeen           ? -1 :
                   a[0].firstSeen > b[0].firstSeen           ?  1 :
                   0;
        });
        allSymbols = {};
        sortedAllValues.forEach((symbols) => {
            allSymbols[symbols[0].scriptUrl] = symbols;
        });

        latestUpdate = new Date();
    }

    // We are either finished, or we have paused
    appState = (appState == "pausing" && getURLsInTab("Queued").length) ? "paused" : "stopped";
    refreshPage();
}

function getURLsInTab(tab) {
    return Object.values(allPages).filter((o) => {
        return (tab=="Queued"   && o.state=="queued")   ||
               (tab=="Crawling" && o.state=="crawling") ||
               (tab=="Crawled"  && o.state=="crawled")  ||
               (tab=="Errors"   && o.state=="error");
    });
}

function pause() {
    appState = "pausing";
    refreshPage();
}

function stop() {
    appState = "stopped";
    refreshPage();
}

function reset() {
    console.log('resetting');
    appState = "stopped";

    allPages = {};  
    allCookiesSeen = {};
    allCookies = [];
    allSymbolsSeen = {};
    allSymbols = {};
    refreshPage();
}

function setBadgeText() {
    var text = appState == 'crawling' || appState == 'pausing' ? '▶' : '';
    chrome.browserAction.setBadgeText({tabId: targetTabId, text: text});
}

function refreshPage() {
    chrome.runtime.sendMessage({message: "refresh_page", tabId: targetTabId});
    setBadgeText();
}

// There doesn't seem to be a nicer way to get Chrome to consistently use
// a different icon in incognito. Might have to try to have the same icon
// that looks ok in both
function setLightIcon(tabId) {
    chrome.browserAction.setIcon({path: 'images/paws_light.png', tabId: tabId});
    setBadgeText();
}

if (chrome.extension.inIncognitoContext) {
    (async function setIcon() {
        var tabs = await tabQuery({active: true, currentWindow: true});
        setLightIcon(tabs[0].id);
        setBadgeText();
    })();

    chrome.tabs.onCreated.addListener((tab) => {
        setLightIcon(tab.id);
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        setLightIcon(tab.id);
        setBadgeText();
    });
}

// The report is ordered with these at the top
var extraSuspicious = [
    'AnalyserNode',
    'AudioContext',
    'CanvasRenderingContext2D',
    'GainNode',
    'HTMLCanvasElement',
    'OfflineAudioContext',
    'OscillatorNode',
    'RTCPeerConnection',
    'ScriptProcessorNode'
];

function isExtraSuspicious(name) {
    return extraSuspicious.some((extraSuspiciousName) => {
        return name.includes(extraSuspiciousName);
    });
}

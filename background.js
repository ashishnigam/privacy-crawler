var tabs = ["Queued","Crawling","Crawled","Errors","Cookies"];
var allPages = {};
var allCookiesSeen = {};
var allCookies = [];
var startingPages = [];
var appState = "stopped";

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
    console.log("Deleting all cookies");
    await Promise.all(allCookies.map(removeCookie));
    console.log("All cookies deleted");
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

// Working around slightly annoying tab update API: you can't
// remove listeners, and you can't just listen to one tab
_onTabUpdated = (tabId, info) => {
    onTabUpdated.forEach((func) => {
        func(tabId, info);
    });
}
onTabUpdated = []
chrome.tabs.onUpdated.addListener(_onTabUpdated);
function onTabStatusComplete(tabId) {
    return new Promise((resolve, reject) => {
        var newOnTabUpdated = (updatedTabId, info) => {
            if (updatedTabId == tabId && info.status == 'complete') {
                resolve();
                onTabUpdated.splice(newLength - 1, 1);
            }
        }
        var newLength = onTabUpdated.push(newOnTabUpdated);
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

async function crawlPage(page)
{
    console.log("Starting Crawl --> "+JSON.stringify(page));

    var tabs = await tabQuery({active: true, currentWindow: true});
    chrome.tabs.update(tabs[0].id, {
        url: page.url
    });
    await onTabStatusComplete(tabs[0].id);

    var response = await sendMessage(tabs[0].id, {text: 'get_analysis'});
    console.log('error',  chrome.runtime.lastError);
    if (response == null) {
        throw new Error('No response from page');
    }

    console.log(response.symbols_accessed);
    var newPages = (response && response.links ? response.links : []).filter(function(linkURL) {
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

    console.log("Page Crawled --> "+JSON.stringify({page:page, counts:newPages.length}));
    return newPages;
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
            firstSeen: page.url
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
        chrome.runtime.sendMessage({message: "refresh_page"});

        try {
            var newPages = await Promise.race([crawlPage(page), timeoutUntilReject(10000)]);
        } catch(e) {
            page.state = "error";
        } finally {
            page.state = page.state != "error" ? "crawled" : page.state;
        }

        if (page.state != "error") {
            newPages.forEach(function(page) {
                allPages[page.url] = page;
            });
        }

        // Even in the case of error, cookies, might have changed
        var newCookies = await getNewCookies(page);
        newCookies.forEach(function(cookie) {
            allCookiesSeen[cookieKey(cookie)] = true
            allCookies.push(cookie)
        });
    }

    // We are either finished, or we have paused
    appState = (appState == "paused" && getURLsInTab("Queued").length) ? "paused" : "stopped";
    chrome.runtime.sendMessage({message: "refresh_page"});
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
    appState = "paused";
    chrome.runtime.sendMessage({message: "refresh_page"});
}

function stop() {
    appState = "stopped";
    chrome.runtime.sendMessage({message: "refresh_page"});
}

function reset() {
    console.log('resetting');
    appState = "stopped";

    allPages = {};  
    allCookiesSeen = {};
    allCookies = [];
    chrome.runtime.sendMessage({message: "refresh_page"});
}

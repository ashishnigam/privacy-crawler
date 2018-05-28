var tabs = ["Queued","Crawling","Crawled","Errors","Cookies"];
var allPages = {};
var allCookiesSeen = {};
var allCookies = [];
var startingPage = {};
var appState = "stopped";

async function beginCrawl(url, maxDepth) { 
    reset();    
    appState = "crawling";
    settings.root = url;
    settings.maxDepth = maxDepth;
    allPages[url] = {url:url, state:"queued", depth:0};
    startingPage = allPages[url];
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

async function crawlPage(page)
{
    console.log("Starting Crawl --> "+JSON.stringify(page));

    var tabs = await tabQuery({active: true, currentWindow: true});
    chrome.tabs.update(tabs[0].id, {
        url: page.url
    });
    await onTabStatusComplete(tabs[0].id);

    var response = await sendMessage(tabs[0].id, {text: 'get_links'});
    console.log('error',  chrome.runtime.lastError);

    var newLinks = (response && response.links ? response.links : []).filter(function(linkURL) {
        return startsWith(linkURL, startingPage.url) && !allPages[linkURL];
    })
    newLinks.forEach(function(linkURL) {  
        allPages[linkURL] = {
            depth: page.depth+1,
            url: linkURL,
            state: page.depth == settings.maxDepth ? "max_depth" : "queued"
        }
    });

    console.log("Page Crawled --> "+JSON.stringify({page:page, counts:newLinks.length}));

    allPages[page.url].state = response ? "crawled" : "error";  

    var cookies = await getCookies();
    function cookieKey(cookie) {
        return  '___DOMAIN___' + cookie.domain + "___NAME___" + cookie.name + "___PATH___" + cookie.path;
    }
    var newCookies = cookies.filter(function(cookie) {
        return !(cookieKey(cookie) in allCookiesSeen)
    });
    newCookies.forEach(function(cookie) {
        allCookiesSeen[cookieKey(cookie)] = true
        allCookies.push({
            domain: cookie.domain,
            path: cookie.path,
            name: cookie.name,
            expirationDate: cookie.session ? 'session' : moment.unix(cookie.expirationDate).fromNow(true),
            firstSeen: page.url
        })
    });
}

async function crawlMore() {
    appState = "crawling";

    while (appState == "crawling" && getURLsInTab("Queued").length > 0) {
        var page = getURLsInTab("Queued")[0];
        page.state = "crawling";
        chrome.runtime.sendMessage({message: "refresh_page"});
        await crawlPage(page);
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

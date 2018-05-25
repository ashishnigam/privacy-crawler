var tabs = ["Queued","Crawling","Crawled","Errors","Cookies"];
var allPages = {};
var allCookiesSeen = {};
var allCookies = [];
var crawlStartURL = settings.root;
var startingPage = {};
var appState = "stopped";

function beginCrawl(url)
{   
    reset();    
    appState = "crawling";
    settings.root = url;
    crawlStartURL = url;    
    allPages[url] = {url:url, state:"queued", depth:0};
    startingPage = allPages[url];
    crawlMore();
}

function tabQuery(query) {
    return new Promise((resolve, reject) => {
         chrome.tabs.query(query, resolve);
    });
}

function getCookies() {
    return new Promise((resolve, reject) => {
        chrome.cookies.getAll({}, resolve);
    });
}

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
    page.state = "crawling";
    
    console.log("Starting Crawl --> "+JSON.stringify(page));

    var tabs = await tabQuery({active: true, currentWindow: true});
    chrome.tabs.update(tabs[0].id, {
        url: page.url
    });
    await onTabStatusComplete(tabs[0].id);

    var links = await sendMessage(tabs[0].id, {text: 'get_links'});
    console.log('error',  chrome.runtime.lastError);

    var cookies = await getCookies();
    onCrawlPageLoaded(page, links.links, cookies);
}

function onCrawlPageLoaded(page, links, cookies)
{   
    // Loop through each
    var newLinks = links.filter(function(linkURL) {
        return startsWith(linkURL, startingPage.url) && !allPages[linkURL];
    })
    newLinks.forEach(function(linkURL) {  
        allPages[linkURL] = {
            depth: page.depth+1,
            url: linkURL,
            state: page.depth == settings.maxDepth ? "max_depth" : "queued"
        }
    });
    
    // Debugging is good
    console.log("Page Crawled --> "+JSON.stringify({page:page, counts:newLinks.length}));
    
    // This page is crawled
    allPages[page.url].state = "crawled";  

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
    while (appState == "crawling" && getURLsInTab("Crawling").length < 1 && getURLsInTab("Queued").length > 0) {
        await crawlPage(getURLsInTab("Queued")[0]);
    }
}

function getURLsInTab(tab)
{
    return Object.values(allPages).filter((o) => {
        return (tab=="Queued"   && o.state=="queued")   ||
               (tab=="Crawling" && o.state=="crawling") ||
               (tab=="Crawled"  && o.state=="crawled")  ||
               (tab=="Errors"   && o.state=="error");
    });
}

function reset() 
{
    allPages = {};  
    allCookiesSeen = {};
    allCookies = [];
}
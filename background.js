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

function getCookies() {
    return new Promise((resolve, reject) => {
        chrome.cookies.getAll({}, resolve);
    });
}

function crawlPage(page)
{
    page.state = "crawling";
    
    console.log("Starting Crawl --> "+JSON.stringify(page));

    function gotLinks(links) {
        console.log('error',  chrome.runtime.lastError);
        getCookies().then((cookies) => {
            onCrawlPageLoaded(page, links.links, cookies);
        })
    }

    var getLinksSent = false;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        console.log('active tabs', tabs);
        chrome.tabs.onUpdated.addListener(function (tabId , info) {
           if (info.status === 'complete' && !getLinksSent) {
              chrome.tabs.sendMessage(tabs[0].id, {text: 'get_links'}, gotLinks);  
              getLinksSent = true; 
           }
        });

        chrome.tabs.update(tabs[0].id, {
            url: page.url
        });
    });
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

    // Check to see if anything else needs to be crawled
    crawlMore();    
}

function crawlMore() 
{   
    if(appState!="crawling"){ return; }
    while(getURLsInTab("Crawling").length<1 && getURLsInTab("Queued").length>0)
    {
        crawlPage(getURLsInTab("Queued")[0]);
    }
}

function getURLsInTab(tab)
{
    var tabUrls = [];   
    for(var ref in allPages) 
    {
        var o = allPages[ref];
        if(tab=="Queued" && o.state=="queued" && !o.isFile){ tabUrls.push(o); }
        else if(tab=="Crawling" && o.state=="crawling"){ tabUrls.push(o); }
        else if(tab=="Crawled" && o.state=="crawled"){ tabUrls.push(o); }
        else if(tab=="Errors" && o.state=="error"){ tabUrls.push(o); }  
    };      
    return tabUrls;
}

function reset() 
{
    allPages = {};  
    allCookiesSeen = {};
    allCookies = [];
}
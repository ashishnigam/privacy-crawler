var tabs = ["Queued","Crawling","Crawled","Errors"];
var allPages = {};
var crawlStartURL = null;
var startingPage = {};
var appState = "stopped";

function beginCrawl(url)
{   
    reset();    
    appState = "crawling";
    crawlStartURL = url;    
    allPages[url] = {url:url, state:"queued", depth:0};
    startingPage = allPages[url];
    crawlMore();
}

function crawlPage(page)
{
    page.state = "crawling";
    
    console.log("Starting Crawl --> "+JSON.stringify(page));

    function gotLinks(links) {
        console.log('error',  chrome.runtime.lastError);
        onCrawlPageLoaded(page, links.links);
        chrome.cookies.getAll({}, function(cookies) {
            console.log(cookies); 
        });
    }

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        console.log('active tabs', tabs);

        chrome.tabs.onUpdated.addListener(function (tabId , info) {
           if (info.status === 'complete') {
             chrome.tabs.sendMessage(tabs[0].id, {text: 'get_links'}, gotLinks);    
           }
        });

        chrome.tabs.update(tabs[0].id, {
            url: page.url
        });
    });
}

function onCrawlPageLoaded(page, links)
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
}
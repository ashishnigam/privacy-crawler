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
    allPages[url] = {url:url, state:"queued", depth:0, parsed:parseUri(url)};
    startingPage = allPages[url];
    crawlMore();
}

function crawlPage(page)
{
    page.state = "crawling";
    page.parsed = parseUri(page.url);
    
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
    // We want to count some of the following
    var counts = {newValids:0}
    
    // Loop through each
    links.forEach(function(linkURL)
    {
        var absoluteURL = linkURL;  
        var parsed = parseUri(linkURL);
        var protocol = parsed["protocol"];                  

        if ((protocol == "http" || protocol == "https") && !allPages[absoluteURL])
        {           
            // Increment the count
            counts.newValids++;
            
            // Build the page object
            var o = {
                depth: page.depth+1,
                url: absoluteURL,
                state: page.depth == settings.maxDepth ? "max_depth" : "queued"
            };

            //console.log(JSON.stringify(o));

            // Save the page in our master array
            allPages[absoluteURL] = o;      
        }
        
    });
    
    // Debugging is good
    console.log("Page Crawled --> "+JSON.stringify({page:page, counts:counts}));
    
    // This page is crawled
    allPages[page.url].state = "crawled";       
    
    // Check to see if anything else needs to be crawled
    crawlMore();    
    
    // Render the changes
    //refreshPage();
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
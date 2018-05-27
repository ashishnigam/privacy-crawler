var currentTab = "Queued";
var bgPage = chrome.extension.getBackgroundPage();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message == 'refresh_page') refreshPage();
});

document.addEventListener('DOMContentLoaded', function() {
    $('#crawlButton').on('click', onCrawlClicked);
    $('#resetButton').on('click', onResetClicked);

    $(document.body).on('click', '.open-tab-button', function(e) {
        e.preventDefault();
        var tab = $(e.target).data('tab');
        openTab(tab);
    });

    $(document.body).on('click', '.link', function(e) {
       e.preventDefault();
       onLIURLClicked(e.target.href);
   });

    $(document.body).on('click', '.cookies-copy-to-clipboard', function(e) {
        e.preventDefault();
        copyToClipboard($('#cookies-csv').text())
        $(e.target).after('<span>Copied to clipboard</span>');
    });

    onLoad();
}, false);

function onLoad() 
{   
    var u = bgPage.crawlStartURL;
    if (!u || u == "") {
        chrome.tabs.getSelected(null, function(tab) {
            $("#crawUrl").val(tab.url);
        });
    } else {
        $("#crawUrl").val(u);
    }

    $("#maxDepth").val(settings.maxDepth);
    refreshPage();
}   

function refreshPage() {
    // If we are done then stop the crawl now
    if(bgPage.appState=="crawling" && bgPage.getURLsInTab("Crawling").length==0 && bgPage.getURLsInTab("Queued").length==0){ stopCrawl(); }

    // Set button text
    var crawlButtonText = bgPage.appState == "stopped" && bgPage.getURLsInTab("Queued").length > 0  ? "Resume" :
                          bgPage.appState == "stopped" && bgPage.getURLsInTab("Queued").length == 0 ? "Crawl"  :
                                                                                                      "Pause";
    $("#crawlButton").val(crawlButtonText);
    
    // Set enabledness
    var isDisabled = bgPage.appState == "crawling";
    $("#maxDepth").attr("disabled", isDisabled);
    $("#crawUrl").attr("disabled", isDisabled);
    $("#resetButton").attr("disabled", isDisabled);
            
    $("#tabs").html(
        bgPage.tabs.map(function(tab) {
            var count = tab == 'Cookies' ? bgPage.allCookies.length : bgPage.getURLsInTab(tab).length;
            var innerTxt = tab + " ("+ count +")";
            var liTxt = tab == currentTab ? innerTxt : "<a href='#' class=\"open-tab-button\" data-tab=\""+ tab +"\">" + innerTxt + "</a>";
            return "<li>" + liTxt + "</li>";
        }).join('')
    );
    
    $("#urlsBeingSearched").html(
        bgPage.getURLsInTab(currentTab).map((page) => {
            return "<li><a href=\"" + page.url + "\" class=\"link\">" + page.url + "</a></li>";
        }).join('')
    );

    if (currentTab == 'Cookies') {
        var html = '<div><button class="cookies-copy-to-clipboard">Copy table to clipboard</button></div>';
        html += '<div id="cookies-csv">';

        var keys = [];
        bgPage.allCookies.forEach(function(cookie) {
            Object.keys(cookie).forEach(function(key) {
                if (keys.indexOf(key) === -1) {
                    keys.push(key);
                }
            })
        });
        html += keys.join('\t') + '\n';

        html += bgPage.allCookies.map(function(cookie) {
            return keys.map(function(key) {
                return (key in cookie) ? cookie[key] : '';
            }).join('\t') + '\n';
        }).join('');
        html += '</div>'
        $('#allCookies').html(html)
    } else {
        $('#allCookies').html('');
    }
}



function onLIURLClicked(url) {
    chrome.tabs.create({url:url, selected:false});
}

function openTab(tab) 
{
     currentTab = tab;
     refreshPage();
}

function onCrawlClicked()
{
    if(bgPage.appState=="stopped" && bgPage.getURLsInTab("Queued").length>0)
    {
        console.log("Resuming Crawl");  
        bgPage.appState="crawling";
        bgPage.crawlMore();
    }
    else if(bgPage.appState=="stopped" && bgPage.getURLsInTab("Queued").length==0)
    {
        console.log("Beginning Crawl");
        settings.maxDepth = parseInt($("#maxDepth").val());
        bgPage.beginCrawl($("#crawUrl").val());
    }
    else if(bgPage.appState=="crawling")
    {
        console.log("Pausing Crawl");
        stopCrawl();        
    }
    refreshPage();
}

function onResetClicked()
{
    stopCrawl();
    bgPage.reset();
    refreshPage();
}

function stopCrawl()
{
    bgPage.appState = "stopped";
    $("#crawUrl").attr("disabled", false);
    $("#crawlButton").val(bgPage.getURLsInTab("Queued").length==0?"Crawl":"Resume");    
    
    for(var ref in bgPage.allPages) 
    {
        var o = bgPage.allPages[ref]
        if(o.state=="crawling")
        {           
            o.state = "queued";
        }
    }
    
    refreshPage();
}

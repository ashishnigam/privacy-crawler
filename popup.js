var currentTab = "Queued";
var refreshTimerInterval = 2000;
var refreshTimer = setTimeout(refreshPage,refreshTimerInterval);
var bgPage = chrome.extension.getBackgroundPage();

document.addEventListener('DOMContentLoaded', function() {
    $('#crawlButton').on('click', onCrawlClicked);
    $('#resetButton').on('click', onResetClicked);

    $(document.body).on('click', '.open-tab-button', function(e) {
        e.preventDefault();
        var tab = $(e.target).data('tab');
        openTab(tab);
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

function refreshPage() 
{
    // Start the timer again
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshPage,refreshTimerInterval);
        
    // First clear everything out
    $("#tabs li").remove();
    $("#urlsBeingSearched li").remove();
            
    // Build each tab
    $(bgPage.tabs).each(function(i, tab)
    {
        var count = tab == 'Cookies' ? bgPage.allCookies.length : bgPage.getURLsInTab(tab).length;
        var innerTxt = tab + " ("+ count +")";
        var liTxt = tab==currentTab?innerTxt:"<a href='#' class=\"open-tab-button\" data-tab=\""+ tab +"\">"+innerTxt+"</a>";
        $("#tabs").append("<li>"+liTxt+"</li>");
    });
    
    // Set button text
    if(bgPage.appState=="stopped" && bgPage.getURLsInTab("Queued").length>0) {  $("#crawlButton").val("Resume"); }
    else if(bgPage.appState=="stopped" && bgPage.getURLsInTab("Queued").length==0) { $("#crawlButton").val("Crawl"); }
    else if(bgPage.appState=="crawling") { $("#crawlButton").val("Pause");  }
    
    // Set enabledness
    if(bgPage.appState=="crawling"){ $("#crawUrl").attr("disabled", true); $("#resetButton").attr("disabled", true); }
    else { $("#crawUrl").attr("disabled", false); $("#resetButton").attr("disabled", false);}

    // List all the urls on this tab
    $(bgPage.getURLsInTab(currentTab)).each(function(i, tab)
    {
        $("#urlsBeingSearched").append("<li><a href='#' id=\"tab-"+ i + "\">"+this.url+"</a></li>");
        $("#tab-" + i).on(function() {
            onLIURLClicked(tab.url);
            return false;
        })
    });

    // If we are done then stop the crawl now
    if(bgPage.appState=="crawling" && bgPage.getURLsInTab("Crawling").length==0 && bgPage.getURLsInTab("Queued").length==0){ stopCrawl(); }

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



function onLIURLClicked(url)
{
    //document.execCommand('SaveAs',null,filename)
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

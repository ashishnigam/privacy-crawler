var currentTab = "Report";
var bgPage = chrome.extension.getBackgroundPage();

(async function() {
    var tabs = await tabQuery({active: true, currentWindow: true});
    bgPage.targetTabId = tabs[0].id
})();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message == 'refresh_page') refreshPage();
});

async function getTab(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, resolve);
    });
}

function delegate(element, event, selector, handler) {
    element.addEventListener(event, function(e) {
        for (var target = e.target; target && target != element; target = target.parentNode) {
            if (target.matches(selector)) {
                handler(e);
                break;
            }
        }
    });
}

function haveSettingsChanged() {
    return document.getElementById("crawl-url").value != settings.root ||
           document.getElementById("max-depth").value != settings.maxDepth;
}

document.addEventListener('DOMContentLoaded', function() {
    function submit() {
         bgPage.appState == "paused" && !haveSettingsChanged()                                 ? bgPage.crawlMore() :
        (bgPage.appState == "paused" && haveSettingsChanged()) || bgPage.appState == "stopped" ? bgPage.beginCrawl(document.getElementById("crawl-url").value, parseInt(document.getElementById("max-depth").value)) :
                                                                                                 bgPage.pause();
        refreshPage();    
    }

    delegate(document.body, 'input', '#crawl-url, #max-depth', refreshPage);
    delegate(document.body, 'keypress', '#crawl-url, #max-depth', (e) => {
        var ENTER = 13;
        if (e.keyCode == ENTER) {
            submit();
        }
    });
    delegate(document.body, 'click', '#crawl-button', submit);
    delegate(document.body, 'click', '#reset-button', bgPage.reset);

    delegate(document.body, 'click', '.open-tab-button', (e) => {
        e.preventDefault();
        currentTab = e.target.getAttribute('data-tab');
        refreshPage();
    });

    delegate(document.body, 'click', '.link', (e) => {
       e.preventDefault();
       chrome.tabs.create({url: e.target.href, selected:false});
    });

    delegate(document.body, 'click', '.download-report', (e) => {
        var filename = 'privacy-report-' + dateFns.format(bgPage.latestUpdate, 'YYYY-MM-DD-HH-mm-ss') + '.html';
        chrome.downloads.download({
            url: reportDataUri(bgPage.latestUpdate, bgPage.allCookies, bgPage.allSymbols),
            filename: filename
        });
    });

    delegate(document.body, 'click', '#set-to-current-page-button', async function () {
        tab = await getTab(bgPage.targetTabId);
        document.getElementById("crawl-url").value = tab.url;
    });

    onLoad();
}, false);

async function onLoad() {   
    var url = settings.root ? settings.root : (await tabQuery({active: true, currentWindow: true}))[0].url;
    document.getElementById("crawl-url").value = url;
    document.getElementById("max-depth").value = settings.maxDepth;
    refreshPage();
}

function refreshPage() {
    var crawlButtonText =  bgPage.appState == "pausing"                                                           ? "Pausing..." :
                           bgPage.appState == "paused" && !haveSettingsChanged()                                  ? "Resume"     :
                          (bgPage.appState == "paused" &&  haveSettingsChanged()) || bgPage.appState == "stopped" ? "Crawl"      :
                                                                                                                   "Pause";
    document.getElementById("crawl-button").innerText = crawlButtonText;
    var isDisabledCrawl = bgPage.appState == "pausing";
    document.getElementById("crawl-button").disabled = isDisabledCrawl;

    var isDisabled = bgPage.getURLsInTab("Crawling").length > 0;
    document.getElementById("max-depth").disabled = isDisabled;
    document.getElementById("crawl-url").disabled = isDisabled;
    document.getElementById("reset-button").disabled = isDisabled;

    var leftTabs = bgPage.tabs.slice(0, 1);
    var rightTabs = bgPage.tabs.slice(1);

    function tabhtml(tabs) {
        return tabs.map(function(tab) {
            var count = tab == 'Report' ? (bgPage.allCookies.length + Object.keys(bgPage.allSymbols).length) : bgPage.getURLsInTab(tab).length;
            var innerTxt = tab + " ("+ count +")";
            var isActive = tab == currentTab;
            var liTxt = isActive ? innerTxt : "<a href='#' class=\"open-tab-button\" data-tab=\""+ tab +"\">" + innerTxt + "</a>";
            return `<li class="nav-item ${ !isActive ? '' : 'open-tab-button'}">${ liTxt }</li>`;
        }).join('');
    }

    document.getElementById("tabs-left").innerHTML = tabhtml(leftTabs);
    document.getElementById("tabs-right").innerHTML = tabhtml(rightTabs);
    
    document.getElementById("tab-content").innerHTML = '';
    document.getElementById("tab-content").appendChild(currentTab != 'Report' ? (function () {
        var list = document.createElement('ul');
        list.setAttribute('id', 'urls-being-searched');
        list.innerHTML = bgPage.getURLsInTab(currentTab).map((page) => {
            return "<li><a href=\"" + page.url + "\" class=\"link\">" + page.url + "</a></li>";
        }).join('');
        return list;
    })() : (() => {
        var reportOuterRoot = document.createElement('div');
        reportOuterRoot.setAttribute('id', 'report-outer-root');
        var generated = dateFns.format(bgPage.latestUpdate, 'YYYY-MM-DD HH:mm:ss');
        reportOuterRoot.attachShadow({mode: 'open'}).innerHTML = reportStyle() + reportContent(generated, bgPage.allCookies, bgPage.allSymbols);

        return reportOuterRoot;
    })());
}

function reportDataUri(generated, cookies, symbols) {
    var generated = dateFns.format(bgPage.latestUpdate, 'YYYY-MM-DD HH:mm:ss');
    var html = report(generated, cookies, symbols);
    return 'data:text/html;charset=UTF-8,' + encodeURIComponent(html);
}

function reportStyle() {
    return `
        <style>
        .report-root {
          font-family: monospace;
          color: #000000;
          font: normal normal normal 13px/normal monospace;
        }
        table {
          border-collapse: collapse;
        }
        th {
          text-align: left;
        }
        td,
        th {
          white-space: nowrap;
          padding: 3px 5px;
          vertical-align: top;
        }
        tr:nth-child(even) > td {
          background: #f3f3f3;
          -webkit-print-color-adjust: exact;
        }
        </style>`;
}

function reportContent(generated, cookies, symbols) {
    var symbolScripts = Object.keys(symbols);

    return `
        <div class="report-root">
            <h1>Privacy Report</h1>

            <p>Generated: ${ generated }<br>Root: ${ settings.root }<br>Depth: ${ settings.maxDepth }</p>

            <h2>Cookies (${ cookies.length })</h2>

            ${ cookies.length == 0 ? `
                <p>No cookies found</p>` : `
                <table>
                <thead>
                    <tr>
                        <th>domain</th>
                        <th>path</th>
                        <th>name</th>
                        <th>expiry</th>
                        <th>first seen</th>
                        <th>first value</th>
                    </tr>
                </thead>
                <tbody>
                ${ cookies.map((cookie) => `
                    <tr>
                        <td>${ cookie['domain'] }</td>
                        <td>${ cookie['path'] }</td>
                        <td>${ cookie['name'] }</td>
                        <td>${ cookie['expirationDate'] }</td>
                        <td>${ cookie['firstSeen'] }</td>
                        <td>${ cookie['firstValue'] }</td>
                    </tr>
                `).join('') }
                </tbody>
                </table>
            ` }
            <h2>Fingerprinting (${ symbolScripts.length })</h2>

            ${ symbolScripts.length == 0 ? `
                <p>No data accessed that can be used to fingerprint</p>` : `
                <table>
                <thead>
                    <tr>
                        <th>name</th>
                        <th>script</th>
                        <th>first seen</th>
                    </tr>
                </thead>
                <tbody>
                ${ symbolScripts.map((symbolScriptUrl) => `
                    <tr>
                        <td>
                        ${ symbols[symbolScriptUrl].map((symbol) => `
                            <div>
                                ${ bgPage.isExtraSuspicious(symbol['name']) ? '<strong>' : '' }
                                ${ symbol['name'] }
                                ${ bgPage.isExtraSuspicious(symbol['name']) ? '</strong>' : '' }
                            </div>
                        `).join('') }
                        </td>
                        <td>${ symbolScriptUrl }</td>
                        <td>${ symbols[symbolScriptUrl][0]['firstSeen'] }</td>
                    </tr>
                    `).join('')
                }
                </tbody>
                </table>
            ` }
        </div>`;
}

function report(generated, cookies, symbols) {
    return `<!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Privacy Report</title>
          ${ reportStyle() }
        </head>
        <body>
        ${ reportContent(generated, cookies, symbols) }
        </body>`;
} 
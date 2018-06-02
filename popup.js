var currentTab = "Report";
var bgPage = chrome.extension.getBackgroundPage();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message == 'refresh_page') refreshPage();
});

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

document.addEventListener('DOMContentLoaded', function() {
    delegate(document.body, 'click', '#crawlButton', () => {
        bgPage.appState == "paused"  ? bgPage.crawlMore() :
        bgPage.appState == "stopped" ? bgPage.beginCrawl(document.getElementById("crawUrl").value, parseInt(document.getElementById("maxDepth").value)) :
                                       bgPage.pause();
        refreshPage();
    });
    delegate(document.body, 'click', '#resetButton', bgPage.reset);

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
        var now = new Date();
        var filename = 'privacy-report-' + dateFns.format(now, 'YYYY-MM-DD-HH-mm-ss') + '.html';
        chrome.downloads.download({
            url: reportDataUri(now, bgPage.allCookies, bgPage.allSymbols, downloadReportStyle()),
            filename: filename
        });
    });

    onLoad();
}, false);

async function onLoad() {   
    var url = settings.root ? settings.root : (await tabQuery({active: true, currentWindow: true}))[0].url;
    document.getElementById("crawUrl").value = url;
    document.getElementById("maxDepth").value = settings.maxDepth;
    refreshPage();
}

function refreshPage() {
    var crawlButtonText = bgPage.appState == "paused"  ? "Resume" :
                          bgPage.appState == "stopped" ? "Crawl"  :
                                                         "Pause";
    document.getElementById("crawlButton").value = crawlButtonText;
    var isDisabledCrawl = bgPage.appState == "paused" && bgPage.getURLsInTab("Crawling").length > 0;
    document.getElementById("crawlButton").disabled = isDisabledCrawl;
    
    var isDisabled = bgPage.getURLsInTab("Crawling").length > 0;
    document.getElementById("maxDepth").disabled = isDisabled;
    document.getElementById("crawUrl").disabled = isDisabled;
    document.getElementById("resetButton").disabled = isDisabled;
            
    document.getElementById("tabs").innerHTML = bgPage.tabs.map(function(tab) {
        var count = tab == 'Report' ? (bgPage.allCookies.length + bgPage.allSymbols.length) : bgPage.getURLsInTab(tab).length;
        var innerTxt = tab + " ("+ count +")";
        var liTxt = tab == currentTab ? innerTxt : "<a href='#' class=\"open-tab-button\" data-tab=\""+ tab +"\">" + innerTxt + "</a>";
        return "<li>" + liTxt + "</li>";
    }).join('');
    
    document.getElementById("urlsBeingSearched").innerHTML = bgPage.getURLsInTab(currentTab).map((page) => {
        return "<li><a href=\"" + page.url + "\" class=\"link\">" + page.url + "</a></li>";
    }).join('');


    document.getElementById("allCookies").innerHTML = currentTab == 'Report' ? (() => {
        var now = new Date();
        return `<div><button class="download-report">Download report</button></div>
                <iframe src="${ reportDataUri(now, bgPage.allCookies, bgPage.allSymbols, inPageReportStyle())}"></iframe>`;
    })() : '';
}

function reportDataUri(now, cookies, symbols, extraScript) {
    var generated = dateFns.format(now, 'YYYY-MM-DD HH:mm:ss');
    var html = report(generated, cookies, symbols, extraScript);
    return 'data:text/html;charset=UTF-8,' + encodeURIComponent(html);
}

function inPageReportStyle() {
    return `<style>body {padding: 0}></style>`;
}

function downloadReportStyle() {
    return `<style>body {padding: 8px}></style>`;
}

function report(generated, cookies, symbols, extraScript) {
    return `<!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Privacy Report</title>
          <style>
            body {
              margin: 0;
              font-family: monospace;
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
            }
            tr:nth-child(even) > td {
              background: #f3f3f3;
              -webkit-print-color-adjust: exact;
            }
          </style>
          ${ extraScript }
        </head>
        <body>
          <h1>Privacy Report</h1>

          <p>Generated: ${ generated }</p>

          <h2>Cookies (${ cookies.length })</h2>

          ${ cookies.length == 0 ? '<p>No cookies found</p>' : `
              <table>
                <thead>
                  <th>domain</th>
                  <th>path</th>
                  <th>name</th>
                  <th>expiry</th>
                  <th>first seen</th>
                </thead>
                <tbody>
                ${ cookies.map((cookie) => `
                  <tr>
                    <td>${ cookie['domain'] }</td>
                    <td>${ cookie['path'] }</td>
                    <td>${ cookie['name'] }</td>
                    <td>${ cookie['expirationDate'] }</td>
                    <td>${ cookie['firstSeen'] }</td>
                  </tr>
                `).join('') }
                </tbody>
            </table>
          ` }

            <h2>Fingerprinting (${ symbols.length })</h2>

            ${ symbols.length == 0 ? '<p>No data accessed that can be used to fingerprint</p>' : `
                <table>
                <thead>
                    <th>name</th>
                    <th>first seen at script</th>
                    <th>first seen at page</th>
                </thead>
                <tbody>
                ${ symbols.map((symbol) => `
                    <tr>
                        <td>${ symbol['name'] }</td>
                        <td>${ symbol['scriptUrl'] }</td>
                        <td>${ symbol['firstSeen'] }</td>
                    </tr>
                `).join('') }
                </tbody>
                </table>
            ` }
        </body>`;
} 
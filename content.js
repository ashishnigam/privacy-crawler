
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.text === 'get_links') {
        var links = Array.from(document.body.getElementsByTagName("a")).map(function(a) {
            return a.href;
        });
        sendResponse({links: links});
    }
});


chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.text === 'get_dom') {
        sendResponse({dom: document.body.outerHTML});
    }
});

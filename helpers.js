var settings = {
    get maxDepth() { return localStorage["max-crawl-depth"]!=null?localStorage["max-crawl-depth"]:2; },
    set maxDepth(val) { localStorage['max-crawl-depth'] = val; },
    get root() { return localStorage["root"]!=null?localStorage["root"]:""; },
    set root(val) { localStorage['root'] = val; },
}

function startsWith(s, str){
    return (s.indexOf(str) === 0);
}

function tabQuery(query) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query(query, resolve);
    });
}

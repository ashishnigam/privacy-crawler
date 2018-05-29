var settings = {
    get maxDepth() { return localStorage["max-crawl-depth"]!=null?localStorage["max-crawl-depth"]:2; },
    set maxDepth(val) { localStorage['max-crawl-depth'] = val; },
    get root() { return localStorage["root"]!=null?localStorage["root"]:""; },
    set root(val) { localStorage['root'] = val; },
}

function startsWith(s, str){
    return (s.indexOf(str) === 0);
}

const copyToClipboard = str => {
    const el = document.createElement('textarea');
    el.value = str;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

function tabQuery(query) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query(query, resolve);
    });
}

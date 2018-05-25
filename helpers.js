var settings = 
{
    get maxDepth() { return localStorage["max-crawl-depth"]!=null?localStorage["max-crawl-depth"]:2; },
    set maxDepth(val) { localStorage['max-crawl-depth'] = val; },
    
    get interestingFileTypes() 
    { 
        var types = (localStorage["interesting-file-types"]!=null?localStorage["interesting-file-types"]:"flv,mk4,ogg,swf,avi,mp3,zip,png,gif,jpg").split(",");
        for (var i in types) { types[i] = $.trim(types[i]);  }
        return types;
    },
    set interestingFileTypes(val) { localStorage['interesting-file-types'] = val; }
}

function parseUri (str) 
{
    var o   = parseUri.options,
        m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i   = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });

    return uri;
};

parseUri.options = 
{
    strictMode: false,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
        name:   "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};

function startsWith(s, str){
    return (s.indexOf(str) === 0);
}

function getFileExt(filename) 
{
    return (/[.]/.exec(filename)) ? /[^.]+$/.exec(filename) : undefined; 
}

function getAllLinksOnPage(page)
{
    var links = new Array();    
    $(page).find('[src]').each(function(){ links.push($(this).attr('src')); }); 
    $(page).find('[href]').each(function(){ links.push($(this).attr('href')) });    
    return links;
}

function isInArr(arr,val)
{
    for (var i in arr)
    {
        if(arr[i]==val){ return true; }
    }
    return false;
}
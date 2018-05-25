var bgPage = chrome.extension.getBackgroundPage();

document.addEventListener('DOMContentLoaded', function() {
    restore_options();
    $('#save-button').bind('click', save_options);
}, false);

// Saves options to localStorage.
function save_options() 
{ 
    bgPage.settings.interestingFileTypes = $("#interesting-file-types").val();
    bgPage.settings.pauseOnPopClose = $("#pause-crawl-popup-close").is(':checked')?1:0;
}

// Restores select box state to saved value from localStorage.
function restore_options() 
{   
    bgPage = chrome.extension.getBackgroundPage();  
    $("#interesting-file-types").val(bgPage.settings.interestingFileTypes);
    if(bgPage.settings.pauseOnPopClose==1){$("#pause-crawl-popup-close").attr('checked','checked');}
}

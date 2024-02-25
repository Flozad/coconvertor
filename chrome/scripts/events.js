let userIsLoggedIn = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    chrome.action.setPopup({popup: './login.html'}); // Set the popup to login.html
});

chrome.action.onClicked.addListener(function () {
    if (!userIsLoggedIn) {
        chrome.action.setPopup({popup: './login.html'});
    } else {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                todo: "toggle"
            });
        });
    }
});

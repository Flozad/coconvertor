document.getElementById('convertButton').addEventListener('click', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log('sending message to convert currencies');
    chrome.tabs.sendMessage(tabs[0].id, { action: "convertCurrencies" });
  });
});

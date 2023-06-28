// If the user requests a page that doesn't exist, this is the page that will be shown.
// But try adding .html to the end of the URL and see what happens.
// If the page still doesn't exist, then this page will be shown.
// If the page does exist, then the page will be shown.

window.onload = function () {
    if (!window.location.pathname.endsWith('.html')) {
        var newUrl = window.location.pathname + '.html';
        window.history.replaceState(null, null, newUrl);
        window.location.reload();
    }
}
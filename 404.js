window.onload = function () {
    if (!window.location.pathname.endsWith('.html')) {
        var newUrl = window.location.pathname + '.html';
        window.history.replaceState(null, null, newUrl);
        window.location.reload();
    }
}
/**
 * 404 Page URL Handler
 * Adds .html extension back to URLs for proper 404 page handling
 */
window.onload = function () {
    // Add .html extension if missing and reload
    if (!window.location.pathname.endsWith('.html')) {
        var newUrl = window.location.pathname + '.html';
        window.history.replaceState(null, null, newUrl);
        window.location.reload();
    }
}
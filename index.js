
if (window.innerWidth < 600) {
    let style = document.getElementById("style").getAttribute("href");
    style = style.substring(0, style.length - 9) + "phonestyle.css";
    document.getElementById("style").setAttribute("href", style);
}

window.onload = function () {

    setTimeout(function () {
        window.scrollTo(0, 0);
    }, 100);

    setTimeout(function () {
        if (window.location.hash) {
            let hash = window.location.hash;
            window.location.hash = '';
            window.location.hash = hash;
        }
    }, 3000);

    if (window.location.pathname.endsWith('.html') && !window.location.pathname.endsWith('index.html')) {
        var newUrl = window.location.pathname.replace('.html', '');
        window.history.replaceState(null, null, newUrl);
    }
    
    
}
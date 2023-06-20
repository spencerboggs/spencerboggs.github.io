// switch to phonestyle.css on load if mobile
if (window.innerWidth < 600) {
    document.getElementById("style").setAttribute("href", "phonestyle.css");
} else {
    document.getElementById("style").setAttribute("href", "style.css");
}

window.onload = function () {
    setTimeout(function () {
        window.scrollTo(0, 0);
    }, 100);
    
    setTimeout(function () {
        // then scroll to the #hash element
        if (window.location.hash) {
            let hash = window.location.hash;
            window.location.hash = '';
            window.location.hash = hash;
        }
    }, 5000);
}

// switch to phonestyle.css on load if mobile
if (window.innerWidth < 600) {
    //document.getElementById("style").setAttribute("href", "phonestyle.css");\
    //rather than setting the file to phonestyle.css just replace style.css with phonestyle.css so that ../ works
    // Do this by replacing the last 9 characters of the string
    let style = document.getElementById("style").getAttribute("href");
    style = style.substring(0, style.length - 9) + "phonestyle.css";
    document.getElementById("style").setAttribute("href", style);

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
    }, 3000);
}

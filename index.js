let details = navigator.userAgent;
let regexp = /android|iphone|kindle|ipad/i;
let isMobileDevice = regexp.test(details);
const styleLink = document.getElementById('style');

if (isMobileDevice) {
    window.onload = setTimeout(setStyle, 100);
    function setStyle() {
        styleLink.setAttribute('rel', 'phonestyle.css');
    }
}
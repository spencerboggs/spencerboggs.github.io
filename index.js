

let details = navigator.userAgent;
let regexp = /android|iphone|kindle|ipad/i;
let isMobileDevice = regexp.test(details);
const styleLink = document.getElementById("style");

if (isMobileDevice) {
  if (document.URL.includes("/")) {
    styleLink.setAttribute("href", "../phonestyle.css");
  } else {
    styleLink.setAttribute("href", "phonestyle.css");
  }
}
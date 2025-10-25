/**
 * Main JavaScript for Spencer Boggs Portfolio
 * Handles URL management and navigation
 */

/**
 * Window load event handler
 * - Scrolls to top of page
 * - Handles hash navigation after page load
 * - Removes .html extension from URL for cleaner links
 * - Initializes dropdown functionality
 */
window.onload = function () {
    // Initialize dropdown functionality
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const content = dropdown.querySelector('.dropdown-content');
        
        if (toggle && content) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle active class for better mobile support
                dropdown.classList.toggle('active');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });
        }
    });
    
    // Scroll to top after initial load
    setTimeout(function () {
        window.scrollTo(0, 0);
    }, 100);

    // Re-apply hash navigation after animations complete
    setTimeout(function () {
        if (window.location.hash) {
            let hash = window.location.hash;
            window.location.hash = '';
            window.location.hash = hash;
        }
    }, 3000);

    // Remove .html extension from URL (except for index.html)
    if (window.location.pathname.endsWith('.html') && !window.location.pathname.endsWith('index.html')) {
        var newUrl = window.location.pathname.replace('.html', '');
        window.history.replaceState(null, null, newUrl);
    }
}
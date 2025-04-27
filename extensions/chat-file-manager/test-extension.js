(function() {
    // Create the button element
    const testButton = document.createElement('button');
    testButton.setAttribute('data-element-id', 'test-button');
    testButton.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';

    // Use the same SVG style as the backup button but with a different icon
    testButton.innerHTML = `
        <span class="block group-hover:bg-white/30 w-[35px] h-[35px] transition-all rounded-lg flex items-center justify-center group-hover:text-white/90">
            <svg class="w-6 h-6 flex-shrink-0" width="24px" height="24px" fill="none" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
        </span>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Test</span>
    `;

    // Add click handler
    testButton.addEventListener('click', function() {
        alert('Test button clicked!');
    });

    // Function to insert the button
    function insertTestButton() {
        const teamsButton = document.querySelector('[data-element-id="workspace-tab-teams"]');
        if (teamsButton && teamsButton.parentNode) {
            teamsButton.parentNode.insertBefore(testButton, teamsButton.nextSibling);
            return true;
        }
        return false;
    }

    // Create an observer to watch for changes
    const observer = new MutationObserver((mutations) => {
        if (insertTestButton()) {
            observer.disconnect();
        }
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also try to insert immediately
    insertTestButton();

    // And try a few more times
    const maxAttempts = 10;
    let attempts = 0;
    const interval = setInterval(() => {
        if (insertTestButton() || attempts >= maxAttempts) {
            clearInterval(interval);
        }
        attempts++;
    }, 1000);
})();

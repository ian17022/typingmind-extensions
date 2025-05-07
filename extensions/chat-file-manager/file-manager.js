(function() {
    // Create button
    const fileManagerButton = document.createElement('button');
    fileManagerButton.setAttribute('data-element-id', 'files-button');  // Changed ID to be unique
    fileManagerButton.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';
    fileManagerButton.innerHTML = `
        <span class="block group-hover:bg-white/30 w-[35px] h-[35px] transition-all rounded-lg flex items-center justify-center group-hover:text-white/90">
            <svg class="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 17.5L6.5 12H10V8H14V12H17.5L12 17.5M20 6H12L10 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6Z"/>
            </svg>
        </span>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Files</span>
    `;

    // Add a simple click handler
    fileManagerButton.addEventListener('click', () => {
        console.log('Files button clicked');
        alert('Files button clicked');
    });

    // Function to insert button
    function insertButton() {
        console.log('Attempting to insert button...');
        const teamsButton = document.querySelector('[data-element-id="workspace-tab-teams"]');
        console.log('Teams button found:', teamsButton);
        
        if (teamsButton && teamsButton.parentNode) {
            console.log('Inserting button after teams button');
            teamsButton.parentNode.insertBefore(fileManagerButton, teamsButton.nextSibling);
            return true;
        }
        return false;
    }

    // Try immediate insertion
    console.log('Initial button insertion attempt');
    insertButton();

    // Set up observer
    console.log('Setting up observer');
    const observer = new MutationObserver((mutations) => {
        console.log('DOM mutation detected');
        if (insertButton()) {
            console.log('Button inserted successfully, disconnecting observer');
            observer.disconnect();
        }
    });

    // Start observing with logging
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    console.log('Observer started');

    // Periodic attempts
    let attempts = 0;
    const maxAttempts = 20; // Increased attempts
    const interval = setInterval(() => {
        console.log(`Attempt ${attempts + 1} of ${maxAttempts}`);
        if (insertButton() || attempts >= maxAttempts) {
            console.log('Clearing interval');
            clearInterval(interval);
        }
        attempts++;
    }, 1000);
})();

(function() {
    // Create button
    const fileManagerButton = document.createElement('button');
    fileManagerButton.setAttribute('data-element-id', 'file-manager-button');
    fileManagerButton.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';

    fileManagerButton.innerHTML = `
        <span class="block group-hover:bg-white/30 w-[35px] h-[35px] transition-all rounded-lg flex items-center justify-center group-hover:text-white/90">
            <svg class="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M13 9H18.5L13 3.5V9M6 2H14L20 8V20A2 2 0 0 1 18 22H6A2 2 0 0 1 4 20V4A2 2 0 0 1 6 2M6 4V20H18V11H11V4H6Z"/>
            </svg>
        </span>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Debug</span>
    `;

    // Add click handler
    fileManagerButton.addEventListener('click', async function() {
        console.log('Button clicked');
        
        // First, let's examine the page structure
        console.log('Page structure:', {
            nextElement: document.getElementById('__next'),
            mainElements: document.getElementsByTagName('main'),
            sideBar: document.querySelector('[data-element-id="side-bar"]'),
            allDataElements: document.querySelectorAll('[data-element-id]')
        });

        // Then, let's look at IndexedDB
        try {
            // List all IndexedDB databases
            const databases = await window.indexedDB.databases();
            console.log('Available databases:', databases);

            // Open keyval-store
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open('keyval-store', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => resolve(event.target.result);
            });

            // Log database info
            console.log('Database:', {
                name: db.name,
                version: db.version,
                objectStoreNames: db.objectStoreNames
            });

            // Get all data from keyval store
            const transaction = db.transaction(['keyval'], 'readonly');
            const store = transaction.objectStore('keyval');
            
            // Get all records
            const allData = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            // Log the first record (if exists) and total count
            console.log('IndexedDB data:', {
                totalRecords: allData.length,
                sampleRecord: allData[0],
                allRecords: allData
            });

            // Create a simple alert with the count
            alert(`Found ${allData.length} chats in IndexedDB. Check console for details.`);

        } catch (error) {
            console.error('Error accessing IndexedDB:', error);
            alert('Error accessing IndexedDB. Check console for details.');
        }
    });

    // Insert button function
    function insertFileManagerButton() {
        const teamsButton = document.querySelector('[data-element-id="workspace-tab-teams"]');
        if (teamsButton && teamsButton.parentNode) {
            teamsButton.parentNode.insertBefore(fileManagerButton, teamsButton.nextSibling);
            return true;
        }
        return false;
    }

    // Create observer
    const observer = new MutationObserver((mutations) => {
        if (insertFileManagerButton()) {
            observer.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    insertFileManagerButton();

    const maxAttempts = 10;
    let attempts = 0;
    const interval = setInterval(() => {
        if (insertFileManagerButton() || attempts >= maxAttempts) {
            clearInterval(interval);
        }
        attempts++;
    }, 1000);
})();

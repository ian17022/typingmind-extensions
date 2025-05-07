(function() {
    const fileManagerButton = document.createElement('button');
    fileManagerButton.setAttribute('data-element-id', 'file-manager-button');
    fileManagerButton.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';

    fileManagerButton.innerHTML = `
        <span class="block group-hover:bg-white/30 w-[35px] h-[35px] transition-all rounded-lg flex items-center justify-center group-hover:text-white/90">
            <svg class="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 17.5L6.5 12H10V8H14V12H17.5L12 17.5M20 6H12L10 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6Z"/>
            </svg>
        </span>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Files</span>
    `;

    fileManagerButton.addEventListener('click', async function() {
        console.log('Button clicked');
        try {
            // Open IndexedDB
            const db = await new Promise((resolve, reject) => {
                console.log('Opening IndexedDB...');
                const request = indexedDB.open('keyval-store', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => resolve(event.target.result);
            });

            // Get all data
            const allData = await new Promise((resolve, reject) => {
                console.log('Reading data...');
                const transaction = db.transaction(['keyval'], 'readonly');
                const store = transaction.objectStore('keyval');
                const request = store.getAll();

                request.onsuccess = () => {
                    console.log('Data retrieved:', request.result);
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });

            // Log the data structure
            console.log('First chat structure:', allData[0]);
            console.log('Total chats:', allData.length);
            
            // Log all messages that might contain files
            allData.forEach(chat => {
                if (chat && chat.messages) {
                    chat.messages.forEach((msg, index) => {
                        console.log('Message structure:', {
                            messageIndex: index,
                            type: msg.type,
                            content: msg.content,
                            full: msg
                        });
                    });
                }
            });

        } catch (error) {
            console.error('Error accessing IndexedDB:', error);
        }
    });

    function insertFileManagerButton() {
        const teamsButton = document.querySelector('[data-element-id="workspace-tab-teams"]');
        if (teamsButton && teamsButton.parentNode) {
            teamsButton.parentNode.insertBefore(fileManagerButton, teamsButton.nextSibling);
            return true;
        }
        return false;
    }

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

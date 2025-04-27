(function() {
    // First, let's create a basic button like our test button
    const fileManagerButton = document.createElement('button');
    fileManagerButton.setAttribute('data-element-id', 'file-manager-button');
    fileManagerButton.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';

    // Use a file icon SVG
    fileManagerButton.innerHTML = `
        <span class="block group-hover:bg-white/30 w-[35px] h-[35px] transition-all rounded-lg flex items-center justify-center group-hover:text-white/90">
            <svg class="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M13 9H18.5L13 3.5V9M6 2H14L20 8V20A2 2 0 0 1 18 22H6A2 2 0 0 1 4 20V4A2 2 0 0 1 6 2M6 4V20H18V11H11V4H6Z"/>
            </svg>
        </span>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Files</span>
    `;

    // Add click handler
    fileManagerButton.addEventListener('click', async function() {
        try {
            // Find the main content area
            const mainContent = document.querySelector('[data-element-id="main-content"]');
            if (!mainContent) {
                console.error('Main content area not found');
                return;
            }

            // Create our panel
            const panel = document.createElement('div');
            panel.className = 'p-4 bg-zinc-900 rounded-lg m-4';
            panel.innerHTML = '<h2 class="text-xl mb-4">Loading chats...</h2>';
            mainContent.innerHTML = '';
            mainContent.appendChild(panel);

            // Open IndexedDB
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open('keyval-store', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => resolve(event.target.result);
            });

            // Get all chats
            const chats = await new Promise((resolve, reject) => {
                const transaction = db.transaction(['keyval'], 'readonly');
                const store = transaction.objectStore('keyval');
                const chats = [];

                store.openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        // Log each chat for debugging
                        console.log('Found chat:', cursor.value);
                        
                        const chatData = cursor.value;
                        const size = new Blob([JSON.stringify(chatData)]).size;
                        chats.push({
                            id: cursor.key,
                            title: chatData.title || 'Untitled Chat',
                            size: size,
                            messageCount: chatData.messages?.length || 0
                        });
                        cursor.continue();
                    } else {
                        resolve(chats);
                    }
                };
            });

            // Sort chats by size
            chats.sort((a, b) => b.size - a.size);

            // Update panel with chat list
            panel.innerHTML = `
                <h2 class="text-xl mb-4">Chats by Size (${chats.length} total)</h2>
                <div class="space-y-2">
                    ${chats.map(chat => `
                        <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                            <div>
                                <div class="font-medium">${chat.title}</div>
                                <div class="text-sm opacity-70">
                                    Size: ${(chat.size / 1024).toFixed(1)} KB
                                    • Messages: ${chat.messageCount}
                                </div>
                            </div>
                            <button 
                                class="px-3 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                                onclick="(function(id) { 
                                    if(confirm('Delete this chat?')) {
                                        const request = indexedDB.open('keyval-store', 1);
                                        request.onsuccess = (event) => {
                                            const db = event.target.result;
                                            const tx = db.transaction(['keyval'], 'readwrite');
                                            const store = tx.objectStore('keyval');
                                            store.delete(id);
                                        }
                                        this.closest('.flex').remove();
                                    }
                                }).call(this, '${chat.id}')"
                            >
                                Delete
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;

        } catch (error) {
            console.error('Error:', error);
            alert('Error loading chats. Check console for details.');
        }
    });

    // Function to insert the button
    function insertFileManagerButton() {
        const teamsButton = document.querySelector('[data-element-id="workspace-tab-teams"]');
        if (teamsButton && teamsButton.parentNode) {
            teamsButton.parentNode.insertBefore(fileManagerButton, teamsButton.nextSibling);
            return true;
        }
        return false;
    }

    // Create an observer to watch for changes
    const observer = new MutationObserver((mutations) => {
        if (insertFileManagerButton()) {
            observer.disconnect();
        }
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Try to insert immediately
    insertFileManagerButton();

    // And try a few more times
    const maxAttempts = 10;
    let attempts = 0;
    const interval = setInterval(() => {
        if (insertFileManagerButton() || attempts >= maxAttempts) {
            clearInterval(interval);
        }
        attempts++;
    }, 1000);
})();

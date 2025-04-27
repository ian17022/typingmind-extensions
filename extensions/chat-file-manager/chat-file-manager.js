(function() {
    const fileManagerButton = document.createElement('button');
    fileManagerButton.setAttribute('data-element-id', 'file-manager-button');
    fileManagerButton.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';

    fileManagerButton.innerHTML = `
        <span class="block group-hover:bg-white/30 w-[35px] h-[35px] transition-all rounded-lg flex items-center justify-center group-hover:text-white/90">
            <svg class="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M13 9H18.5L13 3.5V9M6 2H14L20 8V20A2 2 0 0 1 18 22H6A2 2 0 0 1 4 20V4A2 2 0 0 1 6 2M6 4V20H18V11H11V4H6Z"/>
            </svg>
        </span>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Top 20</span>
    `;

    // Add click handler
    fileManagerButton.addEventListener('click', async function() {
        const mainContent = document.querySelector('[data-element-id="main-content"]');
        if (!mainContent) {
            console.error('Main content area not found');
            return;
        }

        // Create panel with loading state
        const panel = document.createElement('div');
        panel.className = 'p-4 bg-zinc-900 rounded-lg m-4';
        panel.innerHTML = `
            <div class="flex items-center gap-3">
                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading chats...</span>
            </div>
        `;
        
        mainContent.innerHTML = '';
        mainContent.appendChild(panel);

        try {
            // Open IndexedDB
            const db = await new Promise((resolve, reject) => {
                console.log('Opening IndexedDB...');
                const request = indexedDB.open('keyval-store', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => resolve(event.target.result);
            });

            // Get all chats
            const chats = await new Promise((resolve, reject) => {
                console.log('Fetching chats...');
                const transaction = db.transaction(['keyval'], 'readonly');
                const store = transaction.objectStore('keyval');
                const chats = [];

                store.openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const chatData = cursor.value;
                        if (chatData && typeof chatData === 'object') {
                            const size = new Blob([JSON.stringify(chatData)]).size;
                            chats.push({
                                id: cursor.key,
                                title: chatData.title || 'Untitled Chat',
                                size: size,
                                messageCount: chatData.messages?.length || 0,
                                lastMessage: chatData.messages?.[chatData.messages.length - 1]?.content?.slice(0, 50) || ''
                            });
                        }
                        cursor.continue();
                    } else {
                        resolve(chats);
                    }
                };

                store.openCursor().onerror = (error) => {
                    console.error('Error fetching chats:', error);
                    reject(error);
                };
            });

            // Sort chats by size and take top 20
            const top20Chats = chats
                .sort((a, b) => b.size - a.size)
                .slice(0, 20);

            console.log(`Found ${chats.length} chats, showing top 20`);

            // Format file size
            function formatSize(bytes) {
                const units = ['B', 'KB', 'MB', 'GB'];
                let size = bytes;
                let unitIndex = 0;
                while (size >= 1024 && unitIndex < units.length - 1) {
                    size /= 1024;
                    unitIndex++;
                }
                return `${size.toFixed(1)} ${units[unitIndex]}`;
            }

            // Update panel with chat list
            panel.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl">Top 20 Largest Chats</h2>
                    <span class="text-sm opacity-70">Total chats: ${chats.length}</span>
                </div>
                <div class="space-y-2">
                    ${top20Chats.map((chat, index) => `
                        <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm opacity-50">#${index + 1}</span>
                                    <span class="font-medium truncate">${chat.title}</span>
                                </div>
                                <div class="text-sm opacity-70 mt-1">
                                    ${formatSize(chat.size)} • ${chat.messageCount} messages
                                </div>
                                ${chat.lastMessage ? `
                                    <div class="text-sm opacity-50 mt-1 truncate">
                                        Last message: ${chat.lastMessage}...
                                    </div>
                                ` : ''}
                            </div>
                            <button 
                                class="ml-4 px-3 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                                onclick="(async function(id) { 
                                    if(confirm('Delete this chat?')) {
                                        try {
                                            const request = indexedDB.open('keyval-store', 1);
                                            request.onsuccess = (event) => {
                                                const db = event.target.result;
                                                const tx = db.transaction(['keyval'], 'readwrite');
                                                const store = tx.objectStore('keyval');
                                                store.delete(id).onsuccess = () => {
                                                    this.closest('.flex').remove();
                                                };
                                            };
                                        } catch (error) {
                                            console.error('Error deleting chat:', error);
                                            alert('Error deleting chat');
                                        }
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
            panel.innerHTML = `
                <div class="text-red-500">
                    <h2 class="text-xl mb-2">Error Loading Chats</h2>
                    <pre class="text-sm opacity-70">${error.message}</pre>
                </div>
            `;
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

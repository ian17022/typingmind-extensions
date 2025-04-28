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
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Sizes</span>
    `;

    fileManagerButton.addEventListener('click', async function() {
        // Find the main element directly
        const mainElement = document.querySelector('main');
        if (!mainElement) {
            alert('Could not find main element');
            return;
        }

        // Create our content
        const content = document.createElement('div');
        content.className = 'p-4';
        content.innerHTML = '<div class="text-lg mb-4">Loading chats...</div>';
        
        // Clear main content and add our content
        mainElement.innerHTML = '';
        mainElement.appendChild(content);

        try {
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open('keyval-store', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => resolve(event.target.result);
            });

            const transaction = db.transaction(['keyval'], 'readonly');
            const store = transaction.objectStore('keyval');
            const allData = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            // Process chat data
            const chats = allData.map(chat => ({
                id: chat.id,
                title: chat.title || chat.preview?.slice(0, 30) + '...' || 'Untitled Chat',
                size: new Blob([JSON.stringify(chat)]).size,
                messageCount: chat.messages?.length || 0,
                model: chat.model || 'Unknown'
            })).sort((a, b) => b.size - a.size);

            // Format size function
            function formatSize(bytes) {
                const units = ['B', 'KB', 'MB'];
                let size = bytes;
                let unitIndex = 0;
                while (size >= 1024 && unitIndex < units.length - 1) {
                    size /= 1024;
                    unitIndex++;
                }
                return `${size.toFixed(1)} ${units[unitIndex]}`;
            }

            // Update content
            content.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <div class="text-lg font-medium">Chat Sizes</div>
                    <div class="text-sm opacity-70">Total: ${chats.length} chats</div>
                </div>
                <div class="space-y-2">
                    ${chats.slice(0, 20).map((chat, index) => `
                        <div class="bg-zinc-800 rounded p-3">
                            <div class="flex justify-between items-start">
                                <div>
                                    <div class="font-medium">${chat.title}</div>
                                    <div class="text-sm opacity-70">
                                        Size: ${formatSize(chat.size)}
                                        • Messages: ${chat.messageCount}
                                        • Model: ${chat.model}
                                    </div>
                                </div>
                                <div class="text-sm opacity-50">#${index + 1}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

        } catch (error) {
            content.innerHTML = `
                <div class="text-red-500">
                    Error loading chats: ${error.message}
                </div>
            `;
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

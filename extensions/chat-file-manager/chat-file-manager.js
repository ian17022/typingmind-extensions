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

    fileManagerButton.addEventListener('click', async function() {
        try {
            // Log all available containers and elements
            console.log('Available elements:', {
                nextDiv: document.getElementById('__next'),
                mainElement: document.querySelector('main'),
                contentArea: document.querySelector('.overflow-hidden.w-full.h-full'),
                chatContainer: document.querySelector('[data-element-id="chat-container"]'),
                chatMessages: document.querySelector('[data-element-id="chat-messages"]'),
                allDataElements: document.querySelectorAll('[data-element-id]')
            });

            // First get the data
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open('keyval-store', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => resolve(event.target.result);
            });

            const chats = await new Promise((resolve, reject) => {
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
                                title: chatData.chatTitle || chatData.preview?.slice(0, 50) || 'Untitled Chat',
                                size: size,
                                messageCount: chatData.messages?.length || 0,
                                preview: chatData.preview
                            });
                        }
                        cursor.continue();
                    } else {
                        resolve(chats);
                    }
                };
            });

            const top20Chats = chats
                .sort((a, b) => b.size - a.size)
                .slice(0, 20);

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

            // Create our content
            const content = document.createElement('div');
            content.className = 'flex flex-col h-full';
            content.innerHTML = `
                <div class="flex-1 overflow-auto p-4">
                    <div class="max-w-4xl mx-auto">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl font-bold">Top 20 Largest Chats</h2>
                            <span class="text-sm opacity-70">Total chats: ${chats.length}</span>
                        </div>
                        <div class="space-y-2" id="chat-list">
                            ${top20Chats.map((chat, index) => `
                                <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg" id="chat-item-${chat.id}">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2">
                                            <span class="text-sm opacity-50">#${index + 1}</span>
                                            <span class="font-medium truncate">${chat.title}</span>
                                        </div>
                                        <div class="text-sm opacity-70 mt-1">
                                            ${formatSize(chat.size)} • ${chat.messageCount} messages
                                        </div>
                                        ${chat.preview ? `
                                            <div class="text-sm opacity-50 mt-1 truncate">
                                                ${chat.preview}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <button 
                                        class="ml-4 px-3 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                                        onclick="(async function() { 
                                            if(confirm('Delete this chat?')) {
                                                try {
                                                    const request = indexedDB.open('keyval-store', 1);
                                                    request.onsuccess = (event) => {
                                                        const db = event.target.result;
                                                        const tx = db.transaction(['keyval'], 'readwrite');
                                                        const store = tx.objectStore('keyval');
                                                        const deleteRequest = store.delete('${chat.id}');
                                                        deleteRequest.onsuccess = () => {
                                                            const element = document.getElementById('chat-item-${chat.id}');
                                                            if (element) element.remove();
                                                        };
                                                    };
                                                } catch (error) {
                                                    console.error('Error deleting chat:', error);
                                                    alert('Error deleting chat');
                                                }
                                            }
                                        })()"
                                    >
                                        Delete
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            // Try to find the right container
            const mainContainer = document.querySelector('main');
            if (mainContainer) {
                const originalContent = mainContainer.innerHTML;
                const wrapper = document.createElement('div');
                wrapper.className = 'relative h-full';
                wrapper.appendChild(content);
                
                const backButton = document.createElement('button');
                backButton.className = 'absolute top-4 left-4 px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700 transition-colors z-50';
                backButton.innerHTML = '← Back';
                backButton.onclick = () => {
                    mainContainer.innerHTML = originalContent;
                };
                wrapper.appendChild(backButton);
                
                mainContainer.innerHTML = '';
                mainContainer.appendChild(wrapper);
            } else {
                // Try the New Chat approach
                const newChatButton = document.querySelector('[data-element-id="new-chat-button"]');
                if (newChatButton) {
                    newChatButton.click();
                    setTimeout(() => {
                        const chatArea = document.querySelector('[data-element-id="chat-messages"]');
                        if (chatArea) {
                            chatArea.innerHTML = '';
                            chatArea.appendChild(content);
                        } else {
                            alert('Could not find chat area');
                        }
                    }, 100);
                } else {
                    alert('Could not find necessary elements');
                }
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Error loading chats. Check console for details.');
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

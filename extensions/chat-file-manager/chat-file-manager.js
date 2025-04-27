(function() {
    class ChatFileManager {
        constructor() {
            this.init();
        }

        init() {
            // Use MutationObserver to watch for the sidebar
            const observer = new MutationObserver((mutations) => {
                if (this.insertButton()) {
                    observer.disconnect();
                }
            });

            // Start observing the document body for changes
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Also try to insert immediately and periodically
            this.insertButton();
            
            // Backup approach: try several times
            const maxAttempts = 10;
            let attempts = 0;
            const interval = setInterval(() => {
                if (this.insertButton() || attempts >= maxAttempts) {
                    clearInterval(interval);
                }
                attempts++;
            }, 1000);
        }

        insertButton() {
            // Try to find the teams button as reference point
            const teamsButton = document.querySelector('[data-element-id="workspace-tab-teams"]');
            if (!teamsButton || !teamsButton.parentNode) return false;

            // Check if our button already exists
            if (document.querySelector('[data-element-id="file-size-view-button"]')) {
                return true;
            }

            // Create our button
            const button = document.createElement('button');
            button.setAttribute('data-element-id', 'file-size-view-button');
            button.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';

            button.innerHTML = `
                <span class="block group-hover:bg-white/30 w-[35px] h-[35px] transition-all rounded-lg flex items-center justify-center group-hover:text-white/90">
                    <svg class="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M14 2H6C4.89 2 4 2.89 4 4V20C4 21.11 4.89 22 6 22H18C19.11 22 20 21.11 20 20V8L14 2M18 20H6V4H13V9H18V20M17 13H7V11H17V13M15 17H7V15H15V17Z"/>
                    </svg>
                </span>
                <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Files</span>
            `;

            // Add click handler
            button.addEventListener('click', () => this.handleButtonClick());

            // Insert the button after the teams button
            teamsButton.parentNode.insertBefore(button, teamsButton.nextSibling);

            // Add styles
            if (!document.getElementById('chat-file-manager-styles')) {
                const style = document.createElement('style');
                style.id = 'chat-file-manager-styles';
                style.textContent = `
                    .file-size-panel {
                        padding: 1rem;
                        background: var(--tm-background-secondary);
                        margin: 1rem;
                        border-radius: 8px;
                    }
                    .chat-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.8rem;
                        margin-bottom: 0.5rem;
                        background: var(--tm-background-primary);
                        border-radius: 6px;
                        border: 1px solid var(--tm-border-color);
                    }
                    .file-info {
                        flex: 1;
                    }
                    .delete-btn {
                        padding: 0.5rem;
                        border-radius: 6px;
                        border: none;
                        background: var(--tm-danger-light);
                        color: var(--tm-danger);
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .delete-btn:hover {
                        background: var(--tm-danger);
                        color: white;
                    }
                `;
                document.head.appendChild(style);
            }

            return true;
        }

        async handleButtonClick() {
            const mainContent = document.querySelector('[data-element-id="main-content"]');
            if (!mainContent) return;

            // Create the panel
            const panel = document.createElement('div');
            panel.className = 'file-size-panel';

            // Get all chats from IndexedDB
            const chats = await this.getChatsWithSize();

            // Sort chats by size
            chats.sort((a, b) => b.size - a.size);

            // Create content
            panel.innerHTML = `
                <h3 class="text-lg font-semibold mb-4">Chats by File Size</h3>
                <div class="chat-list"></div>
            `;

            const chatList = panel.querySelector('.chat-list');
            chats.forEach(chat => {
                const chatElement = document.createElement('div');
                chatElement.className = 'chat-item';
                chatElement.innerHTML = `
                    <div class="file-info">
                        <div class="chat-title font-medium">${chat.title || 'Untitled Chat'}</div>
                        <div class="chat-meta text-sm opacity-70">
                            ${this.formatSize(chat.size)}
                            ${chat.hasImages ? '🖼️' : ''}
                            ${chat.hasPDFs ? '📄' : ''}
                        </div>
                    </div>
                    <button class="delete-btn" data-chat-id="${chat.id}">Delete</button>
                `;

                chatElement.querySelector('.delete-btn').addEventListener('click', () => {
                    this.deleteChat(chat.id);
                    chatElement.remove();
                });

                chatList.appendChild(chatElement);
            });

            // Clear main content and add our panel
            mainContent.innerHTML = '';
            mainContent.appendChild(panel);
        }

        async getChatsWithSize() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('keyval-store', 1);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['keyval'], 'readonly');
                    const store = transaction.objectStore('keyval');
                    
                    const chats = [];
                    store.openCursor().onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const chat = cursor.value;
                            if (chat && chat.messages) {
                                const size = new Blob([JSON.stringify(chat)]).size;
                                const hasImages = chat.messages.some(m => m.type === 'image');
                                const hasPDFs = chat.messages.some(m => m.type === 'pdf');
                                
                                chats.push({
                                    id: cursor.key,
                                    title: chat.title,
                                    size,
                                    hasImages,
                                    hasPDFs
                                });
                            }
                            cursor.continue();
                        } else {
                            resolve(chats);
                        }
                    };
                };
            });
        }

        async deleteChat(chatId) {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('keyval-store', 1);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['keyval'], 'readwrite');
                    const store = transaction.objectStore('keyval');
                    
                    const deleteRequest = store.delete(chatId);
                    deleteRequest.onsuccess = () => resolve();
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                };
            });
        }

        formatSize(bytes) {
            const units = ['B', 'KB', 'MB', 'GB'];
            let size = bytes;
            let unitIndex = 0;
            
            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }
            
            return `${size.toFixed(1)} ${units[unitIndex]}`;
        }
    }

    // Initialize the extension
    new ChatFileManager();
})();

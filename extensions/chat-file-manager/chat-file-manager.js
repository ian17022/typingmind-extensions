// File: chat-file-manager.js

(function() {
    // Constants
    const DB_NAME = 'typingmind';
    const FILE_TYPES = {
        PDF: 'application/pdf',
        IMAGE: 'image/'
    };

    class ChatFileManager {
        constructor() {
            this.init();
        }

        async init() {
            // Create the sidebar button
            this.createSidebarButton();
            
            // Wait for IndexedDB to be ready
            await this.initializeDB();
        }

        createSidebarButton() {
            // Create a new sidebar button element
            const sidebarContainer = document.querySelector('[data-element-id="side-bar"]');
            if (!sidebarContainer) return;

            const button = document.createElement('button');
            button.className = 'sidebar-button';
            button.setAttribute('data-element-id', 'file-size-view-button');
            button.innerHTML = `
                <span class="icon">📊</span>
                <span class="label">File Size View</span>
            `;

            button.addEventListener('click', () => this.handleSidebarButtonClick());
            sidebarContainer.appendChild(button);

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .file-size-panel {
                    padding: 1rem;
                    background: var(--tm-background-secondary);
                    border-radius: 8px;
                    margin: 1rem;
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

                .chat-info {
                    flex: 1;
                    margin-right: 1rem;
                }

                .chat-title {
                    font-weight: 500;
                    margin-bottom: 0.25rem;
                    display: block;
                }

                .chat-meta {
                    font-size: 0.85em;
                    color: var(--tm-text-secondary);
                }

                .file-badge {
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                    background: var(--tm-accent-light);
                    color: var(--tm-accent);
                    margin-right: 0.5rem;
                    font-size: 0.8em;
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

        async initializeDB() {
            // We'll use the existing TypingMind IndexedDB
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME);
                
                request.onerror = () => reject('Could not connect to IndexedDB');
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    resolve();
                };
            });
        }

        async getChatSizes() {
            const transaction = this.db.transaction(['messages', 'attachments'], 'readonly');
            const messageStore = transaction.objectStore('messages');
            const attachmentStore = transaction.objectStore('attachments');

            // Get all chats and their messages
            const messages = await new Promise(resolve => {
                messageStore.getAll().onsuccess = (event) => resolve(event.target.result);
            });

            // Get all attachments
            const attachments = await new Promise(resolve => {
                attachmentStore.getAll().onsuccess = (event) => resolve(event.target.result);
            });

            // Calculate sizes per chat
            const chatSizes = {};
            messages.forEach(msg => {
                if (!chatSizes[msg.chatId]) {
                    chatSizes[msg.chatId] = {
                        size: 0,
                        messageCount: 0,
                        attachments: [],
                        title: msg.chatTitle || 'Untitled Chat'
                    };
                }
                chatSizes[msg.chatId].size += new Blob([JSON.stringify(msg)]).size;
                chatSizes[msg.chatId].messageCount++;
            });

            // Add attachment sizes
            attachments.forEach(attachment => {
                if (chatSizes[attachment.chatId]) {
                    chatSizes[attachment.chatId].size += attachment.size;
                    chatSizes[attachment.chatId].attachments.push({
                        type: attachment.type,
                        size: attachment.size
                    });
                }
            });

            return Object.entries(chatSizes)
                .map(([chatId, data]) => ({
                    chatId,
                    ...data
                }))
                .sort((a, b) => b.size - a.size);
        }

        async handleSidebarButtonClick() {
            const mainContent = document.querySelector('[data-element-id="main-content"]');
            if (!mainContent) return;

            const panel = document.createElement('div');
            panel.className = 'file-size-panel';
            panel.innerHTML = '<h3>Chats by Size</h3>';

            const chats = await this.getChatSizes();
            
            chats.forEach(chat => {
                const chatElement = document.createElement('div');
                chatElement.className = 'chat-item';
                
                const hasImages = chat.attachments.some(a => a.type.startsWith('image/'));
                const hasPDFs = chat.attachments.some(a => a.type === 'application/pdf');
                
                chatElement.innerHTML = `
                    <div class="chat-info">
                        <span class="chat-title">${chat.title}</span>
                        <div class="chat-meta">
                            ${hasImages ? '<span class="file-badge">🖼️ Images</span>' : ''}
                            ${hasPDFs ? '<span class="file-badge">📄 PDFs</span>' : ''}
                            Size: ${(chat.size / (1024 * 1024)).toFixed(2)} MB
                            (${chat.messageCount} messages)
                        </div>
                    </div>
                    <button class="delete-btn" data-chat-id="${chat.chatId}">
                        🗑️ Delete
                    </button>
                `;

                chatElement.querySelector('.delete-btn').addEventListener('click', async (e) => {
                    if (confirm('Are you sure you want to delete this chat and all its attachments?')) {
                        await this.deleteChat(chat.chatId);
                        chatElement.remove();
                    }
                });

                panel.appendChild(chatElement);
            });

            mainContent.innerHTML = '';
            mainContent.appendChild(panel);
        }

        async deleteChat(chatId) {
            const transaction = this.db.transaction(['messages', 'attachments'], 'readwrite');
            const messageStore = transaction.objectStore('messages');
            const attachmentStore = transaction.objectStore('attachments');

            // Delete messages
            await new Promise(resolve => {
                const request = messageStore.index('chatId').getAll(chatId);
                request.onsuccess = (event) => {
                    event.target.result.forEach(msg => {
                        messageStore.delete(msg.id);
                    });
                    resolve();
                };
            });

            // Delete attachments
            await new Promise(resolve => {
                const request = attachmentStore.index('chatId').getAll(chatId);
                request.onsuccess = (event) => {
                    event.target.result.forEach(attachment => {
                        attachmentStore.delete(attachment.id);
                    });
                    resolve();
                };
            });
        }
    }

    // Initialize the extension when the DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        new ChatFileManager();
    });
})();

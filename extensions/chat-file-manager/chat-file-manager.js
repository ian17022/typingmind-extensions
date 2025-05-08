(function() {
    const fileManagerButton = document.createElement('button');
    fileManagerButton.setAttribute('data-element-id', 'file-manager-button');
    fileManagerButton.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/80 z-[60] hidden flex items-center justify-center p-4 overflow-y-auto';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.innerHTML = `
        <div class="bg-zinc-900 rounded-lg w-full max-w-4xl relative my-8">
            <div class="sticky top-0 flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900 z-10">
                <div class="flex items-center justify-between w-full">
                    <h2 class="text-xl font-bold">Top 20 Largest Chats</h2>
                    <button id="close-file-manager" class="hover:bg-zinc-800 p-2 rounded-lg transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div id="file-manager-content" class="p-4 overflow-y-auto" style="max-height: calc(80vh - 100px);">
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = `
        body.overlay-open {
            overflow: hidden;
        }
        .modal-open {
            overflow: hidden;
        }
        .file-manager-overlay {
            overflow-y: auto;
            min-height: 100vh;
            width: 100vw;
            padding: 1rem;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            background-color: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(4px);
        }
        .file-manager-modal {
            background: #18181B;
            border: 1px solid #27272A;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            margin-top: 2rem;
            margin-bottom: 2rem;
        }
        .file-manager-content {
            overflow-y: auto;
            padding: 1rem;
        }
    `;
    document.head.appendChild(style);

    overlay.querySelector('#close-file-manager').addEventListener('click', () => {
        overlay.classList.add('hidden');
        document.body.classList.remove('overlay-open');
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.add('hidden');
            document.body.classList.remove('overlay-open');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
            overlay.classList.add('hidden');
            document.body.classList.remove('overlay-open');
        }
    });

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
            document.body.classList.add('overlay-open');
            
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
                    if (!cursor) {
                        resolve(chats);
                        return;
                    }

                    const chatData = cursor.value;
                    if (chatData && typeof chatData === 'object') {
                        const size = new Blob([JSON.stringify(chatData)]).size;
                        const hasTitle = Boolean(chatData.chatTitle);
                        const title = chatData.chatTitle
                            || chatData.preview?.slice(0, 50)
                            || 'Untitled Chat';
                        const messageCount = chatData.messages?.length || 0;
                        const preview = chatData.preview;

                        // log all chats that lack an explicit chatTitle
                        if (!hasTitle) {
                            console.groupCollapsed(`Untitled Chat Detected (ID: ${cursor.key})`);
                            console.log('Computed title fallback:', title);
                            console.log('Raw chatData:', chatData);
                            console.log('Size (bytes):', size);
                            console.log('Message count:', messageCount);
                            console.log('Preview content:', preview);
                            console.groupEnd();
                        }

                        chats.push({
                            id: cursor.key,
                            title,
                            size,
                            messageCount,
                            preview
                        });
                    }
                    cursor.continue();
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

            const contentArea = overlay.querySelector('#file-manager-content');
            contentArea.innerHTML = `
                <div class="space-y-4">
                    <div class="text-sm text-zinc-400 sticky top-0 bg-zinc-900 pb-2">
                        Total chats: ${chats.length}
                    </div>
                    <div class="space-y-2">
                        ${top20Chats.map((chat, index) => `
                            <div class="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors" id="chat-item-${chat.id}">
                                <div class="flex-1 min-w-0 mr-4">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-sm bg-zinc-700 px-2 py-0.5 rounded-full">#${index + 1}</span>
                                        <span class="font-medium truncate">${chat.title}</span>
                                    </div>
                                    <div class="text-sm text-zinc-400">
                                        ${formatSize(chat.size)} • ${chat.messageCount} messages
                                    </div>
                                    ${chat.preview ? `
                                        <div class="text-sm text-zinc-500 mt-1 truncate">
                                            ${chat.preview}
                                        </div>
                                    ` : ''}
                                </div>
                                <button 
                                    class="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap"
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
                                                        if (element) {
                                                            element.style.opacity = '0';
                                                            setTimeout(() => element.remove(), 300);
                                                        }
                                                    };
                                                };
                                            } catch (error) {
                                                console.error('Error deleting chat:', error);
                                                alert('Error deleting chat');
                                            }
                                        }
                                    })()"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            overlay.classList.remove('hidden');

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

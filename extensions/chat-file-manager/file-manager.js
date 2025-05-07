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
                    <h2 class="text-xl font-bold">PDF & Image Manager</h2>
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
                <path fill="currentColor" d="M12 17.5L6.5 12H10V8H14V12H17.5L12 17.5M20 6H12L10 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6Z"/>
            </svg>
        </span>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Files</span>
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
                    if (cursor) {
                        const chatData = cursor.value;
                        if (chatData && chatData.messages) {
                            const filesInChat = chatData.messages.filter(msg => 
                                msg.content?.includes('.pdf') || 
                                msg.content?.includes('.png') || 
                                msg.content?.includes('.jpg') ||
                                msg.content?.includes('.jpeg') ||
                                msg.type === 'image' ||
                                msg.type === 'pdf'
                            );

                            if (filesInChat.length > 0) {
                                chats.push({
                                    id: cursor.key,
                                    title: chatData.chatTitle || 'Untitled Chat',
                                    files: filesInChat,
                                    timestamp: chatData.createdAt || new Date().toISOString()
                                });
                            }
                        }
                        cursor.continue();
                    } else {
                        resolve(chats);
                    }
                };
            });

            const contentArea = overlay.querySelector('#file-manager-content');
            contentArea.innerHTML = `
                <div class="space-y-4">
                    <div class="text-sm text-zinc-400 sticky top-0 bg-zinc-900 pb-2">
                        Chats with files: ${chats.length}
                    </div>
                    <div class="space-y-4">
                        ${chats.map((chat, chatIndex) => `
                            <div class="bg-zinc-800/50 rounded-lg p-4" id="chat-${chat.id}">
                                <div class="flex items-center justify-between mb-3">
                                    <div class="font-medium">${chat.title}</div>
                                    <div class="text-sm text-zinc-400">
                                        ${new Date(chat.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    ${chat.files.map((file, fileIndex) => `
                                        <div class="flex items-center justify-between bg-zinc-900/50 p-3 rounded" id="file-${chatIndex}-${fileIndex}">
                                            <div class="flex items-center gap-3">
                                                <span class="text-2xl">
                                                    ${file.type === 'image' || file.content?.match(/\.(png|jpg|jpeg)/) ? '🖼️' : '📄'}
                                                </span>
                                                <div class="text-sm truncate">
                                                    ${file.content?.split('/').pop() || `File ${fileIndex + 1}`}
                                                </div>
                                            </div>
                                            <button 
                                                class="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap"
                                                onclick="(async function() { 
                                                    if(confirm('Delete this file?')) {
                                                        try {
                                                            const request = indexedDB.open('keyval-store', 1);
                                                            request.onsuccess = (event) => {
                                                                const db = event.target.result;
                                                                const tx = db.transaction(['keyval'], 'readwrite');
                                                                const store = tx.objectStore('keyval');
                                                                
                                                                // Get the chat data
                                                                const getRequest = store.get('${chat.id}');
                                                                getRequest.onsuccess = () => {
                                                                    const chatData = getRequest.result;
                                                                    // Remove the file from messages
                                                                    chatData.messages = chatData.messages.filter((_, index) => 
                                                                        index !== ${chat.files.indexOf(file)}
                                                                    );
                                                                    // Update the chat
                                                                    store.put(chatData);
                                                                    
                                                                    // Remove the file element
                                                                    const element = document.getElementById('file-${chatIndex}-${fileIndex}');
                                                                    if (element) {
                                                                        element.style.opacity = '0';
                                                                        setTimeout(() => {
                                                                            element.remove();
                                                                            // If no more files, remove the chat container
                                                                            const filesLeft = document.querySelectorAll('#chat-${chat.id} [id^="file-"]').length;
                                                                            if (filesLeft === 1) {
                                                                                const chatElement = document.getElementById('chat-${chat.id}');
                                                                                if (chatElement) chatElement.remove();
                                                                            }
                                                                        }, 300);
                                                                    }
                                                                };
                                                            };
                                                        } catch (error) {
                                                            console.error('Error deleting file:', error);
                                                            alert('Error deleting file');
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
                        `).join('')}
                    </div>
                </div>
            `;

            overlay.classList.remove('hidden');

        } catch (error) {
            console.error('Error:', error);
            alert('Error loading files. Check console for details.');
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

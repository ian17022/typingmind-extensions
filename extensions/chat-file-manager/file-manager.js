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
                    // Log the first chat data to understand the structure
                    if (chats.length === 0) {
                        console.log('Sample chat data structure:', {
                            fullData: chatData,
                            id: cursor.key,
                            title: chatData.chatTitle,
                            createdAt: chatData.createdAt,
                            updatedAt: chatData.updatedAt,
                            messageCount: chatData.messages?.length,
                            sampleMessage: chatData.messages?.[0],
                        });
                    }

                    if (chatData && chatData.messages) {
                        // Log every message with attachments for debugging
                        const filesInChat = chatData.messages.filter(msg => {
                            const hasAttachment = msg.attachments || 
                                               msg.type === 'image' || 
                                               msg.type === 'pdf' ||
                                               (msg.content && (
                                                   msg.content.includes('.pdf') || 
                                                   msg.content.includes('.png') || 
                                                   msg.content.includes('.jpg') ||
                                                   msg.content.includes('.jpeg')
                                               ));
                            
                            if (hasAttachment) {
                                console.log('Found attachment in chat:', {
                                    chatId: cursor.key,
                                    messageType: msg.type,
                                    content: msg.content,
                                    attachments: msg.attachments,
                                    fullMessage: msg
                                });
                            }
                            return hasAttachment;
                        });

                        if (filesInChat.length > 0) {
                            chats.push({
                                id: cursor.key,
                                title: chatData.chatTitle || 'Untitled Chat',
                                files: filesInChat,
                                timestamp: chatData.updatedAt || chatData.createdAt || new Date().toISOString(),
                                messageCount: chatData.messages.length
                            });
                        }
                    }
                    cursor.continue();
                } else {
                    // Sort chats by timestamp (most recent first)
                    chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
                                    ${new Date(chat.timestamp).toLocaleString()}
                                </div>
                            </div>
                            <div class="text-xs text-zinc-500 mb-2">
                                Chat ID: ${chat.id} • Messages: ${chat.messageCount}
                            </div>
                            <div class="space-y-2">
                                ${chat.files.map((file, fileIndex) => `
                                    <div class="flex items-center justify-between bg-zinc-900/50 p-3 rounded" id="file-${chatIndex}-${fileIndex}">
                                        <div class="flex items-center gap-3 flex-1 min-w-0">
                                            <span class="text-2xl flex-shrink-0">
                                                ${file.type === 'image' || file.content?.match(/\.(png|jpg|jpeg)/) ? '🖼️' : '📄'}
                                            </span>
                                            <div class="overflow-hidden">
                                                <div class="text-sm truncate">
                                                    ${file.content?.split('/').pop() || `File ${fileIndex + 1}`}
                                                </div>
                                                <div class="text-xs text-zinc-500 truncate">
                                                    Type: ${file.type || 'unknown'} • ID: ${file.id || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            class="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap ml-2 flex-shrink-0"
                                            onclick="(async function() { 
                                                if(confirm('Delete this file?')) {
                                                    try {
                                                        const request = indexedDB.open('keyval-store', 1);
                                                        request.onsuccess = (event) => {
                                                            const db = event.target.result;
                                                            const tx = db.transaction(['keyval'], 'readwrite');
                                                            const store = tx.objectStore('keyval');
                                                            
                                                            const getRequest = store.get('${chat.id}');
                                                            getRequest.onsuccess = () => {
                                                                const chatData = getRequest.result;
                                                                chatData.messages = chatData.messages.filter((_, index) => 
                                                                    index !== ${chat.files.indexOf(file)}
                                                                );
                                                                store.put(chatData);
                                                                
                                                                const element = document.getElementById('file-${chatIndex}-${fileIndex}');
                                                                if (element) {
                                                                    element.style.opacity = '0';
                                                                    setTimeout(() => {
                                                                        element.remove();
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

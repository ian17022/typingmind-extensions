(function() {
    const niceFilesIcon = `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 6.75 21h10.5a2.25 2.25 0 0 0 2.25-2.25V7.31a2.25 2.25 0 0 0-.659-1.591l-3.06-3.06A2.25 2.25 0 0 0 14.19 2.25H6.75z" />
    </svg>
    `;

    const filesButton = document.createElement('button');
    filesButton.setAttribute('data-element-id', 'files-manager-button');
    filesButton.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';
    filesButton.innerHTML = `
        <span class="block group-hover:bg-white/30 w-[35px] h-[35px] transition-all rounded-lg flex items-center justify-center group-hover:text-white/90">
            ${niceFilesIcon}
        </span>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Files</span>
    `;

    const filesOverlay = document.createElement('div');
    filesOverlay.className = 'fixed inset-0 bg-black/80 z-[60] hidden flex items-center justify-center p-4 overflow-y-auto';
    filesOverlay.style.backdropFilter = 'blur(4px)';
    filesOverlay.innerHTML = `
      <div class="bg-zinc-900 rounded-lg w-full max-w-4xl relative my-8">
        <div class="sticky top-0 flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900 z-10">
          <div class="flex items-center justify-between w-full">
            <h2 class="text-xl font-bold">Chat Images Manager</h2>
            <button id="close-files-manager" class="hover:bg-zinc-800 p-2 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div id="files-manager-content" class="p-4 overflow-y-auto" style="max-height: calc(80vh - 100px);">
        </div>
      </div>
    `;
    document.body.appendChild(filesOverlay);

    filesOverlay.querySelector('#close-files-manager').addEventListener('click', () => {
        filesOverlay.classList.add('hidden');
        document.body.classList.remove('overlay-open');
    }); 
    filesOverlay.addEventListener('click', (e) => {
        if (e.target === filesOverlay) {
            filesOverlay.classList.add('hidden');
            document.body.classList.remove('overlay-open');
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !filesOverlay.classList.contains('hidden')) {
            filesOverlay.classList.add('hidden');
            document.body.classList.remove('overlay-open');
        }
    });

    // Helper for formatting bytes (image size)
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

    filesButton.addEventListener('click', async function() {
        document.body.classList.add('overlay-open');
        const contentArea = filesOverlay.querySelector('#files-manager-content');
        contentArea.innerHTML = '<div class="text-zinc-400 text-sm">Searching for images...</div>';

        try {
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
                        chats.push({id: cursor.key, chatData: cursor.value});
                        cursor.continue();
                    } else {
                        resolve(chats);
                    }
                };
            });

            // Find all chat messages with tm_image_file type in content array
            let results = [];
            chats.forEach(chat => {
                const messages = chat.chatData.messages || [];
                messages.forEach((msg, mi) => {
                    if (!Array.isArray(msg.content)) return;
                    msg.content.forEach((part, pi) => {
                        if (
                            part.type === "tm_image_file" &&
                            typeof part.metadata === "object" &&
                            part.metadata.base64 &&
                            (
                                part.metadata.type?.startsWith("image/") ||
                                (part.metadata.name && /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(part.metadata.name))
                            )
                        ) {
                            results.push({
                                chatId: chat.id,
                                chatTitle: chat.chatData.chatTitle || chat.chatData.preview || 'Untitled Chat',
                                messageIndex: mi,
                                message: msg,
                                partIndex: pi,
                                part: part
                            });
                        }
                    });
                });
            });

            if (results.length === 0) {
                contentArea.innerHTML = `<div class="text-zinc-300 text-lg">No image attachments found in your chats.</div>`;
                filesOverlay.classList.remove('hidden');
                return;
            }

            // Group results by chat
            const grouped = {};
            results.forEach(item => {
                if (!grouped[item.chatId]) {
                    grouped[item.chatId] = {
                        chatTitle: item.chatTitle,
                        images: []
                    };
                }
                grouped[item.chatId].images.push(item);
            });

            // Render UI
            let html = `<div class="text-zinc-400 mb-2 text-sm">Found <b>${results.length}</b> images in <b>${Object.keys(grouped).length}</b> chats.</div>`;
            Object.entries(grouped).forEach(([chatId, obj]) => {
                html += `
                <div class="mb-6 border-b border-zinc-800 pb-4">
                    <div class="font-semibold text-zinc-100 mb-2">${obj.chatTitle}</div>
                    <div class="flex flex-wrap gap-4">`;
                obj.images.forEach((item, idx) => {
                    const meta = item.part.metadata;
                    html += `
                        <div class="bg-zinc-800 p-3 rounded-lg flex flex-col items-center" style="min-width: 140px; max-width: 170px;">
                            <img src="${meta.base64}" alt="${meta.name}" class="rounded max-w-[120px] max-h-[120px] mb-2 border border-zinc-700 bg-zinc-900"/>
                            <span class="text-xs text-zinc-200 mb-1 break-all text-center">${meta.name || 'image'}</span>
                            <span class="text-xs text-zinc-400">${meta.type || ''} • ${formatSize(meta.size||0)}</span>
                            <button 
                                class="mt-2 px-2 py-1 text-xs bg-red-600/80 hover:bg-red-700 text-white rounded transition"
                                data-chat="${item.chatId}"
                                data-msg="${item.messageIndex}" 
                                data-part="${item.partIndex}">
                                Delete Image
                            </button>
                        </div>
                    `;
                });
                html += `</div>
                </div>`;
            });
            contentArea.innerHTML = html;

            // Add delete button handlers
            Array.from(contentArea.querySelectorAll('button[data-chat]')).forEach(btn => {
                btn.addEventListener('click', async function() {
                    const chatId = btn.getAttribute('data-chat');
                    const messageIndex = parseInt(btn.getAttribute('data-msg'));
                    const partIndex = parseInt(btn.getAttribute('data-part'));

                    if (!confirm("Delete this image from this chat message? This cannot be undone.")) return;
                    btn.disabled = true;
                    btn.innerText = "Deleting...";

                    // Open DB for write
                    const db2 = await new Promise((resolve, reject) => {
                        const request = indexedDB.open('keyval-store', 1);
                        request.onerror = () => reject(request.error);
                        request.onsuccess = (event) => resolve(event.target.result);
                    });

                    const tx = db2.transaction(['keyval'], 'readwrite');
                    const store = tx.objectStore('keyval');
                    const getRequest = store.get(chatId);
                    getRequest.onsuccess = function() {
                        const chatObj = getRequest.result;
                        if (!chatObj?.messages || !chatObj.messages[messageIndex]?.content) return;

                        // Remove the image part from message content
                        chatObj.messages[messageIndex].content.splice(partIndex, 1);

                        // Remove the chat if the message content is now empty array
                        // (optional - here we keep the chat)

                        const updateReq = store.put(chatObj, chatId);
                        updateReq.onsuccess = function() {
                            // Remove UI card
                            btn.closest('div.bg-zinc-800').remove();
                        };
                        updateReq.onerror = function() {
                            alert("Failed to update IndexedDB.");
                            btn.disabled = false;
                            btn.innerText = "Delete Image";
                        };
                    };
                    getRequest.onerror = function() {
                        alert("Failed to update IndexedDB.");
                        btn.disabled = false;
                        btn.innerText = "Delete Image";
                    };
                });
            });

        } catch (err) {
            contentArea.innerHTML = '<div class="text-red-400 p-4">Error loading. See console.</div>';
            console.error("Error in files extension:", err);
        }

        filesOverlay.classList.remove('hidden');
    });

    function insertFilesButton() {
        const teamsButton = document.querySelector('[data-element-id="workspace-tab-teams"]');
        if (teamsButton && teamsButton.parentNode) {
            teamsButton.parentNode.insertBefore(filesButton, teamsButton.nextSibling);
            return true;
        }
        return false;
    }
    const observer = new MutationObserver((mutations) => {
        if (insertFilesButton()) {
            observer.disconnect();
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    insertFilesButton();
    const maxAttempts = 10;
    let attempts = 0;
    const interval = setInterval(() => {
        if (insertFilesButton() || attempts >= maxAttempts) {
            clearInterval(interval);
        }
        attempts++;
    }, 1000);
})();

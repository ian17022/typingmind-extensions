(function() {
    // ---- UI: Create "Files" button (styled similarly) ----
    const filesButton = document.createElement('button');
    filesButton.setAttribute('data-element-id', 'files-manager-button');
    filesButton.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';
    filesButton.innerHTML = `
        <span class="block group-hover:bg-white/30 w-[35px] h-[35px] transition-all rounded-lg flex items-center justify-center group-hover:text-white/90">
            <svg class="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm2 8h8v2H8v-2zm0 4h8v2H8v-2z"/>
            </svg>
        </span>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Files</span>
    `;

    // ---- UI: Popup Modal for Files ----
    const filesOverlay = document.createElement('div');
    filesOverlay.className = 'fixed inset-0 bg-black/80 z-[60] hidden flex items-center justify-center p-4 overflow-y-auto';
    filesOverlay.style.backdropFilter = 'blur(4px)';
    filesOverlay.innerHTML = `
      <div class="bg-zinc-900 rounded-lg w-full max-w-4xl relative my-8">
        <div class="sticky top-0 flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900 z-10">
          <div class="flex items-center justify-between w-full">
            <h2 class="text-xl font-bold">Chats with Files</h2>
            <button id="close-files-manager" class="hover:bg-zinc-800 p-2 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div id="files-manager-content" class="p-4 overflow-y-auto" style="max-height: calc(80vh - 100px);">
          <!-- Content fills here -->
        </div>
      </div>
    `;
    document.body.appendChild(filesOverlay);

    // ---- Style for Modal (reuse your CSS) ----
    // (No duplicate needed if you already have the style from your first modal)

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

    // ---- Main Logic for Files Button ----
    filesButton.addEventListener('click', async function() {
        document.body.classList.add('overlay-open');

        // Clear any existing content
        const contentArea = filesOverlay.querySelector('#files-manager-content');
        contentArea.innerHTML = '<div class="text-zinc-400 text-sm">Scanning chats for images or PDFs...</div>';

        try {
            // Open indexedDB and get chats
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

            // Now, find chats with file attachments (images/PDFs)
            let filesInChats = [];
            chats.forEach(chat => {
                const messages = chat.chatData.messages || [];
                messages.forEach((msg, idx) => {
                    // Look for a field (often: msg.files, msg.attachments, msg.images, etc.)
                    let files = [];
                    if (msg.files) files = files.concat(msg.files);
                    if (msg.attachments) files = files.concat(msg.attachments);
                    if (msg.image) files.push(msg.image);
                    if (msg.images) files = files.concat(msg.images);
                    // Cleanup (sometimes "images" may be a string; make it array)
                    if (typeof files === 'string') files = [files];

                    // Now, filter
                    files.forEach(file => {
                        // Check for image or PDF
                        let lower = '';
                        if (typeof file === 'string') lower = file.toLowerCase();
                        else if (file.name) lower = file.name.toLowerCase();
                        else if (file.url) lower = file.url.toLowerCase();
                        if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)$/) || lower.endsWith('.pdf') || lower.startsWith('data:image') || lower.startsWith('data:application/pdf')) {
                            filesInChats.push({
                                chatId: chat.id,
                                chatTitle: chat.chatData.chatTitle || chat.chatData.preview || 'Untitled Chat',
                                messageIdx: idx,
                                message: msg,
                                file: file
                            });
                        }
                    });
                });
            });

            // LOG INFO FOR DEV PURPOSES
            console.log("Detected chats/files to display:");
            filesInChats.forEach(entry => {
                console.log({
                    chatId: entry.chatId,
                    chatTitle: entry.chatTitle,
                    messageIdx: entry.messageIdx,
                    file: entry.file,
                    message: entry.message, // includes everything for now
                });
            });

            // Show summary for user
            contentArea.innerHTML = `
                <div class="space-y-2">
                    <div class="text-sm text-zinc-400">Found ${filesInChats.length} files in ${[...new Set(filesInChats.map(e=>e.chatId))].length} chats. <br>(See console for details)</div>
                    ${
                        filesInChats.slice(0,5).map(entry => `
                            <div class="bg-zinc-800/50 p-3 rounded-lg text-zinc-300 text-xs">
                                Chat: <strong>${entry.chatTitle}</strong> <br>
                                File Info: <code class="bg-zinc-900 px-2 py-1 rounded">${typeof entry.file === 'string' ? entry.file : JSON.stringify(entry.file)}</code> <br>
                                <span class="text-zinc-500">More details in console &rarr;</span>
                            </div>
                        `).join('\n')
                    }
                </div>
            `;

        } catch (err) {
            contentArea.innerHTML = '<div class="text-red-400 p-4">Error loading. See console.</div>';
            console.error("Error in files extension:", err);
        }

        filesOverlay.classList.remove('hidden');
    });

    // ---- Insert Files Button in Sidebar ----
    function insertFilesButton() {
        const teamsButton = document.querySelector('[data-element-id="workspace-tab-teams"]');
        if (teamsButton && teamsButton.parentNode) {
            // Insert AFTER teamsButton
            teamsButton.parentNode.insertBefore(filesButton, teamsButton.nextSibling);
            return true;
        }
        return false;
    }
    // Observer method to wait for sidebar mount
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
    // fallback interval
    const maxAttempts = 10;
    let attempts = 0;
    const interval = setInterval(() => {
        if (insertFilesButton() || attempts >= maxAttempts) {
            clearInterval(interval);
        }
        attempts++;
    }, 1000);
})();

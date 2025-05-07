(function() {
    // -- Nice Folder SVG icon --
    const niceFilesIcon = `
        <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 7V3a2 2 0 012-2h6a2 2 0 012 2v4m2 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2h10a2 2 0 012 2z"/>
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
            <h2 class="text-xl font-bold">Chats with Files</h2>
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

    filesButton.addEventListener('click', async function() {
        document.body.classList.add('overlay-open');

        // Info for user
        const contentArea = filesOverlay.querySelector('#files-manager-content');
        contentArea.innerHTML = '<div class="text-zinc-400 text-sm">Scanning chats... (see console log for details)</div>';

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

            // LOG all messages so you can check how files & images are stored
            chats.forEach(chat => {
                const title = chat.chatData.chatTitle || chat.chatData.preview || 'Untitled Chat';
                const messages = chat.chatData.messages || [];
                console.groupCollapsed(`Chat: ${title} (${chat.id}), messages: ${messages.length}`);
                messages.forEach((msg, idx) => {
                    console.log(`Message #${idx}`, msg);
                });
                console.groupEnd();
            });

            contentArea.innerHTML = `
                <div class="text-green-400 p-4">
                    All chat messages logged to console.<br>
                    <span class="text-zinc-400">Expand them to find how images/PDFs are represented. <br>Paste a sample here for further help!</span>
                </div>
            `;

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

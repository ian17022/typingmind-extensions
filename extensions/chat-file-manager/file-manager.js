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
            <h2 class="text-xl font-bold">Debug: Chats with Files</h2>
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
        const contentArea = filesOverlay.querySelector('#files-manager-content');
        contentArea.innerHTML = '<div class="text-zinc-400 text-sm">Loading chats from storage ...</div>';

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

            let html = `<div class="text-lg font-bold text-zinc-100">Loaded ${chats.length} chats</div>`;

            if (chats.length === 0) {
                html += `<div class="text-red-400 mt-4">No chats found. Storage may be empty!</div>`;
            }

            chats.slice(0, 3).forEach((chat, i) => {
                const title = chat.chatData.chatTitle || chat.chatData.preview || 'Untitled Chat';
                const messages = chat.chatData.messages || [];
                html += `<div class="mt-4 border border-zinc-700 rounded p-2">
                    <div class="font-semibold text-zinc-200">Chat #${i + 1}: <span class="text-zinc-300">${title}</span> (<span class="text-xs text-zinc-400">ID: ${chat.id}</span>)</div>
                    <div class="text-xs text-zinc-400">Messages: ${messages.length}</div>
                    ${
                        messages.length > 0
                        ? `<pre class="bg-zinc-800 rounded p-2 mt-2 overflow-x-auto text-xs text-zinc-200">${JSON.stringify(messages[0], null, 2)}</pre>
                        <div class="text-xs text-zinc-400 mb-2">[First message object - copy this and send to your assistant!]</div>`
                        : '<div class="text-red-400">No messages in this chat.</div>'
                    }
                </div>`;
            });

            contentArea.innerHTML = html;

            console.log(`[Debug] Loaded ${chats.length} chats.`);
            chats.forEach(chat => {
                const title = chat.chatData.chatTitle || chat.chatData.preview || 'Untitled Chat';
                const messages = chat.chatData.messages || [];
                console.groupCollapsed(`Chat "${title}" (ID: ${chat.id}) - ${messages.length} messages`);
                messages.forEach((msg, idx) => {
                    console.log(`Message #${idx}:`, msg);
                });
                console.groupEnd();
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

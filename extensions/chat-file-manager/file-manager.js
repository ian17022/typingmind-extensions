(function() {
    const fileManagerButton = document.createElement('button');
    fileManagerButton.setAttribute('data-element-id', 'files-button');
    fileManagerButton.className = 'cursor-default group flex items-center justify-center p-1 text-sm font-medium flex-col group focus:outline-0 focus:text-white text-white/70';
    fileManagerButton.innerHTML = `
        <span class="block group-hover:bg-white/30 w-[35px] h-[35px] transition-all rounded-lg flex items-center justify-center group-hover:text-white/90">
            <svg class="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 17.5L6.5 12H10V8H14V12H17.5L12 17.5M20 6H12L10 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6Z"/>
            </svg>
        </span>
        <span class="font-normal self-stretch text-center text-xs leading-4 md:leading-none">Files</span>
    `;

    fileManagerButton.addEventListener('click', async () => {
        console.log('Files button clicked');
        
        try {
            // Open IndexedDB
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open('keyval-store', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => resolve(event.target.result);
            });

            // Get transaction and store
            const transaction = db.transaction(['keyval'], 'readonly');
            const store = transaction.objectStore('keyval');

            // Get all chats
            const request = store.getAll();
            request.onsuccess = () => {
                const chats = request.result;
                console.log('Total chats found:', chats.length);

                // Log first chat structure
                if (chats.length > 0) {
                    console.log('Sample chat structure:', {
                        id: chats[0].id,
                        chatTitle: chats[0].chatTitle,
                        messageCount: chats[0].messages?.length,
                        allKeys: Object.keys(chats[0])
                    });

                    // Log first message structure
                    if (chats[0].messages?.length > 0) {
                        console.log('Sample message structure:', {
                            firstMessage: chats[0].messages[0],
                            allMessageKeys: Object.keys(chats[0].messages[0])
                        });
                    }
                }

                // Look for potential file-related content
                chats.forEach((chat, chatIndex) => {
                    console.log(`\nAnalyzing chat ${chatIndex + 1}:`, {
                        id: chat.id,
                        title: chat.chatTitle,
                        messageCount: chat.messages?.length
                    });

                    chat.messages?.forEach((msg, msgIndex) => {
                        // Log any message that might contain file-related content
                        if (
                            msg.type === 'image' || 
                            msg.type === 'pdf' ||
                            msg.content?.includes('.pdf') ||
                            msg.content?.includes('.png') ||
                            msg.content?.includes('.jpg') ||
                            msg.content?.includes('.jpeg') ||
                            msg.attachments ||
                            msg.files ||
                            msg.file
                        ) {
                            console.log(`Found potential file in message ${msgIndex}:`, {
                                type: msg.type,
                                content: msg.content,
                                attachments: msg.attachments,
                                files: msg.files,
                                file: msg.file,
                                allMessageKeys: Object.keys(msg),
                                fullMessage: msg
                            });
                        }
                    });
                });
            };

            request.onerror = () => {
                console.error('Error accessing IndexedDB:', request.error);
            };

        } catch (error) {
            console.error('Error:', error);
        }
    });

    function insertButton() {
        const teamsButton = document.querySelector('[data-element-id="workspace-tab-teams"]');
        if (teamsButton && teamsButton.parentNode) {
            teamsButton.parentNode.insertBefore(fileManagerButton, teamsButton.nextSibling);
            return true;
        }
        return false;
    }

    const observer = new MutationObserver((mutations) => {
        if (insertButton()) {
            observer.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subt

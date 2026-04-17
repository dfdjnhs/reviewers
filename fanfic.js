const STORAGE_KEY = 'vault_stories';

// --- NEW/UPDATED CHAPTER LOGIC ---

// 1. IMPROVED STORY VIEW (Now with Delete/Rename buttons for Chapters)
window.viewStory = (storyId) => {
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    const target = document.getElementById('modal-target');
    target.innerHTML = `
        <div class="modal-content">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <span class="type-tag" style="background:var(--black); color:white;">${story.tag}</span>
                    <h2 style="font-size: 2.5rem; font-weight: 900; margin-top:5px;">${story.title}</h2>
                </div>
                <button onclick="closeModal()" style="background:none; border:none; font-weight:900; cursor:pointer; font-size:1.2rem;">[X]</button>
            </div>
            
            <div style="height:2px; background:var(--black); margin: 20px 0;"></div>
            
            <div class="tracklist-container" style="max-height: 300px; overflow-y: auto; padding-right: 10px;">
                ${story.chapters.map((ch, i) => `
                    <div class="chapter-row" style="margin-bottom:10px; padding:12px; background:white; border:2px solid black;">
                        <div onclick="openEditor('${story.id}', ${i})" style="flex-grow:1; cursor:pointer; font-weight:900;">
                            <span style="opacity:0.3; margin-right:10px;">${String(i + 1).padStart(2, '0')}</span> 
                            ${ch.title}
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button onclick="renameChapter('${story.id}', ${i})" class="edit-btn" style="background:#3b82f6; color:white; border:2px solid black;">RENAME</button>
                            <button onclick="deleteChapter('${story.id}', ${i})" class="edit-btn" style="background:#ff4444; color:white; border:2px solid black;">TRASH</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:25px;">
                <button class="admin-toggle" style="background:#22c55e; border:3px solid black; padding:15px;" onclick="addNewChapter('${story.id}')">+ NEW CHAPTER</button>
                <button class="admin-toggle" style="background:#ff4444; border:3px solid black; padding:15px; color:white;" onclick="deleteStory('${story.id}')">DELETE PIECE</button>
            </div>
        </div>
    `;
    document.getElementById('overlay').style.display = 'flex';
};

// 2. DELETE CHAPTER LOGIC
window.deleteChapter = (storyId, chapterIndex) => {
    if(!confirm("DELETE THIS CHAPTER? THIS CANNOT BE UNDONE.")) return;
    
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const sIdx = stories.findIndex(s => s.id === storyId);
    
    // Remove exactly one chapter at the specific index
    stories[sIdx].chapters.splice(chapterIndex, 1);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    viewStory(storyId); // Refresh the list
};

// 3. RENAME CHAPTER LOGIC
window.renameChapter = (storyId, chapterIndex) => {
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const sIdx = stories.findIndex(s => s.id === storyId);
    const oldTitle = stories[sIdx].chapters[chapterIndex].title;
    
    const newTitle = prompt("RENAME CHAPTER:", oldTitle);
    
    if (newTitle && newTitle.trim() !== "") {
        stories[sIdx].chapters[chapterIndex].title = newTitle.trim();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
        viewStory(storyId);
    }
};

// 4. IMPROVED SAVE LOGIC (Silent save + Alert)
window.saveChapter = (storyId, index) => {
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const sIdx = stories.findIndex(s => s.id === storyId);
    
    const newTitle = document.getElementById('edit-ch-title').value;
    const newContent = document.getElementById('writing-board').innerHTML;
    
    stories[sIdx].chapters[index].title = newTitle;
    stories[sIdx].chapters[index].content = newContent;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    
    // Visual feedback instead of an annoying alert every time
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "SAVED!";
    saveBtn.style.background = "#fff";
    setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.style.background = "#22c55e";
    }, 2000);
};


// --- DRAWER LOGIC ---
window.toggleDrawer = (show) => {
    const drawer = document.getElementById('admin-drawer');
    if (drawer) drawer.style.display = show ? 'block' : 'none';
};

window.openStoryCreator = () => toggleDrawer(true);

// --- CORE CRUD OPERATIONS ---
window.executeUpload = () => {
    const title = document.getElementById('entry-title').value;
    const tag = document.getElementById('entry-tags').value;
    const count = parseInt(document.getElementById('entry-chapters').value) || 1;

    if (!title) return alert("TITLE REQUIRED");

    const newStory = {
        id: "fic_" + Date.now(),
        title: title,
        tag: tag,
        chapters: Array.from({ length: count }, (_, i) => ({ 
            title: `Chapter ${i + 1}`, 
            content: "" 
        }))
    };

    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    stories.unshift(newStory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));

    // Clear inputs and refresh
    document.getElementById('entry-title').value = '';
    toggleDrawer(false);
    renderStories(); 
};

window.renderStories = () => {
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const list = document.getElementById('story-list');
    
    if (!list) return;

    if (stories.length === 0) {
        list.innerHTML = `<p style="opacity:0.5; padding:20px;">NO STORIES IN LIBRARY.</p>`;
        return;
    }

    list.innerHTML = stories.map(s => `
        <div class="card" onclick="viewStory('${s.id}')">
            <span class="type-tag">${s.tag}</span>
            <div style="font-size: 1.5rem; font-weight: 900; margin-top: 5px;">${s.title}</div>
            <div style="font-size: 10px; font-weight: 700; opacity: 0.6; margin-top: 10px;">
                CHAPTERS: ${s.chapters.length}
            </div>
        </div>
    `).join('');
};

let autoSaveInterval = null; // Global variable to track the timer

window.openEditor = (storyId, chapterIndex) => {
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const story = stories.find(s => s.id === storyId);
    const chapter = story.chapters[chapterIndex];

    const overlay = document.getElementById('overlay');
    const target = document.getElementById('modal-target');
    
    // 1. Activate Fullscreen Mode on the overlay
    overlay.classList.add('editor-active');
    
    // 2. Clear any lingering modal styling
    target.style.cssText = "background:transparent; border:none; box-shadow:none;";

    target.innerHTML = `
        <div class="editor-wrapper">
            <div class="editor-ui-header">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="stats-bar" style="display:flex; gap:20px; color:#fff;">
                        <span id="mode-indicator" style="color:#22c55e; font-weight:900;">READING</span>
                        <span>WORDS: <span id="word-count" style="color:#FFCBEA;">0</span></span>
                        <span><span id="read-time" style="color:#FFCBEA;">0m</span> READ</span>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button id="edit-toggle-btn" onclick="enableEditing()" class="edit-btn" style="background:#FFCBEA; color:#000; border:2px solid #000;">UNLOCK</button>
                        <button id="save-btn" onclick="saveChapter('${storyId}', ${chapterIndex})" class="edit-btn" style="background:#22c55e; display:none; border:2px solid #000;">SAVE</button>
                        <button onclick="exitEditor()" class="edit-btn" style="background:#444; border:2px solid #000;">EXIT</button>
                    </div>
                </div>
                
                <div id="format-tools" style="display:none; margin-top:10px; gap:5px;">
                    <button class="format-btn" onclick="formatDoc('bold')">B</button>
                    <button class="format-btn" onclick="formatDoc('italic')">I</button>
                    <button class="format-btn" onclick="formatDoc('underline')">U</button>
                </div>

                <div id="adv-tools" style="display:none; margin-top:10px; gap:5px;">
                    <input type="text" id="find-txt" class="tool-input" placeholder="FIND...">
                    <input type="text" id="replace-txt" class="tool-input" placeholder="REPLACE...">
                    <button onclick="executeReplace()" class="edit-btn">GO</button>
                </div>
            </div>

            <div class="editor-scroller">
                <div class="editor-paper">
                    <input type="text" id="edit-ch-title" value="${chapter.title}" readonly 
                        style="border:none; border-bottom:2px solid #000; outline:none; font-weight:900; font-size:1.8rem; text-transform:uppercase; margin-bottom:30px; width:100%;">
                    
                    <div id="writing-board" contenteditable="false" spellcheck="true" oninput="handleEditorInput()" style="min-height: 800px; outline:none; text-align:justify;">
                        ${chapter.content || ""}
                    </div>
                </div>
            </div>
        </div>
    `;
    overlay.style.display = 'block'; // Ensure it shows
    updateStats();
};


window.formatDoc = (cmd) => {
    document.execCommand(cmd, false, null);
    document.getElementById('writing-board').focus();
};


window.handleEditorInput = () => {
    updateStats();
    startAutoSaveTimer();
};

window.updateStats = () => {
    const board = document.getElementById('writing-board');
    const text = board.innerText || board.textContent;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // Update Word Count
    document.getElementById('word-count').innerText = words;
    
    // Update Reading Time (Average reading speed: 200 words per minute)
    const minutes = Math.ceil(words / 200);
    document.getElementById('read-time').innerText = words > 0 ? `${minutes}m` : "0m";
};

window.startAutoSaveTimer = () => {
    // Only set the timer if it's not already running
    if (autoSaveInterval) return;

    autoSaveInterval = setTimeout(() => {
        const saveBtn = document.getElementById('save-btn');
        // Only auto-save if we are in Editing Mode (save button is visible)
        if (saveBtn && saveBtn.style.display !== "none") {
            // Trigger the click logic of the save button
            saveBtn.click();
            console.log("Auto-saved at: " + new Date().toLocaleTimeString());
        }
        autoSaveInterval = null; // Reset timer so it can trigger again on next type
    }, 10000); // 10 Seconds
};

// Clear the timer when exiting to prevent background errors
window.exitEditor = () => {
    if (autoSaveInterval) clearTimeout(autoSaveInterval);
    autoSaveInterval = null;
    
    const overlay = document.getElementById('overlay');
    // REMOVE the fullscreen class so the library modals work normally again
    overlay.classList.remove('editor-active');
    
    closeModal();
    renderStories();
};


window.enableEditing = () => {
    const board = document.getElementById('writing-board');
    const title = document.getElementById('edit-ch-title');
    const indicator = document.getElementById('mode-indicator');
    
    // 1. Enable Typing
    board.contentEditable = "true"; 
    title.readOnly = false;
    
    // 2. Visual Feedback
    board.style.background = "#fff";
    board.style.border = "0px dashed #22c55e"; // Green dash shows it's active
    board.focus(); // Automatically puts the cursor inside so you can start typing
    
    indicator.innerText = "EDITING MODE";
    indicator.style.color = "#22c55e";
    
    // 3. Swap Buttons
    document.getElementById('edit-toggle-btn').style.display = "none";
    document.getElementById('save-btn').style.display = "block";
};

window.addNewChapter = (storyId) => {
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const sIdx = stories.findIndex(s => s.id === storyId);
    
    stories[sIdx].chapters.push({ 
        title: `Chapter ${stories[sIdx].chapters.length + 1}`, 
        content: "" // Ensure this is empty, not <i></i>
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    viewStory(storyId);
};


window.deleteStory = (storyId) => {
    if(!confirm("PERMANENTLY DELETE THIS STORY?")) return;
    let stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    stories = stories.filter(s => s.id !== storyId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    closeModal();
    renderStories();
};

window.closeModal = () => {
    document.getElementById('overlay').style.display = 'none';
};

// --- ADVANCED EDITOR TOOLS ---

window.updateWordCount = () => {
    const board = document.getElementById('writing-board');
    const text = board.innerText || board.textContent;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    document.getElementById('word-count').innerText = words.length;
};

window.executeReplace = () => {
    const find = document.getElementById('find-txt').value;
    const replace = document.getElementById('replace-txt').value;
    const board = document.getElementById('writing-board');

    if (!find) return alert("Enter a word to find.");

    // Simple global replace using Regex
    const currentHTML = board.innerHTML;
    const newHTML = currentHTML.split(find).join(replace);
    
    board.innerHTML = newHTML;
    alert(`Replaced all instances of "${find}"`);
};

// Update enableEditing to show the toolbar

const originalEnableEditing = window.enableEditing;
window.enableEditing = () => {
    // Run previous logic (board activation)
    const board = document.getElementById('writing-board');
    const title = document.getElementById('edit-ch-title');
    board.contentEditable = "true";
    title.readOnly = false;
    board.focus();
    
    document.getElementById('mode-indicator').innerText = "EDITING";
    document.getElementById('edit-toggle-btn').style.display = "none";
    document.getElementById('save-btn').style.display = "block";

    // Show Toolbars
    document.getElementById('adv-tools').style.display = "flex";
    document.getElementById('format-tools').style.display = "flex";
};

// --- INITIALIZATION ---
// This runs as soon as the script loads to fix the "disappearing stories" bug
function init() {
    renderStories();
}

init();


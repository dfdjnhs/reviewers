const STORAGE_KEY = 'vault_stories';

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

// --- MODAL & EDITOR LOGIC ---
window.viewStory = (storyId) => {
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    const overlay = document.getElementById('overlay');
    const target = document.getElementById('modal-target');

    target.innerHTML = `
        <div class="modal-content">
            <button onclick="closeModal()" style="float:right; background:none; border:none; font-weight:900; cursor:pointer;">[X] CLOSE</button>
            <span class="type-tag">${story.tag}</span>
            <h2 style="font-size: 2.5rem; font-weight: 900; line-height:1;">${story.title}</h2>
            
            <div class="tracklist-container">
                <h4 style="font-size: 0.8rem; font-weight: 900; margin: 15px 0 10px 0;">MANUSCRIPT</h4>
                ${story.chapters.map((ch, i) => `
                    <div class="chapter-row" onclick="openEditor('${story.id}', ${i})">
                        <span><span class="chapter-number">${i + 1}</span> ${ch.title}</span>
                        <span class="edit-btn">EDIT</span>
                    </div>
                `).join('')}
            </div>
            
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="admin-toggle" style="background:#22c55e; flex:1;" onclick="addNewChapter('${story.id}')">+ ADD CHAPTER</button>
                <button class="admin-toggle" style="background:#ff4444; flex:1;" onclick="deleteStory('${story.id}')">DELETE STORY</button>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
};

window.openEditor = (storyId, chapterIndex) => {
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const story = stories.find(s => s.id === storyId);
    const chapter = story.chapters[chapterIndex];

    const target = document.getElementById('modal-target');
    target.innerHTML = `
        <div class="editor-wrapper">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; color:white;">
                <span id="mode-indicator" style="font-weight:900; font-size:0.7rem; color: #aaa;">READING MODE</span>
                <div style="display:flex; gap:10px;">
                    <button id="edit-toggle-btn" onclick="enableEditing()" style="background:#FFCBEA; border:none; padding:5px 15px; font-weight:900; cursor:pointer;">UNLOCK EDIT</button>
                    <button id="save-btn" onclick="saveChapter('${storyId}', ${chapterIndex})" style="background:#22c55e; border:none; padding:5px 15px; font-weight:900; cursor:pointer; display:none;">SAVE CHANGES</button>
                    <button onclick="viewStory('${storyId}')" style="background:#444; color:white; border:none; padding:5px 15px; font-weight:900; cursor:pointer;">EXIT</button>
                </div>
            </div>
            <div class="editor-paper">
                <input type="text" id="edit-ch-title" value="${chapter.title}" readonly style="border:none; outline:none; font-style:normal;">
                <div id="writing-board" contenteditable="false" spellcheck="false" style="font-style: normal; min-height: 400px; padding: 10px;">${chapter.content || ""}</div>
            </div>
        </div>
    `;
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
    board.style.border = "2px dashed #22c55e"; // Green dash shows it's active
    board.focus(); // Automatically puts the cursor inside so you can start typing
    
    indicator.innerText = "EDITING MODE";
    indicator.style.color = "#22c55e";
    
    // 3. Swap Buttons
    document.getElementById('edit-toggle-btn').style.display = "none";
    document.getElementById('save-btn').style.display = "block";
};



window.saveChapter = (storyId, index) => {
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const sIdx = stories.findIndex(s => s.id === storyId);
    
    stories[sIdx].chapters[index].title = document.getElementById('edit-ch-title').value;
    stories[sIdx].chapters[index].content = document.getElementById('writing-board').innerHTML;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    alert("CHAPTER SAVED.");
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

// --- INITIALIZATION ---
// This runs as soon as the script loads to fix the "disappearing stories" bug
function init() {
    renderStories();
}

init();

import { albums as initialAlbums, cinema as initialCinema } from './data.js';

// 1. Initialize Data at the TOP
let localAlbums = JSON.parse(localStorage.getItem('vault_albums')) || [];
let localCinema = JSON.parse(localStorage.getItem('vault_cinema')) || [];
let localStories = JSON.parse(localStorage.getItem('vault_stories')) || [];
let localUpcoming = JSON.parse(localStorage.getItem('vault_upcoming')) || []; // Add this line

// These will be filled during render
let allAlbums = [];
let allCinema = [];

async function initVault() {
    try {
        const response = await fetch('modal.html');
        const text = await response.text();
        
        // Use a DOM parser to grab ONLY the container, not the whole file
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const modalContent = doc.querySelector('.container').innerHTML;

        // Create a wrapper with the isolated class
        const modalWrapper = `<div class="modal-view" id="modal-wrapper" style="display:none;">${modalContent}</div>`;
        document.body.insertAdjacentHTML('beforeend', modalWrapper);

        render(); 
    } catch (err) {
        render();
    }
}

// This makes sure the browser is ready before the script runs
window.addEventListener('DOMContentLoaded', initVault);

    window.currentCategory = 'album';
    window.currentStatus = 'reviewed';

    // 2. Utility Functions
    const getTopId = (data) => {
        if (!data || !data.length) return null;
        return [...data].sort((a, b) => parseFloat(b.score) - parseFloat(a.score))[0].id;
    };

    function getScoreColor(scoreStr) {
        const s = parseFloat(scoreStr);
        if (s >= 90) return "#22c55e";
        if (s >= 70) return "#eab308";
        return "#ef4444";
    }

    function getRemainingTime(targetDate) {
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    
    // If the time has passed
    if (diff <= 0) return "RELEASING...";

    // Calculate time units
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    // Format with leading zeros for a cleaner look
    const d = String(days).padStart(2, '0');
    const h = String(hours).padStart(2, '0');
    const m = String(mins).padStart(2, '0');
    const s = String(secs).padStart(2, '0');

    // Return the new format
    return `${d}D ${h}H ${m}M ${s}S`;
}


    // 3. Navigation
    window.showPage = function(pageId) {
        document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
        document.getElementById('page-' + pageId).style.display = 'block';
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if(document.getElementById('nav-' + pageId)) document.getElementById('nav-' + pageId).classList.add('active');

        if (pageId === 'home') render();
        if (pageId === 'rank-albums') renderSpecificRankings('album');
        if (pageId === 'rank-series') renderSpecificRankings('cinema');
    };

    // 4. Timer Logic
    function checkExpiringTimers() {
    let changed = false;
    const now = new Date().getTime();

    localUpcoming = localUpcoming.filter(item => {
        if (item.releaseDate && new Date(item.releaseDate).getTime() <= now) {
            // Ensure data maps correctly during promotion
            if (item.type === 'ALBUM') {
                // Critical: Ensure sub-info maps to 'artist'
                item.artist = item.artist || item.subText || "Unknown Artist";
                localAlbums.push(item);
            } else {
                item.cast = item.cast || item.subText || "N/A";
                localCinema.push(item);
            }
            changed = true;
            return false;
        }
        return true;
    });

    if (changed) {
        localStorage.setItem('vault_albums', JSON.stringify(localAlbums));
        localStorage.setItem('vault_cinema', JSON.stringify(localCinema));
        localStorage.setItem('vault_upcoming', JSON.stringify(localUpcoming));
        location.reload();
    }
}

    // 5. Main Render
    function render() {
    checkExpiringTimers();
    
    // Refresh combined lists
    allAlbums = [...initialAlbums, ...localAlbums];
    allCinema = [...initialCinema, ...localCinema];

    const topAlbumId = getTopId(allAlbums);
    const topCinemaId = getTopId(allCinema);

    // --- RENDER UPCOMING ---
    const upcomingList = document.getElementById('upcoming-list');
    if (localUpcoming.length > 0) {
        document.getElementById('upcoming-section').style.display = 'block';
        const cardHTML = localUpcoming.map(u => `
            <div class="card upcoming-card-belt" onclick="openModal('${u.id}', 'upcoming')">
                <div class="delete-btn" onclick="event.stopPropagation(); deleteEntry(event, '${u.id}', 'upcoming')">X</div>
                <div class="timer-tag">${getRemainingTime(u.releaseDate)}</div>
                <span class="type-tag" style="font-size: 7px; margin-bottom: 4px;">${u.type}</span>
                <img src="${u.img}">
                <h3 style="font-size: 0.7rem;">${u.title}</h3>
            </div>`).join('');
        upcomingList.innerHTML = cardHTML + cardHTML;
    }

        // --- RENDER ALBUMS ---
        document.getElementById('album-list').innerHTML = allAlbums.map(a => {
            const isTop = a.id === topAlbumId;
            const isElite = parseFloat(a.score) >= 94;
            const cardClass = isTop ? 'champion-card' : (isElite ? 'elite-card' : '');
            return `
                <div class="card album-card ${cardClass}" onclick="openModal('${a.id}', 'album')">
                    <div class="delete-btn" onclick="deleteEntry(event, '${a.id}', 'album')">X</div>
                    <span class="type-tag">${isTop ? '🏆 NO. 1' : 'ALBUM'}</span>
                    <img src="${a.img}">
                    <div class="title-wrapper">
                        <div class="scroll-text-container">
                            <h3 class="item-title">${a.title}</h3>
                            <p class="artist-name">${a.artist || ''}</p>
                        </div>
                        <div class="score-box" style="background:${isTop ? 'white' : getScoreColor(a.score)}; color:${isTop ? '#2563eb' : 'white'}">${a.score}</div>
                    </div>
                </div>`;
        }).join('');

        // --- RENDER CINEMA ---
        document.getElementById('series-list').innerHTML = allCinema.map(c => {
            const isTop = c.id === topCinemaId;
            const isElite = parseFloat(c.score) >= 94;
            const cardClass = isTop ? 'champion-card' : (isElite ? 'elite-card' : '');
            return `
                <div class="card series-card ${cardClass}" onclick="openModal('${c.id}', 'cinema')">
                    <div class="delete-btn" onclick="deleteEntry(event, '${c.id}', 'cinema')">X</div>
                    <span class="type-tag">${isTop ? '🏆 NO. 1' : 'CINEMA'}</span>
                    <img src="${c.poster || c.img}">
                    <div class="title-wrapper">
                        <div class="scroll-text-container">
                            <h3 class="item-title">${c.title}</h3>
                            <p class="artist-name">${c.cast || ''}</p>
                        </div>
                        <div class="score-box" style="background:${isTop ? 'white' : getScoreColor(c.score)}; color:${isTop ? '#2563eb' : 'white'}">${c.score}</div>
                    </div>
                </div>`;
        }).join('');

    // --- RENDER STORIES (FANFICS) ---
    const storyList = document.getElementById('story-list');
    if(storyList) {
        storyList.innerHTML = localStories.map(s => `
            <div class="card" onclick="openStoryFolder('${s.id}')" style="background:#fffbeb; border-style:double;">
                <div class="delete-btn" onclick="event.stopPropagation(); deleteStory('${s.id}')">X</div>
                <span class="type-tag" style="background:#d97706;">SCRIPT</span>
                <h3 style="font-family:'Inter'; font-size:1.4rem; font-weight:900;">${s.title}</h3>
                <p style="font-size:0.7rem; margin-top:5px; opacity:0.6; font-weight:700;">${s.chapters.length} CHAPTERS</p>
            </div>
        `).join('');
    }
}

window.exportVaultData = function() {
    const data = {
        albums: localStorage.getItem('vault_albums'),
        cinema: localStorage.getItem('vault_cinema'),
        singles: localStorage.getItem('vault_singles'),
        upcoming: localStorage.getItem('vault_upcoming')
    };
    
    const dataStr = JSON.stringify(data);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = "the_vault_backup.json";
    link.click();
};

window.importVaultData = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        
        reader.onload = readerEvent => {
            const content = JSON.parse(readerEvent.target.result);
            
            if(confirm("This will overwrite your current preview data. Proceed?")) {
                if(content.albums) localStorage.setItem('vault_albums', content.albums);
                if(content.cinema) localStorage.setItem('vault_cinema', content.cinema);
                if(content.singles) localStorage.setItem('vault_singles', content.singles);
                if(content.upcoming) localStorage.setItem('vault_upcoming', content.upcoming);
                
                alert("Import Successful! Reloading...");
                location.reload();
            }
        };
    };
    input.click();
};

window.openStoryCreator = () => {
    const target = document.getElementById('modal-target');
    target.innerHTML = `
        <h3>INITIALIZE SCRIPT</h3>
        <input type="text" id="story-title" placeholder="STORY TITLE..." style="width:100%; padding:10px; margin:10px 0; border:var(--border);">
        <textarea id="story-desc" placeholder="SYNOPSIS..." style="width:100%; height:100px; padding:10px; border:var(--border);"></textarea>
        <button onclick="saveNewStory()" style="width:100%; background:var(--black); color:white; padding:15px; font-weight:900; border:none; margin-top:10px; cursor:pointer;">CREATE FOLDER</button>
    `;
    document.getElementById('overlay').style.display = 'flex';
};
window.saveChapter = (storyId) => {
    // 1. Grab the data from the editor fields
    const titleInput = document.getElementById('ch-title');
    const board = document.getElementById('writing-board');
    
    if (!titleInput || !board) return;

    const title = titleInput.value.trim() || "UNTITLED_PART";
    const content = board.innerHTML; // Using innerHTML to keep your bold/italic styling

    // 2. Find the specific story in your local array
    const storyIndex = localStories.findIndex(s => s.id === storyId);

    if (storyIndex === -1) {
        alert("ERROR: STORY_NOT_FOUND");
        return;
    }

    // 3. Create the chapter object
    const newChapter = {
        title: title,
        content: content,
        timestamp: new Date().toISOString()
    };

    // 4. Push to the array and LOCK IT into LocalStorage
    localStories[storyIndex].chapters.push(newChapter);
    localStorage.setItem('vault_stories', JSON.stringify(localStories));

    // 5. Provide feedback and return to the folder view
    console.log("CHAPTER_SAVED_SUCCESSFULLY");
    window.openStoryFolder(storyId); 
    render(); // Refresh the main page counts
};

window.saveNewStory = () => {
    const title = document.getElementById('story-title').value;
    const desc = document.getElementById('story-desc').value;
    
    if (!title) {
        alert("Title required!");
        return;
    }

    const newStory = {
        id: "fic_" + Date.now(),
        title: title,
        desc: desc,
        chapters: [] // This starts empty
    };

    localStories.push(newStory);
    localStorage.setItem('vault_stories', JSON.stringify(localStories));
    
    // Close modal and refresh the UI
    document.getElementById('overlay').style.display = 'none';
    render(); 
};

// Opens the list of chapters for a specific story
window.openStoryFolder = (storyId) => {
    const story = localStories.find(s => s.id == storyId);
    if(!story) return;
    
    const target = document.getElementById('modal-target');
    
    // Apply Elite Modal styling if it has many chapters, otherwise standard
    target.className = 'modal-content'; 
    
    target.innerHTML = `
        <div style="font-family:'Inter', sans-serif; padding: 10px;">
            <div style="border-bottom: var(--border); padding-bottom: 15px; margin-bottom: 20px;">
                <span class="type-tag" style="background:#d97706; margin-bottom:10px;">FANFICTION</span>
                <h1 style="font-size: 2.5rem; font-weight: 900; line-height: 0.9; text-transform: uppercase; letter-spacing: -1px;">
                    ${story.title}
                </h1>
                <p style="margin-top: 10px; font-weight: 700; opacity: 0.7; font-size: 0.9rem;">
                    ${story.desc || 'No sypnosis available.'}
                </p>
            </div>
            
            <h3 style="font-size: 0.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; opacity: 0.5;">${story.chapters.length} Chapters
            </h3>
            
            <div id="chapter-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px; border: var(--border); background: #f9f9f9;">
                ${story.chapters.length === 0 ? 
                    `<div style="padding:40px; text-align:center; font-weight:900; opacity:0.3;">No chapters yet.</div>` : 
                    story.chapters.map((ch, index) => `
                    <div class="track-row" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000;">
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-size: 0.7rem; font-weight: 900; opacity: 0.5;">Chapter ${(index + 1).toString().padStart(2, '0')}</span>
                            <span style="font-weight: 900; text-transform: uppercase;">${ch.title}</span>
                        </div>
                        <button onclick="readChapter('${storyId}', ${index})" class="admin-toggle" style="padding: 5px 15px; font-size: 10px;">Read</button>
                    </div>
                `).join('')}
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="openEditor('${storyId}')" class="cat-btn" style="padding: 15px; font-size: 0.8rem; flex: 2;">
                    + NEW CHAPTER
                </button>
                <button onclick="document.getElementById('overlay').style.display='none'" class="cat-btn" style="padding: 15px; font-size: 0.8rem; flex: 1; background: #444; color: white;">
                    Close
                </button>
            </div>
        </div>
    `;
    document.getElementById('overlay').style.display = 'flex';
};


// Displays the actual text of the chapter
window.readChapter = (storyId, index) => {
    const story = localStories.find(s => s.id == storyId);
    const chapter = story.chapters[index];
    const target = document.getElementById('modal-target');
    
    // 1. Reset class to match the Brutalist aesthetic
    target.className = 'modal-content'; 
    
    target.innerHTML = `
        <div class="editor-wrapper" style="height: 85vh; display: flex; flex-direction: column;">
            <div style="display:flex; justify-content:space-between; align-items:center; max-width:700px; width:100%; margin: 0 auto 10px auto; flex-shrink: 0;">
                <button onclick="openStoryFolder('${storyId}')" class="admin-toggle" style="padding: 4px 12px; font-size: 11px;">← BACK_TO_FOLDER</button>
                <span class="type-tag" style="background: var(--black); color: white;">Reading Chapter ${(index + 1).toString().padStart(2, '0')}</span>
            </div>

            <div class="editor-paper" style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                <h1 style="font-family: 'Inter', sans-serif; font-size: 1.5rem; font-weight: 900; text-transform: uppercase; border-bottom: 4px solid var(--black); margin-bottom: 15px; padding-bottom: 5px; flex-shrink: 0;">
                    ${chapter.title}
                </h1>
                
                <div id="reader-board" style="flex-grow: 1; overflow-y: auto; font-size: 1.1rem; line-height: 1.8; font-family: 'Inter', sans-serif; color: #222; padding-right: 10px;">
                    ${chapter.content}
                </div>
                
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 10px; font-weight: 900; opacity: 0.5; flex-shrink: 0;">
                    End of Chapter ${(index + 1).toString().padStart(2, '0')}
                </div>
            </div>
        </div>
    `;
};

window.openEditor = (storyId) => {
    const target = document.getElementById('modal-target');
    target.innerHTML = `
        <div class="editor-wrapper">
            <div style="display:flex; justify-content:space-between; align-items:center; max-width:700px; width:100%; margin: 0 auto 10px auto;">
                <button onclick="openStoryFolder('${storyId}')" class="admin-toggle" style="padding: 4px 12px; font-size: 11px;">← EXIT</button>
                <button onclick="saveChapter('${storyId}')" class="admin-toggle" style="background:#22c55e;">Save</button>

            </div>

            <div class="editor-paper">
                <div class="editor-toolbar" style="flex-shrink:0;">
                    <button class="toolbar-btn" onclick="document.execCommand('bold')">B</button>
                    <button class="toolbar-btn" onclick="document.execCommand('italic')">I</button>
                    <button class="toolbar-btn" onclick="document.execCommand('underline')">U</button>
                    <button class="toolbar-btn" onclick="document.execCommand('justifyLeft')">L</button>
                    <button class="toolbar-btn" onclick="document.execCommand('justifyCenter')">C</button>
                </div>

                <input type="text" id="ch-title" placeholder="CHAPTER TITLE...">
                
                <div id="writing-board" contenteditable="true" placeholder="Start typing..."></div>
                
            </div>
        </div>
    `;
};

window.exec = (cmd) => document.execCommand(cmd, false, null);

    // 6. Ranking Page Render
    window.renderSpecificRankings = function(type) {
    const containerId = type === 'album' ? 'album-rank-container' : 'series-rank-container';
    const data = type === 'album' ? allAlbums : allCinema;
    
    // Sort by score (Highest first)
    const sorted = [...data].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    const topId = sorted.length > 0 ? sorted[0].id : null;
    
    document.getElementById(containerId).innerHTML = sorted.map((item, index) => {
        const isTop = item.id === topId;
        const isElite = parseFloat(item.score) >= 94;
        const specialClass = isTop ? 'champion-card' : (isElite ? 'elite-card' : '');
        
        // Use poster if img doesn't exist (compatibility fix)9
        const displayImg = item.img || item.poster || 'https://via.placeholder.com/150';

        return `
            <div class="rank-row ${specialClass}" onclick="openModal('${item.id}', '${type}')" style="cursor:pointer">
                <div class="rank-number">${isTop ? '👑' : '#' + (index + 1)}</div>
                <img src="${displayImg}" class="rank-img">
                <div class="rank-info">
                    <h4 style="font-weight:900;">${item.title}</h4>
                    <p>${item.artist || item.cast || ''}</p>
                </div>
                <div class="score-box" style="background:${isTop ? 'white' : getScoreColor(item.score)}; color:${isTop ? '#2563eb' : 'white'}">${item.score}</div>
            </div>
        `;
    }).join('');
}


window.openModal = function(id, type) {
    // This physically changes the page you are on
    // Example result: modal.html?id=123&type=album
    window.location.href = `modal.html?id=${id}&type=${type}`;
};

    // 8. Admin Drawer & Logic
    window.toggleDrawer = (show) => {
        document.getElementById('admin-drawer').style.display = show ? 'block' : 'none';
        if(!show) resetAdmin();
    };

    window.selectCategory = (cat) => {
        window.currentCategory = cat;
        document.getElementById('admin-step-1').style.display = 'none';
        document.getElementById('admin-step-2').style.display = 'block';
        document.getElementById('form-title').innerText = cat === 'album' ? 'NEW ALBUM' : 'NEW CINEMA';
        document.getElementById('album-only-fields').style.display = cat === 'album' ? 'block' : 'none';
    };

    window.setEntryStatus = (status) => {
        window.currentStatus = status;
        document.getElementById('stat-reviewed').classList.toggle('active', status === 'reviewed');
        document.getElementById('stat-upcoming').classList.toggle('active', status === 'upcoming');
        document.getElementById('timer-field').style.display = status === 'upcoming' ? 'block' : 'none';
        document.getElementById('entry-score').style.display = status === 'upcoming' ? 'none' : 'block';
    };

    window.resetAdmin = () => {
        document.getElementById('admin-step-1').style.display = 'block';
        document.getElementById('admin-step-2').style.display = 'none';
        document.querySelectorAll('#admin-drawer input, #admin-drawer textarea').forEach(i => i.value = '');
        document.getElementById('track-input-container').innerHTML = '';
        document.getElementById('live-avg').innerText = '0';
        window.setEntryStatus('reviewed');
    };

    window.addTrackInput = () => {
        const div = document.createElement('div');
        div.className = 'track-input-row';
        div.innerHTML = `<input type="text" placeholder="Track Name" style="flex:3;"><input type="number" placeholder="0" class="track-score" style="flex:1;" oninput="calculateAvg()">`;
        document.getElementById('track-input-container').appendChild(div);
    };

    window.calculateAvg = () => {
        const scores = Array.from(document.querySelectorAll('.track-score')).map(i => parseFloat(i.value)).filter(v => !isNaN(v));
        if (scores.length > 0) {
            const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
            document.getElementById('live-avg').innerText = avg;
            document.getElementById('entry-score').value = avg;
        }
    };

    document.getElementById('save-btn').onclick = () => {
        const title = document.getElementById('entry-title').value;
        const subText = document.getElementById('entry-sub').value;
        const score = document.getElementById('entry-score').value || 0;
        
        if (!title) return alert("Title required");

        const newEntry = {
            id: Date.now().toString(),
            title: title,
            img: document.getElementById('entry-img').value || 'https://via.placeholder.com/300',
            review: document.getElementById('entry-review').value || "No review written yet.",
            score: score,
            releaseDate: document.getElementById('release-date').value,
            type: window.currentCategory.toUpperCase(),
            tracks: Array.from(document.querySelectorAll('.track-input-row')).map(row => ({
                name: row.querySelectorAll('input')[0].value,
                rating: row.querySelectorAll('input')[1].value
            })).filter(t => t.name)
        };

        if (window.currentCategory === 'album') {
            newEntry.artist = subText;
        } else {
            newEntry.cast = subText;
            newEntry.poster = newEntry.img;
        }

        if (window.currentStatus === 'upcoming') {
            localUpcoming.push(newEntry);
            localStorage.setItem('vault_upcoming', JSON.stringify(localUpcoming));
        } else {
            if (window.currentCategory === 'album') {
                localAlbums.push(newEntry);
                localStorage.setItem('vault_albums', JSON.stringify(localAlbums));
            } else {
                localCinema.push(newEntry);
                localStorage.setItem('vault_cinema', JSON.stringify(localCinema));
            }
        }
        location.reload();
    };
    window.deleteStory = (id) => {
    // 1. Ask for confirmation so you don't delete by accident
    if(!confirm("Erase this Story? All existing chapters will be lost after erasing.")) return;

    // 2. Filter the array to remove the specific ID
    localStories = localStories.filter(s => s.id !== id);

    // 3. Update LocalStorage immediately
    localStorage.setItem('vault_stories', JSON.stringify(localStories));

    // 4. Refresh the UI
    render();
};


    window.deleteEntry = (event, id, type) => {
        event.stopPropagation();
        if(!confirm("Erase entry?")) return;
        if(type === 'album') {
            localAlbums = localAlbums.filter(a => a.id !== id);
            localStorage.setItem('vault_albums', JSON.stringify(localAlbums));
        } else if (type === 'cinema') {
            localCinema = localCinema.filter(c => c.id !== id);
            localStorage.setItem('vault_cinema', JSON.stringify(localCinema));
        } else {
            localUpcoming = localUpcoming.filter(u => u.id !== id);
            localStorage.setItem('vault_upcoming', JSON.stringify(localUpcoming));
        }
        location.reload();
    };

    document.getElementById('open-admin').onclick = () => toggleDrawer(true);
    
    setInterval(() => {
        if(localUpcoming.length > 0) render();
    }, 1000);

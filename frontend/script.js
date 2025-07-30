document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';

    // Elements
    const audioPlayer = document.getElementById('audio-player');
    const searchInput = document.getElementById('search-input');
    const playlistListEl = document.getElementById('playlist-list');
    const newPlaylistBtn = document.getElementById('new-playlist-btn');
    const scanMusicBtn = document.getElementById('scan-music-btn');
    const welcomeView = document.getElementById('welcome-view');
    const playlistDetailsView = document.getElementById('playlist-details-view');
    const searchResultsView = document.getElementById('search-results-view');
    const searchResultsList = document.getElementById('search-results-list');
    const detailsName = document.getElementById('details-name');
    const detailsSongCount = document.getElementById('details-song-count');
    const songListEl = document.getElementById('song-list');
    const addSongsBtn = document.getElementById('add-songs-btn');
    const deletePlaylistBtn = document.getElementById('delete-playlist-btn');
    const playPlaylistBtn = document.getElementById('play-playlist-btn');
    const closePlaylistBtn = document.getElementById('close-playlist-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const autoplayBtn = document.getElementById('autoplay-btn');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const currentSongTitleEl = document.getElementById('current-song-title');
    const addSongsModal = document.getElementById('add-songs-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalSongLibrary = document.getElementById('modal-song-library');
    const saveSongsToPlaylistBtn = document.getElementById('save-songs-to-playlist-btn');
    const modalSearchInput = document.getElementById('modal-search-input');
    
    // State
    let playlists = [];
    let currentPlaylist = null;
    let currentSongs = [];
    let songLibrary = [];
    let currentSongIndex = -1;
    let isPlaying = false;
    let isAutoplayOn = true;

    // --- API Calls ---
    const api = {
        getPlaylists: () => fetch(`${API_URL}/playlists`).then(res => res.json()),
        createPlaylist: (name) => fetch(`${API_URL}/playlists`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name }) }).then(res => res.json()),
        deletePlaylist: (id) => fetch(`${API_URL}/playlists/${id}`, { method: 'DELETE' }),
        getSongsForPlaylist: (id) => fetch(`${API_URL}/playlists/${id}/songs`).then(res => res.json()),
        getAllSongs: () => fetch(`${API_URL}/songs`).then(res => res.json()),
        scanDirectory: (path) => fetch(`${API_URL}/scan`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ directoryPath: path }) }).then(res => res.json()),
        addSongsToPlaylist: (playlistId, songIds) => fetch(`${API_URL}/playlists/${playlistId}/songs`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ songIds }) }),
        removeSongFromPlaylist: (playlistId, songId) => fetch(`${API_URL}/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' }),
        searchAll: (term) => fetch(`${API_URL}/search?term=${encodeURIComponent(term)}`).then(res => res.json()),
    };

    // --- UI Rendering ---
    async function renderPlaylists() {
        try {
            playlists = await api.getPlaylists();
            playlistListEl.innerHTML = '';
            playlists.forEach(p => {
                const li = document.createElement('li');
                li.textContent = p.name;
                li.dataset.id = p.id;
                if (currentPlaylist && currentPlaylist.id === p.id) li.classList.add('active');
                playlistListEl.appendChild(li);
            });
        } catch(e) { console.error("Failed to render playlists. Is the backend running?", e); }
    }

    function renderSongs(filter = '') {
        songListEl.innerHTML = '';
        if (!currentPlaylist) return;
        detailsName.textContent = currentPlaylist.name;
        detailsSongCount.textContent = `${currentSongs.length} เพลง`;
        const filteredSongs = currentSongs.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));
        filteredSongs.forEach(song => {
            const originalIndex = currentSongs.findIndex(s => s.id === song.id);
            const li = document.createElement('li');
            li.dataset.index = originalIndex;
            li.innerHTML = `<span class="song-title">${song.name}</span><button class="remove-song-btn" data-song-id="${song.id}"><i class="fa-solid fa-trash"></i></button>`;
            
            // เพิ่มเงื่อนไขการใส่ class 'playing' ที่ถูกต้อง
            if (isPlaying && currentSongIndex === originalIndex) {
                li.classList.add('playing');
            }
            songListEl.appendChild(li);
        });
    }

    async function showPlaylistDetails(playlistId) {
        const selectedPlaylist = playlists.find(p => p.id === playlistId);
        if (!selectedPlaylist) return;
        currentPlaylist = selectedPlaylist;
        currentSongs = await api.getSongsForPlaylist(playlistId);
        welcomeView.classList.add('hidden');
        searchResultsView.classList.add('hidden');
        playlistDetailsView.classList.remove('hidden');
        searchInput.value = '';
        renderPlaylists();
        renderSongs();
    }

    function closePlaylistView() {
        currentPlaylist = null;
        playlistDetailsView.classList.add('hidden');
        searchResultsView.classList.add('hidden');
        welcomeView.classList.remove('hidden');
        renderPlaylists();
    }
    
    // --- Event Listeners ---
    scanMusicBtn.addEventListener('click', async () => {
        const path = prompt("กรุณาใส่ Path เต็มของโฟลเดอร์เพลง (เช่น C:\\Users\\YourName\\Music):");
        if (!path) return;
        scanMusicBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสแกน...';
        scanMusicBtn.disabled = true;
        try {
            const result = await api.scanDirectory(path);
            alert(result.message || 'สแกนเสร็จสิ้น');
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการสแกน โปรดตรวจสอบ Path และ Console');
        } finally {
            scanMusicBtn.innerHTML = '<i class="fa-solid fa-sync"></i> สแกนเพลง';
            scanMusicBtn.disabled = false;
        }
    });

    newPlaylistBtn.addEventListener('click', async () => {
        const name = prompt('กรุณาใส่ชื่อเพลย์ลิสต์ใหม่:');
        if (name) {
            try {
                const newPlaylist = await api.createPlaylist(name);
                await renderPlaylists();
                await showPlaylistDetails(newPlaylist.id); // แก้ไข: ไม่ปิดหน้าต่างหลังสร้าง
            } catch (e) {
                alert('ไม่สามารถสร้างเพลย์ลิสต์ได้ อาจมีชื่อซ้ำกัน');
            }
        }
    });
    
    playlistListEl.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') showPlaylistDetails(parseInt(e.target.dataset.id));
    });
    
    closePlaylistBtn.addEventListener('click', closePlaylistView);

    deletePlaylistBtn.addEventListener('click', async () => {
        if (!currentPlaylist) return;
        if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเพลย์ลิสต์ "${currentPlaylist.name}"?`)) {
            await api.deletePlaylist(currentPlaylist.id);
            closePlaylistView();
        }
    });
    
    songListEl.addEventListener('click', (e) => {
        const songLi = e.target.closest('li');
        if (!songLi) return;
        if (e.target.closest('.remove-song-btn')) {
            const songId = parseInt(e.target.closest('.remove-song-btn').dataset.songId);
            api.removeSongFromPlaylist(currentPlaylist.id, songId).then(async () => {
                 currentSongs = await api.getSongsForPlaylist(currentPlaylist.id);
                 renderSongs(searchInput.value);
            });
        } else {
             playSong(parseInt(songLi.dataset.index));
        }
    });

    // --- Search Logic ---
    async function renderSearchResults(searchTerm) {
        searchResultsList.innerHTML = '';
        try {
            const results = await api.searchAll(searchTerm);
            if (results.playlists.length === 0 && results.songs.length === 0) {
                searchResultsList.innerHTML = '<li>ไม่พบผลการค้นหา</li>';
                return;
            }
            results.playlists.forEach(p => {
                const li = document.createElement('li');
                li.className = 'search-result-item';
                li.dataset.playlistId = p.id;
                li.innerHTML = `<i class="fa-solid fa-compact-disc"></i><span class="search-result-song-name">${p.name}</span><span class="search-result-playlist-name">เพลย์ลิสต์</span>`;
                searchResultsList.appendChild(li);
            });
            results.songs.forEach(s => {
                const li = document.createElement('li');
                li.className = 'search-result-item';
                li.dataset.playlistId = s.playlist_id;
                li.dataset.songId = s.song_id;
                li.innerHTML = `<i class="fa-solid fa-music"></i><span class="search-result-song-name">${s.song_name}</span><span class="search-result-playlist-name">จาก: ${s.playlist_name}</span>`;
                searchResultsList.appendChild(li);
            });
        } catch (e) {
            console.error("Search failed", e);
            searchResultsList.innerHTML = '<li>เกิดข้อผิดพลาดในการค้นหา</li>';
        }
    }

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        if (currentPlaylist) {
            renderSongs(searchTerm);
        } else {
            if (searchTerm) {
                welcomeView.classList.add('hidden');
                playlistDetailsView.classList.add('hidden');
                searchResultsView.classList.remove('hidden');
                renderSearchResults(searchTerm);
            } else {
                closePlaylistView();
            }
        }
    });
    
    searchResultsList.addEventListener('click', async (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const playlistId = parseInt(li.dataset.playlistId);
        const songId = li.dataset.songId ? parseInt(li.dataset.songId) : null;
        
        await showPlaylistDetails(playlistId);
        if (songId) {
            const songIndex = currentSongs.findIndex(s => s.id === songId);
            if (songIndex > -1) playSong(songIndex);
        }
    });

    // --- Modal Logic ---
    addSongsBtn.addEventListener('click', async () => {
        if (!currentPlaylist) return;
        try {
            songLibrary = await api.getAllSongs();
            renderSongLibrary();
            addSongsModal.classList.remove('hidden');
        } catch (error) { alert("ไม่สามารถโหลดคลังเพลงได้ โปรดตรวจสอบว่า Backend Server ทำงานอยู่หรือไม่"); }
    });

    function renderSongLibrary(filter = '') {
        modalSongLibrary.innerHTML = '';
        const filteredLibrary = songLibrary.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));
        filteredLibrary.forEach(song => {
            const alreadyInPlaylist = currentSongs.some(ps => ps.id === song.id);
            const li = document.createElement('li');
            li.innerHTML = `<input type="checkbox" data-song-id="${song.id}" ${alreadyInPlaylist ? 'checked disabled' : ''}><span>${song.name}</span>`;
            modalSongLibrary.appendChild(li);
        });
    }
    modalSearchInput.addEventListener('input', (e) => renderSongLibrary(e.target.value));
    closeModalBtn.addEventListener('click', () => addSongsModal.classList.add('hidden'));

    saveSongsToPlaylistBtn.addEventListener('click', async () => {
        const selectedSongIds = Array.from(modalSongLibrary.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)'))
            .map(input => parseInt(input.dataset.songId));
        if (selectedSongIds.length > 0) {
            await api.addSongsToPlaylist(currentPlaylist.id, selectedSongIds);
            currentSongs = await api.getSongsForPlaylist(currentPlaylist.id);
            renderSongs(); // แก้ไข: ไม่ปิดหน้าต่างหลังเพิ่มเพลง
        }
        addSongsModal.classList.add('hidden');
    });

    // --- Player Logic ---
    playPlaylistBtn.addEventListener('click', () => {
        if (currentPlaylist && currentSongs.length > 0) playSong(0);
    });

    function playSong(songIndex) {
        if (!currentPlaylist || currentSongs.length === 0) return;
        currentSongIndex = songIndex;
        const song = currentSongs[currentSongIndex];
        audioPlayer.src = `http://localhost:3000/play/${song.id}`;
        audioPlayer.play();
        isPlaying = true;
        updatePlayerUI();
    }
    
    function togglePlayPause() {
        if (audioPlayer.src && !audioPlayer.paused) {
             audioPlayer.pause();
             isPlaying = false;
        } else if (audioPlayer.src && audioPlayer.paused) {
            audioPlayer.play();
            isPlaying = true;
        } else if (currentPlaylist && currentSongs.length > 0) {
            playSong(0);
        }
        updatePlayerUI();
    }
    
    function updatePlayerUI() {
        playPauseBtn.querySelector('i').className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
        if (isPlaying && currentSongIndex > -1) {
            currentSongTitleEl.textContent = currentSongs[currentSongIndex].name;
        } else {
             currentSongTitleEl.textContent = 'ยังไม่มีเพลงเล่น';
        }
        // แก้ไข: ตรวจสอบว่ามี currentPlaylist ก่อนเรียก renderSongs
        if (currentPlaylist) {
            renderSongs(searchInput.value);
        }
    }

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return isNaN(sec) ? '0:00' : `${min}:${sec.toString().padStart(2, '0')}`;
    }

    function toggleAutoplay() {
        isAutoplayOn = !isAutoplayOn;
        autoplayBtn.classList.toggle('active', isAutoplayOn);
    }
    
    const playNext = () => { if(currentPlaylist && currentSongs.length > 0) playSong((currentSongIndex + 1) % currentSongs.length); };
    const playPrev = () => { if(currentPlaylist && currentSongs.length > 0) playSong((currentSongIndex - 1 + currentSongs.length) % currentSongs.length); };

    playPauseBtn.addEventListener('click', togglePlayPause);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);
    autoplayBtn.addEventListener('click', toggleAutoplay);

    audioPlayer.addEventListener('ended', () => {
        if(isAutoplayOn) playNext();
        else { isPlaying = false; updatePlayerUI(); }
    });
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    });
    audioPlayer.addEventListener('loadedmetadata', () => totalTimeEl.textContent = formatTime(audioPlayer.duration));
    progressBar.addEventListener('input', () => {
        if (audioPlayer.duration) audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
    });

    function initializeApp() {
        renderPlaylists();
        autoplayBtn.classList.toggle('active', isAutoplayOn);
    }

    initializeApp();
});
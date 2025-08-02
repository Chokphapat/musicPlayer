document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:3000/api";

    // --- Elements ---
    const audioPlayer = document.getElementById("audio-player");
    const detailsName = document.getElementById("details-name");
    const detailsSongCount = document.getElementById("details-song-count");
    const detailsCoverImage = document.getElementById("details-cover-image");
    const detailsCoverIcon = document.getElementById("details-cover-icon");
    const songListEl = document.getElementById("song-list");
    const playPlaylistBtn = document.getElementById("play-playlist-btn");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const autoplayBtn = document.getElementById("autoplay-btn");
    const playPauseBtn = document.getElementById("play-pause-btn");
    const volumeSlider = document.getElementById("volume-slider");
    const progressBar = document.getElementById("progress-bar");
    const currentTimeEl = document.getElementById("current-time");
    const totalTimeEl = document.getElementById("total-time");
    // Autoplay Overlay Elements
    const autoplayOverlay = document.getElementById("autoplay-overlay");
    const startPlaybackBtn = document.getElementById("start-playback-btn");
    
    // --- State ---
    let currentPlaylist = null;
    let currentSongs = [];
    let currentSongIndex = -1;
    let isPlaying = false;
    let isAutoplayOn = true;
    let currentlyPlayingPlaylistId = null; // <--- เพิ่มตัวแปรที่จำเป็นเข้ามา

    // --- API Calls ---
    const api = {
        getSongsForPlaylist: (id) => fetch(`${API_URL}/playlists/${id}/songs`).then((res) => res.json()),
        getPlaylists: () => fetch(`${API_URL}/playlists`).then(res => res.json()),
    };
    
    async function showPlaylistDetails(playlistId) {
        try {
            const playlists = await api.getPlaylists();
            currentPlaylist = playlists.find(p => p.id === playlistId);
            if (!currentPlaylist) throw new Error("Playlist not found");
            currentSongs = await api.getSongsForPlaylist(playlistId);
            renderSongs();
        } catch (error) {
            console.error("Failed to load playlist details:", error);
            document.querySelector('main').innerHTML = `<h1 class="text-red-500 text-center mt-20">ไม่สามารถโหลดเพลย์ลิสต์ได้</h1>`;
        }
    }

    function renderSongs() {
        if (!currentPlaylist) return;
        songListEl.innerHTML = "";
        detailsName.textContent = currentPlaylist.name;
        detailsSongCount.textContent = `${currentSongs.length} เพลง`;
        currentSongs.forEach((song, index) => {
            const tr = document.createElement("tr");
            tr.dataset.index = index;
            tr.className = "group hover:bg-zinc-800/50 rounded-md cursor-pointer";
            const coverArtHtml = song.coverImageURL 
                ? `<img src="${song.coverImageURL}" alt="${song.name}" class="w-10 h-10 object-cover rounded-md">`
                : `<div class="w-10 h-10 bg-zinc-700 flex items-center justify-center rounded-md"><i class="fa-solid fa-music text-zinc-400"></i></div>`;
            
            // โครงสร้างที่ถูกต้องสำหรับ 4 คอลัมน์
            tr.innerHTML = `
                <td class="p-2 text-center text-zinc-400 group-hover:text-white">${index + 1}</td>
                <td class="p-2 flex items-center gap-x-4">
                    ${coverArtHtml}
                    <div class="flex flex-col">
                        <span class="text-white">${song.name}</span>
                        <span class="text-sm text-zinc-400">${song.artist || ""}</span>
                    </div>
                </td>
                <td class="p-2 text-zinc-400 text-right">--:--</td>
            `;
            songListEl.appendChild(tr);
        });
        updatePlayingHighlight();
    }
    
    songListEl.addEventListener("click", (e) => {
        const songTr = e.target.closest("tr");
        if (songTr) playSong(parseInt(songTr.dataset.index), true);
    });

    function prepareSong(songIndex) {
        if (currentSongs.length === 0) return;
        currentSongIndex = songIndex;
        const song = currentSongs[currentSongIndex];
        audioPlayer.src = `http://localhost:3000/play/${song.id}`;
        if (song.coverImageURL) {
            detailsCoverImage.src = song.coverImageURL;
            detailsCoverImage.classList.remove('hidden');
            detailsCoverIcon.classList.add('hidden');
        } else {
            detailsCoverImage.classList.add('hidden');
            detailsCoverIcon.classList.remove('hidden');
        }
        updatePlayerUI();
    }
    
    function playSong(songIndex, playNow = false) {
        currentlyPlayingPlaylistId = currentPlaylist.id; // <--- อัปเดต ID เพลย์ลิสต์ที่กำลังเล่น
        prepareSong(songIndex);
        if (playNow) {
            audioPlayer.play();
            isPlaying = true;
            updatePlayerUI();
        }
    }
    
    function updatePlayerUI() {
        const nowPlayingInfoEl = document.getElementById("now-playing-info");
        playPauseBtn.querySelector("i").className = isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play";

        if (isPlaying && currentSongIndex > -1 && currentSongs[currentSongIndex]) {
            const song = currentSongs[currentSongIndex];
            const coverArtHtml = song.coverImageURL ? `<img src="${song.coverImageURL}" alt="${song.name}" class="w-14 h-14 object-cover rounded-md">` : `<div class="w-14 h-14 bg-zinc-800 rounded-md flex-shrink-0 flex items-center justify-center"><i class="fa-solid fa-music text-zinc-500"></i></div>`;
            nowPlayingInfoEl.innerHTML = `
                ${coverArtHtml}
                <div class="flex flex-col overflow-hidden">
                    <span class="font-semibold text-white truncate">${song.name}</span>
                    <span class="text-sm text-zinc-400 truncate">${song.artist || ""}</span>
                </div>`;
        } else {
            nowPlayingInfoEl.innerHTML = `
                <div class="w-14 h-14 bg-zinc-800 rounded-md flex-shrink-0 flex items-center justify-center"><i class="fa-solid fa-music text-zinc-500"></i></div>
                <div class="flex flex-col"><span class="font-semibold text-white truncate">ยังไม่มีเพลงเล่น</span><span class="text-sm text-zinc-400"></span></div>`;
        }

        if (playPlaylistBtn && currentPlaylist) {
            const icon = playPlaylistBtn.querySelector("i");
            if (isPlaying && currentlyPlayingPlaylistId === currentPlaylist.id) {
                icon.className = "fa-solid fa-pause";
            } else {
                icon.className = "fa-solid fa-play";
            }
        }
        updatePlayingHighlight();
    }

    function updatePlayingHighlight() {
        const allSongItems = songListEl.querySelectorAll("tr");
        allSongItems.forEach((tr) => {
            const index = parseInt(tr.dataset.index);
            const nameSpan = tr.querySelector('td:nth-child(2) span:first-child');
            const indexCell = tr.querySelector('td:first-child');
            if (nameSpan && indexCell) {
                if (isPlaying && currentlyPlayingPlaylistId === currentPlaylist.id && index === currentSongIndex) {
                    nameSpan.classList.add("text-green-500");
                    indexCell.innerHTML = `
                        <div class="flex items-center justify-center h-full ">
                            <span class="equalizer-animation"></span>
                            <span class="equalizer-animation"></span>
                            <span class="equalizer-animation"></span>
                            <span class="equalizer-animation"></span>
                        </div>`;
                } else {
                    nameSpan.classList.remove("text-green-500");
                    indexCell.textContent = index + 1;
                }
            }
        });
    }

    function togglePlayPause() {
        if (audioPlayer.src && !audioPlayer.paused) {
            audioPlayer.pause();
            isPlaying = false;
        } else if (audioPlayer.src && audioPlayer.paused) {
            audioPlayer.play();
            isPlaying = true;
        } else if (currentSongs.length > 0) {
            playSong(currentSongIndex > -1 ? currentSongIndex : 0, true);
        }
        updatePlayerUI();
    }

    const playNext = () => { if (currentSongs.length > 0) playSong((currentSongIndex + 1) % currentSongs.length, true); };
    const playPrev = () => { if (currentSongs.length > 0) playSong((currentSongIndex - 1 + currentSongs.length) % currentSongs.length, true); };
    const toggleAutoplay = () => { isAutoplayOn = !isAutoplayOn; autoplayBtn.classList.toggle("text-green-500", isAutoplayOn); };
    const formatTime = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return isNaN(sec) ? "0:00" : `${min}:${sec.toString().padStart(2, "0")}`;
    }

    playPauseBtn.addEventListener("click", togglePlayPause);
    nextBtn.addEventListener("click", playNext);
    prevBtn.addEventListener("click", playPrev);
    autoplayBtn.addEventListener("click", toggleAutoplay);
    volumeSlider.addEventListener("input", (e) => { audioPlayer.volume = e.target.value / 100; });
    audioPlayer.addEventListener("ended", () => { if (isAutoplayOn) playNext(); else { isPlaying = false; updatePlayerUI(); } });
    audioPlayer.addEventListener("timeupdate", () => {
        if (audioPlayer.duration) progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    });
    audioPlayer.addEventListener("loadedmetadata", () => {
        const duration = audioPlayer.duration;
        totalTimeEl.textContent = formatTime(duration);
        if (currentSongIndex > -1) {
            const songRow = songListEl.querySelector(`tr[data-index="${currentSongIndex}"]`);
            if (songRow) {
                const timeCell = songRow.querySelector('td:last-of-type');
                if (timeCell) timeCell.textContent = formatTime(duration);
            }
        }
    });
    progressBar.addEventListener("input", () => {
        if (audioPlayer.duration) audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
    });
    playPlaylistBtn.addEventListener("click", () => {
        if (isPlaying && currentlyPlayingPlaylistId === currentPlaylist.id) {
            togglePlayPause();
        } else {
            playSong(0, true);
        }
    });
    if (startPlaybackBtn) {
        startPlaybackBtn.addEventListener("click", () => {
            audioPlayer.play();
            isPlaying = true;
            updatePlayerUI();
            autoplayOverlay.classList.add("hidden");
        });
    }
    
    async function initializeApp() {
        const urlParams = new URLSearchParams(window.location.search);
        const playlistId = parseInt(urlParams.get('playlistId'));
        const songIdToPlay = parseInt(urlParams.get('songId'));
        if (playlistId) {
            await showPlaylistDetails(playlistId);
            if (songIdToPlay) {
                const songIndex = currentSongs.findIndex(song => song.id === songIdToPlay);
                if (songIndex !== -1) {
                    prepareSong(songIndex);
                    if (autoplayOverlay) autoplayOverlay.classList.remove("hidden");
                }
            }
        } else {
            document.querySelector('main').innerHTML = `<h1 class="text-red-500 text-center mt-20">ไม่พบ ID ของเพลย์ลิสต์ใน URL</h1>`;
        }
    }

    initializeApp();
});
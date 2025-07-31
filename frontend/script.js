document.addEventListener("DOMContentLoaded", () => {
  console.log("Application Initialized. Starting debug mode.");
  const API_URL = "http://localhost:3000/api";

  // Elements
  const audioPlayer = document.getElementById("audio-player");
  // VVVV ID Changed VVVV
  const playlistSearchInput = document.getElementById("playlist-search-input");
  const songSearchInput = document.getElementById("song-search-input");
  const playlistListEl = document.getElementById("playlist-list");
  const newPlaylistBtn = document.getElementById("new-playlist-btn");
  const scanMusicBtn = document.getElementById("scan-music-btn");
  const welcomeView = document.getElementById("welcome-view");
  const playlistDetailsView = document.getElementById("playlist-details-view");
  // VVVV Removed Elements VVVV
  // const searchResultsView = document.getElementById("search-results-view");
  // const searchResultsList = document.getElementById("search-results-list");
  const addSongsModal = document.getElementById("add-songs-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const modalSongLibrary = document.getElementById("modal-song-library");
  const modalSearchInput = document.getElementById("modal-search-input");
  const saveSongsToPlaylistBtn = document.getElementById(
    "save-songs-to-playlist-btn"
  );
  const detailsName = document.getElementById("details-name");
  const editPlaylistNameBtn = document.getElementById("edit-playlist-name-btn");
  const detailsSongCount = document.getElementById("details-song-count");
  const songListEl = document.getElementById("song-list");
  const addSongsBtn = document.getElementById("add-songs-btn");
  const deletePlaylistBtn = document.getElementById("delete-playlist-btn");
  const playPlaylistBtn = document.getElementById("play-playlist-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const autoplayBtn = document.getElementById("autoplay-btn");
  // VVVV Removed Element VVVV
  // const closePlaylistBtn = document.getElementById("close-playlist-btn");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const volumeSlider = document.getElementById("volume-slider");
  const progressBar = document.getElementById("progress-bar");
  const currentTimeEl = document.getElementById("current-time");
  const totalTimeEl = document.getElementById("total-time");
  const currentSongTitleEl = document.getElementById("current-song-title");

  // State
  let playlists = [];
  let currentPlaylist = null;
  let currentSongs = [];
  let songLibrary = [];
  let currentSongIndex = -1;
  let isPlaying = false;
  let isAutoplayOn = true;
  let currentlyPlayingPlaylistId = null;

  // --- API Calls (same as before) ---
  const api = {
    getPlaylists: () => fetch(`${API_URL}/playlists`).then((res) => res.json()),
    createPlaylist: (name) =>
      fetch(`${API_URL}/playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((res) => res.json()),
    deletePlaylist: (id) =>
      fetch(`${API_URL}/playlists/${id}`, { method: "DELETE" }),
    updatePlaylist: (id, name) =>
      fetch(`${API_URL}/playlists/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    getSongsForPlaylist: (id) =>
      fetch(`${API_URL}/playlists/${id}/songs`).then((res) => res.json()),
    getAllSongs: () => fetch(`${API_URL}/songs`).then((res) => res.json()),
    updateSong: (id, name) =>
      fetch(`${API_URL}/songs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    scanDirectory: (path) =>
      fetch(`${API_URL}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directoryPath: path }),
      }).then((res) => res.json()),
    addSongsToPlaylist: (playlistId, songIds) =>
      fetch(`${API_URL}/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songIds }),
      }),
    removeSongFromPlaylist: (playlistId, songId) =>
      fetch(`${API_URL}/playlists/${playlistId}/songs/${songId}`, {
        method: "DELETE",
      }),
    searchAll: (term) =>
      fetch(`${API_URL}/search?term=${encodeURIComponent(term)}`).then((res) =>
        res.json()
      ),
  };
  function updatePlaylistPlaybackIndicator() {
    playlistListEl.querySelectorAll("li").forEach((li) => {
      // Find and remove any existing speaker icon first to reset
      const existingIcon = li.querySelector(".speaker-icon");
      if (existingIcon) {
        existingIcon.remove();
      }

      // Check if this li is the one currently playing music
      const playlistId = parseInt(li.dataset.id);
      if (isPlaying && playlistId === currentlyPlayingPlaylistId) {
        const speakerIcon = document.createElement("i");
        speakerIcon.className =
          "fa-solid fa-volume-high text-green-500 ml-auto speaker-icon"; // Use ml-auto to push it to the right
        li.appendChild(speakerIcon);
      }
    });
  }
  async function syncPlaylists(activePlaylistId = null) {
    console.log(
      `%c[SYNC_START] Starting sync. Target active ID: ${activePlaylistId}`,
      "color: blue; font-weight: bold;"
    );

    playlists = await api.getPlaylists();
    console.log(
      "[SYNC_FETCH] Fetched latest playlists from server:",
      JSON.parse(JSON.stringify(playlists))
    );

    playlistListEl.innerHTML = "";
    playlists.forEach((p) => {
      // --- START: This is the updated part ---
      const li = document.createElement("li");
      li.dataset.id = p.id;
      // Apply base styling with Tailwind classes for each list item
      li.className =
        "flex items-center gap-x-3 p-2 rounded-md cursor-pointer hover:bg-zinc-800 transition text-zinc-300";

      li.innerHTML = `
            <div class="w-12 h-12 bg-zinc-700 flex-shrink-0 flex items-center justify-center rounded-md">
                <i class="fa-solid fa-music text-zinc-400"></i>
            </div>
            <span class="font-semibold truncate">${p.name}</span>
        `;
      // --- END: This is the updated part ---
      playlistListEl.appendChild(li);
    });
    console.log("[SYNC_RENDER] Sidebar re-rendered.");

    if (activePlaylistId) {
      const playlistToShow = playlists.find((p) => p.id === activePlaylistId);
      if (playlistToShow) {
        await showPlaylistDetails(playlistToShow.id);
      } else {
        closePlaylistView();
      }
    } else {
      closePlaylistView();
    }
    // This function call needs to be here to apply style on initial load/refresh
    updateActivePlaylistStyle();
  }
  async function showPlaylistDetails(playlistId) {
    console.log(
      `%c[SHOW_DETAILS] Showing details for playlist ID: ${playlistId}`,
      "color: green;"
    );
    const selectedPlaylist = playlists.find((p) => p.id === playlistId);

    if (!selectedPlaylist) {
      console.error(
        `[SHOW_DETAILS_ERROR] Playlist with ID ${playlistId} not found in local state.`
      );
      closePlaylistView();
      return;
    }

    currentPlaylist = selectedPlaylist;
    console.log(
      "[SHOW_DETAILS] Current playlist state set to:",
      JSON.parse(JSON.stringify(currentPlaylist))
    );
    currentSongs = await api.getSongsForPlaylist(playlistId);

    welcomeView.classList.add("hidden");
    playlistDetailsView.classList.remove("hidden");

    updateActivePlaylistStyle();
    renderSongs();
  }

  function renderSongs() {
    songListEl.innerHTML = ""; // This is now the <tbody>
    if (!currentPlaylist) return;

    detailsName.textContent = currentPlaylist.name;
    detailsSongCount.textContent = `${currentSongs.length} เพลง`;

    // VVVV Logic Added VVVV
    // Filter songs based on the song search input
    const searchTerm = songSearchInput.value.toLowerCase();
    const filteredSongs = currentSongs.filter((song) =>
      song.name.toLowerCase().includes(searchTerm)
    );

    // Loop through the *filtered* songs
    filteredSongs.forEach((song) => {
      const originalIndex = currentSongs.findIndex((s) => s.id === song.id);
      const tr = document.createElement("tr");
      tr.dataset.index = originalIndex;

      // Add a class for hover effect, which is now handled by JS for simplicity with tables
      tr.className = "hover:bg-zinc-800/50 rounded-md cursor-pointer";

      // NOTE: The 'artist' and 'duration' columns are placeholders as the backend doesn't provide this data.
      tr.innerHTML = `
            <td class="p-2 text-center text-zinc-400">${originalIndex + 1}</td>
            <td class="p-2 text-white font-semibold">${song.name}</td>
            <td class="p-2 text-zinc-400">—</td>
            <td class="p-2 text-zinc-400 text-right">—</td>
        `;

      // Add event listeners for song actions (edit/remove) to the row itself
      const songActionsHtml = `
            <div class="song-actions absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="edit-song-btn" data-song-id="${song.id}" title="แก้ไขชื่อเพลง"><i class="fa-solid fa-pencil"></i></button>
                <button class="remove-song-btn" data-song-id="${song.id}" title="ลบเพลงออกจากเพลย์ลิสต์"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
      // To make actions work, we wrap the title in a relative container
      tr.cells[1].classList.add("relative", "group");
      tr.cells[1].innerHTML += songActionsHtml;

      songListEl.appendChild(tr);
    });

    updatePlayingHighlight();
  }
  function closePlaylistView() {
    console.log("[VIEW_CLOSE] Closing playlist view.");
    currentPlaylist = null;
    playlistDetailsView.classList.add("hidden");
    welcomeView.classList.remove("hidden");
    updateActivePlaylistStyle();
  }
  playlistSearchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const allPlaylists = playlistListEl.querySelectorAll("li");
    allPlaylists.forEach((li) => {
      const playlistName = li.textContent.toLowerCase();
      li.classList.toggle("hidden", !playlistName.includes(searchTerm));
    });
  });

  function updateActivePlaylistStyle() {
    const currentId = currentPlaylist ? currentPlaylist.id : null;
    playlistListEl.querySelectorAll("li").forEach((li) => {
      const span = li.querySelector("span"); // Get the text element

      // Reset all items to default style first
      li.classList.remove("bg-zinc-800", "border", "border-zinc-700");
      if (span) {
        span.classList.remove("text-green-500");
        span.classList.add("text-zinc-300");
      }

      // Apply active style if it's the selected playlist
      if (parseInt(li.dataset.id) === currentId) {
        li.classList.add("bg-zinc-800", "border", "border-zinc-700");
        if (span) {
          span.classList.add("text-green-500");
          span.classList.remove("text-zinc-300");
        }
      }
    });
  }

  if (editPlaylistNameBtn) {
    editPlaylistNameBtn.addEventListener("click", async () => {
      if (!currentPlaylist) return;
      console.log(
        `%c[ACTION_RENAME] User wants to rename playlist ID: ${currentPlaylist.id} ("${currentPlaylist.name}")`,
        "color: orange"
      );

      const newName = prompt("แก้ไขชื่อเพลย์ลิสต์:", currentPlaylist.name);
      if (
        newName &&
        newName.trim() &&
        newName.trim() !== currentPlaylist.name
      ) {
        try {
          const currentId = currentPlaylist.id;
          await api.updatePlaylist(currentId, newName.trim());
          console.log("[ACTION_RENAME] API call successful. Starting sync...");
          await syncPlaylists(currentId);
        } catch (e) {
          console.error("[ACTION_RENAME_ERROR]", e);
          alert("ไม่สามารถแก้ไขชื่อได้ อาจมีชื่อซ้ำกัน");
        }
      } else {
        console.log("[ACTION_RENAME] Rename cancelled by user.");
      }
    });
  }

  async function initializeApp() {
    console.log(
      "%c[INIT] Initializing application...",
      "color: purple; font-weight:bold;"
    );
    await syncPlaylists();
    autoplayBtn.classList.toggle("active", isAutoplayOn);
    if (volumeSlider) audioPlayer.volume = volumeSlider.value / 100;
    console.log(
      "%c[INIT] Application ready.",
      "color: purple; font-weight:bold;"
    );
  }

  // The rest of the functions are unchanged as they are not the likely source of the problem.
  // ... (All other functions from the previous version are here) ...
  newPlaylistBtn.addEventListener("click", async () => {
    const name = prompt("กรุณาใส่ชื่อเพลย์ลิสต์ใหม่:");
    if (name && name.trim()) {
      try {
        const newPlaylist = await api.createPlaylist(name.trim());
        await syncPlaylists(newPlaylist.id);
      } catch (e) {
        alert("ไม่สามารถสร้างเพลย์ลิสต์ได้ อาจมีชื่อซ้ำกัน");
      }
    }
  });
  playlistListEl.addEventListener("click", (e) => {
    const li = e.target.closest("li"); // หา <li> ที่เป็นตัวแม่
    if (li) {
      // ถ้าหาเจอ (ผู้ใช้คลิกในขอบเขตของ li)
      showPlaylistDetails(parseInt(li.dataset.id));
    }
  });
  deletePlaylistBtn.addEventListener("click", async () => {
    if (!currentPlaylist) return;
    if (
      confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบเพลย์ลิสต์ "${currentPlaylist.name}"?`
      )
    ) {
      await api.deletePlaylist(currentPlaylist.id);
      await syncPlaylists(null);
    }
  });
  songListEl.addEventListener("click", async (e) => {
    const songTr = e.target.closest("tr"); // <<< แก้จาก li เป็น tr
    if (!songTr) return;

    const editBtn = e.target.closest(".edit-song-btn");
    const removeBtn = e.target.closest(".remove-song-btn");

    if (editBtn) {
      e.stopPropagation();
      const songId = parseInt(editBtn.dataset.songId);
      const songToEdit = currentSongs.find((s) => s.id === songId);
      if (!songToEdit) return;

      const newName = prompt("แก้ไขชื่อเพลง:", songToEdit.name);
      if (newName && newName.trim() && newName !== songToEdit.name) {
        await api.updateSong(songId, newName.trim());
        songToEdit.name = newName.trim();
        renderSongs();
      }
    } else if (removeBtn) {
      e.stopPropagation();
      const songId = parseInt(removeBtn.dataset.songId);
      await api.removeSongFromPlaylist(currentPlaylist.id, songId);
      currentSongs = currentSongs.filter((s) => s.id !== songId);
      renderSongs();
    } else {
      // เมื่อคลิกที่แถวเพื่อเล่นเพลง
      playSong(parseInt(songTr.dataset.index)); // <<< แก้จาก songLi เป็น songTr
    }
  });
  saveSongsToPlaylistBtn.addEventListener("click", async () => {
    const selectedSongIds = Array.from(
      modalSongLibrary.querySelectorAll(
        'input[type="checkbox"]:checked:not(:disabled)'
      )
    ).map((input) => parseInt(input.dataset.songId));
    if (selectedSongIds.length > 0) {
      await api.addSongsToPlaylist(currentPlaylist.id, selectedSongIds);
      currentSongs = await api.getSongsForPlaylist(currentPlaylist.id);
      renderSongs();
    }
    addSongsModal.classList.add("hidden");
  });
  scanMusicBtn.addEventListener("click", async () => {
    const path = prompt(
      "กรุณาใส่ Path เต็มของโฟลเดอร์เพลง (เช่น C:\\Users\\YourName\\Music):"
    );
    if (!path) return;
    scanMusicBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสแกน...';
    scanMusicBtn.disabled = true;
    try {
      const result = await api.scanDirectory(path);
      alert(result.message || "สแกนเสร็จสิ้น");
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการสแกน โปรดตรวจสอบ Path และ Console");
    } finally {
      scanMusicBtn.innerHTML = '<i class="fa-solid fa-sync"></i> สแกนเพลง';
      scanMusicBtn.disabled = false;
    }
  });

  async function renderSearchResults(searchTerm) {
    searchResultsList.innerHTML = "";
    try {
      const results = await api.searchAll(searchTerm);
      if (results.playlists.length === 0 && results.songs.length === 0) {
        searchResultsList.innerHTML = "<li>ไม่พบผลการค้นหา</li>";
        return;
      }
      results.playlists.forEach((p) => {
        const li = document.createElement("li");
        li.className = "search-result-item";
        li.dataset.playlistId = p.id;
        li.innerHTML = `<i class="fa-solid fa-compact-disc"></i><span class="search-result-song-name">${p.name}</span><span class="search-result-playlist-name">เพลย์ลิสต์</span>`;
        searchResultsList.appendChild(li);
      });
      results.songs.forEach((s) => {
        const li = document.createElement("li");
        li.className = "search-result-item";
        li.dataset.playlistId = s.playlist_id;
        li.dataset.songId = s.song_id;
        li.innerHTML = `<i class="fa-solid fa-music"></i><span class="search-result-song-name">${s.song_name}</span><span class="search-result-playlist-name">จาก: ${s.playlist_name}</span>`;
        searchResultsList.appendChild(li);
      });
    } catch (e) {
      console.error("Search failed", e);
      searchResultsList.innerHTML = "<li>เกิดข้อผิดพลาดในการค้นหา</li>";
    }
  }

  addSongsBtn.addEventListener("click", async () => {
    if (!currentPlaylist) return;
    try {
      songLibrary = await api.getAllSongs();
      renderSongLibrary();
      addSongsModal.classList.remove("hidden");
    } catch (error) {
      alert(
        "ไม่สามารถโหลดคลังเพลงได้ โปรดตรวจสอบว่า Backend Server ทำงานอยู่หรือไม่"
      );
    }
  });
  function renderSongLibrary(filter = "") {
    modalSongLibrary.innerHTML = "";
    const filteredLibrary = songLibrary.filter((s) =>
      s.name.toLowerCase().includes(filter.toLowerCase())
    );
    filteredLibrary.forEach((song) => {
      const alreadyInPlaylist = currentSongs.some((ps) => ps.id === song.id);
      const li = document.createElement("li");
      li.innerHTML = `<input type="checkbox" data-song-id="${song.id}" ${
        alreadyInPlaylist ? "checked disabled" : ""
      }><span>${song.name}</span>`;
      modalSongLibrary.appendChild(li);
    });
  }
  modalSearchInput.addEventListener("input", (e) =>
    renderSongLibrary(e.target.value)
  );
  closeModalBtn.addEventListener("click", () =>
    addSongsModal.classList.add("hidden")
  );
  playPlaylistBtn.addEventListener("click", () => {
    if (currentPlaylist && currentSongs.length > 0) playSong(0);
  });
  function playSong(songIndex) {
    if (!currentPlaylist || currentSongs.length === 0) return;
    currentlyPlayingPlaylistId = currentPlaylist.id;
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
      playSong(currentSongIndex > -1 ? currentSongIndex : 0);
    }
    updatePlayerUI();
  }
  function updatePlayingHighlight() {
    if (!currentPlaylist) return;
    const allSongItems = songListEl.querySelectorAll("li");
    allSongItems.forEach((li) => {
      const originalIndex = parseInt(li.dataset.index);
      li.classList.toggle(
        "playing",
        isPlaying && originalIndex === currentSongIndex
      );
    });
  }
  function updatePlayerUI() {
    playPauseBtn.querySelector("i").className = isPlaying
      ? "fa-solid fa-pause"
      : "fa-solid fa-play";
    if (
      isPlaying &&
      currentSongIndex > -1 &&
      currentPlaylist &&
      currentSongs[currentSongIndex]
    ) {
      currentSongTitleEl.textContent = currentSongs[currentSongIndex].name;
    } else {
      currentSongTitleEl.textContent = "ยังไม่มีเพลงเล่น";
    }
    updatePlayingHighlight();
    updatePlaylistPlaybackIndicator();
  }
  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return isNaN(sec) ? "0:00" : `${min}:${sec.toString().padStart(2, "0")}`;
  }
  function toggleAutoplay() {
    isAutoplayOn = !isAutoplayOn;
    autoplayBtn.classList.toggle("active", isAutoplayOn);
  }
  const playNext = () => {
    if (currentPlaylist && currentSongs.length > 0)
      playSong((currentSongIndex + 1) % currentSongs.length);
  };
  const playPrev = () => {
    if (currentPlaylist && currentSongs.length > 0)
      playSong(
        (currentSongIndex - 1 + currentSongs.length) % currentSongs.length
      );
  };
  playPauseBtn.addEventListener("click", togglePlayPause);
  nextBtn.addEventListener("click", playNext);
  prevBtn.addEventListener("click", playPrev);
  autoplayBtn.addEventListener("click", toggleAutoplay);
  if (volumeSlider)
    volumeSlider.addEventListener("input", (e) => {
      audioPlayer.volume = e.target.value / 100;
    });
  audioPlayer.addEventListener("ended", () => {
    if (isAutoplayOn) playNext();
    else {
      isPlaying = false;
      updatePlayerUI();
    }
  });
  audioPlayer.addEventListener("timeupdate", () => {
    if (audioPlayer.duration)
      progressBar.value =
        (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
  });
  audioPlayer.addEventListener(
    "loadedmetadata",
    () => (totalTimeEl.textContent = formatTime(audioPlayer.duration))
  );
  progressBar.addEventListener("input", () => {
    if (audioPlayer.duration)
      audioPlayer.currentTime =
        (progressBar.value / 100) * audioPlayer.duration;
  });

  initializeApp();
});

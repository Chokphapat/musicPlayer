const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..')));
const dbPath = "./database.sqlite";
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.run(
      `CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE)`
    );
    db.run(
      `CREATE TABLE IF NOT EXISTS songs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, path TEXT NOT NULL UNIQUE)`
    );
    db.run(`CREATE TABLE IF NOT EXISTS playlist_songs (
            playlist_id INTEGER, song_id INTEGER,
            FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
            FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE,
            PRIMARY KEY (playlist_id, song_id)
        )`);
  }
});

// === API สำหรับเพลย์ลิสต์ ===
app.get("/api/playlists", (req, res) => {
  db.all("SELECT * FROM playlists ORDER BY name", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.post("/api/playlists", (req, res) => {
  const { name } = req.body;
  if (!name)
    return res.status(400).json({ error: "Playlist name is required" });
  db.run("INSERT INTO playlists (name) VALUES (?)", [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name });
  });
});
app.delete("/api/playlists/:id", (req, res) => {
  db.run("DELETE FROM playlists WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'AddSong.html'));
});


app.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend','user.html'));
});
// Route สำหรับหน้าเพลย์ลิสต์โดยเฉพาะ (ไม่มีแถบข้าง)
app.get('/playlist.html', (req, res) => { // <--- แก้ไขบรรทัดนี้
    res.sendFile(path.join(__dirname, '..', 'frontend', 'playlist.html'));
});
// ===================================
// API สำหรับดึงข้อมูลสีทั้งหมด
app.get('/api/color-info', (req, res) => {
    const hexCode = req.query.code;
    if (!hexCode) {
        return res.status(400).json({ error: 'Hex color code is required' });
    }
    const searchCode = hexCode.startsWith('#') ? hexCode : `#${hexCode}`;

    // --- ใช้เวอร์ชันที่แก้ไขแล้วเพื่อการค้นหาที่แม่นยำ ---
    const sql = "SELECT * FROM ColorShades WHERE UPPER(TRIM(code)) = UPPER(?)";

    db.get(sql, [searchCode], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            res.json(row);
        } else {
            res.status(404).json({ error: 'Color not found' });
        }
    });
});
// API ใหม่สำหรับหาข้อมูล playlistId และ songId จากสี
app.get('/api/data-by-color', (req, res) => {
    const hexCode = req.query.code;
    if (!hexCode) return res.status(400).json({ error: 'Hex code is required' });

    const searchCode = hexCode.startsWith('#') ? hexCode : `#${hexCode}`;
    const colorSql = "SELECT color, song FROM ColorShades WHERE UPPER(TRIM(code)) = UPPER(?)";

    db.get(colorSql, [searchCode], (err, colorInfo) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!colorInfo) return res.status(404).json({ error: 'Color info not found' });

        const playlistSql = "SELECT id FROM playlists WHERE UPPER(name) = UPPER(?)";
        const songSql = "SELECT id FROM songs WHERE name LIKE ?";
        const songSearchTerm = `%${colorInfo.song}%`;

        db.get(playlistSql, [colorInfo.color], (err, playlistRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!playlistRow) return res.status(404).json({ error: 'Playlist not found for this color group' });

            db.get(songSql, [songSearchTerm], (err, songRow) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!songRow) return res.status(404).json({ error: 'Recommended song not found in songs library' });

                res.json({
                    playlistId: playlistRow.id,
                    songId: songRow.id
                });
            });
        });
    });
});
// VVVVVV ---- เราจะเพิ่ม LOG ในฟังก์ชันนี้ ---- VVVVVV
app.put("/api/playlists/:id", (req, res) => {
  // ---- บรรทัดที่เพิ่มเข้ามา ----
  console.log(`\n>>> PUT request received for /api/playlists/${req.params.id}`);
  console.log(`>>> Request body:`, req.body);
  // -------------------------

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "New name is required" });
  db.run(
    "UPDATE playlists SET name = ? WHERE id = ?",
    [name, req.params.id],
    function (err) {
      if (err) {
        console.error("!!! Database Error on UPDATE:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(
        `<<< Successfully updated playlist. Changes: ${this.changes}`
      );
      res.json({ updated: this.changes });
    }
  );
});
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// === API สำหรับเพลง ===
app.get("/api/songs", (req, res) => {
  db.all("SELECT * FROM songs ORDER BY name", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.put("/api/songs/:id", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "New name is required" });
  db.run(
    "UPDATE songs SET name = ? WHERE id = ?",
    [name, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.get("/api/playlists/:id/songs", (req, res) => {
  // --- เราจะเปลี่ยน SQL Query ตรงนี้ ---
  const sql = `
    SELECT 
      s.id, 
      s.name, 
      s.path, 
      cs.artist, 
      cs.coverImageURL
    FROM songs s
    JOIN playlist_songs ps ON s.id = ps.song_id
    LEFT JOIN ColorShades cs ON s.name LIKE '%' || cs.song || '%'
    WHERE ps.playlist_id = ?
    GROUP BY s.id 
    ORDER BY s.name
  `;
  // การใช้ LIKE และ GROUP BY เป็นวิธีแก้ปัญหาเฉพาะหน้าสำหรับโครงสร้างข้อมูลปัจจุบัน
  // ที่เชื่อมชื่อเพลง (song) กับชื่อไฟล์ (name) เข้าด้วยกัน

  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.post("/api/playlists/:id/songs", (req, res) => {
  const { songIds } = req.body;
  if (!songIds || !Array.isArray(songIds))
    return res.status(400).json({ error: "songIds must be an array" });
  const placeholders = songIds.map(() => "(?, ?)").join(",");
  const params = songIds.flatMap((songId) => [req.params.id, songId]);
  db.run(
    `INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id) VALUES ${placeholders}`,
    params,
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Songs added successfully" });
    }
  );
});
app.delete("/api/playlists/:playlistId/songs/:songId", (req, res) => {
  db.run(
    "DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?",
    [req.params.playlistId, req.params.songId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    }
  );
});
app.get("/api/playlist-by-color", (req, res) => {
  const hexCode = req.query.code;
  if (!hexCode) {
    return res.status(400).json({ error: "Hex color code is required" });
  }

  // เราจะทำการค้นหาโดยเติม # เข้าไปข้างหน้าเพื่อให้ตรงกับ format ใน DB
  const searchCode = hexCode.startsWith("#") ? hexCode : `#${hexCode}`;

  // Query เพื่อหาชื่อสีหลัก (เช่น 'PURPLE') จาก Hex code
  // แล้วใช้ชื่อสีหลักนั้นไปหา ID ของเพลย์ลิสต์ที่มีชื่อเดียวกัน
  const sql = `
    SELECT p.id, p.name 
    FROM playlists p 
    JOIN ColorShades cs ON UPPER(p.name) = UPPER(cs.color) 
    WHERE UPPER(TRIM(cs.code)) = UPPER(?)
`;

  db.get(sql, [searchCode], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      res.json({ playlistId: row.id, playlistName: row.name });
    } else {
      res
        .status(404)
        .json({ error: "No matching playlist found for this color" });
    }
  });
});
// === API อื่นๆ ===
app.get("/api/search", (req, res) => {
  const term = req.query.term;
  if (!term) return res.status(400).json({ error: "Search term is required" });
  const searchTerm = `%${term}%`;
  const results = { playlists: [], songs: [] };
  const playlistQuery = "SELECT id, name FROM playlists WHERE name LIKE ?";
  db.all(playlistQuery, [searchTerm], (err, playlistRows) => {
    if (err) return res.status(500).json({ error: err.message });
    results.playlists = playlistRows;
    const songQuery = `
            SELECT s.id as song_id, s.name as song_name, p.id as playlist_id, p.name as playlist_name
            FROM songs s JOIN playlist_songs ps ON s.id = ps.song_id JOIN playlists p ON ps.playlist_id = p.id
            WHERE s.name LIKE ?`;
    db.all(songQuery, [searchTerm], (err, songRows) => {
      if (err) return res.status(500).json({ error: err.message });
      results.songs = songRows;
      res.json(results);
    });
  });
});

app.post("/api/scan", (req, res) => {
  const { directoryPath } = req.body;
  if (!directoryPath || !fs.existsSync(directoryPath))
    return res.status(400).json({ error: "Invalid or missing directory path" });
  let musicFiles = [];
  try {
    function findMusicFiles(dir) {
      fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file);
        try {
          if (fs.statSync(filePath).isDirectory()) findMusicFiles(filePath);
          else if (
            [".mp3", ".m4a", ".wav", ".flac"].includes(
              path.extname(file).toLowerCase()
            )
          )
            musicFiles.push(filePath);
        } catch (e) {
          console.error(`Cannot access ${filePath}: ${e.message}`);
        }
      });
    }
    findMusicFiles(directoryPath);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  if (musicFiles.length === 0)
    return res.json({ message: "No new music files found." });
  const placeholders = musicFiles.map(() => "(?, ?)").join(",");
  const params = musicFiles.flatMap((f) => [
    path.basename(f, path.extname(f)),
    f,
  ]);
  db.run(
    `INSERT OR IGNORE INTO songs (name, path) VALUES ${placeholders}`,
    params,
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res
        .status(201)
        .json({
          message: `Scan complete. Found ${musicFiles.length} files. Added ${this.changes} new songs.`,
        });
    }
  );
});

app.get("/play/:songId", (req, res) => {
  db.get(
    "SELECT path FROM songs WHERE id = ?",
    [req.params.songId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row && fs.existsSync(row.path)) res.sendFile(row.path);
      else res.status(404).send("File not found");
    }
  );
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const dbPath = './database.sqlite';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE)`);
        db.run(`CREATE TABLE IF NOT EXISTS songs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, path TEXT NOT NULL UNIQUE)`);
        db.run(`CREATE TABLE IF NOT EXISTS playlist_songs (
            playlist_id INTEGER, song_id INTEGER,
            FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
            FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE,
            PRIMARY KEY (playlist_id, song_id)
        )`);
    }
});

// --- API สำหรับเพลย์ลิสต์ ---
app.get('/api/playlists', (req, res) => {
    db.all("SELECT * FROM playlists ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/playlists', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Playlist name is required' });
    db.run("INSERT INTO playlists (name) VALUES (?)", [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, name });
    });
});
app.delete('/api/playlists/:id', (req, res) => {
    db.run("DELETE FROM playlists WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// --- API สำหรับเพลง ---
app.get('/api/songs', (req, res) => {
    db.all("SELECT * FROM songs ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// *** API ใหม่: แก้ไขชื่อเพลง ***
app.put('/api/songs/:id', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Song name is required' });
    
    const sql = "UPDATE songs SET name = ? WHERE id = ?";
    db.run(sql, [name, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});


app.get('/api/playlists/:id/songs', (req, res) => {
    const sql = `SELECT s.id, s.name, s.path FROM songs s
                 JOIN playlist_songs ps ON s.id = ps.song_id
                 WHERE ps.playlist_id = ? ORDER BY s.name`;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/playlists/:id/songs', (req, res) => {
    const { songIds } = req.body;
    if (!songIds || !Array.isArray(songIds)) return res.status(400).json({ error: 'songIds must be an array' });
    const placeholders = songIds.map(() => '(?, ?)').join(',');
    const params = songIds.flatMap(songId => [req.params.id, songId]);
    db.run(`INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id) VALUES ${placeholders}`, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Songs added successfully' });
    });
});
app.delete('/api/playlists/:playlistId/songs/:songId', (req, res) => {
     db.run("DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?", [req.params.playlistId, req.params.songId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// --- API อื่นๆ (ค้นหา, สแกน, เล่นเพลง) ---
app.get('/api/search', (req, res) => {
    const term = req.query.term;
    if (!term) return res.status(400).json({ error: 'Search term is required' });
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
app.post('/api/scan', (req, res) => {
    const { directoryPath } = req.body;
    if (!directoryPath || !fs.existsSync(directoryPath)) return res.status(400).json({ error: "Invalid directory path" });
    let musicFiles = [];
    try {
        function findMusicFiles(dir) {
            fs.readdirSync(dir).forEach(file => {
                const filePath = path.join(dir, file);
                try {
                    if (fs.statSync(filePath).isDirectory()) findMusicFiles(filePath);
                    else if (['.mp3', '.m4a', '.wav', '.flac'].includes(path.extname(file).toLowerCase())) musicFiles.push(filePath);
                } catch (e) { console.error(`Cannot access ${filePath}: ${e.message}`); }
            });
        }
        findMusicFiles(directoryPath);
    } catch(e) { return res.status(500).json({error: e.message}); }
    if (musicFiles.length === 0) return res.json({ message: 'No new music files found.' });
    const placeholders = musicFiles.map(() => '(?, ?)').join(',');
    const params = musicFiles.flatMap(f => [path.basename(f, path.extname(f)), f]);
    db.run(`INSERT OR IGNORE INTO songs (name, path) VALUES ${placeholders}`, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: `Scan complete. Found ${musicFiles.length} files. Added ${this.changes} new songs.` });
    });
});
app.get('/play/:songId', (req, res) => {
    db.get("SELECT path FROM songs WHERE id = ?", [req.params.songId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && fs.existsSync(row.path)) res.sendFile(row.path);
        else res.status(404).send('File not found');
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
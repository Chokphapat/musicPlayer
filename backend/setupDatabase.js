// setupDatabase.js
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// กำหนดตำแหน่งไฟล์ฐานข้อมูลและไฟล์ SQL
const dbPath = './database.sqlite';
const sqlFilePath = './color_shades.sql';

// ตรวจสอบว่าไฟล์ SQL มีอยู่จริงหรือไม่
if (!fs.existsSync(sqlFilePath)) {
    console.error(`!!! ไม่พบไฟล์ SQL ที่: ${sqlFilePath}`);
    console.error('!!! กรุณาตรวจสอบว่าคุณวางไฟล์ color_shades.sql ไว้ในโฟลเดอร์ backend ถูกต้อง');
    return;
}

// เชื่อมต่อกับฐานข้อมูล (จะสร้างไฟล์ใหม่ถ้ายังไม่มี)
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        return console.error('!!! Error opening database', err.message);
    }
    console.log('✅ เชื่อมต่อกับฐานข้อมูล SQLite สำเร็จ');
});

console.log('📖 กำลังอ่านไฟล์ SQL...');

// อ่านเนื้อหาจากไฟล์ .sql
const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

console.log('🚀 กำลังรันคำสั่ง SQL เพื่อสร้างและเพิ่มข้อมูลตาราง color_shades...');

// ใช้ db.exec() เพื่อรันคำสั่ง SQL ทั้งหมดในไฟล์
db.exec(sqlScript, function(err) {
    if (err) {
        // หากเกิด error (เช่น ตารางมีอยู่แล้ว) ให้แสดงข้อความเตือนแทนที่จะเป็น error ร้ายแรง
        if (err.message.includes("table color_shades already exists")) {
            console.warn('⚠️  คำเตือน: ตาราง color_shades มีอยู่แล้วในฐานข้อมูล อาจไม่จำเป็นต้องรันสคริปต์นี้ซ้ำ');
        } else {
            return console.error('!!! เกิดข้อผิดพลาดขณะรันสคริปต์ SQL:', err.message);
        }
    } else {
        console.log('🎉 ตั้งค่าตาราง color_shades และเพิ่มข้อมูลเรียบร้อยแล้ว!');
    }

    // ปิดการเชื่อมต่อกับฐานข้อมูล
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('✅ ปิดการเชื่อมต่อฐานข้อมูลเรียบร้อย');
    });
});
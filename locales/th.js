officeLocales.th = Object.fromEntries(Object.keys(officeLocales.en).map(key=>[key,key]));
Object.assign(officeLocales.th, {
  'chat.title':'คุยต่อกับ session', 'chat.notice':'คุยต่อกับ session จริง อย่าใช้ session เดียวกันใน IDE พร้อมกัน ใช้บัญชีของ CLI เดิม และอาจต้องเปิด session ใน IDE ใหม่เพื่อเห็นข้อความ',
  'chat.choose':'เลือก session ที่แสดงอยู่', 'chat.confirm':'หยุดใช้งาน session นี้ใน IDE แล้ว และยืนยันเพิ่มข้อความลงประวัติจริง',
  'chat.sessionSetup':'ตั้ง OFFICE_SESSION_CHAT=1 ใน .env แล้วเริ่ม server ใหม่เพื่อเปิดการคุยต่อ',
  'chat.unsupported':'ต้นแบบนี้ยังไม่เปิดส่งข้อความเข้า Codex และจะไม่สร้างแชท API ใหม่ทดแทน',
  'chat.expired':'Session หมดอายุหรือระบุตัวตนไม่ได้ กรุณารีเฟรชรายการ',
  'chat.sessionBusy':'Session ยังทำงานอยู่ กรุณารอให้เสร็จจาก IDE ก่อน',
  'chat.sessionReady':'พร้อมคุยต่อกับ Claude โดยปิดเครื่องมือ ยืนยันก่อนส่งแต่ละครั้ง',
  'chat.cliMissing':'เปิด Claude CLI ไม่ได้ ตรวจสอบการติดตั้ง CLAUDE_BIN และโฟลเดอร์โปรเจกต์',
  'chat.resumeFailed':'คุยต่อไม่สำเร็จหรือยืนยันคำตอบไม่ได้ ตรวจ session เดิมก่อนส่งซ้ำ เพราะข้อความอาจถูกบันทึกแล้ว',
  'chat.placeholder':'ข้อความของคุณ', 'chat.send':'ส่ง', 'chat.clear':'ล้างหน้าจอ', 'chat.you':'คุณ',
  'chat.ready':'พร้อม · บทสนทนาอยู่ในแท็บนี้จนกว่าจะล้างหรือโหลดใหม่', 'chat.thinking':'กำลังคิด…',
  'chat.setup':'ตั้งค่า OPENAI_API_KEY และ OPENAI_MODEL ใน .env แล้วเริ่ม server ใหม่',
  'chat.busy':'กรุณารอสักครู่แล้วลองใหม่', 'chat.limit':'เกินข้อจำกัด API กรุณาตรวจสอบบัญชี API',
  'chat.long':'ข้อความยาวเกินไป (สูงสุด 4,000 ตัวอักษร)', 'chat.full':'ถึงขีดจำกัดบทสนทนาแล้ว กรุณาเริ่มแชทใหม่',
  'chat.invalid':'บทสนทนาไม่ถูกต้อง กรุณาเริ่มใหม่', 'chat.forbidden':'เปิดเว็บโดยตรงที่ localhost:4321 หรือ 127.0.0.1:4321',
  'chat.incomplete':'ไม่ได้รับคำตอบที่สมบูรณ์ ลองถามให้สั้นลง', 'chat.timeout':'หมดเวลารอคำตอบ กรุณาลองใหม่',
  'chat.upstream':'รับคำตอบไม่ได้ กรุณาตรวจสอบ server, API key, สิทธิ์โมเดล และการเชื่อมต่อ',
  WORKSPACE:'ห้องทำงาน', MEETING:'ห้องประชุม', 'QUIET ROOM':'มุมสงบ', BEDROOM:'ห้องนอน', SERVER:'ห้องเซิร์ฟเวอร์',
  DEVELOPER:'ทีมพัฒนา', TESTER:'ทีมทดสอบ', 'UX/UI':'ทีม UX/UI', 'HUDDLE ROOM':'ห้องประชุมย่อย',
  'FOCUS ROOM 1':'ห้องสมาธิ 1', 'FOCUS ROOM 2':'ห้องสมาธิ 2', 'TEAM OFFICE':'ห้องทำงานทีม'
});

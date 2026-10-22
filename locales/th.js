officeLocales.th = Object.fromEntries(Object.keys(officeLocales.en).map(key=>[key,key]));
Object.assign(officeLocales.th, {
  WORKSPACE:'ห้องทำงาน', MEETING:'ห้องประชุม', 'QUIET ROOM':'มุมสงบ', BEDROOM:'ห้องนอน', SERVER:'ห้องเซิร์ฟเวอร์',
  DEVELOPER:'ทีมพัฒนา', TESTER:'ทีมทดสอบ', 'UX/UI':'ทีม UX/UI', 'HUDDLE ROOM':'ห้องประชุมย่อย',
  'FOCUS ROOM 1':'ห้องสมาธิ 1', 'FOCUS ROOM 2':'ห้องสมาธิ 2', 'TEAM OFFICE':'ห้องทำงานทีม'
});

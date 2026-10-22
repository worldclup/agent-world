const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function boot(saved,blocked=false) {
  const storage=new Map(saved?[['office-language',saved]]:[]);
  const label={dataset:{i18n:'ตั้งค่าฉาก'}},select={};
  const attr={getAttribute:()=> 'ตั้งค่าฉาก',setAttribute:(key,value)=>{attr[key]=value;}};
  const document={documentElement:{},getElementById:()=>select,querySelectorAll:query=>query==='[data-i18n]'?[label]:query==='[data-i18n-title]'?[attr]:[]};
  const context=vm.createContext({document,localStorage:{getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key);},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v);}}});
  for(const file of ['locales/en.js','locales/th.js','i18n.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
  return {context,storage,label,attr,document};
}
const app=boot();
assert.equal(app.label.textContent,'Scene settings');assert.equal(app.attr.title,'Scene settings');
vm.runInContext(`
  let changes=0;i18n.onChange(()=>changes++);
  i18n.setLanguage('th');
  if(i18n.t('ตั้งค่าฉาก')!=='ตั้งค่าฉาก'||changes!==1)throw Error('Thai switch failed');
  i18n.setLanguage('xx');if(i18n.language!=='th')throw Error('Invalid locale accepted');
  delete officeLocales.th['บันทึก'];if(i18n.t('บันทึก')!=='Save')throw Error('English fallback failed');
  if(i18n.t('unknown key')!=='unknown key')throw Error('Unknown key fallback failed');
`,app.context);
assert.equal(app.storage.get('office-language'),'th');assert.equal(app.document.documentElement.lang,'th');
assert.equal(boot('th').label.textContent,'ตั้งค่าฉาก');assert.equal(boot('xx').label.textContent,'Scene settings');
assert.equal(boot('th',true).label.textContent,'Scene settings');
const html=fs.readFileSync('index.html','utf8');
for(const match of html.matchAll(/data-i18n(?:-aria-label|-title)?="([^"]+)"/g)) {
  assert.equal(vm.runInContext(`Object.hasOwn(officeLocales.en,${JSON.stringify(match[1])})`,app.context),true,'Missing English translation: '+match[1]);
}
assert.ok(html.indexOf('/locales/en.js')<html.indexOf('/i18n.js')&&html.indexOf('/i18n.js')<html.indexOf('/office.js'));
console.log('PASS: language defaults, persistence, fallback, static translations and script order.');

// Source phrases are stable translation keys; live agent content never passes through this function.
const i18n = (()=>{
  let language='en';
  try {const saved=localStorage.getItem('office-language');if(saved==='th')language=saved;} catch {}
  const listeners=new Set();
  const t=key=>officeLocales[language][key] ?? officeLocales.en[key] ?? key;
  function refresh() {
    document.documentElement.lang=language;
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
    for(const attr of ['aria-label','title'])document.querySelectorAll('[data-i18n-'+attr+']').forEach(el=>el.setAttribute(attr,t(el.getAttribute('data-i18n-'+attr))));
    const select=document.getElementById('language');if(select)select.value=language;
  }
  function setLanguage(next) {
    if(!Object.hasOwn(officeLocales,next))return;
    language=next;try {localStorage.setItem('office-language',language);} catch {}
    refresh();listeners.forEach(fn=>fn());
  }
  return {t,refresh,setLanguage,get language(){return language;},onChange:fn=>listeners.add(fn)};
})();
i18n.refresh();
document.getElementById('language').onchange=e=>i18n.setLanguage(e.target.value);

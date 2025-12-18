
(() => {
  const DATA = window.TRIP_DATA;
  const elContent = document.getElementById('content');
  const elMainTabs = document.getElementById('mainTabs');
  const elDayTabsWrap = document.getElementById('dayTabsWrap');
  const elDayTabs = document.getElementById('dayTabs');

  const sheet = document.getElementById('sheet');
  const sheetBackdrop = document.getElementById('sheetBackdrop');
  const sheetTitle = document.getElementById('sheetTitle');
  const sheetBody = document.getElementById('sheetBody');
  const sheetFooter = document.getElementById('sheetFooter');
  const sheetClose = document.getElementById('sheetClose');

  const ROUTES = [
    {key:'toc', label:'目錄'},
    {key:'itinerary', label:'每日行程'},
    {key:'transport', label:'交通'},
    {key:'flights', label:'航班'},
    {key:'stay', label:'住宿'},
    {key:'cloud', label:'雲端'},
  ];

  const CAT_ORDER = ['交通','餐廳','景點','購物','住宿','航班'];

  const WEATHER_CODE = {
    0:'晴',1:'多雲',2:'多雲',3:'陰',
    45:'霧',48:'霧',
    51:'細雨',53:'小雨',55:'中雨',
    61:'小雨',63:'中雨',65:'大雨',
    71:'小雪',73:'中雪',75:'大雪',
    80:'陣雨',81:'陣雨',82:'強陣雨',
    95:'雷雨',96:'雷雨',99:'雷雨'
  };

  function qs(obj){
    return new URLSearchParams(obj).toString();
  }
  function mapsSearch(q){
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  function mapsDir(dest){
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  }
  function webSearch(q){
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  }

  let __scrollY = 0;
  function setBodyLock(locked){
    if(locked){
      __scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.classList.add('no-scroll');
      document.body.style.top = `-${__scrollY}px`;
    } else {
      document.body.classList.remove('no-scroll');
      const top = document.body.style.top;
      document.body.style.top = '';
      const y = top ? Math.abs(parseInt(top,10) || 0) : __scrollY;
      window.scrollTo(0, y);
    }
  }

  function openSheet(item){
    sheetTitle.textContent = item.title || '';
    sheetBody.textContent = item.detail || '（此卡片未提供詳細介紹）';
    sheetFooter.innerHTML = '';

    const dest = item.address?.trim() ? item.address.trim() : item.title;
    const btnNav = makeBtn('導航', mapsDir(dest));
    const btnSite = item.website?.trim()
      ? makeBtn('官方網站', item.website.trim())
      : makeBtn('搜尋', webSearch(item.title));

    sheetFooter.appendChild(btnNav);
    sheetFooter.appendChild(btnSite);

    sheet.hidden = false;
    sheetBackdrop.hidden = false;
    sheet.setAttribute('aria-hidden','false');
    sheetBackdrop.setAttribute('aria-hidden','false');
    // trigger transition
    requestAnimationFrame(()=>{
      sheet.classList.add('is-open');
      sheetBackdrop.classList.add('is-open');
    });
    setBodyLock(true);
  }
  function closeSheet(){
    sheet.classList.remove('is-open');
    sheetBackdrop.classList.remove('is-open');
    sheet.setAttribute('aria-hidden','true');
    sheetBackdrop.setAttribute('aria-hidden','true');

    const finalize = ()=>{
      sheet.hidden = true;
      sheetBackdrop.hidden = true;
      sheet.removeEventListener('transitionend', finalize);
    };
    sheet.addEventListener('transitionend', finalize);

    // fallback in case transitionend doesn't fire
    setTimeout(()=>{
      if(!sheet.hidden){
        sheet.hidden = true;
        sheetBackdrop.hidden = true;
      }
    }, 280);

    setBodyLock(false);
  }

  sheetClose.addEventListener('click', closeSheet)('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

  // Swipe down to close (simple)
  let startY=null, lastY=null;
  sheet.addEventListener('touchstart', (e)=>{ startY=e.touches[0].clientY; lastY=startY; }, {passive:true});
  sheet.addEventListener('touchmove', (e)=>{ lastY=e.touches[0].clientY; }, {passive:true});
  sheet.addEventListener('touchend', ()=>{
    if(startY!==null && lastY!==null){
      const dy = lastY - startY;
      if(dy > 90 || dy < -90){ closeSheet(); }
    }
    startY=null; lastY=null;
  });

  function makeBtn(label, href, cls=''){
    const a=document.createElement('a');
    a.className = `btn ${cls}`.trim();
    a.textContent = label;
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  function renderTabs(activeKey){
    elMainTabs.innerHTML='';
    for(const r of ROUTES){
      const a=document.createElement('a');
      a.href = `#${r.key}`;
      a.className = 'tab' + (r.key===activeKey?' active':'');
      a.textContent = r.label;
      elMainTabs.appendChild(a);
    }
    // day tabs only for itinerary and toc (per spec: in itinerary page, show Day1..Day8)
    if(activeKey==='itinerary' || activeKey==='toc'){
      elDayTabsWrap.hidden = false;
      elDayTabs.innerHTML='';
      for(const d of DATA.days){
        const a=document.createElement('a');
        a.href = `#itinerary?day=${d.day}`;
        a.className = 'tab';
        a.textContent = `Day${d.day}`;
        elDayTabs.appendChild(a);
      }
    }else{
      elDayTabsWrap.hidden = true;
    }
  }

  async function fetchWeatherForDay(day){
    const q = day.location?.query || day.location?.name || '';
    if(!q) return null;
    try{
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${qs({name:q, count:1, language:'ja', format:'json'})}`);
      const gj = await geo.json();
      const hit = gj?.results?.[0];
      if(!hit) return null;
      const {latitude, longitude} = hit;
      const wx = await fetch(`https://api.open-meteo.com/v1/forecast?${qs({latitude, longitude, current:'temperature_2m,weather_code,wind_speed_10m', timezone:'Asia/Tokyo'})}`);
      const wj = await wx.json();
      const cur = wj?.current;
      if(!cur) return null;
      const desc = WEATHER_CODE[cur.weather_code] || `代碼${cur.weather_code}`;
      return {temp: cur.temperature_2m, code: cur.weather_code, desc};
    }catch(e){
      return null;
    }
  }

  function renderHero(day){
    const hero=document.createElement('section');
    hero.className='day-hero';
    const meta=document.createElement('div');
    meta.className='meta';
    const title=document.createElement('div');
    title.className='title';
    title.textContent = `Day ${day.day}｜${day.title || ''}`;
    const date=document.createElement('div');
    date.className='date';
    date.textContent = day.date;
    meta.appendChild(title);
    meta.appendChild(date);

    const wx=document.createElement('div');
    wx.className='weather';
    const pill=document.createElement('span');
    pill.className='pill';
    pill.textContent = '天氣載入中…';
    const loc=document.createElement('span');
    loc.textContent = day.location?.name ? day.location.name : '';
    wx.appendChild(pill);
    wx.appendChild(loc);

    hero.appendChild(meta);
    hero.appendChild(wx);

    // async fill
    fetchWeatherForDay(day).then(w=>{
      pill.textContent = w ? `${Math.round(w.temp)}°C · ${w.desc}` : '天氣暫不可用';
    });

    return hero;
  }

  function cardForItem(item){
    const card=document.createElement('article');
    card.className = `card cat-${item.category || ''}` + (item.important ? ' important':'');

    const kicker=document.createElement('div');
    kicker.className='kicker';
    kicker.textContent = item.category || '未分類';

    const row=document.createElement('div');
    row.className='row';
    if(item.time){
      const t=document.createElement('div');
      t.className='time';
      t.textContent=item.time;
      row.appendChild(t);
    }
    const name=document.createElement('div');
    name.className='name';
    name.textContent=item.title || '';
    row.appendChild(name);

    const note=document.createElement('div');
    note.className='note';
    note.textContent = (item.note || '').trim();

    const actions=document.createElement('div');
    actions.className='actions';
    const dest = (item.address && item.address.trim()) ? item.address.trim() : item.title;
    actions.appendChild(makeBtn('導航', mapsDir(dest)));
    actions.appendChild(makeBtn('搜尋', webSearch(item.title), 'secondary'));

    const hasDetail = (item.detail || '').trim().length>0;
    if(hasDetail){
      const b=document.createElement('button');
      b.className='btn';
      b.textContent='詳細介紹';
      b.addEventListener('click', ()=>openSheet(item));
      actions.appendChild(b);
    }

    card.appendChild(kicker);
    card.appendChild(row);
    if((item.note||'').trim()){
      card.appendChild(note);
    }
    card.appendChild(actions);
    return card;
  }

  function renderItinerary(dayNum){
    const day = DATA.days.find(d=>d.day===dayNum) || DATA.days[0];
    elContent.innerHTML='';
    elContent.appendChild(renderHero(day));

    // group by category
    const groups = new Map();
    for(const it of day.items){
      const cat = it.category || '未分類';
      if(!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(it);
    }
    // render in CAT_ORDER with remaining last
    const orderedCats = [...CAT_ORDER.filter(c=>groups.has(c)), ...[...groups.keys()].filter(c=>!CAT_ORDER.includes(c))];
    for(const cat of orderedCats){
      const h=document.createElement('div');
      h.className='section-title';
      h.textContent=cat;
      elContent.appendChild(h);
      for(const it of groups.get(cat)){
        elContent.appendChild(cardForItem(it));
      }
    }
  }

  function renderTOC(){
    elContent.innerHTML='';
    const hero=document.createElement('section');
    hero.className='day-hero';
    hero.innerHTML = `<div class="meta"><div class="title">${DATA.meta.title}</div><div class="date">手機優先 · GitHub Pages</div></div>
      <div class="weather"><span class="pill">快速跳轉</span><span>Day1–Day8</span></div>`;
    elContent.appendChild(hero);

    const wrap=document.createElement('div');
    wrap.className='actions';
    wrap.style.marginTop='14px';
    for(const d of DATA.days){
      const a=document.createElement('a');
      a.className='btn';
      a.href = `#itinerary?day=${d.day}`;
      a.textContent = `Day${d.day}`;
      wrap.appendChild(a);
    }
    elContent.appendChild(wrap);
  }

  function renderCardsPage(title, items){
    elContent.innerHTML='';
    const hero=document.createElement('section');
    hero.className='day-hero';
    hero.innerHTML = `<div class="meta"><div class="title">${title}</div><div class="date"></div></div>`;
    elContent.appendChild(hero);
    for(const it of items){
      elContent.appendChild(cardForItem(it));
    }
  }

  function renderStay(){
    // attempt to fill stay details from itinerary cards (first match)
    const stay = DATA.sections.stay.map(s => ({...s}));
    const allItems = DATA.days.flatMap(d=>d.items);
    for(const s of stay){
      const match = allItems.find(i => i.category==='住宿' && (i.title||'').includes(s.title.split(' ')[0]));
      if(match){
        s.note = match.note || '';
        s.detail = match.detail || '';
      }
    }
    renderCardsPage('住宿資訊', stay);
  }

  function renderCloud(){
    elContent.innerHTML='';
    const hero=document.createElement('section');
    hero.className='day-hero';
    hero.innerHTML = `<div class="meta"><div class="title">雲端</div><div class="date"></div></div>
      <div class="weather"><span class="pill">共用連結</span><span>票卷 / 機票 / 其他資料</span></div>`;
    elContent.appendChild(hero);

    const items = DATA.sections.cloud.map(c => ({
      title: c.title,
      category: '雲端',
      note: c.url ? c.url : '（尚未提供連結）',
      detail: c.url ? `開啟連結：\n${c.url}` : '（尚未提供連結）',
      address: '',
      website: c.url || '',
      important: false
    }));

    for(const it of items){
      const card = document.createElement('article');
      card.className='card';
      card.style.setProperty('--c-spot','rgba(0,0,0,.25)');
      card.querySelector
      const kicker=document.createElement('div');
      kicker.className='kicker';
      kicker.textContent='雲端';
      const row=document.createElement('div');
      row.className='row';
      const name=document.createElement('div');
      name.className='name';
      name.textContent=it.title;
      row.appendChild(name);
      const note=document.createElement('div');
      note.className='note';
      note.textContent=it.note;
      const actions=document.createElement('div');
      actions.className='actions';
      const open = document.createElement('a');
      open.className = 'btn' + (it.website ? '' : ' disabled');
      open.textContent='開啟';
      open.href = it.website || '#';
      open.target='_blank';
      open.rel='noopener noreferrer';
      actions.appendChild(open);
      card.appendChild(kicker);
      card.appendChild(row);
      card.appendChild(note);
      card.appendChild(actions);
      elContent.appendChild(card);
    }
  }

  function parseHash(){
    const h = location.hash.replace(/^#/, '') || 'toc';
    const [key, q] = h.split('?');
    const params = new URLSearchParams(q || '');
    return {key, params};
  }

  function render(){
    const {key, params} = parseHash();
    renderTabs(key);
    // mark active day in subtabs if itinerary
    if(key==='itinerary'){
      const dayNum = parseInt(params.get('day') || '1', 10);
      for(const a of elDayTabs.querySelectorAll('.tab')){
        a.classList.toggle('active', a.textContent === `Day${dayNum}`);
      }
      renderItinerary(dayNum);
      return;
    }
    if(key==='toc'){ renderTOC(); return; }
    if(key==='transport'){ renderCardsPage('交通資訊', DATA.sections.transport); return; }
    if(key==='flights'){ renderCardsPage('航班資訊', DATA.sections.flights); return; }
    if(key==='stay'){ renderStay(); return; }
    if(key==='cloud'){ renderCloud(); return; }
    // default
    location.hash = '#toc';
  }

  window.addEventListener('hashchange', render);
  render();
})();

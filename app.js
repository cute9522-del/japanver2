document.addEventListener("DOMContentLoaded", () => {

  (() => {
    const sheetClose = document.querySelector("#sheetClose");
    const sheetBackdrop = document.querySelector("#sheetBackdrop");

    if (sheetClose) {
      sheetClose.addEventListener("click", closeSheet);
    }
    if (sheetBackdrop) {
      sheetBackdrop.addEventListener("click", closeSheet);
    }
    // 其餘 app.js 原本內容「全部原封不動放這裡」
    (() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const DATA = window.TRIP_DATA;
  const main = $("#main");
  const daybar = $("#daybar");

  const sheet = $("#sheet");
  const sheetBody = $("#sheetBody");
  const sheetActions = $("#sheetActions");
  const backdrop = $("#sheetBackdrop");
  const closeBtn = $("#sheetClose");

  if (!DATA || !DATA.meta || !Array.isArray(DATA.meta.days)){
    main.innerHTML = '<div class="notice">TRIP_DATA 載入失敗：請確認 data.js 與 index.html 的 script 路徑一致。</div>';
    return;
  }

  let state = { tab:"toc", dayKey: DATA.meta.days[0].key, geoCache:new Map(), weatherCache:new Map(), scrollY:0 };

  const typeCfg = {
    food:{label:"餐廳", color:getCss("--c-food")},
    spot:{label:"景點", color:getCss("--c-spot")},
    transport:{label:"交通", color:getCss("--c-transport")},
    shop:{label:"購物", color:getCss("--c-shop")},
    stay:{label:"住宿", color:getCss("--c-stay")}
  };

  function getCss(varName){ return getComputedStyle(document.documentElement).getPropertyValue(varName).trim(); }

  function setActiveTab(tab){
    state.tab = tab;
    $$(".tab-btn[data-tab]").forEach(b => b.classList.toggle("is-active", b.dataset.tab === tab));
    daybar.classList.toggle("is-hidden", tab !== "itinerary");
    render();
  }
  function setDay(dayKey){
    state.dayKey = dayKey;
    $$(".daybar .tab-btn").forEach(b => b.classList.toggle("is-active", b.dataset.day === dayKey));
    render();
  }

  function mapsLink({title, address}){
    const q = encodeURIComponent((address && address.trim()) ? address : title);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }
  function navLink({title, address}){
    const dest = encodeURIComponent((address && address.trim()) ? address : title);
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }
  function searchLink(q){ return `https://www.google.com/search?q=${encodeURIComponent(q)}`; }

  function lockBody(lock){
    if (lock){
      state.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.classList.add("no-scroll");
      document.body.style.top = `-${state.scrollY}px`;
    } else {
      document.body.classList.remove("no-scroll");
      const y = state.scrollY || 0;
      document.body.style.top = "";
      window.scrollTo(0, y);
    }
  }

  // Open-Meteo
  async function geocode(place){
    const key = place.trim().toLowerCase();
    if (state.geoCache.has(key)) return state.geoCache.get(key);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=zh&format=json`;
    const res = await fetch(url);
    const json = await res.json();
    const hit = json?.results?.[0];
    if (!hit) return null;
    const out = { name: hit.name, lat: hit.latitude, lon: hit.longitude, admin1: hit.admin1 };
    state.geoCache.set(key, out);
    return out;
  }
  function wmoToText(code){
    const map = new Map([[0,"晴朗"],[1,"大致晴"],[2,"多雲"],[3,"陰"],[61,"小雨"],[63,"中雨"],[65,"大雨"],[71,"小雪"],[73,"中雪"],[75,"大雪"],[95,"雷雨"]]);
    return map.get(code) || `天氣碼 ${code}`;
  }
  async function fetchCurrentWeather(place){
    if (!place) return null;
    const key = place.trim().toLowerCase();
    if (state.weatherCache.has(key)) return state.weatherCache.get(key);
    const geo = await geocode(place);
    if (!geo) return null;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,wind_speed_10m,weather_code&timezone=Asia%2FTokyo`;
    const res = await fetch(url);
    const json = await res.json();
    const c = json?.current;
    if (!c) return null;
    const out = { place: `${geo.name}${geo.admin1 ? " · " + geo.admin1 : ""}`, temp:c.temperature_2m, wind:c.wind_speed_10m, code:c.weather_code, text:wmoToText(c.weather_code) };
    state.weatherCache.set(key, out);
    return out;
  }
  function weatherBlock(day){
    const wrap = document.createElement("div");
    wrap.className = "weather";
    wrap.innerHTML = `<div><div class="weather-title">即時天氣（Open-Meteo）</div><div class="weather-main" id="w-main">載入中…</div></div><div class="pill" id="w-pill">${day.weatherQuery || day.baseLocation || ""}</div>`;
    const query = day.weatherQuery || day.baseLocation;
    fetchCurrentWeather(query).then(w=>{
      if (!w){ wrap.querySelector("#w-main").textContent = "查無座標 / 無法取得天氣"; return; }
      wrap.querySelector("#w-pill").textContent = w.place;
      wrap.querySelector("#w-main").textContent = `${w.text} · ${w.temp}°C · 風 ${w.wind} km/h`;
    }).catch(()=> wrap.querySelector("#w-main").textContent = "天氣載入失敗");
    return wrap;
  }

  // Sheet
  function openSheet(item){
    sheetBody.innerHTML = "";
    sheetActions.innerHTML = "";
    const h = document.createElement("h3"); h.textContent = item.title; sheetBody.appendChild(h);
    const t = document.createElement("div"); t.className = "text"; t.style.whiteSpace="pre-wrap"; t.style.fontSize="14px"; t.style.lineHeight="1.55";
    t.textContent = item.detail || item.note || ""; sheetBody.appendChild(t);

    if (Array.isArray(item.collapsibles) && item.collapsibles.length){
      item.collapsibles.forEach(c=>{
        const d = document.createElement("details");
        const s = document.createElement("summary"); s.textContent = c.title;
        const tx = document.createElement("div"); tx.className="text"; tx.style.whiteSpace="pre-wrap"; tx.style.marginTop="8px";
        tx.textContent = c.detail || "";
        d.appendChild(s); d.appendChild(tx);
        sheetBody.appendChild(d);
      });
    }

    const aNav = document.createElement("a"); aNav.className="btn"; aNav.href=navLink(item); aNav.target="_blank"; aNav.rel="noreferrer"; aNav.textContent="導航";
    const aWeb = document.createElement("a"); aWeb.className="btn"; aWeb.target="_blank"; aWeb.rel="noreferrer";
    if (item.website && String(item.website).trim()){ aWeb.href=item.website; aWeb.textContent="官方網站"; }
    else { aWeb.href=searchLink(item.title); aWeb.textContent="搜尋"; }
    sheetActions.appendChild(aNav); sheetActions.appendChild(aWeb);

    backdrop.classList.add("is-open");
    sheet.classList.add("is-open");
    backdrop.hidden = false;
    sheet.hidden = false;
    lockBody(true);
  }
  function closeSheet(){
    sheet.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    window.setTimeout(()=>{
      sheet.hidden = true;
      backdrop.hidden = true;
      lockBody(false);
    }, 220);
  }

  backdrop.addEventListener("click", closeSheet);
  closeBtn.addEventListener("click", closeSheet);

  // swipe: up OR down > 90px closes
  let startY=null;
  sheet.addEventListener("touchstart",(e)=>{ startY=e.touches[0].clientY; },{passive:true});
  sheet.addEventListener("touchmove",(e)=>{
    if (startY==null) return;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > 90) closeSheet();
  },{passive:true});

  function buildCard(item){
    const cfg = typeCfg[item.type] || {label:"", color:"rgba(0,0,0,0)"};
    const card = document.createElement("article");
    card.className = "card" + (item.important ? " is-important" : "");
    const accent = document.createElement("div");
    accent.style.position="absolute"; accent.style.left="0"; accent.style.top="0"; accent.style.bottom="0"; accent.style.width="3px";
    accent.style.background=cfg.color; accent.style.opacity=".85";
    card.appendChild(accent);

    const kicker = document.createElement("div"); kicker.className="card-kicker"; kicker.textContent=cfg.label; card.appendChild(kicker);
    const title = document.createElement("h4"); title.className="card-title"; title.textContent=item.title; card.appendChild(title);

    const meta = document.createElement("p"); meta.className="card-meta";
    const lines=[]; if (item.address) lines.push(`地址：${item.address}`); if (item.note) lines.push(item.note);
    meta.textContent = lines.join("\n");
    card.appendChild(meta);

    const actions = document.createElement("div"); actions.className="card-actions";
    const aNav=document.createElement("a"); aNav.className="btn"; aNav.href=navLink(item); aNav.target="_blank"; aNav.rel="noreferrer"; aNav.textContent="導航";
    const aMap=document.createElement("a"); aMap.className="btn"; aMap.href=mapsLink(item); aMap.target="_blank"; aMap.rel="noreferrer"; aMap.textContent="地圖";
    const aSearch=document.createElement("a"); aSearch.className="btn"; aSearch.href=searchLink(item.title); aSearch.target="_blank"; aSearch.rel="noreferrer"; aSearch.textContent="搜尋";
    actions.appendChild(aNav); actions.appendChild(aMap); actions.appendChild(aSearch);

    const hasDetail = (item.detail && String(item.detail).trim()) || (Array.isArray(item.collapsibles) && item.collapsibles.length);
    if (hasDetail){
      const b=document.createElement("button"); b.className="btn"; b.type="button"; b.textContent="詳細介紹";
      b.addEventListener("click",()=>openSheet(item));
      actions.appendChild(b);
    }
    card.appendChild(actions);
    return card;
  }

  function renderTOC(){
    main.innerHTML="";
    const t=document.createElement("div"); t.className="section-title"; t.textContent="Day 1–Day 8 快速跳轉"; main.appendChild(t);
    const wrap=document.createElement("div"); wrap.style.display="flex"; wrap.style.flexWrap="wrap"; wrap.style.gap="10px";
    DATA.meta.days.forEach(d=>{
      const b=document.createElement("button"); b.className="tab-btn"; b.textContent=`${d.label} · ${d.date}`;
      b.addEventListener("click",()=>{ setActiveTab("itinerary"); setDay(d.key); });
      wrap.appendChild(b);
    });
    main.appendChild(wrap);
  }

  function renderItinerary(){
    main.innerHTML="";
    const day = DATA.meta.days.find(d=>d.key===state.dayKey);
    if (!day) return;
    main.appendChild(weatherBlock(day));
    const header=document.createElement("div"); header.className="section-title"; header.textContent=`${day.label} · ${day.date} · ${day.baseLocation||""}`; main.appendChild(header);
    const items = (DATA.itinerary && DATA.itinerary[state.dayKey]) ? DATA.itinerary[state.dayKey] : [];
    if (!items.length){
      const n=document.createElement("div"); n.className="notice"; n.textContent="此日尚未填入行程資料（請確認 data.js 已更新且推上 GitHub）。"; main.appendChild(n);
      return;
    }
    items.forEach(it=> main.appendChild(buildCard(it)));
  }

  function renderSimpleList(title, items){
    main.innerHTML="";
    const header=document.createElement("div"); header.className="section-title"; header.textContent=title; main.appendChild(header);
    (items||[]).forEach(it=> main.appendChild(buildCard(it)));
    if (!(items||[]).length){
      const n=document.createElement("div"); n.className="notice"; n.textContent="尚未填入資料。"; main.appendChild(n);
    }
  }

  function renderCloud(){
    main.innerHTML="";
    const header=document.createElement("div"); header.className="section-title"; header.textContent="雲端連結"; main.appendChild(header);
    const links = DATA.meta.cloudLinks || [];
    if (!links.length){ main.appendChild(Object.assign(document.createElement("div"),{className:"notice",textContent:"尚未填入連結。"})); return; }
    links.forEach(l=>{
      const item={ type:"shop", title:l.title, address:"", note:l.url?`連結：${l.url}`:"尚未填入連結", detail:l.url||"", website:l.url||"" };
      main.appendChild(buildCard(item));
    });
  }

  function render(){
    if (state.tab==="toc") return renderTOC();
    if (state.tab==="itinerary") return renderItinerary();
    if (state.tab==="transport") return renderSimpleList("交通資訊", DATA.transportCards);
    if (state.tab==="flights") return renderSimpleList("航班資訊", [DATA.flights?.outbound, DATA.flights?.inbound, DATA.flights?.extraLinkCard].filter(Boolean));
    if (state.tab==="lodging") return renderSimpleList("住宿資訊", DATA.lodging);
    if (state.tab==="cloud") return renderCloud();
  }

  function initDaybar(){
    daybar.innerHTML="";
    DATA.meta.days.forEach(d=>{
      const b=document.createElement("button");
      b.className="tab-btn" + (d.key===state.dayKey ? " is-active":"");
      b.dataset.day=d.key;
      b.textContent=d.label;
      b.addEventListener("click",()=>setDay(d.key));
      daybar.appendChild(b);
    });
  }

  $$(".tab-btn[data-tab]").forEach(b=> b.addEventListener("click",()=>setActiveTab(b.dataset.tab)));

  initDaybar();
  $("#bootNotice")?.remove();
  render();
})();
  })();

});


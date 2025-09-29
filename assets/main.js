// main.js — GNews (fixed): correct token param + CORS fallback
(function () { var el = document.getElementById("year"); if (el) el.textContent = String(new Date().getFullYear()); })();
(function () { var h = document.querySelector(".site-header"); if(!h) return; function a(){h.classList.toggle("is-scrolled", window.scrollY>8)} window.addEventListener("scroll", a, {passive:true}); a(); })();
(function () { var r=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches; if(r||!("IntersectionObserver"in window))return; var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("is-in"); io.unobserve(e.target);}})},{rootMargin:"0px 0px -10% 0px",threshold:0.12}); document.querySelectorAll(".reveal,.gcard,.business-card,.card").forEach(function(el){io.observe(el);}); })();
/* ============== Contact form (Formspree) + toast UI ================ */
(function () {
  var f = document.getElementById("contactForm");
  if (!f) return;

  var btn = f.querySelector('button[type="submit"]');

  f.addEventListener("submit", async function (e) {
    e.preventDefault();

    var d = new FormData(f);
    var name = String(d.get("name") || "").trim();
    var email = String(d.get("email") || "").trim();
    var message = String(d.get("message") || "").trim();

    if (!name || !email || !message) {
      toast("必須項目を入力してください。", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("メールアドレスの形式が正しくありません。", "error");
      return;
    }

    try {
      if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); }

      const endpoint = f.action || "https://formspree.io/f/xgvnojpe";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Accept": "application/json" }, // 让 Formspree 返回 JSON
        body: d
      });

      if (res.ok) {
        toast("送信が完了しました！", "success");
        f.reset();
      } else {
        let err = "";
        try { err = await res.text(); } catch (_) {}
        console.warn("[Formspree]", res.status, err);
        toast("送信に失敗しました。時間をおいて再試行してください。", "error");
      }
    } catch (e2) {
      console.error("[Formspree] ネットワークエラー:", e2);
      toast("ネットワークエラーが発生しました。", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.removeAttribute("aria-busy"); }
    }
  });

  function toast(text, type) {
    if (type === void 0) type = "info";
    var el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }
})();

// ================== News via GNews with robust fallback ==================
(function () { 
  var API_KEY = "3442693b75a060a1b7ee636607a2eb5d";          // <-- your GNews token
  var BASE    = "https://gnews.io/api/v4/top-headlines";
  var QUERY   = "";                   // optional keyword
  var MAX     = 6;

  function ready(fn){ if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn,{once:true}); else fn(); }
  ready(loadNews);

  async function loadNews(){
    var list = document.getElementById("newsList") || document.getElementById("news-List");
    if(!list) return;
    list.innerHTML = '<li class="gcard">ニュースを読み込み中...</li>';

    try {
      var directUrl = BASE + "?lang=ja&country=jp&max=" + MAX + (QUERY? "&q="+encodeURIComponent(QUERY) : "") + "&token=" + encodeURIComponent(API_KEY);
      var data = await fetchJsonWithCorsFallback(directUrl);
      var items = (data.articles||[]).map(function(a){ return {
        title: a.title||"", url: a.url||"#",
        description: (a.description||"").slice(0,140),
        publishedAt: a.publishedAt? new Date(a.publishedAt): null,
        image: a.image||""
      };}).filter(function(x){return !!x.image;}).slice(0, MAX);

      if(items.length){ renderNews(list, items); return; }
      console.warn("[News] Empty list after filtering.");
    } catch (err){
      console.warn("[News] GNews error:", err);
    }

    list.innerHTML = '<li class="gcard"><div class="gline"><span class="gicon">⚠️</span><span class="gtitle">我们目前无法检索新闻。</span></div><p class="gdesc">请稍后重试。</p></li>';
  }

  async function fetchJsonWithCorsFallback(url){
    try {
      var res = await fetchWithTimeout(url, {timeout:12000});
      if(res.ok) return await res.json();
    } catch(_) { /* try proxy */ }
    var proxy = "https://api.allorigins.win/get?url=" + encodeURIComponent(url);
    var res2 = await fetchWithTimeout(proxy, {timeout:12000});
    if(!res2.ok) throw new Error("AllOrigins HTTP "+res2.status);
    var body = await res2.json();
    if(!body || !body.contents) throw new Error("AllOrigins empty contents");
    return JSON.parse(body.contents);
  }

  function renderNews(listEl, items){
    var html = items.map(function (item){
      var title = escapeHtml(item.title||"");
      var url   = escapeHtml(item.url||"#");
      var desc  = escapeHtml(item.description||"");
      var date  = item.publishedAt? formatJPDate(item.publishedAt): "";
      var img   = '<img class="news-thumb" src="'+escapeHtml(item.image)+'" alt="" loading="lazy">';
      return '<li class="gcard news-card">'
          + '<div class="news-thumb-wrap">'+ img +'</div>'
          + '<div class="news-body">'
          +   '<a class="news-item-title" href="'+url+'" target="_blank" rel="noopener">'+title+'</a>'
          +   (date? '<div class="news-item-meta">'+date+'</div>':'')
          +   (desc? '<p class="news-desc">'+desc+'</p>':'')
          +   '<a class="btn" style="align-self:flex-start" href="'+url+'" target="_blank" rel="noopener">続きを読む</a>'
          + '</div></li>';
    }).join("");
    listEl.innerHTML = html || '<li class="gcard">現在、表示できるニュースがありません。</li>';
  }
})();

// ========================= Utilities =========================
function escapeHtml(s){ return String(s||"").replace(/[&<>\"']/g,function(c){ return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]); }); }
function formatJPDate(d){ var date=(d instanceof Date)? d: new Date(d); return isNaN(date)? "": date.toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"}); }
async function fetchWithTimeout(url, opts){ if(!opts) opts={}; var t=typeof opts.timeout==="number"?opts.timeout:10000; var c=new AbortController(); var id=setTimeout(function(){c.abort();},t); try{ return await fetch(url, Object.assign({}, opts, {signal:c.signal})); } finally{ clearTimeout(id); } }

// ==================== Mini tilt & A11y ====================
(function () { var cards=document.querySelectorAll(".gcard[data-tilt]"); if(!cards.length) return; var s=10, ms=180; function move(card, e){ var r=card.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2, px=(e.clientX-cx)/(r.width/2), py=(e.clientY-cy)/(r.height/2); card.style.transform="perspective(800px) rotateX("+((py*s).toFixed(2))+"deg) rotateY("+((-px*s).toFixed(2))+"deg) translateY(-6px)"; } function leave(e){ var card=e.currentTarget; card.style.transition="transform "+ms+"ms ease"; card.style.transform="perspective(800px) rotateX(0) rotateY(0)"; setTimeout(function(){card.style.transition="";},ms); } cards.forEach(function(card){ card.addEventListener("mousemove", move.bind(null,card)); card.addEventListener("mouseleave", leave); }); })();
document.addEventListener("keydown", function(e){ if(e.key!=="Enter") return; var el=document.activeElement; if(el && el.matches(".btn,[role='button']")) el.click(); });



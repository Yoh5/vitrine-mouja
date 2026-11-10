/*
 * Mouja — moteur du site. Le contenu vient de content.js (window.SITE).
 * Aucune dépendance.
 */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  const LANGS = ["fr", "en", "ar"];
  const LOCALE = { fr: "fr-FR", en: "en-GB", ar: "ar-MA" };
  const WEEK = [1, 2, 3, 4, 5, 6, 0];            // la semaine commence le lundi
  const state = { lang: "fr", filter: "all", day: new Date().getDay(), period: "monthly" };

  const t = (key) => SITE.i18n[state.lang][key] ?? SITE.i18n.fr[key] ?? key;
  const pick = (v) => (v && typeof v === "object" ? v[state.lang] ?? v.fr : v);
  const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const discipline = (id) => SITE.disciplines.find((d) => d.id === id);
  const coach = (id) => SITE.coaches.find((c) => c.id === id);
  const money = (n) => n.toLocaleString(LOCALE[state.lang]) + " " + pick(SITE.config.currency);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Dates ---------- */
  // Le 08/11/2026 est un dimanche : 8 + d donne le jour de semaine d.
  const weekdayName = (d, style) => new Date(2026, 10, 8 + d).toLocaleDateString(LOCALE[state.lang], { weekday: style || "long" });
  const iso = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  const atTime = (date, hm) => {
    const [h, m] = hm.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const longDate = (isoStr) => new Date(isoStr + "T12:00:00").toLocaleDateString(LOCALE[state.lang], { weekday: "long", day: "numeric", month: "long" });

  /** Les séances réservables : les `bookingDays` prochains jours, sans celles qui commencent trop tôt. */
  function upcoming() {
    const now = new Date();
    const limit = new Date(now.getTime() + SITE.config.bookingCutoff * 60000);
    const out = [];
    for (let i = 0; i < SITE.config.bookingDays; i++) {
      const day = new Date(now);
      day.setDate(now.getDate() + i);
      SITE.schedule
        .filter((s) => s.day === day.getDay())
        .sort((a, b) => a.time.localeCompare(b.time))
        .forEach((s) => { if (atTime(day, s.time) > limit) out.push({ s, date: iso(day) }); });
    }
    return out;
  }

  /* ---------- Langue ---------- */
  function initialLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
    try { const s = localStorage.getItem("mouja-lang"); if (LANGS.includes(s)) return s; } catch (e) {}
    return "fr";
  }

  function setLang(next) {
    state.lang = next;
    try { localStorage.setItem("mouja-lang", next); } catch (e) {}
    const root = document.documentElement;
    root.lang = next;
    root.dir = next === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((n) => { n.textContent = t(n.dataset.i18n); });
    document.querySelectorAll("[data-i18n-attr]").forEach((n) => {
      n.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":");
        n.setAttribute(attr, t(key));
      });
    });
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === next)));
    renderDisciplines();
    renderFilters();
    renderDayTabs();
    renderWeek();
    renderPlans();
    renderCoaches();
    renderSessionSelect();
    renderHours();
    renderReviews();
    renderCredits();
  }

  /* ---------- Disciplines ---------- */
  function intensity(n) {
    const box = el("span", "intensity");
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", fill(t("disc.intensityOf"), { n }));
    for (let i = 1; i <= 3; i++) box.appendChild(el("span", i <= n ? "bar on" : "bar"));
    return box;
  }

  function renderDisciplines() {
    const list = document.querySelector(".disc-grid");
    list.replaceChildren();
    SITE.disciplines.forEach((d, i) => {
      const li = el("li", "disc reveal");
      li.style.setProperty("--i", i);
      const photo = el("div", "photo disc-photo");
      if (d.photo) { photo.style.backgroundImage = `url("${d.photo}")`; photo.classList.add("has-image"); }
      photo.setAttribute("aria-hidden", "true");
      const body = el("div", "disc-body");
      const num = el("span", "disc-num num", String(i + 1).padStart(2, "0"));
      num.setAttribute("aria-hidden", "true");
      const meta = el("p", "disc-meta");
      meta.append(el("span", "disc-label", t("disc.intensity")), intensity(d.intensity), el("span", "num", fill(t("disc.min"), { n: d.min })));
      const see = el("button", "link-btn", t("disc.see"));
      see.type = "button";
      see.setAttribute("aria-label", fill(t("disc.seeLabel"), { name: pick(d.name) }));
      see.addEventListener("click", () => {
        state.filter = d.id;
        renderFilters();
        renderWeek();
        document.getElementById("planning").scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
        const chip = document.querySelector(`.filters [data-id="${d.id}"]`);
        if (chip) chip.focus({ preventScroll: true });
      });
      body.append(num, el("h3", null, pick(d.name)), meta, el("p", "disc-desc", pick(d.desc)), see);
      li.append(photo, body);
      list.appendChild(li);
    });
    // Au premier rendu, les cartes apparaissent au défilement ; après un changement
    // de langue, elles sont déjà visibles (sinon celles au-dessus resteraient cachées).
    if (state.rendered) list.querySelectorAll(".reveal").forEach((n) => n.classList.add("is-visible"));
    else observeReveal(list.querySelectorAll(".reveal"));
  }

  /* ---------- Planning ---------- */
  function renderFilters() {
    const box = document.querySelector(".filters");
    box.replaceChildren();
    [{ id: "all", name: t("plan.all") }, ...SITE.disciplines.map((d) => ({ id: d.id, name: pick(d.name) }))].forEach((f) => {
      const b = el("button", "chip chip-" + f.id, f.name);
      b.type = "button";
      b.dataset.id = f.id;
      b.setAttribute("aria-pressed", String(state.filter === f.id));
      b.addEventListener("click", () => {
        state.filter = f.id;
        box.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
        renderWeek();
      });
      box.appendChild(b);
    });
  }

  function renderDayTabs() {
    const box = document.querySelector(".day-tabs");
    box.replaceChildren();
    const today = new Date().getDay();
    WEEK.forEach((d) => {
      const b = el("button", "day-tab", weekdayName(d, "short"));
      b.type = "button";
      b.dataset.day = d;
      if (d === today) b.classList.add("is-today");
      b.setAttribute("aria-pressed", String(state.day === d));
      b.addEventListener("click", () => {
        state.day = d;
        box.querySelectorAll(".day-tab").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        document.querySelectorAll(".week .day").forEach((col) => col.classList.toggle("is-selected", Number(col.dataset.day) === d));
      });
      box.appendChild(b);
    });
  }

  /** Prochaine date de la séance dans la fenêtre de réservation, ou null. */
  function nextDate(session) {
    const hit = upcoming().find((u) => u.s.id === session.id);
    return hit ? hit.date : null;
  }

  function renderWeek() {
    const week = document.querySelector(".week");
    week.replaceChildren();
    const today = new Date().getDay();
    WEEK.forEach((d) => {
      const col = el("section", "day");
      col.dataset.day = d;
      col.classList.toggle("is-selected", state.day === d);
      col.classList.toggle("is-today", today === d);
      const head = el("h3", "day-head");
      head.append(el("span", null, weekdayName(d)));
      if (today === d) head.append(el("span", "today-tag", t("plan.today")));
      col.appendChild(head);
      const items = SITE.schedule
        .filter((s) => s.day === d && (state.filter === "all" || s.discipline === state.filter))
        .sort((a, b) => a.time.localeCompare(b.time));
      if (!items.length) col.appendChild(el("p", "day-empty", t("plan.empty")));
      const ul = el("ul", "sessions");
      items.forEach((s) => {
        const disc = discipline(s.discipline);
        const li = el("li");
        const b = el("button", "session s-" + s.discipline);
        b.type = "button";
        const time = el("span", "s-time num", s.time);
        time.dir = "ltr";
        b.append(time, el("span", "s-name", pick(disc.name)), el("span", "s-meta", pick(coach(s.coach).name) + " · " + t("level." + s.level)));
        b.setAttribute("aria-label", fill(t("plan.book"), { name: pick(disc.name), day: weekdayName(d), time: s.time }) + " — " + pick(coach(s.coach).name) + ", " + t("level." + s.level));
        const date = nextDate(s);
        if (!date) b.disabled = true;
        b.addEventListener("click", () => preselect(s.id + "|" + date));
        li.appendChild(b);
        ul.appendChild(li);
      });
      col.appendChild(ul);
      week.appendChild(col);
    });
  }

  function preselect(value) {
    const sel = document.getElementById("f-session");
    sel.value = value;
    sel.dispatchEvent(new Event("change"));
    document.getElementById("reserver").scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
    sel.focus({ preventScroll: true });
  }

  /* ---------- Abonnements ---------- */
  function renderPlans() {
    const box = document.querySelector(".plans");
    box.replaceChildren();
    SITE.plans.forEach((p) => {
      const card = el("article", "plan" + (p.featured ? " is-featured" : ""));
      if (p.featured) card.appendChild(el("p", "plan-badge", t("plans.featured")));
      card.appendChild(el("h3", null, pick(p.name)));
      const priceP = el("p", "plan-price");
      let amount, unit, period;
      if (p.once != null) {
        amount = p.once; unit = pick(p.unit); period = t("plans.msgOnce");
      } else {
        const yearly = state.period === "yearly" && p.yearly != null;
        amount = yearly ? p.yearly : p.monthly;
        unit = t(yearly ? "plans.perYear" : "plans.perMonth");
        period = t(yearly ? "plans.yearly" : "plans.monthly");
      }
      const val = el("span", "plan-amount num", money(amount));
      priceP.append(val, el("span", "plan-unit", unit));
      card.appendChild(priceP);
      const ul = el("ul", "plan-perks");
      p.perks.forEach((k) => ul.appendChild(el("li", null, pick(k))));
      card.appendChild(ul);
      const a = el("a", "btn" + (p.featured ? "" : " btn-ink"), t("plans.choose"));
      a.href = waUrl(fill(t("plans.msg"), { plan: pick(p.name), period }));
      a.target = "_blank"; a.rel = "noopener";
      a.setAttribute("aria-label", fill(t("plans.chooseLabel"), { name: pick(p.name) }));
      card.appendChild(a);
      box.appendChild(card);
    });
  }

  function initPeriod() {
    document.querySelectorAll("input[name=period]").forEach((r) => r.addEventListener("change", () => {
      state.period = r.value;
      renderPlans();
    }));
  }

  /* ---------- Coachs ---------- */
  function renderCoaches() {
    const ul = document.querySelector(".coaches");
    ul.replaceChildren();
    SITE.coaches.forEach((c, i) => {
      const li = el("li", "coach");
      const mono = el("span", "coach-mono mono-" + (i % 3), c.initial);
      mono.setAttribute("aria-hidden", "true");
      const body = el("div", "coach-body");
      body.append(
        el("h3", null, pick(c.name)),
        el("p", "coach-disc", c.disciplines.map((id) => pick(discipline(id).name)).join(" · ")),
        el("p", null, pick(c.bio)),
        el("p", "coach-langs", t("coachs.speaks") + " : " + pick(c.langs))
      );
      li.append(mono, body);
      ul.appendChild(li);
    });
  }

  /* ---------- Réservation ---------- */
  function renderSessionSelect() {
    const sel = document.getElementById("f-session");
    const keep = sel.value;
    sel.replaceChildren(new Option(t("form.sessionPick"), ""));
    const today = iso(new Date());
    let group = null, groupDate = null;
    upcoming().forEach(({ s, date }) => {
      if (date !== groupDate) {
        group = document.createElement("optgroup");
        group.label = longDate(date) + (date === today ? " — " + t("plan.today") : "");
        sel.appendChild(group);
        groupDate = date;
      }
      const label = fill(t("form.sessionOpt"), { time: s.time, name: pick(discipline(s.discipline).name), coach: pick(coach(s.coach).name) });
      group.appendChild(new Option(label, s.id + "|" + date));
    });
    sel.value = keep;
    if (sel.value !== keep) sel.value = "";
  }

  function initForm() {
    const form = document.querySelector(".book-form");
    const f = form.elements;
    const rules = {
      session: () => !!f.session.value || "form.errSession",
      name: () => f.name.value.trim().length > 1 || "form.errName",
      level: () => !!form.querySelector("input[name=level]:checked") || "form.errLevel"
    };
    function check(name) {
      const res = rules[name]();
      const bad = res !== true;
      if (name !== "level") f[name].setAttribute("aria-invalid", String(bad));
      document.getElementById("e-" + name).textContent = bad ? t(res) : "";
      return !bad;
    }
    f.session.addEventListener("change", () => check("session"));
    f.name.addEventListener("blur", () => check("name"));
    form.querySelectorAll("input[name=level]").forEach((r) => r.addEventListener("change", () => check("level")));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const names = Object.keys(rules);
      const first = names.map(check).indexOf(false);
      if (first !== -1) {
        const n = names[first] === "level" ? form.querySelector("input[name=level]") : f[names[first]];
        n.focus();
        return;
      }
      const [id, date] = f.session.value.split("|");
      const s = SITE.schedule.find((x) => x.id === id);
      const note = f.note.value.trim();
      const msg = fill(t("form.msg"), {
        session: pick(discipline(s.discipline).name),
        date: longDate(date),
        time: s.time,
        coach: pick(coach(s.coach).name),
        name: f.name.value.trim(),
        level: t(form.querySelector("input[name=level]:checked").value),
        trial: f.trial.checked ? t("form.msgTrial") : "",
        note: note ? fill(t("form.msgNote"), { note }) : ""
      });
      window.open(waUrl(msg), "_blank", "noopener");
    });

    // « Séance d'essai » coche la case de la première séance.
    document.querySelectorAll("[data-trial]").forEach((a) => a.addEventListener("click", () => { f.trial.checked = true; }));
  }

  /* ---------- Horaires, avis, contact, crédits ---------- */
  function renderHours() {
    const dl = document.querySelector(".hours");
    dl.replaceChildren();
    SITE.hours.forEach((h) => {
      const row = el("div", "hours-row");
      const dd = el("dd", "num", h.open + " – " + h.close);
      dd.dir = "ltr";
      row.append(el("dt", null, pick(h.label)), dd);
      dl.appendChild(row);
    });
  }

  function renderReviews() {
    const list = SITE.reviews || [];
    const section = document.getElementById("avis");
    section.hidden = list.length === 0;
    const box = section.querySelector(".reviews");
    box.replaceChildren();
    list.forEach((r) => {
      const q = el("blockquote", "review");
      q.append(el("p", null, pick(r.text)), el("cite", null, r.name));
      box.appendChild(q);
    });
  }

  function waUrl(text) {
    const num = (SITE.config.whatsapp || "").replace(/\D/g, "");
    const base = "https://wa.me/" + num;
    return text ? base + "?text=" + encodeURIComponent(text) : base;
  }

  function initContact() {
    const phone = document.querySelector(".js-phone");
    phone.textContent = SITE.config.phone;
    phone.href = "tel:" + SITE.config.phone.replace(/\s/g, "");
    const mail = document.querySelector(".js-email");
    mail.textContent = SITE.config.email;
    mail.href = "mailto:" + SITE.config.email;
    document.querySelectorAll(".js-wa").forEach((a) => { a.href = waUrl(""); });
    document.querySelector(".js-year").textContent = new Date().getFullYear();
  }

  function renderCredits() {
    const box = document.querySelector(".js-credits");
    box.replaceChildren();
    const credits = SITE.credits || [];
    box.closest(".credits").hidden = credits.length === 0;
    credits.forEach((c, i) => {
      if (i) box.append(" · ");
      const a = el("a", null, c.author);
      a.href = c.url; a.target = "_blank"; a.rel = "noopener";
      box.append(a, " (" + pick(c.license) + ")");
    });
  }

  function initPhotos() {
    const p = SITE.config.photos || {};
    document.querySelectorAll("[data-photo]").forEach((n) => {
      const src = p[n.dataset.photo];
      if (!src) return;
      n.style.backgroundImage = `url("${src}")`;
      n.classList.add("has-image");
    });
  }

  /* ---------- Navigation, apparition ---------- */
  function initNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("nav");
    const close = () => { nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

    const header = document.querySelector(".site-header");
    const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const links = [...nav.querySelectorAll("ul a")];
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", String(a.hash === "#" + en.target.id)));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((a) => { const s = document.querySelector(a.hash); if (s) spy.observe(s); });
  }

  let io = null;
  function observeReveal(items) {
    if (reduced() || !("IntersectionObserver" in window)) {
      items.forEach((n) => n.classList.add("is-visible"));
      return;
    }
    io = io || new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    items.forEach((n) => io.observe(n));
  }

  initPhotos();
  initContact();
  initNav();
  initPeriod();
  initForm();
  setLang(initialLang());
  state.rendered = true;
})();

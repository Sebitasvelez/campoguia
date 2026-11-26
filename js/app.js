/* CampoGuía · app del agricultor */
(function () {
  const L = window.Logic, D = window.Datos, S = D.store;
  const NOMBRE = (window.AGRODOSIS_CONFIG || {}).APP_NOMBRE || "CampoGuía";
  document.title = NOMBRE;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = (s) => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hoy = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const fechaCorta = (iso) => { if (!iso) return ""; const d = new Date(iso + "T12:00:00"); return d.toLocaleDateString("es-EC", { day: "numeric", month: "short" }); };
  const dinero = (v) => (v === null || v === undefined || isNaN(v) ? "—" : "$" + Number(v).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

  // ------------------------------------------------------------ estado de interfaz
  const ui = Object.assign({ cultivo: null, etapa: {}, tipo: "plaga", vol: "bomba", fertTipo: "suelo", calc: {}, ph: "" }, S.get("ui", {}));
  const guardarUI = () => S.set("ui", ui);
  let prefill = null; // datos para el formulario de registro

  // ------------------------------------------------------------ catálogo
  let I = null;
  function indexar() {
    const c = D.catalogo || {};
    const by = (arr, k) => { const m = {}; (arr || []).forEach((x) => { (m[x[k]] = m[x[k]] || []).push(x); }); return m; };
    I = {
      c, prod: Object.fromEntries((c.productos || []).map((p) => [String(p.id), p])),
      etapas: by((c.etapas || []).filter((e) => e.uso !== "lote").sort((a, b) => a.orden - b.orden), "cultivo_id"),
      etapasLote: by((c.etapas || []).filter((e) => e.uso === "lote").sort((a, b) => a.orden - b.orden), "cultivo_id"),
      problemas: by((c.problemas || []).slice().sort((a, b) => a.orden - b.orden), "cultivo_id"),
      recs: by((c.recomendaciones || []).slice().sort((a, b) => a.prioridad - b.prioridad), "problema_id"),
      plan: by((c.plan_sanitario || []).slice().sort((a, b) => a.orden - b.orden), "etapa_id"),
      fert: by((c.plan_fertilizacion || []).slice().sort((a, b) => a.orden - b.orden), "etapa_id"),
    };
  }
  const aj = (k, def) => { const v = ((D.catalogo || {}).ajustes || {})[k]; return v === undefined || v === null || v === "" ? def : v; };
  const P = (id) => (I.prod[String(id)] || null);
  const cultivos = () => (I.c.cultivos || []).filter((c) => c.activo !== false).sort((a, b) => a.orden - b.orden);
  const cultivo = (id) => cultivos().find((c) => c.id === id) || null;
  const etapasDe = (cid) => I.etapas[cid] || [];
  const etapa = (id) => (I.c.etapas || []).find((e) => String(e.id) === String(id)) || null;
  const etapaActual = (cid) => { const lista = etapasDe(cid); return lista.find((e) => String(e.id) === String(ui.etapa[cid])) || lista[0] || null; };
  const TANQUE = () => Number(aj("volumen_tanque_l", 200)), BOMBA = () => Number(aj("volumen_bomba_l", 20));
  const volL = () => (ui.vol === "tanque" ? TANQUE() : BOMBA());
  const volTxt = () => (ui.vol === "tanque" ? `tanque de ${TANQUE()} L` : `bomba de ${BOMBA()} L`);
  const TIPOS = [["plaga", "Plagas"], ["enfermedad", "Enfermedades"], ["maleza", "Malezas"], ["nutricion", "Nutrición"]];
  const RIESGO = { bajo: ["riesgo-bajo", "Riesgo bajo de sarna/hongos"], ligero: ["riesgo-ligero", "Riesgo ligero de sarna/hongos"], alto: ["riesgo-alto", "Riesgo alto de sarna/hongos"] };

  // ------------------------------------------------------------ íconos
  // íconos de cultivo (estilo a color); los cultivos nuevos usan la hoja
  const ICONO_CULTIVO = {
    pitahaya: '<svg width="44" height="44" viewBox="-36 -44 72 86" aria-hidden="true"><ellipse cx="0" cy="4" rx="24" ry="30" fill="#F2C230"/><path d="M-18 -10 L-30 -18 L-14 -16 Z M18 -10 L30 -18 L14 -16 Z M-22 10 L-34 8 L-21 2 Z M22 10 L34 8 L21 2 Z M-12 26 L-18 38 L-5 30 Z M12 26 L18 38 L5 30 Z" fill="#6DA544"/><path d="M0 -26 Q-8 -38 -16 -40 Q-4 -42 2 -28 Z M0 -26 Q8 -40 18 -42 Q10 -32 2 -26 Z" fill="#6DA544"/><circle cx="-7" cy="0" r="2" fill="#B8860B"/><circle cx="7" cy="-2" r="2" fill="#B8860B"/><circle cx="0" cy="12" r="2" fill="#B8860B"/></svg>',
    cacao: '<svg width="44" height="44" viewBox="-30 -52 60 92" aria-hidden="true"><path d="M0 -36 Q22 -30 24 0 Q22 30 0 38 Q-22 30 -24 0 Q-22 -30 0 -36 Z" fill="#C8762A"/><path d="M0 -36 Q8 0 0 38 M0 -36 Q-8 0 0 38 M-12 -31 Q-17 0 -12 33 M12 -31 Q17 0 12 33" fill="none" stroke="#8A4B16" stroke-width="2"/><path d="M0 -36 L0 -46 L7 -50" fill="none" stroke="#5B7A2E" stroke-width="3" stroke-linecap="round"/></svg>',
  };
  const ic = {
    atras: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    flecha: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    casa: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9H3z"/></svg>',
    calc: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/></svg>',
    portafolio: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M3 13h18"/></svg>',
    lotes: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18v12H3zM9 6v12M15 6v12"/></svg>',
    mezcla: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/></svg>',
    persona: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    wa: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path fill="currentColor" d="M9.1 7.6c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.6l-.6.7c-.1.1-.1.3 0 .5.5.9 1.2 1.7 2.1 2.3.4.3.8.5 1.2.7.2.1.4 0 .5-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.3.3.6-.1.9-.9 1.7-1.8 1.8-.6.1-1.4 0-2.9-.6-2-.9-3.4-2.6-3.9-3.4-.5-.7-1-1.8-1-2.8 0-.9.4-1.6.8-2 .2-.3.5-.4.7-.4z"/></svg>',
    alerta: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="flex-shrink:0"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/></svg>',
    hoja: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19l8-8"/></svg>',
    gota: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z"/></svg>',
    escudo: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
    descarga: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  };

  // ------------------------------------------------------------ utilidades de vista
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  }
  // WhatsApp del asesor: puede ser un número (09…) o un enlace corto de WhatsApp (https://wa.me/message/…)
  function waLink(texto) {
    const v = String(aj("whatsapp_asesor", "")).trim();
    if (/^https:\/\/(wa\.me\/message|api\.whatsapp\.com\/message)\//i.test(v)) {
      // los enlaces cortos no aceptan texto: lo llevamos en el # para copiarlo al tocar el botón
      return v.split("#")[0] + "#t=" + encodeURIComponent(texto);
    }
    let n = v.replace(/^https?:\/\/(wa\.me|api\.whatsapp\.com)\/?/i, "").split("?")[0].replace(/\D/g, "");
    if (n.startsWith("0")) n = "593" + n.slice(1);
    return "https://wa.me/" + n + "?text=" + encodeURIComponent(texto);
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href*="#t="]');
    if (!a || !/wa\.me|whatsapp\.com/.test(a.href)) return;
    const texto = decodeURIComponent(a.href.split("#t=")[1] || "");
    if (texto && navigator.clipboard) navigator.clipboard.writeText(texto).then(() => toast("Mensaje copiado: pégalo en el chat con tu asesor"), () => {});
  });
  const barra = (titulo, sub, atras) =>
    `<header class="barra"><a class="icono-btn" href="${h(atras || "#/")}" aria-label="Volver">${ic.atras}</a><div class="t">${sub ? `<small>${h(sub)}</small>` : ""}<strong>${h(titulo)}</strong></div></header>`;
  function nav(sel) {
    const it = [["#/", "Inicio", ic.casa, "inicio"], ...(esTecnico() ? [["#/portafolio", "Portafolio", ic.portafolio, "portafolio"]] : []), ["#/calcular", "Dosis", ic.calc, "calcular"], ["#/mezcla", "Mezcla", ic.mezcla, "mezcla"], ["#/lotes", "Mis lotes", ic.lotes, "lotes"]];
    return `<nav class="nav" aria-label="Principal" style="grid-template-columns:repeat(${it.length},1fr)">${it.map(([href, t, i, k]) => `<a href="${href}" class="${sel === k ? "sel" : ""}" ${sel === k ? 'aria-current="page"' : ""}>${i}${t}</a>`).join("")}</nav>`;
  }
  const demoBanner = () => (D.modoDemo ? `<div class="demo">Modo demostración: los datos se guardan solo en este equipo.</div>` : "");
  // ------------------------------------------------------------ INSTALAR LA APP EN EL CELULAR
  let avisoInstalar = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); avisoInstalar = e; refrescarInstalar(); });
  window.addEventListener("appinstalled", () => { avisoInstalar = null; S.set("instalada", true); refrescarInstalar(); toast("CampoGuía quedó instalada. Búscala en tu pantalla de inicio."); });
  const yaInstalada = () => (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const enOtraApp = () => /FBAN|FBAV|Instagram|WhatsApp|Line\/|wv\)|TikTok/i.test(navigator.userAgent);
  function cardInstalar(fijo) {
    if (yaInstalada()) return "";
    if (!fijo && Number(S.get("instalar_oculto", 0)) > Date.now()) return "";
    return `<div class="card instalar" data-instalar-card style="flex-direction:row;align-items:center;gap:12px;border-color:var(--verde)">
      <img src="icons/logo-redondo.svg" alt="" width="48" height="48" style="border-radius:12px;flex-shrink:0">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <b style="font-size:15px">Instala CampoGuía en tu celular</b>
        <span class="mini">Ábrela con un toque desde tu pantalla de inicio y úsala sin internet.</span>
        <div class="fila" style="justify-content:flex-start;gap:8px"><button type="button" class="btn chico" data-instalar>Instalar CampoGuía</button>${fijo ? "" : `<button type="button" class="btn sec chico" data-instalar-no>Ahora no</button>`}</div>
      </div></div>`;
  }
  function refrescarInstalar() { if (yaInstalada()) $$("[data-instalar-card]").forEach((x) => x.remove()); }
  function pasosInstalar() {
    const fondo = document.createElement("div");
    fondo.style.cssText = "position:fixed;inset:0;background:rgba(20,28,24,.45);display:flex;align-items:flex-end;justify-content:center;padding:16px;z-index:100";
    const pasos = esIOS()
      ? [["1", "Abre esta página en <b>Safari</b>."], ["2", "Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba)."], ["3", "Baja y toca <b>Agregar a inicio</b>."], ["4", "Toca <b>Agregar</b>. El ícono de CampoGuía aparecerá en tu pantalla."]]
      : enOtraApp()
        ? [["1", "Estás dentro de otra app (WhatsApp, Facebook…). Toca el menú <b>⋮</b> arriba a la derecha."], ["2", "Elige <b>Abrir en Chrome</b> (o «Abrir en el navegador»)."], ["3", "En Chrome toca otra vez <b>Instalar CampoGuía</b>."]]
        : [["1", "Toca el menú <b>⋮</b> de Chrome, arriba a la derecha."], ["2", "Elige <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>."], ["3", "Confirma con <b>Instalar</b>. El ícono de CampoGuía aparecerá en tu pantalla."]];
    fondo.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-label="Cómo instalar CampoGuía" style="max-width:420px;width:100%;gap:12px;box-shadow:0 12px 40px rgba(0,0,0,.25)">
      <div class="fila"><b style="font-size:16px">Cómo instalar CampoGuía</b><button type="button" class="icono-btn" data-cerrar aria-label="Cerrar">✕</button></div>
      ${pasos.map(([n, t]) => `<div style="display:flex;gap:10px;align-items:flex-start"><span style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:var(--verde);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${n}</span><span style="font-size:14.5px;line-height:1.45">${t}</span></div>`).join("")}
      <button type="button" class="btn" data-cerrar>Entendido</button></div>`;
    const cerrar = () => fondo.remove();
    fondo.addEventListener("click", (e) => { if (e.target === fondo || e.target.closest("[data-cerrar]")) cerrar(); });
    document.body.appendChild(fondo); fondo.querySelector(".btn").focus();
  }
  document.addEventListener("click", async (e) => {
    if (e.target.closest("[data-instalar-no]")) { S.set("instalar_oculto", Date.now() + 7 * 864e5); $$("[data-instalar-card]").forEach((x) => x.remove()); return; }
    if (!e.target.closest("[data-instalar]")) return;
    if (avisoInstalar) {
      const ev = avisoInstalar; avisoInstalar = null;
      try { ev.prompt(); const r = await ev.userChoice; if (r && r.outcome === "accepted") { $$("[data-instalar-card]").forEach((x) => x.remove()); } } catch (er) { pasosInstalar(); }
    } else pasosInstalar();
  });

  function pintar(html, navSel) {
    const app = $("#app");
    app.innerHTML = `<div class="app">${demoBanner()}${html}</div>${navSel === null ? "" : nav(navSel)}`;
    window.scrollTo(0, 0);
  }
  const opcionesProductos = (selId, filtro) => {
    const grupos = {};
    (I.c.productos || []).filter((p) => !SIN_DOSIS.includes(p.categoria)).filter(filtro || (() => true)).forEach((p) => { (grupos[p.categoria] = grupos[p.categoria] || []).push(p); });
    return Object.keys(grupos).sort().map((g) => `<optgroup label="${h(g)}">${grupos[g].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((p) => `<option value="${p.id}" ${String(selId) === String(p.id) ? "selected" : ""}>${h(p.nombre)}${p.ingrediente_activo ? " · " + h(p.ingrediente_activo) : ""}</option>`).join("")}</optgroup>`).join("");
  };
  function dosisVol(p, rec) {
    const d = L.dosisDe(p, rec);
    if (d.modo === "sitio") return { grande: L.rango(d.min, d.max, "g"), sub: "por sitio o planta" };
    if (d.modo === "suelo_ha") return { grande: L.rango(d.min, d.max, "kg"), sub: "por hectárea (al suelo)" };
    if (d.min === null && d.max === null) return { grande: "Ver etiqueta", sub: p.dosis_texto || "Dosis no cargada" };
    return { grande: L.rango(d.min, d.max, d.unidad, volL() / TANQUE()), sub: "por " + volTxt() };
  }
  const segVol = () => `<div class="seg" role="group" aria-label="Volumen"><button data-vol="bomba" class="${ui.vol === "bomba" ? "sel" : ""}">Bomba ${BOMBA()} L</button><button data-vol="tanque" class="${ui.vol === "tanque" ? "sel" : ""}">Tanque ${TANQUE()} L</button></div>`;
  const conectarVol = (re) => $$("[data-vol]").forEach((b) => b.addEventListener("click", () => { const y = window.scrollY, c0 = $("#carr"), x = c0 ? c0.scrollLeft : 0; ui.vol = b.dataset.vol; guardarUI(); re(); window.scrollTo(0, y); const c1 = $("#carr"); if (c1) c1.scrollTo({ left: x, behavior: "instant" }); })); // al cambiar bomba/tanque la pantalla y la alternativa que se está viendo no se mueven
  const avisoSeguridad = () => `<div class="aviso ambar">${ic.alerta}<div>Usa guantes, mascarilla, gafas y ropa de manga larga. No fumigues con sol, viento fuerte ni antes de lluvia. ${h(aj("aviso_legal", "Recomendación técnica referencial. Lea siempre la etiqueta y verifique con su asesor."))}</div></div>`;
  const SIN_DOSIS = ["Semilla", "Otros"];   // productos de catálogo que no se calculan ni se mezclan
  // en la mezcla: productos de tanque (dosis por tanque) y fertilizantes al suelo (dosis por hectárea)
  const itemMezcla = (p, dosis) => (p.modo_aplicacion === "suelo_ha" ? { producto_id: Number(p.id), suelo: true, dosis_ha: dosis } : { producto_id: Number(p.id), dosis_tanque: dosis });
  function agregarAMezcla(pid, dosis) {
    const m = S.get("mezcla", []);
    if (!m.some((x) => String(x.producto_id) === String(pid))) { m.push(itemMezcla(P(pid), dosis)); S.set("mezcla", m); toast("Agregado a tu mezcla"); }
    else toast("Ese producto ya está en tu mezcla");
  }

  const PROVINCIAS = ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja",
    "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos",
    "Tungurahua", "Zamora Chinchipe"];
  const mapaURL = (lat, lon) => `https://www.google.com/maps?q=${Number(lat).toFixed(6)},${Number(lon).toFixed(6)}`;
  function obtenerUbicacion() {
    return new Promise((ok, mal) => {
      if (!navigator.geolocation) return mal(new Error("Este teléfono no permite obtener la ubicación."));
      navigator.geolocation.getCurrentPosition(
        (pos) => ok({ latitud: pos.coords.latitude, longitud: pos.coords.longitude, precision_m: Math.round(pos.coords.accuracy), ubicacion_fecha: new Date().toISOString() }),
        (e) => mal(new Error(e.code === 1 ? "No diste permiso de ubicación. Actívalo en tu navegador y vuelve a intentar." : "No se pudo obtener la ubicación. Sal a un lugar abierto y vuelve a intentar.")),
        { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
    });
  }
  // bloque reutilizable: botón para guardar la ubicación de la finca
  function bloqueUbicacion(ub, o) {
    o = o || {};
    return `<div class="card" style="background:#FAFBF8" id="ubic">
      <b style="font-size:14px">${h(o.titulo || "Ubicación de la finca (opcional)")}</b>
      <span class="mini">${h(o.texto || "Si estás en tu finca ahora, toca el botón para guardar el punto GPS. Funciona sin internet.")}</span>
      <div id="ubicEstado" class="mini">${ub && ub.latitud ? `Guardada: ${Number(ub.latitud).toFixed(5)}, ${Number(ub.longitud).toFixed(5)} (±${h(ub.precision_m)} m) · <a href="${h(mapaURL(ub.latitud, ub.longitud))}" target="_blank" rel="noopener">Ver en el mapa</a>` : "Sin ubicación todavía."}</div>
      <button type="button" class="btn sec chico" id="btnUbic">${h(o.boton || "Estoy en mi finca: guardar ubicación")}</button>
    </div>`;
  }
  function conectarUbicacion(destino) {
    const b = $("#btnUbic"); if (!b) return;
    b.addEventListener("click", async () => {
      b.disabled = true; $("#ubicEstado").textContent = "Buscando señal GPS…";
      try {
        const u = await obtenerUbicacion(); Object.assign(destino, u);
        $("#ubicEstado").innerHTML = `Guardada: ${u.latitud.toFixed(5)}, ${u.longitud.toFixed(5)} (±${u.precision_m} m) · <a href="${h(mapaURL(u.latitud, u.longitud))}" target="_blank" rel="noopener">Ver en el mapa</a>`;
        if (destino.alGuardar) destino.alGuardar(u);
      } catch (e) { $("#ubicEstado").textContent = e.message; }
      b.disabled = false;
    });
  }

  // ------------------------------------------------------------ BIENVENIDA / CUENTA
  function vBienvenida(modo) {
    const cultOpts = cultivos().map((c) => `<option value="${h(c.id)}">${h(c.nombre)}</option>`).join("");
    const intro = `<div class="top" style="padding-top:36px"><img src="icons/logo-redondo.svg" alt="" width="72" height="72" style="display:block;margin-bottom:12px;border-radius:16px;box-shadow:0 0 0 2px rgba(255,255,255,.35)"><h1 style="font-size:28px">${h(NOMBRE)}</h1><p>Manual técnico de tu cultivo, registro de actividades y costos de producción de tu finca. Funciona también sin internet.</p></div>`;
    if (modo === "registro") {
      const ub = {};
      pintar(`${intro}${cardInstalar() ? `<div class="cont" style="padding-bottom:0">${cardInstalar()}</div>` : ""}<form class="cont" id="f" novalidate>
        <h2 style="font-size:20px">Crea tu cuenta</h2>
        <label class="campo">Número de cédula<input name="cedula" inputmode="numeric" maxlength="10" autocomplete="off" required><small id="cedEstado">Con tu cédula ingresarás a la app.</small></label>
        <label class="campo">Nombres y apellidos<input name="nombres" autocomplete="name" required></label>
        <label class="campo">Número de celular<input name="telefono" type="tel" inputmode="tel" placeholder="09X XXX XXXX" required></label>
        <div class="grid2"><label class="campo">Provincia<select name="provincia" required><option value="">Elige…</option>${PROVINCIAS.map((p) => `<option>${h(p)}</option>`).join("")}</select></label>
        <label class="campo">Sector del cultivo<input name="sector" placeholder="Comunidad o parroquia" required></label></div>
        <div class="grid2"><label class="campo">Cultivo principal<select name="cultivo_id">${cultOpts}</select></label>
        <label class="campo">Hectáreas<input name="hectareas" inputmode="decimal" placeholder="Ej. 2"></label></div>
        <label class="campo">Soy<select name="rol"><option value="agricultor">Agricultor</option><option value="tecnico">Técnico agrícola (requiere aprobación)</option></select></label>
        ${bloqueUbicacion(null)}
        <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--suave)"><input type="checkbox" name="acepta" checked style="width:22px;height:22px;margin:0;accent-color:var(--verde)"> Acepto que mi asesor vea mis registros y la ubicación de mi finca para darme seguimiento técnico.</label>
        <p class="mini" id="err" role="alert" style="color:var(--rojo);margin:0"></p>
        <button class="btn" type="submit">Crear cuenta</button>
        <a href="#/entrar" style="text-align:center;font-weight:600;font-size:14px">Ya tengo cuenta · Ingresar</a>
      </form>`, null);
      conectarUbicacion(ub);
      const f = $("#f");
      f.cedula.addEventListener("input", () => {
        const v = f.cedula.value.replace(/\D/g, ""), est = $("#cedEstado");
        est.style.color = v.length < 10 ? "" : D.cedulaValida(v) ? "var(--verde)" : "var(--rojo)";
        est.textContent = v.length < 10 ? "Con tu cédula ingresarás a la app." : D.cedulaValida(v) ? "Cédula válida." : "Esta cédula no es válida. Revisa los números.";
      });
      f.addEventListener("submit", async (e) => {
        e.preventDefault(); const b = f.querySelector("button[type=submit]"); $("#err").textContent = "";
        if (!D.cedulaValida(f.cedula.value)) { $("#err").textContent = "La cédula no es válida. Revisa los 10 dígitos."; return; }
        if (!f.provincia.value || !f.sector.value.trim()) { $("#err").textContent = "Elige la provincia y escribe el sector de tu cultivo."; return; }
        b.disabled = true;
        try {
          await D.registrar({ cedula: f.cedula.value, nombres: f.nombres.value, telefono: f.telefono.value, cultivo_id: f.cultivo_id.value,
            hectareas: f.hectareas.value.replace(",", "."), provincia: f.provincia.value, sector: f.sector.value, rol: f.rol.value,
            acepta_seguimiento: f.acepta.checked, latitud: ub.latitud, longitud: ub.longitud, precision_m: ub.precision_m });
          ui.cultivo = f.cultivo_id.value; guardarUI(); location.hash = "#/"; router();
          if (f.rol.value === "tecnico") toast("Tu cuenta está lista. El acceso de técnico agrícola queda pendiente de aprobación de tu asesor.");
        } catch (er) { $("#err").textContent = er.codigo === "red" ? "Para crear tu cuenta necesitas internet. Inténtalo cuando tengas señal." : er.message; b.disabled = false; }
      });
      return;
    }
    pintar(`${intro}${cardInstalar() ? `<div class="cont" style="padding-bottom:0">${cardInstalar()}</div>` : ""}<form class="cont" id="f" novalidate>
      <h2 style="font-size:20px">Ingresa con tu cédula y celular</h2>
      <label class="campo">Número de cédula<input name="cedula" inputmode="numeric" maxlength="10" autocomplete="off" required></label>
      <label class="campo">Celular con el que te registraste<input name="telefono" type="tel" inputmode="tel" maxlength="15" autocomplete="tel" placeholder="09…" required><small>Por seguridad pedimos los dos datos: así nadie más puede ver tus lotes y costos.</small></label>
      <p class="mini" id="err" role="alert" style="color:var(--rojo);margin:0"></p>
      <button class="btn" type="submit">Ingresar</button>
      <div class="linea-sep"></div>
      <a class="btn sec" href="#/registro">Crear cuenta nueva</a>
    </form>`, null);
    $("#f").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target, b = f.querySelector("button"); $("#err").textContent = "";
      if (!D.cedulaValida(f.cedula.value)) { $("#err").textContent = "La cédula no es válida. Revisa los 10 dígitos."; return; }
      if (f.telefono.value.replace(/\D/g, "").length < 9) { $("#err").textContent = "Escribe tu número de celular."; return; }
      b.disabled = true;
      try { await D.ingresar(f.cedula.value, f.telefono.value); ui.cultivo = D.sesion.perfil.cultivo_id || ui.cultivo; guardarUI(); location.hash = "#/"; router(); }
      catch (er) { $("#err").textContent = er.codigo === "red" ? "Para ingresar la primera vez necesitas internet." : er.message; b.disabled = false; }
    });
  }

  // ------------------------------------------------------------ INICIO
  function vInicio() {
    const perfil = D.sesion.perfil, online = navigator.onLine !== false, pend = D.hayPendientes();
    if (!ui.cultivo || !cultivo(ui.cultivo)) { ui.cultivo = perfil.cultivo_id && cultivo(perfil.cultivo_id) ? perfil.cultivo_id : (cultivos()[0] || {}).id; guardarUI(); }
    const al = L.alertas(D.registros(), D.lotes(), hoy()).slice(0, 2);
    const nombre = (perfil.nombres || "").split(" ")[0];
    pintar(`
      <div class="top"><div class="fila"><h1>${h(NOMBRE)}</h1><a class="icono-btn" href="#/perfil" aria-label="Mi cuenta">${ic.persona}</a></div>
        <div class="fila"><p>Hola, ${h(nombre)}. ¿Qué cultivo vas a trabajar hoy?</p>
        <span class="estado ${online ? "" : "off"}"><i></i>${online ? (pend ? "Enviando…" : "En línea") : "Sin conexión"}</span></div></div>
      <main class="cont">
        ${al.map((a) => a.tipo === "carencia"
          ? `<a href="#/lotes" class="aviso rojo" style="text-decoration:none"><span class="pill rojo">CARENCIA</span><div><b>${h(a.lote)}:</b> no cosechar hasta el <b>${fechaCorta(a.fecha)}</b> (${a.dias} días)</div></a>`
          : `<a href="#/lotes" class="aviso ambar" style="text-decoration:none"><span class="pill ambar">RECORDATORIO</span><div><b>${h(a.lote)}:</b> ${h(a.actividad)} ${a.dias === 0 ? "hoy" : a.dias > 0 ? "en " + a.dias + " días" : "atrasada " + -a.dias + " días"}</div></a>`).join("")}
        ${cardInstalar()}
        <section class="card" style="gap:8px"><label class="campo" style="gap:6px"><b style="font-size:16px">¿Qué problema tienes en tu cultivo?</b>
          <input id="consulta" type="search" autocomplete="off" value="${h(ui.consulta || "")}" placeholder="Ej. pulgones, ácaros, lancha, monilia, fertilización en pitahaya…"></label>
          <div id="consultaRes" style="display:flex;flex-direction:column;gap:8px"></div></section>
        <div class="etq">Elige tu cultivo</div>
        <div class="grid2">${cultivos().map((c) => `<a class="cultivo ${c.id === ui.cultivo ? "sel" : ""}" href="#/cultivo/${h(c.id)}" data-c="${h(c.id)}"><span style="color:var(--verde);display:flex;height:44px;align-items:center">${ICONO_CULTIVO[c.id] || ic.hoja}</span><b>${h(c.nombre)}</b><span>Manual técnico · ${(I.problemas[c.id] || []).length} temas</span></a>`).join("")}</div>
        <div class="etq" style="margin-top:4px">Accesos rápidos</div>
        <div class="lista">
          <a class="item" href="#/lotes"><div class="tx"><b>Registro de mis lotes</b><span>Actividades y costos de producción</span></div>${ic.flecha}</a>
          <a class="item" href="#/calcular"><div class="tx"><b>Calcular dosis de productos</b><span>Por bomba, tanque, hectáreas o plantas</span></div>${ic.flecha}</a>
          <a class="item" href="#/mezcla"><div class="tx"><b>Revisar una mezcla</b><span>Compatibilidad, orden de mezcla y costos</span></div>${ic.flecha}</a>
        </div>
        <a class="btn wa" href="${h(waLink("Hola " + aj("nombre_asesor", "") + ", soy " + perfil.nombres + ". Necesito asesoría para mi cultivo."))}" target="_blank" rel="noopener">${ic.wa}Hablar con mi asesor</a>
      </main>`, "inicio");
    $$("[data-c]").forEach((a) => a.addEventListener("click", () => { ui.cultivo = a.dataset.c; guardarUI(); }));
    let tq; const inp = $("#consulta");
    inp.addEventListener("input", () => { clearTimeout(tq); tq = setTimeout(() => { ui.consulta = inp.value; guardarUI(); pintarConsulta(inp.value); }, 250); });
    pintarConsulta(inp.value);
  }
  // "¿Qué problema tienes?": lleva al manual del problema, al plan de fertilización o a los productos del portafolio;
  // si no está en los manuales, ofrece buscar en internet o preguntar al asesor
  function pintarConsulta(q) {
    const box = $("#consultaRes"); if (!box) return;
    q = String(q || "").trim(); if (q.length < 3) { box.innerHTML = ""; return; }
    const r = L.interpretarConsulta(q, I.c), nomC = (id) => (cultivo(id) || {}).nombre || id;
    const item = (href, titulo, sub) => `<a class="item" href="${h(href)}"><div class="tx"><b>${h(titulo)}</b>${sub ? `<span>${h(sub)}</span>` : ""}</div>${ic.flecha}</a>`;
    const recDe = (pr) => { const rec = (I.recs[pr.id] || []).find((x) => P(x.producto_id)); return rec ? "Recomendado: " + P(rec.producto_id).nombre : ""; };
    const conFert = cultivos().filter((c) => etapasDe(c.id).some((e) => (I.fert[e.id] || []).length)).map((c) => c.id);
    let html = "";
    if (r.intencion === "fertilizacion") {
      const cs = (r.cultivos.length ? r.cultivos : conFert).filter((id) => conFert.includes(id));
      html += cs.map((id) => item("#/fertilizacion/" + id, "Plan de fertilización · " + nomC(id), "Al suelo, foliar y enmiendas por etapa")).join("");
    }
    if (r.intencion === "plan") html += (r.cultivos.length ? r.cultivos : cultivos().map((c) => c.id)).map((id) => item("#/plan/" + id, "Plan sanitario · " + nomC(id), "Qué aplicar en cada etapa")).join("");
    html += r.problemas.slice(0, 5).map((pr) => item("#/problema/" + pr.id, pr.nombre, "Manual de " + nomC(pr.cultivo_id) + " · " + recDe(pr))).join("");
    if (!html && !r.relacionados.length && r.cultivos.length) html += r.cultivos.map((id) => item("#/cultivo/" + id, "Manual técnico de " + nomC(id), "Plagas, enfermedades, malezas y nutrición")).join("");
    const nomClase = r.clase ? (CLS_NOM[r.clase.clase] || r.clase.clase.toLowerCase()) : "";
    const cult0 = r.cultivos.length ? nomC(r.cultivos[0]) : "";
    const botones = () => `<div class="acciones">${navigator.onLine !== false ? `<a class="btn sec chico" href="${h("https://www.google.com/search?q=" + encodeURIComponent(q + " control" + (cult0 ? " en " + cult0 : "") + " Ecuador"))}" target="_blank" rel="noopener">Buscar en internet</a>` : ""}
      <a class="btn wa chico" href="${h(waLink("Hola " + aj("nombre_asesor", "") + ", tengo este problema" + (cult0 ? " en mi " + cult0 : "") + ": " + q + ". ¿Qué me recomienda?"))}" target="_blank" rel="noopener">${ic.wa}Preguntar a mi asesor</a></div>`;
    const prodsClase = (n) => L.rankearPorClase(r.clase, I.c.productos || []).filter((x) => !x.p.no_sugerir && !/tratamiento de semilla|\brosas?\b|\barroz\b/i.test((x.p.control || "") + " " + (x.p.nota || "")) && !/\bflora\b/i.test(x.p.nombre)).slice(0, n)
      .map((x, i) => item("#/calcular?p=" + x.p.id, `${i + 1}. ${x.p.nombre}`, [x.p.concentracion || x.p.ingrediente_activo, x.grupo.n].filter(Boolean).join(" · ") + " · Calcular dosis")).join("");
    // especie, plaga o enfermedad que no está en los manuales pero sí se puede ubicar en nuestra clasificación
    if (r.clase && !r.problemas.length && !r.intencion) {
      const ter = q.charAt(0).toUpperCase() + q.slice(1), esEnf = L.CLASES[r.clase.clase].tipo === "enfermedad";
      box.innerHTML = `<div class="aviso azul" style="padding:8px 10px">${ic.alerta}<div>No tenemos información específica de <b>«${h(ter)}»</b> en los manuales. Por su clasificación es ${r.clase.clase === "Bacteria" ? "una <b>bacteria</b>" : esEnf ? `un hongo <b>${h(r.clase.clase)}</b>` : `una plaga <b>${h(r.clase.clase.toLowerCase())}</b>`}: estos productos de nuestro portafolio sirven para esa clase, del más eficiente (1) al menos.</div></div>
        ${prodsClase(5) || `<span class="mini">Aún no hay productos cargados para esta clase.</span>`}
        ${r.relacionados.length ? `<div class="mini" style="margin-top:4px"><b>En nuestros manuales, del mismo tipo</b></div>` + r.relacionados.slice(0, 3).map((pr) => item("#/problema/" + pr.id, pr.nombre, "Manual de " + nomC(pr.cultivo_id) + " · " + recDe(pr))).join("") : ""}
        <span class="mini">Confirma la dosis para tu cultivo en la etiqueta o con tu asesor.</span>${botones()}`;
      return;
    }
    if (r.relacionados.length) html += `<div class="mini" style="margin-top:4px"><b>${r.problemas.length ? "También relacionado" : r.clase ? "Del mismo tipo (" + h(nomClase) + ") en nuestros manuales" : "Relacionado en nuestros manuales"}</b></div>` +
      r.relacionados.slice(0, 4).map((pr) => item("#/problema/" + pr.id, pr.nombre, "Manual de " + nomC(pr.cultivo_id) + " · " + recDe(pr))).join("");
    const directo = r.problemas.length || r.intencion;
    html += directo ? "" : `<div class="aviso ambar" style="padding:8px 10px">${ic.alerta}<div>${html ? "No encontramos exactamente «" + h(q) + "» en los manuales; revisa lo relacionado o consulta." : "Aún no tenemos «" + h(q) + "» documentado en los manuales."}</div></div>${botones()}`;
    box.innerHTML = html;
  }

  // ------------------------------------------------------------ CULTIVO: manual técnico
  function vCultivo(cid) {
    const c = cultivo(cid); if (!c) return vNoEncontrado();
    ui.cultivo = cid; guardarUI();
    const todos = I.problemas[cid] || [];
    const probs = todos.filter((p) => p.tipo === ui.tipo);
    const tienePlan = etapasDe(cid).some((e) => (I.plan[e.id] || []).length), tieneFert = etapasDe(cid).some((e) => (I.fert[e.id] || []).length);
    const boton = (href, icono, titulo, sub, activo) => `<a class="item" href="${activo ? href : "#/cultivo/" + h(cid)}" style="flex-direction:column;align-items:flex-start;min-height:110px;${activo ? "" : "opacity:.55"}"><span style="color:var(--verde)">${icono}</span><div class="tx"><b>${titulo}</b><span>${activo ? sub : "Próximamente"}</span></div></a>`;
    pintar(`${barra(c.nombre, "Manual técnico del cultivo", "#/")}
      <main class="cont">
        <div class="grid2">
          ${boton("#/plan/" + h(cid), ic.escudo, "Plan sanitario", "Qué aplicar en cada fase", tienePlan)}
          ${boton("#/fertilizacion/" + h(cid), ic.gota, "Plan de fertilización", "Suelo, foliar y enmiendas", tieneFert)}
        </div>
        <div class="etq" style="margin-top:4px">Problemas del cultivo y su manejo</div>
        <div class="seg" role="group" aria-label="Tema">${TIPOS.map(([k, t]) => `<button data-t="${k}" class="${ui.tipo === k ? "sel" : ""}">${t}</button>`).join("")}</div>
        <label class="campo"><span class="sr">Buscar</span><input id="buscar" type="search" placeholder="Buscar en el manual…"></label>
        <div class="lista" id="probs">${probs.length ? probs.map((p) => `<a class="item" href="#/problema/${p.id}" data-n="${h((p.nombre + " " + (p.descripcion || "")).toLowerCase())}">${fotosDe(p).length ? `<img class="miniatura" src="${h(fotosDe(p)[0].url)}" alt="" loading="lazy">` : ""}<div class="tx" style="flex:1"><b>${h(p.nombre)}</b><span>${h(p.descripcion || "")}</span><span style="color:var(--verde);font-weight:600">${(I.recs[p.id] || []).length ? (I.recs[p.id] || []).length + " productos recomendados" : ""}</span></div>${ic.flecha}</a>`).join("") : `<div class="vacio">Tu asesor aún no ha cargado información en esta sección.</div>`}</div>
      </main>`, "inicio");
    $$("[data-t]").forEach((b) => b.addEventListener("click", () => { const y = window.scrollY; ui.tipo = b.dataset.t; guardarUI(); vCultivo(cid); window.scrollTo(0, y); }));
    $("#buscar").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (q) { // buscar en todos los temas del cultivo
        $("#probs").innerHTML = todos.filter((p) => (p.nombre + " " + (p.descripcion || "")).toLowerCase().includes(q)).map((p) => `<a class="item" href="#/problema/${p.id}">${fotosDe(p).length ? `<img class="miniatura" src="${h(fotosDe(p)[0].url)}" alt="" loading="lazy">` : ""}<div class="tx" style="flex:1"><b>${h(p.nombre)}</b><span>${h((TIPOS.find((t) => t[0] === p.tipo) || [])[1] || "")} · ${h(p.descripcion || "")}</span></div>${ic.flecha}</a>`).join("") || `<div class="vacio">Sin resultados.</div>`;
      } else vCultivo(cid);
    });
  }

  // ------------------------------------------------------------ PROBLEMA -> recomendaciones
  // fotos referenciales del manual (las carga el asesor desde el panel)
  const fotosDe = (pr) => (Array.isArray(pr && pr.fotos) ? pr.fotos : []).filter((x) => x && (/^https:\/\/[^\s"'<>]+$/i.test(String(x.url)) || /^data:image\/(jpeg|png|webp);base64,/.test(String(x.url))));
  function galeria(pr) {
    const fs = fotosDe(pr); if (!fs.length) return "";
    return `<div class="galeria" role="list" aria-label="Fotografías de ${h(pr.nombre)}">${fs.map((x, i) => `<figure role="listitem"><button type="button" class="foto-btn" data-foto="${i}" aria-label="Ampliar foto ${i + 1}"><img src="${h(x.url)}" alt="${h(pr.nombre)}${x.credito ? " · " + h(x.credito) : ""}" loading="lazy"></button>${x.credito || fs.length > 1 ? `<figcaption>${fs.length > 1 ? `<b>${i + 1}/${fs.length}</b> ` : ""}${h(x.credito || "")}</figcaption>` : ""}</figure>`).join("")}</div>`;
  }
  function conectarGaleria(pr) {
    const fs = fotosDe(pr);
    $$("[data-foto]").forEach((b) => b.addEventListener("click", () => {
      let i = Number(b.dataset.foto);
      const v = document.createElement("div"); v.className = "visor"; v.setAttribute("role", "dialog"); v.setAttribute("aria-modal", "true"); v.setAttribute("aria-label", "Foto ampliada");
      const pintarV = () => { v.innerHTML = `<button type="button" class="visor-cerrar" aria-label="Cerrar">✕</button><img src="${h(fs[i].url)}" alt="${h(pr.nombre)}"><div class="visor-pie">${fs.length > 1 ? `<button type="button" data-v="-1" aria-label="Foto anterior">‹</button>` : ""}<span>${h(pr.nombre)}${fs[i].credito ? " · " + h(fs[i].credito) : ""}${fs.length > 1 ? ` (${i + 1}/${fs.length})` : ""}</span>${fs.length > 1 ? `<button type="button" data-v="1" aria-label="Foto siguiente">›</button>` : ""}</div>`; };
      const cerrar = () => { v.remove(); document.removeEventListener("keydown", tecla); };
      const mover = (d) => { i = (i + d + fs.length) % fs.length; pintarV(); };
      const tecla = (e) => { if (e.key === "Escape") cerrar(); else if (e.key === "ArrowRight") mover(1); else if (e.key === "ArrowLeft") mover(-1); };
      v.addEventListener("click", (e) => { const t = e.target.closest("button"); if (t && t.dataset.v) mover(Number(t.dataset.v)); else if (t || e.target === v) cerrar(); });
      document.addEventListener("keydown", tecla); pintarV(); document.body.appendChild(v); v.querySelector(".visor-cerrar").focus();
    }));
  }
  // guarda las fotos en el teléfono para verlas sin internet
  function precargarFotos() {
    if (!("caches" in window) || !navigator.onLine) return;
    const urls = [...new Set((I.c.problemas || []).flatMap((p) => fotosDe(p).map((x) => x.url)).filter((u) => /^https:/.test(u)))];
    caches.open("campoguia-fotos").then((c) => urls.forEach((u) => c.match(u).then((m) => m || fetch(u, { mode: "no-cors" }).then((r) => c.put(u, r)).catch(() => {})))).catch(() => {});
  }

  const notaPublica = (p) => String(p.nota || "").replace(/\s*Completar:.*$/, "").trim();
  const esReferencial = (p) => /Internet/.test(p.fuente || "");
  function tarjetaProducto(p, rec, etiqueta) {
    const dv = dosisVol(p, rec), d = L.dosisDe(p, rec);
    return `<article class="card">
      <div class="fila" style="align-items:flex-start"><div style="display:flex;flex-direction:column;gap:3px;min-width:0">
        <span style="font-size:12px;font-weight:600;color:var(--verde)">${h(etiqueta)}</span>
        <b style="font-size:18px">${h(p.nombre)}</b>
        ${p.concentracion || p.ingrediente_activo ? `<span class="mini"><b>I.A.:</b> ${h(p.concentracion || p.ingrediente_activo)}</span>` : ""}
        ${p.grupo ? `<span class="mini">${/^(IRAC|FRAC|HRAC)/.test(p.grupo) ? "Grupo " : ""}${h(p.grupo)}</span>` : ""}</div>
        ${p.categoria_tox ? `<span class="pill claro-ambar">Cat. ${h(p.categoria_tox)}</span>` : ""}</div>
      <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span class="grande">${h(dv.grande)}</span><span class="mini" style="font-size:14px">${h(dv.sub)}</span></div>
      ${p.control ? `<div class="mini">${h(p.control)}</div>` : ""}
      ${rec && rec.nota ? `<div class="mini"><b>Nota:</b> ${h(rec.nota)}</div>` : ""}
      ${notaPublica(p) ? `<div class="aviso ${/^⚠/.test(notaPublica(p)) ? "rojo" : "verde"}" style="padding:8px 10px">${h(notaPublica(p))}</div>` : ""}
      <div class="grid3">
        <div class="dato"><span>Carencia</span><b>${p.carencia_dias !== null && p.carencia_dias !== undefined ? h(p.carencia_dias) + " días" : "Ver etiqueta"}</b></div>
        <div class="dato"><span>Reingreso</span><b>${p.reingreso_horas !== null && p.reingreso_horas !== undefined ? h(p.reingreso_horas) + " h" : "Ver etiqueta"}</b></div>
        <div class="dato"><span>Precio${p.presentacion ? " (" + h(p.contenido ? L.nombrePresentacion({ cantidad: p.contenido, unidad: p.contenido_unidad }) : p.presentacion) + ")" : ""}</span><b>${p.pvp !== null && p.pvp !== undefined ? dinero(p.pvp) : "—"}</b></div>
      </div>
      ${(p.presentaciones || []).length ? `<div class="mini"><b>Presentaciones:</b> ${p.presentaciones.map((x) => `${h(L.nombrePresentacion(x))} ${dinero(x.precio)}`).join(" · ")}</div>` : ""}
      ${esReferencial(p) && (p.carencia_dias !== null || p.reingreso_horas !== null) ? `<span class="mini">Carencia y reingreso referenciales de fichas técnicas: confírmalos en la etiqueta.</span>` : ""}
      <div class="acciones">
        <a class="btn chico" href="#/calcular?p=${p.id}${rec && rec.dosis_min !== null && rec.dosis_min !== undefined ? "&d=" + rec.dosis_min : ""}">Calcular para mi finca</a>
        ${d.modo === "tanque" ? `<button class="btn sec chico" data-mez="${p.id}" data-d="${d.min !== null ? d.min : ""}">Agregar a mezcla</button>` : `<a class="btn sec chico" href="#/registrar?p=${p.id}">Registrar</a>`}
      </div></article>`;
  }
  // ficha técnica: aparato bucal (plagas) o clase del hongo (enfermedades); los grupos químicos funcionales y las otras opciones solo los ve el técnico agrícola
  function fichaClase(pr) {
    if (!pr.clasificacion || !["plaga", "enfermedad"].includes(pr.tipo)) return "";
    const clases = L.clasesDe(pr.clasificacion), gf = L.gruposDelProblema(pr), plaga = pr.tipo === "plaga";
    const que = pr.como_actua || clases.map((k) => L.CLASES[k].resumen).join(" ");
    const tec = esTecnico(); // grupos químicos funcionales: solo para técnicos agrícolas
    return `<article class="card ficha-clase">
      <div class="info-clase">
        <div><span class="mini">${plaga ? "Aparato bucal" : "Clase"}</span><b>${(clases.length ? clases : [pr.clasificacion]).map(h).join(" + ")}</b></div>
        ${tec && pr.ciclo ? `<div><span class="mini">Ciclo de vida</span><b>${h(pr.ciclo)}</b></div>` : ""}
      </div>
      ${tec && pr.ciclo && pr.ciclo_detalle ? `<p class="mini" style="margin:-4px 0 0">${h(pr.ciclo_detalle)}</p>` : ""}
      <div><b style="font-size:15px">${plaga ? "Cómo se alimenta" : "Qué es"}</b><p class="mini" style="margin:4px 0 0;font-size:14px">${h(que)}</p></div>
      ${tec ? clases.map((k) => `<p class="mini" style="margin:0;font-size:14px">${clases.length > 1 ? `<b>${h(k)}:</b> ` : ""}${h(L.CLASES[k].control)}</p>`).join("") : ""}
      ${tec && gf.length ? `<div><b style="font-size:15px">${plaga ? "Grupos químicos que funcionan mejor" : "Grupos químicos funcionales"}</b>
        <div class="grupos-f">${gf.map((g) => `<span>${g.c ? `<b>${h(g.c)}</b> ` : ""}${h(g.n)}</span>`).join("")}</div></div>` : ""}
      ${tec && gf.length ? notaRotacion(pr) : ""}
    </article>`;
  }
  // nota para técnicos: rotar el grupo químico (IA) por cada ciclo de vida de la plaga o del patógeno
  function diasCiclo(txt) {
    const t = String(txt || "").toLowerCase(), nums = (t.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => Number(x.replace(",", ".")));
    if (!nums.length) return null;
    const mult = /mes/.test(t) ? 30 : /semana/.test(t) ? 7 : 1;
    return { min: Math.min(...nums) * mult, max: Math.max(...nums) * mult };
  }
  function notaRotacion(pr) {
    const quien = pr.tipo === "plaga" ? "de la plaga" : "del patógeno", cod = pr.tipo === "plaga" ? "IRAC" : "FRAC", d = diasCiclo(pr.ciclo);
    const practica = d && d.max <= 7 ? ` Su ciclo es corto (${h(pr.ciclo)}): cambia de grupo en cada aplicación.`
      : d ? ` Su ciclo es de ${h(pr.ciclo)}: usa el mismo grupo como máximo ese tiempo y luego cambia.` : "";
    return `<div class="aviso azul" style="padding:10px 12px">${ic.alerta}<div><b>Evita resistencias.</b> Rota el grupo químico ${cod} al menos en cada ciclo de vida ${quien}.${practica} Respeta el máximo de aplicaciones de la etiqueta.</div></div>`;
  }

  // otras opciones del portafolio que pertenecen a un grupo funcional para esa plaga o enfermedad
  const CAT_OTRAS = { "Picador-chupador (quelíceros)": /acaric/i, "Raspador (rádula)": /cebo|molusc/i, "Picador-chupador (estilete)": /nematic|insectic/i };
  const esTecnico = () => !!(D.sesion && D.sesion.perfil && D.sesion.perfil.rol === "tecnico");
  function otrasOpciones(pr, recs) {
    if (!esTecnico()) return "";
    if (!pr.clasificacion || !["plaga", "enfermedad"].includes(pr.tipo)) return "";
    const gf = L.gruposDelProblema(pr); if (!gf.length) return "";
    const clases = L.clasesDe(pr.clasificacion);
    const cat = pr.tipo === "plaga" ? (clases.map((k) => CAT_OTRAS[k]).find(Boolean) || /insectic|acaric|cebo|nematic/i) : /fungic|desinfecc|bactericida/i;
    const usados = new Set(recs.map((r) => String(r.producto_id)));
    const lista = (I.c.productos || []).filter((p) => p.activo !== false && !p.no_sugerir && cat.test(p.categoria || "") && !usados.has(String(p.id)))
      .map((p) => ({ p, g: L.coincideGrupos(p, gf) })).filter((x) => x.g.length).sort((a, b) => a.p.nombre.localeCompare(b.p.nombre));
    if (!lista.length) return "";
    return `<details class="otras"${lista.length <= 6 ? " open" : ""}><summary class="etq">Otras opciones de productos (${lista.length})</summary>
      <div class="lista">${lista.map(({ p, g }) => { const d = L.dosisDe(p); const conDosis = d.min !== null || d.max !== null; const tag = conDosis ? "a" : "div"; return `<${tag} class="item"${conDosis ? ` href="#/calcular?p=${p.id}"` : ' style="cursor:default"'}><div class="tx" style="flex:1"><b>${h(p.nombre)}</b><span><b>I.A.:</b> ${h(p.concentracion || p.ingrediente_activo || "")}</span><span>${g.map((x) => h((x.c ? x.c + " · " : "") + x.n)).join(" · ")}</span>${conDosis ? "" : `<span>Dosis no cargada: consulta a tu asesor</span>`}</div>${conDosis ? ic.flecha : ""}</${tag}>`; }).join("")}</div>
      <p class="mini" style="margin:0">Opciones por su grupo químico. Antes de usarlas, revisa en la etiqueta que el producto esté registrado para tu cultivo.</p></details>`;
  }
  // recomendación y alternativas en carrusel: se desliza de lado (recomendada → 1 → 2 → 3 → 4)
  function carruselRecs(recs) {
    const tarjeta = (r, i) => tarjetaProducto(P(r.producto_id), r, (i === 0 ? "Opción recomendada" : "Alternativa " + i) + (r.etapa_id && etapa(r.etapa_id) ? " · solo en " + etapa(r.etapa_id).nombre : ""));
    if (recs.length === 1) return `<div class="etq">Producto recomendado</div>` + tarjeta(recs[0], 0);
    return `<div class="etq fila" style="justify-content:space-between"><span>Productos recomendados</span><span class="desliza">Desliza →</span></div>
      <div class="carrusel" id="carr" role="region" aria-label="Producto recomendado y alternativas">${recs.map((r, i) => `<div class="slide" aria-label="${i === 0 ? "Opción recomendada" : "Alternativa " + i}">${tarjeta(r, i)}</div>`).join("")}</div>
      <div class="puntos" id="puntos">${recs.map((r, i) => `<button type="button" data-ir="${i}" class="${i === 0 ? "sel" : ""}" aria-label="${i === 0 ? "Ver opción recomendada" : "Ver alternativa " + i}">${i === 0 ? "Rec." : i}</button>`).join("")}</div>`;
  }
  function conectarCarrusel() {
    const c = $("#carr"); if (!c) return;
    const slides = [...c.children], botones = $$("#puntos button");
    const marcar = () => { const centro = c.scrollLeft + c.clientWidth / 2; let k = 0, mejor = Infinity;
      slides.forEach((s, i) => { const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - centro); if (d < mejor) { mejor = d; k = i; } });
      botones.forEach((b, i) => b.classList.toggle("sel", i === k)); };
    let t; c.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(marcar, 60); }, { passive: true });
    botones.forEach((b) => b.addEventListener("click", () => { const s = slides[Number(b.dataset.ir)]; c.scrollTo({ left: s.offsetLeft - (c.clientWidth - s.offsetWidth) / 2, behavior: "smooth" }); }));
  }
  function vProblema(pid) {
    const pr = (I.c.problemas || []).find((x) => String(x.id) === String(pid)); if (!pr) return vNoEncontrado();
    const c = cultivo(pr.cultivo_id), tipo = (TIPOS.find((t) => t[0] === pr.tipo) || [])[1] || "";
    const recs = (I.recs[pr.id] || []).filter((r) => P(r.producto_id));
    const grupos = new Set(recs.map((r) => P(r.producto_id).grupo).filter(Boolean));
    pintar(`${barra(pr.nombre, (c ? c.nombre : "") + " · " + tipo, "#/cultivo/" + pr.cultivo_id)}
      <main class="cont">
        ${galeria(pr)}
        ${pr.descripcion ? `<p class="mini" style="margin:0;font-size:14px">${h(pr.descripcion)}</p>` : ""}
        ${fichaClase(pr)}
        ${segVol()}
        ${recs.length ? carruselRecs(recs) : `<div class="vacio">Tu asesor aún no ha cargado recomendaciones para este tema.</div>`}
        ${otrasOpciones(pr, recs)}
        ${grupos.size > 1 ? `<div class="aviso azul">${ic.alerta}<div>Rota productos de <b>distinto grupo</b> (${[...grupos].map(h).join(", ")}) entre aplicaciones para evitar resistencia.</div></div>` : ""}
        ${avisoSeguridad()}
        <a class="btn wa" target="_blank" rel="noopener" href="${h(waLink(`Hola, tengo una consulta sobre ${pr.nombre} en mi cultivo de ${c ? c.nombre : ""}. ¿Qué me recomienda?`))}">${ic.wa}Consultar por WhatsApp</a>
      </main>`, "inicio");
    conectarVol(() => vProblema(pid));
    conectarGaleria(pr);
    conectarCarrusel();
    $$("[data-mez]").forEach((b) => b.addEventListener("click", () => agregarAMezcla(b.dataset.mez, b.dataset.d === "" ? null : Number(b.dataset.d))));
  }

  // ------------------------------------------------------------ PLAN SANITARIO (todas las fases, tipo manual)
  function vPlan(cid) {
    const c = cultivo(cid); if (!c) return vNoEncontrado();
    const f = volL() / TANQUE();
    const fases = etapasDe(cid).map((et) => {
      const items = (I.plan[et.id] || []).filter((x) => P(x.producto_id));
      const fijos = items.filter((x) => !x.alternar), alt = items.filter((x) => x.alternar);
      return { et, items, fijos, alt, elegidos: fijos.concat(alt.slice(0, 1)) };
    }).filter((x) => x.items.length);
    ui.planFase = ui.planFase || {};
    const sel = Math.min(Number(ui.planFase[cid]) || 0, Math.max(fases.length - 1, 0));
    const costoItem = (x) => { const p = P(x.producto_id); return p.pvp !== null && p.pvp !== undefined && p.contenido ? (Number(x.dosis_tanque) / Number(p.contenido)) * Number(p.pvp) : 0; };
    const fila = (x) => { const p = P(x.producto_id); return `<div class="fila" style="padding:8px 0;border-top:1px solid var(--borde)"><div style="display:flex;flex-direction:column;gap:2px;min-width:0"><b style="font-size:15px">${h(p.nombre)} ${x.alternar ? '<span class="pill claro-ambar" style="margin-left:4px">Alternar</span>' : ""}</b><span class="mini">${h(p.categoria)}${p.ingrediente_activo ? " · " + h(p.ingrediente_activo) : ""}</span></div><b style="font-size:16px;white-space:nowrap">${h(L.cantidad(Number(x.dosis_tanque) * f, x.unidad))}</b></div>`; };
    pintar(`${barra("Plan sanitario", c.nombre, "#/cultivo/" + cid)}
      <main class="cont">
        ${fases.length ? `<div class="chips" role="group" aria-label="Etapa fenológica">${fases.map((x, i) => `<button class="chip ${i === sel ? "sel" : ""}" data-ir="${i}" aria-pressed="${i === sel}">${h(x.et.nombre)}</button>`).join("")}</div>
        ${segVol()}
        <p class="mini" style="margin:0">Elige la etapa fenológica para ver su recomendación. Dosis por ${h(volTxt())}. Los productos marcados <b>Alternar</b> se usan uno por aplicación, cambiando cada semana.</p>
        ${fases.map((x, i) => { if (i !== sel) return ""; const rz = x.et.riesgo_hongos ? RIESGO[x.et.riesgo_hongos] : null; return `<section class="card" id="fase-${i}" style="scroll-margin-top:80px">
          <div class="fila" style="align-items:flex-start"><div style="display:flex;flex-direction:column;gap:2px"><span class="etq" style="color:var(--verde)">Fase ${i + 1}</span><h2 style="font-size:20px">${h(x.et.nombre)}</h2>${x.et.semanas ? `<span class="mini">${h(x.et.semanas)}</span>` : ""}</div>${rz ? `<span class="pill ${rz[0]}" style="white-space:normal;text-align:right;max-width:130px">${rz[1]}</span>` : ""}</div>
          <div>${x.fijos.map(fila).join("")}${x.alt.map(fila).join("")}</div>
          ${x.et.notas ? `<div class="aviso verde">${ic.alerta}<div>${h(x.et.notas)}</div></div>` : ""}
          <div class="fila"><span class="mini">Costo aprox. por tanque de ${TANQUE()} L</span><b>${dinero(x.elegidos.reduce((s, y) => s + costoItem(y), 0))}</b></div>
          <div class="acciones"><button class="btn chico" data-mz="${i}">Llevar a mi mezcla</button><button class="btn sec chico" data-rg="${i}">Registrar aplicación</button></div>
        </section>`; }).join("")}
        ${avisoSeguridad()}` : `<div class="vacio">Tu asesor aún no ha cargado el plan sanitario de este cultivo.</div>`}
      </main>`, "inicio");
    conectarVol(() => vPlan(cid));
    $$("[data-ir]").forEach((b) => b.addEventListener("click", () => { ui.planFase[cid] = Number(b.dataset.ir); S.set("ui", ui); vPlan(cid); }));
    $$("[data-mz]").forEach((b) => b.addEventListener("click", () => { const x = fases[Number(b.dataset.mz)]; S.set("mezcla", x.elegidos.map((y) => ({ producto_id: Number(y.producto_id), dosis_tanque: Number(y.dosis_tanque) }))); location.hash = "#/mezcla"; }));
    $$("[data-rg]").forEach((b) => b.addEventListener("click", () => {
      const x = fases[Number(b.dataset.rg)];
      prefill = { actividad: "Fumigación planta", lineas: x.elegidos.map((y) => ({ producto_id: y.producto_id, dosis: Number(y.dosis_tanque), unidad: (y.unidad || "cc") + "/tanque" })) };
      location.hash = "#/registrar";
    }));
  }

  // ------------------------------------------------------------ PORTAFOLIO (técnicos): todo el catálogo por categorías, con buscador
  // presentación a la que corresponde el precio mostrado (p. ej. "1 L", "Saco 50 kg")
  const presDe = (p) => (p.contenido ? L.nombrePresentacion({ cantidad: p.contenido, unidad: p.contenido_unidad }) : p.presentacion || "");
  const CLS_NOM = { Oomiceto: "Oomicetos", Ascomiceto: "Ascomicetos", Basidiomiceto: "Basidiomicetos", Deuteromiceto: "Deuteromicetos", Bacteria: "Bacterias" };
  // palabras con las que también se encuentra cada clase en el buscador
  const CLS_TXT = { Oomiceto: "oomicetos oomiceto oomycetes pseudohongos", Ascomiceto: "ascomicetos ascomiceto ascomycetes", Basidiomiceto: "basidiomicetos basidiomiceto basidiomycetes basidio",
    Deuteromiceto: "deuteromicetos deuteromiceto deuteromycetes deutero hongos imperfectos", Bacteria: "bacterias bacteria bactericida" };
  function vPortafolio() {
    const prods = (I.c.productos || []).filter((p) => p.activo !== false);
    const grupos = {};
    prods.forEach((p) => { const k = p.categoria || "Otros"; (grupos[k] = grupos[k] || []).push(p); });
    const cats = Object.keys(grupos).sort((a, b) => (a === "Otros") - (b === "Otros") || a.localeCompare(b));
    // clases de hongo / bacteria que controla cada fungicida (según sus grupos FRAC), para buscar y filtrar
    const clsDe = new Map(prods.map((p) => [p.id, L.clasesFuncionales(p)]));
    const multi = (p) => /fungic|bacteric|desinfec/i.test(p.categoria || "") && (L.esMultisitio(p) || /preventiv/i.test(p.categoria || ""));
    const fila = (p) => `<details class="card port-item" data-cat="${h(p.categoria || "Otros")}" data-cls="${h(clsDe.get(p.id).join("|"))}" data-txt="${h(sinTilde([p.nombre, p.ingrediente_activo, p.concentracion, p.categoria, multi(p) ? String(p.control || "").replace(/\b(oomicet|ascomicet|basidiomicet|deuteromicet)\w*/gi, "") : p.control, p.grupo, L.textoBusquedaGrupo(p.grupo), clsDe.get(p.id).map((k) => CLS_TXT[k]).join(" "), multi(p) ? "multisitio multisitios amplio espectro preventivo preventivos protectante protectantes de contacto" : ""].filter(Boolean).join(" ")))}" style="padding:0">
        <summary style="padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center;cursor:pointer;list-style:none">
          <span style="display:flex;flex-direction:column;gap:2px;min-width:0"><b>${h(p.nombre)}</b>${p.concentracion || p.ingrediente_activo ? `<span class="mini">${h(p.concentracion || p.ingrediente_activo)}</span>` : ""}${L.nombresGrupo(p.grupo).length ? `<span class="mini" style="color:var(--verde)">${h(L.nombresGrupo(p.grupo).map((n) => n.replace(/\s*\(.*\)$/, "")).join(" + "))} · ${h(p.grupo)}</span>` : ""}${multi(p) || clsDe.get(p.id).length ? `<span class="mini"><b>Controla:</b> ${h([multi(p) ? "Amplio espectro, multisitio (todos los grupos de hongos)" : ""].concat(clsDe.get(p.id).map((k) => CLS_NOM[k])).filter(Boolean).join(" · "))}</span>` : ""}</span>
          ${p.pvp !== null && p.pvp !== undefined ? `<span style="display:flex;flex-direction:column;align-items:flex-end;gap:1px;flex-shrink:0"><b style="white-space:nowrap;font-size:14px">${dinero(p.pvp)}</b>${presDe(p) ? `<span class="mini" style="white-space:nowrap">${h(presDe(p))}</span>` : ""}${(p.presentaciones || []).length > 1 ? `<span class="mini" style="white-space:nowrap">+${p.presentaciones.length - 1} ${p.presentaciones.length > 2 ? "presentaciones" : "presentación"}</span>` : ""}</span>` : ""}</summary>
        <div class="port-ficha" data-id="${p.id}" style="padding:0 6px 6px"></div></details>`;
    pintar(`${barra("Portafolio", prods.length + " productos", "#/")}
      <main class="cont">
        <label class="campo">Buscar producto<input id="pbuscar" type="search" placeholder="Producto, I.A., grupo químico, plaga, grupo hongo…" autocomplete="off"></label>
        <div id="pfiltros"><div class="chips" id="pchips" role="group" aria-label="Categoría"><button class="chip sel" data-pc="">Todos (${prods.length})</button>${cats.map((k) => `<button class="chip" data-pc="${h(k)}">${h(k)} (${grupos[k].length})</button>`).join("")}</div></div>
        ${cats.map((k) => `<section class="port-grupo" data-cat="${h(k)}" style="display:flex;flex-direction:column;gap:8px"><h3 style="margin:8px 0 0;font-size:15px;color:var(--verde)">${h(k)}</h3>${grupos[k].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(fila).join("")}</section>`).join("")}
        <section id="prank" hidden style="display:flex;flex-direction:column;gap:8px"><div class="aviso azul" id="prankinfo" style="padding:8px 10px"></div><div id="pranklista" style="display:flex;flex-direction:column;gap:8px"></div></section>
        <div class="vacio" id="pvacio" hidden>No se encontró ningún producto con esa búsqueda.</div>
      </main>`, "portafolio");
    let cat = "";
    // posición original de cada producto, para devolverlo a su categoría al salir del orden por eficiencia
    const origen = $$(".port-grupo").map((g) => [g, $$(".port-item", g)]);
    const porId = new Map($$(".port-item").map((it) => [$(".port-ficha", it).dataset.id, it]));
    const restaurar = () => { origen.forEach(([g, items]) => items.forEach((it) => { g.appendChild(it); const b = $(".port-rank", it); if (b) b.remove(); })); $("#prank").hidden = true; };
    // búsqueda por plaga, enfermedad o clase de hongo: lista única, del producto más eficiente al menos eficiente
    const rankear = (q) => {
      const info = L.claseDeBusqueda(q); if (!info) return false;
      const t = sinTilde(q).split(/\s+/).filter(Boolean);
      const orden = L.rankearPorClase(info, prods), ids = new Set(orden.map((x) => String(x.p.id)));
      const extra = prods.filter((p) => !ids.has(String(p.id)) && t.every((w) => porId.get(String(p.id)).dataset.txt.includes(w))).sort((a, b) => a.nombre.localeCompare(b.nombre));
      restaurar(); $$(".port-grupo").forEach((g) => { g.hidden = true; });
      const lista = $("#pranklista");
      orden.forEach((x, i) => { const it = porId.get(String(x.p.id)); it.hidden = false; lista.appendChild(it);
        $("summary", it).insertAdjacentHTML("afterbegin", `<span class="port-rank" title="Orden de eficiencia">${i + 1}</span>`); });
      extra.forEach((p) => { const it = porId.get(String(p.id)); it.hidden = false; lista.appendChild(it); });
      const c = L.CLASES[info.clase], nom = CLS_NOM[info.clase] || info.clase;
      $("#prankinfo").innerHTML = `${ic.alerta}<div><b>${h(nom)}</b>: ${orden.length} productos ordenados del <b>más eficiente</b> (1) al menos eficiente, según el grupo químico.${extra.length ? ` Al final, ${extra.length} que mencionan tu búsqueda sin un grupo específico para esta clase.` : ""}<br><span class="mini">${h(c.control)}</span></div>`;
      $("#prank").hidden = false; $("#pvacio").hidden = orden.length + extra.length > 0; $("#pfiltros").hidden = true;
      return true;
    };
    const filtrar = () => {
      if (rankear($("#pbuscar").value.trim())) return;
      if (!$("#prank").hidden) restaurar();
      const t = sinTilde($("#pbuscar").value.trim()).split(/\s+/).filter(Boolean); let vis = 0;
      $$(".port-grupo").forEach((g) => {
        let n = 0;
        $$(".port-item", g).forEach((it) => { const ok = (!cat || it.dataset.cat === cat) && t.every((w) => it.dataset.txt.includes(w)); it.hidden = !ok; if (ok) n++; });
        g.hidden = !n; vis += n;
      });
      $("#pvacio").hidden = vis > 0;
      $("#pfiltros").hidden = t.length > 0; // mientras se busca, los resultados aparecen justo debajo del buscador
    };
    const marcarCat = (k) => { cat = k; $$("[data-pc]").forEach((x) => x.classList.toggle("sel", x.dataset.pc === k)); };
    // al escribir, se busca en todo el portafolio sin importar la categoría marcada; al tocar una categoría se limpia la búsqueda
    $("#pbuscar").addEventListener("input", (e) => { if (e.target.value.trim() && cat) marcarCat(""); filtrar(); });
    $$("[data-pc]").forEach((b) => b.addEventListener("click", () => { $("#pbuscar").value = ""; marcarCat(b.dataset.pc); filtrar(); }));
    // la ficha completa se arma al abrir el producto
    $$(".port-item").forEach((d) => d.addEventListener("toggle", () => {
      const f = $(".port-ficha", d); if (!d.open || f.innerHTML) return;
      const p = P(f.dataset.id); f.innerHTML = p ? tarjetaProducto(p, null, p.categoria || "") : "";
      $$("[data-mez]", f).forEach((b) => b.addEventListener("click", () => agregarAMezcla(b.dataset.mez, b.dataset.d === "" ? null : Number(b.dataset.d))));
    }));
  }

  // ------------------------------------------------------------ FERTILIZACIÓN
  function vFert(cid) {
    const c = cultivo(cid || ui.cultivo); if (!c) return vNoEncontrado();
    const etapas = etapasDe(c.id).filter((e) => (I.fert[e.id] || []).length), perfil = D.sesion.perfil;
    const et = etapas.find((e) => String(e.id) === String(ui.etapa[c.id])) || etapas[0] || null;
    ui.calc.ha = ui.calc.ha !== undefined ? ui.calc.ha : perfil.hectareas || "";
    ui.calc.pha = ui.calc.pha !== undefined ? ui.calc.pha : "";
    const items = et ? (I.fert[et.id] || []).filter((x) => P(x.producto_id)) : [];
    const ph = parseFloat(String(ui.ph).replace(",", ".")), phAcido = Number(aj("ph_acido", 5.5));
    const tipoSel = ui.fertTipo;
    const visibles = items.filter((x) => x.tipo === tipoSel);
    let totalCosto = 0;
    const filas = visibles.map((x) => {
      const p = P(x.producto_id);
      if (x.tipo === "foliar") {
        const dosis = x.dosis_tanque !== null && x.dosis_tanque !== undefined ? Number(x.dosis_tanque) : L.dosisDe(p).min;
        return `<div class="card"><div class="fila"><div class="tx" style="display:flex;flex-direction:column;gap:2px"><b>${h(p.nombre)}</b><span class="mini">${h(p.concentracion || p.ingrediente_activo || "")}</span></div><b style="font-size:17px;white-space:nowrap">${h(L.cantidad(dosis * volL() / TANQUE(), p.unidad))}</b></div><span class="mini">por ${h(volTxt())}${x.frecuencia_dias ? " · cada " + h(x.frecuencia_dias) + " días" : ""}${x.nota ? " · " + h(x.nota) : ""}</span></div>`;
      }
      const r = L.calcularFertSuelo(x, p, String(ui.calc.ha).replace(",", "."), String(ui.calc.pha).replace(",", "."));
      if (r.costo) totalCosto += r.costo;
      const omitir = x.tipo === "enmienda" && !isNaN(ph) && ph >= phAcido;
      return `<div class="card" style="${omitir ? "opacity:.6" : ""}">
        <div class="fila" style="align-items:flex-start"><div style="display:flex;flex-direction:column;gap:2px"><b>${h(p.nombre)}</b><span class="mini">${h(p.concentracion || p.ingrediente_activo || "")}</span></div>
        <span class="pill ${x.tipo === "enmienda" ? "gris" : "verde"}">${x.tipo === "enmienda" ? "Enmienda" : "Al suelo"}</span></div>
        <div class="grid3"><div class="dato"><span>Por planta / aplicación</span><b>${r.gPorPlanta !== null ? L.fmt(r.gPorPlanta, 0) + " g" : "—"}</b></div>
        <div class="dato"><span>Finca / aplicación</span><b>${r.kgTotal !== null ? L.fmt(r.kgTotal, 0) + " kg" : "—"}</b></div>
        <div class="dato"><span>Sacos ${r.sacoKg ? L.fmt(r.sacoKg) + " kg" : ""}</span><b>${r.sacos50 !== null ? r.sacos50 : "—"}</b></div></div>
        <span class="mini">${x.dosis_kg_ha ? L.fmt(Number(x.dosis_kg_ha)) + " kg NPK/ha por aplicación" : ""}${x.condicion ? " · " + h(x.condicion) : ""}${x.frecuencia_dias ? " · cada " + h(x.frecuencia_dias) + " días" : ""}${x.nota ? " · " + h(x.nota) : ""}${r.compraTexto ? " · Comprar " + h(r.compraTexto) : ""}${r.costo ? " · " + dinero(r.costo) : ""}</span>
        ${omitir ? `<span class="mini"><b>Tu pH (${h(ui.ph)}) no es ácido:</b> no necesitas esta enmienda.</span>` : ""}
      </div>`;
    }).join("");
    pintar(`${barra("Plan de fertilización", c.nombre + (et ? " · " + et.nombre : ""), "#/cultivo/" + c.id)}
      <main class="cont">
        <div class="chips" role="group" aria-label="Etapa">${etapas.map((e) => `<button class="chip ${et && e.id === et.id ? "sel" : ""}" data-e="${e.id}">${h(e.nombre)}</button>`).join("")}</div>
        <div class="seg" role="group" aria-label="Tipo de fertilización">${[["suelo", "Al suelo"], ["foliar", "Foliar"], ["enmienda", "Enmiendas"]].map(([k, t]) => `<button data-ft="${k}" class="${tipoSel === k ? "sel" : ""}">${t} (${items.filter((x) => x.tipo === k).length})</button>`).join("")}</div>
        <details class="card" ${ui.ph ? "open" : ""}><summary>¿Tienes análisis de suelo?</summary>
          <label class="campo">pH del suelo<input id="ph" inputmode="decimal" value="${h(ui.ph)}" placeholder="Ej. 5,2"></label>
          ${!isNaN(ph) ? `<div class="aviso ${ph < phAcido ? "ambar" : "verde"}">${ic.alerta}<div>${ph < phAcido ? `Suelo <b>ácido</b> (pH ${h(ui.ph)}): aplica primero la enmienda (${h(items.filter((x) => x.tipo === "enmienda").map((x) => P(x.producto_id).nombre).join(", ") || "cal o dolomita")}) unos 30 días antes de fertilizar.` : `pH ${h(ui.ph)}: no necesitas encalar.`}</div></div>` : ""}
          <span class="mini">Para ajustar las dosis con el análisis completo (materia orgánica, N, P, K, Ca, Mg) envíaselo a tu asesor.</span>
          <a class="btn wa chico" target="_blank" rel="noopener" href="${h(waLink("Hola, le envío el análisis de suelo de mi finca de " + c.nombre + " para ajustar la fertilización."))}">${ic.wa}Enviar análisis al asesor</a>
        </details>
        ${tipoSel !== "foliar" ? `<div class="grid2"><label class="campo">Hectáreas<input id="ha" inputmode="decimal" value="${h(ui.calc.ha)}"></label><label class="campo">Plantas por ha<input id="pha" inputmode="numeric" value="${h(ui.calc.pha)}" placeholder="Ej. 1600"></label></div>` : segVol()}
        ${filas || `<div class="vacio">No hay productos de este tipo para la etapa ${et ? h(et.nombre) : ""}.</div>`}
        ${totalCosto > 0 ? `<div class="resultado"><div class="etq">Inversión estimada en sacos</div><div class="n">${dinero(totalCosto)}</div></div>` : ""}
        <div class="acciones"><button class="btn" id="reg">Registrar fertilización</button>
        <a class="btn wa" target="_blank" rel="noopener" href="${h(waLink("Hola, quiero cotizar para " + ui.calc.ha + " ha de " + c.nombre + ": " + visibles.map((x) => { const p = P(x.producto_id); const r = L.calcularFertSuelo(x, p, ui.calc.ha, ui.calc.pha); return p.nombre + (r.sacos50 ? " (" + r.sacos50 + " sacos)" : ""); }).join(", ")))}">${ic.wa}Cotizar</a></div>
      </main>`, "inicio");
    $$("[data-e]").forEach((b) => b.addEventListener("click", () => { ui.etapa[c.id] = b.dataset.e; guardarUI(); vFert(c.id); }));
    $$("[data-ft]").forEach((b) => b.addEventListener("click", () => { const y = window.scrollY; ui.fertTipo = b.dataset.ft; guardarUI(); vFert(c.id); window.scrollTo(0, y); }));
    conectarVol(() => vFert(c.id));
    const re = (id, k) => { const el = $("#" + id); if (el) el.addEventListener("change", () => { const y = window.scrollY; if (k === "ph") ui.ph = el.value; else ui.calc[k] = el.value; guardarUI(); vFert(c.id); window.scrollTo(0, y); }); };
    re("ha", "ha"); re("pha", "pha"); re("ph", "ph");
    $("#reg").addEventListener("click", () => {
      const act = tipoSel === "foliar" ? "Fertilización foliar" : tipoSel === "enmienda" ? "Enmienda" : "Fertilización al suelo";
      prefill = { actividad: act, lineas: visibles.map((x) => {
        const p = P(x.producto_id);
        if (x.tipo === "foliar") return { producto_id: x.producto_id, dosis: x.dosis_tanque, unidad: (p.unidad || "cc") + "/tanque" };
        const r = L.calcularFertSuelo(x, p, ui.calc.ha, ui.calc.pha);
        return { producto_id: x.producto_id, dosis: r.gPorPlanta !== null ? Math.round(r.gPorPlanta) : x.dosis_kg_ha, unidad: r.gPorPlanta !== null ? "g/planta" : "kg/ha", total: r.kgTotal !== null ? r.kgTotal * 1000 : null };
      }) };
      location.hash = "#/registrar";
    });
  }

  // ------------------------------------------------------------ REPORTES (imagen para guardar o compartir)
  const botonesReporte = () => `<div class="acciones"><button class="btn wa" id="repCompartir" style="flex:1">${ic.wa}Compartir</button></div>`;
  function pieReporte() {
    const tel = String(aj("whatsapp_asesor", "")).replace(/^https?:\/\/wa\.me\/\+?/i, "").replace(/\D/g, "");
    return `Reporte generado con ${NOMBRE} · ${new Date().toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" })} · Recomendación técnica referencial: lea siempre la etiqueta y use equipo de protección.` +
      (aj("nombre_asesor", "") ? ` Asesor: ${aj("nombre_asesor", "")}` : "") + (tel ? ` · WhatsApp +${tel.startsWith("593") ? tel : "593" + tel.replace(/^0/, "")}` : "");
  }
  function conectarReporte(datos, nombreArchivo, texto) {
    const g = $("#repGuardar"), c = $("#repCompartir");
    if (g) g.addEventListener("click", async () => {
      try { await Reporte.guardar(datos(), nombreArchivo()); toast("Imagen guardada en tu teléfono (carpeta Descargas)"); }
      catch (e) { toast("No se pudo guardar la imagen en este navegador."); }
    });
    if (c) c.addEventListener("click", async () => {
      const r = await Reporte.compartir(datos(), nombreArchivo(), texto());
      if (r === "texto") toast("Tu teléfono no permite compartir imágenes: se abrió WhatsApp con el reporte en texto.");
    });
  }
  const nombreSeguro = (t) => String(t || "reporte").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]+/g, "_").slice(0, 40);

  // ------------------------------------------------------------ CALCULADORA
  // buscador de productos del portafolio (nombre, ingrediente activo, categoría o uso), sin tildes
  const sinTilde = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const textoProd = (p) => sinTilde([p.nombre, p.ingrediente_activo, p.concentracion, p.categoria, p.control].filter(Boolean).join(" "));
  // cuadro de búsqueda de producto (calculadora y mezcla); filtro opcional y productos a excluir
  const cajaBuscaProd = (etiqueta) => `<div class="campo busca-prod"><label for="buscaP">${h(etiqueta)}</label>
          <input id="buscaP" type="search" placeholder="Buscar producto o ingrediente activo…" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="sugP" aria-autocomplete="list">
          <div id="sugP" class="sugerencias" role="listbox" hidden></div></div>`;
  function conectarBuscaProd(elegir, filtro) {
    const inp = $("#buscaP"), sug = $("#sugP"); if (!inp) return;
    const prods = (I.c.productos || []).filter((p) => p.activo !== false && !SIN_DOSIS.includes(p.categoria)).filter(filtro || (() => true));
    let sel = -1, hall = [];
    const cerrar = () => { sug.hidden = true; inp.setAttribute("aria-expanded", "false"); sel = -1; };
    const marcar = () => [...sug.children].forEach((b, i) => b.classList.toggle("act", i === sel));
    const pintarSug = () => {
      const q = sinTilde(inp.value).trim(); if (!q) return cerrar();
      const t = q.split(/\s+/);
      hall = prods.filter((p) => t.every((x) => textoProd(p).includes(x)))
        .sort((a, b) => (sinTilde(a.nombre).startsWith(q) ? 0 : 1) - (sinTilde(b.nombre).startsWith(q) ? 0 : 1) || a.nombre.localeCompare(b.nombre)).slice(0, 12);
      sug.innerHTML = hall.length ? hall.map((p) => { const d = L.dosisDe(p), sin = d.min === null && d.max === null;
        return `<button type="button" role="option" data-id="${p.id}"><b>${h(p.nombre)}</b>${p.concentracion || p.ingrediente_activo ? `<span>${h(p.concentracion || p.ingrediente_activo)}</span>` : ""}<small>${h(p.categoria || "")}${sin ? " · Dosis no cargada" : ""}</small></button>`; }).join("")
        : `<div class="sin">No hay productos con «${h(inp.value)}».</div>`;
      sug.hidden = false; inp.setAttribute("aria-expanded", "true"); sel = -1;
      $$("#sugP [data-id]").forEach((b) => b.addEventListener("click", () => elegir(b.dataset.id)));
    };
    inp.addEventListener("input", pintarSug);
    inp.addEventListener("keydown", (e) => {
      if (sug.hidden || !hall.length) return;
      if (e.key === "ArrowDown") { sel = Math.min(sel + 1, hall.length - 1); marcar(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); marcar(); e.preventDefault(); }
      else if (e.key === "Enter") { e.preventDefault(); elegir(hall[Math.max(sel, 0)].id); }
      else if (e.key === "Escape") cerrar();
    });
    sug.addEventListener("mousedown", (e) => e.preventDefault()); // que el toque en una sugerencia no cierre la lista antes de elegir
    inp.addEventListener("blur", () => setTimeout(cerrar, 150));
  }
  function vCalcular(q) {
    const cc = ui.calc;
    if (q.p) { cc.p = q.p; cc.d = q.d || null; cc.dha = null; }
    if (!cc.p || !P(cc.p)) cc.p = ((I.c.productos || [])[0] || {}).id;
    const p = P(cc.p); if (!p) return pintar(`${barra("Calcular dosis", "", "#/")}<main class="cont"><div class="vacio">No hay productos cargados.</div></main>`, "calcular");
    cc.modo = cc.modo || "ha"; cc.ha = cc.ha !== undefined ? cc.ha : D.sesion.perfil.hectareas || ""; cc.uSup = cc.uSup || "ha"; cc.m2 = cc.m2 !== undefined ? cc.m2 : ""; cc.aguaM2 = cc.aguaM2 !== undefined ? cc.aguaM2 : "";
    cc.lha = cc.lha || aj("litros_agua_ha", 400); cc.ppb = cc.ppb || aj("plantas_por_bomba", 60);
    // litros de la bomba o tanque que usa cada uno (antes botones 20 L / 200 L / Otro)
    if (cc.vol === undefined || cc.vol === null || cc.vol === "") cc.vol = cc.equipo === "tanque" ? TANQUE() : cc.equipo === "otro" ? 16 : BOMBA();
    { const v0 = Number(String(cc.vol).replace(",", ".")) || BOMBA(); cc.equipo = v0 === TANQUE() ? "tanque" : v0 === BOMBA() ? "bomba" : "otro"; }
    guardarUI();
    const d = L.dosisDe(p);
    const n = (v) => (v === "" || v === undefined || v === null ? null : Number(String(v).replace(",", ".")));
    // superficie en hectáreas o en metros cuadrados (1 ha = 10.000 m²); el cálculo siempre usa hectáreas
    // el técnico calcula la superficie siempre en hectáreas (sin opción m²)
    const enM2 = cc.uSup === "m2" && D.sesion.perfil.rol !== "tecnico";
    const haCalc = enM2 ? (n(cc.m2) !== null ? n(cc.m2) / 10000 : null) : n(cc.ha);
    const supTxt = enM2 ? `${L.fmt(n(cc.m2) || 0, 0)} m²` : `${cc.ha} ha`;
    const lhaRef = Number(aj("litros_agua_ha", 400)) || 400;
    // productos de bomba/tanque: se calcula con la dosis por hectárea (editable)
    // solo los técnicos calculan con dosis por hectárea editable; los agricultores usan la dosis por tanque recomendada
    // por número de plantas no se usa la dosis por hectárea ni el agua por hectárea: se usa la dosis por bomba/tanque
    // y cuántas plantas cubre el equipo elegido
    // técnico: dosis por hectárea editable también por número de plantas (se reparte con las plantas por ha)
    // por hectáreas todos calculan con la fórmula: producto por bomba = dosis por ha × litros de la bomba ÷ litros de agua por ha
    // (el técnico puede editar la dosis por ha; el agricultor usa la recomendada). Por plantas, solo el técnico usa dosis por ha.
    const esTec = D.sesion.perfil.rol === "tecnico";
    const esTanque = d.modo === "tanque" && (esTec || (cc.modo || "ha") === "ha");
    const dh = esTanque ? L.dosisHaDe(p, lhaRef, TANQUE()) : null;
    if (esTanque && cc.d !== null && cc.d !== undefined && cc.d !== "" && !isNaN(Number(cc.d))) { cc.dha = Math.round(Number(cc.d) * lhaRef / TANQUE() * 10) / 10; cc.d = null; }
    // técnico: la dosis por ha es editable, sin botones de dosis mínima/alta (vacía = dosis mínima recomendada)
    const dhaElegida = esTanque ? (esTec && n(cc.dha) !== null && n(cc.dha) > 0 ? n(cc.dha) : cc.usarMax && !esTec ? dh.max : dh.min) : null;
    const vol0 = Number(String(cc.vol).replace(",", ".")) || BOMBA();
    const campo0 = cc.equipo === "tanque" ? "ppt" : cc.equipo === "otro" ? "ppo" : "ppb";
    // por plantas, el agua por ha equivale a: plantas por ha × litros del equipo ÷ plantas que cubre el equipo
    const ppe0 = n(cc[campo0]) || (campo0 === "ppb" ? n(cc.ppb) : Math.round((n(cc.ppb) || 60) * vol0 / BOMBA()));
    const lhaPlantas = n(cc.pha) && ppe0 ? n(cc.pha) * vol0 / ppe0 : null;
    // en m² el agricultor da el agua que gasta en esos m²; internamente se pasa a litros por ha (agua × 10.000 ÷ m²)
    const m2v = n(cc.m2), aguaM2v = n(cc.aguaM2);
    const lhaM2 = enM2 && m2v > 0 && aguaM2v > 0 ? aguaM2v * 10000 / m2v : null;
    const faltaAguaM2 = enM2 && cc.modo === "ha" && d.modo === "tanque" && m2v > 0 && !lhaM2;
    const lhaUsada = cc.modo === "plantas" ? lhaPlantas : enM2 ? lhaM2 : n(cc.lha) || lhaRef;
    const faltaPha = esTanque && cc.modo === "plantas" && !lhaPlantas;
    if (esTanque && dhaElegida !== null && lhaUsada) { d.min = d.max = dhaElegida * TANQUE() / lhaUsada; }
    else if (cc.d !== null && cc.d !== undefined && cc.d !== "" && !isNaN(Number(cc.d))) { d.min = Number(cc.d); }
    const vol = vol0;
    // plantas que se cubren con el equipo elegido (bomba, tanque u otro)
    const campoPl = cc.equipo === "tanque" ? "ppt" : cc.equipo === "otro" ? "ppo" : "ppb";
    if (cc[campoPl] === undefined || cc[campoPl] === null || cc[campoPl] === "") cc[campoPl] = campoPl === "ppb" ? cc.ppb : Math.round((n(cc.ppb) || 60) * vol / BOMBA());
    const ppe = n(cc[campoPl]);
    const r = L.calcularFinca(p, d, { modo: cc.modo, hectareas: faltaAguaM2 ? null : haCalc, plantas: n(cc.pl), plantasPorHa: n(cc.pha), litrosAguaHa: enM2 && cc.modo === "ha" ? lhaM2 : n(cc.lha), plantasPorBomba: ppe, bombaL: vol, tanqueL: TANQUE(), usarMax: esTanque && !faltaPha ? false : cc.usarMax });
    const rangoTxt = esTanque ? dh.min !== null && dh.max !== null && dh.min !== dh.max : d.min !== null && d.max !== null && d.min !== d.max;
    const equipoTxt = (plural) => cc.equipo === "tanque" ? (plural ? `Tanques de ${L.fmt(vol)} L` : `tanque de ${L.fmt(vol)} L`) : (plural ? `Bombas de ${L.fmt(vol)} L` : `bomba de ${L.fmt(vol)} L`);
    const pu = L.precioUnitario(p);
    const costoTanque = r.tipo === "tanque" && r.porTanque !== undefined && pu !== null ? Math.round(r.porTanque * pu * 100) / 100 : null;
    // costo total de aplicación = tanques o bombas a preparar × costo de producto por equipo
    const costoEquipo = r.tipo === "tanque" && r.porBomba !== undefined && pu !== null ? Math.round(r.porBomba * pu * 100) / 100 : null;
    const costoAplic = costoEquipo !== null && r.bombas ? Math.round(r.bombas * r.porBomba * pu * 100) / 100 : null;
    const msgAsesor = () => {
      const area = cc.modo === "ha" ? supTxt : `${cc.pl || ""} plantas`;
      if (r.tipo === "tanque" && r.total !== undefined) return `Hola, quiero verificar esta dosis de ${p.nombre}: ${L.cantidad(r.porBomba, r.unidad)} por ${equipoTxt(false)}${esTanque && dhaElegida !== null ? ` (${L.cantidad(dhaElegida, p.unidad)} por ha)` : ""}, para ${area}. En total ${L.cantidad(r.total, r.unidad)} en ${L.textoEquipos(r.bombas)} ${((t) => t.charAt(0).toLowerCase() + t.slice(1))(equipoTxt(r.bombas !== 1))}. ¿Está bien?`;
      if (r.kgTotal !== undefined) return `Hola, quiero verificar esta dosis de ${p.nombre} para ${area}: ${L.fmt(r.kgTotal, 1)} kg en total${r.gPorPlanta ? ` (${L.fmt(r.gPorPlanta, 0)} g por planta)` : ""}. ¿Está bien?`;
      return `Hola, quiero verificar la dosis de ${p.nombre} para mi cultivo.`;
    };
    let res = "";
    if (r.tipo === "tanque" && r.total !== undefined) {
      res = `<div class="grid2"><div><div class="n">${L.fmt(r.litrosAgua, r.litrosAgua < 100 ? 1 : 0)} L</div><small>Agua total a aplicar</small></div>
        <div><div class="n">${h(L.cantidad(r.total, r.unidad))}</div><small>Producto requerido total</small></div>
        <div><div class="n">${L.textoEquipos(r.bombas)}</div><small>${equipoTxt(true)}${Math.abs(r.equiposExactos - r.bombas) > 0.005 ? ` <span style="opacity:.8">(${L.fmt(r.equiposExactos, 2)} exactos)</span>` : ""}</small></div>
        <div><div class="n">${h(L.cantidad(r.porBomba, r.unidad))}</div><small>Dosis por ${equipoTxt(false)}</small></div></div>`;
    } else if (r.kgTotal !== undefined) {
      res = `<div class="grid2"><div><div class="n">${L.fmt(r.kgTotal, 1)} kg</div><small>Producto requerido total</small></div>
        <div><div class="n">${r.textoFraccion ? h(r.textoFraccion) : r.sacos50}${r.textoFraccion && r.fraccionSaco < 1 ? ` <span class="n-kg">(${L.fmt(r.fraccionSaco * r.kgSaco, 1)} kg)</span>` : ""}</div><small>${r.textoFraccion && r.fraccionSaco < 1 ? `De saco de ${L.fmt(r.kgSaco)} kg` : r.textoFraccion && r.fraccionSaco === 1 ? `Saco de ${L.fmt(r.kgSaco)} kg` : `Sacos de ${L.fmt(r.kgSaco || 50)} kg`}</small></div>
        ${r.gPorPlanta ? `<div><div class="n">${L.fmt(r.gPorPlanta, 0)} g</div><small>Por planta</small></div>` : ""}
        ${r.sitios ? `<div><div class="n">${L.fmt(r.sitios, 0)}</div><small>Sitios / plantas</small></div>` : ""}</div>`;
    }
    const compra = r.envases ? `<div class="linea">Necesitas comprar: <b>${h(r.compraTexto || r.envases + " × " + (r.presentacion || "envase"))}</b>${r.costoEnvases !== undefined ? ` · ${dinero(r.costoEnvases)}` : ""}${costoEquipo !== null ? `<br><span style="font-size:12.5px">Costo por ${h(equipoTxt(false))}: ${dinero(costoEquipo)}</span>` + (costoAplic !== null ? `<br><span style="font-size:15px">Costo total de aplicación: <b>${dinero(costoAplic)}</b></span>` : "") : r.costoUsado !== undefined ? `<br><span style="font-size:12.5px">Costo de lo que aplicas: ${dinero(r.costoUsado)}</span>` : ""}</div>` : "";
    pintar(`${barra("Calcular para mi finca", p.nombre, "#/")}
      <main class="cont">
        ${cajaBuscaProd("Producto")}
        <div class="prod-sel"><span class="mini">Producto seleccionado</span><b>${h(p.nombre)}</b>
          ${p.concentracion || p.ingrediente_activo ? `<span class="mini">Concentración: <b>${h(p.concentracion || p.ingrediente_activo)}</b></span>` : ""}
          <span class="mini">${h(p.categoria || "")}${p.grupo && /^(IRAC|FRAC|HRAC)/.test(p.grupo) ? " · " + h(p.grupo) : ""}</span></div>
        ${esTanque && !esTec ? `<div class="mini">Dosis por hectárea: <b>${dh.min !== null ? h(L.rango(dh.min, dh.max, p.unidad + "/ha")) : "sin dosis cargada"}</b>${dh.derivada ? ` (etiqueta: ${h(L.rango(L.dosisDe(p).min, L.dosisDe(p).max, p.unidad))} por tanque de ${TANQUE()} L)` : ""}</div>` : ""}
        ${esTanque && esTec ? `<label class="campo">Dosis por hectárea<span class="unido"><input id="dha" inputmode="decimal" value="${h(dhaElegida !== null ? L.fmt(dhaElegida) : "")}" placeholder="Escribe la dosis"><span>${h(p.unidad || "")}/ha</span></span>
          <small>${dh.min !== null ? `Recomendada: <b>${h(L.rango(dh.min, dh.max, p.unidad + "/ha"))}</b>${dh.derivada ? ` (equivale a ${h(L.rango(L.dosisDe(p).min, L.dosisDe(p).max, p.unidad))} por tanque de ${TANQUE()} L con ${L.fmt(lhaRef, 0)} L de agua/ha)` : ""}. Puedes cambiarla.` : "Este producto no tiene dosis por hectárea cargada: escríbela según la etiqueta."}${n(cc.dha) !== null && dh.min !== null && (n(cc.dha) < dh.min * 0.999 || n(cc.dha) > dh.max * 1.001) ? ` <span style="color:var(--rojo,#b3261e)">Está fuera del rango recomendado.</span>` : ""}</small></label>` : ""}
        <div class="mini" ${esTanque ? 'style="display:none"' : ""}>Dosis de etiqueta: <b>${h(d.modo === "tanque" ? L.rango(L.dosisDe(p).min, L.dosisDe(p).max, d.unidad) + " por tanque de " + TANQUE() + " L" : d.modo === "sitio" ? L.rango(d.min, d.max, "g") + " por sitio" : L.rango(d.min, d.max, "kg") + " por ha")}</b>${p.dosis_texto && d.modo === "tanque" ? "" : ""}</div>
        ${rangoTxt && !(cc.d) && !(esTanque && esTec) ? `<div class="seg" role="group" aria-label="Dosis"><button data-dm="min" class="${!cc.usarMax ? "sel" : ""}">Dosis mínima</button><button data-dm="max" class="${cc.usarMax ? "sel" : ""}">Dosis alta</button></div>` : ""}
        <div class="etq">Calcular por</div>
        <div class="seg" role="group" aria-label="Calcular por"><button data-m="ha" class="${cc.modo === "ha" ? "sel" : ""}">Superficie</button><button data-m="plantas" class="${cc.modo === "plantas" ? "sel" : ""}">N.º de plantas</button></div>
        ${cc.modo === "ha" && !esTec ? `<div class="seg seg-chico" role="group" aria-label="Unidad de superficie"><button data-us="ha" class="${!enM2 ? "sel" : ""}">Hectáreas (ha)</button><button data-us="m2" class="${enM2 ? "sel" : ""}">Metros cuadrados (m²)</button></div>` : ""}
        <div class="grid2 campos-calc">
          ${cc.modo === "ha" ? (enM2 ? `<label class="campo">Superficie (m²)<span class="unido"><input id="m2" inputmode="numeric" value="${h(cc.m2)}" placeholder="1000"><span>m²</span></span></label>`
              : `<label class="campo">Superficie (ha)<span class="unido"><input id="ha" inputmode="decimal" value="${h(cc.ha)}"><span>ha</span></span></label>`)
            : `<label class="campo">N.º de plantas<span class="unido"><input id="pl" inputmode="numeric" value="${h(cc.pl || "")}"><span>pl</span></span></label>`}
          ${(() => {
            const fPha = `<label class="campo">${esTec ? "Plantas promedio por ha" : "Plantas por ha"}<span class="unido"><input id="pha" inputmode="numeric" value="${h(cc.pha || "")}" placeholder="1600"><span>pl/ha</span></span></label>`;
            const fVol = `<label class="campo">Litros de tu bomba o tanque<span class="unido"><input id="vol" inputmode="decimal" value="${h(cc.vol)}"><span>L</span></span></label>`;
            const fCub = `<label class="campo">Plantas cubiertas por ${esTec ? "" : "tu "}${cc.equipo === "tanque" ? "tanque" : "bomba"} de ${L.fmt(vol)} L<span class="unido"><input id="${campoPl}" inputmode="numeric" value="${h(cc[campoPl])}"><span>pl</span></span></label>`;
            if (d.modo !== "tanque") return fPha;
            if (cc.modo === "ha") return (enM2 ? `<label class="campo">Agua que usas en esos m²<span class="unido"><input id="aguaM2" inputmode="decimal" value="${h(cc.aguaM2)}" placeholder="Ej. 40"><span>L</span></span></label>` : `<label class="campo">Agua utilizada por 1 ha<span class="unido"><input id="lha" inputmode="numeric" value="${h(cc.lha)}"><span>L/ha</span></span></label>`) + fVol;
            // técnico por plantas: arriba plantas promedio por ha; abajo litros de la bomba y plantas cubiertas
            if (esTanque) return fPha + fVol + fCub;
            return fCub + fVol;
          })()}
        </div>
        ${cc.modo === "ha" && enM2 ? `<div class="aviso azul info-sup"><b>i</b><div>¿No sabes los m²? Multiplica el largo por el ancho de tu lote en metros (ej. 20 m × 50 m = 1.000 m²).${d.modo === "tanque" ? `<br>En <b>agua que usas</b> escribe los litros que gastas para fumigar bien esos m² (por ejemplo: 2 bombas de 20 litros = 40 L).` : ""}</div></div>` : ""}
        ${cc.modo === "ha" && esTec && haCalc ? `<div class="aviso azul info-sup"><b>i</b><div>Superficie: <b>${h(L.fmt(haCalc, 4))} ha = ${h(L.fmt(haCalc * 10000, 0))} m²</b></div></div>` : ""}
        ${faltaAguaM2 ? `<div class="aviso ambar">${ic.alerta}<div>Escribe cuántos <b>litros de agua usas</b> para fumigar tus ${L.fmt(m2v, 0)} m² para calcular la dosis.</div></div>` : ""}
        ${faltaPha ? `<div class="aviso ambar">${ic.alerta}<div>Escribe las <b>plantas por hectárea</b> para repartir la dosis por hectárea en cada ${cc.equipo === "tanque" ? "tanque" : "bomba"}. Mientras tanto se usa la dosis de etiqueta por tanque.</div></div>` : ""}
        ${r.avisos.map((a) => `<div class="aviso ambar">${ic.alerta}<div>${h(a)}</div></div>`).join("")}
        ${res ? `<section class="resultado" aria-live="polite"><div class="etq">Resultado <span class="res-en">${h(cc.modo === "plantas" ? `en ${L.fmt(n(cc.pl) || 0, 0)} plantas` : enM2 ? `en ${L.fmt(m2v || 0, 0)} m²` : `en ${L.fmt(haCalc || 0, 4)} ${haCalc === 1 ? "hectárea" : "hectáreas"}`)}</span></div>${res}${compra}</section>` : ""}
        <div class="acciones"><button class="btn" id="reg">Registrar aplicación</button>${d.modo === "tanque" || d.modo === "suelo_ha" ? `<button class="btn sec" id="mez">Agregar a mezcla</button>` : `<a class="btn sec" href="#/fertilizacion/${h(ui.cultivo || "")}">Ver plan de fertilización</a>`}</div>
        ${avisoSeguridad()}
        ${res ? `<a class="btn wa" target="_blank" rel="noopener" href="${h(waLink(msgAsesor()))}">${ic.wa}Verificar dosis con mi asesor</a>` : ""}
      </main>`, "calcular");
    const re = () => { const y = window.scrollY; vCalcular({}); window.scrollTo(0, y); }; // al cambiar botones o datos, la vista se queda donde estaba
    conectarBuscaProd((id) => { cc.p = id; cc.d = null; cc.dha = null; cc.usarMax = false; try { history.replaceState(null, "", "#/calcular?p=" + id); } catch (er) {} re(); });
    $$("[data-m]").forEach((b) => b.addEventListener("click", () => { cc.modo = b.dataset.m; re(); }));
    $$("[data-us]").forEach((b) => b.addEventListener("click", () => {
      // al cambiar de unidad se convierte el valor escrito (ha ↔ m²)
      const nueva = b.dataset.us; if (nueva === cc.uSup) return;
      if (nueva === "m2" && n(cc.ha) !== null) { cc.m2 = String(Math.round(n(cc.ha) * 10000)); cc.aguaM2 = String(Math.round(n(cc.m2) * (n(cc.lha) || lhaRef) / 10000 * 10) / 10).replace(".", ","); cc.aguaAuto = true; }
      if (nueva === "ha" && lhaM2) cc.lha = String(Math.round(lhaM2));
      if (nueva === "ha" && n(cc.m2) !== null) cc.ha = String(Math.round(n(cc.m2) / 10000 * 10000) / 10000).replace(".", ",");
      cc.uSup = nueva; re(); }));
    $$("[data-eq]").forEach((b) => b.addEventListener("click", () => { cc.equipo = b.dataset.eq; re(); }));
    $$("[data-dm]").forEach((b) => b.addEventListener("click", () => { cc.usarMax = b.dataset.dm === "max"; cc.dha = null; re(); }));
    ["dha", "ha", "m2", "aguaM2", "pl", "vol", "lha", "ppb", "ppt", "ppo", "pha"].forEach((k) => { const el = $("#" + k); if (el) el.addEventListener("change", () => { cc[k] = el.value; if (k === "vol") cc.ppo = "";
      // el agua sugerida al pasar a m² se recalcula con los m² hasta que el agricultor escriba la suya
      if (k === "aguaM2") cc.aguaAuto = false;
      if (k === "m2" && cc.aguaAuto && n(cc.m2) > 0) cc.aguaM2 = String(Math.round(n(cc.m2) * (n(cc.lha) || lhaRef) / 10000 * 10) / 10).replace(".", ","); re(); }); });
    $("#reg").addEventListener("click", () => {
      const dosisUsada = cc.usarMax ? d.max : d.min;
      prefill = { cargas: r.bombas ? String(r.bombas).replace(".", ",") : "", actividad: p.categoria && /Fertiliz|Enmienda|Bioestim/.test(p.categoria) ? (d.modo === "tanque" ? "Fertilización foliar" : p.categoria === "Enmienda" ? "Enmienda" : "Fertilización al suelo") : p.categoria === "Herbicida" ? "Herbicida" : "Fumigación planta",
        lineas: [{ producto_id: p.id, dosis: d.modo === "tanque" ? r.porBomba : d.modo === "sitio" ? dosisUsada : dosisUsada,
          unidad: d.modo === "tanque" ? p.unidad + "/" + vol + " L" : d.modo === "sitio" ? "g/planta" : "kg/ha",
          total: r.total !== undefined ? r.total : r.kgTotal !== undefined ? r.kgTotal * 1000 : null }] };
      location.hash = "#/registrar";
    });
    const mz = $("#mez"); if (mz) mz.addEventListener("click", () => {
      // pasa también el equipo y cuántos tanques o bombas se aplicarán, para calcular la compra y el costo en Mezcla
      if (r.tipo === "tanque" && r.bombas) {
        const enBombas = cc.equipo === "otro";   // un equipo de otra capacidad se convierte a bombas de BOMBA() L
        ui.vol = cc.equipo === "tanque" ? "tanque" : "bomba";
        const n = enBombas ? Math.round(r.equiposExactos * vol / BOMBA() * 10) / 10 : r.bombas;
        ui.mezclaCargas = String(n).replace(".", ","); guardarUI();
      }
      if (d.modo === "suelo_ha") { const haM = cc.modo === "plantas" ? (n(cc.pl) && n(cc.pha) ? n(cc.pl) / n(cc.pha) : null) : n(cc.ha); if (haM) { ui.mezclaHa = String(Math.round(haM * 100) / 100).replace(".", ","); guardarUI(); } }
      agregarAMezcla(p.id, cc.usarMax ? d.max : d.min);
    });
  }

  // ------------------------------------------------------------ MEZCLA
  function vMezcla() {
    const m = S.get("mezcla", []).filter((x) => P(x.producto_id));
    const prods = m.map((x) => P(x.producto_id));
    const f = volL() / TANQUE();
    const rev = L.revisarMezcla(prods, I.c.compatibilidad || []);
    const orden = L.ordenMezcla(prods);
    const nombre = (id) => (P(id) || {}).nombre || "";
    const esSuelo = (x) => !!x.suelo || (P(x.producto_id) || {}).modo_aplicacion === "suelo_ha";
    const dzDe = (x) => { const v = esSuelo(x) ? x.dosis_ha : x.dosis_tanque; return v !== null && v !== undefined ? v : L.dosisDe(P(x.producto_id)).min; };
    const fmtD = (x) => { const p = P(x.producto_id), dz = dzDe(x); return dz === null ? "Ver etiqueta" : esSuelo(x) ? L.fmt(dz) + " kg/ha" : L.cantidad(dz * f, p.unidad); };
    const cargas = Number(String(ui.mezclaCargas || "1").replace(",", ".")) || 0;
    const haSuelo = Number(String(ui.mezclaHa || D.sesion.perfil.hectareas || "1").replace(",", ".")) || 0;
    const haySuelo = m.some(esSuelo), hayTanque = m.some((x) => !esSuelo(x));
    // vía de aplicación para la receta (técnicos): follaje, drench al suelo o al suelo
    const VIAS = ["Foliar", "Drench al suelo", "Al suelo (voleo / corona)"];
    ui.recVia = ui.recVia || {};
    const viaDe = (x) => ui.recVia[x.producto_id] || (esSuelo(x) ? VIAS[2] : VIAS[0]);
    const compra = m.map((x) => {
      const p = P(x.producto_id), dz = dzDe(x);
      if (dz === null) return { p, total: null };
      if (esSuelo(x)) { // fertilizante al suelo: kg/ha × hectáreas, se compra en sacos
        const g = dz * haSuelo * 1000, fs = L.fraccionSacos(g, p);
        if (fs) return { p, total: g, unidad: "g", envases: fs.sacos, texto: fs.texto, costo: fs.costo, costoTanque: null };
        const c = L.compraOptima(g, "g", p.presentaciones);
        if (c) return { p, total: g, unidad: "g", envases: c.envases, texto: c.texto, costo: c.costo, costoTanque: null };
        const cont = Number(p.contenido) || null, envases = cont ? Math.ceil(g / cont - 1e-9) : null;
        return { p, total: g, unidad: "g", envases, texto: envases ? envases + " × " + (p.presentacion || "saco") : null, costo: envases && p.pvp !== null && p.pvp !== undefined ? envases * Number(p.pvp) : null, costoTanque: null };
      }
      const total = dz * f * cargas, pu = L.precioUnitario(p);
      const costoTanque = pu !== null ? dz * pu : null;
      const c = L.compraOptima(total, p.unidad, p.presentaciones);
      if (c) return { p, total, envases: c.envases, texto: c.texto, costo: c.costo, costoTanque };
      const cont = Number(p.contenido) || null, envases = cont ? Math.ceil(total / cont - 1e-9) : null;
      return { p, total, envases, texto: envases ? envases + " × " + (p.presentacion || "envase") : null, costo: envases && p.pvp !== null && p.pvp !== undefined ? envases * Number(p.pvp) : null, costoTanque };
    });
    const costoCompra = compra.reduce((a, c) => a + (c.costo || 0), 0), costoTanqueMezcla = compra.reduce((a, c) => a + (c.costoTanque || 0), 0);
    // costo por equipo que usa el agricultor: tanque de 200 L o bomba de 20 L
    const costoEquipoMezcla = ui.vol === "tanque" ? costoTanqueMezcla : costoTanqueMezcla * BOMBA() / TANQUE();
    const txtCostoEquipo = ui.vol === "tanque" ? `Costo por tanque de ${TANQUE()} L de aplicación` : `Costo por bomba de ${BOMBA()} L de aplicación`;
    let n = 0;
    pintar(`${barra("Mi mezcla", "Revisión de compatibilidad y orden", "#/")}
      <main class="cont">
        ${cajaBuscaProd("Agregar producto")}
        ${segVol()}
        <div class="lista">${m.map((x, i) => { const p = P(x.producto_id); return `<div class="item" style="cursor:default"><div class="tx"><b>${h(p.nombre)}</b><span>${esSuelo(x) ? `${h(fmtD(x))} · al suelo, no va al tanque` : `${h(fmtD(x))} en ${h(volTxt())} · ${h(L.ORDEN_FORMULACION[p.formulacion] ? L.ORDEN_FORMULACION[p.formulacion].texto.split(" (")[0] : "Líquido")}`}</span></div><button class="icono-btn" data-q="${i}" aria-label="Quitar ${h(p.nombre)}">✕</button></div>`; }).join("") || `<div class="vacio">Tu mezcla está vacía. Agrega productos desde una recomendación, el plan sanitario o aquí abajo.</div>`}</div>
        ${prods.length >= 2 ? (rev.length ? rev.map((r) => `<div class="aviso ${r.nivel === "incompatible" ? "rojo" : r.nivel === "precaucion" ? "ambar" : "verde"}"><span class="pill ${r.nivel === "incompatible" ? "rojo" : r.nivel === "precaucion" ? "ambar" : "verde"}">${r.nivel === "incompatible" ? "NO MEZCLAR" : r.nivel === "precaucion" ? "PRECAUCIÓN" : "COMPATIBLE"}</span><div>${r.a ? `<b>${h(nombre(r.a))} + ${h(nombre(r.b))}:</b> ` : ""}${h(r.nota || "")}</div></div>`).join("")
          : `<div class="aviso verde"><span class="pill verde">SIN ALERTAS</span><div>No hay incompatibilidades registradas para esta combinación. Igual haz la <b>prueba del frasco</b> antes de llenar el tanque.</div></div>`) : ""}
        ${prods.length ? `<section class="card"><div class="etq">Orden de mezcla</div>
          ${orden.pasos.filter((p) => p.productos.length || p === orden.pasos[0] || p === orden.pasos[orden.pasos.length - 1]).map((p) => `<div class="paso"><span class="num">${++n}</span><div>${p.productos.length ? `<b>${p.productos.map((x) => h(x.nombre)).join(", ")}</b> · ${h(p.texto)}` : h(p.texto)}</div></div>`).join("")}
          ${orden.fuera.length ? `<span class="mini">No van al tanque: ${orden.fuera.map((x) => h(x.nombre)).join(", ")}.</span>` : ""}
          <span class="mini">Agrega un producto a la vez y espera que se disuelva antes del siguiente. Usa agua con pH entre 5 y 6 (con cobres, no acidifiques demasiado).</span></section>` : ""}
        ${prods.length ? `<section class="card"><div class="etq">Para comprar</div>
          ${hayTanque ? `<label class="campo">${ui.vol === "tanque" ? "¿Cuántos tanques de " + TANQUE() : "¿Cuántas bombas de " + BOMBA()} L vas a aplicar?<span class="unido"><input id="cargas" inputmode="decimal" value="${h(ui.mezclaCargas || "1")}"><span>${ui.vol === "tanque" ? "tanques" : "bombas"}</span></span></label>` : ""}
          ${haySuelo ? `<label class="campo">¿Cuántas hectáreas vas a fertilizar al suelo?<span class="unido"><input id="haSuelo" inputmode="decimal" value="${h(ui.mezclaHa || D.sesion.perfil.hectareas || "1")}"><span>ha</span></span></label>` : ""}
          ${compra.map((c) => `<div class="fila" style="font-size:14px;border-top:1px solid var(--borde);padding-top:8px"><span><b>${h(c.p.nombre)}</b><br><span class="mini">${c.total !== null ? h(L.cantidad(c.total, c.unidad || c.p.unidad)) + " en total" : "Ver etiqueta"}</span></span><span style="text-align:right">${c.texto ? h(c.texto) : "—"}${c.costo !== null ? `<br><span class="mini">${dinero(c.costo)}</span>` : ""}</span></div>`).join("")}
          <div class="fila" style="border-top:1px solid var(--borde);padding-top:8px"><span class="mini">Total de referencia</span><b>${dinero(costoCompra)}</b></div>
          ${hayTanque ? `<div class="fila"><span class="mini">${txtCostoEquipo}</span><b>${dinero(costoEquipoMezcla)}</b></div>` : ""}
        </section>
        ${esTecnico() ? `<section class="card"><div class="etq">Receta para el agricultor (PDF)</div>
          <div class="grid2"><label class="campo">Agricultor<input id="recAgr" value="${h(ui.recAgr || "")}" placeholder="Nombre"></label>
          <label class="campo">Cultivo / lote<input id="recCult" value="${h(ui.recCult || "")}" placeholder="Ej. Pitahaya, lote 2"></label></div>
          <div class="campo"><span>Vía de aplicación de cada producto</span>${m.map((x) => { const p = P(x.producto_id), v = viaDe(x);
            return `<div class="fila" style="gap:8px;padding:4px 0"><span style="font-size:14px;min-width:0">${h(p.nombre)}</span><select data-via="${p.id}" style="max-width:170px">${VIAS.map((o) => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("")}</select></div>`; }).join("")}</div>
          <label class="campo">Indicaciones y recomendaciones<textarea id="recInd" rows="3" placeholder="Ej. Aplicar en la tarde, cubrir bien el envés. Repetir a los 8 días.">${h(ui.recInd || "")}</textarea></label>
          <button class="btn wa" id="recetar">${ic.wa}Recetar</button>
          <span class="mini">Se crea un PDF con la mezcla, el orden, las dosis y tus indicaciones para enviarlo por WhatsApp.</span></section>` : botonesReporte()}
        <div class="acciones"><button class="btn" id="reg">Registrar esta mezcla</button><button class="btn peligro" id="vaciar">Vaciar</button></div>
        <a class="btn wa" target="_blank" rel="noopener" href="${h(waLink("Hola, quiero validar esta mezcla para " + volTxt() + ": " + m.map((x) => P(x.producto_id).nombre + " " + fmtD(x)).join(", ") + ". ¿Está bien?"))}">${ic.wa}Validar mezcla con mi asesor</a>` : ""}
      </main>`, "mezcla");
    conectarVol(vMezcla);
    $$("[data-q]").forEach((b) => b.addEventListener("click", () => { m.splice(Number(b.dataset.q), 1); S.set("mezcla", m); vMezcla(); }));
    conectarBuscaProd((id) => { const p = P(id); m.push(itemMezcla(p, L.dosisDe(p).min)); S.set("mezcla", m); vMezcla(); },
      (p) => ["tanque", "suelo_ha"].includes(p.modo_aplicacion || "tanque") && !m.some((x) => String(x.producto_id) === String(p.id)));
    const reg = $("#reg"); if (reg) reg.addEventListener("click", () => {
      prefill = { actividad: hayTanque ? "Fumigación planta" : "Fertilización al suelo", lineas: m.map((x) => { const dz = dzDe(x);
        return esSuelo(x) ? { producto_id: x.producto_id, dosis: dz, unidad: "kg/ha" } : { producto_id: x.producto_id, dosis: dz !== null ? Math.round(dz * f * 10) / 10 : null, unidad: P(x.producto_id).unidad + "/" + volL() + " L" }; }) };
      location.hash = "#/registrar";
    });
    const va = $("#vaciar"); if (va) va.addEventListener("click", () => { S.set("mezcla", []); vMezcla(); });
    const ca = $("#cargas"); if (ca) ca.addEventListener("change", () => { ui.mezclaCargas = ca.value; guardarUI(); vMezcla(); });
    const hs = $("#haSuelo"); if (hs) hs.addEventListener("change", () => { ui.mezclaHa = hs.value; guardarUI(); vMezcla(); });
    if (prods.length) {
      const pasos = orden.pasos.filter((p) => p.productos.length || p === orden.pasos[0] || p === orden.pasos[orden.pasos.length - 1])
        .map((p, i) => `${i + 1}. ${p.productos.length ? p.productos.map((x) => x.nombre).join(", ") + " · " + p.texto : p.texto}`);
      const equipo = ui.vol === "tanque" ? `tanques de ${TANQUE()} L` : `bombas de ${BOMBA()} L`;
      const datos = () => ({ marca: NOMBRE, titulo: "Mezcla para fumigar", subtitulo: `${L.fmt(cargas, 1)} ${equipo} · ${D.sesion.perfil.nombres}`,
        destacados: [[String(m.length), "Productos en la mezcla"], [L.fmt(cargas, 1), ui.vol === "tanque" ? `Tanques de ${TANQUE()} L a aplicar` : `Bombas de ${BOMBA()} L a aplicar`]],
        secciones: [
          { titulo: `Dosis por ${volTxt()}`, filas: m.map((x) => [P(x.producto_id).nombre, fmtD(x)]) },
          { titulo: "Para comprar", filas: compra.map((c) => [c.p.nombre + (c.total !== null ? ` (${L.cantidad(c.total, c.unidad || c.p.unidad)})` : ""), c.texto ? `${c.texto}${c.costo !== null ? " · " + dinero(c.costo) : ""}` : "Ver etiqueta"]).concat([["Total de referencia", dinero(costoCompra)], [txtCostoEquipo, dinero(costoEquipoMezcla)]]) },
          { titulo: "Compatibilidad", avisos: prods.length >= 2 ? (rev.length ? rev.map((r) => ({ nivel: r.nivel === "incompatible" ? "rojo" : r.nivel === "precaucion" ? "ambar" : "verde", texto: (r.nivel === "incompatible" ? "NO MEZCLAR. " : r.nivel === "precaucion" ? "PRECAUCIÓN. " : "") + (r.a ? nombre(r.a) + " + " + nombre(r.b) + ": " : "") + (r.nota || "") })) : [{ nivel: "verde", texto: "Sin incompatibilidades registradas. Haz la prueba del frasco antes de llenar el tanque." }]) : [] },
          { titulo: "Orden de mezcla", textos: pasos },
        ], pie: pieReporte() });
      const texto = () => [`*${NOMBRE} · Mezcla para fumigar*`, `${L.fmt(cargas, 1)} ${equipo}`, "", `*Dosis por ${volTxt()}:*`].concat(m.map((x) => `• ${P(x.producto_id).nombre}: ${fmtD(x)}`))
        .concat(["", "*Para comprar:*"]).concat(compra.map((c) => `• ${c.p.nombre}: ${c.texto || "ver etiqueta"}`))
        .concat([`Total de referencia: ${dinero(costoCompra)}`, "", "*Orden de mezcla:*"]).concat(pasos).join("\n");
      conectarReporte(datos, () => `Mezcla_${new Date().toISOString().slice(0, 10)}.png`, texto);
      // receta en PDF (técnicos)
      [["recAgr", "recAgr"], ["recCult", "recCult"], ["recInd", "recInd"]].forEach(([id, k]) => { const el = $("#" + id); if (el) el.addEventListener("input", () => { ui[k] = el.value; guardarUI(); }); });
      $$("[data-via]").forEach((sel) => sel.addEventListener("change", () => { ui.recVia[sel.dataset.via] = sel.value; guardarUI(); }));
      const bRec = $("#recetar");
      if (bRec) bRec.addEventListener("click", async () => {
        const per = D.sesion.perfil, ahora = new Date();
        const tel = String(per.telefono || "").replace(/\D/g, "");
        const receta = { marca: NOMBRE, titulo: "Receta técnica", fecha: ahora.toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" }),
          tecnico: [per.nombres, per.apellidos].filter(Boolean).join(" "), telefonoTecnico: tel ? "Cel. " + tel : "", agricultor: (ui.recAgr || "").trim(), cultivo: (ui.recCult || "").trim(),
          equipo: [hayTanque ? `${L.fmt(cargas, 1)} ${cargas === 1 ? equipo.replace(/^tanques/, "tanque").replace(/^bombas/, "bomba") : equipo}` : "", haySuelo ? `${L.fmt(haSuelo, 2)} ha al suelo` : ""].filter(Boolean).join(" · "),
          productos: m.map((x, i) => [x, compra[i]]).filter(([x]) => !esSuelo(x)).map(([x, c]) => { const p = P(x.producto_id);
            return { nombre: p.nombre, ia: p.concentracion || p.ingrediente_activo || "", dosis: `${fmtD(x)} por ${volTxt()}`, via: viaDe(x), total: c.total !== null ? L.cantidad(c.total, p.unidad) + " en total" : "Ver etiqueta" }; }),
          fertilizantes: m.map((x, i) => [x, compra[i]]).filter(([x]) => esSuelo(x)).map(([x, c]) => { const p = P(x.producto_id);
            return { nombre: p.nombre, ia: p.concentracion || p.ingrediente_activo || "", dosis: fmtD(x), via: viaDe(x), total: c.texto ? c.texto + ` (${L.fmt(haSuelo, 2)} ha)` : c.total !== null ? L.cantidad(c.total, "g") : "Ver etiqueta" }; }),
          pasos, avisos: datos().secciones[2].avisos || [],
          precauciones: prods.filter((p) => (p.carencia_dias !== null && p.carencia_dias !== undefined) || (p.reingreso_horas !== null && p.reingreso_horas !== undefined))
            .map((p) => `${p.nombre}: ${p.carencia_dias !== null && p.carencia_dias !== undefined ? "carencia " + p.carencia_dias + " días" : ""}${p.carencia_dias !== null && p.carencia_dias !== undefined && p.reingreso_horas !== null && p.reingreso_horas !== undefined ? " · " : ""}${p.reingreso_horas !== null && p.reingreso_horas !== undefined ? "reingreso " + p.reingreso_horas + " h" : ""}`)
            .concat(["Lea siempre la etiqueta. Use equipo de protección personal (guantes, mascarilla, gafas y ropa larga).", "No fumigue con viento fuerte ni antes de lluvia. Lave el equipo y no contamine fuentes de agua."]),
          compras: compra.map((c) => [c.p.nombre, c.texto ? `${c.texto}${c.costo !== null && c.costo !== undefined ? " · " + dinero(c.costo) : ""}` : "Ver etiqueta"]),
          totales: [["Total de referencia", dinero(costoCompra)]].concat(hayTanque ? [[txtCostoEquipo, dinero(costoEquipoMezcla)]] : []),
          indicaciones: (ui.recInd || "").trim(), pie: pieReporte().replace(/^Reporte generado/, "Receta generada") };
        const nom = `Receta_${nombreSeguro(receta.agricultor || "mezcla")}_${ahora.toISOString().slice(0, 10)}.pdf`;
        bRec.disabled = true;
        try { const r = await Receta.compartir(receta, nom, texto()); if (r === "descargado") toast("PDF descargado. Adjúntalo en el chat de WhatsApp del agricultor."); }
        catch (e) { toast("No se pudo crear el PDF en este teléfono."); }
        bRec.disabled = false;
      });
    }
  }

  // ------------------------------------------------------------ LOTES
  function formLote(l) {
    const lo = l || {};
    const cid = lo.cultivo_id || ui.cultivo || (cultivos()[0] || {}).id;
    return `<form class="card" id="fl">
      <b>${l ? "Editar lote" : "Nuevo lote"}</b>
      <label class="campo">Nombre del lote<input name="nombre" required value="${h(lo.nombre || "Lote " + (D.lotes().length + 1))}"></label>
      <div class="grid2"><label class="campo">Cultivo<select name="cultivo_id">${cultivos().map((c) => `<option value="${h(c.id)}" ${c.id === cid ? "selected" : ""}>${h(c.nombre)}</option>`).join("")}</select></label>
      <label class="campo">Etapa actual<select name="etapa_id"><option value="">—</option>${Object.values(I.etapasLote).flat().map((e) => `<option value="${e.id}" data-c="${h(e.cultivo_id)}" ${String(lo.etapa_id) === String(e.id) ? "selected" : ""}>${h(e.nombre)}</option>`).join("")}</select></label></div>
      <div class="grid2"><label class="campo">Hectáreas<input name="hectareas" inputmode="decimal" value="${h(lo.hectareas !== undefined && lo.hectareas !== null ? lo.hectareas : "")}"></label>
      <label class="campo">N.º de plantas<input name="plantas" inputmode="numeric" value="${h(lo.plantas || "")}"></label></div>
      ${bloqueUbicacion(lo.latitud ? lo : null, { titulo: "Ubicación del lote (opcional)", texto: "Párate dentro del lote y toca el botón para guardar su punto GPS. Funciona sin internet; se envía cuando tengas señal.", boton: lo.latitud ? "Estoy en el lote: actualizar ubicación" : "Estoy en el lote: guardar ubicación" })}
      <div class="acciones"><button class="btn" type="submit">Guardar lote</button>${l ? `<button class="btn peligro" type="button" id="borrarLote">Eliminar lote</button>` : `<button class="btn sec" type="button" id="cancelar">Cancelar</button>`}</div>
    </form>`;
  }
  function conectarFormLote(l, despues) {
    const f = $("#fl"); if (!f) return;
    const filtrar = () => { $$("option[data-c]", f.etapa_id).forEach((o) => { o.hidden = o.dataset.c !== f.cultivo_id.value; }); if (f.etapa_id.selectedOptions[0] && f.etapa_id.selectedOptions[0].hidden) f.etapa_id.value = ""; };
    filtrar(); f.cultivo_id.addEventListener("change", filtrar);
    const ub = {}; conectarUbicacion(ub);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const gps = ub.latitud ? { latitud: ub.latitud, longitud: ub.longitud, precision_m: ub.precision_m, ubicacion_fecha: ub.ubicacion_fecha } : {};
      const lote = D.guardarLote(Object.assign({}, l || {}, gps, { nombre: f.nombre.value.trim() || "Lote", cultivo_id: f.cultivo_id.value, etapa_id: f.etapa_id.value ? Number(f.etapa_id.value) : null,
        hectareas: f.hectareas.value ? Number(f.hectareas.value.replace(",", ".")) : null, plantas: f.plantas.value ? parseInt(f.plantas.value, 10) : null }));
      toast("Lote guardado"); despues(lote);
    });
    const c = $("#cancelar"); if (c) c.addEventListener("click", () => despues(null));
    const b = $("#borrarLote"); if (b) b.addEventListener("click", async () => { if (await UI.confirmar("¿Eliminar este lote? Sus registros dejarán de verse.", { ok: "Eliminar", peligro: true })) { D.borrarLote(l.id); location.hash = "#/lotes"; } });
  }
  function vLotes(q) {
    const lotes = D.lotes(), regs = D.registros(), al = L.alertas(regs, lotes, hoy());
    const nuevo = q.nuevo === "1" || !lotes.length;
    const totalHa = lotes.reduce((s, l) => s + (Number(l.hectareas) || 0), 0);
    pintar(`<div class="top"><div class="fila"><div style="display:flex;flex-direction:column;gap:2px"><p>${h(D.sesion.perfil.nombres)}</p><h1>Mis lotes</h1></div><a class="icono-btn" href="#/perfil" aria-label="Mi cuenta">${ic.persona}</a></div></div>
      <main class="cont">
        ${al.map((a) => a.tipo === "carencia"
          ? `<div class="aviso rojo"><span class="pill rojo">CARENCIA</span><div><b>${h(a.lote)}:</b> no cosechar hasta el <b>${fechaCorta(a.fecha)}</b> (${a.dias} días)${a.producto ? " · " + h(a.producto) : ""}</div></div>`
          : `<div class="aviso ambar"><span class="pill ambar">RECORDATORIO</span><div><b>${h(a.lote)}:</b> ${h(a.actividad)}${a.producto ? " (" + h(a.producto) + ")" : ""} ${a.dias === 0 ? "hoy" : a.dias > 0 ? "en " + a.dias + " días" : "atrasada " + -a.dias + " días"}</div></div>`).join("")}
        ${nuevo ? formLote(null) : ""}
        <div class="fila"><div class="etq">${lotes.length} lote${lotes.length === 1 ? "" : "s"}${totalHa ? " · " + L.fmt(totalHa) + " ha" : ""}</div>${!nuevo ? `<a class="btn sec chico" href="#/lotes?nuevo=1">+ Nuevo lote</a>` : ""}</div>
        <div class="lista">${lotes.map((l) => {
          const ult = regs.find((r) => r.lote_id === l.id), et = etapa(l.etapa_id), c = cultivo(l.cultivo_id);
          const enCar = al.some((a) => a.tipo === "carencia" && a.lote_id === l.id);
          const costoLote = L.resumenCostos(regs.filter((r) => r.lote_id === l.id)).total;
          return `<a class="card" href="#/lote/${h(l.id)}" style="text-decoration:none;color:inherit">
            <div class="fila"><b style="font-size:16px">${h(l.nombre)}${c ? " · " + h(c.nombre) : ""}</b><span class="mini">${l.hectareas ? L.fmt(Number(l.hectareas)) + " ha" : ""}${l.plantas ? " · " + L.fmt(l.plantas, 0) + " pl" : ""}</span></div>
            <div class="chips" style="gap:6px">${et ? `<span class="pill verde">${h(et.nombre)}</span>` : ""}${enCar ? `<span class="pill claro-rojo">En carencia</span>` : ""}${l.latitud ? `<span class="pill gris">GPS ✓</span>` : ""}<span class="pill gris">${ult ? "Última: " + h(ult.actividad) + " · " + fechaCorta(ult.fecha) : "Sin registros"}</span><span class="pill claro-ambar">Costo actual: ${dinero(costoLote || 0)}</span></div></a>`;
        }).join("")}</div>
        ${lotes.length ? `<a class="btn" href="#/registrar">+ Registrar aplicación</a>` : ""}
      </main>`, "lotes");
    conectarFormLote(null, () => { location.hash = "#/lotes"; vLotes({}); });
  }

  function exportarExcel(regs, nombreArchivo, hectareas) {
    if (!window.XLSX) { toast("No se pudo cargar el exportador."); return; }
    const lote = (id) => D.lotes().find((l) => l.id === id) || {};
    const vacio = (v) => (v === null || v === undefined || v === "" ? "" : Number(v));
    const ordenados = regs.filter((r) => !r.borrado).slice().sort((x, y) => (x.fecha < y.fecha ? -1 : x.fecha > y.fecha ? 1 : 0));
    const filas = ordenados.map((r) => ({ Fecha: r.fecha, Lote: lote(r.lote_id).nombre || "", Actividad: r.actividad, Objetivo: r.objetivo || "", "Producto o labor": r.producto_nombre || "",
      Dosis: vacio(r.dosis), Unidad: r.unidad || "", "Quién aplicó / trabajó": r.aplicador || "", Clima: r.clima || "",
      Personas: vacio(r.personas), "Pago diario $": vacio(r.pago_diario), "Días trabajados": vacio(r.costo_mano_obra ? r.dias_trabajo || 1 : ""),
      "Costo insumos $": vacio(r.costo), "Costo mano de obra $": vacio(r.costo_mano_obra), "Costo total $": Math.round(((Number(r.costo) || 0) + (Number(r.costo_mano_obra) || 0)) * 100) / 100,
      "Carencia hasta": r.carencia_hasta || "", "Próxima aplicación": r.proxima_fecha || "", Observaciones: r.observaciones || "",
      "Ubicación lote": lote(r.lote_id).latitud ? mapaURL(lote(r.lote_id).latitud, lote(r.lote_id).longitud) : "" }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = [10, 14, 20, 22, 22, 7, 10, 18, 10, 8, 10, 9, 11, 13, 11, 12, 14, 30, 26].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    // hoja de costos de producción
    const rc = L.resumenCostos(ordenados), ha = Number(hectareas) || 0;
    const res = Object.entries(rc.por).sort((x, y) => y[1].costo - x[1].costo).map(([k, v]) => [k, v.insumos, v.mano_obra, v.costo, rc.total ? Math.round((v.costo / rc.total) * 1000) / 10 : 0]);
    const fechas = ordenados.map((r) => r.fecha);
    const aoa = [["Costos de producción"], [fechas.length ? `Del ${fechas[0]} al ${fechas[fechas.length - 1]}` : "Sin registros"], [],
      ["Actividad", "Insumos $", "Mano de obra $", "Total $", "% del total"], ...res,
      ["TOTAL", rc.insumos, rc.mano_obra, rc.total, rc.total ? 100 : 0], [],
      ["Jornales registrados (personas × días)", rc.jornales]];
    if (ha) aoa.push(["Hectáreas", ha], ["Costo de producción por ha $", Math.round((rc.total / ha) * 100) / 100], ["Insumos por ha $", Math.round((rc.insumos / ha) * 100) / 100], ["Mano de obra por ha $", Math.round((rc.mano_obra / ha) * 100) / 100]);
    const ws2 = XLSX.utils.aoa_to_sheet(aoa);
    ws2["!cols"] = [34, 12, 15, 12, 11].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws2, "Costos de producción");
    try { XLSX.writeFile(wb, nombreArchivo); } catch (e) { toast("Tu navegador no permitió la descarga."); }
  }

  const FILTROS_LOTE = [["todo", "Todo"], ["fum", "Fumigación"], ["fer", "Fertilización"], ["mo", "Mano de obra"], ["otra", "Otra"]];
  const esFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
  function periodos() {
    const t = hoy(), y = t.slice(0, 4), m = t.slice(5, 7);
    const hace = (meses) => { const d = new Date(Number(y), Number(m) - 1 - meses, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; };
    return [["", "", "Todo"], [y + "-" + m + "-01", t, "Este mes"], [hace(2), t, "Últimos 3 meses"], [y + "-01-01", t, "Este año"]];
  }
  function detalleMO(r) {
    if (!r.costo_mano_obra) return "";
    const d = Number(r.dias_trabajo) || 1;
    return `Mano de obra: ${dinero(r.costo_mano_obra)} (${L.fmt(Number(r.personas) || 0)} persona${Number(r.personas) === 1 ? "" : "s"} × ${dinero(r.pago_diario)} × ${L.fmt(d)} día${d === 1 ? "" : "s"})`;
  }
  function vLote(id, q) {
    const l = D.lotes().find((x) => x.id === id); if (!l) return vNoEncontrado();
    const desde = esFecha(q.d) ? q.d : "", hasta = esFecha(q.h) ? q.h : "";
    const todosLote = D.registros().filter((r) => r.lote_id === id && !r.borrado);
    const todos = todosLote.filter((r) => (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta));
    const filtro = FILTROS_LOTE.some(([k]) => k === q.f) ? q.f : "todo";
    const g = (r) => L.grupoActividad(r.actividad);
    const regs = todos.filter((r) => filtro === "todo" ? true : filtro === "fum" ? g(r) === "fumigacion" : filtro === "fer" ? g(r) === "fertilizacion" : filtro === "otra" ? g(r) === "otra" : Number(r.costo_mano_obra) > 0);
    const url = (cambios) => { const o = Object.assign({ f: filtro === "todo" ? "" : filtro, d: desde, h: hasta }, cambios); return `#/lote/${encodeURIComponent(id)}?` + Object.entries(o).filter(([, v]) => v).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&"); };
    const per = periodos(), perSel = per.find(([d0, h0]) => d0 === desde && h0 === hasta);
    const rc = L.resumenCostos(todos), et = etapa(l.etapa_id), c = cultivo(l.cultivo_id), ha = Number(l.hectareas) || 0;
    const colores = ["#1F5E3B", "#7FB08F", "#C9A574", "#163C5C", "#B0306A", "#4A5650", "#8A6D3B", "#5B7FA6"];
    const acts = Object.entries(rc.por).filter(([, v]) => v.costo > 0).sort((a, b) => b[1].costo - a[1].costo);
    const fechas = todos.map((r) => r.fecha).sort();
    const totalFiltro = filtro === "mo" ? regs.reduce((a, r) => a + (Number(r.costo_mano_obra) || 0), 0) : regs.reduce((a, r) => a + (Number(r.costo) || 0) + (Number(r.costo_mano_obra) || 0), 0);
    const tarjeta = (r) => {
      const ci = Number(r.costo) || 0, cm = Number(r.costo_mano_obra) || 0, monto = filtro === "mo" ? cm : ci + cm;
      const esLabor = L.grupoActividad(r.actividad) === "labor";
      return `<div class="card" style="gap:4px">
        <div class="fila"><span style="font-size:12px;font-weight:700;color:var(--verde);text-transform:uppercase">${h(r.actividad)} · ${fechaCorta(r.fecha)}</span><b>${monto ? dinero(monto) : ""}</b></div>
        <b style="font-size:14.5px">${h(r.producto_nombre || "—")}${r.dosis !== null && r.dosis !== undefined && r.dosis !== "" ? " · " + h(L.fmt(Number(r.dosis))) + " " + h(r.unidad || "") : ""}</b>
        ${r.objetivo ? `<span class="mini">Objetivo: <b>${h(r.objetivo)}</b></span>` : ""}
        ${filtro !== "mo" && ci && cm ? `<span class="mini">Insumos: ${dinero(ci)}</span>` : ""}
        ${cm ? `<span class="mini">${h(detalleMO(r))}</span>` : ""}
        <span class="mini">${[r.aplicador && (esLabor ? "Trabajó: " : "Aplicó: ") + r.aplicador, r.clima, r.carencia_hasta && "Carencia hasta " + fechaCorta(r.carencia_hasta), r.proxima_fecha && "Próxima: " + fechaCorta(r.proxima_fecha)].filter(Boolean).map(h).join(" · ")}</span>
        ${r.observaciones ? `<span class="mini">“${h(r.observaciones)}”</span>` : ""}
        <div class="fila" style="justify-content:flex-end;gap:8px"><a class="btn sec chico" href="#/registrar?editar=${encodeURIComponent(r.id)}">Editar</a><button class="btn peligro chico" data-del="${h(r.id)}">Eliminar</button></div>
      </div>`;
    };
    pintar(`${barra(l.nombre, [c && c.nombre, ha ? L.fmt(ha) + " ha" : "", et && et.nombre].filter(Boolean).join(" · "), "#/lotes")}
      <main class="cont">
        <section class="card" style="gap:8px">
          <div class="etq">Periodo</div>
          <div class="chips">${per.map(([d0, h0, t]) => `<a class="chip ${perSel && perSel[2] === t ? "sel" : ""}" href="${h(url({ d: d0, h: h0 }))}" style="text-decoration:none;display:inline-flex;align-items:center">${t}</a>`).join("")}</div>
          <div class="grid2"><label class="campo">Desde<input type="date" id="fDesde" value="${h(desde)}" max="${hoy()}"></label><label class="campo">Hasta<input type="date" id="fHasta" value="${h(hasta)}" max="${hoy()}"></label></div>
        </section>
        <section class="card">
          <div class="fila"><span class="etq">Costo de producción</span><span class="mini">${desde || hasta ? (desde ? fechaCorta(desde) : "Inicio") + " – " + (hasta ? fechaCorta(hasta) : "hoy") : fechas.length ? fechaCorta(fechas[0]) + " – " + fechaCorta(fechas[fechas.length - 1]) : ""}</span></div>
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span class="grande" style="color:var(--texto)">${dinero(rc.total)}</span>${ha ? `<span class="mini">${ha === 1 ? "por ha" : dinero(rc.total / ha) + " por ha"}</span>` : ""}</div>
          <div class="grid2">
            <div class="dato"><span>Insumos</span><b>${dinero(rc.insumos)}</b>${ha ? `<span class="mini">${ha === 1 ? "por ha" : dinero(rc.insumos / ha) + "/ha"}</span>` : ""}</div>
            <div class="dato"><span>Mano de obra</span><b>${dinero(rc.mano_obra)}</b><span class="mini">${rc.jornales ? L.fmt(rc.jornales) + " jornal" + (rc.jornales === 1 ? "" : "es") : "Sin jornales"}${ha && rc.mano_obra ? " · " + (ha === 1 ? "por ha" : dinero(rc.mano_obra / ha) + "/ha") : ""}</span></div>
          </div>
          ${rc.total > 0 ? `<div class="barra-costos" aria-hidden="true">${acts.map(([k, v], i) => `<span style="width:${(v.costo / rc.total) * 100}%;background:${colores[i % colores.length]}"></span>`).join("")}</div>` : ""}
          ${acts.map(([k, v], i) => `<div class="fila" style="font-size:13.5px"><span style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:3px;background:${colores[i % colores.length]};flex-shrink:0"></span>${h(k)}</span><b>${dinero(v.costo)}</b></div>`).join("") || `<span class="mini">${desde || hasta ? "No hay registros con costos en este periodo." : "Aún no hay registros con costos en este lote."}</span>`}
        </section>
        <div class="mini">${l.latitud ? `Ubicación del lote: ${h(Number(l.latitud).toFixed(5))}, ${h(Number(l.longitud).toFixed(5))} (±${h(l.precision_m)} m) · <a href="${h(mapaURL(l.latitud, l.longitud))}" target="_blank" rel="noopener">Ver en el mapa</a>` : `Este lote no tiene ubicación GPS. Guárdala en «Editar datos del lote» cuando estés en él.`}</div>
        <div class="acciones"><a class="btn" href="#/registrar?lote=${h(l.id)}">+ Registrar</a><button class="btn sec" id="xls">${ic.descarga}Exportar Excel</button></div>
        <div class="chips">${FILTROS_LOTE.map(([k, t]) => `<a class="chip ${filtro === k ? "sel" : ""}" href="${h(url({ f: k === "todo" ? "" : k }))}" style="text-decoration:none;display:inline-flex;align-items:center">${t}</a>`).join("")}</div>
        ${filtro !== "todo" && regs.length ? `<div class="fila mini"><span>${regs.length} registro${regs.length === 1 ? "" : "s"}</span><span>${filtro === "mo" ? "Mano de obra" : "Total"}: <b>${dinero(totalFiltro)}</b></span></div>` : ""}
        <div class="lista">${regs.map(tarjeta).join("") || `<div class="vacio">${(desde || hasta) && todosLote.length ? "No hay registros de este tipo en el periodo elegido." : filtro === "mo" ? "Aún no hay registros con mano de obra. Al registrar una actividad, llena personas y pago diario." : "Sin registros" + (filtro !== "todo" ? " de este tipo" : "") + "."}</div>`}</div>
        <details class="card"><summary>Editar datos del lote</summary>${formLote(l).replace('class="card"', 'class=""')}</details>
      </main>`, "lotes");
    $("#xls").addEventListener("click", () => exportarExcel(todos, `Costos_y_registros_${l.nombre.replace(/[^\w-]+/g, "_")}${desde || hasta ? "_" + (desde || "inicio") + "_a_" + (hasta || hoy()) : ""}.xlsx`, ha));
    const cambiarFechas = () => { const d0 = $("#fDesde").value, h0 = $("#fHasta").value; if (d0 && h0 && d0 > h0) { toast("La fecha «Desde» debe ser anterior a «Hasta»."); return; } location.hash = url({ d: d0, h: h0 }); };
    $("#fDesde").addEventListener("change", cambiarFechas); $("#fHasta").addEventListener("change", cambiarFechas);
    $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (await UI.confirmar("¿Eliminar este registro?", { ok: "Eliminar", peligro: true })) { D.borrarRegistro(b.dataset.del); vLote(id, q); } }));
    conectarFormLote(l, () => vLote(id, q));
  }

  // ------------------------------------------------------------ REGISTRAR APLICACIÓN
  const ACTIVIDADES = ["Fumigación planta", "Fumigación suelo", "Fertilización al suelo", "Fertilización foliar", "Enmienda", "Herbicida", "Labor cultural", "Otra"];
  const CLIMAS = ["Despejado", "Nublado", "Soleado", "Llovizna"];
  const LABORES = ["Poda", "Deshierbe manual", "Limpieza de plantas", "Polinización", "Amarre y tutoreo", "Raleo de frutos", "Embolsado de frutos", "Cosecha", "Riego", "Siembra", "Mantenimiento de postes"];
  const esLabor = (a) => a === "Labor cultural";
  // sugerencias para el campo «Objetivo» según el tipo de actividad (el agricultor puede escribir lo que quiera)
  function objetivosPara(actividad, loteId) {
    const g = L.grupoActividad(actividad), lo = D.lotes().find((l) => l.id === loteId), cid = lo ? lo.cultivo_id : null;
    const probs = (I.c.problemas || []).filter((p) => (!cid || p.cultivo_id === cid));
    if (g === "fumigacion") {
      if (/Herbic/.test(actividad)) return probs.filter((p) => p.tipo === "maleza").map((p) => "Control de " + p.nombre.toLowerCase()).concat(["Control de malezas"]);
      return ["Prevención de hongos"].concat(probs.filter((p) => p.tipo === "plaga" || p.tipo === "enfermedad").map((p) => "Control de " + p.nombre.replace(/\s*\(.*?\)/g, "").toLowerCase()), ["Protección de flores", "Protección de frutos"]);
    }
    if (g === "fertilizacion") return ["Enraizamiento", "Desarrollo de pencas", "Brotación", "Floración", "Cuajado", "Engrose de fruto", "Recuperación de estrés", "Corregir acidez del suelo", "Mantenimiento"];
    if (g === "labor") return ["Sanidad del cultivo", "Mejorar la floración", "Control de malezas", "Mejorar la ventilación", "Mejorar el tamaño del fruto", "Cosecha"];
    return [];
  }
  const porNombre = (t) => { const n = String(t || "").trim().toLowerCase(); return n ? (I.c.productos || []).find((p) => p.nombre.toLowerCase() === n) || null : null; };
  function costoAuto(pid, total) {
    const p = P(pid); if (!p || !p.pvp || !p.contenido || !total) return "";
    return (Math.round((Number(total) / Number(p.contenido)) * Number(p.pvp) * 100) / 100).toFixed(2);
  }
  function vRegistrar(q) {
    const lotes = D.lotes();
    if (!lotes.length) { toast("Primero crea un lote"); location.hash = "#/lotes?nuevo=1"; return; }
    const pf = prefill || {}; prefill = null;
    if (q.p) pf.lineas = [{ producto_id: Number(q.p) }];
    const st = { cargas: pf.cargas || "", actividad: ACTIVIDADES.includes(pf.actividad) ? pf.actividad : "Fumigación planta", clima: "Despejado", lineas: (pf.lineas && pf.lineas.length ? pf.lineas : [{}]).map((x) => Object.assign({ costo: costoAuto(x.producto_id, x.total), manual: false }, x)) };
    // edición de un registro ya guardado (cada producto de una mezcla es un registro aparte)
    const ed = q.editar ? D.registros().find((r) => r.id === q.editar && !r.borrado) : null;
    if (q.editar && !ed) { toast("Ese registro ya no existe."); location.hash = q.lote ? "#/lote/" + q.lote : "#/lotes"; return; }
    if (ed) {
      Object.assign(st, { actividad: ed.actividad || "Otra", clima: ed.clima || "", objetivo: ed.objetivo || "", aplicador: ed.aplicador || "",
        personas: ed.personas !== null && ed.personas !== undefined ? String(ed.personas) : "", pago: ed.pago_diario !== null && ed.pago_diario !== undefined ? String(ed.pago_diario) : "",
        diasT: ed.dias_trabajo ? String(ed.dias_trabajo) : "1", labor: esLabor(ed.actividad) ? ed.producto_nombre || "" : "",
        lineas: [{ producto_id: ed.producto_id, producto_nombre: ed.producto_nombre || "", dosis: ed.dosis, unidad: ed.unidad || "", costo: ed.costo !== null && ed.costo !== undefined ? ed.costo : "", manual: true }] });
    }
    const loteSel = ed ? ed.lote_id : q.lote || (lotes.length === 1 ? lotes[0].id : "");
    const volver = ed ? "#/lote/" + ed.lote_id : q.lote ? "#/lote/" + q.lote : "#/lotes";
    function linea(x, i) {
      const p = P(x.producto_id);
      return `<div class="card" data-l="${i}" style="gap:8px;background:#FAFBF8">
        <div class="fila"><b style="font-size:13.5px">${ed ? "Producto" : "Producto " + (i + 1)}</b>${st.lineas.length > 1 && !ed ? `<button type="button" class="icono-btn" data-quitar="${i}" aria-label="Quitar producto ${i + 1}">✕</button>` : ""}</div>
        <label class="campo"><span class="sr">Producto</span><input data-k="producto_nombre" list="lista-productos" autocomplete="off" placeholder="Escribe el nombre del producto" value="${h(x.producto_nombre || (p ? p.nombre : ""))}"></label>
        <div class="grid2"><label class="campo">Dosis<input data-k="dosis" inputmode="decimal" value="${h(x.dosis !== undefined && x.dosis !== null ? Math.round(x.dosis * 100) / 100 : "")}"></label>
        <label class="campo">Unidad<input data-k="unidad" list="unidades" value="${h(x.unidad || (p ? (p.modo_aplicacion === "suelo_ha" ? "g/planta" : (p.unidad || "cc") + "/bomba") : ""))}"></label></div>
        <div class="grid2"><label class="campo">Total usado<span class="unido"><input data-k="total" inputmode="decimal" value="${h(x.total !== undefined && x.total !== null ? Math.round(x.total) : "")}"><span>${p ? (p.modo_aplicacion === "tanque" ? h(p.unidad || "cc") : "g") : ""}</span></span></label>
        <label class="campo">Costo $<input data-k="costo" inputmode="decimal" value="${h(x.costo)}" placeholder="0,00"></label></div>
        ${p && p.carencia_dias ? `<span class="mini">Carencia: ${h(p.carencia_dias)} días</span>` : ""}
      </div>`;
    }
    function pintarForm() {
      const lab = esLabor(st.actividad);
      pintar(`${barra(ed ? "Editar registro" : "Nuevo registro", "Actividades y costos de la finca", volver)}
        <form class="cont" id="fr" novalidate>
          <datalist id="lista-productos">${(I.c.productos || []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((p) => `<option value="${h(p.nombre)}">`).join("")}</datalist>
          <datalist id="unidades"><option value="cc/bomba"><option value="g/bomba"><option value="cc/tanque"><option value="g/tanque"><option value="g/planta"><option value="kg/ha"><option value="L/ha"></datalist>
          <datalist id="labores">${LABORES.map((x) => `<option value="${h(x)}">`).join("")}</datalist>
          <div class="grid2"><label class="campo">Lote<select name="lote" required><option value="">Elige…</option>${lotes.map((l) => `<option value="${h(l.id)}" ${l.id === loteSel ? "selected" : ""}>${h(l.nombre)}</option>`).join("")}</select></label>
          <label class="campo">Fecha<input name="fecha" type="date" value="${hoy()}" max="${hoy()}" required></label></div>
          <div class="campo">Actividad<div class="chips" role="group" aria-label="Actividad">${ACTIVIDADES.concat(ACTIVIDADES.includes(st.actividad) ? [] : [st.actividad]).map((a) => `<button type="button" class="chip ${st.actividad === a ? "sel" : ""}" data-act="${h(a)}" aria-pressed="${st.actividad === a}">${h(a)}</button>`).join("")}</div></div>
          <label class="campo">Objetivo de la ${lab ? "labor" : "aplicación"}<input name="objetivo" list="objetivos" autocomplete="off" value="${h(st.objetivo || "")}" placeholder="${lab ? "Ej. Sanidad del cultivo" : L.grupoActividad(st.actividad) === "fertilizacion" ? "Ej. Floración" : "Ej. Control de avispas"}"><small>Opcional. Escribe para qué la hiciste.</small></label>
          <datalist id="objetivos">${objetivosPara(st.actividad, loteSel).map((x) => `<option value="${h(x)}">`).join("")}</datalist>
          ${lab ? `<label class="campo">¿Qué labor hiciste?<input name="labor" list="labores" autocomplete="off" placeholder="Ej. Poda, deshierbe, cosecha" value="${h(st.labor || "")}"></label>` : `
          <label class="campo">¿Cuántas bombas o tanques aplicaste?<span class="unido"><input name="cargas" inputmode="decimal" value="${h(st.cargas || "")}" placeholder="Ej. 10"><span>cargas</span></span><small>${ed ? "Llénalo solo si quieres recalcular el total y el costo." : "Con esto se calcula el total usado y el costo de cada producto."}</small></label>
          <div class="etq">Productos aplicados</div>
          <div class="lista" id="lineas">${st.lineas.map(linea).join("")}</div>
          ${ed ? "" : `<button type="button" class="btn sec chico" id="masLinea">+ Agregar otro producto de la mezcla</button>`}`}
          <div class="card" style="gap:10px">
            <div class="fila"><b style="font-size:14px">Mano de obra</b><span class="mini">${lab ? "" : "Opcional"}</span></div>
            <label class="campo">${lab ? "¿Quién trabajó?" : "¿Quién aplicó?"}<input name="aplicador" value="${h(st.aplicador !== undefined ? st.aplicador : S.get("ultimo_aplicador", ""))}" placeholder="Nombre o nombres"></label>
            <div class="grid2" style="grid-template-columns:repeat(3,minmax(0,1fr))">
              <label class="campo">Personas<input name="personas" inputmode="numeric" value="${h(st.personas || "")}" placeholder="Ej. 2"></label>
              <label class="campo">Pago diario<span class="unido"><span>$</span><input name="pago" inputmode="decimal" value="${h(st.pago !== undefined ? st.pago : S.get("ultimo_pago", ""))}" placeholder="15"></span></label>
              <label class="campo">Días<input name="diasT" inputmode="decimal" value="${h(st.diasT || "1")}"></label>
            </div>
            <div class="fila" style="font-size:14px"><span>Costo de mano de obra</span><b id="costoMO">—</b></div>
            <small class="mini">Pago diario por persona. Si trabajaron medio día, pon 0,5 en días.</small>
          </div>
          <div class="campo">${lab ? "Clima" : "Clima al aplicar"}<div class="grid2" style="grid-template-columns:repeat(4,minmax(0,1fr))">${CLIMAS.map((c) => `<button type="button" class="chip ${st.clima === c ? "sel" : ""}" data-clima="${c}" aria-pressed="${st.clima === c}" style="padding:8px 2px;font-size:13px">${c}</button>`).join("")}</div></div>
          <label class="campo">Observaciones<textarea name="obs" placeholder="Ej.: se vio menos daño en flores"></textarea></label>
          <div class="card"><label class="fila" style="font-weight:600;font-size:14px">Recordarme la próxima ${lab ? "labor" : "aplicación"}<input type="checkbox" name="rec" checked style="width:24px;height:24px;accent-color:var(--verde)"></label>
            <label class="campo">En cuántos días<span class="unido"><input name="dias" inputmode="numeric" value="${h(S.get("ultimos_dias", 7))}"><span>días</span></span></label></div>
          <p class="mini" id="err" role="alert" style="color:var(--rojo);margin:0"></p>
          <button class="btn" type="submit">${ed ? "Guardar cambios" : "Guardar registro"}</button>
        </form>`, "lotes");
      conectarForm();
    }
    function leerLineas() {
      $$("#lineas [data-l]").forEach((card) => { const i = Number(card.dataset.l); $$("[data-k]", card).forEach((el) => { st.lineas[i][el.dataset.k] = el.value; }); });
    }
    function conectarForm() {
      const f = $("#fr");
      $$("[data-act]").forEach((b) => b.addEventListener("click", () => {
        leerLineas(); const antes = esLabor(st.actividad); st.actividad = b.dataset.act;
        if (antes !== esLabor(st.actividad)) { guardarCampos(); pintarForm(); restaurarCampos(); return; }
        $$("[data-act]").forEach((x) => { x.classList.toggle("sel", x === b); x.setAttribute("aria-pressed", x === b); });
        refrescarObjetivos();
      }));
      function refrescarObjetivos() {
        $("#objetivos").innerHTML = objetivosPara(st.actividad, f.lote.value).map((x) => `<option value="${h(x)}">`).join("");
        f.objetivo.placeholder = L.grupoActividad(st.actividad) === "fertilizacion" ? "Ej. Floración" : esLabor(st.actividad) ? "Ej. Sanidad del cultivo" : "Ej. Control de avispas";
      }
      f.lote.addEventListener("change", refrescarObjetivos);
      const pintarMO = () => { const c = L.costoManoObra(f.personas.value, f.pago.value, f.diasT.value); $("#costoMO").textContent = c !== null ? dinero(c) : "—"; };
      ["personas", "pago", "diasT"].forEach((k) => f[k].addEventListener("input", pintarMO)); pintarMO();
      $$("[data-clima]").forEach((b) => b.addEventListener("click", () => { st.clima = b.dataset.clima; $$("[data-clima]").forEach((x) => x.classList.toggle("sel", x === b)); }));
      if (f.cargas) f.cargas.addEventListener("input", () => {
        leerLineas(); st.cargas = f.cargas.value; const n = Number(String(f.cargas.value).replace(",", "."));
        if (ed && n > 0) st.lineas.forEach((x) => { x.manual = false; });
        $$("#lineas [data-l]").forEach((card) => {
          const x = st.lineas[Number(card.dataset.l)], u = String(x.unidad || "");
          if (!n || !x.dosis || !u.includes("/") || /planta|ha/.test(u)) return;
          x.total = Math.round(Number(String(x.dosis).replace(",", ".")) * n * 10) / 10;
          $('[data-k="total"]', card).value = x.total;
          if (!x.manual) { x.costo = costoAuto(x.producto_id, x.total); $('[data-k="costo"]', card).value = x.costo; }
        });
      });
      if ($("#masLinea")) $("#masLinea").addEventListener("click", () => { leerLineas(); st.lineas.push({ costo: "", manual: false }); guardarCampos(); pintarForm(); restaurarCampos(); });
      $$("[data-quitar]").forEach((b) => b.addEventListener("click", () => { leerLineas(); st.lineas.splice(Number(b.dataset.quitar), 1); guardarCampos(); pintarForm(); restaurarCampos(); }));
      $$("#lineas [data-l]").forEach((card) => {
        const i = Number(card.dataset.l);
        $('[data-k="producto_nombre"]', card).addEventListener("change", (e) => { leerLineas(); const p = porNombre(e.target.value); st.lineas[i].producto_id = p ? p.id : null; if (p && !st.lineas[i].dosis) { const d = L.dosisDe(p); st.lineas[i].dosis = d.modo === "tanque" && d.min !== null ? d.min * BOMBA() / TANQUE() : d.min; st.lineas[i].unidad = d.modo === "tanque" ? p.unidad + "/bomba" : d.modo === "sitio" ? "g/planta" : "kg/ha"; } st.lineas[i].costo = costoAuto(st.lineas[i].producto_id, st.lineas[i].total); guardarCampos(); pintarForm(); restaurarCampos(); });
        $('[data-k="total"]', card).addEventListener("input", (e) => { const x = st.lineas[i]; x.total = e.target.value; if (!x.manual) { x.costo = costoAuto(x.producto_id, String(e.target.value).replace(",", ".")); $('[data-k="costo"]', card).value = x.costo; } });
        $('[data-k="costo"]', card).addEventListener("input", () => { st.lineas[i].manual = true; });
      });
      f.addEventListener("submit", (e) => {
        e.preventDefault(); leerLineas();
        const err = $("#err");
        if (!f.lote.value) { err.textContent = "Elige el lote."; return; }
        st.lineas.forEach((x) => { const p = porNombre(x.producto_nombre); x.producto_id = p ? p.id : null; });
        const lab = esLabor(st.actividad);
        const lineas = lab ? [] : st.lineas.filter((x) => String(x.producto_nombre || "").trim());
        if (lab && !f.labor.value.trim()) { err.textContent = "Escribe qué labor hiciste."; return; }
        if (!lab && !lineas.length && st.actividad !== "Otra") { err.textContent = "Escribe al menos un producto."; return; }
        const mo = L.costoManoObra(f.personas.value, f.pago.value, f.diasT.value);
        if (f.personas.value.trim() && mo === null) { err.textContent = "Para la mano de obra llena personas, pago diario y días con números."; return; }
        const n = (v) => (v === "" || v === undefined || v === null ? null : Number(String(v).replace(",", ".")));
        const dias = f.rec.checked ? parseInt(f.dias.value, 10) : null;
        S.set("ultimo_aplicador", f.aplicador.value); if (dias) S.set("ultimos_dias", dias); if (f.pago.value.trim()) S.set("ultimo_pago", f.pago.value.trim());
        const base = { lote_id: f.lote.value, fecha: f.fecha.value || hoy(), actividad: st.actividad, objetivo: f.objetivo.value.trim() || null, aplicador: f.aplicador.value.trim() || null, clima: st.clima, observaciones: f.obs.value.trim() || null };
        const manoObra = mo !== null ? { personas: n(f.personas.value), pago_diario: n(f.pago.value), dias_trabajo: n(f.diasT.value) || 1, costo_mano_obra: mo } : {};
        const lista = (lineas.length ? lineas : [lab ? { producto_nombre: f.labor.value.trim() } : {}]).map((x, i) => {
          const p = lab ? null : P(x.producto_id);
          return Object.assign({}, base, { producto_id: p ? Number(p.id) : null, producto_nombre: p ? p.nombre : (String(x.producto_nombre || "").trim() || null), dosis: n(x.dosis), unidad: x.unidad || null, costo: n(x.costo),
            carencia_hasta: p && p.carencia_dias ? L.sumarDias(base.fecha, p.carencia_dias) : null, proxima_fecha: i === 0 && dias ? L.sumarDias(base.fecha, dias) : null }, i === 0 ? manoObra : {});
        });
        if (ed) {
          const nuevo = Object.assign({}, lista[0], { id: ed.id, creado: ed.creado, borrado: false });
          ["personas", "pago_diario", "dias_trabajo", "costo_mano_obra"].forEach((k) => { if (!(k in nuevo)) nuevo[k] = null; });
          D.guardarRegistros([nuevo]);
          toast(navigator.onLine === false ? "Cambios guardados. Se enviarán cuando tengas señal." : "Cambios guardados");
          location.hash = "#/lote/" + base.lote_id; return;
        }
        D.guardarRegistros(lista);
        toast(navigator.onLine === false ? "Guardado. Se enviará cuando tengas señal." : "Registro guardado");
        location.hash = "#/lote/" + base.lote_id;
      });
    }
    let campos = {};
    function guardarCampos() {
      const f = $("#fr"); if (!f) return;
      if (f.cargas) st.cargas = f.cargas.value; if (f.labor) st.labor = f.labor.value;
      st.objetivo = f.objetivo.value; st.aplicador = f.aplicador.value; st.personas = f.personas.value; st.pago = f.pago.value; st.diasT = f.diasT.value;
      campos = { lote: f.lote.value, fecha: f.fecha.value, obs: f.obs.value, rec: f.rec.checked, dias: f.dias.value };
    }
    function restaurarCampos() { const f = $("#fr"); if (!f || !campos.fecha) return; f.lote.value = campos.lote; f.fecha.value = campos.fecha; f.obs.value = campos.obs; f.rec.checked = campos.rec; f.dias.value = campos.dias; }
    if (ed) campos = { lote: ed.lote_id, fecha: ed.fecha, obs: ed.observaciones || "", rec: !!ed.proxima_fecha, dias: ed.proxima_fecha ? String(L.diasEntre(ed.fecha, ed.proxima_fecha)) : String(S.get("ultimos_dias", 7)) };
    pintarForm(); restaurarCampos();
  }

  // ------------------------------------------------------------ PERFIL
  // tipo de cuenta: pasar a técnico agrícola necesita aprobación del administrador; volver a agricultor es inmediato
  function cardTipoCuenta(p) {
    const fecha = p.rol_solicitado_fecha ? new Date(p.rol_solicitado_fecha).toLocaleDateString("es-EC", { dateStyle: "medium" }) : "";
    let cuerpo;
    if (p.rol === "tecnico") cuerpo = `<p class="mini" style="margin:0">Ves la información técnica: grupos químicos funcionales y otras opciones de productos.</p>
      <button class="btn sec chico" data-rol="agricultor">Cambiar a agricultor</button>`;
    else if (p.rol_solicitado === "tecnico") cuerpo = `<div class="aviso azul" style="padding:8px 10px">${ic.alerta}<div>Pediste cambiar a <b>Técnico agrícola</b>${fecha ? " el " + h(fecha) : ""}. Tu asesor debe aprobarlo; el cambio se verá al sincronizar.</div></div>
      <button class="btn sec chico" data-rol="cancelar">Cancelar solicitud</button>`;
    else cuerpo = `<p class="mini" style="margin:0">Si eres técnico agrícola puedes pedir el cambio. Tu asesor lo revisa y lo aprueba.</p>
      <button class="btn sec chico" data-rol="tecnico">Solicitar cambio a técnico agrícola</button>`;
    return `<section class="card"><div class="fila"><span class="mini">Tipo de cuenta</span><b>${p.rol === "tecnico" ? "Técnico agrícola" : "Agricultor"}</b></div>${cuerpo}</section>`;
  }
  function vPerfil() {
    const p = D.sesion.perfil, cat = D.catalogo || {}, ub = {};
    pintar(`${barra("Mi cuenta", p.rol === "tecnico" ? "Técnico agrícola" : "Agricultor", "#/")}
      <main class="cont">
        <form class="card" id="fp">
          <div class="dato"><span>Cédula (para ingresar)</span><b>${h(p.cedula)}</b></div>
          <label class="campo">Nombres<input name="nombres" value="${h(p.nombres)}"></label>
          <label class="campo">Celular<input name="telefono" type="tel" value="${h(p.telefono || "")}"></label>
          <div class="grid2"><label class="campo">Provincia<select name="provincia"><option value="">—</option>${PROVINCIAS.map((x) => `<option ${x === p.provincia ? "selected" : ""}>${h(x)}</option>`).join("")}</select></label>
          <label class="campo">Sector del cultivo<input name="sector" value="${h(p.sector || "")}"></label></div>
          <div class="grid2"><label class="campo">Cultivo principal<select name="cultivo_id">${cultivos().map((c) => `<option value="${h(c.id)}" ${c.id === p.cultivo_id ? "selected" : ""}>${h(c.nombre)}</option>`).join("")}</select></label>
          <label class="campo">Hectáreas<input name="hectareas" inputmode="decimal" value="${h(p.hectareas === null || p.hectareas === undefined ? "" : p.hectareas)}"></label></div>
          <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--suave)"><input type="checkbox" name="acepta" ${p.acepta_seguimiento !== false ? "checked" : ""} style="width:22px;height:22px;margin:0;accent-color:var(--verde)"> Mi asesor puede ver mis registros y la ubicación de mi finca.</label>
          <button class="btn" type="submit">Guardar cambios</button>
        </form>
        ${bloqueUbicacion(p)}
        ${cardTipoCuenta(p)}
        <section class="card">
          <div class="fila"><span class="mini">Información técnica</span><b>Versión ${h(cat.version || "—")}</b></div>
          <div class="fila"><span class="mini">Última sincronización</span><b>${D.ultimaSync ? new Date(D.ultimaSync).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" }) : "—"}</b></div>
          <div class="fila"><span class="mini">Pendientes de enviar</span><b>${D.hayPendientes()}</b></div>
          <button class="btn sec" id="sync">Sincronizar ahora</button>
        </section>
        ${D.modoDemo ? `<a class="btn azul" href="admin.html">Abrir panel del administrador (demo)</a>` : ""}
        ${cardInstalar(true)}
        <button class="btn peligro" id="salir">Cerrar sesión</button>
        <p class="mini" style="text-align:center">${h(NOMBRE)} · Asesoría técnica Ecuaquímica. Recomendaciones referenciales: lee siempre la etiqueta del producto.</p>
      </main>`, null);
    ub.alGuardar = async (u) => {
      try { await D.actualizarPerfil(u); toast("Ubicación de la finca guardada"); }
      catch (er) { toast(er.codigo === "red" ? "Ubicación tomada, pero necesitas internet para guardarla. Vuelve a tocar el botón cuando tengas señal." : er.message); }
    };
    conectarUbicacion(ub);
    $$("[data-rol]").forEach((b) => b.addEventListener("click", async () => {
      const rol = b.dataset.rol;
      if (rol === "agricultor" && !(await UI.confirmar("Dejarás de ver la información técnica de grupos químicos. Para volver a ser técnico agrícola necesitarás otra aprobación. ¿Cambiar a agricultor?", { ok: "Cambiar a agricultor" }))) return;
      try {
        await D.solicitarRol(rol);
        toast(rol === "tecnico" ? (D.sesion.perfil.rol === "tecnico" ? "Ahora tu cuenta es de técnico agrícola" : "Solicitud enviada. Tu asesor la revisará.") : rol === "cancelar" ? "Solicitud cancelada" : "Ahora tu cuenta es de agricultor");
        vPerfil();
      } catch (er) { toast(er.codigo === "red" ? "Necesitas internet para cambiar el tipo de cuenta." : er.message); }
    }));
    $("#fp").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target;
      try { await D.actualizarPerfil({ nombres: f.nombres.value, telefono: f.telefono.value, provincia: f.provincia.value, sector: f.sector.value, cultivo_id: f.cultivo_id.value, hectareas: f.hectareas.value.replace(",", "."), acepta_seguimiento: f.acepta.checked }); toast("Datos guardados"); }
      catch (er) { toast(er.codigo === "red" ? "Necesitas internet para cambiar tus datos." : er.message); }
    });
    $("#sync").addEventListener("click", async () => { if (navigator.onLine === false) return toast("Sin conexión"); await D.actualizarCatalogo(); await D.sincronizar(); toast("Todo sincronizado"); vPerfil(); });
    $("#salir").addEventListener("click", async () => {
      if (D.hayPendientes() && navigator.onLine === false && !(await UI.confirmar("Tienes registros sin enviar. Si cierras sesión sin internet se perderán. ¿Cerrar igual?", { ok: "Cerrar sesión", peligro: true }))) return;
      await D.salir(); location.hash = "#/entrar"; router();
    });
  }

  function vNoEncontrado() { pintar(`${barra("No encontrado", "", "#/")}<main class="cont"><div class="vacio">Esta información ya no está disponible. Puede que tu asesor la haya actualizado.</div><a class="btn" href="#/">Ir al inicio</a></main>`, "inicio"); }

  // ------------------------------------------------------------ router
  function router() {
    if (!D.catalogo) { $("#app").innerHTML = `<div class="cargando">Cargando información técnica…<br><small>La primera vez necesitas internet.</small></div>`; return; }
    if (!I || I.c !== D.catalogo) indexar();
    const [ruta, qs] = (location.hash.slice(1) || "/").split("?");
    const q = Object.fromEntries(new URLSearchParams(qs || ""));
    const seg = ruta.split("/").filter(Boolean).map(decodeURIComponent);
    if (!D.sesion) return vBienvenida(seg[0] === "registro" ? "registro" : "entrar");
    switch (seg[0]) {
      case undefined: return vInicio();
      case "entrar": case "registro": location.hash = "#/"; return vInicio();
      case "cultivo": return vCultivo(seg[1]);
      case "problema": return vProblema(seg[1]);
      case "plan": return vPlan(seg[1]);
      case "fertilizacion": return vFert(seg[1]);
      case "calcular": return vCalcular(q);
      case "mezcla": return vMezcla();
      case "portafolio": return esTecnico() ? vPortafolio() : vNoEncontrado();
      case "lotes": return vLotes(q);
      case "lote": return vLote(seg[1], q);
      case "registrar": return vRegistrar(q);
      case "perfil": return vPerfil();
      default: return vNoEncontrado();
    }
  }
  window.addEventListener("hashchange", router);
  // tocar "Inicio" en la barra de abajo siempre deja el inicio limpio: borra la búsqueda de problemas y vuelve arriba
  document.addEventListener("click", (e) => {
    const a = e.target.closest(".nav a[href='#/']"); if (!a) return;
    ui.consulta = ""; guardarUI();
    if ((location.hash || "#/") === "#/") { e.preventDefault(); vInicio(); window.scrollTo(0, 0); }
  });
  D.alCambiar((que) => {
    if (que === "catalogo" || que === "catalogo_actualizado") {
      indexar(); precargarFotos();
      if (!/^#\/registrar/.test(location.hash)) router();
      if (que === "catalogo_actualizado") toast("Tu asesor actualizó la información técnica");
    }
    if (que === "sesion" && !D.sesion) router();
  });
  window.addEventListener("online", () => { D.actualizarCatalogo(); D.sincronizar(); const e = $(".estado"); if (e) { e.classList.remove("off"); e.lastChild.textContent = "En línea"; } });
  window.addEventListener("offline", () => { const e = $(".estado"); if (e) { e.classList.add("off"); e.lastChild.textContent = "Sin conexión"; } });

  (async function iniciar() {
    router();
    await D.actualizarCatalogo();
    if (!I || I.c !== D.catalogo) { indexar(); router(); }
    D.sincronizar();
    setInterval(() => { D.actualizarCatalogo(); D.sincronizar(); }, 5 * 60 * 1000);
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      // cuando se publica una versión nueva, la app se recarga sola para usarla
      const habiaVersion = !!navigator.serviceWorker.controller; let recargado = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => { if (habiaVersion && !recargado) { recargado = true; location.reload(); } });
      navigator.serviceWorker.register("sw.js").then((reg) => { reg.update().catch(() => {}); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); }); }).catch(() => {});
    }
  })();
})();

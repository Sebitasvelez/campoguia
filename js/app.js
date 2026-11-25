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
      etapas: by((c.etapas || []).slice().sort((a, b) => a.orden - b.orden), "cultivo_id"),
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
  const RIESGO = { bajo: ["verde", "Riesgo bajo de sarna/hongos"], ligero: ["claro-ambar", "Riesgo ligero de sarna/hongos"], alto: ["claro-rojo", "Riesgo alto de sarna/hongos"] };

  // ------------------------------------------------------------ íconos
  const ic = {
    atras: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    flecha: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    casa: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9H3z"/></svg>',
    calc: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/></svg>',
    lotes: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18v12H3zM9 6v12M15 6v12"/></svg>',
    mezcla: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/></svg>',
    persona: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    wa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg>',
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
    const it = [["#/", "Inicio", ic.casa, "inicio"], ["#/lotes", "Mis lotes", ic.lotes, "lotes"], ["#/calcular", "Calcular", ic.calc, "calcular"], ["#/mezcla", "Mezcla", ic.mezcla, "mezcla"]];
    return `<nav class="nav" aria-label="Principal">${it.map(([href, t, i, k]) => `<a href="${href}" class="${sel === k ? "sel" : ""}" ${sel === k ? 'aria-current="page"' : ""}>${i}${t}</a>`).join("")}</nav>`;
  }
  const demoBanner = () => (D.modoDemo ? `<div class="demo">Modo demostración: los datos se guardan solo en este equipo.</div>` : "");
  function pintar(html, navSel) {
    const app = $("#app");
    app.innerHTML = `<div class="app">${demoBanner()}${html}</div>${navSel === null ? "" : nav(navSel)}`;
    window.scrollTo(0, 0);
  }
  const opcionesProductos = (selId, filtro) => {
    const grupos = {};
    (I.c.productos || []).filter(filtro || (() => true)).forEach((p) => { (grupos[p.categoria] = grupos[p.categoria] || []).push(p); });
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
  const conectarVol = (re) => $$("[data-vol]").forEach((b) => b.addEventListener("click", () => { ui.vol = b.dataset.vol; guardarUI(); re(); }));
  const avisoSeguridad = () => `<div class="aviso ambar">${ic.alerta}<div>Usa guantes, mascarilla, gafas y ropa de manga larga. No fumigues con viento fuerte ni antes de lluvia. ${h(aj("aviso_legal", "Lee siempre la etiqueta."))}</div></div>`;
  function agregarAMezcla(pid, dosisTanque) {
    const m = S.get("mezcla", []);
    if (!m.some((x) => String(x.producto_id) === String(pid))) { m.push({ producto_id: Number(pid), dosis_tanque: dosisTanque }); S.set("mezcla", m); toast("Agregado a tu mezcla"); }
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
    const intro = `<div class="top" style="padding-top:36px"><h1 style="font-size:28px">${h(NOMBRE)}</h1><p>Manual técnico de tu cultivo y registro de las actividades de tu finca. Funciona también sin internet.</p></div>`;
    if (modo === "registro") {
      const ub = {};
      pintar(`${intro}<form class="cont" id="f" novalidate>
        <h2 style="font-size:20px">Crea tu cuenta</h2>
        <label class="campo">Número de cédula<input name="cedula" inputmode="numeric" maxlength="10" autocomplete="off" required><small id="cedEstado">Con tu cédula ingresarás a la app.</small></label>
        <label class="campo">Nombres y apellidos<input name="nombres" autocomplete="name" required></label>
        <label class="campo">Número de celular<input name="telefono" type="tel" inputmode="tel" placeholder="09X XXX XXXX" required></label>
        <div class="grid2"><label class="campo">Provincia<select name="provincia" required><option value="">Elige…</option>${PROVINCIAS.map((p) => `<option>${h(p)}</option>`).join("")}</select></label>
        <label class="campo">Sector del cultivo<input name="sector" placeholder="Comunidad o parroquia" required></label></div>
        <div class="grid2"><label class="campo">Cultivo principal<select name="cultivo_id">${cultOpts}</select></label>
        <label class="campo">Hectáreas<input name="hectareas" inputmode="decimal" placeholder="Ej. 2"></label></div>
        <label class="campo">Soy<select name="rol"><option value="agricultor">Agricultor</option><option value="tecnico">Técnico de almacén</option></select></label>
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
        } catch (er) { $("#err").textContent = er.codigo === "red" ? "Para crear tu cuenta necesitas internet. Inténtalo cuando tengas señal." : er.message; b.disabled = false; }
      });
      return;
    }
    pintar(`${intro}<form class="cont" id="f" novalidate>
      <h2 style="font-size:20px">Ingresa con tu cédula</h2>
      <label class="campo">Número de cédula<input name="cedula" inputmode="numeric" maxlength="10" autocomplete="off" required></label>
      <p class="mini" id="err" role="alert" style="color:var(--rojo);margin:0"></p>
      <button class="btn" type="submit">Ingresar</button>
      <div class="linea-sep"></div>
      <a class="btn sec" href="#/registro">Crear cuenta nueva</a>
    </form>`, null);
    $("#f").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target, b = f.querySelector("button"); $("#err").textContent = "";
      if (!D.cedulaValida(f.cedula.value)) { $("#err").textContent = "La cédula no es válida. Revisa los 10 dígitos."; return; }
      b.disabled = true;
      try { await D.ingresar(f.cedula.value); ui.cultivo = D.sesion.perfil.cultivo_id || ui.cultivo; guardarUI(); location.hash = "#/"; router(); }
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
        <div class="etq">Elige tu cultivo</div>
        <div class="grid2">${cultivos().map((c) => `<a class="cultivo ${c.id === ui.cultivo ? "sel" : ""}" href="#/cultivo/${h(c.id)}" data-c="${h(c.id)}"><span style="color:var(--verde)">${ic.hoja}</span><b>${h(c.nombre)}</b><span>Manual técnico · ${(I.problemas[c.id] || []).length} temas</span></a>`).join("")}</div>
        <div class="etq" style="margin-top:4px">Accesos rápidos</div>
        <div class="lista">
          <a class="item" href="#/lotes"><div class="tx"><b>Registro de mis lotes</b><span>Fumigaciones, fertilizaciones y costos</span></div>${ic.flecha}</a>
          <a class="item" href="#/calcular"><div class="tx"><b>Calcular dosis de productos</b><span>Por bomba, tanque, hectáreas o plantas</span></div>${ic.flecha}</a>
          <a class="item" href="#/mezcla"><div class="tx"><b>Revisar una mezcla</b><span>Compatibilidad y orden en el tanque</span></div>${ic.flecha}</a>
        </div>
        <a class="btn wa" href="${h(waLink("Hola " + aj("nombre_asesor", "") + ", soy " + perfil.nombres + ". Necesito asesoría para mi cultivo."))}" target="_blank" rel="noopener">${ic.wa}Hablar con mi asesor</a>
      </main>`, "inicio");
    $$("[data-c]").forEach((a) => a.addEventListener("click", () => { ui.cultivo = a.dataset.c; guardarUI(); }));
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
    $$("[data-t]").forEach((b) => b.addEventListener("click", () => { ui.tipo = b.dataset.t; guardarUI(); vCultivo(cid); }));
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
        <span class="mini">${p.ingrediente_activo ? "i.a.: " + h(p.ingrediente_activo) : ""}${p.grupo ? " · Grupo " + h(p.grupo) : ""}</span></div>
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
  function vProblema(pid) {
    const pr = (I.c.problemas || []).find((x) => String(x.id) === String(pid)); if (!pr) return vNoEncontrado();
    const c = cultivo(pr.cultivo_id), tipo = (TIPOS.find((t) => t[0] === pr.tipo) || [])[1] || "";
    const recs = (I.recs[pr.id] || []).filter((r) => P(r.producto_id));
    const grupos = new Set(recs.map((r) => P(r.producto_id).grupo).filter(Boolean));
    pintar(`${barra(pr.nombre, (c ? c.nombre : "") + " · " + tipo, "#/cultivo/" + pr.cultivo_id)}
      <main class="cont">
        ${galeria(pr)}
        ${pr.descripcion ? `<p class="mini" style="margin:0;font-size:14px">${h(pr.descripcion)}</p>` : ""}
        ${segVol()}
        ${recs.length ? `<div class="etq">Productos recomendados</div>` + recs.map((r, i) => tarjetaProducto(P(r.producto_id), r, (i === 0 ? "Opción recomendada" : "Alternativa " + i) + (r.etapa_id && etapa(r.etapa_id) ? " · solo en " + etapa(r.etapa_id).nombre : ""))).join("") : `<div class="vacio">Tu asesor aún no ha cargado recomendaciones para este tema.</div>`}
        ${grupos.size > 1 ? `<div class="aviso azul">${ic.alerta}<div>Rota productos de <b>distinto grupo</b> (${[...grupos].map(h).join(", ")}) entre aplicaciones para evitar resistencia.</div></div>` : ""}
        ${avisoSeguridad()}
        <a class="btn wa" target="_blank" rel="noopener" href="${h(waLink(`Hola, tengo una consulta sobre ${pr.nombre} en mi cultivo de ${c ? c.nombre : ""}. ¿Qué me recomienda?`))}">${ic.wa}Consultar por WhatsApp</a>
      </main>`, "inicio");
    conectarVol(() => vProblema(pid));
    conectarGaleria(pr);
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
    const costoItem = (x) => { const p = P(x.producto_id); return p.pvp !== null && p.pvp !== undefined && p.contenido ? (Number(x.dosis_tanque) / Number(p.contenido)) * Number(p.pvp) : 0; };
    const fila = (x) => { const p = P(x.producto_id); return `<div class="fila" style="padding:8px 0;border-top:1px solid var(--borde)"><div style="display:flex;flex-direction:column;gap:2px;min-width:0"><b style="font-size:15px">${h(p.nombre)} ${x.alternar ? '<span class="pill claro-ambar" style="margin-left:4px">Alternar</span>' : ""}</b><span class="mini">${h(p.categoria)}${p.ingrediente_activo ? " · " + h(p.ingrediente_activo) : ""}</span></div><b style="font-size:16px;white-space:nowrap">${h(L.cantidad(Number(x.dosis_tanque) * f, x.unidad))}</b></div>`; };
    pintar(`${barra("Plan sanitario", c.nombre, "#/cultivo/" + cid)}
      <main class="cont">
        ${fases.length ? `<div class="chips" role="group" aria-label="Ir a la fase">${fases.map((x, i) => `<button class="chip" data-ir="${i}">${h(x.et.nombre)}</button>`).join("")}</div>
        ${segVol()}
        <p class="mini" style="margin:0">Dosis por ${h(volTxt())}. En cada fase, los productos marcados <b>Alternar</b> se usan uno por aplicación, cambiando cada semana.</p>
        ${fases.map((x, i) => { const rz = x.et.riesgo_hongos ? RIESGO[x.et.riesgo_hongos] : null; return `<section class="card" id="fase-${i}" style="scroll-margin-top:80px">
          <div class="fila" style="align-items:flex-start"><div style="display:flex;flex-direction:column;gap:2px"><span class="etq" style="color:var(--verde)">Fase ${i + 1}</span><h2 style="font-size:20px">${h(x.et.nombre)}</h2>${x.et.semanas ? `<span class="mini">${h(x.et.semanas)}</span>` : ""}</div>${rz ? `<span class="pill ${rz[0]}" style="white-space:normal;text-align:right;max-width:130px">${rz[1]}</span>` : ""}</div>
          <div>${x.fijos.map(fila).join("")}${x.alt.map(fila).join("")}</div>
          ${x.et.notas ? `<div class="aviso verde">${ic.alerta}<div>${h(x.et.notas)}</div></div>` : ""}
          <div class="fila"><span class="mini">Costo aprox. por tanque de ${TANQUE()} L</span><b>${dinero(x.elegidos.reduce((s, y) => s + costoItem(y), 0))}</b></div>
          <div class="acciones"><button class="btn chico" data-mz="${i}">Llevar a mi mezcla</button><button class="btn sec chico" data-rg="${i}">Registrar aplicación</button></div>
        </section>`; }).join("")}
        ${avisoSeguridad()}` : `<div class="vacio">Tu asesor aún no ha cargado el plan sanitario de este cultivo.</div>`}
      </main>`, "inicio");
    conectarVol(() => vPlan(cid));
    $$("[data-ir]").forEach((b) => b.addEventListener("click", () => { const s = $("#fase-" + b.dataset.ir); if (s) s.scrollIntoView({ behavior: "smooth" }); }));
    $$("[data-mz]").forEach((b) => b.addEventListener("click", () => { const x = fases[Number(b.dataset.mz)]; S.set("mezcla", x.elegidos.map((y) => ({ producto_id: Number(y.producto_id), dosis_tanque: Number(y.dosis_tanque) }))); location.hash = "#/mezcla"; }));
    $$("[data-rg]").forEach((b) => b.addEventListener("click", () => {
      const x = fases[Number(b.dataset.rg)];
      prefill = { actividad: "Fumigación", lineas: x.elegidos.map((y) => ({ producto_id: y.producto_id, dosis: Number(y.dosis_tanque), unidad: (y.unidad || "cc") + "/tanque" })) };
      location.hash = "#/registrar";
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
        return `<div class="card"><div class="fila"><div class="tx" style="display:flex;flex-direction:column;gap:2px"><b>${h(p.nombre)}</b><span class="mini">${h(p.ingrediente_activo || "")}</span></div><b style="font-size:17px;white-space:nowrap">${h(L.cantidad(dosis * volL() / TANQUE(), p.unidad))}</b></div><span class="mini">por ${h(volTxt())}${x.frecuencia_dias ? " · cada " + h(x.frecuencia_dias) + " días" : ""}${x.nota ? " · " + h(x.nota) : ""}</span></div>`;
      }
      const r = L.calcularFertSuelo(x, p, String(ui.calc.ha).replace(",", "."), String(ui.calc.pha).replace(",", "."));
      if (r.costo) totalCosto += r.costo;
      const omitir = x.tipo === "enmienda" && !isNaN(ph) && ph >= phAcido;
      return `<div class="card" style="${omitir ? "opacity:.6" : ""}">
        <div class="fila" style="align-items:flex-start"><div style="display:flex;flex-direction:column;gap:2px"><b>${h(p.nombre)}</b><span class="mini">${h(p.ingrediente_activo || "")}</span></div>
        <span class="pill ${x.tipo === "enmienda" ? "gris" : "verde"}">${x.tipo === "enmienda" ? "Enmienda" : "Al suelo"}</span></div>
        <div class="grid3"><div class="dato"><span>Por planta</span><b>${r.gPorPlanta !== null ? L.fmt(r.gPorPlanta, 0) + " g" : "—"}</b></div>
        <div class="dato"><span>Total finca</span><b>${r.kgTotal !== null ? L.fmt(r.kgTotal, 0) + " kg" : "—"}</b></div>
        <div class="dato"><span>Sacos ${r.sacoKg ? L.fmt(r.sacoKg) + " kg" : ""}</span><b>${r.sacos50 !== null ? r.sacos50 : "—"}</b></div></div>
        <span class="mini">${x.dosis_kg_ha ? L.fmt(Number(x.dosis_kg_ha)) + " kg/ha" : ""}${x.condicion ? " · " + h(x.condicion) : ""}${x.frecuencia_dias ? " · cada " + h(x.frecuencia_dias) + " días" : ""}${x.nota ? " · " + h(x.nota) : ""}${r.compraTexto ? " · Comprar " + h(r.compraTexto) : ""}${r.costo ? " · " + dinero(r.costo) : ""}</span>
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
    $$("[data-ft]").forEach((b) => b.addEventListener("click", () => { ui.fertTipo = b.dataset.ft; guardarUI(); vFert(c.id); }));
    conectarVol(() => vFert(c.id));
    const re = (id, k) => { const el = $("#" + id); if (el) el.addEventListener("change", () => { if (k === "ph") ui.ph = el.value; else ui.calc[k] = el.value; guardarUI(); vFert(c.id); }); };
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
  const botonesReporte = () => `<div class="acciones"><button class="btn azul" id="repGuardar">${ic.descarga}Guardar como imagen</button><button class="btn wa" id="repCompartir">${ic.wa}Compartir</button></div>`;
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
  function vCalcular(q) {
    const cc = ui.calc;
    if (q.p) { cc.p = q.p; cc.d = q.d || null; }
    if (!cc.p || !P(cc.p)) cc.p = ((I.c.productos || [])[0] || {}).id;
    const p = P(cc.p); if (!p) return pintar(`${barra("Calcular dosis", "", "#/")}<main class="cont"><div class="vacio">No hay productos cargados.</div></main>`, "calcular");
    cc.modo = cc.modo || "ha"; cc.ha = cc.ha !== undefined ? cc.ha : D.sesion.perfil.hectareas || "";
    cc.equipo = cc.equipo || "bomba"; cc.lha = cc.lha || aj("litros_agua_ha", 400); cc.ppb = cc.ppb || aj("plantas_por_bomba", 60);
    guardarUI();
    const d = L.dosisDe(p);
    if (cc.d !== null && cc.d !== undefined && cc.d !== "" && !isNaN(Number(cc.d))) { d.min = Number(cc.d); }
    const vol = cc.equipo === "tanque" ? TANQUE() : cc.equipo === "otro" ? Number(cc.vol || 16) : BOMBA();
    const n = (v) => (v === "" || v === undefined || v === null ? null : Number(String(v).replace(",", ".")));
    const r = L.calcularFinca(p, d, { modo: cc.modo, hectareas: n(cc.ha), plantas: n(cc.pl), plantasPorHa: n(cc.pha), litrosAguaHa: n(cc.lha), plantasPorBomba: n(cc.ppb), bombaL: vol, tanqueL: TANQUE(), usarMax: cc.usarMax });
    const rangoTxt = d.min !== null && d.max !== null && d.min !== d.max;
    const equipoTxt = (plural) => cc.equipo === "tanque" ? (plural ? `Tanques de ${vol} L` : `tanque de ${vol} L`) : cc.equipo === "bomba" ? (plural ? `Bombas de ${vol} L` : `bomba de ${vol} L`) : (plural ? `Cargas de ${vol} L` : `carga de ${vol} L`);
    const pu = L.precioUnitario(p);
    const costoTanque = r.tipo === "tanque" && r.porTanque !== undefined && pu !== null ? Math.round(r.porTanque * pu * 100) / 100 : null;
    let res = "";
    if (r.tipo === "tanque" && r.total !== undefined) {
      res = `<div class="grid2"><div><div class="n">${h(L.cantidad(r.total, r.unidad))}</div><small>Producto requerido total</small></div>
        <div><div class="n">${r.bombas}</div><small>${equipoTxt(true)}</small></div>
        <div><div class="n">${h(L.cantidad(r.porBomba, r.unidad))}</div><small>Dosis por ${equipoTxt(false)}</small></div>
        <div><div class="n">${L.fmt(r.litrosAgua, 0)} L</div><small>Agua total</small></div></div>`;
    } else if (r.kgTotal !== undefined) {
      res = `<div class="grid2"><div><div class="n">${L.fmt(r.kgTotal, 1)} kg</div><small>Producto requerido total</small></div>
        <div><div class="n">${r.sacos50}</div><small>Sacos de 50 kg</small></div>
        ${r.gPorPlanta ? `<div><div class="n">${L.fmt(r.gPorPlanta, 0)} g</div><small>Por planta</small></div>` : ""}
        ${r.sitios ? `<div><div class="n">${L.fmt(r.sitios, 0)}</div><small>Sitios / plantas</small></div>` : ""}</div>`;
    }
    const compra = r.envases ? `<div class="linea">Necesitas comprar: <b>${h(r.compraTexto || r.envases + " × " + (r.presentacion || "envase"))}</b>${r.costoEnvases !== undefined ? ` · ${dinero(r.costoEnvases)}` : ""}${costoTanque !== null ? `<br><span style="font-size:12.5px">Costo por tanque de ${TANQUE()} L de aplicación: ${dinero(costoTanque)}</span>` : r.costoUsado !== undefined ? `<br><span style="font-size:12.5px">Costo de lo que aplicas: ${dinero(r.costoUsado)}</span>` : ""}</div>` : "";
    pintar(`${barra("Calcular para mi finca", p.nombre, "#/")}
      <main class="cont">
        <label class="campo">Producto<select id="prod">${opcionesProductos(p.id)}</select></label>
        <div class="mini">Dosis de etiqueta: <b>${h(d.modo === "tanque" ? L.rango(L.dosisDe(p).min, L.dosisDe(p).max, d.unidad) + " por tanque de " + TANQUE() + " L" : d.modo === "sitio" ? L.rango(d.min, d.max, "g") + " por sitio" : L.rango(d.min, d.max, "kg") + " por ha")}</b>${p.dosis_texto && d.modo === "tanque" ? "" : ""}</div>
        ${rangoTxt && !(cc.d) ? `<div class="seg" role="group" aria-label="Dosis"><button data-dm="min" class="${!cc.usarMax ? "sel" : ""}">Dosis baja</button><button data-dm="max" class="${cc.usarMax ? "sel" : ""}">Dosis alta</button></div>` : ""}
        <div class="etq">Calcular por</div>
        <div class="seg" role="group" aria-label="Calcular por"><button data-m="ha" class="${cc.modo === "ha" ? "sel" : ""}">Hectáreas</button><button data-m="plantas" class="${cc.modo === "plantas" ? "sel" : ""}">N.º de plantas</button></div>
        ${cc.modo === "ha" ? `<label class="campo">Área a aplicar<span class="unido"><input id="ha" inputmode="decimal" value="${h(cc.ha)}"><span>ha</span></span></label>`
          : `<label class="campo">Número de plantas<span class="unido"><input id="pl" inputmode="numeric" value="${h(cc.pl || "")}"><span>plantas</span></span></label>`}
        ${d.modo === "tanque" ? `
          <div class="etq">Equipo</div>
          <div class="seg" role="group" aria-label="Equipo"><button data-eq="bomba" class="${cc.equipo === "bomba" ? "sel" : ""}">Bomba ${BOMBA()} L</button><button data-eq="tanque" class="${cc.equipo === "tanque" ? "sel" : ""}">Tanque ${TANQUE()} L</button><button data-eq="otro" class="${cc.equipo === "otro" ? "sel" : ""}">Otro</button></div>
          ${cc.equipo === "otro" ? `<label class="campo">Capacidad del equipo<span class="unido"><input id="vol" inputmode="decimal" value="${h(cc.vol || 16)}"><span>litros</span></span></label>` : ""}
          ${cc.modo === "ha" ? `<label class="campo">Agua que usas por hectárea<span class="unido"><input id="lha" inputmode="numeric" value="${h(cc.lha)}"><span>L/ha</span></span><small>Cámbialo según tu equipo y el tamaño de tus plantas.</small></label>`
            : `<label class="campo">Plantas que cubres con una bomba de ${BOMBA()} L<span class="unido"><input id="ppb" inputmode="numeric" value="${h(cc.ppb)}"><span>plantas</span></span></label>`}`
          : `<label class="campo">Plantas por hectárea<span class="unido"><input id="pha" inputmode="numeric" value="${h(cc.pha || "")}" placeholder="Ej. 1600"><span>pl/ha</span></span></label>`}
        ${r.avisos.map((a) => `<div class="aviso ambar">${ic.alerta}<div>${h(a)}</div></div>`).join("")}
        ${res ? `<section class="resultado" aria-live="polite"><div class="etq">Resultado</div>${res}${compra}</section>` : ""}
        <div class="acciones"><button class="btn" id="reg">Registrar aplicación</button>${d.modo === "tanque" ? `<button class="btn sec" id="mez">Agregar a mezcla</button>` : `<a class="btn sec" href="#/fertilizacion/${h(ui.cultivo || "")}">Ver plan de fertilización</a>`}</div>
        ${avisoSeguridad()}
      </main>`, "calcular");
    const re = () => vCalcular({});
    $("#prod").addEventListener("change", (e) => { cc.p = e.target.value; cc.d = null; cc.usarMax = false; re(); });
    $$("[data-m]").forEach((b) => b.addEventListener("click", () => { cc.modo = b.dataset.m; re(); }));
    $$("[data-eq]").forEach((b) => b.addEventListener("click", () => { cc.equipo = b.dataset.eq; re(); }));
    $$("[data-dm]").forEach((b) => b.addEventListener("click", () => { cc.usarMax = b.dataset.dm === "max"; re(); }));
    ["ha", "pl", "vol", "lha", "ppb", "pha"].forEach((k) => { const el = $("#" + k); if (el) el.addEventListener("change", () => { cc[k] = el.value; re(); }); });
    $("#reg").addEventListener("click", () => {
      const dosisUsada = cc.usarMax ? d.max : d.min;
      prefill = { cargas: r.bombas || "", actividad: p.categoria && /Fertiliz|Enmienda|Bioestim/.test(p.categoria) ? (d.modo === "tanque" ? "Fertilización foliar" : p.categoria === "Enmienda" ? "Enmienda" : "Fertilización al suelo") : p.categoria === "Herbicida" ? "Herbicida" : "Fumigación",
        lineas: [{ producto_id: p.id, dosis: d.modo === "tanque" ? r.porBomba : d.modo === "sitio" ? dosisUsada : dosisUsada,
          unidad: d.modo === "tanque" ? p.unidad + "/" + vol + " L" : d.modo === "sitio" ? "g/planta" : "kg/ha",
          total: r.total !== undefined ? r.total : r.kgTotal !== undefined ? r.kgTotal * 1000 : null }] };
      location.hash = "#/registrar";
    });
    const mz = $("#mez"); if (mz) mz.addEventListener("click", () => agregarAMezcla(p.id, cc.usarMax ? d.max : d.min));
  }

  // ------------------------------------------------------------ MEZCLA
  function vMezcla() {
    const m = S.get("mezcla", []).filter((x) => P(x.producto_id));
    const prods = m.map((x) => P(x.producto_id));
    const f = volL() / TANQUE();
    const rev = L.revisarMezcla(prods, I.c.compatibilidad || []);
    const orden = L.ordenMezcla(prods);
    const nombre = (id) => (P(id) || {}).nombre || "";
    const fmtD = (x) => { const p = P(x.producto_id), dz = x.dosis_tanque !== null && x.dosis_tanque !== undefined ? x.dosis_tanque : L.dosisDe(p).min; return dz === null ? "Ver etiqueta" : L.cantidad(dz * f, p.unidad); };
    const cargas = Number(String(ui.mezclaCargas || "1").replace(",", ".")) || 0;
    const compra = m.map((x) => {
      const p = P(x.producto_id), dz = x.dosis_tanque !== null && x.dosis_tanque !== undefined ? x.dosis_tanque : L.dosisDe(p).min;
      if (dz === null) return { p, total: null };
      const total = dz * f * cargas, pu = L.precioUnitario(p);
      const costoTanque = pu !== null ? dz * pu : null;
      const c = L.compraOptima(total, p.unidad, p.presentaciones);
      if (c) return { p, total, envases: c.envases, texto: c.texto, costo: c.costo, costoTanque };
      const cont = Number(p.contenido) || null, envases = cont ? Math.ceil(total / cont - 1e-9) : null;
      return { p, total, envases, texto: envases ? envases + " × " + (p.presentacion || "envase") : null, costo: envases && p.pvp !== null && p.pvp !== undefined ? envases * Number(p.pvp) : null, costoTanque };
    });
    const costoCompra = compra.reduce((a, c) => a + (c.costo || 0), 0), costoTanqueMezcla = compra.reduce((a, c) => a + (c.costoTanque || 0), 0);
    let n = 0;
    pintar(`${barra("Mi mezcla", "Revisión de compatibilidad y orden", "#/")}
      <main class="cont">
        ${segVol()}
        <div class="lista">${m.map((x, i) => { const p = P(x.producto_id); return `<div class="item" style="cursor:default"><div class="tx"><b>${h(p.nombre)}</b><span>${h(fmtD(x))} en ${h(volTxt())} · ${h(L.ORDEN_FORMULACION[p.formulacion] ? L.ORDEN_FORMULACION[p.formulacion].texto.split(" (")[0] : "Líquido")}</span></div><button class="icono-btn" data-q="${i}" aria-label="Quitar ${h(p.nombre)}">✕</button></div>`; }).join("") || `<div class="vacio">Tu mezcla está vacía. Agrega productos desde una recomendación, el plan sanitario o aquí abajo.</div>`}</div>
        <label class="campo">Agregar producto<select id="add"><option value="">Elige un producto…</option>${opcionesProductos(null, (p) => (p.modo_aplicacion || "tanque") === "tanque")}</select></label>
        ${prods.length >= 2 ? (rev.length ? rev.map((r) => `<div class="aviso ${r.nivel === "incompatible" ? "rojo" : r.nivel === "precaucion" ? "ambar" : "verde"}"><span class="pill ${r.nivel === "incompatible" ? "rojo" : r.nivel === "precaucion" ? "ambar" : "verde"}">${r.nivel === "incompatible" ? "NO MEZCLAR" : r.nivel === "precaucion" ? "PRECAUCIÓN" : "COMPATIBLE"}</span><div>${r.a ? `<b>${h(nombre(r.a))} + ${h(nombre(r.b))}:</b> ` : ""}${h(r.nota || "")}</div></div>`).join("")
          : `<div class="aviso verde"><span class="pill verde">SIN ALERTAS</span><div>No hay incompatibilidades registradas para esta combinación. Igual haz la <b>prueba del frasco</b> antes de llenar el tanque.</div></div>`) : ""}
        ${prods.length ? `<section class="card"><div class="etq">Orden de mezcla</div>
          ${orden.pasos.filter((p) => p.productos.length || p === orden.pasos[0] || p === orden.pasos[orden.pasos.length - 1]).map((p) => `<div class="paso"><span class="num">${++n}</span><div>${p.productos.length ? `<b>${p.productos.map((x) => h(x.nombre)).join(", ")}</b> · ${h(p.texto)}` : h(p.texto)}</div></div>`).join("")}
          ${orden.fuera.length ? `<span class="mini">No van al tanque: ${orden.fuera.map((x) => h(x.nombre)).join(", ")}.</span>` : ""}
          <span class="mini">Agrega un producto a la vez y espera que se disuelva antes del siguiente. Usa agua con pH entre 5 y 6 (con cobres, no acidifiques demasiado).</span></section>` : ""}
        ${prods.length ? `<section class="card"><div class="etq">Para comprar</div>
          <label class="campo">${ui.vol === "tanque" ? "¿Cuántos tanques de " + TANQUE() : "¿Cuántas bombas de " + BOMBA()} L vas a aplicar?<span class="unido"><input id="cargas" inputmode="decimal" value="${h(ui.mezclaCargas || "1")}"><span>${ui.vol === "tanque" ? "tanques" : "bombas"}</span></span></label>
          ${compra.map((c) => `<div class="fila" style="font-size:14px;border-top:1px solid var(--borde);padding-top:8px"><span><b>${h(c.p.nombre)}</b><br><span class="mini">${c.total !== null ? h(L.cantidad(c.total, c.p.unidad)) + " en total" : "Ver etiqueta"}</span></span><span style="text-align:right">${c.texto ? h(c.texto) : "—"}${c.costo !== null ? `<br><span class="mini">${dinero(c.costo)}</span>` : ""}</span></div>`).join("")}
          <div class="fila" style="border-top:1px solid var(--borde);padding-top:8px"><span class="mini">Total de referencia</span><b>${dinero(costoCompra)}</b></div>
          <div class="fila"><span class="mini">Costo por tanque de ${TANQUE()} L de aplicación</span><b>${dinero(costoTanqueMezcla)}</b></div>
        </section>
        ${botonesReporte()}
        <div class="acciones"><button class="btn" id="reg">Registrar esta mezcla</button><button class="btn peligro" id="vaciar">Vaciar</button></div>
        <a class="btn wa" target="_blank" rel="noopener" href="${h(waLink("Hola, quiero validar esta mezcla para " + volTxt() + ": " + m.map((x) => P(x.producto_id).nombre + " " + fmtD(x)).join(", ") + ". ¿Está bien?"))}">${ic.wa}Validar mezcla con mi asesor</a>` : ""}
      </main>`, "mezcla");
    conectarVol(vMezcla);
    $$("[data-q]").forEach((b) => b.addEventListener("click", () => { m.splice(Number(b.dataset.q), 1); S.set("mezcla", m); vMezcla(); }));
    $("#add").addEventListener("change", (e) => { if (!e.target.value) return; const p = P(e.target.value); m.push({ producto_id: Number(p.id), dosis_tanque: L.dosisDe(p).min }); S.set("mezcla", m); vMezcla(); });
    const reg = $("#reg"); if (reg) reg.addEventListener("click", () => {
      prefill = { actividad: "Fumigación", lineas: m.map((x) => ({ producto_id: x.producto_id, dosis: x.dosis_tanque !== null && x.dosis_tanque !== undefined ? Math.round(x.dosis_tanque * f * 10) / 10 : null, unidad: P(x.producto_id).unidad + "/" + volL() + " L" })) };
      location.hash = "#/registrar";
    });
    const va = $("#vaciar"); if (va) va.addEventListener("click", () => { S.set("mezcla", []); vMezcla(); });
    const ca = $("#cargas"); if (ca) ca.addEventListener("change", () => { ui.mezclaCargas = ca.value; guardarUI(); vMezcla(); });
    if (prods.length) {
      const pasos = orden.pasos.filter((p) => p.productos.length || p === orden.pasos[0] || p === orden.pasos[orden.pasos.length - 1])
        .map((p, i) => `${i + 1}. ${p.productos.length ? p.productos.map((x) => x.nombre).join(", ") + " · " + p.texto : p.texto}`);
      const equipo = ui.vol === "tanque" ? `tanques de ${TANQUE()} L` : `bombas de ${BOMBA()} L`;
      const datos = () => ({ marca: NOMBRE, titulo: "Mezcla para fumigar", subtitulo: `${L.fmt(cargas, 1)} ${equipo} · ${D.sesion.perfil.nombres}`,
        destacados: [[String(m.length), "Productos en la mezcla"], [L.fmt(cargas, 1), ui.vol === "tanque" ? `Tanques de ${TANQUE()} L a aplicar` : `Bombas de ${BOMBA()} L a aplicar`]],
        secciones: [
          { titulo: `Dosis por ${volTxt()}`, filas: m.map((x) => [P(x.producto_id).nombre, fmtD(x)]) },
          { titulo: "Para comprar", filas: compra.map((c) => [c.p.nombre + (c.total !== null ? ` (${L.cantidad(c.total, c.p.unidad)})` : ""), c.texto ? `${c.texto}${c.costo !== null ? " · " + dinero(c.costo) : ""}` : "Ver etiqueta"]).concat([["Total de referencia", dinero(costoCompra)], [`Costo por tanque de ${TANQUE()} L de aplicación`, dinero(costoTanqueMezcla)]]) },
          { titulo: "Compatibilidad", avisos: prods.length >= 2 ? (rev.length ? rev.map((r) => ({ nivel: r.nivel === "incompatible" ? "rojo" : r.nivel === "precaucion" ? "ambar" : "verde", texto: (r.nivel === "incompatible" ? "NO MEZCLAR. " : r.nivel === "precaucion" ? "PRECAUCIÓN. " : "") + (r.a ? nombre(r.a) + " + " + nombre(r.b) + ": " : "") + (r.nota || "") })) : [{ nivel: "verde", texto: "Sin incompatibilidades registradas. Haz la prueba del frasco antes de llenar el tanque." }]) : [] },
          { titulo: "Orden de mezcla", textos: pasos },
        ], pie: pieReporte() });
      const texto = () => [`*${NOMBRE} · Mezcla para fumigar*`, `${L.fmt(cargas, 1)} ${equipo}`, "", `*Dosis por ${volTxt()}:*`].concat(m.map((x) => `• ${P(x.producto_id).nombre}: ${fmtD(x)}`))
        .concat(["", "*Para comprar:*"]).concat(compra.map((c) => `• ${c.p.nombre}: ${c.texto || "ver etiqueta"}`))
        .concat([`Total de referencia: ${dinero(costoCompra)}`, "", "*Orden de mezcla:*"]).concat(pasos).join("\n");
      conectarReporte(datos, () => `Mezcla_${new Date().toISOString().slice(0, 10)}.png`, texto);
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
      <label class="campo">Etapa actual<select name="etapa_id"><option value="">—</option>${(I.c.etapas || []).filter((e) => e.uso !== "fertilizacion").map((e) => `<option value="${e.id}" data-c="${h(e.cultivo_id)}" ${String(lo.etapa_id) === String(e.id) ? "selected" : ""}>${h(e.nombre)}</option>`).join("")}</select></label></div>
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
          return `<a class="card" href="#/lote/${h(l.id)}" style="text-decoration:none;color:inherit">
            <div class="fila"><b style="font-size:16px">${h(l.nombre)}${c ? " · " + h(c.nombre) : ""}</b><span class="mini">${l.hectareas ? L.fmt(Number(l.hectareas)) + " ha" : ""}${l.plantas ? " · " + L.fmt(l.plantas, 0) + " pl" : ""}</span></div>
            <div class="chips" style="gap:6px">${et ? `<span class="pill verde">${h(et.nombre)}</span>` : ""}${enCar ? `<span class="pill claro-rojo">En carencia</span>` : ""}${l.latitud ? `<span class="pill gris">GPS ✓</span>` : ""}<span class="pill gris">${ult ? "Última: " + h(ult.actividad) + " · " + fechaCorta(ult.fecha) : "Sin registros"}</span></div></a>`;
        }).join("")}</div>
        ${lotes.length ? `<a class="btn" href="#/registrar">+ Registrar aplicación</a>` : ""}
      </main>`, "lotes");
    conectarFormLote(null, () => { location.hash = "#/lotes"; vLotes({}); });
  }

  function exportarExcel(regs, nombreArchivo) {
    if (!window.XLSX) { toast("No se pudo cargar el exportador."); return; }
    const filas = regs.map((r) => ({ Fecha: r.fecha, Lote: (D.lotes().find((l) => l.id === r.lote_id) || {}).nombre || "", "Ubicación lote": ((lo) => lo && lo.latitud ? mapaURL(lo.latitud, lo.longitud) : "")(D.lotes().find((l) => l.id === r.lote_id)), Actividad: r.actividad, Producto: r.producto_nombre || "",
      Dosis: r.dosis, Unidad: r.unidad || "", "Aplicó": r.aplicador || "", Clima: r.clima || "", "Costo $": r.costo, "Carencia hasta": r.carencia_hasta || "", "Próxima aplicación": r.proxima_fecha || "", Observaciones: r.observaciones || "" }));
    const ws = XLSX.utils.json_to_sheet(filas), wb = XLSX.utils.book_new();
    ws["!cols"] = [10, 14, 26, 20, 22, 8, 12, 16, 10, 9, 13, 15, 30].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    try { XLSX.writeFile(wb, nombreArchivo); } catch (e) { toast("Tu navegador no permitió la descarga."); }
  }

  function vLote(id, q) {
    const l = D.lotes().find((x) => x.id === id); if (!l) return vNoEncontrado();
    const todos = D.registros().filter((r) => r.lote_id === id);
    const filtro = q.f || "todo";
    const regs = filtro === "todo" ? todos : todos.filter((r) => (filtro === "fum" ? /Fumig|Herbic/.test(r.actividad) : /Fertil|Enmienda/.test(r.actividad)));
    const rc = L.resumenCostos(todos), et = etapa(l.etapa_id), c = cultivo(l.cultivo_id);
    const colores = ["#1F5E3B", "#7FB08F", "#C9A574", "#163C5C", "#B0306A", "#4A5650"];
    const acts = Object.entries(rc.por).sort((a, b) => b[1].costo - a[1].costo);
    const fechas = todos.map((r) => r.fecha).sort();
    pintar(`${barra(l.nombre, [c && c.nombre, l.hectareas ? L.fmt(Number(l.hectareas)) + " ha" : "", et && et.nombre].filter(Boolean).join(" · "), "#/lotes")}
      <main class="cont">
        <section class="card">
          <div class="fila"><span class="etq">Costo registrado</span><span class="mini">${fechas.length ? fechaCorta(fechas[0]) + " – " + fechaCorta(fechas[fechas.length - 1]) : ""}</span></div>
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span class="grande" style="color:var(--texto)">${dinero(rc.total)}</span>${l.hectareas ? `<span class="mini">${dinero(rc.total / Number(l.hectareas))} por ha</span>` : ""}</div>
          ${rc.total > 0 ? `<div class="barra-costos" aria-hidden="true">${acts.map(([k, v], i) => `<span style="width:${(v.costo / rc.total) * 100}%;background:${colores[i % colores.length]}"></span>`).join("")}</div>` : ""}
          ${acts.map(([k, v], i) => `<div class="fila" style="font-size:13.5px"><span style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:3px;background:${colores[i % colores.length]}"></span>${h(k)} (${v.n} producto${v.n === 1 ? "" : "s"})</span><b>${dinero(v.costo)}</b></div>`).join("") || `<span class="mini">Aún no hay registros en este lote.</span>`}
        </section>
        <div class="mini">${l.latitud ? `Ubicación del lote: ${h(Number(l.latitud).toFixed(5))}, ${h(Number(l.longitud).toFixed(5))} (±${h(l.precision_m)} m) · <a href="${h(mapaURL(l.latitud, l.longitud))}" target="_blank" rel="noopener">Ver en el mapa</a>` : `Este lote no tiene ubicación GPS. Guárdala en «Editar datos del lote» cuando estés en él.`}</div>
        <div class="acciones"><a class="btn" href="#/registrar?lote=${h(l.id)}">+ Registrar</a><button class="btn sec" id="xls">${ic.descarga}Exportar Excel</button></div>
        <div class="chips">${[["todo", "Todo"], ["fum", "Fumigación"], ["fer", "Fertilización"]].map(([k, t]) => `<a class="chip ${filtro === k ? "sel" : ""}" href="#/lote/${h(id)}?f=${k}" style="text-decoration:none;display:inline-flex;align-items:center">${t}</a>`).join("")}</div>
        <div class="lista">${regs.map((r) => `<div class="card" style="gap:4px">
            <div class="fila"><span style="font-size:12px;font-weight:700;color:var(--verde);text-transform:uppercase">${h(r.actividad)} · ${fechaCorta(r.fecha)}</span><b>${r.costo !== null && r.costo !== undefined && r.costo !== "" ? dinero(r.costo) : ""}</b></div>
            <b style="font-size:14.5px">${h(r.producto_nombre || "—")}${r.dosis !== null && r.dosis !== undefined && r.dosis !== "" ? " · " + h(L.fmt(Number(r.dosis))) + " " + h(r.unidad || "") : ""}</b>
            <span class="mini">${[r.aplicador && "Aplicó: " + r.aplicador, r.clima, r.carencia_hasta && "Carencia hasta " + fechaCorta(r.carencia_hasta), r.proxima_fecha && "Próxima: " + fechaCorta(r.proxima_fecha)].filter(Boolean).map(h).join(" · ")}</span>
            ${r.observaciones ? `<span class="mini">“${h(r.observaciones)}”</span>` : ""}
            <div class="fila" style="justify-content:flex-end"><button class="btn peligro chico" data-del="${h(r.id)}">Eliminar</button></div>
          </div>`).join("") || `<div class="vacio">Sin registros${filtro !== "todo" ? " de este tipo" : ""}.</div>`}</div>
        <details class="card"><summary>Editar datos del lote</summary>${formLote(l).replace('class="card"', 'class=""')}</details>
      </main>`, "lotes");
    $("#xls").addEventListener("click", () => exportarExcel(todos, `Registros_${l.nombre.replace(/[^\w-]+/g, "_")}.xlsx`));
    $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (await UI.confirmar("¿Eliminar este registro?", { ok: "Eliminar", peligro: true })) { D.borrarRegistro(b.dataset.del); vLote(id, q); } }));
    conectarFormLote(l, () => vLote(id, q));
  }

  // ------------------------------------------------------------ REGISTRAR APLICACIÓN
  const ACTIVIDADES = ["Fumigación", "Fertilización al suelo", "Fertilización foliar", "Enmienda", "Herbicida", "Otra"];
  const CLIMAS = ["Soleado", "Nublado", "Llovizna", "Viento"];
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
    const st = { cargas: pf.cargas || "", actividad: pf.actividad || "Fumigación", clima: "Soleado", lineas: (pf.lineas && pf.lineas.length ? pf.lineas : [{}]).map((x) => Object.assign({ costo: costoAuto(x.producto_id, x.total), manual: false }, x)) };
    const loteSel = q.lote || (lotes.length === 1 ? lotes[0].id : "");
    function linea(x, i) {
      const p = P(x.producto_id);
      return `<div class="card" data-l="${i}" style="gap:8px;background:#FAFBF8">
        <div class="fila"><b style="font-size:13.5px">Producto ${i + 1}</b>${st.lineas.length > 1 ? `<button type="button" class="icono-btn" data-quitar="${i}" aria-label="Quitar producto ${i + 1}">✕</button>` : ""}</div>
        <label class="campo"><span class="sr">Producto</span><input data-k="producto_nombre" list="lista-productos" autocomplete="off" placeholder="Escribe el nombre del producto" value="${h(x.producto_nombre || (p ? p.nombre : ""))}"></label>
        <div class="grid2"><label class="campo">Dosis<input data-k="dosis" inputmode="decimal" value="${h(x.dosis !== undefined && x.dosis !== null ? Math.round(x.dosis * 100) / 100 : "")}"></label>
        <label class="campo">Unidad<input data-k="unidad" list="unidades" value="${h(x.unidad || (p ? (p.modo_aplicacion === "suelo_ha" ? "g/planta" : (p.unidad || "cc") + "/bomba") : ""))}"></label></div>
        <div class="grid2"><label class="campo">Total usado<span class="unido"><input data-k="total" inputmode="decimal" value="${h(x.total !== undefined && x.total !== null ? Math.round(x.total) : "")}"><span>${p ? (p.modo_aplicacion === "tanque" ? h(p.unidad || "cc") : "g") : ""}</span></span></label>
        <label class="campo">Costo $<input data-k="costo" inputmode="decimal" value="${h(x.costo)}" placeholder="0,00"></label></div>
        ${p && p.carencia_dias ? `<span class="mini">Carencia: ${h(p.carencia_dias)} días</span>` : ""}
      </div>`;
    }
    function pintarForm() {
      pintar(`${barra("Nuevo registro", "Fumigación o fertilización", q.lote ? "#/lote/" + q.lote : "#/lotes")}
        <form class="cont" id="fr" novalidate>
          <datalist id="lista-productos">${(I.c.productos || []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((p) => `<option value="${h(p.nombre)}">`).join("")}</datalist>
          <datalist id="unidades"><option value="cc/bomba"><option value="g/bomba"><option value="cc/tanque"><option value="g/tanque"><option value="g/planta"><option value="kg/ha"><option value="L/ha"></datalist>
          <div class="grid2"><label class="campo">Lote<select name="lote" required><option value="">Elige…</option>${lotes.map((l) => `<option value="${h(l.id)}" ${l.id === loteSel ? "selected" : ""}>${h(l.nombre)}</option>`).join("")}</select></label>
          <label class="campo">Fecha<input name="fecha" type="date" value="${hoy()}" max="${hoy()}" required></label></div>
          <div class="campo">Actividad<div class="chips" role="group" aria-label="Actividad">${ACTIVIDADES.map((a) => `<button type="button" class="chip ${st.actividad === a ? "sel" : ""}" data-act="${h(a)}">${h(a)}</button>`).join("")}</div></div>
          <label class="campo">¿Cuántas bombas o tanques aplicaste?<span class="unido"><input name="cargas" inputmode="decimal" value="${h(st.cargas || "")}" placeholder="Ej. 10"><span>cargas</span></span><small>Con esto se calcula el total usado y el costo de cada producto.</small></label>
          <div class="etq">Productos aplicados</div>
          <div class="lista" id="lineas">${st.lineas.map(linea).join("")}</div>
          <button type="button" class="btn sec chico" id="masLinea">+ Agregar otro producto de la mezcla</button>
          <label class="campo">¿Quién aplicó?<input name="aplicador" value="${h(S.get("ultimo_aplicador", ""))}" placeholder="Nombre del aplicador"></label>
          <div class="campo">Clima al aplicar<div class="grid2" style="grid-template-columns:repeat(4,minmax(0,1fr))">${CLIMAS.map((c) => `<button type="button" class="chip ${st.clima === c ? "sel" : ""}" data-clima="${c}" style="padding:8px 2px;font-size:13px">${c}</button>`).join("")}</div></div>
          <label class="campo">Observaciones<textarea name="obs" placeholder="Ej.: se vio menos daño en flores"></textarea></label>
          <div class="card"><label class="fila" style="font-weight:600;font-size:14px">Recordarme la próxima aplicación<input type="checkbox" name="rec" checked style="width:24px;height:24px;accent-color:var(--verde)"></label>
            <label class="campo">En cuántos días<span class="unido"><input name="dias" inputmode="numeric" value="${h(S.get("ultimos_dias", 7))}"><span>días</span></span></label></div>
          <p class="mini" id="err" role="alert" style="color:var(--rojo);margin:0"></p>
          <button class="btn" type="submit">Guardar registro</button>
        </form>`, "lotes");
      conectarForm();
    }
    function leerLineas() {
      $$("#lineas [data-l]").forEach((card) => { const i = Number(card.dataset.l); $$("[data-k]", card).forEach((el) => { st.lineas[i][el.dataset.k] = el.value; }); });
    }
    function conectarForm() {
      const f = $("#fr");
      $$("[data-act]").forEach((b) => b.addEventListener("click", () => { leerLineas(); st.actividad = b.dataset.act; $$("[data-act]").forEach((x) => x.classList.toggle("sel", x === b)); }));
      $$("[data-clima]").forEach((b) => b.addEventListener("click", () => { st.clima = b.dataset.clima; $$("[data-clima]").forEach((x) => x.classList.toggle("sel", x === b)); }));
      f.cargas.addEventListener("input", () => {
        leerLineas(); st.cargas = f.cargas.value; const n = Number(String(f.cargas.value).replace(",", "."));
        $$("#lineas [data-l]").forEach((card) => {
          const x = st.lineas[Number(card.dataset.l)], u = String(x.unidad || "");
          if (!n || !x.dosis || !u.includes("/") || /planta|ha/.test(u)) return;
          x.total = Math.round(Number(String(x.dosis).replace(",", ".")) * n * 10) / 10;
          $('[data-k="total"]', card).value = x.total;
          if (!x.manual) { x.costo = costoAuto(x.producto_id, x.total); $('[data-k="costo"]', card).value = x.costo; }
        });
      });
      $("#masLinea").addEventListener("click", () => { leerLineas(); st.lineas.push({ costo: "", manual: false }); guardarCampos(); pintarForm(); restaurarCampos(); });
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
        const lineas = st.lineas.filter((x) => String(x.producto_nombre || "").trim());
        if (!lineas.length && st.actividad !== "Otra") { err.textContent = "Escribe al menos un producto."; return; }
        const n = (v) => (v === "" || v === undefined || v === null ? null : Number(String(v).replace(",", ".")));
        const dias = f.rec.checked ? parseInt(f.dias.value, 10) : null;
        S.set("ultimo_aplicador", f.aplicador.value); if (dias) S.set("ultimos_dias", dias);
        const base = { lote_id: f.lote.value, fecha: f.fecha.value || hoy(), actividad: st.actividad, aplicador: f.aplicador.value.trim() || null, clima: st.clima, observaciones: f.obs.value.trim() || null };
        const lista = (lineas.length ? lineas : [{}]).map((x, i) => {
          const p = P(x.producto_id);
          return Object.assign({}, base, { producto_id: p ? Number(p.id) : null, producto_nombre: p ? p.nombre : (String(x.producto_nombre || "").trim() || null), dosis: n(x.dosis), unidad: x.unidad || null, costo: n(x.costo),
            carencia_hasta: p && p.carencia_dias ? L.sumarDias(base.fecha, p.carencia_dias) : null, proxima_fecha: i === 0 && dias ? L.sumarDias(base.fecha, dias) : null });
        });
        D.guardarRegistros(lista);
        toast(navigator.onLine === false ? "Guardado. Se enviará cuando tengas señal." : "Registro guardado");
        location.hash = "#/lote/" + base.lote_id;
      });
    }
    let campos = {};
    function guardarCampos() { const f = $("#fr"); if (!f) return; st.cargas = f.cargas.value; campos = { lote: f.lote.value, fecha: f.fecha.value, aplicador: f.aplicador.value, obs: f.obs.value, rec: f.rec.checked, dias: f.dias.value }; }
    function restaurarCampos() { const f = $("#fr"); if (!f || !campos.fecha) return; f.lote.value = campos.lote; f.fecha.value = campos.fecha; f.aplicador.value = campos.aplicador; f.obs.value = campos.obs; f.rec.checked = campos.rec; f.dias.value = campos.dias; }
    pintarForm();
  }

  // ------------------------------------------------------------ PERFIL
  function vPerfil() {
    const p = D.sesion.perfil, cat = D.catalogo || {}, ub = {};
    pintar(`${barra("Mi cuenta", p.rol === "tecnico" ? "Técnico de almacén" : "Agricultor", "#/")}
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
        <section class="card">
          <div class="fila"><span class="mini">Información técnica</span><b>Versión ${h(cat.version || "—")}</b></div>
          <div class="fila"><span class="mini">Última sincronización</span><b>${D.ultimaSync ? new Date(D.ultimaSync).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" }) : "—"}</b></div>
          <div class="fila"><span class="mini">Pendientes de enviar</span><b>${D.hayPendientes()}</b></div>
          <button class="btn sec" id="sync">Sincronizar ahora</button>
        </section>
        ${D.modoDemo ? `<a class="btn azul" href="admin.html">Abrir panel del administrador (demo)</a>` : ""}
        <button class="btn peligro" id="salir">Cerrar sesión</button>
        <p class="mini" style="text-align:center">${h(NOMBRE)} · Asesoría técnica Ecuaquímica. Recomendaciones referenciales: lee siempre la etiqueta del producto.</p>
      </main>`, null);
    ub.alGuardar = async (u) => {
      try { await D.actualizarPerfil(u); toast("Ubicación de la finca guardada"); }
      catch (er) { toast(er.codigo === "red" ? "Ubicación tomada, pero necesitas internet para guardarla. Vuelve a tocar el botón cuando tengas señal." : er.message); }
    };
    conectarUbicacion(ub);
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
      case "lotes": return vLotes(q);
      case "lote": return vLote(seg[1], q);
      case "registrar": return vRegistrar(q);
      case "perfil": return vPerfil();
      default: return vNoEncontrado();
    }
  }
  window.addEventListener("hashchange", router);
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
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  })();
})();

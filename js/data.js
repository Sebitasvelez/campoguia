/* CampoGuía · datos: Supabase (producción) o modo demostración (solo en este equipo) */
(function () {
  const CFG = window.AGRODOSIS_CONFIG || {};
  const MODO_DEMO = !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY;

  const Store = {
    get(k, def) { try { const v = localStorage.getItem("cg_" + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem("cg_" + k, JSON.stringify(v)); } catch (e) { /* sin espacio o bloqueado */ } },
    del(k) { try { localStorage.removeItem("cg_" + k); } catch (e) {} },
  };

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); }));

  const normTel = (t) => {
    let d = String(t || "").replace(/\D/g, "");
    if (d.startsWith("593")) d = "0" + d.slice(3);
    if (d.length === 9 && d.startsWith("9")) d = "0" + d;
    return d;
  };

  function cedulaValida(c) {
    const d = String(c || "").replace(/\D/g, "");
    if (d.length !== 10) return false;
    const prov = Number(d.slice(0, 2));
    if (!((prov >= 1 && prov <= 24) || prov === 30) || Number(d[2]) >= 6) return false;
    let suma = 0;
    for (let i = 0; i < 9; i++) { let v = Number(d[i]) * (i % 2 === 0 ? 2 : 1); if (v > 9) v -= 9; suma += v; }
    return (10 - (suma % 10)) % 10 === Number(d[9]);
  }

  const MENSAJES = {
    cedula_ya_registrada: "Esa cédula ya tiene una cuenta. Usa «Ya tengo cuenta».",
    institucion_requerida: "Escribe la institución a la que perteneces.",
    edad_invalida: "Escribe tu edad en años.",
    menor_de_edad: "Para crear una cuenta debes ser mayor de edad (18 años o más).",
    no_registrado: "No encontramos una cuenta con esa cédula. Revísala o crea tu cuenta.",
    credenciales: "La cédula y el celular no coinciden con ninguna cuenta. Revísalos (usa el celular con el que te registraste) o crea tu cuenta.",
    demasiados_intentos: "Demasiados intentos seguidos. Por seguridad espera 15 minutos y vuelve a probar.",
    demasiados_datos: "Hay demasiados datos para enviar de una vez. Contacta a tu asesor.",
    telefono_invalido: "Revisa el número de celular.",
    cedula_invalida: "La cédula no es válida. Revisa los 10 dígitos.",
    ubicacion_requerida: "Elige la provincia y escribe el sector de tu cultivo.",
    nombre_requerido: "Escribe tus nombres.",
    sesion_invalida: "Tu sesión terminó. Vuelve a ingresar con tu cédula y tu celular.",
    solo_admin: "Solo el administrador puede hacer esto.",
  };
  function error(e) {
    const m = String((e && (e.message || e.msg)) || e || "");
    for (const k in MENSAJES) if (m.includes(k)) { const err = new Error(MENSAJES[k]); err.codigo = k; return err; }
    if (/fetch|network|Failed|timeout/i.test(m)) { const err = new Error("Sin conexión. Se guardará y se enviará cuando tengas señal."); err.codigo = "red"; return err; }
    return new Error(m || "Ocurrió un error.");
  }

  // ------------------------------------------------------------------ Supabase
  let sb = null;
  function cliente() {
    if (!sb) sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, storageKey: "cg_admin_auth" },
    });
    return sb;
  }
  async function rpc(nombre, args) {
    const { data, error: e } = await cliente().rpc(nombre, args);
    if (e) throw error(e);
    if (data && typeof data === "object" && !Array.isArray(data) && data.error) throw error(data.error); // errores controlados ({error})
    return data;
  }

  const Supa = {
    async versionCatalogo() {
      const { data, error: e } = await cliente().from("catalogo_publicado").select("version,publicado").order("version", { ascending: false }).limit(1);
      if (e) throw error(e);
      return data && data[0] ? data[0] : null;
    },
    async catalogo(version) {
      const { data, error: e } = await cliente().from("catalogo_publicado").select("datos").eq("version", version).single();
      if (e) throw error(e);
      return data.datos;
    },
    registrar: (p) => rpc("app_registrar", { p }),
    ingresar: (cedula, telefono) => rpc("app_ingresar", { p_cedula: cedula, p_telefono: telefono }),
    misDatos: (token) => rpc("app_mis_datos", { p_token: token }),
    sincronizar: (token, lotes, registros) => rpc("app_sincronizar", { p_token: token, p_lotes: lotes, p_registros: registros }),
    actualizarPerfil: (token, p) => rpc("app_actualizar_perfil", { p_token: token, p }),
    solicitarRol: (token, rol) => rpc("app_solicitar_rol", { p_token: token, p_rol: rol }),
    cerrarSesion: (token) => rpc("app_cerrar_sesion", { p_token: token }).catch(() => {}),
    otrosProductos: () => rpc("app_otros_productos", {}),
    reportarProducto: (token, p) => rpc("app_reportar_producto", { p_token: token || null, p }),
  };

  // ------------------------------------------------------------------ Demo
  const demoDB = () => Store.get("demo_db", { agricultores: [], sesiones: {}, lotes: [], registros: [] });
  const demoSave = (db) => Store.set("demo_db", db);
  async function catalogoInicial() {
    const r = await fetch("data/catalogo-inicial.json", { cache: "no-store" });
    return r.json();
  }
  const espera = () => new Promise((r) => setTimeout(r, 150));
  const Demo = {
    async versionCatalogo() {
      const pub = Store.get("demo_publicado", null);
      if (pub) return { version: pub.version, publicado: pub.publicado };
      const ini = await catalogoInicial(); return { version: ini.version || 1, publicado: null };
    },
    async catalogo() { return Store.get("demo_publicado", null) || (await catalogoInicial()); },
    async registrar(p) {
      await espera();
      const db = demoDB(), tel = normTel(p.telefono), ced = String(p.cedula || "").replace(/\D/g, "");
      if (!cedulaValida(ced)) throw error("cedula_invalida");
      if (tel.length < 9) throw error("telefono_invalido");
      if (!String(p.nombres || "").trim()) throw error("nombre_requerido");
      if (!String(p.provincia || "").trim() || !String(p.sector || "").trim()) throw error("ubicacion_requerida");
      if (db.agricultores.some((a) => a.cedula === ced)) throw error("cedula_ya_registrada");
      const num = (v) => (v === "" || v === undefined || v === null ? null : Number(v));
      const a = { id: uuid(), cedula: ced, nombres: p.nombres.trim(), telefono: tel, cultivo_id: p.cultivo_id, hectareas: num(p.hectareas),
        provincia: p.provincia, sector: p.sector.trim(), comunidad: p.comunidad || null, institucion: p.rol === "tecnico" ? String(p.institucion || "").trim() || null : null, edad: Number(p.edad) || null, cultivo_texto: String(p.cultivo_texto || "").trim() || null, rol: "agricultor", rol_solicitado: p.rol === "tecnico" ? "tecnico" : null, rol_solicitado_fecha: p.rol === "tecnico" ? new Date().toISOString() : null, acepta_seguimiento: p.acepta_seguimiento !== false,
        latitud: num(p.latitud), longitud: num(p.longitud), precision_m: num(p.precision_m), ubicacion_fecha: p.latitud ? new Date().toISOString() : null,
        creado: new Date().toISOString(), ultimo_ingreso: new Date().toISOString(), activo: true };
      db.agricultores.push(a); const token = uuid(); db.sesiones[token] = a.id; demoSave(db);
      return { token, perfil: a };
    },
    async ingresar(cedula, telefono) {
      await espera();
      const tel = normTel(telefono), db = demoDB(), a = db.agricultores.find((x) => x.cedula === String(cedula || "").replace(/\D/g, "") && x.activo !== false);
      if (!a || tel.length < 9 || normTel(a.telefono).slice(-9) !== tel.slice(-9)) throw error("credenciales");
      a.ultimo_ingreso = new Date().toISOString();
      const token = uuid(); db.sesiones[token] = a.id; demoSave(db);
      return { token, perfil: a };
    },
    async misDatos(token) {
      const db = demoDB(), id = db.sesiones[token], a = db.agricultores.find((x) => x.id === id);
      if (!a) throw error("sesion_invalida");
      return { perfil: a, lotes: db.lotes.filter((l) => l.agricultor_id === id && !l.borrado), registros: db.registros.filter((r) => r.agricultor_id === id && !r.borrado).sort((x, y) => (x.fecha < y.fecha ? 1 : -1)) };
    },
    async sincronizar(token, lotes, registros) {
      const db = demoDB(), id = db.sesiones[token];
      if (!id) throw error("sesion_invalida");
      const up = (arr, x) => { const i = arr.findIndex((y) => y.id === x.id); const v = Object.assign({}, x, { agricultor_id: id, actualizado: new Date().toISOString() }); if (i < 0) arr.push(v); else if (arr[i].agricultor_id === id) arr[i] = v; };
      (lotes || []).forEach((l) => up(db.lotes, l)); (registros || []).forEach((r) => up(db.registros, r));
      demoSave(db);
      return this.misDatos(token);
    },
    async actualizarPerfil(token, p) {
      const db = demoDB(), a = db.agricultores.find((x) => x.id === db.sesiones[token]);
      if (!a) throw error("sesion_invalida");
      ["nombres", "cultivo_id", "comunidad", "provincia", "sector"].forEach((k) => { if (p[k] !== undefined && p[k] !== "") a[k] = p[k]; });
      if (p.telefono) a.telefono = normTel(p.telefono);
      if (p.latitud !== undefined && p.latitud !== "") { a.latitud = Number(p.latitud); a.longitud = Number(p.longitud); a.precision_m = Number(p.precision_m); a.ubicacion_fecha = new Date().toISOString(); }
      if (p.hectareas !== undefined && p.hectareas !== "") a.hectareas = Number(p.hectareas);
      if (p.acepta_seguimiento !== undefined) a.acepta_seguimiento = !!p.acepta_seguimiento;
      if (p.institucion !== undefined) a.institucion = String(p.institucion || "").trim() || null;
      if (Number(p.edad) >= 18 && Number(p.edad) <= 110) a.edad = Number(p.edad);
      if (p.cultivo_texto !== undefined) { a.cultivo_texto = String(p.cultivo_texto || "").trim() || null; a.cultivo_id = p.cultivo_id || null; }
      demoSave(db); return a;
    },
    async solicitarRol(token, rol) {
      const db = demoDB(), a = db.agricultores.find((x) => x.id === db.sesiones[token]);
      if (!a) throw error("sesion_invalida");
      if (rol === "tecnico") { if (a.rol !== "tecnico" && !a.rol_solicitado) { a.rol_solicitado = "tecnico"; a.rol_solicitado_fecha = new Date().toISOString(); } }
      else if (rol === "agricultor") { a.rol = "agricultor"; a.rol_solicitado = null; a.rol_solicitado_fecha = null; }
      else if (rol === "cancelar") { a.rol_solicitado = null; a.rol_solicitado_fecha = null; }
      demoSave(db); return a;
    },
    async cerrarSesion(token) { const db = demoDB(); delete db.sesiones[token]; demoSave(db); },
    async otrosProductos() { return Store.get("demo_otros", []).filter((x) => x.ingrediente_activo || (x.tipo === "fertilizante" && (Number(x.n) || Number(x.p2o5) || Number(x.k2o)))); },
    async reportarProducto(token, p) {
      const l = Store.get("demo_otros", []), n = String(p.nombre || "").trim().toLowerCase(); let x = l.find((y) => y.nombre.toLowerCase() === n);
      if (!x) { x = Object.assign({ id: l.length + 1, nombre: String(p.nombre).trim(), ingrediente_activo: p.ingrediente_activo ? String(p.ingrediente_activo).toUpperCase() : null, grupo: p.grupo || null, estado: "pendiente", veces: 1, creado: new Date().toISOString() },
        p.tipo === "fertilizante" ? { tipo: "fertilizante", categoria: "Fertilizante edáfico", n: p.n, p2o5: p.p2o5, k2o: p.k2o, otros_nutrientes: p.otros_nutrientes || null, empresa: p.empresa || null, kg_saco: p.kg_saco || 50, precio_saco: p.precio_saco || null, estado: "completo" } : {}); l.push(x); }
      else { x.veces = (x.veces || 1) + 1; if (!x.ingrediente_activo && p.ingrediente_activo) x.ingrediente_activo = String(p.ingrediente_activo).toUpperCase(); }
      Store.set("demo_otros", l); return x;
    },
  };

  const B = MODO_DEMO ? Demo : Supa;

  // ------------------------------------------------------------------ Estado de la app con cola sin conexión
  const Datos = {
    modoDemo: MODO_DEMO,
    store: Store,
    uuid, normTel, cedulaValida,
    catalogo: Store.get("catalogo", null),
    sesion: Store.get("sesion", null),            // {token, perfil}
    mis: Store.get("mis", { lotes: [], registros: [] }),
    pendientes: Store.get("pendientes", { lotes: [], registros: [] }), // ids
    sincronizando: false,
    ultimaSync: Store.get("ultima_sync", null),
    oyentes: [],
    alCambiar(fn) { this.oyentes.push(fn); },
    avisar(qué) { this.oyentes.forEach((f) => { try { f(qué); } catch (e) { console.error(e); } }); },
    guardarLocal() { Store.set("mis", this.mis); Store.set("pendientes", this.pendientes); },

    async actualizarCatalogo() {
      try {
        const v = await B.versionCatalogo();
        if (!v) return false;
        if (this.catalogo && this.catalogo.version >= v.version) return false;
        const c = await B.catalogo(v.version), habia = !!this.catalogo;
        this.catalogo = c; Store.set("catalogo", c); this.avisar(habia ? "catalogo_actualizado" : "catalogo");
        return true;
      } catch (e) {
        if (!this.catalogo && MODO_DEMO) { this.catalogo = await catalogoInicial(); Store.set("catalogo", this.catalogo); this.avisar("catalogo"); }
        return false;
      }
    },

    async registrar(p) { const r = await B.registrar(p); this._entrar(r); await this.sincronizar(); return r; },
    async ingresar(cedula, telefono) { const r = await B.ingresar(cedula, telefono); this._entrar(r); await this.sincronizar(); return r; },
    _entrar(r) {
      this.sesion = { token: r.token, perfil: r.perfil }; Store.set("sesion", this.sesion);
      this.mis = { lotes: [], registros: [] }; this.pendientes = { lotes: [], registros: [] }; this.guardarLocal();
    },
    async salir() {
      if (this.pendientes.lotes.length || this.pendientes.registros.length) await this.sincronizar();
      if (this.sesion) B.cerrarSesion(this.sesion.token);
      this.sesion = null; Store.del("sesion"); this.mis = { lotes: [], registros: [] }; this.pendientes = { lotes: [], registros: [] }; this.guardarLocal();
      this.avisar("sesion");
    },
    // productos de otras marcas: lista guardada en el teléfono + los que reportan los agricultores (se reintentan sin conexión)
    otros: Store.get("otros_productos", []),
    async actualizarOtros() {
      const pend = Store.get("otros_pend", []);
      for (const p of pend.slice()) { try { await B.reportarProducto(this.sesion && this.sesion.token, p); pend.splice(pend.indexOf(p), 1); } catch (e) { break; } }
      Store.set("otros_pend", pend);
      try { const l = await B.otrosProductos(); if (Array.isArray(l)) { this.otros = l; Store.set("otros_productos", l); } } catch (e) { /* sin conexión o aún no existe en la base */ }
    },
    reportarProducto(p) {
      const pend = Store.get("otros_pend", []); pend.push(p); Store.set("otros_pend", pend);
      // un fertilizante nuevo se puede usar de inmediato, aunque todavía no se haya enviado a la base
      if (p.tipo === "fertilizante" && !this.otros.some((x) => String(x.nombre).toLowerCase() === String(p.nombre).toLowerCase())) { this.otros = this.otros.concat([Object.assign({ categoria: "Fertilizante edáfico" }, p)]); Store.set("otros_productos", this.otros); }
      return this.actualizarOtros();
    },
    async solicitarRol(rol) {
      const perfil = await B.solicitarRol(this.sesion.token, rol);
      this.sesion.perfil = perfil; Store.set("sesion", this.sesion); this.avisar("perfil");
    },
    async actualizarPerfil(p) {
      const perfil = await B.actualizarPerfil(this.sesion.token, p);
      this.sesion.perfil = perfil; Store.set("sesion", this.sesion); this.avisar("perfil");
    },

    guardarLote(l) {
      const lote = Object.assign({ id: uuid(), borrado: false }, l);
      const i = this.mis.lotes.findIndex((x) => x.id === lote.id);
      if (i < 0) this.mis.lotes.push(lote); else this.mis.lotes[i] = lote;
      if (!this.pendientes.lotes.includes(lote.id)) this.pendientes.lotes.push(lote.id);
      this.guardarLocal(); this.avisar("datos"); this.sincronizar();
      return lote;
    },
    guardarRegistros(lista) {
      lista.forEach((r) => {
        const reg = Object.assign({ id: uuid(), borrado: false, creado: new Date().toISOString() }, r);
        const i = this.mis.registros.findIndex((x) => x.id === reg.id);
        if (i < 0) this.mis.registros.push(reg); else this.mis.registros[i] = reg;
        if (!this.pendientes.registros.includes(reg.id)) this.pendientes.registros.push(reg.id);
      });
      this.mis.registros.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
      this.guardarLocal(); this.avisar("datos"); this.sincronizar();
    },
    borrarRegistro(id) {
      const r = this.mis.registros.find((x) => x.id === id); if (!r) return;
      r.borrado = true; if (!this.pendientes.registros.includes(id)) this.pendientes.registros.push(id);
      this.guardarLocal(); this.avisar("datos"); this.sincronizar();
    },
    borrarLote(id) {
      const l = this.mis.lotes.find((x) => x.id === id); if (!l) return;
      l.borrado = true; if (!this.pendientes.lotes.includes(id)) this.pendientes.lotes.push(id);
      this.guardarLocal(); this.avisar("datos"); this.sincronizar();
    },
    lotes() { return this.mis.lotes.filter((l) => !l.borrado); },
    registros() { return this.mis.registros.filter((r) => !r.borrado); },
    hayPendientes() { return this.pendientes.lotes.length + this.pendientes.registros.length; },

    async sincronizar() {
      if (!this.sesion || this.sincronizando) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      this.sincronizando = true;
      try {
        const lotes = this.mis.lotes.filter((l) => this.pendientes.lotes.includes(l.id));
        const regs = this.mis.registros.filter((r) => this.pendientes.registros.includes(r.id));
        const enviados = { l: lotes.map((x) => x.id), r: regs.map((x) => x.id) };
        const res = await B.sincronizar(this.sesion.token, lotes, regs);
        this.pendientes.lotes = this.pendientes.lotes.filter((id) => !enviados.l.includes(id));
        this.pendientes.registros = this.pendientes.registros.filter((id) => !enviados.r.includes(id));
        // mantener lo que se creó mientras se sincronizaba
        const quedanL = this.mis.lotes.filter((l) => this.pendientes.lotes.includes(l.id));
        const quedanR = this.mis.registros.filter((r) => this.pendientes.registros.includes(r.id));
        const merge = (srv, loc) => srv.filter((s) => !loc.some((l) => l.id === s.id)).concat(loc);
        this.mis = { lotes: merge(res.lotes || [], quedanL), registros: merge(res.registros || [], quedanR) };
        this.mis.registros.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
        if (res.perfil) { this.sesion.perfil = res.perfil; Store.set("sesion", this.sesion); }
        this.ultimaSync = new Date().toISOString(); Store.set("ultima_sync", this.ultimaSync);
        this.guardarLocal(); this.avisar("datos");
      } catch (e) {
        if (e.codigo === "sesion_invalida") { this.sesion = null; Store.del("sesion"); this.avisar("sesion"); }
      } finally { this.sincronizando = false; }
    },
  };

  // ------------------------------------------------------------------ Administración
  const TABLAS = ["cultivos", "etapas", "productos", "problemas", "recomendaciones", "plan_sanitario", "plan_fertilizacion", "compatibilidad"];
  const borradorDemo = async () => {
    let b = Store.get("demo_borrador", null);
    if (!b) { b = await catalogoInicial(); Store.set("demo_borrador", b); }
    return b;
  };
  const AdminSupa = {
    async sesion() { const { data } = await cliente().auth.getSession(); if (!data.session) return null; const { data: ad } = await cliente().from("admins").select("user_id").eq("user_id", data.session.user.id); return ad && ad.length ? data.session.user : "no_admin"; },
    async entrar(correo, clave) { const { error: e } = await cliente().auth.signInWithPassword({ email: correo, password: clave }); if (e) throw new Error("Correo o contraseña incorrectos."); return this.sesion(); },
    async salir() { await cliente().auth.signOut(); },
    async listar(t) {
      const orden = t === "ajustes" ? "clave" : "id";
      let todo = [], desde = 0;
      for (;;) { const { data, error: e } = await cliente().from(t).select("*").order(orden).range(desde, desde + 999); if (e) throw error(e); todo = todo.concat(data); if (data.length < 1000) break; desde += 1000; }
      return todo;
    },
    async guardar(t, fila) {
      const q = fila.id !== undefined && fila.id !== null && fila.id !== "" ? cliente().from(t).upsert(fila).select() : cliente().from(t).insert(Object.fromEntries(Object.entries(fila).filter(([k]) => k !== "id"))).select();
      const { data, error: e } = await q; if (e) throw error(e); return data[0];
    },
    async guardarAjuste(clave, valor) { const { error: e } = await cliente().from("ajustes").upsert({ clave, valor }); if (e) throw error(e); },
    async borrar(t, id) { const { error: e } = await cliente().from(t).delete().eq("id", id); if (e) throw error(e); },
    async publicar() { return rpc("publicar_catalogo", {}); },
    async versionPublicada() { return Supa.versionCatalogo(); },
    async actualizarAgricultor(id, cambios) { const { error: e } = await cliente().from("agricultores").update(cambios).eq("id", id); if (e) throw error(e); },
    // fotos del manual: se guardan en la carpeta pública «fotos» de Supabase Storage
    async subirFoto(blob) {
      const ruta = `manual/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: e } = await cliente().storage.from("fotos").upload(ruta, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (e) throw new Error("No se pudo subir la foto: " + (e.message || e));
      return cliente().storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
    },
  };
  const AdminDemo = {
    demo: true,
    // en la demostración la foto queda dentro del navegador (reducida para que quepa)
    async subirFoto(blob) { return new Promise((ok, mal) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => mal(new Error("No se pudo leer la foto.")); fr.readAsDataURL(blob); }); },
    async sesion() { return Store.get("demo_admin", null); },
    async entrar(correo) { const u = { email: correo || "admin@demo" }; Store.set("demo_admin", u); return u; },
    async salir() { Store.del("demo_admin"); },
    async listar(t) {
      if (["agricultores", "lotes", "registros"].includes(t)) return demoDB()[t];
      if (t === "otros_productos") return Store.get("demo_otros", []);
      const b = await borradorDemo();
      if (t === "ajustes") return Object.entries(b.ajustes || {}).map(([clave, valor]) => ({ clave, valor }));
      return b[t] || [];
    },
    async guardar(t, fila) {
      if (t === "otros_productos") { const l = Store.get("demo_otros", []), i = l.findIndex((x) => String(x.id) === String(fila.id)); if (i < 0) { fila.id = l.length + 1; l.push(fila); } else l[i] = Object.assign({}, l[i], fila); Store.set("demo_otros", l); return fila; }
      const b = await borradorDemo(); b[t] = b[t] || [];
      if (fila.id === undefined || fila.id === null || fila.id === "") fila.id = t === "cultivos" ? String(fila.nombre || "cultivo").toLowerCase().replace(/[^a-z0-9]+/g, "-") : b[t].reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
      const i = b[t].findIndex((x) => String(x.id) === String(fila.id));
      if (i < 0) b[t].push(fila); else b[t][i] = Object.assign({}, b[t][i], fila);
      Store.set("demo_borrador", b); return fila;
    },
    async guardarAjuste(clave, valor) { const b = await borradorDemo(); b.ajustes = b.ajustes || {}; b.ajustes[clave] = valor; Store.set("demo_borrador", b); },
    async borrar(t, id) {
      const b = await borradorDemo(); b[t] = (b[t] || []).filter((x) => String(x.id) !== String(id));
      const refs = { productos: [["recomendaciones", "producto_id"], ["plan_sanitario", "producto_id"], ["plan_fertilizacion", "producto_id"], ["compatibilidad", "producto_a"], ["compatibilidad", "producto_b"]],
        problemas: [["recomendaciones", "problema_id"]], etapas: [["plan_sanitario", "etapa_id"], ["plan_fertilizacion", "etapa_id"]],
        cultivos: [["etapas", "cultivo_id"], ["problemas", "cultivo_id"], ["plan_fertilizacion", "cultivo_id"]] }[t] || [];
      refs.forEach(([tt, c]) => { b[tt] = (b[tt] || []).filter((x) => String(x[c]) !== String(id)); });
      Store.set("demo_borrador", b);
    },
    async publicar() {
      const b = await borradorDemo(), prev = Store.get("demo_publicado", null);
      const v = (prev ? prev.version : 1) + 1;
      const pub = JSON.parse(JSON.stringify(b)); pub.version = v; pub.publicado = new Date().toISOString();
      pub.productos = pub.productos.filter((p) => p.activo !== false); pub.cultivos = pub.cultivos.filter((c) => c.activo !== false);
      Store.set("demo_publicado", pub); return v;
    },
    async versionPublicada() { return Demo.versionCatalogo(); },
    async actualizarAgricultor(id, cambios) { const db = demoDB(); const a = db.agricultores.find((x) => x.id === id); if (a) Object.assign(a, cambios); demoSave(db); },
  };

  window.Datos = Datos;
  window.Admin = MODO_DEMO ? AdminDemo : AdminSupa;
  window.Admin.modoDemo = MODO_DEMO;
  window.Admin.TABLAS = TABLAS;
})();

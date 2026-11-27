/* CampoGuía · panel del administrador (asesor) */
(function () {
  const A = window.Admin, L = window.Logic;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = (s) => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get: (k, d) => { try { const v = localStorage.getItem("cg_adm_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem("cg_adm_" + k, JSON.stringify(v)); } catch (e) {} } };
  const DB = {};
  const NOMBRE = (window.AGRODOSIS_CONFIG || {}).APP_NOMBRE || "CampoGuía";
  document.title = NOMBRE + " · Administración";
  let usuario = null, version = null;

  function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }

  // ------------------------------------------------------------ opciones
  const CATEGORIAS = ["Insecticida", "Acaricida", "Fungicida preventivo", "Fungicida", "Desinfección de suelo", "Herbicida", "Bioestimulante", "Fertilizante foliar", "Fertilizante edáfico", "Enmienda", "Coadyuvante", "Cebo", "Semilla", "Otros"];
  const FORMULACIONES = [["corrector_ph", "Corrector de pH"], ["polvo", "Polvo / WG / WP"], ["suspension", "Suspensión concentrada (SC)"], ["liquido", "Líquido (sin definir)"], ["emulsion", "Emulsionable (EC)"], ["soluble", "Soluble (SL)"], ["liquido_foliar", "Fertilizante / estimulante líquido"], ["aceite_adherente", "Aceite / adherente"], ["siliconado", "Siliconado"], ["granulado", "Granulado al suelo"], ["cebo", "Cebo"]];
  const optCultivos = () => (DB.cultivos || []).map((c) => [c.id, c.nombre]);
  const nomCultivo = (id) => ((DB.cultivos || []).find((c) => c.id === id) || {}).nombre || id || "";
  const optEtapas = (cid) => (DB.etapas || []).filter((e) => e.uso !== "lote" && (!cid || e.cultivo_id === cid)).sort((a, b) => (a.cultivo_id + a.orden).localeCompare(b.cultivo_id + b.orden, undefined, { numeric: true })).map((e) => [e.id, nomCultivo(e.cultivo_id) + " · " + e.nombre + (e.uso === "fertilizacion" ? " (fertilización)" : e.uso === "sanitario" ? " (sanitario)" : "")]);
  const nomEtapa = (id) => { const e = (DB.etapas || []).find((x) => String(x.id) === String(id)); return e ? e.nombre : ""; };
  const optProductos = () => (DB.productos || []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((p) => [p.id, p.nombre + (p.ingrediente_activo ? " · " + p.ingrediente_activo : "")]);
  const nomProducto = (id) => ((DB.productos || []).find((p) => String(p.id) === String(id)) || {}).nombre || "";
  const optProblemas = () => (DB.problemas || []).slice().sort((a, b) => (a.cultivo_id + a.orden).localeCompare(b.cultivo_id + b.orden, undefined, { numeric: true })).map((p) => [p.id, nomCultivo(p.cultivo_id) + " · " + p.nombre]);
  const nomProblema = (id) => ((DB.problemas || []).find((p) => String(p.id) === String(id)) || {}).nombre || "";
  const sn = (v) => (v === true ? "Sí" : v === false ? "No" : "");
  const dosisTxt = (p) => p.modo_aplicacion === "suelo_ha" ? L.rango(p.dosis_min, p.dosis_max, "kg") + "/ha" : p.modo_aplicacion === "sitio" ? L.rango(p.dosis_min, p.dosis_max, "g") + "/sitio" : L.rango(p.dosis_min, p.dosis_max, p.unidad) + "/tanque" + (p.dosis_ha_min !== null && p.dosis_ha_min !== undefined && p.dosis_ha_min !== "" ? " · " + L.rango(p.dosis_ha_min, p.dosis_ha_max, p.unidad) + "/ha" : "");

  // ------------------------------------------------------------ secciones editables
  const SECCIONES = {
    productos: {
      tabla: "productos", titulo: "Productos", ayuda: "Dosis por tanque de 200 L (o por sitio / kg por ha según el modo). Los productos inactivos no se envían a la app.",
      buscar: (r) => [r.nombre, r.ingrediente_activo, r.categoria, r.control, r.fuente, r.nota].join(" "),
      filtro: { campo: "categoria", etiqueta: "Categoría", opciones: () => CATEGORIAS.map((c) => [c, c]) },
      columnas: [["Producto", (r) => `<b>${h(r.nombre)}</b>${/Completar/.test(r.nota || "") ? `<br><span class="pill claro-ambar">${h((r.nota.match(/Completar:.*$/) || [""])[0])}</span>` : ""}${/^⚠/.test(r.nota || "") ? `<br><span class="pill claro-rojo">Clorpirifos: revisar</span>` : ""}${/Internet/.test(r.fuente || "") ? `<br><span class="pill gris">Dato de internet</span>` : ""}`], ["Ingrediente activo", (r) => h(r.ingrediente_activo) + (r.grupo ? `<br><span class="pill gris">${h(r.grupo)}</span>` : "") + (r.concentracion ? `<br><span class="mini">${h(r.concentracion)}</span>` : (r.ingrediente_activo ? '<br><span class="pill claro-ambar">Sin concentración</span>' : ""))], ["Categoría", (r) => h(r.categoria)],
        ["Dosis", (r) => h(dosisTxt(r))], ["Presentaciones", (r) => (r.presentaciones || []).length ? (r.presentaciones || []).map((x) => h(L.nombrePresentacion(x)) + " $" + h(x.precio)).join("<br>") : (r.pvp !== null && r.pvp !== undefined ? "$" + h(r.pvp) + " (sin lista)" : "—")], ["Carencia", (r) => (r.carencia_dias !== null && r.carencia_dias !== undefined ? h(r.carencia_dias) + " d" : "—")], ["Activo", (r) => sn(r.activo !== false)]],
      campos: [
        { k: "nombre", t: "Nombre comercial", req: true }, { k: "ingrediente_activo", t: "Ingrediente activo" },
        { k: "concentracion", t: "Concentración del i.a.", ayuda: "Ej. Difenoconazol 250 g/L (EC). Se muestra en el manual y la calculadora." },
        { k: "categoria", t: "Categoría", tipo: "select", opciones: () => CATEGORIAS.map((c) => [c, c]), req: true },
        { k: "grupo", t: "Grupo de resistencia (IRAC / FRAC / HRAC)", tipo: "grupo" },
        { k: "modo_aplicacion", t: "Modo de aplicación", tipo: "select", opciones: () => [["tanque", "En tanque (dosis por 200 L)"], ["sitio", "Por sitio / planta (g)"], ["suelo_ha", "Al suelo (kg por ha)"]], def: "tanque" },
        { k: "dosis_min", t: "Dosis mínima (por tanque de 200 L, por sitio o kg/ha según el modo)", tipo: "num" }, { k: "dosis_max", t: "Dosis máxima", tipo: "num" },
        { k: "dosis_ha_min", t: "Dosis por hectárea mínima (cc o g por ha)", tipo: "num", ayuda: "Solo productos en tanque. Es la que usa la calculadora. Si la dejas vacía, se calcula desde la dosis por tanque con el agua por hectárea de Ajustes." },
        { k: "dosis_ha_max", t: "Dosis por hectárea máxima", tipo: "num" },
        { k: "unidad", t: "Unidad de la dosis", tipo: "select", opciones: () => [["cc", "cc"], ["g", "g"], ["kg/ha", "kg/ha"]], def: "cc" },
        { k: "formulacion", t: "Formulación (define el orden de mezcla)", tipo: "select", opciones: () => FORMULACIONES, def: "liquido" },
        { k: "presentacion", t: "Presentación (texto)", ayuda: "Ej. LT, 500 GR, 50 KG" },
        { k: "contenido", t: "Contenido del envase (cc o g)", tipo: "num", ayuda: "1 litro = 1000; saco de 50 kg = 50000" },
        { k: "contenido_unidad", t: "Unidad del contenido", tipo: "select", opciones: () => [["cc", "cc"], ["g", "g"]] },
        { k: "presentaciones", t: "Presentaciones y precios (lista oficial)", tipo: "presentaciones" },
        { k: "pvp", t: "Precio de referencia (PVP) $", tipo: "num", ayuda: "Se usa solo si el producto no tiene presentaciones cargadas." },
        { k: "carencia_dias", t: "Días de carencia", tipo: "num" }, { k: "reingreso_horas", t: "Horas de reingreso", tipo: "num" },
        { k: "categoria_tox", t: "Categoría toxicológica", ayuda: "Ej. II, III, IV" },
        { k: "control", t: "Qué controla / para qué sirve", tipo: "area" },
        { k: "dosis_texto", t: "Dosis como texto (referencia)" },
        { k: "nota", t: "Nota técnica para el agricultor", tipo: "area" },
        { k: "fuente", t: "Fuente de los datos", tipo: "area", ayuda: "Lo que diga «Internet» es referencial: revísalo con la etiqueta y bórralo cuando lo confirmes." },
        { k: "activo", t: "Visible en la app", tipo: "bool", def: true },
        { k: "no_sugerir", t: "No sugerir como alternativa automática", tipo: "bool", def: false },
      ],
    },
    problemas: {
      tabla: "problemas", titulo: "Problemas por cultivo", ayuda: "Plagas, enfermedades, malezas y necesidades de nutrición que el agricultor puede elegir.",
      buscar: (r) => r.nombre + " " + (r.descripcion || ""),
      filtro: { campo: "cultivo_id", etiqueta: "Cultivo", opciones: optCultivos },
      columnas: [["Cultivo", (r) => h(nomCultivo(r.cultivo_id))], ["Tipo", (r) => h(r.tipo)], ["Problema", (r) => `<b>${h(r.nombre)}</b>`], ["Clasificación", (r) => (r.clasificacion ? `<span class="pill">${h(r.clasificacion)}</span>` : (["plaga", "enfermedad"].includes(r.tipo) ? `<span class="mini">Sin clasificar</span>` : ""))], ["Fotos", (r) => { const fs = fotosValidas(r.fotos); return fs.length ? `<span style="display:inline-flex;align-items:center;gap:6px"><img src="${h(fs[0].url)}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px">${fs.length}</span>` : `<span class="mini">Sin fotos</span>`; }], ["Recomendaciones", (r) => `<a href="#recomendaciones?f=${r.id}">${(DB.recomendaciones || []).filter((x) => String(x.problema_id) === String(r.id)).length} productos →</a>`], ["Orden", (r) => h(r.orden)]],
      campos: [
        { k: "cultivo_id", t: "Cultivo", tipo: "select", opciones: optCultivos, req: true },
        { k: "tipo", t: "Tipo", tipo: "select", opciones: () => [["plaga", "Plaga"], ["enfermedad", "Enfermedad"], ["maleza", "Maleza"], ["nutricion", "Nutrición"]], req: true },
        { k: "nombre", t: "Nombre del problema", req: true }, { k: "descripcion", t: "Descripción / síntomas", tipo: "area" },
        { k: "clasificacion", t: "Clasificación (plaga: aparato bucal · enfermedad: clase del hongo)", tipo: "select", vacio: true,
          opciones: () => [...L.OPC_CLASE.plaga.map((k) => [k, "Plaga · " + k]), ...L.OPC_CLASE.enfermedad.map((k) => [k, "Enfermedad · " + k]), ["Deuteromiceto + Ascomiceto", "Enfermedad · Deuteromiceto + Ascomiceto"], ["Oomiceto + Deuteromiceto", "Enfermedad · Oomiceto + Deuteromiceto"], ["Oomiceto + Deuteromiceto + Basidiomiceto", "Enfermedad · Oomiceto + Deuteromiceto + Basidiomiceto"]],
          ayuda: "Define los grupos químicos funcionales y las «otras opciones de productos» que ve el agricultor. Taxonomía actual (Oomiceto, Ascomiceto, Basidiomiceto); Botrytis, Fusarium y Rhizoctonia se clasifican como Deuteromiceto." },
        { k: "como_actua", t: "Cómo se alimenta la plaga / qué es el hongo (explicación breve)", tipo: "area" },
        { k: "ciclo", t: "Ciclo de vida aproximado", ph: "≈ 5 días aprox", ayuda: "Se muestra junto a la clasificación. Usa el dato de la especie en el cultivo; si no hay, el del género." },
        { k: "ciclo_detalle", t: "Detalle del ciclo (qué mide y de dónde sale el dato)", tipo: "area" },
        { k: "fotos", t: "Fotografías referenciales", tipo: "fotos" },
        { k: "orden", t: "Orden en la lista", tipo: "num", def: 0 }, { k: "fuente", t: "Fuente", tipo: "area" },
      ],
    },
    recomendaciones: {
      tabla: "recomendaciones", titulo: "Recomendaciones", ayuda: "Qué productos se recomiendan para cada problema, en orden de prioridad. Si dejas la dosis vacía se usa la del producto.",
      buscar: (r) => nomProblema(r.problema_id) + " " + nomProducto(r.producto_id),
      filtro: { campo: "problema_id", etiqueta: "Problema", opciones: optProblemas },
      columnas: [["Problema", (r) => h(nomProblema(r.problema_id))], ["Prioridad", (r) => h(r.prioridad)], ["Producto", (r) => `<b>${h(nomProducto(r.producto_id))}</b>`], ["Etapa", (r) => h(nomEtapa(r.etapa_id) || "Todas")], ["Dosis propia", (r) => (r.dosis_min !== null && r.dosis_min !== undefined ? h(L.rango(r.dosis_min, r.dosis_max, "")) : "La del producto")]],
      campos: [
        { k: "problema_id", t: "Problema", tipo: "select", opciones: optProblemas, req: true, num: true },
        { k: "producto_id", t: "Producto", tipo: "select", opciones: optProductos, req: true, num: true },
        { k: "etapa_id", t: "Solo en la etapa (vacío = todas)", tipo: "select", opciones: () => optEtapas(), vacio: true, num: true },
        { k: "prioridad", t: "Prioridad (1 = primera opción)", tipo: "num", def: 1 },
        { k: "dosis_min", t: "Dosis mínima propia (por tanque)", tipo: "num" }, { k: "dosis_max", t: "Dosis máxima propia", tipo: "num" },
        { k: "nota", t: "Nota para el agricultor", tipo: "area" },
      ],
    },
    plan_sanitario: {
      tabla: "plan_sanitario", titulo: "Plan sanitario por etapa", ayuda: "Productos que se aplican en cada fase. Marca «Alternar» en los que se usan uno por semana.",
      buscar: (r) => nomEtapa(r.etapa_id) + " " + nomProducto(r.producto_id),
      filtro: { campo: "etapa_id", etiqueta: "Etapa", opciones: () => optEtapas() },
      columnas: [["Etapa", (r) => h(nomEtapa(r.etapa_id))], ["Producto", (r) => `<b>${h(nomProducto(r.producto_id))}</b>`], ["Dosis / tanque", (r) => h(L.cantidad(Number(r.dosis_tanque), r.unidad))], ["Alternar", (r) => sn(r.alternar)], ["Orden", (r) => h(r.orden)]],
      campos: [
        { k: "etapa_id", t: "Etapa", tipo: "select", opciones: () => optEtapas(), req: true, num: true },
        { k: "producto_id", t: "Producto", tipo: "select", opciones: optProductos, req: true, num: true },
        { k: "dosis_tanque", t: "Dosis por tanque de 200 L", tipo: "num" },
        { k: "unidad", t: "Unidad", tipo: "select", opciones: () => [["cc", "cc"], ["g", "g"]], def: "cc" },
        { k: "alternar", t: "Alternar cada semana", tipo: "bool", def: false },
        { k: "orden", t: "Orden", tipo: "num", def: 1 },
      ],
    },
    plan_fertilizacion: {
      tabla: "plan_fertilizacion", titulo: "Plan de fertilización", ayuda: "Al suelo: usa g por planta o kg de NPK por ha por aplicación (la app calcula los sacos). Foliar: dosis por tanque de 200 L.",
      buscar: (r) => nomEtapa(r.etapa_id) + " " + nomProducto(r.producto_id),
      filtro: { campo: "etapa_id", etiqueta: "Etapa", opciones: () => optEtapas() },
      columnas: [["Etapa", (r) => h(nomCultivo(r.cultivo_id) + " · " + nomEtapa(r.etapa_id))], ["Tipo", (r) => h(r.tipo)], ["Producto", (r) => `<b>${h(nomProducto(r.producto_id))}</b>`],
        ["Dosis", (r) => h([r.dosis_g_planta && r.dosis_g_planta + " g/planta", r.dosis_kg_ha && r.dosis_kg_ha + " kg NPK/ha/aplic.", r.dosis_tanque && r.dosis_tanque + " /tanque"].filter(Boolean).join(" · "))], ["Frecuencia", (r) => (r.frecuencia_dias ? h(r.frecuencia_dias) + " d" : "")]],
      campos: [
        { k: "cultivo_id", t: "Cultivo", tipo: "select", opciones: optCultivos, req: true },
        { k: "etapa_id", t: "Etapa", tipo: "select", opciones: () => optEtapas(), req: true, num: true },
        { k: "tipo", t: "Tipo", tipo: "select", opciones: () => [["suelo", "Al suelo"], ["foliar", "Foliar"], ["enmienda", "Enmienda"]], req: true },
        { k: "producto_id", t: "Producto", tipo: "select", opciones: optProductos, req: true, num: true },
        { k: "dosis_g_planta", t: "Gramos por planta", tipo: "num" }, { k: "dosis_kg_ha", t: "Kg de NPK por hectárea por aplicación", tipo: "num" },
        { k: "dosis_tanque", t: "Dosis por tanque (foliar)", tipo: "num" }, { k: "frecuencia_dias", t: "Cada cuántos días", tipo: "num" },
        { k: "condicion", t: "Condición", ayuda: "Ej. Si el pH del suelo es ácido" }, { k: "nota", t: "Nota", tipo: "area" }, { k: "orden", t: "Orden", tipo: "num", def: 1 },
      ],
    },
    compatibilidad: {
      tabla: "compatibilidad", titulo: "Compatibilidad de mezclas", ayuda: "Lo que se conoce de campo. La app avisa al agricultor cuando junta estos productos.",
      buscar: (r) => nomProducto(r.producto_a) + " " + nomProducto(r.producto_b) + " " + (r.nota || ""),
      filtro: { campo: "nivel", etiqueta: "Nivel", opciones: () => [["incompatible", "No mezclar"], ["precaucion", "Precaución"], ["compatible", "Compatible"]] },
      columnas: [["Producto A", (r) => `<b>${h(nomProducto(r.producto_a))}</b>`], ["Producto B", (r) => `<b>${h(nomProducto(r.producto_b))}</b>`], ["Nivel", (r) => `<span class="pill ${r.nivel === "incompatible" ? "rojo" : r.nivel === "precaucion" ? "ambar" : "verde"}">${h(r.nivel)}</span>`], ["Nota", (r) => h(r.nota)]],
      campos: [
        { k: "producto_a", t: "Producto A", tipo: "select", opciones: optProductos, req: true, num: true },
        { k: "producto_b", t: "Producto B", tipo: "select", opciones: optProductos, req: true, num: true },
        { k: "nivel", t: "Nivel", tipo: "select", opciones: () => [["incompatible", "No mezclar"], ["precaucion", "Precaución"], ["compatible", "Compatible"]], req: true },
        { k: "nota", t: "Explicación para el agricultor", tipo: "area" },
      ],
    },
    otros_productos: {
      tabla: "otros_productos", titulo: "Otras marcas", ayuda: "Productos que no son del portafolio y que los agricultores escribieron como su última aplicación. Completa el ingrediente activo y el grupo FRAC / IRAC de los pendientes para que la asesoría rápida no repita el grupo. Se envían a la app al guardar (no hace falta publicar).",
      buscar: (r) => r.nombre + " " + (r.ingrediente_activo || "") + " " + (r.grupo || "") + " " + (r.empresa || ""),
      filtro: { campo: "estado", etiqueta: "Estado", opciones: () => [["pendiente", "Pendiente"], ["completo", "Completo"]] },
      columnas: [["Producto", (r) => `<b>${h(r.nombre)}</b>${r.empresa ? `<br><span class="mini">${h(r.empresa)}</span>` : ""}`], ["Ingrediente activo", (r) => r.ingrediente_activo ? h(r.ingrediente_activo) : `<span class="pill ambar">Falta</span>`],
        ["Grupo", (r) => r.grupo ? h(r.grupo) : r.ingrediente_activo && window.OtrasMarcas ? `<span class="mini">Sugerido: ${h(window.OtrasMarcas.grupoDeIA(r.ingrediente_activo) || "—")}</span>` : "—"], ["Veces", (r) => h(r.veces || 1)], ["Estado", (r) => `<span class="pill ${r.estado === "completo" ? "verde" : "ambar"}">${h(r.estado || "pendiente")}</span>`]],
      campos: [
        { k: "nombre", t: "Nombre comercial", req: true },
        { k: "ingrediente_activo", t: "Ingrediente activo", ayuda: "Como dice la etiqueta. Ej. TEBUCONAZOL + TRIFLOXISTROBIN" },
        { k: "grupo", t: "Grupo químico", ayuda: "Ej. FRAC 3 + 11 o IRAC 4A. Si lo dejas vacío la app lo deduce del ingrediente activo." },
        { k: "categoria", t: "Categoría", ayuda: "Fungicida, Insecticida, Herbicida…" },
        { k: "empresa", t: "Empresa / marca" },
        { k: "estado", t: "Estado", tipo: "select", opciones: () => [["pendiente", "Pendiente"], ["completo", "Completo"]], req: true },
      ],
    },
    etapas: {
      tabla: "etapas", titulo: "Cultivos y etapas", ayuda: "Etapas fenológicas de cada cultivo. Para agregar un cultivo nuevo usa el botón «Nuevo cultivo».",
      buscar: (r) => r.nombre + " " + nomCultivo(r.cultivo_id),
      filtro: { campo: "cultivo_id", etiqueta: "Cultivo", opciones: optCultivos },
      columnas: [["Cultivo", (r) => h(nomCultivo(r.cultivo_id))], ["Uso", (r) => h({ sanitario: "Plan sanitario", fertilizacion: "Fertilización", ambos: "Ambos" }[r.uso || "ambos"] || (r.uso === "lote" ? "Etapa del lote" : r.uso))], ["Orden", (r) => h(r.orden)], ["Etapa", (r) => `<b>${h(r.nombre)}</b>`], ["Semanas", (r) => h(r.semanas)], ["Riesgo hongos", (r) => h(r.riesgo_hongos)]],
      campos: [
        { k: "cultivo_id", t: "Cultivo", tipo: "select", opciones: optCultivos, req: true },
        { k: "nombre", t: "Nombre de la etapa", req: true },
        { k: "uso", t: "Se usa en", tipo: "select", opciones: () => [["ambos", "Plan sanitario y fertilización"], ["sanitario", "Solo plan sanitario"], ["fertilizacion", "Solo plan de fertilización"], ["lote", "Etapa del lote (al crear un lote)"]], def: "ambos" },
        { k: "semanas", t: "Semanas (texto)" },
        { k: "riesgo_hongos", t: "Riesgo de sarna/hongos", tipo: "select", opciones: () => [["bajo", "Bajo"], ["ligero", "Ligero"], ["alto", "Alto"]], vacio: true },
        { k: "notas", t: "Recomendaciones de manejo", tipo: "area" }, { k: "costo_ref_texto", t: "Costo de referencia (texto)" }, { k: "orden", t: "Orden", tipo: "num", def: 1 },
      ],
    },
  };

  // ------------------------------------------------------------ layout
  const MENU = [["resumen", "Resumen"], ["productos", "Productos"], ["problemas", "Problemas por cultivo"], ["recomendaciones", "Recomendaciones"], ["plan_sanitario", "Plan sanitario"], ["plan_fertilizacion", "Plan de fertilización"], ["compatibilidad", "Compatibilidad de mezclas"], ["otros_productos", "Otras marcas"], ["etapas", "Cultivos y etapas"], ["agricultores", "Agricultores y registros"], ["ajustes", "Ajustes de la app"]];
  const hayCambios = () => store.get("cambios", false);
  const marcarCambio = () => { store.set("cambios", true); const b = $("#estadoPub"); if (b) b.outerHTML = estadoPub(); };
  const estadoPub = () => hayCambios()
    ? `<div class="cambios" id="estadoPub">Tienes cambios sin publicar. Los agricultores siguen viendo la versión ${h(version ? version.version : "—")} hasta que pulses <b>Publicar a la app</b>.</div>`
    : `<div class="ok-pub" id="estadoPub">Versión publicada: <b>${h(version ? version.version : "—")}</b>${version && version.publicado ? " · " + new Date(version.publicado).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" }) : ""}. Los celulares la descargan cuando tienen señal.</div>`;
  function marco(seccion, contenido) {
    $("#adm").innerHTML = `<div class="adm">
      <nav class="adm-nav" aria-label="Secciones"><h1 style="display:flex;align-items:center;gap:10px"><img src="icons/logo-admin.svg" alt="" width="36" height="36" style="border-radius:9px;flex-shrink:0">${h(NOMBRE)} · Admin</h1>
        ${MENU.map(([k, t]) => { const nSol = k === "agricultores" ? (DB.agricultores || []).filter((a) => a.rol_solicitado === "tecnico").length : 0; return `<a href="#${k}" class="${k === seccion ? "sel" : ""}" ${k === seccion ? 'aria-current="page"' : ""}>${t}${nSol ? ` <span class="badge-sol" title="Solicitudes de técnico agrícola">${nSol}</span>` : ""}</a>`; }).join("")}
        <div class="pie"><span>${h(usuario && usuario.email)}${A.modoDemo ? " · modo demo" : ""}</span><a href="index.html" style="padding:0;min-height:0;color:#DCE7F1">Abrir la app del agricultor →</a><button id="salir">Cerrar sesión</button></div>
      </nav>
      <main class="adm-main">${contenido}</main></div>`;
    $("#salir").addEventListener("click", async () => { await A.salir(); usuario = null; iniciar(); });
    const pub = $("#publicar"); if (pub) pub.addEventListener("click", publicar);
  }
  async function publicar() {
    const b = $("#publicar"); b.disabled = true; b.textContent = "Publicando…";
    try { const v = await A.publicar(); version = await A.versionPublicada(); store.set("cambios", false); toast(`Versión ${v} publicada. Llegará a todos los celulares.`); router(); }
    catch (e) { toast(e.message); b.disabled = false; b.textContent = "Publicar a la app"; }
  }
  const botonPublicar = `<button class="btn" id="publicar">Publicar a la app</button>`;

  // ------------------------------------------------------------ editor genérico
  function vSeccion(clave, q) {
    const sec = SECCIONES[clave], filas = DB[sec.tabla] || [];
    const fval = q.f !== undefined ? q.f : store.get("f_" + clave, "");
    store.set("f_" + clave, fval);
    const busca = (q.q || "").toLowerCase();
    const vis = filas.filter((r) => (!fval || String(r[sec.filtro.campo]) === String(fval)) && (!busca || sec.buscar(r).toLowerCase().includes(busca)));
    if (clave === "recomendaciones") vis.sort((a, b) => Number(a.problema_id) - Number(b.problema_id) || Number(a.prioridad) - Number(b.prioridad));
    const sel = q.id === "nuevo" ? "nuevo" : filas.find((r) => String(r.id) === String(q.id)) || null;
    const extra = clave === "productos" ? `<label class="btn sec" style="cursor:pointer">Actualizar precios (lista Excel)<input type="file" id="impLista" accept=".xlsx,.xls" hidden></label><button class="btn sec" id="exp">Exportar Excel</button><label class="btn sec" style="cursor:pointer">Importar Excel<input type="file" id="imp" accept=".xlsx,.xls,.csv" hidden></label>` : clave === "etapas" ? `<button class="btn sec" id="nuevoCultivo">+ Nuevo cultivo</button>` : clave === "recomendaciones" && fval ? `<button class="btn sec" id="sugerir" title="Mantiene la opción recomendada y propone 4 alternativas por grupo químico, ordenadas de la más eficiente (1) a la menos (4)">Sugerir alternativas</button>` : "";
    marco(clave, `
      <div class="adm-cab"><div><h2>${h(sec.titulo)}</h2><div class="mini" style="margin-top:4px">${h(sec.ayuda)} · ${filas.length} en total</div></div>
        <div class="botones">${extra}<a class="btn sec" href="#${clave}?id=nuevo${fval ? "&f=" + encodeURIComponent(fval) : ""}">+ Nuevo</a>${botonPublicar}</div></div>
      ${estadoPub()}
      <div class="adm-filtros">
        <label class="campo">${h(sec.filtro.etiqueta)}<select id="filtro"><option value="">Todos</option>${sec.filtro.opciones().map(([v, t]) => `<option value="${h(v)}" ${String(v) === String(fval) ? "selected" : ""}>${h(t)}</option>`).join("")}</select></label>
        <label class="campo">Buscar<input id="buscar" type="search" value="${h(q.q || "")}"></label>
      </div>
      <div class="adm-cuerpo">
        <div class="adm-tabla"><table><thead><tr>${sec.columnas.map(([t]) => `<th>${h(t)}</th>`).join("")}</tr></thead>
          <tbody>${vis.map((r) => `<tr class="fila-dato ${sel && sel !== "nuevo" && sel.id === r.id ? "sel" : ""}" data-id="${h(r.id)}">${sec.columnas.map(([, f]) => `<td>${f(r)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${sec.columnas.length}" class="vacio">Sin resultados.</td></tr>`}</tbody></table></div>
        ${sel ? formulario(sec, sel === "nuevo" ? null : sel, fval) : `<aside class="adm-panel"><span class="mini">Toca una fila para editarla o usa «+ Nuevo».</span></aside>`}
      </div>`);
    const nav = (cambios) => { const p = new URLSearchParams(Object.assign({ f: fval, q: q.q || "" }, cambios)); location.hash = "#" + clave + "?" + p.toString(); };
    $("#filtro").addEventListener("change", (e) => nav({ f: e.target.value, id: "" }));
    let tm; $("#buscar").addEventListener("input", (e) => { clearTimeout(tm); tm = setTimeout(() => nav({ q: e.target.value, id: q.id || "" }), 350); });
    $$("tr.fila-dato").forEach((tr) => tr.addEventListener("click", (e) => { if (e.target.closest("a")) return; nav({ id: tr.dataset.id }); }));
    if (sel) conectarFormulario(sec, sel === "nuevo" ? null : sel, () => nav({ id: "" }));
    if (clave === "productos") { $("#exp").addEventListener("click", exportarProductos); $("#imp").addEventListener("change", importarProductos); $("#impLista").addEventListener("change", importarListaPrecios); }
    if (clave === "etapas") $("#nuevoCultivo").addEventListener("click", nuevoCultivo);
    if (clave === "recomendaciones" && fval) $("#sugerir").addEventListener("click", () => sugerirAlternativas(fval));
  }
  // ---- fotos del manual
  const urlFotoOk = (u) => /^https:\/\/[^\s"'<>]+$/i.test(u) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u);
  const fotosValidas = (fs) => (Array.isArray(fs) ? fs : []).filter((x) => x && urlFotoOk(String(x.url || "")));
  function comprimirFoto(archivo, max) {
    return new Promise((ok, mal) => {
      const url = URL.createObjectURL(archivo), img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la foto."))), "image/jpeg", A.demo ? 0.72 : 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); mal(new Error("«" + archivo.name + "» no es una imagen que el navegador pueda abrir.")); };
      img.src = url;
    });
  }
  const filaFoto = (x) => `<div class="foto-fila" data-url="${h(x.url)}">
      <img src="${h(x.url)}" alt="">
      <input data-fk="credito" value="${h(x.credito || "")}" placeholder="Crédito o descripción (ej. Foto: finca en Tarqui)">
      <div class="foto-btns"><button type="button" class="icono-btn" data-subir-foto aria-label="Mover antes">↑</button><button type="button" class="icono-btn" data-quitar-foto aria-label="Quitar foto">✕</button></div>
    </div>`;
  function campoHTML(c, val) {
    const v = val === undefined || val === null ? (c.def !== undefined ? c.def : "") : val;
    const ay = c.ayuda ? `<small>${h(c.ayuda)}</small>` : "";
    if (c.tipo === "select") return `<label class="campo">${h(c.t)}${c.req ? " *" : ""}<select name="${c.k}" ${c.req ? "required" : ""}>${c.req && !c.vacio ? "" : `<option value="">—</option>`}${c.opciones().map(([o, t]) => `<option value="${h(o)}" ${String(o) === String(v) ? "selected" : ""}>${h(t)}</option>`).join("")}</select>${ay}</label>`;
    if (c.tipo === "bool") return `<label class="fila" style="font-weight:600;font-size:14px;justify-content:flex-start;gap:10px"><input type="checkbox" name="${c.k}" ${v === true || v === "true" ? "checked" : ""} style="width:22px;height:22px;accent-color:var(--verde)">${h(c.t)}</label>`;
    if (c.tipo === "presentaciones") {
      const filas = Array.isArray(v) ? v : [];
      const fila = (x) => `<div class="pres-fila" style="display:grid;grid-template-columns:1.6fr .9fr .7fr .9fr auto;gap:6px;align-items:center">
        <input data-pk="empaque" value="${h(x.empaque || "")}" placeholder="Empaque" style="min-height:40px;border:1px solid var(--borde-2);border-radius:8px;padding:0 8px;min-width:0">
        <input data-pk="cantidad" inputmode="decimal" value="${h(x.cantidad ?? "")}" placeholder="Cant." style="min-height:40px;border:1px solid var(--borde-2);border-radius:8px;padding:0 8px;min-width:0">
        <select data-pk="unidad" style="min-height:40px;border:1px solid var(--borde-2);border-radius:8px;min-width:0"><option ${x.unidad === "cc" ? "selected" : ""}>cc</option><option ${x.unidad === "g" ? "selected" : ""}>g</option></select>
        <input data-pk="precio" inputmode="decimal" value="${h(x.precio ?? "")}" placeholder="$" style="min-height:40px;border:1px solid var(--borde-2);border-radius:8px;padding:0 8px;min-width:0">
        <button type="button" class="icono-btn" data-quitar-pres aria-label="Quitar presentación" style="width:36px;height:36px">✕</button>
        <input type="hidden" data-pk="codigo" value="${h(x.codigo || "")}"></div>`;
      return `<div class="campo" data-campo-pres="${c.k}">${h(c.t)}<small>Empaque, contenido (cc o g: 1 L = 1000 cc, 1 kg = 1000 g), unidad y precio. La app elige la combinación más barata.</small>
        <div style="display:flex;flex-direction:column;gap:6px" id="presFilas">${filas.map(fila).join("")}</div>
        <button type="button" class="btn sec chico" id="presMas">+ Agregar presentación</button>
        <template id="presTpl">${fila({ unidad: "cc" })}</template></div>`;
    }
    if (c.tipo === "fotos") {
      return `<div class="campo" data-campo-fotos="${c.k}">${h(c.t)}<small>La primera foto es la portada del tema. Usa fotos claras del síntoma o la plaga, de tus visitas de campo o con permiso de su autor.</small>
        <div class="fotos-lista" id="fotosFilas">${fotosValidas(v).map(filaFoto).join("")}</div>
        <label class="btn sec chico" style="cursor:pointer">+ Subir fotos<input type="file" id="fotoArchivo" accept="image/*" multiple hidden></label>
        <div class="unido-adm"><input id="fotoUrl" type="url" placeholder="…o pega el enlace https de una foto"><button type="button" class="btn sec chico" id="fotoUrlMas">Agregar enlace</button></div>
        <span class="mini" id="fotoEstado"></span></div>`;
    }
    if (c.tipo === "grupo") return `<div class="campo">${h(c.t)}<div id="grupoCalc" class="grupo-fijo" aria-live="polite"></div><small>Lo asigna la app según el ingrediente activo y las clasificaciones oficiales IRAC (insecticidas), FRAC (fungicidas) y HRAC (herbicidas). No se puede editar: cambia el ingrediente activo si está mal escrito.</small></div>`;
    if (c.tipo === "area") return `<label class="campo">${h(c.t)}<textarea name="${c.k}" rows="3">${h(v)}</textarea>${ay}</label>`;
    return `<label class="campo">${h(c.t)}${c.req ? " *" : ""}<input name="${c.k}" ${c.tipo === "num" ? 'inputmode="decimal"' : ""} value="${h(v)}" ${c.req ? "required" : ""}>${ay}</label>`;
  }
  function formulario(sec, fila, fval) {
    const base = fila || (sec.filtro && fval ? { [sec.filtro.campo]: fval } : {});
    return `<aside class="adm-panel"><form id="fe" novalidate>
      <h3>${fila ? "Editar" : "Nuevo"}${fila && fila.nombre ? " · " + h(fila.nombre) : ""}</h3>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">${sec.campos.map((c) => campoHTML(c, base[c.k])).join("")}</div>
      <p class="mini" id="err" role="alert" style="color:var(--rojo)"></p>
      <div class="acciones"><button class="btn" type="submit">Guardar</button>${fila ? `<button class="btn peligro" type="button" id="borrar">Eliminar</button>` : `<button class="btn sec" type="button" id="cerrar">Cancelar</button>`}</div>
    </form></aside>`;
  }
  function conectarFormulario(sec, fila, cerrar) {
    const f = $("#fe");
    const mas = $("#presMas");
    if (mas) {
      const quitar = (b) => b.addEventListener("click", () => b.closest(".pres-fila").remove());
      $$("[data-quitar-pres]", f).forEach(quitar);
      mas.addEventListener("click", () => { const n = $("#presTpl").content.firstElementChild.cloneNode(true); $("#presFilas").appendChild(n); quitar(n.querySelector("[data-quitar-pres]")); });
    }
    const lf = $("#fotosFilas");
    if (lf) {
      const conectarFila = (n) => {
        n.querySelector("[data-quitar-foto]").addEventListener("click", () => n.remove());
        n.querySelector("[data-subir-foto]").addEventListener("click", () => { if (n.previousElementSibling) lf.insertBefore(n, n.previousElementSibling); });
      };
      const agregar = (x) => { const t = document.createElement("template"); t.innerHTML = filaFoto(x).trim(); const n = t.content.firstElementChild; lf.appendChild(n); conectarFila(n); };
      $$(".foto-fila", lf).forEach(conectarFila);
      const est = $("#fotoEstado"), btnG = f.querySelector("button[type=submit]");
      $("#fotoArchivo").addEventListener("change", async (e) => {
        const archivos = [...e.target.files]; e.target.value = ""; if (!archivos.length) return;
        btnG.disabled = true; let n = 0;
        for (const a of archivos) {
          est.textContent = `Subiendo foto ${++n} de ${archivos.length}…`;
          try { const b = await comprimirFoto(a, A.demo ? 720 : 1280); agregar({ url: await A.subirFoto(b), credito: "" }); }
          catch (er) { toast(er.message); }
        }
        est.textContent = "Listo. Escribe el crédito de cada foto y guarda."; btnG.disabled = false;
      });
      $("#fotoUrlMas").addEventListener("click", () => {
        const u = $("#fotoUrl").value.trim();
        if (!/^https:\/\/[^\s"'<>]+$/i.test(u)) { est.textContent = "El enlace debe empezar con https:// y apuntar a una imagen."; return; }
        agregar({ url: u, credito: "" }); $("#fotoUrl").value = ""; est.textContent = "";
      });
    }
    const gc = $("#grupoCalc");
    const pintarGrupo = () => {
      const r = L.grupoResistencia(f.elements.ingrediente_activo.value, f.elements.categoria.value);
      gc.innerHTML = !r.aplica ? '<span class="mini">No aplica: no es plaguicida.</span>'
        : (r.grupo ? `<b>${h(r.grupo)}</b>` : "") + (r.faltan.length ? `<span class="pill claro-ambar">Sin clasificar: ${h(r.faltan.join(", "))}</span>` : "");
    };
    if (gc) { pintarGrupo(); ["ingrediente_activo", "categoria"].forEach((k) => f.elements[k].addEventListener("input", pintarGrupo)); f.elements.categoria.addEventListener("change", pintarGrupo); }
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const datos = fila ? { id: fila.id } : {};
      for (const c of sec.campos) {
        if (c.tipo === "grupo") continue;
        if (c.tipo === "fotos") {
          datos[c.k] = $$("#fotosFilas .foto-fila", f).map((n) => ({ url: n.dataset.url, credito: n.querySelector("[data-fk=credito]").value.trim() })).filter((x) => urlFotoOk(x.url));
          continue;
        }
        if (c.tipo === "presentaciones") {
          datos[c.k] = $$("#presFilas .pres-fila", f).map((fila) => {
            const val = (k) => fila.querySelector(`[data-pk="${k}"]`).value.trim();
            return { codigo: val("codigo") || null, empaque: val("empaque"), cantidad: Number(val("cantidad").replace(",", ".")), unidad: val("unidad"), precio: Number(val("precio").replace(",", ".")) };
          }).filter((x) => x.cantidad > 0 && x.precio >= 0 && !isNaN(x.precio)).sort((a, b) => a.cantidad - b.cantidad);
          continue;
        }
        const el = f.elements[c.k];
        let v = c.tipo === "bool" ? el.checked : el.value.trim();
        if (c.req && (v === "" || v === null)) { $("#err").textContent = "Completa: " + c.t; return; }
        if (c.tipo === "num") { v = v === "" ? null : Number(v.replace(",", ".")); if (v !== null && isNaN(v)) { $("#err").textContent = "Número no válido en: " + c.t; return; } }
        else if (c.num) v = v === "" ? null : Number(v);
        else if (c.tipo !== "bool" && v === "") v = null;
        datos[c.k] = v;
      }
      if (sec.campos.some((c) => c.tipo === "grupo")) datos.grupo = L.grupoResistencia(datos.ingrediente_activo, datos.categoria).grupo;
      const b = f.querySelector("button[type=submit]"); b.disabled = true;
      // recomendaciones: estado previo del problema para reubicar alternativas si cambia la opción recomendada
      const antesRecs = sec.tabla === "recomendaciones" ? (DB.recomendaciones || []).filter((r) => String(r.problema_id) === String(datos.problema_id)).map((r) => Object.assign({}, r)) : null;
      try {
        const guardada = await A.guardar(sec.tabla, datos);
        const arr = DB[sec.tabla] = DB[sec.tabla] || [];
        const i = arr.findIndex((x) => String(x.id) === String(guardada.id));
        if (i < 0) arr.push(guardada); else arr[i] = Object.assign({}, arr[i], guardada);
        if (antesRecs) { const msg = await reubicarAlternativas(antesRecs, guardada); if (msg) { marcarCambio(); toast(msg); cerrar(); return; } }
        marcarCambio(); toast("Guardado. Recuerda publicar."); cerrar();
      } catch (er) { $("#err").textContent = er.message; b.disabled = false; }
    });
    const br = $("#borrar"); if (br) br.addEventListener("click", async () => {
      if (!(await UI.confirmar("¿Eliminar este elemento? Si es un producto, también se quitará de las recomendaciones y planes.", { ok: "Eliminar", peligro: true }))) return;
      try { await A.borrar(sec.tabla, fila.id); await cargarTodo(); marcarCambio(); toast("Eliminado"); cerrar(); } catch (er) { $("#err").textContent = er.message; }
    });
    const ce = $("#cerrar"); if (ce) ce.addEventListener("click", cerrar);
  }
  // Si cambia la opción recomendada (prioridad 1), el producto saliente pasa a las alternativas y todas se vuelven a
  // ordenar por eficiencia (2 = alternativa 1, la más eficiente). Cada producto conserva su dosis propia y su nota.
  async function reubicarAlternativas(antes, guardada) {
    if (Number(guardada.prioridad) !== 1) return null;
    const previa = antes.filter((r) => Number(r.prioridad) === 1 && String(r.id) !== String(guardada.id)).concat(antes.filter((r) => String(r.id) === String(guardada.id) && Number(r.prioridad) === 1))[0];
    if (previa && String(previa.producto_id) === String(guardada.producto_id) && String(previa.id) === String(guardada.id)) return null; // misma recomendada
    const pr = (DB.problemas || []).find((x) => String(x.id) === String(guardada.problema_id)); if (!pr) return null;
    const P = (id) => (DB.productos || []).find((p) => String(p.id) === String(id));
    // filas actuales tras guardar
    let filas = (DB.recomendaciones || []).filter((r) => String(r.problema_id) === String(pr.id));
    const ops = [];
    // el producto saliente: si su fila fue la editada (se cambió el producto), hay que crearle una fila nueva
    if (previa && String(previa.producto_id) !== String(guardada.producto_id) && !filas.some((r) => String(r.producto_id) === String(previa.producto_id))) {
      const nueva = { problema_id: pr.id, producto_id: previa.producto_id, etapa_id: previa.etapa_id || null, prioridad: 99,
        dosis_min: String(previa.id) === String(guardada.id) ? null : previa.dosis_min, dosis_max: String(previa.id) === String(guardada.id) ? null : previa.dosis_max, nota: previa.nota || null };
      filas.push(nueva); ops.push(nueva);
    }
    // una fila por producto: la recomendada manda; duplicados del mismo producto se eliminan
    const vistos = new Set([String(guardada.producto_id)]), borrar = [];
    const alts = filas.filter((r) => String(r.id) !== String(guardada.id)).filter((r) => { const k = String(r.producto_id); if (vistos.has(k)) { if (r.id) borrar.push(r); return false; } vistos.add(k); return true; });
    const orden = L.ordenarPorEficiencia(pr, alts.map((r) => P(r.producto_id)).filter(Boolean));
    const porProd = new Map(alts.map((r) => [String(r.producto_id), r]));
    for (const r of borrar) await A.borrar("recomendaciones", r.id);
    for (let i = 0; i < orden.length; i++) { const r = porProd.get(String(orden[i].id)); r.prioridad = i + 2; await A.guardar("recomendaciones", r); }
    await cargarTodo();
    return `Opción recomendada: ${nomProducto(guardada.producto_id)}. Alternativas por eficiencia: ${orden.map((p, i) => `${i + 1}. ${p.nombre}`).join(", ")}. Recuerda publicar.`;
  }
  // propone 4 alternativas para un problema según los grupos químicos funcionales de su clase y el portafolio
  async function sugerirAlternativas(problemaId) {
    const pr = (DB.problemas || []).find((x) => String(x.id) === String(problemaId)); if (!pr) return;
    if (!pr.clasificacion) return toast("Primero asigna la clasificación del problema (aparato bucal, clase del hongo o tipo de maleza).");
    const recs = (DB.recomendaciones || []).filter((r) => String(r.problema_id) === String(pr.id)).sort((a, b) => a.prioridad - b.prioridad);
    if (!recs.length) return toast("Primero agrega la opción recomendada (prioridad 1).");
    const principal = recs[0];
    const alts = L.sugerirAlternativas(pr, DB.productos || [], principal.producto_id, 4, nomCultivo(pr.cultivo_id), recs.slice(1).map((r) => r.producto_id));
    if (!alts.length) return toast("No hay productos del portafolio en los grupos químicos de esta clase.");
    try {
      for (const r of recs.slice(1)) await A.borrar("recomendaciones", r.id);
      const nota = pr.cultivo_id === "pitahaya" ? null : `Sugerencia de manual técnico: confirma la dosis para ${nomCultivo(pr.cultivo_id).toLowerCase()} en la etiqueta.`;
      for (let i = 0; i < alts.length; i++) await A.guardar("recomendaciones", { problema_id: pr.id, producto_id: alts[i].id, etapa_id: null, prioridad: i + 2, dosis_min: null, dosis_max: null, nota });
      await cargarTodo(); marcarCambio(); toast(`Alternativas aplicadas: ${alts.map((p, i) => `${i + 1}. ${p.nombre}`).join(", ")}. Publica para enviarlas a la app.`); router();
    } catch (er) { toast(er.message); }
  }
  async function nuevoCultivo() {
    const nombre = await UI.pedir("Nombre del nuevo cultivo", "Ej. Plátano"); if (!nombre) return;
    const id = nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if ((DB.cultivos || []).some((c) => c.id === id)) return toast("Ese cultivo ya existe.");
    try { const c = await A.guardar("cultivos", { id, nombre: nombre.trim(), activo: true, orden: (DB.cultivos || []).length + 1 }); DB.cultivos.push(c); marcarCambio(); toast("Cultivo creado. Ahora agrega sus etapas."); location.hash = "#etapas?id=nuevo&f=" + id; } catch (e) { toast(e.message); }
  }

  // ------------------------------------------------------------ Excel de productos
  const camposProd = SECCIONES.productos.campos;
  function exportarProductos() {
    const filas = (DB.productos || []).map((p) => { const o = { id: p.id }; camposProd.forEach((c) => { o[c.t] = c.tipo === "bool" ? (p[c.k] !== false ? "Sí" : "No") : c.tipo === "presentaciones" ? (p[c.k] || []).map((x) => `${x.codigo || ""}|${x.empaque}|${x.cantidad}|${x.unidad}|${x.precio}`).join("; ") : p[c.k]; }); return o; });
    const ws = XLSX.utils.json_to_sheet(filas), wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos"); XLSX.writeFile(wb, "CampoGuia_productos.xlsx");
  }
  async function importarProductos(e) {
    const file = e.target.files[0]; if (!file) return;
    const wb = XLSX.read(await file.arrayBuffer()), filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
    if (!filas.length || !("Nombre comercial" in filas[0])) { toast("Usa el formato de «Exportar Excel» (columna «Nombre comercial»)."); return; }
    if (!(await UI.confirmar(`Se actualizarán o crearán ${filas.length} productos. ¿Continuar?`, { ok: "Importar" }))) return;
    let n = 0, err = 0;
    for (const f of filas) {
      const nombre = String(f["Nombre comercial"] || "").trim(); if (!nombre) continue;
      const existente = (DB.productos || []).find((p) => (f.id && String(p.id) === String(f.id)) || p.nombre.toLowerCase() === nombre.toLowerCase());
      const datos = existente ? { id: existente.id } : {};
      camposProd.forEach((c) => {
        if (c.tipo === "grupo") return;
        let v = f[c.t]; if (v === undefined) return;
        if (c.tipo === "presentaciones") v = String(v || "").split(";").map((t) => t.trim()).filter(Boolean).map((t) => { const [codigo, empaque, cantidad, unidad, precio] = t.split("|"); return { codigo: codigo || null, empaque, cantidad: Number(cantidad), unidad, precio: Number(precio) }; }).filter((x) => x.cantidad > 0);
        else if (c.tipo === "num") v = v === null || v === "" ? null : Number(String(v).replace(",", "."));
        else if (c.tipo === "bool") v = !/^no$|^false$|^0$/i.test(String(v));
        else v = v === null ? null : String(v);
        datos[c.k] = v;
      });
      if (!datos.categoria) datos.categoria = existente ? existente.categoria : "Insecticida";
      datos.grupo = L.grupoResistencia(datos.ingrediente_activo !== undefined ? datos.ingrediente_activo : existente && existente.ingrediente_activo, datos.categoria).grupo;
      try { await A.guardar("productos", datos); n++; } catch (x) { err++; }
    }
    await cargarTodo(); marcarCambio(); toast(`${n} productos importados${err ? ", " + err + " con error" : ""}. Revisa y publica.`); router();
  }

  // ------------------------------------------------------------ lista de precios oficial (Excel): actualiza precios por código
  async function importarListaPrecios(e) {
    const file = e.target.files[0]; if (!file) return;
    const wb = XLSX.read(await file.arrayBuffer());
    const filas = [];
    wb.SheetNames.forEach((n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "" }).forEach((r) => filas.push(r.map((x) => String(x).trim()))));
    const precios = {};
    filas.forEach((r) => {
      const cod = r.find((x) => /^[0-9A-Z]{8}$/.test(x)); if (!cod) return;
      const nums = r.filter((x) => /^\$?\s*[\d.]+(,\d{1,2})?$|^\$?\s*\d+(\.\d{1,2})?$/.test(x) && x !== cod);
      if (!nums.length) return;
      const t = nums[nums.length - 1].replace("$", "").trim();
      const precio = /,\d{1,2}$/.test(t) ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
      if (!isNaN(precio) && precio > 0) precios[cod] = precio;
    });
    const cods = Object.keys(precios);
    if (!cods.length) { toast("No encontré códigos y precios en el archivo. Usa el Excel de la lista de precios de Ecuaquímica."); return; }
    let cambios = 0, productos = 0;
    for (const p of DB.productos || []) {
      let toca = false;
      const pres = (p.presentaciones || []).map((x) => { if (x.codigo && precios[x.codigo] !== undefined && precios[x.codigo] !== x.precio) { cambios++; toca = true; return Object.assign({}, x, { precio: precios[x.codigo] }); } return x; });
      if (toca) {
        const ref = pres.find((x) => Number(x.cantidad) === 1000) || pres[pres.length - 1];
        await A.guardar("productos", { id: p.id, presentaciones: pres, pvp: ref ? ref.precio : p.pvp }); productos++;
      }
    }
    await cargarTodo(); marcarCambio(); toast(`${cods.length} códigos leídos. ${cambios} precios actualizados en ${productos} productos. Revisa y publica.`); router();
  }

  // ------------------------------------------------------------ ajustes
  const AJUSTES = [
    ["nombre_asesor", "Nombre del asesor", "Aparece en los mensajes de WhatsApp."],
    ["whatsapp_asesor", "WhatsApp del asesor", "Tu enlace de WhatsApp (https://wa.me/message/…) o tu número (0991234567). Con el número, el mensaje llega ya escrito (por ejemplo, la mezcla a validar). Con el enlace, la app copia el mensaje para que el agricultor lo pegue."],
    ["volumen_tanque_l", "Litros del tanque", "La dosis de los productos se guarda por este volumen (normalmente 200)."],
    ["volumen_bomba_l", "Litros de la bomba de mochila", "Normalmente 20."],
    ["litros_agua_ha", "Litros de agua por hectárea (valor inicial)", "La app lo usa para calcular por hectárea; el agricultor puede cambiarlo."],
    ["plantas_por_bomba", "Plantas que cubre una bomba (valor inicial)", "Para calcular por número de plantas."],
    ["ph_acido", "pH desde el cual el suelo se considera ácido", "Por debajo de este valor la app recomienda la enmienda."],
    ["aviso_legal", "Aviso que aparece con cada recomendación", ""],
  ];
  function vAjustes() {
    const aj = Object.fromEntries((DB.ajustes || []).map((a) => [a.clave, a.valor]));
    marco("ajustes", `<div class="adm-cab"><h2>Ajustes de la app</h2><div class="botones">${botonPublicar}</div></div>${estadoPub()}
      <form class="card" id="fa" style="max-width:640px">${AJUSTES.map(([k, t, a]) => `<label class="campo">${h(t)}<input name="${k}" value="${h(aj[k] === undefined || aj[k] === null ? "" : Array.isArray(aj[k]) ? aj[k].join(", ") : aj[k])}">${a ? `<small>${h(a)}</small>` : ""}</label>`).join("")}
      <button class="btn" type="submit">Guardar ajustes</button></form>`);
    $("#fa").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        for (const [k] of AJUSTES) {
          let v = e.target.elements[k].value.trim();
          if (/^(volumen|litros|plantas|ph)/.test(k) && v !== "") v = Number(v.replace(",", "."));
          if (String(aj[k] === undefined || aj[k] === null ? "" : aj[k]) !== String(v)) await A.guardarAjuste(k, v === "" ? null : v);
        }
        DB.ajustes = await A.listar("ajustes"); marcarCambio(); toast("Ajustes guardados. Recuerda publicar.");
      } catch (er) { toast(er.message); }
    });
  }

  // ------------------------------------------------------------ agricultores y seguimiento
  const hoyISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  function dosisAlta(r) {
    const p = (DB.productos || []).find((x) => String(x.id) === String(r.producto_id));
    if (!p || p.modo_aplicacion !== "tanque" || !p.dosis_max || !r.dosis || !r.unidad) return false;
    const u = String(r.unidad).toLowerCase(), tanque = Number(ajuste("volumen_tanque_l", 200)), bomba = Number(ajuste("volumen_bomba_l", 20));
    let vol = null; const m = u.match(/\/\s*(\d+(?:[.,]\d+)?)\s*l/);
    if (m) vol = Number(m[1].replace(",", ".")); else if (u.includes("bomba")) vol = bomba; else if (u.includes("tanque")) vol = tanque;
    if (!vol) return false;
    return (Number(r.dosis) * tanque) / vol > Number(p.dosis_max) * 1.2;
  }
  const ajuste = (k, d) => { const a = (DB.ajustes || []).find((x) => x.clave === k); return a && a.valor !== null && a.valor !== "" ? a.valor : d; };
  function infoAgricultores() {
    const regs = (DB.registros || []).filter((r) => !r.borrado), hoy = hoyISO();
    return (DB.agricultores || []).map((a) => {
      const mios = regs.filter((r) => r.agricultor_id === a.id);
      const ult = mios.map((r) => r.fecha).sort().pop() || null;
      const alertas = [];
      if (mios.some(dosisAlta)) alertas.push(["rojo", "Dosis alta"]);
      if (a.rol_solicitado === "tecnico") alertas.push(["azul", "Pide ser técnico"]);
      if (!ult || L.diasEntre(ult, hoy) > 30) alertas.push(["claro-ambar", ult ? "Sin actividad 30 días" : "Sin registros"]);
      return Object.assign({}, a, { nRegs: mios.length, ult, alertas, costo: mios.reduce((s, r) => s + (Number(r.costo) || 0) + (Number(r.costo_mano_obra) || 0), 0) });
    });
  }
  function exportarRegistros(lista, archivo) {
    const ag = Object.fromEntries((DB.agricultores || []).map((a) => [a.id, a])), lo = Object.fromEntries((DB.lotes || []).map((l) => [l.id, l]));
    const filas = lista.filter((r) => !r.borrado).map((r) => { const a = ag[r.agricultor_id] || {}, l = lo[r.lote_id] || {};
      return { Fecha: r.fecha, Agricultor: a.nombres, "Cédula": a.cedula, Celular: a.telefono, Provincia: a.provincia, Sector: a.sector, "Latitud finca": a.latitud, "Longitud finca": a.longitud, Lote: l.nombre, "Latitud lote": l.latitud, "Longitud lote": l.longitud, Cultivo: nomCultivo(l.cultivo_id), "Ha lote": l.hectareas, Actividad: r.actividad, Objetivo: r.objetivo, "Producto o labor": r.producto_nombre, Dosis: r.dosis, Unidad: r.unidad, "Quién aplicó / trabajó": r.aplicador, Clima: r.clima, Personas: r.personas, "Pago diario $": r.pago_diario, "Días trabajados": r.costo_mano_obra ? r.dias_trabajo || 1 : "", "Costo insumos $": r.costo, "Costo mano de obra $": r.costo_mano_obra, "Costo total $": Math.round(((Number(r.costo) || 0) + (Number(r.costo_mano_obra) || 0)) * 100) / 100, "Carencia hasta": r.carencia_hasta, "Próxima": r.proxima_fecha, Observaciones: r.observaciones, "Dosis alta": dosisAlta(r) ? "Sí" : "" }; });
    const ws = XLSX.utils.json_to_sheet(filas), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Registros"); XLSX.writeFile(wb, archivo);
  }
  function vAgricultores(q) {
    const lista = infoAgricultores(), busca = (q.q || "").toLowerCase();
    const vis = lista.filter((a) => (!q.prov || a.provincia === q.prov) && (!busca || [a.nombres, a.cedula, a.telefono, a.comunidad, a.provincia, a.sector].join(" ").toLowerCase().includes(busca))).sort((a, b) => ((b.rol_solicitado ? 1 : 0) - (a.rol_solicitado ? 1 : 0)) || (b.alertas.length - a.alertas.length) || String(b.ult || "").localeCompare(String(a.ult || "")));
    const sel = lista.find((a) => a.id === q.id);
    let panel = `<aside class="adm-panel"><span class="mini">Toca un agricultor para ver sus lotes y registros.</span></aside>`;
    if (sel) {
      const lotes = (DB.lotes || []).filter((l) => l.agricultor_id === sel.id && !l.borrado), regs = (DB.registros || []).filter((r) => r.agricultor_id === sel.id && !r.borrado).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
      panel = `<aside class="adm-panel"><h3>${h(sel.nombres)}</h3>
        <div class="mini">Cédula ${h(sel.cedula)} · ${h(sel.telefono)} · ${h([sel.sector, sel.provincia].filter(Boolean).join(", "))} · ${sel.rol === "tecnico" ? "Técnico agrícola" : "Agricultor"}${sel.edad ? " · " + h(sel.edad) + " años" : ""}${sel.cultivo_texto ? " · Cultivo: " + h(sel.cultivo_texto) : ""}${sel.institucion ? " · Institución: " + h(sel.institucion) : ""}${sel.acepta_seguimiento === false ? " · <b>No autorizó seguimiento</b>" : ""}</div>
        <div class="mini">${sel.latitud ? `Finca georreferenciada: ${h(Number(sel.latitud).toFixed(5))}, ${h(Number(sel.longitud).toFixed(5))} (±${h(sel.precision_m)} m) · <a href="https://www.google.com/maps?q=${h(sel.latitud)},${h(sel.longitud)}" target="_blank" rel="noopener">Ver en el mapa</a>` : "Sin ubicación GPS de la finca."}</div>
        ${sel.rol_solicitado === "tecnico" ? `<div class="aviso-rol"><b>Solicitud de cambio a Técnico agrícola</b>${sel.institucion ? `<span>Institución: <b>${h(sel.institucion)}</b></span>` : `<span class="mini">No indicó institución</span>`}${sel.rol_solicitado_fecha ? `<span class="mini">Enviada el ${h(new Date(sel.rol_solicitado_fecha).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" }))}</span>` : ""}<span class="mini">Al aprobar verá los grupos químicos funcionales y otras opciones de productos.</span><div class="acciones"><button class="btn chico" id="rolAprobar">Aprobar</button><button class="btn sec chico" id="rolRechazar">Rechazar</button></div></div>`
          : sel.rol === "tecnico" ? `<div class="acciones"><button class="btn sec chico" id="rolQuitar">Quitar acceso de técnico</button></div>` : ""}
        <div class="chips">${sel.alertas.map(([c, t]) => `<span class="pill ${c}">${h(t)}</span>`).join("")}</div>
        <div class="acciones"><a class="btn wa chico" target="_blank" rel="noopener" href="https://wa.me/${h(String(sel.telefono).replace(/^0/, "593"))}">WhatsApp</a><button class="btn sec chico" id="expUno">Exportar Excel</button></div>
        <div class="etq">Lotes (${lotes.length})</div>
        ${lotes.map((l) => `<div class="mini"><b>${h(l.nombre)}</b> · ${h(nomCultivo(l.cultivo_id))} · ${l.hectareas ? h(l.hectareas) + " ha" : ""} ${l.plantas ? "· " + h(l.plantas) + " pl" : ""} ${l.etapa_id ? "· " + h(nomEtapa(l.etapa_id)) : ""} · ${l.latitud ? `<a href="https://www.google.com/maps?q=${h(l.latitud)},${h(l.longitud)}" target="_blank" rel="noopener">Ver lote en el mapa</a> (±${h(l.precision_m)} m)` : "sin GPS"}</div>`).join("") || `<span class="mini">Sin lotes.</span>`}
        <div class="etq">Últimos registros (${regs.length})</div>
        ${regs.slice(0, 40).map((r) => `<div class="mini" style="border-top:1px solid var(--borde);padding-top:6px"><b>${h(r.fecha)} · ${h(r.actividad)}</b>${r.objetivo ? " · " + h(r.objetivo) : ""}${dosisAlta(r) ? ' <span class="pill rojo">Dosis alta</span>' : ""}<br>${h(r.producto_nombre || "")} ${r.dosis !== null && r.dosis !== undefined ? h(r.dosis) + " " + h(r.unidad || "") : ""} ${r.costo ? "· $" + h(r.costo) : ""}${r.costo_mano_obra ? " · Mano de obra $" + h(r.costo_mano_obra) + " (" + h(r.personas) + " pers.)" : ""}${r.observaciones ? "<br>“" + h(r.observaciones) + "”" : ""}</div>`).join("") || `<span class="mini">Sin registros.</span>`}
        <button class="btn ${sel.activo === false ? "" : "peligro"} chico" id="activo">${sel.activo === false ? "Reactivar cuenta" : "Desactivar cuenta"}</button>
      </aside>`;
    }
    marco("agricultores", `<div class="adm-cab"><div><h2>Agricultores y registros</h2><div class="mini" style="margin-top:4px">${lista.length} cuentas</div></div><div class="botones"><button class="btn sec" id="recargar">Actualizar</button><button class="btn" id="expTodo">Exportar todos los registros</button></div></div>
      <div class="adm-filtros"><label class="campo">Provincia<select id="prov"><option value="">Todas</option>${[...new Set(lista.map((a) => a.provincia).filter(Boolean))].sort().map((x) => `<option ${x === q.prov ? "selected" : ""}>${h(x)}</option>`).join("")}</select></label><label class="campo">Buscar<input id="buscar" type="search" value="${h(q.q || "")}" placeholder="Nombre, cédula, celular o sector"></label></div>
      <div class="adm-cuerpo"><div class="adm-tabla"><table><thead><tr><th>Agricultor</th><th>Provincia · sector</th><th>GPS</th><th>Cultivo</th><th>Ha</th><th>Registros</th><th>Última actividad</th><th>Costo registrado</th><th>Alertas</th></tr></thead><tbody>
        ${vis.map((a) => `<tr class="fila-dato ${sel && sel.id === a.id ? "sel" : ""}" data-id="${h(a.id)}"><td><b>${h(a.nombres)}</b><br><span class="mini">${h(a.cedula)} · ${h(a.telefono)}</span></td><td>${h(a.provincia || "")}<br><span class="mini">${h(a.sector || "")}</span></td><td>${a.latitud ? `<a href="https://www.google.com/maps?q=${h(a.latitud)},${h(a.longitud)}" target="_blank" rel="noopener">Mapa</a>` : "—"}</td><td>${h(nomCultivo(a.cultivo_id))}</td><td>${h(a.hectareas === null || a.hectareas === undefined ? "" : a.hectareas)}</td><td>${a.nRegs}</td><td>${h(a.ult || "—")}</td><td>$${a.costo.toFixed(2)}</td><td>${a.alertas.map(([c, t]) => `<span class="pill ${c}">${h(t)}</span>`).join(" ")}${a.activo === false ? ' <span class="pill gris">Inactiva</span>' : ""}</td></tr>`).join("") || `<tr><td colspan="10" class="vacio">Todavía no hay agricultores registrados.</td></tr>`}
      </tbody></table></div>${panel}</div>`);
    $$("tr.fila-dato").forEach((tr) => tr.addEventListener("click", (e) => { if (e.target.closest("a")) return; location.hash = "#agricultores?id=" + tr.dataset.id + "&q=" + encodeURIComponent(q.q || "") + "&prov=" + encodeURIComponent(q.prov || ""); }));
    $("#prov").addEventListener("change", (e) => { location.hash = "#agricultores?prov=" + encodeURIComponent(e.target.value) + "&q=" + encodeURIComponent(q.q || ""); });
    let tm; $("#buscar").addEventListener("input", (e) => { clearTimeout(tm); tm = setTimeout(() => { location.hash = "#agricultores?q=" + encodeURIComponent(e.target.value) + (q.id ? "&id=" + q.id : ""); }, 350); });
    $("#expTodo").addEventListener("click", () => exportarRegistros(DB.registros || [], "CampoGuia_registros_" + hoyISO() + ".xlsx"));
    $("#recargar").addEventListener("click", async () => { await cargarSeguimiento(); router(); toast("Datos actualizados"); });
    if (sel) {
      $("#expUno").addEventListener("click", () => exportarRegistros((DB.registros || []).filter((r) => r.agricultor_id === sel.id), "Registros_" + sel.nombres.replace(/\W+/g, "_") + ".xlsx"));
      const cambiarRol = async (cambios, msg) => { await A.actualizarAgricultor(sel.id, cambios); await cargarSeguimiento(); router(); toast(msg); };
      if ($("#rolAprobar")) $("#rolAprobar").addEventListener("click", () => cambiarRol({ rol: "tecnico", rol_solicitado: null, rol_solicitado_fecha: null }, "Aprobado: ahora es técnico agrícola"));
      if ($("#rolRechazar")) $("#rolRechazar").addEventListener("click", async () => { if (await UI.confirmar("La cuenta seguirá como agricultor. ¿Rechazar la solicitud?", { ok: "Rechazar" })) cambiarRol({ rol_solicitado: null, rol_solicitado_fecha: null }, "Solicitud rechazada"); });
      if ($("#rolQuitar")) $("#rolQuitar").addEventListener("click", async () => { if (await UI.confirmar("La cuenta pasará a agricultor. ¿Quitar el acceso de técnico agrícola?", { ok: "Quitar acceso", peligro: true })) cambiarRol({ rol: "agricultor", rol_solicitado: null, rol_solicitado_fecha: null }, "Ahora es agricultor"); });
      $("#activo").addEventListener("click", async () => { const nuevo = sel.activo === false; if (!nuevo && !(await UI.confirmar("La persona no podrá ingresar a la app. ¿Desactivar la cuenta?", { ok: "Desactivar", peligro: true }))) return; await A.actualizarAgricultor(sel.id, { activo: nuevo }); await cargarSeguimiento(); router(); });
    }
  }

  function vResumen() {
    const ag = infoAgricultores(), regs = (DB.registros || []).filter((r) => !r.borrado), hoy = hoyISO();
    const semana = regs.filter((r) => L.diasEntre(r.fecha, hoy) <= 7).length;
    const incompletos = (DB.productos || []).filter((p) => p.nota && /^Completar/.test(p.nota));
    const sinCarencia = (DB.productos || []).filter((p) => p.activo !== false && p.modo_aplicacion === "tanque" && (p.carencia_dias === null || p.carencia_dias === undefined) && !["Coadyuvante", "Bioestimulante", "Fertilizante foliar", "Herbicida"].includes(p.categoria));
    marco("resumen", `<div class="adm-cab"><h2>Resumen</h2><div class="botones">${botonPublicar}</div></div>${estadoPub()}
      <div class="kpis">
        <div class="kpi"><b>${ag.length}</b><span>Agricultores y técnicos</span></div>
        <div class="kpi"><b>${semana}</b><span>Registros en los últimos 7 días</span></div>
        <div class="kpi"><b>${ag.filter((a) => a.alertas.some(([, t]) => t === "Dosis alta")).length}</b><span>Con dosis más alta que la etiqueta</span></div>
        <div class="kpi"><b>${ag.filter((a) => a.alertas.some(([, t]) => /actividad|Sin registros/.test(t))).length}</b><span>Sin actividad en 30 días</span></div>
        <div class="kpi"><b>${(DB.productos || []).length}</b><span>Productos en el catálogo</span></div>
      </div>
      <section class="card"><b>Tareas pendientes en el catálogo</b>
        ${incompletos.length ? `<div class="mini">Productos con datos incompletos: ${incompletos.map((p) => `<a href="#productos?id=${p.id}">${h(p.nombre)}</a>`).join(", ")}</div>` : ""}
        ${sinCarencia.length ? `<div class="mini">${sinCarencia.length} productos sin <b>días de carencia</b> (la app muestra «Ver etiqueta» y no puede avisar cuándo cosechar): ${sinCarencia.slice(0, 12).map((p) => `<a href="#productos?id=${p.id}">${h(p.nombre)}</a>`).join(", ")}${sinCarencia.length > 12 ? "…" : ""}</div>` : ""}
        ${(DB.productos || []).some((p) => /Internet/.test(p.fuente || "")) ? `<div class="mini">${(DB.productos || []).filter((p) => /Internet/.test(p.fuente || "")).length} productos tienen datos completados con fichas técnicas de internet (formulación, categoría, carencia o reingreso). Revísalos: en <a href="#productos?q=Internet">Productos</a> aparecen con la etiqueta «Dato de internet».</div>` : ""}
        ${(DB.productos || []).some((p) => /^⚠/.test(p.nota || "")) ? `<div class="mini" style="color:var(--rojo)"><b>Clorpirifos prohibido:</b> ${(DB.productos || []).filter((p) => /^⚠/.test(p.nota || "")).map((p) => `<a href="#productos?id=${p.id}">${h(p.nombre)}</a>`).join(", ")}. Agrocalidad prohibió su importación y registro (mayo 2026). Decide si los desactivas.</div>` : ""}
        ${(DB.otros_productos || []).some((r) => r.estado !== "completo") ? `<div class="mini">${(DB.otros_productos || []).filter((r) => r.estado !== "completo").length} productos de <a href="#otros_productos?f=pendiente">otras marcas</a> escritos por agricultores están pendientes de revisar el ingrediente activo.</div>` : ""}
        ${!ajuste("whatsapp_asesor", "") ? `<div class="mini">Falta tu <a href="#ajustes">número de WhatsApp</a> para los botones de contacto.</div>` : ""}
        ${(DB.problemas || []).some((p) => /Manuales de cacao/.test(p.fuente || "")) ? `<div class="mini">Cacao tiene temas y recomendaciones sugeridos desde manuales técnicos: <a href="#problemas?f=cacao">revísalos</a>.</div>` : ""}
      </section>`);
  }

  // ------------------------------------------------------------ carga y router
  async function cargarTodo() {
    const ts = ["cultivos", "etapas", "productos", "problemas", "recomendaciones", "plan_sanitario", "plan_fertilizacion", "compatibilidad", "ajustes"];
    const res = await Promise.all(ts.map((t) => A.listar(t)));
    ts.forEach((t, i) => { DB[t] = res[i]; });
    try { DB.otros_productos = await A.listar("otros_productos"); } catch (e) { DB.otros_productos = []; } // tabla nueva: si aún no existe no bloquea el panel
    version = await A.versionPublicada();
  }
  async function cargarSeguimiento() {
    const [a, l, r] = await Promise.all(["agricultores", "lotes", "registros"].map((t) => A.listar(t)));
    DB.agricultores = a; DB.lotes = l; DB.registros = r;
  }
  function router() {
    const [ruta, qs] = location.hash.slice(1).split("?");
    const q = Object.fromEntries(new URLSearchParams(qs || ""));
    const k = ruta || "resumen";
    if (SECCIONES[k]) return vSeccion(k, q);
    if (k === "ajustes") return vAjustes();
    if (k === "agricultores") return vAgricultores(q);
    return vResumen();
  }
  function vLogin(msg) {
    $("#adm").innerHTML = `<div class="login"><form class="card" id="fl"><img src="icons/logo-admin.svg" alt="" width="64" height="64" style="border-radius:14px"><h2 style="font-size:22px">${h(NOMBRE)} · Administración</h2>
      <p class="mini">Ingresa con el correo y la contraseña de administrador${A.modoDemo ? " (modo demostración: escribe cualquier correo)" : ""}.</p>
      <label class="campo">Correo<input name="correo" type="email" autocomplete="username" required></label>
      <label class="campo">Contraseña<input name="clave" type="password" autocomplete="current-password" ${A.modoDemo ? "" : "required"}></label>
      <p class="mini" id="err" role="alert" style="color:var(--rojo)">${h(msg || "")}</p>
      <button class="btn" type="submit">Ingresar</button><a href="index.html" class="mini" style="text-align:center">Ir a la app del agricultor</a></form></div>`;
    $("#fl").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target;
      try { const u = await A.entrar(f.correo.value.trim(), f.clave.value); if (u === "no_admin") { await A.salir(); return vLogin("Esta cuenta no es administradora."); } usuario = u; iniciar(); }
      catch (er) { $("#err").textContent = er.message; }
    });
  }
  async function iniciar() {
    $("#adm").innerHTML = `<div class="cargando">Cargando…</div>`;
    try {
      usuario = await A.sesion();
      if (!usuario || usuario === "no_admin") { if (usuario === "no_admin") await A.salir(); return vLogin(usuario === "no_admin" ? "Esta cuenta no es administradora." : ""); }
      await cargarTodo(); await cargarSeguimiento(); router();
    } catch (e) { $("#adm").innerHTML = `<div class="login"><div class="card"><b>No se pudo conectar.</b><span class="mini">${h(e.message)}</span><button class="btn" id="reintentar">Reintentar</button></div></div>`; $("#reintentar").addEventListener("click", () => location.reload()); }
  }
  window.addEventListener("hashchange", () => { if (usuario && usuario !== "no_admin") router(); });
  iniciar();
})();

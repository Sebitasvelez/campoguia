/* CampoGuía · cálculos (sin dependencias; se prueban con node) */
(function (root) {
  const ORDEN_FORMULACION = {
    corrector_ph: { rango: 1, texto: "Corrector de pH" },
    polvo: { rango: 2, texto: "Polvo / granulado dispersable (premezclar en un balde)" },
    suspension: { rango: 3, texto: "Suspensión concentrada (SC)" },
    liquido: { rango: 3, texto: "Líquido" },
    emulsion: { rango: 4, texto: "Concentrado emulsionable (EC)" },
    soluble: { rango: 5, texto: "Concentrado soluble (SL)" },
    liquido_foliar: { rango: 6, texto: "Fertilizante o estimulante líquido" },
    aceite_adherente: { rango: 7, texto: "Aceite / adherente" },
    siliconado: { rango: 8, texto: "Dispersante siliconado (siempre al final)" },
    granulado: { rango: 99, texto: "Aplicación al suelo (no va al tanque)" },
    cebo: { rango: 99, texto: "Cebo (no va al tanque)" },
  };

  const num = (v) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;

  function fmt(v, dec) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    const d = dec === undefined ? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2) : dec;
    return Number(v).toLocaleString("es-EC", { maximumFractionDigits: d, minimumFractionDigits: 0 });
  }

  /** Cantidad legible: 1500 cc -> "1,5 L", 2500 g -> "2,5 kg" */
  function cantidad(v, unidad) {
    if (v === null || v === undefined) return "—";
    if (unidad === "cc" && v >= 1000) return fmt(v / 1000) + " L";
    if (unidad === "g" && v >= 1000) return fmt(v / 1000) + " kg";
    return fmt(v) + " " + (unidad || "");
  }

  function rango(min, max, unidad, factor) {
    const f = factor || 1;
    if (min === null && max === null) return "—";
    const a = min !== null ? min * f : max * f, b = max !== null ? max * f : a;
    if (Math.abs(a - b) < 1e-9) return cantidad(a, unidad);
    if (unidad === "cc" && b >= 1000) return fmt(a / 1000) + " – " + fmt(b / 1000) + " L";
    if (unidad === "g" && b >= 1000) return fmt(a / 1000) + " – " + fmt(b / 1000) + " kg";
    return fmt(a) + " – " + fmt(b) + " " + (unidad || "");
  }

  /** Dosis efectiva de un producto (la recomendación puede sobreescribirla) */
  function dosisDe(producto, rec) {
    const min = rec && num(rec.dosis_min) !== null ? num(rec.dosis_min) : num(producto.dosis_min);
    const max = rec && num(rec.dosis_max) !== null ? num(rec.dosis_max) : num(producto.dosis_max);
    return { min, max: max === null ? min : max, unidad: producto.unidad, modo: producto.modo_aplicacion || "tanque" };
  }

  /**
   * Dosis por hectárea de un producto que se aplica con bomba o tanque.
   * Usa la dosis/ha cargada en el producto; si no tiene, la calcula desde la dosis por tanque
   * con el agua de referencia por hectárea (ajuste litros_agua_ha).
   */
  function dosisHaDe(producto, litrosRef, tanqueL, rec) {
    const u = producto.unidad || "cc";
    let min = num(producto.dosis_ha_min), max = num(producto.dosis_ha_max);
    if (min !== null || max !== null) return { min: min !== null ? min : max, max: max !== null ? max : min, unidad: u, derivada: false };
    const d = dosisDe(producto, rec), f = (num(litrosRef) || 400) / (tanqueL || 200);
    if (d.min === null && d.max === null) return { min: null, max: null, unidad: u, derivada: true };
    return { min: d.min !== null ? r1(d.min * f) : null, max: d.max !== null ? r1(d.max * f) : null, unidad: u, derivada: true };
  }

  /** Dosis por volumen de agua (dosis de etiqueta expresada por tanque de 200 L) */
  function porVolumen(dosis, litros, tanqueL) {
    const f = litros / (tanqueL || 200);
    return { min: dosis.min === null ? null : dosis.min * f, max: dosis.max === null ? null : dosis.max * f, unidad: dosis.unidad };
  }

  /**
   * Cálculo para la finca.
   * opts: { modo:'ha'|'plantas', hectareas, plantas, plantasPorHa, litrosAguaHa, plantasPorBomba, bombaL, tanqueL, usarMax }
   */
  /**
   * Cuántos tanques o bombas preparar (regla del asesor):
   * decimal menor a 0,2 → se baja al entero; de 0,2 a 0,69 → «y medio»; desde 0,7 → se sube al entero.
   * Nunca menos de medio equipo.
   */
  function redondearEquipos(x) {
    x = num(x); if (x === null || !isFinite(x) || x <= 0) return 0;
    const ent = Math.floor(x + 1e-9), dec = x - ent;
    let v = dec >= 0.7 - 1e-9 ? ent + 1 : dec >= 0.2 - 1e-9 ? ent + 0.5 : ent;
    return Math.max(v, 0.5);
  }
  const textoEquipos = (v) => (v % 1 ? (Math.floor(v) ? Math.floor(v) + "½" : "½") : String(v));

  function calcularFinca(producto, dosis, opts) {
    const o = Object.assign({ bombaL: 20, tanqueL: 200, litrosAguaHa: 400, plantasPorBomba: 60, plantasPorHa: null }, opts);
    const d = o.usarMax ? dosis.max : dosis.min !== null ? dosis.min : dosis.max;
    const res = { tipo: dosis.modo, avisos: [] };
    const ha = num(o.hectareas), pl = num(o.plantas), pha = num(o.plantasPorHa);
    if (d === null) { res.avisos.push("Este producto no tiene dosis cargada. Consulta la etiqueta o a tu asesor."); return res; }

    if (dosis.modo === "tanque") {
      let litros = null;
      if (o.modo === "plantas") litros = pl !== null ? (pl / num(o.plantasPorBomba)) * o.bombaL : null;
      else litros = ha !== null ? ha * num(o.litrosAguaHa) : null;
      if (litros === null || !isFinite(litros)) return res;
      res.litrosAgua = litros;
      res.equiposExactos = litros / o.bombaL;
      res.bombas = redondearEquipos(res.equiposExactos);
      res.tanques = r1(litros / o.tanqueL);
      res.porBomba = d * (o.bombaL / o.tanqueL);
      res.porTanque = d;
      res.total = d * (litros / o.tanqueL);
      res.unidad = dosis.unidad;
    } else if (dosis.modo === "suelo_ha") {
      // dosis en kg/ha
      let hectareas = ha;
      if (o.modo === "plantas") {
        if (pl === null) return res;
        if (!pha) { res.avisos.push("Indica cuántas plantas tienes por hectárea para pasar la dosis a gramos por planta."); return res; }
        hectareas = pl / pha;
      }
      if (hectareas === null) return res;
      res.kgTotal = d * hectareas;
      res.sacos50 = Math.ceil(res.kgTotal / 50 - 1e-9);
      res.unidad = "kg";
      const plantasTot = o.modo === "plantas" ? pl : pha ? pha * hectareas : null;
      if (plantasTot) res.gPorPlanta = (res.kgTotal * 1000) / plantasTot;
    } else if (dosis.modo === "sitio") {
      let sitios = pl;
      if (o.modo !== "plantas") sitios = pha && ha !== null ? pha * ha : null;
      if (sitios === null) { res.avisos.push("Este producto se aplica por sitio o planta: indica el número de plantas (o plantas por hectárea)."); return res; }
      res.sitios = sitios;
      res.gPorSitio = d;
      res.kgTotal = (d * sitios) / 1000;
      res.sacos50 = Math.ceil(res.kgTotal / 50 - 1e-9);
      res.unidad = "kg";
    }
    // compra y costo
    const cont = num(producto.contenido), pvp = num(producto.pvp);
    const totalBase = res.total !== undefined ? res.total : res.kgTotal !== undefined ? res.kgTotal * 1000 : null; // cc o g
    const unidadCompra = res.total !== undefined ? dosis.unidad : "g";
    const cOpt = totalBase !== null ? compraOptima(totalBase, unidadCompra, producto.presentaciones) : null;
    const pu = precioUnitario(producto);
    if (cOpt) {
      res.compraTexto = cOpt.texto; res.compraItems = cOpt.items; res.envases = cOpt.envases; res.costoEnvases = cOpt.costo;
      if (pu !== null) res.costoUsado = r2(totalBase * pu);
    } else if (cont && totalBase !== null) {
      res.envases = Math.ceil(totalBase / cont - 1e-9);
      res.presentacion = producto.presentacion;
      if (pvp !== null) { res.costoEnvases = r2(res.envases * pvp); res.costoUsado = r2((totalBase / cont) * pvp); }
    }
    return res;
  }

  /**
   * Lista de compra con las presentaciones reales del producto (lista de precios oficial).
   * Elige la combinación MÁS BARATA que cubre lo requerido; si otra con menos envases cuesta
   * hasta 5 % más, prefiere esa (es más práctico comprar 1 litro que 6 frascos pequeños).
   * presentaciones: [{empaque, cantidad (cc o g), unidad, precio}]
   */
  function nombrePresentacion(x) {
    const q = Number(x.cantidad), u = x.unidad;
    if (u === "cc") return q >= 1000 ? fmt(q / 1000) + " L" : fmt(q, 0) + " cc";
    return q >= 1000 ? fmt(q / 1000) + " kg" : fmt(q, 0) + " g";
  }
  function compraOptima(total, unidad, presentaciones) {
    const pres = (presentaciones || []).filter((x) => x.unidad === unidad && Number(x.cantidad) > 0 && x.precio !== null && x.precio !== undefined)
      .map((x) => Object.assign({}, x, { cantidad: Number(x.cantidad), precio: Number(x.precio) })).sort((a, b) => b.cantidad - a.cantidad);
    if (!total || total <= 0 || !pres.length) return null;
    let mejor = null;
    const evaluar = (combo, costo, n) => {
      if (!mejor || costo < mejor.costo - 1e-9 || (Math.abs(costo - mejor.costo) < 1e-9 && n < mejor.n)) mejor = { combo: combo.slice(), costo, n };
    };
    const buscar = (i, resto, combo, costo, n) => {
      if (mejor && costo > mejor.costo + 1e-9) return;
      if (resto <= 1e-9) return evaluar(combo, costo, n);
      if (i >= pres.length) return;
      const x = pres[i], max = Math.ceil(resto / x.cantidad - 1e-9);
      if (i === pres.length - 1) { combo.push([x, max]); buscar(i + 1, resto - max * x.cantidad, combo, costo + max * x.precio, n + max); combo.pop(); return; }
      for (let k = max; k >= 0; k--) {
        if (k) combo.push([x, k]);
        buscar(i + 1, resto - k * x.cantidad, combo, costo + k * x.precio, n + k);
        if (k) combo.pop();
      }
    };
    buscar(0, total, [], 0, 0);
    if (!mejor) return null;
    // Practicidad: si hay una opción con menos envases que cuesta hasta 5 % más, se prefiere esa.
    const limite = mejor.costo * 1.05 + 1e-9, base = mejor;
    mejor = null;
    const evaluar2 = (combo, costo, n) => {
      if (costo > limite) return;
      if (!mejor || n < mejor.n || (n === mejor.n && costo < mejor.costo - 1e-9)) mejor = { combo: combo.slice(), costo, n };
    };
    const buscar2 = (i, resto, combo, costo, n) => {
      if (costo > limite) return;
      if (resto <= 1e-9) return evaluar2(combo, costo, n);
      if (i >= pres.length) return;
      const x = pres[i], max = Math.ceil(resto / x.cantidad - 1e-9);
      for (let k = max; k >= (i === pres.length - 1 ? max : 0); k--) {
        if (k) combo.push([x, k]);
        buscar2(i + 1, resto - k * x.cantidad, combo, costo + k * x.precio, n + k);
        if (k) combo.pop();
      }
    };
    buscar2(0, total, [], 0, 0);
    if (!mejor) mejor = base;
    const items = mejor.combo.map(([x, k]) => ({ empaque: x.empaque, codigo: x.codigo, cantidad: x.cantidad, unidad: x.unidad, precio: x.precio, n: k }));
    return { items, envases: mejor.n, costo: r2(mejor.costo), volumen: items.reduce((a, x) => a + x.cantidad * x.n, 0),
      texto: items.map((x) => `${x.n} × ${nombrePresentacion(x)}`).join(" + ") };
  }
  /** Precio por cc o g de referencia (presentación de 1 L / 1 kg, o la más cercana) */
  function precioUnitario(producto) {
    const pres = (producto.presentaciones || []).filter((x) => x.precio !== null && x.precio !== undefined);
    if (pres.length) {
      const ref = pres.find((x) => Number(x.cantidad) === 1000) || pres.slice().sort((a, b) => Math.abs(a.cantidad - 1000) - Math.abs(b.cantidad - 1000))[0];
      return Number(ref.precio) / Number(ref.cantidad);
    }
    return producto.pvp !== null && producto.pvp !== undefined && producto.contenido ? Number(producto.pvp) / Number(producto.contenido) : null;
  }

  /** Fertilización al suelo: dosis_g_planta o dosis_kg_ha -> totales */
  function calcularFertSuelo(item, producto, hectareas, plantasPorHa) {
    const ha = num(hectareas), pha = num(plantasPorHa);
    const out = { gPorPlanta: null, kgTotal: null, sacos50: null };
    if (num(item.dosis_g_planta) !== null) {
      out.gPorPlanta = num(item.dosis_g_planta);
      if (ha !== null && pha) out.kgTotal = (out.gPorPlanta * pha * ha) / 1000;
    } else if (num(item.dosis_kg_ha) !== null) {
      if (ha !== null) out.kgTotal = num(item.dosis_kg_ha) * ha;
      if (pha) out.gPorPlanta = (num(item.dosis_kg_ha) * 1000) / pha;
    }
    const sacoMax = producto && (producto.presentaciones || []).filter((x) => x.unidad === "g").sort((a, b) => b.cantidad - a.cantidad)[0];
    const saco = sacoMax ? Number(sacoMax.cantidad) / 1000 : producto && num(producto.contenido) && producto.contenido_unidad === "g" ? num(producto.contenido) / 1000 : 50;
    if (out.kgTotal !== null) { out.sacos50 = Math.ceil(out.kgTotal / saco - 1e-9); out.sacoKg = saco; }
    if (out.kgTotal !== null && producto && (producto.presentaciones || []).length) {
      const c = compraOptima(out.kgTotal * 1000, "g", producto.presentaciones);
      if (c) { out.costo = c.costo; out.compraTexto = c.texto; }
    } else if (out.sacos50 !== null && producto && num(producto.pvp) !== null) out.costo = r2(out.sacos50 * num(producto.pvp));
    return out;
  }

  /** Orden de mezcla en el tanque */
  function ordenMezcla(productos) {
    const enTanque = [], fuera = [];
    productos.forEach((p) => {
      const f = ORDEN_FORMULACION[p.formulacion] || ORDEN_FORMULACION.liquido;
      (f.rango >= 99 ? fuera : enTanque).push({ p, f });
    });
    enTanque.sort((a, b) => a.f.rango - b.f.rango);
    const pasos = [{ texto: "Llena el tanque hasta la mitad con agua limpia y enciende la agitación.", productos: [] }];
    let ultimo = null;
    enTanque.forEach(({ p, f }) => {
      if (ultimo && ultimo.rango === f.rango) ultimo.productos.push(p);
      else { ultimo = { rango: f.rango, texto: f.texto, productos: [p] }; pasos.push(ultimo); }
    });
    pasos.push({ texto: "Completa con agua hasta el volumen final, agitando siempre.", productos: [] });
    return { pasos, fuera: fuera.map((x) => x.p) };
  }

  /** Revisión de compatibilidad */
  function revisarMezcla(productos, reglas) {
    const out = [];
    const ids = productos.map((p) => Number(p.id));
    (reglas || []).forEach((r) => {
      const a = Number(r.producto_a), b = Number(r.producto_b);
      if (ids.includes(a) && ids.includes(b) && a !== b) out.push({ nivel: r.nivel, nota: r.nota, a, b });
    });
    // mismo grupo IRAC/FRAC (no aporta y favorece resistencia)
    for (let i = 0; i < productos.length; i++) for (let j = i + 1; j < productos.length; j++) {
      const g1 = (productos[i].grupo || "").toUpperCase().trim(), g2 = (productos[j].grupo || "").toUpperCase().trim();
      const skip = ["", "S/C", "MULTISITIO", "HORMONAL", "FERTILIZANTE", "ENMIENDA", "EDAFICO", "…"];
      if (g1 && g1 === g2 && !skip.includes(g1) && productos[i].categoria === productos[j].categoria)
        out.push({ nivel: "precaucion", nota: `Mismo grupo de modo de acción (${productos[i].grupo}): no suman control y favorecen la resistencia.`, a: Number(productos[i].id), b: Number(productos[j].id) });
    }
    const enTanque = productos.filter((p) => !["granulado", "cebo"].includes(p.formulacion));
    if (enTanque.length > 4) out.push({ nivel: "precaucion", nota: "Más de 4 productos en un tanque aumenta el riesgo de incompatibilidad y quemaduras.", a: null, b: null });
    const peso = { incompatible: 0, precaucion: 1, compatible: 2 };
    out.sort((x, y) => peso[x.nivel] - peso[y.nivel]);
    return out;
  }

  function sumarDias(fechaISO, dias) {
    if (!fechaISO || dias === null || dias === undefined || dias === "") return null;
    const d = new Date(fechaISO + "T12:00:00");
    d.setDate(d.getDate() + Number(dias));
    return d.toISOString().slice(0, 10);
  }

  function diasEntre(aISO, bISO) {
    const a = new Date(aISO + "T12:00:00"), b = new Date(bISO + "T12:00:00");
    return Math.round((b - a) / 86400000);
  }

  /** Grupo de una actividad para los filtros y el resumen de costos */
  function grupoActividad(a) {
    a = String(a || "");
    if (/Fumig|Herbic/i.test(a)) return "fumigacion";
    if (/Fertil|Enmienda/i.test(a)) return "fertilizacion";
    if (/Labor/i.test(a)) return "labor";
    return "otra";
  }

  /** Costo de mano de obra: personas × pago diario × días */
  function costoManoObra(personas, pagoDiario, dias) {
    const c = (v) => num(typeof v === "string" ? v.trim().replace(",", ".") : v);
    const p = c(personas), pg = c(pagoDiario), d = c(dias === undefined || dias === null || dias === "" ? 1 : dias);
    if (!p || !pg || !d) return null;
    return r2(p * pg * d);
  }

  /** Costos de producción: insumos (productos) + mano de obra, en total y por actividad */
  function resumenCostos(registros) {
    const por = {}; let insumos = 0, mano = 0, jornales = 0;
    registros.forEach((r) => {
      if (r.borrado) return;
      const ci = num(r.costo) || 0, cm = num(r.costo_mano_obra) || 0;
      const k = r.actividad || "Otra";
      por[k] = por[k] || { n: 0, insumos: 0, mano_obra: 0, costo: 0 };
      if (r.producto_nombre) por[k].n++;
      por[k].insumos += ci; por[k].mano_obra += cm; por[k].costo += ci + cm;
      insumos += ci; mano += cm;
      if (cm) jornales += (num(r.personas) || 0) * (num(r.dias_trabajo) || 1);
    });
    Object.values(por).forEach((v) => { v.insumos = r2(v.insumos); v.mano_obra = r2(v.mano_obra); v.costo = r2(v.costo); });
    return { total: r2(insumos + mano), insumos: r2(insumos), mano_obra: r2(mano), jornales: r2(jornales), por };
  }

  /** Alertas de carencia y recordatorios para hoy */
  function alertas(registros, lotes, hoyISO) {
    const out = [];
    const nombreLote = (id) => (lotes.find((l) => l.id === id) || {}).nombre || "Sin lote";
    registros.filter((r) => !r.borrado).forEach((r) => {
      if (r.carencia_hasta && r.carencia_hasta >= hoyISO)
        out.push({ tipo: "carencia", lote_id: r.lote_id, lote: nombreLote(r.lote_id), fecha: r.carencia_hasta, dias: diasEntre(hoyISO, r.carencia_hasta), producto: r.producto_nombre });
      if (r.proxima_fecha) {
        const dd = diasEntre(hoyISO, r.proxima_fecha);
        if (dd >= -3 && dd <= 7) out.push({ tipo: "recordatorio", lote_id: r.lote_id, lote: nombreLote(r.lote_id), fecha: r.proxima_fecha, dias: dd, actividad: r.actividad, producto: r.producto_nombre });
      }
    });
    // solo la carencia más larga por lote
    const car = {};
    out.filter((a) => a.tipo === "carencia").forEach((a) => { if (!car[a.lote_id] || car[a.lote_id].fecha < a.fecha) car[a.lote_id] = a; });
    return Object.values(car).concat(out.filter((a) => a.tipo === "recordatorio").sort((a, b) => a.dias - b.dias));
  }

  // ---------------- grupo de resistencia según IRAC / FRAC / HRAC (clasificaciones oficiales por modo de acción; no editable)
  const CLAS_RESIST = [
    // [patrón del ingrediente activo, ente, código]
    [/lambda|cihalotr|cyhalothr/, "IRAC", "3A"], [/cipermetr|cypermethr/, "IRAC", "3A"],
    [/tiametox|thiametox/, "IRAC", "4A"], [/clorantranil|chlorantranil/, "IRAC", "28"], [/abamect/, "IRAC", "6"],
    [/azadirac/, "IRAC", "UN"], [/profenof|diazin|clorpirif|chlorpyrif|malat/, "IRAC", "1B"], [/tiocicl|thiocycl/, "IRAC", "14"],
    [/sulflur/, "IRAC", "13"], [/emamectin/, "IRAC", "6"], [/diafentiur|diafenthiur/, "IRAC", "12A"], [/lufenur/, "IRAC", "15"],
    [/ciromaz|cyromaz/, "IRAC", "17"], [/acefat|acephat/, "IRAC", "1B"], [/foxim|phoxim/, "IRAC", "1B"], [/thuringiensis/, "IRAC", "11A"],
    [/isociclos|isocyclos/, "IRAC", "30"], [/ciantranil|cyantranil/, "IRAC", "28"],
    [/imidacl/, "IRAC", "4A"], [/tiodicarb|thiodicarb/, "IRAC", "1A"], [/flonicam/, "IRAC", "29"], [/tetradif/, "IRAC", "12D"], [/propargit/, "IRAC", "12C"], [/bifenaz/, "IRAC", "20D"], [/cyenopyr|cienopir/, "IRAC", "25A"],
    [/cobre|copper/, "FRAC", "M01"], [/clorotal|chlorothal/, "FRAC", "M05"], [/thiram|tiram/, "FRAC", "M03"], [/captan/, "FRAC", "M04"],
    [/difenocon|propicon|epoxicon|tebucon/, "FRAC", "3"], [/azoxistrob|azoxystrob|piraclostrob|pyraclostrob/, "FRAC", "11"],
    [/metalax|mefenox/, "FRAC", "4"], [/boscal|carboxin/, "FRAC", "7"], [/tiabend|thiabend/, "FRAC", "1"], [/ciprodin|cyprodin/, "FRAC", "9"],
    [/kasug/, "FRAC", "24"], [/fluazinam/, "FRAC", "29"], [/ciprocon|cyprocon|penconaz/, "FRAC", "3"], [/isopyraz|isopiraz|pidiflumet|pydiflumet/, "FRAC", "7"],
    [/mandipropam/, "FRAC", "40"], [/fludioxon/, "FRAC", "12"], [/cimoxan|cymoxan/, "FRAC", "27"], [/mancozeb/, "FRAC", "M03"], [/fosetil|fosetyl/, "FRAC", "P07"],
    [/azufre|\bsulfur\b/, "FRAC", "M02"], [/fenpropid/, "FRAC", "5"], [/etridiaz/, "FRAC", "14"],
    [/oxat[h]?iapiprol/, "FRAC", "49"], [/subtilis/, "FRAC", "BM02"], [/pentacloronitro|quintoc|pcnb/, "FRAC", "14"],
    [/metaldeh/, null, "Molusquicida: sin grupo IRAC"],
    [/glufos/, "HRAC", "10"], [/metolacl|pretilacl/, "HRAC", "15"], [/atrazin/, "HRAC", "5"], [/oxifluorf|oxyfluorf/, "HRAC", "14"],
    [/isoxaflut/, "HRAC", "27"], [/tiencarbaz|thiencarbaz/, "HRAC", "2"],
    [/metsulf|bispyrib|bispirib/, "HRAC", "2"], [/ametrin/, "HRAC", "5"], [/propanil/, "HRAC", "5"], [/diquat/, "HRAC", "22"], [/glifos|glyphos/, "HRAC", "9"], [/paraquat/, "HRAC", "22"], [/nicosulf/, "HRAC", "2"], [/2,?4[- ]?d\b|2,4 dim|2,4-d/, "HRAC", "4"],
  ];
  const CAT_PLAGUICIDA = /insectic|acaric|cebo|fungic|desinfecc|herbic|bactericida|nematic/i;
  // Devuelve { grupo, aplica, faltan } — grupo: "IRAC 3A + 4A" / "FRAC 7 + M03"; faltan: componentes sin clasificar
  function grupoResistencia(ia, categoria) {
    const aplica = categoria ? CAT_PLAGUICIDA.test(categoria) : true;
    if (!aplica) return { grupo: null, aplica: false, faltan: [] };
    const txt = String(ia || "").trim();
    if (!txt) return { grupo: null, aplica: true, faltan: ["(sin ingrediente activo)"] };
    const partes = txt.split(/\s*\+\s*/).filter(Boolean), porEnte = {}, orden = [], faltan = [];
    partes.forEach((p) => {
      const n = p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const m = CLAS_RESIST.find(([re]) => re.test(n));
      if (!m) { faltan.push(p); return; }
      const ente = m[1] || "";
      if (!porEnte[ente]) { porEnte[ente] = []; orden.push(ente); }
      if (!porEnte[ente].includes(m[2])) porEnte[ente].push(m[2]);
    });
    const grupo = orden.length ? orden.map((e) => (e ? e + " " : "") + porEnte[e].join(" + ")).join(" · ") : null;
    return { grupo, aplica: true, faltan };
  }

  // ---------------- clasificación agronómica de plagas (aparato bucal) y enfermedades (clase del hongo, taxonomía clásica)
  // Cada clase define los grupos químicos que suelen ser funcionales. c = código del grupo tal como aparece en el
  // campo "grupo" del producto (IRAC/FRAC); ia = patrón del ingrediente activo cuando no hay código.
  const G = (c, n, ia) => ({ c, n, ia });
  const CLASES = {
    "Masticador": { tipo: "plaga", resumen: "Muerde, corta y tritura el tejido con mandíbulas.",
      control: "Funcionan mejor los insecticidas de contacto y de ingestión aplicados sobre el órgano que come.",
      grupos: [G("IRAC 1B", "Organofosforados"), G("IRAC 3A", "Piretroides"), G("IRAC 28", "Diamidas"), G("IRAC 13", "Desacopladores (sulfluramida, clorfenapir)"),
        G("IRAC 2B", "Fenilpirazoles (fipronil)"), G("IRAC 6", "Avermectinas"), G("IRAC 5", "Espinosinas"), G("IRAC 22A", "Oxadiazinas (indoxacarb)"), G("IRAC 30", "Meta-diamidas e isoxazolinas"),
        G("IRAC 1A", "Carbamatos"), G("IRAC 4A", "Neonicotinoides (contacto e ingestión)"), G("IRAC 14", "Nereistoxinas (tiociclam)"), G("IRAC UN", "Botánicos (azadiractina)")] },
    "Masticador-lamedor": { tipo: "plaga", resumen: "Raspa el tejido con mandíbulas y lame los jugos que brotan.",
      control: "No succiona savia, por eso los sistémicos actúan poco: funcionan mejor los de contacto e ingestión sobre botones, flores y frutos.",
      grupos: [G("IRAC 3A", "Piretroides"), G("IRAC 14", "Nereistoxinas (tiociclam)"), G("IRAC 1B", "Organofosforados"), G("IRAC 6", "Avermectinas"),
        G("IRAC 4A", "Neonicotinoides (contacto e ingestión)"), G("IRAC UN", "Botánicos (azadiractina, repelente)")] },
    "Picador-chupador": { tipo: "plaga", resumen: "Clava un estilete en el tejido y succiona la savia o los jugos.",
      control: "Funcionan los sistémicos y translaminares que viajan en la savia; los de contacto ayudan a bajar la población.",
      grupos: [G("IRAC 4A", "Neonicotinoides (sistémicos)"), G("IRAC 28", "Diamidas (ciantraniliprol, sistémico)"), G("IRAC 6", "Avermectinas (abamectina, translaminar)"),
        G("IRAC 4C", "Sulfoximinas (sulfoxaflor)"), G("IRAC 29", "Flonicamid"), G("IRAC 9B", "Piridinas azometinas (pimetrozina)"), G("IRAC 23", "Ácidos tetrónicos (spirotetramat)"),
        G("IRAC 12A", "Diafentiurón"), G("IRAC 1B", "Organofosforados (acefato, dimetoato)"), G("IRAC 3A", "Piretroides (contacto)")] },
    "Picador-chupador (quelíceros)": { tipo: "plaga", resumen: "Ácaro: perfora las células con quelíceros en forma de estilete y succiona su contenido.",
      control: "Necesita acaricidas específicos. Evita piretroides solos: pueden aumentar los ácaros.",
      grupos: [G("IRAC 20D", "Bifenazato"), G("IRAC 25A", "Beta-cetonitrilos (cienopirafén)"), G("IRAC 12C", "Propargite"), G("IRAC 12D", "Tetradifón"),
        G("IRAC 6", "Avermectinas (abamectina)"), G("IRAC 21A", "METI (piridabén, fenpiroximato)"), G("IRAC 23", "Ácidos tetrónicos (spiromesifén)"), G("IRAC 10A", "Hexitiazox / clofentezina"),
        G("IRAC 10B", "Etoxazol"), G("IRAC 12B", "Organoestánnicos"), G("FRAC M02", "Azufre (acción acaricida)")] },
    "Picador-chupador (estilete)": { tipo: "plaga", resumen: "Nematodo: perfora las células de la raíz con un estilete y succiona su contenido.",
      control: "Se controla con nematicidas al suelo o productos con acción nematicida, junto con materia orgánica y biológicos.",
      grupos: [G(null, "Carbamatos nematicidas (oxamil, carbofurán)", /oxamil|oxamyl|carbofur/), G(null, "Organofosforados nematicidas (etoprofos, fenamifós, cadusafós)", /etoprof|ethoprop|fenamif|cadusaf|terbuf|fostiaz/),
        G(null, "Avermectinas (abamectina)", /abamect/),
        G(null, "Fluopyram (SDHI nematicida)", /fluopyr/), G(null, "Biológicos (Paecilomyces, Purpureocillium)", /paecilom|purpureoc/)] },
    "Raspador (rádula)": { tipo: "plaga", resumen: "Molusco: raspa el tejido tierno con la rádula, una lengua con dientecillos.",
      control: "Los insecticidas comunes no funcionan: se usan cebos molusquicidas.",
      grupos: [G(null, "Metaldehído", /metaldeh/), G(null, "Fosfato férrico", /fosfato ferric|ferric phosph/), G(null, "Carbamatos molusquicidas (metiocarb)", /metiocarb|methiocarb/), G("IRAC 14", "Nereistoxinas (tiociclam, efecto de contacto)")] },

    "Oomiceto": { tipo: "enfermedad", resumen: "Pseudohongo de agua: pared de celulosa, sin ergosterol; se dispersa con zoosporas que nadan en el agua.",
      control: "Triazoles (FRAC 3), bencimidazoles (FRAC 1) y la mayoría de carboxamidas SDHI (FRAC 7) no lo controlan, porque actúan sobre el ergosterol o la tubulina de hongos verdaderos.",
      grupos: [G("FRAC 4", "Fenilamidas (metalaxil)"), G("FRAC 40", "Amidas CAA (dimetomorf, mandipropamid)"), G("FRAC 49", "Oxatiapiprolina"),
        G("FRAC 27", "Cianoacetamida-oximas (cimoxanil)"), G("FRAC 43", "Benzamidas (fluopicolide)"), G("FRAC 28", "Carbamatos (propamocarb)"), G("FRAC 21", "QiI (ciazofamida)"),
        G("FRAC 45", "QoSI (ametoctradina)"), G("FRAC P07", "Fosfonatos (fosetil-Al)"), G("FRAC 11", "Estrobilurinas (azoxistrobina, piraclostrobina)"), G("FRAC 29", "Fluazinam"),
        G(null, "Etridiazol (FRAC 14, al suelo)", /etridiaz/), G("FRAC M03", "Ditiocarbamatos (mancozeb)"), G("FRAC M01", "Cobres"), G("FRAC M05", "Clorotalonil")] },
    "Ascomiceto": { tipo: "enfermedad", resumen: "Hongo verdadero con esporas sexuales en ascas; pared de quitina con ergosterol.",
      control: "Responde a los grupos que actúan sobre hongos verdaderos; rota modos de acción para evitar resistencia.",
      grupos: [G("FRAC 11", "Estrobilurinas"), G("FRAC 3", "Triazoles (difenoconazol, propiconazol, tebuconazol)"), G("FRAC 7", "Carboxamidas SDHI (boscalid, fluxapiroxad)"),
        G("FRAC 1", "Bencimidazoles (tiabendazol, carbendazim)"), G("FRAC 9", "Anilinopirimidinas (ciprodinil)"), G("FRAC 12", "Fenilpirroles (fludioxonil)"),
        G("FRAC 5", "Aminas (spiroxamina, fenpropidin)"), G("FRAC 2", "Dicarboximidas (iprodiona)"), G("FRAC 17", "Hidroxianilidas (fenhexamida)"), G("FRAC 29", "Fluazinam"),
        G("FRAC M05", "Clorotalonil"), G("FRAC M03", "Ditiocarbamatos (mancozeb)"), G("FRAC M04", "Ftalimidas (captan)"), G("FRAC M01", "Cobres"), G("FRAC M02", "Azufre (oídios)"),
        G("FRAC BM02", "Biológicos (Bacillus subtilis)")] },
    "Deuteromiceto": { tipo: "enfermedad", resumen: "Grupo que se mantiene en la clasificación antigua para Botrytis, Fusarium y Rhizoctonia: hongos especiales que se controlan solo con determinados ingredientes activos.",
      control: "Botrytis: fenhexamida, ciprodinil, fludioxonil, iprodiona, boscalid. Fusarium: tiabendazol o carbendazim, triazoles y fludioxonil. Rhizoctonia: PCNB, carboxin o flutolanil y azoxistrobina. Rota grupos: Botrytis genera resistencia rápido.",
      grupos: [G("FRAC 1", "Bencimidazoles (tiabendazol, carbendazim)"), G("FRAC 7", "Carboxamidas SDHI (boscalid, fluopyram, carboxin, flutolanil)"), G("FRAC 12", "Fenilpirroles (fludioxonil)"),
        G("FRAC 9", "Anilinopirimidinas (ciprodinil, pirimetanil)"), G("FRAC 3", "Triazoles (tebuconazol, procloraz, difenoconazol)"), G("FRAC 17", "Hidroxianilidas (fenhexamida)"),
        G("FRAC 2", "Dicarboximidas (iprodiona)"), G("FRAC 14", "Hidrocarburos aromáticos (PCNB, al suelo)"), G("FRAC 11", "Estrobilurinas (azoxistrobina)"), G("FRAC 29", "Fluazinam"),
        G("FRAC M04", "Ftalimidas (captan)"), G("FRAC 24", "Kasugamicina (con cobre)"), G("FRAC M01", "Cobres"), G("FRAC BM02", "Biológicos (Bacillus subtilis)")] },
    "Basidiomiceto": { tipo: "enfermedad", resumen: "Hongo verdadero con esporas sexuales en basidios (como royas, Moniliophthora y Sclerotium).",
      control: "Las carboxamidas (FRAC 7), triazoles y estrobilurinas son las más activas; los multisitio protegen antes de la infección.",
      grupos: [G("FRAC 11", "Estrobilurinas (azoxistrobina, piraclostrobina)"), G("FRAC 3", "Triazoles (tebuconazol, propiconazol, difenoconazol)"), G("FRAC 7", "Carboxamidas SDHI (carboxin, flutolanil)"),
        G("FRAC 14", "Hidrocarburos aromáticos (PCNB, al suelo)"), G("FRAC 1", "Bencimidazoles"), G("FRAC M01", "Cobres"), G("FRAC M05", "Clorotalonil"), G("FRAC M03", "Ditiocarbamatos (mancozeb)")] },
    "Bacteria": { tipo: "enfermedad", resumen: "No es un hongo: es una bacteria que entra por heridas y aberturas y se multiplica con humedad y calor.",
      control: "Los fungicidas no la controlan. Funcionan los cobres y los antibióticos agrícolas, junto con eliminar el tejido enfermo y desinfectar herramientas.",
      grupos: [G("FRAC 24", "Kasugamicina"), G("FRAC 25", "Estreptomicina"), G("FRAC 41", "Oxitetraciclina"), G("FRAC M01", "Cobres"), G("FRAC BM02", "Biológicos (Bacillus subtilis)")] },
    "Amplio espectro (multisitio)": { tipo: "enfermedad", resumen: "Protección preventiva contra hongos de todas las clases.",
      control: "Los multisitio actúan en varios puntos de la célula del hongo: casi no generan resistencia y sirven de base para rotar con los sistémicos.",
      grupos: [G("FRAC M05", "Clorotalonil"), G("FRAC M03", "Ditiocarbamatos (mancozeb)"), G("FRAC M04", "Ftalimidas (captan)"), G("FRAC M01", "Cobres"), G("FRAC M02", "Azufre")] },
    "No selectivo (control total)": { tipo: "maleza", resumen: "Herbicidas que eliminan toda la vegetación que tocan: se aplican dirigidos a las calles, sin mojar el cultivo.",
      control: "Rota entre sistémicos (glifosato) y de contacto (glufosinato, paraquat, diquat). Usa pantalla o campana y nunca toques tallos ni hojas del cultivo.",
      grupos: [G("HRAC 9", "Glicinas (glifosato, sistémico)"), G("HRAC 10", "Glufosinato (contacto)"), G("HRAC 22", "Bipiridilos (paraquat, diquat; contacto)")] },
    "Hoja ancha": { tipo: "maleza", resumen: "Malezas dicotiledóneas: hojas anchas con nervaduras en red.",
      control: "Herbicidas selectivos para hoja ancha, aplicados dirigidos. Revisa en la etiqueta que el cultivo tolere el producto.",
      grupos: [G("HRAC 4", "Auxinas sintéticas (2,4-D)"), G("HRAC 14", "Inhibidores PPO (oxifluorfén)"), G(null, "Triazinas (ametrina)", /ametrin/), G(null, "Inhibidores ALS (metsulfurón)", /metsulf/)] },
    "Gramíneas": { tipo: "maleza", resumen: "Pastos: hojas angostas con nervaduras paralelas y tallos con nudos.",
      control: "Graminicidas selectivos o preemergentes para pastos. Revisa en la etiqueta que el cultivo tolere el producto.",
      grupos: [G("HRAC 1", "Inhibidores ACCasa (fluazifop, cletodim)"), G(null, "Inhibidores ALS (nicosulfurón)", /nicosulf/), G(null, "Cloroacetamidas (S-metolacloro, preemergente)", /metolacl/)] },
  };
  const OPC_CLASE = { plaga: Object.keys(CLASES).filter((k) => CLASES[k].tipo === "plaga"), enfermedad: Object.keys(CLASES).filter((k) => CLASES[k].tipo === "enfermedad"), maleza: Object.keys(CLASES).filter((k) => CLASES[k].tipo === "maleza") };
  // "Oomiceto + Deuteromiceto" → varias clases. Taxonomía actual; Botrytis, Fusarium y Rhizoctonia se mantienen como Deuteromicetos
  const clasesDe = (txt) => String(txt || "").split(/\s*\+\s*/).map((s) => s.trim()).filter((s) => CLASES[s]);
  function gruposFuncionales(txt) {
    const out = [], vistos = new Set();
    clasesDe(txt).forEach((k) => CLASES[k].grupos.forEach((g) => { const id = g.c || g.n; if (!vistos.has(id)) { vistos.add(id); out.push(g); } }));
    return out;
  }
  // Excepciones por patógeno: grupos de la clase que no se recomiendan para ciertos géneros (se buscan en el nombre,
  // la descripción y la explicación del problema). Bencimidazoles (FRAC 1): Alternaria (sin respaldo de eficacia) y
  // Colletotrichum acutatum (tolerante); C. gloeosporioides sí es sensible. Decisión del asesor (nov 2026).
  const EXCLUSIONES = [
    { patron: /alternaria|colletotrichum acutatum|c\. acutatum/i, quitar: ["FRAC 1"] },
  ];
  function gruposDelProblema(problema) {
    if (!problema) return [];
    const texto = [problema.nombre, problema.descripcion, problema.como_actua].filter(Boolean).join(" ");
    const quitar = new Set(EXCLUSIONES.filter((x) => x.patron.test(texto)).flatMap((x) => x.quitar));
    return gruposFuncionales(problema.clasificacion).filter((g) => !quitar.has(g.c));
  }
  // "FRAC 1 + 12 + 4 · IRAC 4A" → ["FRAC 1","FRAC 12","FRAC 4","IRAC 4A"]
  function codigosGrupo(grupo) {
    const out = [];
    String(grupo || "").split("·").forEach((seg) => {
      const m = seg.trim().match(/^(IRAC|FRAC|HRAC)\s+(.+)$/); if (!m) return;
      m[2].split("+").forEach((c) => { c = c.trim(); if (c) out.push(m[1] + " " + c); });
    });
    return out;
  }
  // grupos funcionales que cumple el producto (vacío = no aplica)
  function coincideGrupos(producto, grupos) {
    const cods = codigosGrupo(producto && producto.grupo), ia = String((producto && producto.ingrediente_activo) || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return grupos.filter((g) => (g.c && cods.includes(g.c)) || (g.ia && g.ia.test(ia)));
  }


  // ---------------- alternativas sugeridas para un problema: grupos químicos funcionales de su clase + portafolio
  // Mantiene la opción recomendada y elige hasta n alternativas que sumen grupos distintos (rotación), ordenadas de la
  // más eficiente (1) a la menos según el orden de grupos de cada clase, prefiriendo
  // productos con dosis cargada. Evita productos de uso específico en otro cultivo (arroz, rosas), de tratamiento
  // de semilla o de la línea para flores.
  const CAT_CLASE = { plaga: /insectic|acaric|cebo|nematic/i, enfermedad: /fungic|desinfecc|bactericida/i, maleza: /herbic/i };
  const CAT_ESPECIAL = { "Picador-chupador (quelíceros)": /acaric|insectic/i, "Raspador (rádula)": /cebo|molusc|insectic/i, "Picador-chupador (estilete)": /nematic|insectic|acaric|bioestim/i };
  // previos: productos que el asesor ya recomendaba para ese problema (se prefieren si aportan rotación)
  function sugerirAlternativas(problema, productos, principalId, n, cultivoNombre, previos) {
    const prev = new Set((previos || []).map(String));
    n = n || 4;
    const gf = gruposDelProblema(problema); if (!gf.length) return [];
    const clases = clasesDe(problema.clasificacion);
    const cat = clases.map((k) => CAT_ESPECIAL[k]).find(Boolean) || CAT_CLASE[problema.tipo] || /./;
    const cult = String(cultivoNombre || problema.cultivo_id || "").toLowerCase();
    const ajeno = (p) => { const t = ((p.control || "") + " " + (p.nota || "")).toLowerCase();
      return (/\barroz\b/.test(t) && !cult.includes("arroz")) || (/\brosas?\b/.test(t) && !cult.includes("rosa")) || /tratamiento de semilla/.test(t) || /\bflora\b/i.test(p.nombre || ""); };
    const tieneDosis = (p) => [p.dosis_min, p.dosis_max, p.dosis_ha_min, p.dosis_ha_max].some((v) => v !== null && v !== undefined && v !== "");
    const principal = productos.find((p) => String(p.id) === String(principalId));
    const cubiertos = new Set(principal ? coincideGrupos(principal, gf).map((g) => g.c || g.n) : []);
    let cand = productos.filter((p) => p.activo !== false && !p.no_sugerir && String(p.id) !== String(principalId) && cat.test(p.categoria || "") && !ajeno(p))
      .map((p) => ({ p, g: coincideGrupos(p, gf).map((g) => g.c || g.n), dosis: tieneDosis(p) })).filter((x) => x.g.length);
    // eficiencia: los grupos de cada clase están ordenados del más eficiente al menos; vale el mejor grupo del producto
    const pos = new Map(gf.map((g, i) => [g.c || g.n, i]));
    cand.forEach((x) => { const idx = x.g.map((g) => pos.get(g)).sort((a, b) => a - b); x.ef = idx[0]; x.ef2 = idx.length > 1 ? idx[1] : 99; });
    // mismo grupo químico exacto que la principal no aporta rotación
    const firmaPrincipal = principal ? codigosGrupo(principal.grupo).sort().join("|") : null;
    const elegidos = [], firmas = new Set(firmaPrincipal ? [firmaPrincipal] : []);
    while (elegidos.length < n && cand.length) {
      cand.forEach((x) => { const nuevos = x.g.filter((g) => !cubiertos.has(g)).length, firma = codigosGrupo(x.p.grupo).sort().join("|");
        x.score = (x.dosis ? 100 : 0) + nuevos * 12 + (firmas.has(firma) ? -30 : 0) + Math.min(x.g.length, 2) * 2 + (prev.has(String(x.p.id)) ? 15 : 0) + Math.max(0, 10 - x.ef); });
      cand.sort((a, b) => b.score - a.score || a.p.nombre.localeCompare(b.p.nombre));
      const x = cand.shift(); elegidos.push(x); x.g.forEach((g) => cubiertos.add(g)); firmas.add(codigosGrupo(x.p.grupo).sort().join("|"));
    }
    return ordenarPorEficiencia(problema, elegidos.map((x) => x.p));
  }
  // ordena productos de la más eficiente (1) a la menos para la clase del problema: mejor grupo funcional, luego el
  // segundo grupo, más grupos funcionales y con dosis cargada. Sin clasificación o sin grupo funcional, van al final
  // en el orden recibido.
  function ordenarPorEficiencia(problema, lista) {
    const gf = gruposDelProblema(problema), pos = new Map(gf.map((g, i) => [g.c || g.n, i]));
    const tieneDosis = (p) => [p.dosis_min, p.dosis_max, p.dosis_ha_min, p.dosis_ha_max].some((v) => v !== null && v !== undefined && v !== "");
    return lista.map((p, i) => { const g = coincideGrupos(p, gf).map((x) => x.c || x.n), idx = g.map((x) => pos.get(x)).sort((a, b) => a - b);
      return { p, i, n: g.length, ef: idx.length ? idx[0] : 999, ef2: idx.length > 1 ? idx[1] : 999, dosis: tieneDosis(p) }; })
      .sort((a, b) => a.ef - b.ef || a.ef2 - b.ef2 || b.n - a.n || (b.dosis ? 1 : 0) - (a.dosis ? 1 : 0) || (a.ef === 999 ? a.i - b.i : a.p.nombre.localeCompare(b.p.nombre)))
      .map((x) => x.p);
  }
  const api = { ORDEN_FORMULACION, num, fmt, cantidad, rango, dosisDe, porVolumen, calcularFinca, calcularFertSuelo, compraOptima, precioUnitario, nombrePresentacion,
    redondearEquipos, textoEquipos, dosisHaDe, ordenMezcla, revisarMezcla, sumarDias, diasEntre, resumenCostos, costoManoObra, grupoActividad, alertas, grupoResistencia,
    CLASES, OPC_CLASE, clasesDe, gruposFuncionales, codigosGrupo, coincideGrupos, sugerirAlternativas, ordenarPorEficiencia, gruposDelProblema };
  if (typeof module !== "undefined") module.exports = api; else root.Logic = api;
})(typeof window !== "undefined" ? window : globalThis);

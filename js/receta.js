/* CampoGuía · receta técnica en PDF (mezcla + recomendaciones) para compartir por WhatsApp */
(function () {
  const VERDE = [31, 94, 59], TEXTO = [28, 36, 32], SUAVE = [74, 86, 80], BORDE = [225, 228, 220], CLARO = [227, 239, 231];
  const AVISO = { rojo: [[253, 236, 234], [161, 40, 28]], ambar: [[255, 246, 229], [122, 71, 6]], verde: [[227, 239, 231], [21, 63, 40]] };
  // las fuentes estándar del PDF solo tienen letras latinas: se cambian símbolos que no existen
  const limpio = (t) => String(t === null || t === undefined ? "" : t).replace(/[⚠✓✔•]/g, "").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "").trim();

  /**
   * d: { marca, titulo, fecha, tecnico, telefonoTecnico, agricultor, cultivo, equipo,
   *      productos:[{ nombre, ia, dosis, total }] (al tanque), fertilizantes:[{ nombre, ia, dosis, total }] (al suelo), pasos:[texto], avisos:[{nivel, texto}],
   *      precauciones:[texto], compras:[[producto, detalle]], totales:[[etiqueta, valor]], indicaciones, pie }
   */
  function crear(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, H = 297, M = 15, AN = W - M * 2;
    let y = 0;
    const color = (c) => doc.setTextColor(c[0], c[1], c[2]);
    const fill = (c) => doc.setFillColor(c[0], c[1], c[2]);
    const fuente = (peso, tam) => { doc.setFont("helvetica", peso); doc.setFontSize(tam); };
    const lineas = (t, ancho) => doc.splitTextToSize(limpio(t), ancho);
    const alto = (n, tam) => n * tam * 0.3528 * 1.25;
    const espacio = (mm) => { if (y + mm > H - 16) { doc.addPage(); y = M; } };

    // cabecera
    fill(VERDE); doc.rect(0, 0, W, 30, "F");
    color([255, 255, 255]); fuente("bold", 18); doc.text(limpio(d.titulo || "Receta técnica"), M, 14);
    fuente("normal", 10); doc.text(limpio(d.marca || "CampoGuía") + " · Manual técnico de cultivos", M, 21);
    fuente("bold", 10); doc.text(limpio(d.fecha || ""), W - M, 14, { align: "right" });
    y = 38;

    // datos de la receta
    const datos = (d.deAgricultor ? [] : [["Técnico", d.tecnico + (d.telefonoTecnico ? " · " + d.telefonoTecnico : "")]]).concat([["Agricultor", d.agricultor || "________________________________"],
      ["Cultivo / lote", d.cultivo || "________________________________"], ["Aplicación", d.equipo || ""]]);
    fill([245, 246, 241]); doc.roundedRect(M, y, AN, datos.length * 6.5 + 4, 2, 2, "F");
    let yy = y + 6.5;
    datos.forEach(([k, v]) => { fuente("bold", 10); color(SUAVE); doc.text(k + ":", M + 4, yy); fuente("normal", 10); color(TEXTO); doc.text(lineas(v, AN - 40)[0] || "", M + 36, yy); yy += 6.5; });
    y += datos.length * 6.5 + 10;

    const titulo = (t) => { espacio(14); fuente("bold", 12); color(VERDE); doc.text(limpio(t), M, y); y += 2; doc.setDrawColor(VERDE[0], VERDE[1], VERDE[2]); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); y += 5; };

    // cuerpo de la receta: tabla de productos (mezcla al tanque y/o fertilización al suelo)
    const tabla = (tit, lista, colTotal, colDosis) => {
      titulo(tit);
      const cols = [{ t: "#", w: 7 }, { t: "Producto e ingrediente activo", w: 60 }, { t: colDosis || "Dosis", w: 44 }, { t: "Vía de aplicación", w: 32 }, { t: colTotal, w: AN - 143 }];
      fuente("bold", 8.5); const lh = cols.map((c) => lineas(c.t, c.w - 3)), hh = Math.max(...lh.map((l) => l.length)) * 3.6 + 3.4;
      espacio(10 + hh); fill(CLARO); doc.rect(M, y - 4, AN, hh, "F"); color(TEXTO);
      let x = M; cols.forEach((c, i) => { doc.text(lh[i], x + 2, y + 0.5); x += c.w; }); y += hh - 1;
      lista.forEach((p, i) => {
        fuente("bold", 10); const ln = lineas(p.nombre, cols[1].w - 4); fuente("normal", 8.5); const li = p.ia ? lineas(p.ia, cols[1].w - 4) : [];
        fuente("bold", 10); const ld = lineas(p.dosis, cols[2].w - 4); fuente("normal", 10); const lt = lineas(p.total, cols[4].w - 4); fuente("bold", 9.5); const lv = lineas(p.via || "", cols[3].w - 4);
        const h = Math.max(alto(ln.length, 10) + alto(li.length, 8.5), alto(ld.length, 10), alto(lv.length, 9.5), alto(lt.length, 10)) + 2;
        espacio(h + 2);
        x = M; fuente("bold", 10); color(VERDE); doc.text(String(i + 1), x + 2, y + 1);
        x += cols[0].w; color(TEXTO); doc.text(ln, x + 2, y + 1);
        if (li.length) { fuente("normal", 8.5); color(SUAVE); doc.text(li, x + 2, y + 1 + alto(ln.length, 10)); }
        x += cols[1].w; fuente("bold", 10); color(TEXTO); doc.text(ld, x + 2, y + 1);
        x += cols[2].w; fuente("bold", 9.5); color(VERDE); doc.text(lv, x + 2, y + 1);
        x += cols[3].w; fuente("normal", 10); color(TEXTO); doc.text(lt, x + 2, y + 1);
        y += h; doc.setDrawColor(BORDE[0], BORDE[1], BORDE[2]); doc.setLineWidth(0.2); doc.line(M, y - 2, W - M, y - 2); y += 1;
      });
      y += 4;
    };
    const texto = (t, tam, peso, c, sangria) => { fuente(peso || "normal", tam || 10); const l = lineas(t, AN - (sangria || 0)); espacio(alto(l.length, tam || 10) + 1); color(c || TEXTO); doc.text(l, M + (sangria || 0), y); y += alto(l.length, tam || 10) + 1.5; };
    const sub = (t) => { espacio(10); y += 1; fuente("bold", 10.5); color(TEXTO); doc.text(limpio(t), M, y); y += 5; };
    // recuadro destacado (resumen de la fertilización)
    const recuadro = (lineasTxt) => { fuente("normal", 10); const ls = lineasTxt.map((t) => lineas(t, AN - 10)); const h = ls.reduce((a, l) => a + alto(l.length, 10) + 1.5, 0) + 3;
      espacio(h + 3); fill([235, 245, 238]); doc.roundedRect(M, y - 3, AN, h, 2, 2, "F"); let yy = y + 2;
      ls.forEach((l, i) => { fuente(i === 0 ? "bold" : "normal", 10); color(i === 0 ? VERDE : TEXTO); doc.text(l, M + 5, yy); yy += alto(l.length, 10) + 1.5; }); y += h + 3; };
    let nSec = 0;

    // 1) insumos para fumigar y, debajo, cómo prepararlos y aplicarlos
    if ((d.productos || []).length) {
      tabla(`${++nSec}. Insumos para fumigar`, d.productos, "Total a usar", "Dosis por equipo");
      if ((d.pasos || []).length) { sub("Orden de mezcla en el tanque"); d.pasos.forEach((p) => texto(p, 10, "normal", TEXTO, 3)); texto("Agregue un producto a la vez y espere que se disuelva antes del siguiente. Agua con pH entre 5 y 6.", 9, "italic", SUAVE, 3); y += 1; }
      if ((d.avisos || []).length) {
        sub("Compatibilidad");
        d.avisos.forEach((a) => {
          const [fondo, tinta] = AVISO[a.nivel] || AVISO.verde; fuente("normal", 9.5); const l = lineas(a.texto, AN - 8), h = alto(l.length, 9.5) + 4;
          espacio(h + 2); fill(fondo); doc.roundedRect(M, y - 4, AN, h, 1.5, 1.5, "F"); color(tinta); doc.text(l, M + 4, y + 0.5); y += h + 2;
        });
        y += 2;
      }
      if ((d.precauciones || []).length) { sub("Equipo de protección y precauciones"); d.precauciones.forEach((p) => texto("- " + p, 9.5, "normal", TEXTO, 3)); }
      y += 3;
    }

    // 2) fertilización al suelo y, debajo, el resumen: total de sacos, gramos por planta y próxima aplicación
    if ((d.fertilizantes || []).length) {
      tabla(`${++nSec}. Fertilización al suelo`, d.fertilizantes, "Total para la finca", "Dosis");
      if ((d.resumenSuelo || []).length) recuadro(d.resumenSuelo); else if (limpio(d.notaSuelo)) recuadro([d.notaSuelo]);
      if (limpio(d.obsSuelo)) { sub("Observaciones"); texto(d.obsSuelo, 10, "normal", TEXTO, 3); }
      y += 2;
    }

    if (limpio(d.indicaciones)) { titulo(`${++nSec}. Indicaciones del técnico`); texto(d.indicaciones, 10.5); y += 2; }


    if ((d.compras || []).length) {
      espacio(14 + (d.compras.length + (d.totales || []).length) * 5.5 + 12); // el bloque de costos no se parte entre páginas
      titulo(`${++nSec}. Para comprar (costos aprox.)`);
      d.compras.concat(d.totales || []).forEach(([a, b], i) => {
        // subtotales (productos / fertilizantes) en normal; el costo total y por equipo en verde y negrita
        const esTot = i >= d.compras.length, fuerte = esTot && /^Costo/.test(a);
        if (i === d.compras.length) { doc.setDrawColor(BORDE[0], BORDE[1], BORDE[2]); doc.setLineWidth(0.2); doc.line(M, y - 3.5, W - M, y - 3.5); y += 1; }
        fuente(fuerte || esTot ? "bold" : "normal", 10); const la = lineas(a, AN * 0.55), lb = lineas(b, AN * 0.42);
        const h = Math.max(alto(la.length, 10), alto(lb.length, 10)) + 1.5; espacio(h);
        color(fuerte ? VERDE : TEXTO); doc.text(la, M, y); doc.text(lb, W - M, y, { align: "right" }); y += h;
      });
      y += 2;
    }

    // firma (solo la receta del técnico)
    if (!d.deAgricultor) { espacio(17); y += 8; doc.setDrawColor(TEXTO[0], TEXTO[1], TEXTO[2]); doc.setLineWidth(0.3); doc.line(M, y, M + 70, y);
    fuente("bold", 10); color(TEXTO); doc.text(limpio(d.tecnico || ""), M, y + 4.5); fuente("normal", 9); color(SUAVE); doc.text("Técnico responsable", M, y + 8.5); }

    // nota final sobre los costos
    if ((d.compras || []).length) { y += 6; texto("Nota: los costos de esta receta son referenciales y aproximados, calculados con el PVP (precio de venta al público) de los insumos. Pueden variar de acuerdo al punto de venta.", 8.5, "italic", SUAVE); }

    // pie en todas las páginas
    const pags = doc.getNumberOfPages();
    for (let i = 1; i <= pags; i++) {
      doc.setPage(i); fuente("normal", 7.5); color(SUAVE);
      doc.text(lineas(d.pie || "", AN - 20), M, H - 12); doc.text(`Pág. ${i} de ${pags}`, W - M, H - 12, { align: "right" });
    }
    return doc;
  }

  // comparte el PDF (WhatsApp, etc.); si el teléfono no puede compartir archivos, lo descarga y abre WhatsApp con el texto
  async function compartir(d, nombre, textoPlano) {
    const blob = crear(d).output("blob");
    const archivo = new File([blob], nombre, { type: "application/pdf" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) { await navigator.share({ files: [archivo], title: d.titulo, text: "Receta técnica" }); return "pdf"; }
    } catch (e) { if (e && e.name === "AbortError") return "cancelado"; }
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (textoPlano) window.open("https://wa.me/?text=" + encodeURIComponent(textoPlano), "_blank", "noopener");
    return "descargado";
  }

  // descarga el PDF directo al teléfono (receta del agricultor)
  function descargar(d, nombre) {
    const blob = crear(d).output("blob"), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    return "descargado";
  }
  window.Receta = { crear, compartir, descargar };
})();

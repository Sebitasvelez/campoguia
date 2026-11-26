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
    const datos = [["Técnico", d.tecnico + (d.telefonoTecnico ? " · " + d.telefonoTecnico : "")], ["Agricultor", d.agricultor || "________________________________"],
      ["Cultivo / lote", d.cultivo || "________________________________"], ["Aplicación", d.equipo || ""]];
    fill([245, 246, 241]); doc.roundedRect(M, y, AN, datos.length * 6.5 + 4, 2, 2, "F");
    let yy = y + 6.5;
    datos.forEach(([k, v]) => { fuente("bold", 10); color(SUAVE); doc.text(k + ":", M + 4, yy); fuente("normal", 10); color(TEXTO); doc.text(lineas(v, AN - 40)[0] || "", M + 36, yy); yy += 6.5; });
    y += datos.length * 6.5 + 10;

    const titulo = (t) => { espacio(14); fuente("bold", 12); color(VERDE); doc.text(limpio(t), M, y); y += 2; doc.setDrawColor(VERDE[0], VERDE[1], VERDE[2]); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); y += 5; };

    // cuerpo de la receta: tabla de productos (mezcla al tanque y/o fertilización al suelo)
    const tabla = (tit, lista, colTotal) => {
      titulo(tit);
      const cols = [{ t: "#", w: 8 }, { t: "Producto e ingrediente activo", w: 72 }, { t: "Dosis", w: 58 }, { t: colTotal, w: AN - 138 }];
      espacio(14); fill(CLARO); doc.rect(M, y - 4, AN, 7, "F"); fuente("bold", 9); color(TEXTO);
      let x = M; cols.forEach((c) => { doc.text(c.t, x + 2, y + 0.5); x += c.w; }); y += 6;
      lista.forEach((p, i) => {
        fuente("bold", 10); const ln = lineas(p.nombre, cols[1].w - 4); fuente("normal", 8.5); const li = p.ia ? lineas(p.ia, cols[1].w - 4) : [];
        const ld = lineas(p.dosis, cols[2].w - 4), lt = lineas(p.total, cols[3].w - 4);
        const h = Math.max(alto(ln.length, 10) + alto(li.length, 8.5), alto(ld.length, 10), alto(lt.length, 10)) + 2;
        espacio(h + 2);
        x = M; fuente("bold", 10); color(VERDE); doc.text(String(i + 1), x + 2, y + 1);
        x += cols[0].w; color(TEXTO); doc.text(ln, x + 2, y + 1);
        if (li.length) { fuente("normal", 8.5); color(SUAVE); doc.text(li, x + 2, y + 1 + alto(ln.length, 10)); }
        x += cols[1].w; fuente("bold", 10); color(TEXTO); doc.text(ld, x + 2, y + 1);
        x += cols[2].w; fuente("normal", 10); doc.text(lt, x + 2, y + 1);
        y += h; doc.setDrawColor(BORDE[0], BORDE[1], BORDE[2]); doc.setLineWidth(0.2); doc.line(M, y - 2, W - M, y - 2); y += 1;
      });
      y += 4;
    };
    if ((d.productos || []).length) tabla("Rx · Mezcla recetada", d.productos, "Total a usar");
    if ((d.fertilizantes || []).length) tabla("Rx · Fertilización recetada", d.fertilizantes, "Total para la finca");

    const texto = (t, tam, peso, c, sangria) => { fuente(peso || "normal", tam || 10); const l = lineas(t, AN - (sangria || 0)); espacio(alto(l.length, tam || 10) + 1); color(c || TEXTO); doc.text(l, M + (sangria || 0), y); y += alto(l.length, tam || 10) + 1.5; };

    if ((d.pasos || []).length) { titulo("Orden de mezcla"); d.pasos.forEach((p) => texto(p, 10)); texto("Agregue un producto a la vez y espere que se disuelva antes del siguiente. Agua con pH entre 5 y 6.", 9, "italic", SUAVE); y += 2; }

    if ((d.avisos || []).length) {
      titulo("Compatibilidad");
      d.avisos.forEach((a) => {
        const [fondo, tinta] = AVISO[a.nivel] || AVISO.verde; fuente("normal", 9.5); const l = lineas(a.texto, AN - 8), h = alto(l.length, 9.5) + 4;
        espacio(h + 2); fill(fondo); doc.roundedRect(M, y - 4, AN, h, 1.5, 1.5, "F"); color(tinta); doc.text(l, M + 4, y + 0.5); y += h + 2;
      });
      y += 2;
    }

    if (limpio(d.indicaciones)) { titulo("Indicaciones del técnico"); texto(d.indicaciones, 10.5); y += 2; }

    if ((d.precauciones || []).length) { titulo("Precauciones"); d.precauciones.forEach((p) => texto("- " + p, 9.5, "normal", TEXTO, 0)); y += 2; }

    if ((d.compras || []).length) {
      espacio(14 + (d.compras.length + (d.totales || []).length) * 5.5 + 12); // el bloque de costos no se parte entre páginas
      titulo("Para comprar");
      d.compras.concat(d.totales || []).forEach(([a, b], i) => {
        const esTot = i >= d.compras.length; fuente(esTot ? "bold" : "normal", 10); const la = lineas(a, AN * 0.55), lb = lineas(b, AN * 0.42);
        const h = Math.max(alto(la.length, 10), alto(lb.length, 10)) + 1.5; espacio(h);
        color(esTot ? VERDE : TEXTO); doc.text(la, M, y); doc.text(lb, W - M, y, { align: "right" }); y += h;
      });
      y += 1; texto("Nota: precios referenciales según el PVP (precio de venta al público) de los insumos. No son los precios reales de cada punto de venta; pueden variar según el almacén.", 8.5, "italic", SUAVE);
      y += 2;
    }

    // firma
    espacio(17); y += 8; doc.setDrawColor(TEXTO[0], TEXTO[1], TEXTO[2]); doc.setLineWidth(0.3); doc.line(M, y, M + 70, y);
    fuente("bold", 10); color(TEXTO); doc.text(limpio(d.tecnico || ""), M, y + 4.5); fuente("normal", 9); color(SUAVE); doc.text("Técnico responsable", M, y + 8.5);

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

  window.Receta = { crear, compartir };
})();

/* CampoGuía · reporte como imagen (para guardar en el teléfono o compartir por WhatsApp) */
(function () {
  const VERDE = "#1F5E3B", TEXTO = "#1C2420", SUAVE = "#4A5650", BORDE = "#E1E4DC", FONDO = "#F5F6F1";
  const COLORES = { rojo: ["#FDECEA", "#A1281C"], ambar: ["#FFF6E5", "#7A4706"], verde: ["#E3EFE7", "#153F28"] };
  const W = 1080, M = 56, FUENTE = 'Inter, "Segoe UI", Roboto, Arial, sans-serif';

  function envolver(ctx, texto, ancho) {
    const palabras = String(texto || "").split(/\s+/), lineas = [];
    let actual = "";
    palabras.forEach((p) => {
      const prueba = actual ? actual + " " + p : p;
      if (ctx.measureText(prueba).width > ancho && actual) { lineas.push(actual); actual = p; } else actual = prueba;
    });
    if (actual) lineas.push(actual);
    return lineas.length ? lineas : [""];
  }

  /**
   * datos: { titulo, subtitulo, destacados:[[valor, etiqueta]], secciones:[{titulo, filas:[[etiqueta, valor]], textos:[string], avisos:[{nivel, texto}] }], pie }
   */
  function dibujar(datos, medir) {
    const c = document.createElement("canvas"), ctx = c.getContext("2d");
    c.width = W; c.height = medir || 4000;
    let y = 0;
    const font = (peso, tam) => { ctx.font = `${peso} ${tam}px ${FUENTE}`; };
    // fondo
    ctx.fillStyle = FONDO; ctx.fillRect(0, 0, W, c.height);
    // cabecera
    const altoCab = 200;
    ctx.fillStyle = VERDE; ctx.fillRect(0, 0, W, altoCab);
    ctx.fillStyle = "#fff"; font(700, 30); ctx.fillText(datos.marca || "CampoGuía", M, 64);
    font(700, 46); ctx.fillText(datos.titulo, M, 126);
    ctx.fillStyle = "#CFE3D6"; font(400, 26); ctx.fillText(datos.subtitulo || "", M, 170);
    y = altoCab + 36;
    // destacados (2 columnas)
    if (datos.destacados && datos.destacados.length) {
      const colW = (W - M * 2 - 24) / 2;
      for (let i = 0; i < datos.destacados.length; i += 2) {
        [0, 1].forEach((k) => {
          const d = datos.destacados[i + k]; if (!d) return;
          const x = M + k * (colW + 24);
          ctx.fillStyle = "#fff"; ctx.fillRect(x, y, colW, 138);
          ctx.strokeStyle = BORDE; ctx.lineWidth = 2; ctx.strokeRect(x, y, colW, 138);
          ctx.fillStyle = VERDE; font(700, 46); ctx.fillText(d[0], x + 24, y + 66);
          ctx.fillStyle = SUAVE; font(400, 24);
          envolver(ctx, d[1], colW - 48).slice(0, 2).forEach((l, j) => ctx.fillText(l, x + 24, y + 104 + j * 28));
        });
        y += 138 + 20;
      }
      y += 8;
    }
    // secciones
    (datos.secciones || []).forEach((s) => {
      if (s.titulo) { ctx.fillStyle = SUAVE; font(700, 24); ctx.fillText(s.titulo.toUpperCase(), M, y + 24); y += 44; }
      (s.filas || []).forEach(([et, val]) => {
        font(400, 28); const izq = envolver(ctx, et, (W - M * 2) * 0.5);
        font(700, 28); const der = envolver(ctx, val, (W - M * 2) * 0.46);
        const alto = Math.max(izq.length, der.length) * 36 + 22;
        ctx.fillStyle = "#fff"; ctx.fillRect(M, y, W - M * 2, alto);
        ctx.fillStyle = TEXTO; font(400, 28); izq.forEach((l, j) => ctx.fillText(l, M + 22, y + 40 + j * 36));
        font(700, 28); ctx.textAlign = "right"; der.forEach((l, j) => ctx.fillText(l, W - M - 22, y + 40 + j * 36)); ctx.textAlign = "left";
        ctx.fillStyle = BORDE; ctx.fillRect(M, y + alto - 2, W - M * 2, 2);
        y += alto;
      });
      (s.avisos || []).forEach((a) => {
        y += 12; font(400, 26);
        const lin = envolver(ctx, a.texto, W - M * 2 - 44), alto = lin.length * 34 + 28;
        const [bg, fg] = COLORES[a.nivel] || COLORES.ambar;
        ctx.fillStyle = bg; ctx.fillRect(M, y, W - M * 2, alto);
        ctx.fillStyle = fg; lin.forEach((l, j) => ctx.fillText(l, M + 22, y + 40 + j * 34));
        y += alto;
      });
      (s.textos || []).forEach((t) => {
        y += 8; ctx.fillStyle = TEXTO; font(400, 26);
        envolver(ctx, t, W - M * 2).forEach((l) => { ctx.fillText(l, M, y + 28); y += 34; });
      });
      y += 30;
    });
    // pie
    ctx.fillStyle = SUAVE; font(400, 22);
    envolver(ctx, datos.pie || "", W - M * 2).forEach((l) => { ctx.fillText(l, M, y + 22); y += 30; });
    y += 30;
    return { canvas: c, alto: Math.ceil(y) };
  }

  function generar(datos) {
    const alto = dibujar(datos).alto;           // primera pasada: medir
    return dibujar(datos, alto).canvas;          // segunda: dibujar del tamaño justo
  }

  function aBlob(canvas) { return new Promise((ok) => canvas.toBlob((b) => ok(b), "image/png")); }

  async function guardar(datos, nombre) {
    const blob = await aBlob(generar(datos));
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }

  // Comparte la imagen (WhatsApp, galería, etc.). Si el teléfono no permite compartir archivos, comparte el texto por WhatsApp.
  async function compartir(datos, nombre, textoPlano) {
    try {
      const blob = await aBlob(generar(datos));
      const archivo = new File([blob], nombre, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: datos.titulo, text: textoPlano });
        return "imagen";
      }
    } catch (e) { if (e && e.name === "AbortError") return "cancelado"; }
    window.open("https://wa.me/?text=" + encodeURIComponent(textoPlano), "_blank", "noopener");
    return "texto";
  }

  window.Reporte = { generar, guardar, compartir };
})();

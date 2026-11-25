/* CampoGuía · ventanas de confirmación propias (funcionan en cualquier navegador) */
(function () {
  function dialogo(mensaje, opts) {
    const o = Object.assign({ ok: "Aceptar", cancelar: "Cancelar", peligro: false, campo: false, placeholder: "" }, opts);
    return new Promise((resolver) => {
      const fondo = document.createElement("div");
      fondo.style.cssText = "position:fixed;inset:0;background:rgba(20,28,24,.45);display:flex;align-items:center;justify-content:center;padding:20px;z-index:100";
      const caja = document.createElement("div");
      caja.setAttribute("role", "dialog"); caja.setAttribute("aria-modal", "true");
      caja.className = "card"; caja.style.cssText = "max-width:380px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.25)";
      const p = document.createElement("p"); p.style.cssText = "margin:0;font-size:15px;line-height:1.45"; p.textContent = mensaje; caja.appendChild(p);
      let input = null;
      if (o.campo) { input = document.createElement("input"); input.placeholder = o.placeholder; input.style.cssText = "border:1px solid var(--borde-2);border-radius:12px;padding:0 12px;min-height:48px;font-size:16px;width:100%"; caja.appendChild(input); }
      const fila = document.createElement("div"); fila.className = "acciones";
      const no = document.createElement("button"); no.type = "button"; no.className = "btn sec"; no.textContent = o.cancelar;
      const si = document.createElement("button"); si.type = "button"; si.className = o.peligro ? "btn peligro" : "btn"; si.textContent = o.ok;
      fila.append(no, si); caja.appendChild(fila); fondo.appendChild(caja); document.body.appendChild(fondo);
      const cerrar = (v) => { fondo.remove(); document.removeEventListener("keydown", tecla); resolver(v); };
      const tecla = (e) => { if (e.key === "Escape") cerrar(o.campo ? null : false); if (e.key === "Enter" && o.campo) cerrar(input.value.trim() || null); };
      document.addEventListener("keydown", tecla);
      no.addEventListener("click", () => cerrar(o.campo ? null : false));
      si.addEventListener("click", () => cerrar(o.campo ? input.value.trim() || null : true));
      fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(o.campo ? null : false); });
      (input || si).focus();
    });
  }
  window.UI = {
    confirmar: (m, o) => dialogo(m, o),
    pedir: (m, placeholder) => dialogo(m, { campo: true, placeholder, ok: "Crear" }),
  };
})();

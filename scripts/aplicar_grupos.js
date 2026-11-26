// Asigna el grupo IRAC/FRAC/HRAC a cada producto del catálogo según su ingrediente activo (misma lógica que la app)
const fs = require("fs"), L = require(process.argv[2] + "/js/logic.js"), f = process.argv[2] + "/data/catalogo-inicial.json";
const c = JSON.parse(fs.readFileSync(f, "utf8"));
c.productos.forEach((p) => { p.grupo = L.grupoResistencia(p.ingrediente_activo, p.categoria).grupo; });
fs.writeFileSync(f + ".tmp", JSON.stringify(c));

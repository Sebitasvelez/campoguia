"""Sube $4 al precio de todos los «Fertilizante edáfico» con precio (indicación del asesor, 26-nov-2026).
Uso: python3 ajuste_precio_fertilizantes.py data/catalogo-inicial.json"""
import json, sys
NOTA = " | Precio +$4 por indicación del asesor (26-nov-2026)."
def main(path):
    c = json.load(open(path, encoding="utf-8")); n = 0
    for p in c["productos"]:
        if p.get("categoria") == "Fertilizante edáfico" and p.get("pvp") is not None and NOTA not in (p.get("fuente") or ""):
            p["pvp"] = round(p["pvp"] + 4, 2)
            for x in p.get("presentaciones") or []:
                if isinstance(x.get("precio"), (int, float)): x["precio"] = round(x["precio"] + 4, 2)
            p["fuente"] = (p.get("fuente") or "") + NOTA; n += 1
    json.dump(c, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(n, "precios ajustados; suma:", round(sum(p["pvp"] for p in c["productos"] if p.get("categoria") == "Fertilizante edáfico" and p.get("pvp") is not None), 2))
if __name__ == "__main__":
    main(sys.argv[1])

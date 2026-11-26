"""Importa LISTA_FERTILIZANTES_ACTUAL.xlsx (fertilizantes edáficos, nov 2026) al catálogo.
Si el producto ya existe (Soli Tec/Phos/Plex/Nitro/K) se consolida: precio y concentración del archivo.
Los nuevos entran como «Fertilizante edáfico», aplicación al suelo (kg/ha), sin dosis cargada.
Uso: python3 fertilizantes_actual.py LISTA_FERTILIZANTES_ACTUAL.xlsx data/catalogo-inicial.json"""
import json, sys, re, openpyxl

NOMBRES = {  # nombre del archivo → nombre en el catálogo
 "UREA GRANULADA": "Urea Granulada", "NITRATO DE AMONIO": "Nitrato de Amonio", "SULFATO DE AMONIO GRANULADO": "Sulfato de Amonio Granulado",
 "SULFATO DE MAGNESIO GR KIESERITE": "Sulfato de Magnesio GR Kieserite", "MURIATO DE POTASIO GR BLANCO": "Muriato de Potasio GR Blanco",
 "SULFATO DE POTASIO GR": "Sulfato de Potasio GR", "NITRATO DE POTASIO GR": "Nitrato de Potasio GR", "ACIDO BORICO": "Ácido Bórico",
 "SULFATO DE ZINC GRANULADO": "Sulfato de Zinc Granulado", "NITRATO DE CALCIO + BORO": "Nitrato de Calcio + Boro",
 "UREA FOSPHATE UP": "Urea Phosphate UP", "AZUFERTIL 2E": "Azufertil 2E", "AZUFERTIL 5E": "Azufertil 5E", "TIGSAMAG 1E": "Tigsamag 1E",
 "TIGSAMAG 4E": "Tigsamag 4E", "GRANUMAX": "Granumax", "GRANUMAX 2.1 S": "Granumax 2.1 S", "UREA+S ACTIVE 40+5,6S": "Urea+S Active",
 "FERPAMIX SUPRAN": "Ferpamix Supran", "FERPAMIX FERPAGROW": "Ferpamix Ferpagrow", "POTASSIUM PLUS": "Potassium Plus",
 "RADICAL PHOS": "Radical Phos", "FERPAMIX CACAO PRODUCCIÓN LC": "Ferpamix Cacao Producción LC", "FERPAMIX TODO CULTIVO": "Ferpamix Todo Cultivo",
 "URAM": "Uram", "NITRAN ACTIVE RADICAL PAC": "Nitran Active Radical PAC",
 "SOLIPHOS": "Soli Phos", "SOLITEC": "Soli Tec", "SOLIPLEX": "Soli Plex", "SOLI NITRO": "Soli Nitro", "SOLI K": "Soli K",
 "SOLEI EQ BALANCE": "Solei EQ Balance", "SOLEI EQ START": "Solei EQ Start", "SOLEI EQ YIELDMASTER": "Solei EQ Yieldmaster",
 "SOLEI EQ NITROS": "Solei EQ Nitros", "SOLEI NITROZ 44": "Solei Nitroz 44", "SOLEI EQ BANANO": "Solei EQ Banano",
}
FUENTE = "Lista de fertilizantes del asesor (noviembre 2026)"

def main(xlsx, path):
    c = json.load(open(path, encoding="utf-8"))
    por_nombre = {p["nombre"].lower(): p for p in c["productos"]}
    sig = max(p["id"] for p in c["productos"]) + 1
    ws = openpyxl.load_workbook(xlsx, data_only=True).active
    nuevos, consolidados = [], []
    for fila in ws.iter_rows(min_row=2, values_only=True):
        n, conc, pres, precio = (fila + (None,) * 4)[:4]
        if not n: continue
        nom = NOMBRES[str(n).strip()]
        kg = float(re.match(r"([\d.,]+)", str(pres)).group(1).replace(",", "."))
        pvp = round(float(precio), 2) if precio is not None else None
        empaque = f"{int(kg)} KILOS, SACO"
        p = por_nombre.get(nom.lower())
        if p:  # consolidar
            p.update(pvp=pvp if pvp is not None else p.get("pvp"), concentracion=conc, ingrediente_activo=conc,
                     fuente=FUENTE + " | " + (p.get("fuente") or "").replace(" | No figura en la lista de noviembre 2026: se mantiene el precio anterior.", ""))
            if p.get("presentaciones"): p["presentaciones"][0]["precio"] = p["pvp"]
            consolidados.append(nom); continue
        c["productos"].append({"id": sig, "nombre": nom, "ingrediente_activo": conc, "grupo": None, "categoria": "Fertilizante edáfico",
            "formulacion": "granulado", "modo_aplicacion": "suelo_ha", "dosis_min": None, "dosis_max": None, "unidad": "kg/ha",
            "dosis_texto": None, "presentacion": f"{int(kg)} KILOS", "contenido": int(kg * 1000), "contenido_unidad": "g", "pvp": pvp,
            "control": None, "carencia_dias": None, "reingreso_horas": None, "categoria_tox": None,
            "nota": "Completar: dosis" + ("" if pvp is not None else ", precio"), "fuente": FUENTE, "activo": True,
            "concentracion": conc, "presentaciones": [{"codigo": None, "empaque": empaque, "cantidad": int(kg * 1000), "unidad": "g", "precio": pvp}],
            "no_sugerir": False})
        nuevos.append((sig, nom)); sig += 1
    json.dump(c, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("consolidados:", consolidados); print("nuevos:", len(nuevos), nuevos[0], nuevos[-1])

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

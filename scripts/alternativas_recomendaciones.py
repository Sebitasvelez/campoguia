"""Recomendaciones por problema: opción recomendada + 4 alternativas ordenadas de la más eficiente (1) a la menos (4).
Elegidas por grupo químico funcional de la clase del problema y revisadas por el asesor (nov 2026).
Añade Malathion 57 EC (pedido del asesor para hormigas arrieras) y marca Neem X como «no sugerir».
Uso: python3 alternativas_recomendaciones.py data/catalogo-inicial.json"""
import json, sys

ORDEN = {  # (cultivo, problema): [recomendada, alt1, alt2, alt3, alt4]
 ("pitahaya", "Avispas / murujas"): ["Engeo", "Ninja Zeon", "Tryclan", "Bala", "Solvigo"],
 ("pitahaya", "Hormigas"): ["Engeo", "Bala", "Curacron", "Flecha", "Solvigo"],
 ("pitahaya", "Hormigas arrieras"): ["Attakill", "Pyrigran", "Malathion 57 EC", "Bala", "Cogollero"],
 ("pitahaya", "Chinches"): ["Engeo", "Voliam Flexi", "Solvigo", "Bala", "Curacron"],
 ("pitahaya", "Ácaros"): ["Solvigo", "Floramite", "Starmite", "Omite", "Theron"],
 ("pitahaya", "Babosas y caracoles"): ["Matababosa", "Tryclan"],
 ("pitahaya", "Nematodos"): ["Solvigo", "Vertimec 1.8", "Agrimec 84", "Amigable"],
 ("pitahaya", "Antracnosis (Colletotrichum) y Alternaria"): ["Score", "Atajo", "Uniform", "Tilt", "Daconil"],
 ("pitahaya", "Fusarium"): ["Overseas", "Mertect", "Carbovax", "Aprecio", "Solidaridad"],
 ("pitahaya", "Prevención de hongos (amplio espectro)"): ["Daconil", "Acierto", "Aprecio", "Codicobre", "Caldo Bordeles"],
 ("pitahaya", "Bacteriosis / pudrición blanda"): ["Kasumin", "Solidaridad", "Phyton", "Kocide", "Caldo Bordeles"],
 ("pitahaya", "Hongos del suelo (desinfección)"): ["Terraclor", "Mertect", "Aprecio", "Acierto", "Solidaridad"],
 ("pitahaya", "Malezas en general (no selectivo)"): ["Guadaña", "Tiro Fijo", "Winquat", "Fascinate 280 SL", "Gramoxone"],
 ("pitahaya", "Malezas de hoja ancha"): ["Ecuamina", "Dacocida EQ", "Galigan 240 EC", "Metrinex 50 EQ"],
 ("pitahaya", "Gramíneas (pastos)"): ["Nicorony", "Dual Gold 960 EC"],
 ("cacao", "Monilia (Moniliophthora roreri)"): ["Daconil", "Atajo", "Overseas", "Kocide", "Acierto"],
 ("cacao", "Escoba de bruja (Moniliophthora perniciosa)"): ["Kocide", "Atajo", "Overseas", "Daconil", "Acierto"],
 ("cacao", "Mazorca negra (Phytophthora)"): ["Uniform", "Acierto", "Kocide", "Atajo", "Daconil"],
 ("cacao", "Chinche del cacao (Monalonion)"): ["Engeo", "Voliam Flexi", "Solvigo", "Bala", "Cogollero"],
 ("cacao", "Hormigas y comejenes"): ["Engeo", "Bala", "Attakill", "Voliam Flexi", "Solvigo"],
 ("cacao", "Malezas en general (no selectivo)"): ["Guadaña", "Tiro Fijo", "Winquat", "Fascinate 280 SL", "Gramoxone"],
}
NR_CACAO = "Sugerencia de manual técnico: confirma la dosis para cacao en la etiqueta."
MALATHION = {"id": 196, "nombre": "Malathion 57 EC", "ingrediente_activo": "MALATION", "grupo": "IRAC 1B", "categoria": "Insecticida",
  "formulacion": "emulsion", "modo_aplicacion": "tanque", "dosis_min": None, "dosis_max": None, "unidad": "cc", "dosis_texto": None,
  "presentacion": None, "contenido": None, "contenido_unidad": None, "pvp": None,
  "control": "Insecticida organofosforado de contacto, ingestión e inhalación; amplio espectro (hormigas, chupadores y masticadores).",
  "carencia_dias": None, "reingreso_horas": None, "categoria_tox": None, "nota": "Completar: nombre comercial, dosis, precio",
  "fuente": "Pedido del asesor; ficha técnica de Malathion 57% EC (referencial)", "activo": True,
  "concentracion": "Malatión 570 g/L (EC) (referencial, verificar etiqueta)", "presentaciones": [], "no_sugerir": False}

def main(path):
    c = json.load(open(path, encoding="utf-8"))
    if not any(p["nombre"] == MALATHION["nombre"] for p in c["productos"]):
        c["productos"].append(dict(MALATHION))
    for p in c["productos"]:
        p["no_sugerir"] = p["nombre"] == "Neem X"
    ids = {p["nombre"]: p["id"] for p in c["productos"]}
    probs = {(p["cultivo_id"], p["nombre"]): p for p in c["problemas"]}
    recs = c["recomendaciones"]; nuevos = []
    for clave, nombres in ORDEN.items():
        pr = probs[clave]
        previos = {r["producto_id"]: r for r in recs if r["problema_id"] == pr["id"]}
        for k, nom in enumerate(nombres):
            pid = ids[nom]; ant = previos.get(pid, {})
            nuevos.append({"problema_id": pr["id"], "producto_id": pid, "etapa_id": ant.get("etapa_id"), "prioridad": k + 1,
                           "dosis_min": ant.get("dosis_min"), "dosis_max": ant.get("dosis_max"),
                           "nota": ant.get("nota") if ant else (NR_CACAO if pr["cultivo_id"] == "cacao" else None)})
    tocados = {probs[k]["id"] for k in ORDEN}
    resto = [r for r in recs if r["problema_id"] not in tocados]
    todas = resto + nuevos
    for i, r in enumerate(sorted(todas, key=lambda r: (r["problema_id"], r["prioridad"]))): r["id"] = i + 1
    c["recomendaciones"] = sorted(todas, key=lambda r: r["id"])
    json.dump(c, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(nuevos), "recomendaciones en", len(ORDEN), "problemas;", len(c["recomendaciones"]), "en total")

if __name__ == "__main__":
    main(sys.argv[1])

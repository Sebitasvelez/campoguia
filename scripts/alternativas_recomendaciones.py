"""Recomendaciones por problema: opción recomendada + 4 alternativas ordenadas de la más eficiente (1) a la menos (4).
Elegidas por grupo químico funcional de la clase del problema y revisadas por el asesor (nov 2026).
Enfermedades reordenadas el 26-nov-2026 con la presentación del asesor sobre fungicidas e ingredientes activos
(espectro por clase de hongo) y ensayos publicados (Colletotrichum, Moniliophthora, Phytophthora).
Por indicación del asesor, en enfermedades de una clase de hongo solo van productos específicos (no multisitio ni preventivos).
Plagas reordenadas por eficiencia de grupo IRAC (26-nov-2026).
Volaton AG (malatión, indicado por el asesor) va en hormigas arrieras; Neem X queda como «no sugerir».
Uso: python3 alternativas_recomendaciones.py data/catalogo-inicial.json"""
import json, sys

ORDEN = {  # (cultivo, problema): [recomendada, alt1, alt2, alt3, alt4]
 ("pitahaya", "Avispas / murujas"): ["Engeo", "Bala", "Ninja Zeon", "Tryclan", "Curacron"],
 ("pitahaya", "Hormigas"): ["Engeo", "Bala", "Ninja Zeon", "Flecha", "Curacron"],
 ("pitahaya", "Hormigas arrieras"): ["Attakill", "Pyrigran", "Volaton AG", "Bala", "Flecha"],
 ("pitahaya", "Chinches"): ["Solvigo", "Engeo", "Voliam Flexi", "Kamsa 970 SG", "Curacron"],
 ("pitahaya", "Ácaros"): ["Floramite", "Starmite", "Omite", "Theron", "Vertimec 1.8"],
 ("pitahaya", "Babosas y caracoles"): ["Matababosa", "Tryclan"],
 ("pitahaya", "Nematodos"): ["Solvigo", "Vertimec 1.8", "Agrimec 84", "Amigable"],
 ("pitahaya", "Antracnosis (Colletotrichum)"): ["Score", "Atajo", "Inspire Gold", "Overseas", "Quadris 50 WG"],
 ("pitahaya", "Alternaria (mancha negra)"): ["Overseas", "Inspire Gold", "Score", "Atajo", "Quadris Top"],
 ("pitahaya", "Fusarium"): ["Mertect", "Inspire Gold", "Overseas", "Atajo", "Score"],
 ("pitahaya", "Prevención de hongos (amplio espectro)"): ["Daconil", "Acierto", "Aprecio", "Kocide", "Codicobre"],
 ("pitahaya", "Bacteriosis / pudrición blanda"): ["Kasumin", "Solidaridad", "Kocide", "Phyton", "Caldo Bordeles"],
 ("pitahaya", "Hongos del suelo (desinfección)"): ["Uniform", "Terraclor", "Mertect", "Overseas", "Terrazole"],
 ("pitahaya", "Malezas en general (no selectivo)"): ["Guadaña", "Tiro Fijo", "Winquat", "Fascinate 280 SL", "Gramoxone"],
 ("pitahaya", "Malezas de hoja ancha"): ["Ecuamina", "Dacocida EQ", "Galigan 240 EC", "Metrinex 50 EQ"],
 ("pitahaya", "Gramíneas (pastos)"): ["Nicorony", "Dual Gold 960 EC"],
 ("cacao", "Monilia (Moniliophthora roreri)"): ["Quadris 50 WG", "Atajo", "Score", "Overseas", "Priori Xtra"],
 ("cacao", "Escoba de bruja (Moniliophthora perniciosa)"): ["Atajo", "Quadris 50 WG", "Priori Xtra", "Score", "Overseas"],
 ("cacao", "Mazorca negra (Phytophthora)"): ["Uniform", "Ridomil Gold", "Acierto", "Fostyl", "Revus"],
 ("cacao", "Chinche del cacao (Monalonion)"): ["Solvigo", "Engeo", "Voliam Flexi", "Kamsa 970 SG", "Curacron"],
 ("cacao", "Hormigas y comejenes"): ["Engeo", "Bala", "Ninja Zeon", "Flecha", "Attakill"],
 ("cacao", "Malezas en general (no selectivo)"): ["Guadaña", "Tiro Fijo", "Winquat", "Fascinate 280 SL", "Gramoxone"],
}
NR_CACAO = "Sugerencia de manual técnico: confirma la dosis para cacao en la etiqueta."

def main(path):
    c = json.load(open(path, encoding="utf-8"))
    c["productos"] = [p for p in c["productos"] if p["nombre"] != "Malathion 57 EC"]
    for p in c["productos"]:
        if p["nombre"] == "Volaton AG":
            p.update(ingrediente_activo="MALATION", concentracion="Malatión en polvo (concentración por verificar en la etiqueta)",
                     grupo="IRAC 1B", control="Insecticida organofosforado (malatión) de contacto e ingestión; en polvo para hormigas y nidos.",
                     fuente="Asesor Ecuaquímica: Volaton AG es malatión | " + (p.get("fuente") or ""))
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

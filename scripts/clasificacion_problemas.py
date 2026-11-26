"""Añade a plagas y enfermedades su clasificación agronómica:
plagas → tipo de aparato bucal; enfermedades → clase del hongo con la taxonomía actual (Oomiceto, Ascomiceto,
Basidiomiceto), salvo Botrytis, Fusarium y Rhizoctonia, que se mantienen como Deuteromicetos
porque se controlan con ingredientes activos específicos; y una explicación breve.
Uso: python3 clasificacion_problemas.py data/catalogo-inicial.json"""
import json, sys

# clave: (cultivo, nombre del problema) → (clasificacion, como_actua)
DATOS = {
 ("pitahaya", "Avispas / murujas"): ("Masticador-lamedor",
  "Con sus mandíbulas raspan y desgarran la cáscara de botones, flores y frutos, y con la lengua lamen el néctar, el polen y los jugos que brotan de la herida. Las heridas quedan como cicatrices y puerta de entrada de hongos."),
 ("pitahaya", "Hormigas"): ("Masticador",
  "Con mandíbulas fuertes cortan y mastican raíces, flores y frutos. Además cuidan a insectos chupadores (cochinillas, pulgones) para tomar la melaza que producen, por eso aumentan otras plagas."),
 ("pitahaya", "Hormigas arrieras"): ("Masticador",
  "Cortan pedazos de tejido con las mandíbulas y los llevan al nido para cultivar el hongo del que se alimentan; casi no comen el tejido. Por eso funcionan los cebos que la obrera lleva al nido y la aplicación directa en la boca del hormiguero."),
 ("pitahaya", "Chinches"): ("Picador-chupador",
  "Clavan su pico (estilete) en tallos, botones y frutos, inyectan saliva que digiere el tejido y succionan los jugos. La saliva deja manchas, deformaciones y caída de botones."),
 ("pitahaya", "Ácaros"): ("Picador-chupador (quelíceros)",
  "No son insectos sino arácnidos. Con sus quelíceros en forma de estilete perforan una por una las células de la cáscara y succionan su contenido; las células vacías se ven como manchas plateadas, bronceadas o raspadas."),
 ("pitahaya", "Babosas y caracoles"): ("Raspador (rádula)",
  "Son moluscos, no insectos. Raspan el tejido tierno con la rádula, una lengua cubierta de dientecillos, y dejan mordeduras irregulares y rastros de baba brillante. Comen de noche y en días húmedos."),
 ("pitahaya", "Nematodos"): ("Picador-chupador (estilete)",
  "Gusanos microscópicos del suelo. Con un estilete bucal perforan las células de la raíz, inyectan saliva y succionan su contenido. Unos forman nudos (agallas) y otros dejan lesiones por donde entran hongos como Fusarium."),
 ("cacao", "Chinche del cacao (Monalonion)"): ("Picador-chupador",
  "Pica mazorcas y brotes tiernos con su estilete, inyecta saliva tóxica y succiona los jugos. Alrededor de cada picadura muere el tejido y queda una mancha negra hundida; los brotes atacados se secan."),
 ("cacao", "Hormigas y comejenes"): ("Masticador",
  "Ambos mastican: las hormigas cortan hojas y brotes con las mandíbulas, y los comejenes (termitas) roen raíces, corteza y madera desde sus galerías."),

 ("pitahaya", "Antracnosis (Colletotrichum) y Alternaria"): ("Ascomiceto",
  "Colletotrichum (estado sexual Glomerella) y Alternaria son Ascomicetos. Se multiplican por conidias que salpican con la lluvia y entran por heridas o tejido tierno; con humedad alta las manchas crecen rápido."),
 ("pitahaya", "Fusarium / sarna fúngica"): ("Deuteromiceto + Ascomiceto",
  "Fusarium se maneja como Deuteromiceto: es un hongo especial que solo responde a ciertos ingredientes activos. El hongo de la sarna (Neoscytalidium) es un Ascomiceto. Ambos viven en el suelo y en restos de cosecha, entran por heridas y se dispersan con el agua y las herramientas."),
 ("pitahaya", "Prevención de hongos (amplio espectro)"): ("Amplio espectro (multisitio)",
  "Antes de que aparezcan síntomas no se sabe qué hongo atacará, por eso se usan productos multisitio que protegen contra hongos de todas las clases."),
 ("pitahaya", "Bacteriosis / pudrición blanda"): ("Bacteria",
  "La causan bacterias (Erwinia / Pectobacterium), no hongos. Entran por heridas y deshacen las paredes de las células, por eso el tejido se vuelve acuoso y huele mal."),
 ("pitahaya", "Hongos del suelo (desinfección)"): ("Oomiceto + Deuteromiceto + Basidiomiceto",
  "En el suelo actúan oomicetos (Pythium, Phytophthora), Fusarium y Rhizoctonia (manejados como Deuteromicetos) y Sclerotium rolfsii (Basidiomiceto, hoy Athelia rolfsii). Como responden a grupos químicos distintos, la desinfección combina productos para las tres clases."),
 ("cacao", "Monilia (Moniliophthora roreri)"): ("Basidiomiceto",
  "Moniliophthora roreri es un Basidiomiceto. Infecta la mazorca joven en las primeras semanas y sus esporas secas se dispersan con el viento: la clave es proteger la mazorca pequeña y retirar las enfermas."),
 ("cacao", "Escoba de bruja (Moniliophthora perniciosa)"): ("Basidiomiceto",
  "Moniliophthora perniciosa es un Basidiomiceto. Infecta brotes, cojines florales y mazorcas en crecimiento; en las escobas secas forma pequeños hongos (setas) que liberan esporas con la lluvia."),
 ("cacao", "Mazorca negra (Phytophthora)"): ("Oomiceto",
  "Phytophthora es un oomiceto: no es un hongo verdadero sino un pseudohongo (reino Stramenopila), con pared de celulosa y sin ergosterol. Produce zoosporas que nadan en el agua y salpican desde el suelo con la lluvia, por eso avanza rápido en épocas lluviosas y con mal drenaje."),
}

def main(path):
    c = json.load(open(path, encoding="utf-8"))
    hechos = 0
    for pr in c["problemas"]:
        d = DATOS.get((pr["cultivo_id"], pr["nombre"]))
        pr["clasificacion"], pr["como_actua"] = (d if d else (pr.get("clasificacion"), pr.get("como_actua")))
        hechos += bool(d)
    faltan = [p["nombre"] for p in c["problemas"] if p["tipo"] in ("plaga", "enfermedad") and not p.get("clasificacion")]
    json.dump(c, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(hechos, "clasificados; sin clasificar:", faltan)

if __name__ == "__main__":
    main(sys.argv[1])

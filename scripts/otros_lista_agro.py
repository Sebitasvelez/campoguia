"""Completa los productos 'Otros' con la Lista de precios Agro Única (octubre 2025) y quita semillas / poscosecha.
Uso: python3 otros_lista_agro.py <catalogo.json>  -> escribe el catálogo y /tmp/otros.sql"""
import sys, json
CAT = sys.argv[1]
F = "Lista de precios Ecuaquímica División Agro (octubre 2025)"
REF = " (referencial, verificar etiqueta)"
ELIMINAR = {83, 136, 137, 167, 168, 169, 170, 171, 99}   # semillas y Express Universal 300 (comida floral, poscosecha)
# id: (categoria, ingrediente_activo, concentracion, formulacion, modo, unidad, control/uso, nota)
CAMBIOS = {
 67: ("Insecticida", "IMIDACLOPRID", "Imidacloprid", "soluble", "tanque", "cc", "Insecticida sistémico para insectos chupadores y masticadores vectores de virus", "Completar: concentración, dosis"),
 74: ("Bioestimulante", "PAECILOMYCES SPP.", "Paecilomyces spp. (inoculante biológico)", "polvo", "tanque", "g", "Inoculante biológico inductor de resistencia a patógenos", "Completar: concentración, dosis"),
 76: ("Insecticida", "IMIDACLOPRID + TIODICARB", "Imidacloprid + Tiodicarb (tratamiento de semilla)", "suspension", "tanque", "cc", "Insecticida para tratamiento de semilla, sistémico y por ingestión", "Uso en tratamiento de semilla. Completar: concentración, dosis"),
 77: ("Fungicida", None, None, "liquido", "tanque", "cc", "Fungicida sistémico curativo para mildiú polvoso en rosas", "Completar: ingrediente activo, concentración, dosis"),
 78: ("Fungicida", "MANDIPROPAMID + OXATIAPIPROLINA", "Mandipropamid 250 g/L + Oxatiapiprolina 30 g/L", "suspension", "tanque", "cc", "Fungicida para enfermedades causadas por oomicetos en rosas", "Completar: dosis"),
 87: ("Coadyuvante", "EDTA TETRASODICO", "Etilendiamino tetraacético tetrasódico (EDTA)", "corrector_ph", "tanque", "g", "Corrector de dureza del agua: neutraliza calcio y magnesio", "Completar: dosis"),
 93: ("Insecticida", "BACILLUS THURINGIENSIS", "Bacillus thuringiensis (insecticida biológico)", "liquido", "tanque", "cc", "Control de lepidópteros (gusanos)", "Completar: concentración, dosis"),
 102: ("Fungicida", "BACILLUS SUBTILIS", "Bacillus subtilis (fungicida biológico)", "liquido", "tanque", "cc", "Fungicida biológico para control y rotación de sigatoka negra en banano", "Completar: concentración, dosis"),
 103: ("Insecticida", "FLONICAMID", "Flonicamid", "polvo", "tanque", "g", "Insecticida sistémico y translaminar para insectos chupadores", "Completar: concentración, dosis"),
 105: ("Bioestimulante", "NANOPARTICULAS DE PLATA", "Plata en nanopartículas 6000 ppm", "liquido_foliar", "tanque", "cc", "Mejora crecimiento, vigor, rendimiento y respuesta al estrés", "Completar: dosis"),
 109: ("Fungicida", "TIABENDAZOL + FLUDIOXONIL + TIAMETOXAM + METALAXIL-M", "Tiabendazol + Fludioxonil + Tiametoxam + Metalaxil-M (FS, tratamiento de semillas)", "suspension", "tanque", "cc", "Tratamiento de semillas (fungicida + insecticida)", "Uso en tratamiento de semilla. Completar: concentración, dosis"),
 115: ("Bioestimulante", "TRICHODERMA SPP.", "Trichoderma spp. (inoculante biológico)", "polvo", "tanque", "g", "Inoculante biológico promotor de crecimiento vegetal", "Completar: concentración, dosis"),
 118: ("Herbicida", "BISPYRIBAC SODIO", "Bispyribac sodio 400 g/L" + REF, "suspension", "tanque", "cc", "Herbicida para arroz: col de agua, clavo de agua, moco de pavo, paja de burro, cortadera", "Completar: dosis"),
 119: ("Fertilizante edáfico", "HIERRO (HBED) + MANGANESO + ZINC", "Hierro quelatado HBED + Mn + Zn", "polvo", "suelo_ha", "g", "Corrector de carencias de hierro, manganeso y zinc", "Completar: dosis"),
 122: ("Fungicida", "EXTRACTOS VEGETALES FERMENTADOS", "Extractos vegetales fermentados (100% orgánico)", "liquido", "tanque", "cc", "Fungicida orgánico, bioenergizante vegetal", "Completar: dosis"),
 123: ("Herbicida", "AMETRINA", "Ametrina 500 g/L" + REF, "suspension", "tanque", "cc", "Herbicida selectivo pre y postemergente temprano en caña, banano y piña (gramíneas y hoja ancha)", "Completar: dosis"),
 132: ("Insecticida", "CIANTRANILIPROL + TIAMETOXAM", "Ciantraniliprol 200 g/kg + Tiametoxam 200 g/kg", "polvo", "tanque", "g", "Insecticida de doble modo de acción", "Completar: dosis"),
 133: ("Herbicida", "PROPANIL", "Propanil", "emulsion", "tanque", "cc", "Herbicida selectivo de contacto, postemergencia temprana en arroz", "Completar: concentración, dosis"),
 144: ("Herbicida", "QUINCLORAC", "Quinclorac", "liquido", "tanque", "cc", "Herbicida sistémico postemergente para Echinochloa y algunas hojas anchas en arroz", "Completar: concentración, dosis"),
 151: ("Bioestimulante", "PQQ (PIRROLOQUINOLINA QUINONA)", "Pirroloquinolina quinona (PQQ)", "polvo", "tanque", "g", "Bioestimulante a base de coenzimas y compuestos vitamínicos", "Completar: concentración, dosis"),
 158: ("Bioestimulante", "MICROORGANISMOS BENEFICOS", "Bio-inoculante para agricultura orgánica", "polvo", "suelo_ha", "g", "Bio-inoculante de suelo", "Completar: composición, dosis"),
 159: ("Fungicida", "SULFATO DE COBRE PENTAHIDRATADO + KASUGAMICINA", "Sulfato de cobre pentahidratado + Kasugamicina", "polvo", "tanque", "g", "Bactericida de absorción foliar, preventivo y curativo (tropicales y ornamentales)", "Completar: concentración, dosis"),
 161: ("Herbicida", "DIQUAT", "Diquat", "soluble", "tanque", "cc", "Herbicida de contacto no selectivo; desecante y defoliante", "Completar: concentración, dosis"),
 174: ("Herbicida", "ATRAZINA", "Atrazina 900 g/kg (WG)", "polvo", "tanque", "g", "Herbicida a base de atrazina", "Completar: dosis"),
 178: ("Bioestimulante", "AMINOACIDOS", "Aminoácidos", "liquido_foliar", "tanque", "cc", "Fertilizante a base de aminoácidos: apertura de estomas; vía fertirriego estimula raíces", "Completar: composición, dosis"),
 187: ("Bioestimulante", "ACIDOS HUMICOS", "Ácidos húmicos solubles", "polvo", "tanque", "g", "Mejora la asimilación de nutrientes del suelo (agente quelante)", "Completar: dosis"),
 188: ("Herbicida", "METSULFURON METIL", "Metsulfuron metil", "polvo", "tanque", "g", "Herbicida postemergente para arroz", "Completar: concentración, dosis"),
 80: ("Otros", "POLIBUTENO", "Polibuteno 100% (adhesivo para trampas de insectos)", "liquido", "tanque", "cc", "Adhesivo para monitoreo de insectos y plagas", None),
}
RENOMBRAR = {118: "Lapo 400", 119: "Magma HQ-Massó"}
c = json.load(open(CAT)); out = []
c["productos"] = [p for p in c["productos"] if p["id"] not in ELIMINAR]
for p in c["productos"]:
    x = CAMBIOS.get(p["id"])
    if not x: continue
    cat, ia, conc, form, modo, uni, uso, nota = x
    p.update(categoria=cat, ingrediente_activo=ia, concentracion=conc, formulacion=form, modo_aplicacion=modo, unidad=uni, control=uso, nota=nota)
    if p["id"] in RENOMBRAR: p["nombre"] = RENOMBRAR[p["id"]]
    p["fuente"] = (p.get("fuente") or "").replace("Sin ficha técnica encontrada", F)
json.dump(c, open(CAT, "w"), ensure_ascii=False, indent=1)
print(len(c["productos"]), "productos")

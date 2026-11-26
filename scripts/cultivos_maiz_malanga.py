"""Cultivos nuevos (nov 2026): Maíz y Papa china / malanga.
Etapas, problemas (plagas, enfermedades, malezas y nutrición), recomendaciones del portafolio y plan de fertilización.
Base: literatura (INIAP, universidades ecuatorianas, PNUD, Pacific Pests/Lucidcentral, Plant Disease Research) y la
clasificación interna del aplicativo. Las dosis de fertilización son referenciales: ajustar con análisis de suelo.
Uso: python3 cultivos_maiz_malanga.py > salida.sql   (luego se ejecuta en Supabase)"""
import json

P = {"Acierto": 62, "Actara 25 WG": 63, "Adengo": 64, "Affirm": 65, "Agresor": 67, "Agrimec 84": 195, "Amigable": 74, "Atajo": 24,
     "Audax": 76, "Bala": 9, "Caldo Bordeles": 20, "Caldolomita": 54, "Carbovax": 30, "Codicobre": 19, "Cogollero": 86, "Daconil": 18,
     "Damocles": 93, "Dual Gold 960 EC": 94, "Ecuamina": 37, "Engeo": 1, "Fascinate 280 SL": 100, "Floramite": 14, "Fostyl": 101,
     "Gaia": 103, "Gesaprim 90 WG": 106, "Gramoxone": 107, "Granumax": 211, "Grow Combi 1": 108, "Guadaña": 36, "Inspire Gold": 29,
     "Isabion": 46, "Kamsa 970 SG": 116, "Kasumin": 32, "Kocide": 21, "Match": 121, "Matababosa": 12, "Mertect": 28,
     "Muriato de Potasio GR Blanco": 200, "New BT 2X": 125, "Nicorony": 39, "Nutriq. Cosecha": 53, "Omite": 16, "Overseas": 27,
     "Phyton": 17, "Plentrix": 138, "Priori Xtra": 140, "Pyrigran": 8, "Quadris 50 WG": 142, "Quadris Top": 143, "Rayphos": 45,
     "Revus": 147, "Ridomil Gold": 149, "Score": 22, "Soli K": 59, "Soli Phos": 56, "Soli Plex": 57, "Solidaridad": 159,
     "Solugro 12-48-8": 43, "Solvigo": 3, "Starmite": 15, "Sulfato de Amonio Granulado": 198, "Sulfato de Magnesio GR Kieserite": 199,
     "Sulfato de Potasio GR": 201, "Sulfato de Zinc Granulado": 204, "Boro Zinc 10-10": 82, "Taspa": 165, "Terraclor": 33,
     "Terrazole": 166, "Theron": 13, "Tiro Fijo": 35, "Tricar 90 WDG": 174, "Triziman D": 176, "Uniform": 23, "Urea Granulada": 196,
     "Urea Phosphate UP": 206, "Vertimec 1.8": 179, "Vitafol 30-10-10": 184, "Vitafol 10-40-10": 182, "Solei K 44 NT": 157,
     "Voliam Flexi": 2, "Winquat": 38, "Vykenda": 186, "Tigsamag 1E": 209, "Solei Nitroz 44": 226, "Radical Phos": 217}

F_MAIZ = "INIAP y universidades ecuatorianas (UTEQ, UTB, UEB), guía PNUD maíz amarillo y Revista Agroecosistemas 2021; revisar"
F_MAL = "Pacific Pests/Lucidcentral, Plant Disease Research, UTA (papa china en Pastaza) y CTAHR Hawaii; revisar"

CULTIVOS = [("maiz", "Maíz", 3), ("malanga", "Papa china / malanga", 4)]

# (id, cultivo, nombre, uso, semanas, notas, orden)
ETAPAS = [
    (101, "maiz", "Siembra y emergencia (0–10 días)", "ambos", "0–1", "Tratar la semilla y vigilar trozadores y gallina ciega.", 1),
    (102, "maiz", "Crecimiento vegetativo V3–V8 (10–35 días)", "ambos", "2–5", "Época crítica de cogollero; primera fertilización nitrogenada.", 2),
    (103, "maiz", "Prefloración V10–VT (35–55 días)", "ambos", "5–8", "Segunda fertilización; vigilar mancha de asfalto, tizón y roya.", 3),
    (104, "maiz", "Floración y llenado R1–R5 (55–110 días)", "ambos", "8–16", "Proteger la hoja de la mazorca; gusano de la mazorca.", 4),
    (111, "maiz", "Siembra", "lote", None, None, 20), (112, "maiz", "Desarrollo", "lote", None, None, 21), (113, "maiz", "Cosecha", "lote", None, None, 22),
    (105, "malanga", "Siembra y brotación (0–6 semanas)", "ambos", "0–6", "Semilla (colinos) sana; corregir acidez del suelo.", 1),
    (106, "malanga", "Desarrollo foliar (1,5–4 meses)", "ambos", "6–16", "Máximo crecimiento de hojas; vigilar tizón de la hoja y pulgones.", 2),
    (107, "malanga", "Formación de cormos (4–7 meses)", "ambos", "16–28", "Alta demanda de potasio.", 3),
    (108, "malanga", "Engrose y cosecha (7–10 meses)", "ambos", "28–40", "Las hojas amarillean al madurar; evitar heridas en la cosecha.", 4),
    (114, "malanga", "Siembra", "lote", None, None, 20), (115, "malanga", "Desarrollo", "lote", None, None, 21), (116, "malanga", "Cosecha", "lote", None, None, 22),
]

# problemas: (id, cultivo, tipo, nombre, clasificacion, descripcion, como_actua, recomendaciones[5])
PROB = [
 # ---------------- MAÍZ
 (101, "maiz", "plaga", "Gusano cogollero (Spodoptera frugiperda)", "Masticador",
  "Larvas en el cogollo: hojas raspadas, perforaciones en hilera y excremento húmedo. Revisar 20 plantas por punto desde la emergencia hasta V8.",
  "Larva de mariposa nocturna que come el cogollo y las hojas tiernas; las larvas grandes se esconden dentro del cogollo, por eso hay que aplicar temprano y dirigido al cogollo.",
  ["Voliam Flexi", "Affirm", "Vykenda", "Match", "New BT 2X"]),
 (102, "maiz", "plaga", "Barrenador del tallo (Diatraea)", "Masticador",
  "Perforaciones y aserrín en el tallo y la base de la mazorca; tallos quebrados y mazorcas caídas.",
  "La larva entra al tallo y hace galerías; solo se controla mientras está fuera, en las primeras horas tras nacer.",
  ["Voliam Flexi", "Affirm", "Match", "Bala", "Damocles"]),
 (103, "maiz", "plaga", "Gusano de la mazorca (Helicoverpa)", "Masticador",
  "Larvas en la punta de la mazorca que comen los granos; puerta de entrada de pudriciones.",
  "La mariposa pone huevos en los pelos (estigmas); la larva baja a la mazorca. Aplicar en emisión de estigmas.",
  ["Voliam Flexi", "Affirm", "Match", "New BT 2X", "Bala"]),
 (104, "maiz", "plaga", "Gusanos trozadores y gallina ciega", "Masticador",
  "Plántulas cortadas al ras del suelo (trozador, Agrotis) o raíces comidas y plantas marchitas (gallina ciega, Phyllophaga).",
  "Larvas que viven en el suelo y comen de noche; el control va a la siembra, en la semilla o al suelo junto a la planta.",
  ["Audax", "Pyrigran", "Bala", "Engeo", "Cogollero"]),
 (105, "maiz", "plaga", "Chicharrita del maíz (Dalbulus maidis)", "Picador-chupador",
  "Insecto pequeño amarillento en el cogollo. Transmite el achaparramiento: plantas enanas, hojas rojizas o rayadas y mazorcas pequeñas.",
  "Chupa savia y transmite el espiroplasma del achaparramiento en las primeras semanas: proteger la semilla y la plántula.",
  ["Audax", "Engeo", "Actara 25 WG", "Solvigo", "Agresor"]),
 (106, "maiz", "plaga", "Pulgón del maíz (Rhopalosiphum maidis)", "Picador-chupador",
  "Colonias verde-azuladas en el cogollo y la panoja; melaza y fumagina.",
  "Chupa savia y transmite virus; sus enemigos naturales lo controlan si no se abusa de insecticidas.",
  ["Actara 25 WG", "Engeo", "Solvigo", "Gaia", "Agresor"]),
 (107, "maiz", "plaga", "Crisomélidos (Diabrotica)", "Masticador",
  "Escarabajos verde-amarillos que perforan las hojas y cortan los estigmas; sus larvas comen raíces.",
  "Los adultos mastican hojas y estigmas; en la siembra, la semilla tratada protege la raíz.",
  ["Engeo", "Bala", "Audax", "Cogollero", "Kamsa 970 SG"]),
 (108, "maiz", "enfermedad", "Mancha de asfalto (Phyllachora maydis)", "Ascomiceto",
  "Puntos negros brillantes y abultados en las hojas, a veces con halo café; secado rápido del follaje desde la floración.",
  "Complejo de Phyllachora maydis (Ascomiceto) con otros hongos; avanza con humedad alta y noches frescas. Proteger la hoja de la mazorca antes de la floración.",
  ["Priori Xtra", "Quadris Top", "Atajo", "Taspa", "Score"]),
 (109, "maiz", "enfermedad", "Tizón foliar (Exserohilum turcicum)", "Ascomiceto",
  "Manchas alargadas en forma de cigarro, gris-verdosas a café, de 3 a 15 cm.",
  "Ascomiceto que sobrevive en rastrojos y se dispersa con viento y lluvia; favorecido por rocío prolongado.",
  ["Priori Xtra", "Atajo", "Quadris Top", "Score", "Taspa"]),
 (110, "maiz", "enfermedad", "Roya (Puccinia)", "Basidiomiceto",
  "Pústulas pequeñas color canela o anaranjado en ambas caras de la hoja que sueltan polvo.",
  "Basidiomiceto cuyas esporas viajan con el viento; los triazoles y estrobilurinas la controlan al inicio.",
  ["Priori Xtra", "Atajo", "Quadris Top", "Taspa", "Score"]),
 (111, "maiz", "enfermedad", "Pudrición de mazorca y tallo (Fusarium)", "Deuteromiceto",
  "Granos con moho blanco-rosado, mazorcas podridas y tallos que se quiebran; riesgo de micotoxinas.",
  "Fusarium se maneja como Deuteromiceto; entra por daños de insectos y por estrés. Controlar barrenador y gusano de la mazorca, y no retrasar la cosecha.",
  ["Overseas", "Atajo", "Priori Xtra", "Inspire Gold", "Score"]),
 (112, "maiz", "enfermedad", "Carbón común (Ustilago maydis)", "Basidiomiceto",
  "Agallas blancas que luego se llenan de polvo negro en mazorca, tallo o panoja.",
  "Basidiomiceto que entra por heridas y tejido joven; se maneja con semilla tratada, híbridos tolerantes y eliminando las agallas antes de que se abran.",
  ["Carbovax", "Taspa", "Score", "Priori Xtra", "Atajo"]),
 (113, "maiz", "maleza", "Malezas en preemergencia", "Hoja ancha",
  "Control de malezas de hoja ancha y gramíneas justo después de sembrar, con suelo húmedo.",
  "Los preemergentes forman una capa en el suelo que impide nacer a las malezas durante las primeras semanas, que son las críticas para el maíz.",
  ["Gesaprim 90 WG", "Dual Gold 960 EC", "Adengo", "Tricar 90 WDG", "Guadaña"]),
 (114, "maiz", "maleza", "Gramíneas en postemergencia", "Gramíneas",
  "Pastos que nacen con el maíz: control con nicosulfurón entre V2 y V6.",
  "Los graminicidas selectivos para maíz controlan los pastos sin dañar el cultivo si se aplican en la etapa indicada en la etiqueta.",
  ["Nicorony", "Gesaprim 90 WG", "Dual Gold 960 EC"]),
 (115, "maiz", "maleza", "Hoja ancha en postemergencia", "Hoja ancha",
  "Malezas de hoja ancha después de la emergencia del maíz.",
  "Las auxinas (2,4-D) y la atrazina controlan hoja ancha en maíz; respetar la etapa del cultivo de la etiqueta.",
  ["Ecuamina", "Gesaprim 90 WG", "Tricar 90 WDG"]),
 (116, "maiz", "nutricion", "Deficiencia de nitrógeno", None,
  "Amarillamiento en V desde la punta de las hojas bajas, a lo largo de la nervadura central; plantas pálidas y mazorcas pequeñas.",
  "El nitrógeno es el nutriente que más rendimiento da en maíz; se fracciona entre siembra, V4–V6 y V8–V10 para aprovecharlo mejor.",
  ["Urea Granulada", "Solei Nitroz 44", "Sulfato de Amonio Granulado", "Vitafol 30-10-10"]),
 (117, "maiz", "nutricion", "Deficiencia de fósforo", None,
  "Hojas jóvenes con color morado-rojizo en los bordes y plantas pequeñas, sobre todo en suelos fríos o ácidos.",
  "El fósforo se necesita desde la siembra para la raíz; se aplica al fondo del surco y se complementa con foliares altos en P.",
  ["Soli Phos", "Urea Phosphate UP", "Solugro 12-48-8", "Vitafol 10-40-10"]),
 (118, "maiz", "nutricion", "Deficiencia de potasio", None,
  "Bordes de las hojas bajas secos y quemados; tallos débiles que se acaman.",
  "El potasio da fortaleza al tallo y llenado al grano; se aplica junto con la primera fertilización nitrogenada.",
  ["Muriato de Potasio GR Blanco", "Sulfato de Potasio GR", "Soli K", "Solei K 44 NT"]),
 (119, "maiz", "nutricion", "Deficiencia de zinc", None,
  "Franjas blanquecinas a ambos lados de la nervadura en hojas jóvenes; entrenudos cortos.",
  "El zinc y el manganeso son los micronutrientes que más responden en maíz en Ecuador; se aplican al suelo o foliar entre V4 y V8.",
  ["Sulfato de Zinc Granulado", "Boro Zinc 10-10", "Grow Combi 1"]),
 (120, "maiz", "nutricion", "Deficiencia de magnesio", None,
  "Rayado amarillo entre las nervaduras de las hojas bajas, que luego se vuelven rojizas.",
  "Frecuente en suelos ácidos y lavados; se corrige con fuentes de magnesio al suelo.",
  ["Sulfato de Magnesio GR Kieserite", "Tigsamag 1E", "Granumax", "Grow Combi 1"]),
 # ---------------- PAPA CHINA / MALANGA
 (131, "malanga", "enfermedad", "Tizón de la hoja (Phytophthora colocasiae)", "Oomiceto",
  "Manchas redondas morado-café en las hojas, con gotas amarillas o rojizas en el borde; las hojas se deshacen en pocos días con lluvia.",
  "Phytophthora colocasiae es un oomiceto: se dispersa con la lluvia y el viento; con clima húmedo las hojas pueden perderse en pocos días. Usar colinos sanos y eliminar hojas enfermas.",
  ["Ridomil Gold", "Uniform", "Acierto", "Fostyl", "Revus"]),
 (132, "malanga", "enfermedad", "Pudrición del cormo (Pythium)", "Oomiceto",
  "Plantas amarillas y marchitas; el cormo y las raíces se pudren con olor fétido, sobre todo en suelos encharcados.",
  "Pythium es un oomiceto del suelo que avanza con exceso de agua: mejorar el drenaje y tratar la semilla y el suelo.",
  ["Uniform", "Fostyl", "Terrazole", "Ridomil Gold", "Plentrix"]),
 (133, "malanga", "enfermedad", "Pudrición seca del cormo (Sclerotium rolfsii)", "Basidiomiceto",
  "Moho blanco algodonoso con bolitas café (esclerocios) en la base de la planta y el cormo.",
  "Sclerotium rolfsii (Athelia rolfsii) es un Basidiomiceto del suelo; sus esclerocios sobreviven años. Rotar y aplicar al cuello de la planta.",
  ["Terraclor", "Quadris 50 WG", "Overseas", "Atajo", "Score"]),
 (134, "malanga", "enfermedad", "Mancha foliar (Cladosporium y Phyllosticta)", "Ascomiceto",
  "Manchas pequeñas café o negras en las hojas viejas, a veces con centro claro.",
  "Hongos de hoja (Ascomicetos) que aparecen con humedad alta; rara vez graves si la planta está bien nutrida.",
  ["Score", "Atajo", "Quadris Top", "Priori Xtra", "Inspire Gold"]),
 (135, "malanga", "enfermedad", "Pudrición bacteriana (Erwinia / Pectobacterium)", "Bacteria",
  "Pudrición blanda y acuosa del cormo y la base de los pecíolos, con mal olor.",
  "Bacterias que entran por heridas y se multiplican con calor y humedad: desinfectar herramientas y no herir los cormos.",
  ["Kasumin", "Solidaridad", "Kocide", "Phyton", "Caldo Bordeles"]),
 (136, "malanga", "enfermedad", "Prevención de hongos (amplio espectro)", "Amplio espectro (multisitio)",
  "Aplicaciones preventivas en épocas de lluvia, antes de que aparezca el tizón.",
  "Los multisitio protegen la hoja contra hongos de todas las clases antes de la infección.",
  ["Daconil", "Kocide", "Triziman D", "Acierto", "Codicobre"]),
 (137, "malanga", "plaga", "Pulgones (Aphis gossypii)", "Picador-chupador",
  "Colonias en el envés de las hojas tiernas, hojas enrolladas y melaza. Transmiten el virus del mosaico (DsMV).",
  "Chupan savia y transmiten el mosaico de la malanga; usar semilla sana y controlar temprano.",
  ["Actara 25 WG", "Engeo", "Solvigo", "Gaia", "Agresor"]),
 (138, "malanga", "plaga", "Ácaros (arañita roja)", "Picador-chupador (quelíceros)",
  "Punteado amarillo y telarañas finas en el envés de las hojas en épocas secas.",
  "Ácaros que perforan las células con quelíceros; aumentan cuando se abusa de piretroides.",
  ["Floramite", "Starmite", "Omite", "Theron", "Vertimec 1.8"]),
 (139, "malanga", "plaga", "Gusanos defoliadores (Spodoptera)", "Masticador",
  "Larvas que comen las hojas dejando huecos grandes o solo las nervaduras.",
  "Larvas de mariposa nocturna; controlarlas pequeñas.",
  ["Affirm", "Voliam Flexi", "Match", "New BT 2X", "Bala"]),
 (140, "malanga", "plaga", "Cochinillas y gusanos del cormo", "Picador-chupador",
  "Cochinillas blancas en raíces y cormos, o galerías de larvas en el cormo; plantas débiles.",
  "Viven en el suelo y en la semilla: limpiar y tratar los colinos antes de sembrar.",
  ["Actara 25 WG", "Kamsa 970 SG", "Engeo", "Solvigo", "Pyrigran"]),
 (141, "malanga", "plaga", "Nematodos", "Picador-chupador (estilete)",
  "Raíces con agallas o lesiones, plantas amarillas y cormos pequeños o deformes.",
  "Gusanos microscópicos del suelo; combinar materia orgánica, rotación y nematicidas o biológicos.",
  ["Vertimec 1.8", "Solvigo", "Agrimec 84", "Amigable"]),
 (142, "malanga", "plaga", "Babosas y caracoles", "Raspador (rádula)",
  "Hojas tiernas raspadas y rastros brillantes de baba, sobre todo de noche y con lluvia.",
  "Moluscos que raspan el tejido con la rádula; se controlan con cebos.",
  ["Matababosa"]),
 (143, "malanga", "maleza", "Malezas en general (no selectivo)", "No selectivo (control total)",
  "Malezas en calles y bordes durante los primeros 4 meses.",
  "Herbicidas de control total aplicados dirigidos con pantalla, sin mojar las hojas de la malanga.",
  ["Guadaña", "Winquat", "Tiro Fijo", "Gramoxone", "Fascinate 280 SL"]),
 (144, "malanga", "nutricion", "Deficiencia de potasio", None,
  "Bordes de las hojas viejas amarillos y luego secos; cormos pequeños y livianos.",
  "La malanga extrae más potasio que nitrógeno (relación N:P:K cercana a 4,7:1:6,4): el potasio define el tamaño del cormo.",
  ["Muriato de Potasio GR Blanco", "Sulfato de Potasio GR", "Soli K", "Solei K 44 NT"]),
 (145, "malanga", "nutricion", "Deficiencia de nitrógeno", None,
  "Hojas pequeñas verde pálido, pocas hojas nuevas y crecimiento lento.",
  "El nitrógeno impulsa el desarrollo foliar de los primeros 4 meses; fraccionarlo evita pérdidas por lluvia.",
  ["Urea Granulada", "Sulfato de Amonio Granulado", "Solei Nitroz 44", "Vitafol 30-10-10"]),
 (146, "malanga", "nutricion", "Acidez del suelo y falta de calcio y magnesio", None,
  "Suelos rojos o amarillos de la Amazonía con pH bajo: raíces cortas, hojas pálidas y bajo rendimiento.",
  "En suelos ácidos el aluminio bloquea la raíz; encalar corrige el pH y aporta calcio y magnesio.",
  ["Caldolomita", "Granumax", "Sulfato de Magnesio GR Kieserite"]),
]

# plan de fertilización: (cultivo, etapa_id, tipo, producto, dosis_kg_ha, dosis_g_planta, nota, condicion)
FERT = [
 ("maiz", 101, "enmienda", "Granumax", 300, None, "Al voleo antes de sembrar, en suelos ácidos.", "Si el pH del suelo es ácido"),
 ("maiz", 101, "suelo", "Soli Phos", 150, None, "Al fondo del surco a la siembra (fósforo para la raíz).", None),
 ("maiz", 102, "suelo", "Urea Granulada", 150, None, "Entre V4 y V6, tapada o con suelo húmedo.", None),
 ("maiz", 102, "suelo", "Muriato de Potasio GR Blanco", 100, None, "Junto con la urea en V4–V6.", None),
 ("maiz", 102, "foliar", "Solugro 12-48-8", None, None, "Arranque y raíz en V3–V5.", None),
 ("maiz", 102, "foliar", "Grow Combi 1", None, None, "Micronutrientes (zinc, manganeso, boro) en V6–V8.", None),
 ("maiz", 103, "suelo", "Urea Granulada", 150, None, "Segunda fracción en V8–V10, antes de la floración.", None),
 ("maiz", 104, "foliar", "Nutriq. Cosecha", None, None, "Llenado de grano.", None),
 ("malanga", 105, "enmienda", "Caldolomita", None, 100, "En el hoyo o sitio de siembra, 15–30 días antes de sembrar.", "Si el pH del suelo es ácido"),
 ("malanga", 105, "suelo", "Soli Phos", 150, None, "A la siembra, junto al colino.", None),
 ("malanga", 105, "foliar", "Rayphos", None, None, "Enraizamiento y arranque.", None),
 ("malanga", 106, "suelo", "Soli Plex", 200, None, "A los 1,5–2 meses, en corona alrededor de la planta.", None),
 ("malanga", 106, "suelo", "Urea Granulada", 100, None, "A los 3 meses, desarrollo de hojas.", None),
 ("malanga", 106, "foliar", "Grow Combi 1", None, None, "Micronutrientes en desarrollo foliar.", None),
 ("malanga", 107, "suelo", "Muriato de Potasio GR Blanco", 150, None, "A los 4–5 meses: el potasio define el tamaño del cormo.", None),
 ("malanga", 107, "foliar", "Isabion", None, None, "Aminoácidos en épocas de estrés.", None),
 ("malanga", 108, "suelo", "Soli K", 150, None, "Engrose del cormo (6–7 meses).", None),
 ("malanga", 108, "foliar", "Nutriq. Cosecha", None, None, "Engrose y calidad del cormo.", None),
]

def q(v):
    if v is None: return "null"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def main():
    out = ["begin;"]
    out.append("insert into cultivos (id, nombre, activo, orden) values " + ", ".join(f"({q(i)}, {q(n)}, true, {o})" for i, n, o in CULTIVOS) + " on conflict (id) do nothing;")
    out.append("insert into etapas (id, cultivo_id, nombre, uso, semanas, notas, orden) values " + ", ".join(
        f"({i}, {q(c)}, {q(n)}, {q(u)}, {q(s)}, {q(no)}, {o})" for i, c, n, u, s, no, o in ETAPAS) + ";")
    filas, recs = [], []
    orden = {}
    for i, c, t, n, cl, d, ca, rs in PROB:
        orden[c] = orden.get(c, 0) + 1
        filas.append(f"({i}, {q(c)}, {q(t)}, {q(n)}, {q(d)}, {orden[c]}, {q(cl)}, {q(ca)})")
        for k, r in enumerate(rs):
            recs.append(f"({i},{P[r]},{k + 1})")
    out.append("insert into problemas (id, cultivo_id, tipo, nombre, descripcion, orden, clasificacion, como_actua) values " + ", ".join(filas) + ";")
    out.append(f"update problemas set fuente = case cultivo_id when 'maiz' then {q(F_MAIZ)} else {q(F_MAL)} end where cultivo_id in ('maiz', 'malanga');")
    out.append("insert into recomendaciones (problema_id, producto_id, prioridad, nota) select v.a, v.b, v.c, 'Sugerencia de manual técnico: confirma la dosis para ' || case when v.a < 130 then 'maíz' else 'papa china' end || ' en la etiqueta.' from (values " + ",".join(recs) + ") v(a, b, c);")
    fe = []
    for k, (c, e, t, p, kg, g, nota, cond) in enumerate(FERT):
        fe.append(f"({q(c)}, {e}, {q(t)}, {P[p]}, {q(kg)}, {q(g)}, {q(cond)}, {q(nota + ' Referencial: ajustar con análisis de suelo.' if t != 'foliar' else nota)}, {100 + k})")
    out.append("insert into plan_fertilizacion (cultivo_id, etapa_id, tipo, producto_id, dosis_kg_ha, dosis_g_planta, condicion, nota, orden) values " + ", ".join(fe) + ";")
    for t in ["etapas", "problemas", "recomendaciones", "plan_fertilizacion"]:
        out.append(f"select setval(pg_get_serial_sequence('{t}', 'id'), (select max(id) from {t}));")
    out.append("commit;")
    print("\n".join(out))

if __name__ == "__main__":
    main()

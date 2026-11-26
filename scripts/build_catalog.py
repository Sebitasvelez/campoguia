"""Convierte los Excel de Sebastián en el catálogo inicial de AgroDosis (JSON)."""
import json, re, sys, unicodedata
import openpyxl

PROD_XLSX, PLAN_XLSX, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def num(s):
    return float(str(s).replace(",", ".").strip())

SECTIONS = {
    "INSECTICIDAS": "Insecticida", "ACARICIDAS": "Acaricida",
    "FUNGICIDAS PREVENTIVOS": "Fungicida preventivo",
    "COLLETOTRICHUM Y ALTERNARIA": "Fungicida", "FUSARIUM": "Fungicida",
    "DESINFECCIÓN SUELO": "Desinfección de suelo", "HERBICIDAS": "Herbicida",
    "ESTIMULANTES": "Bioestimulante", "COADYUVANTES": "Coadyuvante",
    "FERTILIZANTES": "Fertilizante",
}

def parse_presentacion(p):
    """-> (contenido, unidad) ; LT=1000 cc, KG=1000 g"""
    if p is None: return None, None
    s = str(p).strip().upper()
    m = re.match(r"^([\d.,]+)?\s*(LT|L|KG|GR|G|CC)?$", s)
    if not m: return None, None
    q = num(m.group(1)) if m.group(1) else 1
    u = m.group(2)
    if u is None: return None, None
    if u in ("LT", "L"): return q * 1000, "cc"
    if u == "CC": return q, "cc"
    if u == "KG": return q * 1000, "g"
    return q, "g"

def parse_dosis(d, unidad_pres):
    """-> dict(modo, min, max, unidad, texto)"""
    out = {"modo": "tanque", "dosis_min": None, "dosis_max": None, "unidad": unidad_pres or "cc", "dosis_texto": None}
    if d is None: return out
    s = str(d).strip()
    out["dosis_texto"] = s
    up = s.upper()
    if "SACOS" in up:
        n = num(re.match(r"([\d.,]+)", s).group(1))
        out.update(modo="suelo_ha", dosis_min=n * 50, dosis_max=n * 50, unidad="kg/ha")
        return out
    if "SITIO" in up:
        nums = [num(x) for x in re.findall(r"[\d]+(?:[.,]\d+)?", s)]
        out.update(modo="sitio", dosis_min=nums[0], dosis_max=nums[-1], unidad="g")
        return out
    nums = [num(x) for x in re.findall(r"[\d]+(?:[.,]\d+)?", s)]
    if not nums: return out
    mult, unit = 1, out["unidad"]
    if "KG" in up: mult, unit = 1000, "g"
    elif "LITRO" in up: mult, unit = 1000, "cc"
    elif "GR" in up: unit = "g"
    elif "CC" in up: unit = "cc"
    out.update(dosis_min=nums[0] * mult, dosis_max=nums[-1] * mult, unidad=unit)
    return out

def formulacion(nombre, categoria, unidad, modo):
    n = nombre.upper()
    if n in ("INDICATE", "FIJAFIX PH"): return "corrector_ph"
    if n == "SILWET": return "siliconado"
    if n in ("VAPORGARD", "NU-FILM P"): return "aceite_adherente"
    if modo == "suelo_ha" or categoria == "Enmienda": return "granulado"
    if modo == "sitio": return "cebo"
    if unidad == "g": return "polvo"
    if categoria in ("Bioestimulante", "Fertilizante"): return "liquido_foliar"
    return "liquido"

# ---------------- productos ----------------
wb = openpyxl.load_workbook(PROD_XLSX, data_only=True)
ws = wb.active
productos, by_name, usos = [], {}, []  # usos: (seccion, nombre, dosis override, etiqueta col A)
section = None
for row in ws.iter_rows(values_only=True):
    a, b, c, g, d, pres, pvp, control = row[:8]
    if b is None: continue
    bs = str(b).strip()
    if bs in SECTIONS and c is None:
        section = bs; continue
    if bs == "NOMBRE COMERCIAL" or bs.startswith("PORTAFOLIO"): continue
    cat = SECTIONS[section]
    cont, ucont = parse_presentacion(pres)
    dz = parse_dosis(d, ucont)
    name = bs.upper()
    if name in ("ATTAKILL", "MATABABOSA"): cat = "Cebo"
    if name == "CALDOLOMITA": cat = "Enmienda"
    if name.startswith("SOLI "): cat = "Fertilizante edáfico"
    if cat == "Fertilizante" and name in ("ALCAPLANT",): cat = "Enmienda"
    if cat == "Fertilizante" and name == "NUTRIQ. COSECHA": cat = "Fertilizante foliar"
    if cat == "Bioestimulante" and str(g or "").upper() == "FERTILIZANTE": cat = "Fertilizante foliar"
    usos.append((section, name, dz, str(a).strip() if a else None))
    if name in by_name: continue
    falta = [k for k, v in (("ingrediente activo", c), ("dosis", d), ("presentación", pres), ("precio", pvp)) if v in (None, "")]
    p = {
        "id": len(productos) + 1,
        "nombre": bs.title() if bs.isupper() else bs,
        "ingrediente_activo": (str(c).strip() if c else None),
        "grupo": (None if g in (None, "…") else str(g).strip()),
        "categoria": cat,
        "formulacion": formulacion(name, cat, dz["unidad"], dz["modo"]),
        "modo_aplicacion": dz["modo"],
        "dosis_min": dz["dosis_min"], "dosis_max": dz["dosis_max"],
        "unidad": dz["unidad"], "dosis_texto": dz["dosis_texto"],
        "presentacion": (str(pres).strip() if pres is not None else None),
        "contenido": cont, "contenido_unidad": ucont,
        "pvp": (float(pvp) if isinstance(pvp, (int, float)) else None),
        "control": (str(control).strip() if control else None),
        "carencia_dias": None, "reingreso_horas": None, "categoria_tox": None,
        "nota": ("Completar: " + ", ".join(falta)) if falta else None, "fuente": "Lista de productos EQ para pitahaya (Excel del asesor)",
        "activo": True,
    }
    productos.append(p); by_name[name] = p

def P(name):
    return by_name[name.upper()]["id"]

# ---------------- cultivos y etapas ----------------
cultivos = [
    {"id": "pitahaya", "nombre": "Pitahaya amarilla", "activo": True, "orden": 1},
    {"id": "cacao", "nombre": "Cacao", "activo": True, "orden": 2},
]
pwb = openpyxl.load_workbook(PLAN_XLSX, data_only=True)
pws = pwb["Plan sanitario EQ"]
# Columnas del plan: A=Brotación, B=Desarrollo de flor, E=Apertura y cuajado, H=Fructificación, J=Engrose
fases = [("A", "Brotación de botón", "bajo"), ("B", "Desarrollo de flor", "ligero"), ("E", "Apertura y cuajado", "alto"),
         ("H", "Fructificación", "ligero"), ("J", "Engrose", "bajo")]
etapas = []
plan_sanitario = []
alias = {"NINJA": "NINJA ZEON", "VAPOR GARD": "VAPORGARD"}
for i, (col, nombre, riesgo) in enumerate(fases):
    eid = len(etapas) + 1
    notas = [pws[f"{col}{r}"].value for r in (23, 27)]
    costo = pws[f"{col}22"].value
    etapas.append({"id": eid, "cultivo_id": "pitahaya", "nombre": nombre, "uso": "sanitario",
                   "semanas": pws[f"{col}13"].value, "riesgo_hongos": riesgo,
                   "notas": " ".join(re.sub(r"\((productos?) con negrilla\)", "(marcados «Alternar»)", re.sub(r"\s+", " ", str(n).strip())).rstrip(".") + "." for n in notas if n), "costo_ref_texto": costo,
                   "orden": eid})
    for r in range(16, 22):
        cell = pws[f"{col}{r}"]
        if not cell.value: continue
        m = re.match(r"^(.*?)\s+([\d.,]+)\s*(cc|gr)$", str(cell.value).strip(), re.I)
        nm, q, u = m.group(1).upper(), num(m.group(2)), m.group(3).lower()
        nm = alias.get(nm, nm)
        plan_sanitario.append({"id": len(plan_sanitario) + 1, "etapa_id": eid, "producto_id": P(nm),
                               "dosis_tanque": q, "unidad": "g" if u == "gr" else "cc",
                               "alternar": bool(cell.font.b), "orden": r - 15})
for j, n in enumerate(["Establecimiento / siembra", "Desarrollo de pencas", "Floración", "Engrose"]):
    etapas.append({"id": len(etapas) + 1, "cultivo_id": "pitahaya", "nombre": n, "uso": "fertilizacion", "semanas": None,
                   "riesgo_hongos": None, "notas": None, "orden": 10 + j})
for j, n in enumerate(["Vivero y establecimiento", "Desarrollo (1 a 3 años)", "Floración", "Llenado de mazorca"]):
    etapas.append({"id": len(etapas) + 1, "cultivo_id": "cacao", "nombre": n, "uso": "ambos", "semanas": None, "riesgo_hongos": None,
                   "notas": None, "orden": j + 1})
for cid, nombres in (("pitahaya", ["Inicio / siembra", "Desarrollo de pencas", "Producción"]), ("cacao", ["Inicio / siembra", "Desarrollo / crecimiento", "Producción"])):
    for i, n in enumerate(nombres):
        etapas.append({"id": len(etapas) + 1, "cultivo_id": cid, "nombre": n, "uso": "lote", "semanas": None, "riesgo_hongos": None,
                       "notas": None, "costo_ref_texto": None, "orden": 20 + i})
E = {e["nombre"]: e["id"] for e in etapas if e["cultivo_id"] == "pitahaya" and e["uso"] == "fertilizacion"}
EC = {e["nombre"]: e["id"] for e in etapas if e["cultivo_id"] == "cacao"}

# ---------------- problemas y recomendaciones ----------------
problemas, recs = [], []
FUENTE_PROB = "Lista de productos EQ para pitahaya (Excel del asesor)"
def prob(tipo, nombre, desc, productos_rec, cultivo="pitahaya", nota_rec=None):
    pid = len(problemas) + 1
    problemas.append({"id": pid, "cultivo_id": cultivo, "tipo": tipo, "nombre": nombre, "descripcion": desc, "orden": pid, "fuente": FUENTE_PROB})
    for k, item in enumerate(productos_rec):
        name, dmin, dmax = (item if isinstance(item, tuple) else (item, None, None))
        recs.append({"id": len(recs) + 1, "problema_id": pid, "producto_id": P(name), "etapa_id": None,
                     "prioridad": k + 1, "dosis_min": dmin, "dosis_max": dmax, "nota": nota_rec})

prob("plaga", "Avispas / murujas", "Raspan botones florales, flores y frutos.", ["Engeo", "Solvigo", "Ninja Zeon", "Neem X", "Tryclan"])
prob("plaga", "Hormigas", "Dañan raíces, flores y frutos; protegen a otras plagas.", ["Engeo", "Bala", "Curacron", "Flecha", "Neem X"])
prob("plaga", "Hormigas arrieras", "Cortan y cargan tejido; nidos en el suelo.", ["Attakill", "Pyrigran"])
prob("plaga", "Chinches", "Pican tallos, botones y frutos; dejan manchas.", ["Engeo", "Solvigo", "Curacron"])
prob("plaga", "Ácaros", "Manchas y raspado en cladodios y frutos.", ["Solvigo", "Floramite", "Omite", "Theron", "Starmite"])
prob("plaga", "Babosas y caracoles", "Mordeduras en brotes tiernos y botones.", ["Matababosa", "Tryclan"])
prob("plaga", "Nematodos", "Raíces con nudos o lesiones; planta débil.", ["Solvigo"])
prob("enfermedad", "Antracnosis (Colletotrichum) y Alternaria", "Manchas hundidas en cladodios, flores y frutos.",
     ["Score", "Atajo", "Uniform", "Sico", "Tilt", "Daconil"])
prob("enfermedad", "Fusarium", "Pudrición de flor y fruto, pudrición de tallo y raíz; la planta se marchita.",
     ["Overseas", "Mertect", "Inspire Gold", "Carbovax"])
prob("enfermedad", "Prevención de hongos (amplio espectro)", "Aplicaciones preventivas, sobre todo en épocas de lluvia.",
     ["Daconil", "Kocide", "Phyton", "Codicobre", "Caldo Bordeles"])
prob("enfermedad", "Bacteriosis / pudrición blanda", "Tejido acuoso, blando y con mal olor.",
     [("Kasumin", None, None), ("Phyton", 400, 400), ("Kocide", None, None)])
prob("enfermedad", "Hongos del suelo (desinfección)", "Antes de sembrar o en focos de pudrición de raíz.",
     [("Terraclor", None, None), ("Aprecio", None, None), ("Mertect", 250, 250), ("Phyton", 400, 400), ("Kasumin", None, None)])
prob("maleza", "Malezas en general (no selectivo)", "Control total de malezas en calles. No tocar la planta.",
     ["Guadaña", "Tiro Fijo", "Winquat"])
prob("maleza", "Malezas de hoja ancha", "Herbicida selectivo para hoja ancha.", ["Ecuamina"])
prob("maleza", "Gramíneas (pastos)", "Herbicida selectivo para gramíneas.", ["Nicorony"])
prob("nutricion", "Enraizamiento", "Esquejes nuevos o raíces débiles.", ["Hormonagro 1", "Cumplidor", "Rayphos", "Solugro 12-48-8"])
prob("nutricion", "Brotación y floración pareja", "Estimular y emparejar la brotación y la floración.", ["Cytokin", "New Gibb", "Solugro 12-48-8", "Rayphos"])
prob("nutricion", "Estrés de la planta", "Después de sequía, exceso de lluvia, plagas o podas.", ["Isabion"])
prob("nutricion", "Engrose de fruto", "Mejorar tamaño y llenado del fruto.", ["Nutriq. Cosecha", "Soli K"])
prob("nutricion", "Suelo ácido (pH bajo)", "Corregir acidez y aportar calcio y magnesio.", ["Caldolomita", "Alcaplant"])


# ---------------- cacao (de manuales técnicos; productos del portafolio, revisar dosis)
FUENTE_PROB = "Manuales de cacao (ICA Colombia, CATIE, guía PNUD Ecuador) y fichas técnicas; revisar"
NR = "Sugerencia de manual técnico: confirma la dosis para cacao en la etiqueta."
prob("enfermedad", "Monilia (Moniliophthora roreri)", "Manchas y bultos en mazorcas jóvenes, luego polvo blanco-crema. Retirar mazorcas enfermas cada semana.", [("Daconil", None, None), "Kocide", "Phyton"], cultivo="cacao", nota_rec=NR)
prob("enfermedad", "Escoba de bruja (Moniliophthora perniciosa)", "Brotes hinchados en forma de escoba y mazorcas deformes. Poda sanitaria y sacar el material enfermo del lote.", ["Kocide", "Phyton"], cultivo="cacao", nota_rec=NR)
prob("enfermedad", "Mazorca negra (Phytophthora)", "Manchas café-negras en la mazorca que avanzan rápido con la lluvia. Mejorar drenaje y regular sombra.", ["Uniform", "Kocide", "Phyton"], cultivo="cacao", nota_rec=NR)
prob("plaga", "Chinche del cacao (Monalonion)", "Manchas negras hundidas en mazorcas y brotes por picaduras.", ["Engeo", "Solvigo"], cultivo="cacao", nota_rec=NR)
prob("plaga", "Hormigas y comejenes", "Daño en raíces, brotes y cortes de hojas.", ["Engeo", "Attakill"], cultivo="cacao", nota_rec=NR)
prob("maleza", "Malezas en general (no selectivo)", "Control en calles sin tocar el tronco ni las hojas del cacao.", ["Guadaña", "Tiro Fijo"], cultivo="cacao", nota_rec=NR)
prob("nutricion", "Suelo ácido (pH bajo)", "Corregir acidez y aportar calcio y magnesio.", ["Caldolomita"], cultivo="cacao", nota_rec=NR)
prob("nutricion", "Floración y cuajado", "Apoyar floración y cuajado de mazorcas.", ["Solugro 12-48-8", "Rayphos", "Isabion"], cultivo="cacao", nota_rec=NR)

# ---------------- plan de fertilización (borrador para revisar) ----------------
fert = []
def F(etapa, tipo, name, kg_ha=None, g_planta=None, tanque=None, frecuencia=None, condicion=None, nota=None):
    fert.append({"id": len(fert) + 1, "cultivo_id": "pitahaya", "etapa_id": E[etapa], "tipo": tipo,
                 "producto_id": P(name), "dosis_kg_ha": kg_ha, "dosis_g_planta": g_planta, "dosis_tanque": tanque,
                 "frecuencia_dias": frecuencia, "condicion": condicion, "nota": nota, "orden": len(fert) + 1})
F("Establecimiento / siembra", "enmienda", "Caldolomita", g_planta=250, condicion="Si el pH del suelo es ácido", nota="Aplicar en el hoyo o sitio de siembra, 30 días antes de fertilizar.")
F("Establecimiento / siembra", "suelo", "Soli Phos", kg_ha=150, nota="Arranque del cultivo (3 sacos/ha según portafolio).")
F("Establecimiento / siembra", "foliar", "Cumplidor", tanque=500, nota="Estimula pelos absorbentes.")
F("Establecimiento / siembra", "foliar", "Hormonagro 1", tanque=200, nota="Enraizamiento de esquejes.")
F("Desarrollo de pencas", "suelo", "Soli Tec", kg_ha=150, nota="Desarrollo vegetativo.")
F("Desarrollo de pencas", "suelo", "Soli Nitro", kg_ha=150, nota="Vigor y verdor.")
F("Desarrollo de pencas", "foliar", "Isabion", tanque=500, nota="Compensa estrés.")
F("Floración", "suelo", "Soli Plex", kg_ha=150, nota="Prefloración e inicio de flores.")
F("Floración", "foliar", "Cytokin", tanque=330, nota="Brotación floral.")
F("Floración", "foliar", "Solugro 12-48-8", tanque=1000)
F("Floración", "foliar", "New Gibb", tanque=10, nota="Emparejar floración; mezclar con otros estimulantes.")
F("Floración", "foliar", "Rayphos", tanque=1000)
F("Engrose", "suelo", "Soli K", kg_ha=150, nota="Engrose de fruto.")
F("Engrose", "foliar", "Nutriq. Cosecha", tanque=2000)
F("Engrose", "foliar", "Isabion", tanque=500, nota="Compensa estrés.")
# cacao (borrador con productos del portafolio)
def FC(etapa, tipo, name, **kw):
    fert.append({"id": len(fert) + 1, "cultivo_id": "cacao", "etapa_id": EC[etapa], "tipo": tipo, "producto_id": P(name),
                 "dosis_kg_ha": kw.get("kg_ha"), "dosis_g_planta": kw.get("g_planta"), "dosis_tanque": kw.get("tanque"),
                 "frecuencia_dias": None, "condicion": kw.get("condicion"), "nota": kw.get("nota"), "orden": len(fert) + 1})
FC("Vivero y establecimiento", "enmienda", "Caldolomita", g_planta=250, condicion="Si el pH del suelo es ácido", nota="En el hoyo de siembra.")
FC("Vivero y establecimiento", "suelo", "Soli Phos", kg_ha=150, nota="Arranque (borrador: revisar dosis para cacao).")
FC("Desarrollo (1 a 3 años)", "suelo", "Soli Tec", kg_ha=150, nota="Borrador: revisar dosis para cacao.")
FC("Floración", "suelo", "Soli Plex", kg_ha=150, nota="Borrador: revisar dosis para cacao.")
FC("Llenado de mazorca", "suelo", "Soli K", kg_ha=150, nota="Borrador: revisar dosis para cacao.")

# ---------------- compatibilidad (sugerencias generales para validar) ----------------
comp = []
def C(a, b, nivel, nota):
    comp.append({"id": len(comp) + 1, "producto_a": P(a), "producto_b": P(b), "nivel": nivel, "nota": nota})
for op in ["Curacron", "Flecha", "Pyrigran", "Bala"]:
    C("Caldo Bordeles", op, "incompatible", "El caldo bordelés es alcalino y degrada a los organofosforados.")
for cu in ["Kocide", "Phyton", "Caldo Bordeles", "Codicobre"]:
    C(cu, "Indicate", "precaucion", "Bajar mucho el pH con cobres libera cobre soluble y puede quemar.")
for ph in ["Solugro 12-48-8", "Rayphos"]:
    C("Alcaplant", ph, "incompatible", "El calcio con fosfatos forma precipitado en el tanque.")
C("Curacron", "Kocide", "precaucion", "La ficha de Curacron (Edifarm) indica no mezclar con productos de reacción alcalina como los cobres.")
for ac in ["Vaporgard", "Nu-Film P"]:
    C("Daconil", ac, "incompatible", "La ficha técnica de Daconil 720 (Syngenta Ecuador) indica no mezclarlo con aceite agrícola.")
for f in ["Score", "Sico", "Inspire Gold", "Mertect"]:
    C(f, "Caldo Bordeles", "incompatible", "No mezclar con productos de fuerte reacción alcalina como el caldo bordelés (fichas de difenoconazol y tiabendazol).")
C("Winquat", "Guadaña", "precaucion", "El paraquat seca el tejido rápido y reduce el efecto del glifosato.")


# ---------------- datos completados con fuentes de internet (revisar antes de publicar)
CLORPI = "⚠ Contiene clorpirifos: en mayo de 2026 Agrocalidad prohibió su importación y registro en Ecuador. Verifica si aún puede recomendarse."
ENR = {
 "ENGEO": dict(formulacion="suspension", categoria_tox="II", reingreso_horas=12, fuente="Ficha Ecuaquímica de Engeo: suspensión concentrada, categoría toxicológica II, reingreso 12 h."),
 "CURACRON": dict(formulacion="emulsion", categoria_tox="II", reingreso_horas=24, fuente="Vademécum Agrícola Edifarm (Curacron 500 EC): categoría II, reingreso 24 h; no mezclar con productos alcalinos."),
 "NINJA ZEON": dict(formulacion="suspension", fuente="Ficha ADAMA Ninja 050 CS: lambda-cihalotrina en microcápsulas (tecnología Zeon)."),
 "FLECHA": dict(formulacion="emulsion", categoria_tox="II", fuente="Referencia: diazinon 600 EC (ficha ADAMA Ecuador), categoría II. Confirmar con la etiqueta de Flecha."),
 "BALA": dict(formulacion="emulsion", nota=CLORPI, fuente="Agraria.pe, 25/05/2026: Agrocalidad prohíbe importación y registro de clorpirifos."),
 "PYRIGRAN": dict(nota=CLORPI, fuente="Agraria.pe, 25/05/2026: Agrocalidad prohíbe importación y registro de clorpirifos."),
 "DACONIL": dict(formulacion="suspension", carencia_dias=14, reingreso_horas=24, fuente="Ficha Syngenta Ecuador Daconil 720 SC: carencia 14 días en cacao (moniliasis); reingreso 12 a 24 h según versión (se usa 24 h). No mezclar con aceite agrícola."),
 "PHYTON": dict(formulacion="soluble", carencia_dias=0, fuente="Ficha Phyton-27 (Chile): concentrado soluble, sin período de carencia. Confirmar con la etiqueta de Ecuador."),
 "KOCIDE": dict(formulacion="polvo", fuente="Etiqueta Kocide 2000 (hidróxido de cobre 53,8 % WG): no mezclar con fosfitos."),
 "SCORE": dict(formulacion="emulsion", fuente="Etiqueta Score 250 EC (Syngenta): concentrado emulsionable, FRAC 3; no mezclar con productos alcalinos."),
 "TILT": dict(formulacion="emulsion", fuente="Etiqueta Tilt 250 EC (Syngenta): concentrado emulsionable."),
 "UNIFORM": dict(formulacion="suspension", reingreso_horas=24, fuente="Etiqueta Uniform (Syngenta, Perú): suspoemulsión (SE), reingreso 24 h."),
 "MERTECT": dict(formulacion="suspension", fuente="Mertect 340 F / Tecto 500 SC: tiabendazol en suspensión; incompatible con productos alcalinos como el caldo bordelés."),
 "KASUMIN": dict(formulacion="soluble", fuente="Etiqueta Kasumin (UPL): concentrado soluble (SL)."),
 "FLORAMITE": dict(formulacion="polvo", fuente="Floramite 50 WG: bifenazate, granulado dispersable, IRAC 20D."),
}
for p in productos:
    e = ENR.get(p["nombre"].upper())
    if not e: continue
    for k, v in e.items():
        if k == "nota" and p.get("nota"): p["nota"] = v + " " + p["nota"]
        elif k == "fuente": p["fuente"] = (p.get("fuente") or "") + " | Internet: " + v
        else: p[k] = v

# ---------------- concentración del ingrediente activo (fichas técnicas; las "referencial" se confirman con la etiqueta)
REF = " (referencial, verificar etiqueta)"
CONC = {
 "ENGEO": ("Tiametoxam 141 g/L + Lambda-cihalotrina 106 g/L (ZC)", "Etiqueta Engeo (SAG Chile / ADAMA Ecuador)"),
 "VOLIAM FLEXI": ("Clorantraniliprol 100 g/L + Tiametoxam 200 g/L (SC)", "Etiqueta Voliam Flexi 300 SC (SAG Chile)"),
 "SOLVIGO": ("Abamectina 36 g/L + Tiametoxam 72 g/L (SC)", "Ficha Solvigo, reg. 152-I1/NA (Agrizon)"),
 "NEEM X": ("Azadiractina 0,4 % (EC)", "Nombre en lista de precios (Neem-X 0,40 EC)"),
 "NINJA ZEON": ("Lambda-cihalotrina 50 g/L (CS, microcápsulas)", "Ficha Ninja (Edifarm / ADAMA)"),
 "CURACRON": ("Profenofos 500 g/L (EC)", "Vademécum Edifarm"),
 "FLECHA": ("Diazinon 600 g/L (EC)" + REF, "Referencia: diazinon 600 EC (ADAMA Ecuador)"),
 "PYRIGRAN": ("Clorpirifos 750 g/kg (WG)" + REF, "Referencia: etiqueta Pyrigran (Brasil)"),
 "BALA": ("Clorpirifos 500 g/L + Cipermetrina 50 g/L (EC)", "Ficha Bala 55 (Edifarm / Agrizon)"),
 "TRYCLAN": ("Tiociclam hidrogenoxalato 500 g/kg (SP)", "Vademécum Edifarm"),
 "ATTAKILL": ("Sulfluramida 3 g/kg (cebo granulado)", "Vademécum Edifarm"),
 "MATABABOSA": ("Metaldehído 50 g/kg (cebo)", "Vademécum Edifarm"),
 "THERON": ("Tetradifón 80 g/L (EC)", "Vademécum Edifarm"),
 "FLORAMITE": ("Bifenazato 500 g/kg (WP)", "Vademécum Edifarm"),
 "STARMITE": ("Cyenopyrafen 314 g/L (SC)", "Vademécum Edifarm"),
 "OMITE": ("Propargite 570 g/L (EC)" + REF, "Omite 57 EC (catálogo AERU / Dhanuka)"),
 "PHYTON": ("Sulfato de cobre pentahidratado 240 g/L (SL)", "Vademécum Edifarm"),
 "DACONIL": ("Clorotalonil 720 g/L (SC)", "Ficha Syngenta Ecuador / Edifarm"),
 "CODICOBRE": ("Cobre total 5,6 % p/p (gluconato de cobre)", "Vademécum Edifarm"),
 "CALDO BORDELES": ("Sulfato de cobre 800 g/kg (WP)", "Vademécum Edifarm"),
 "KOCIDE": ("Hidróxido de cobre 538 g/kg (WG)", "Vademécum Edifarm"),
 "SCORE": ("Difenoconazol 250 g/L (EC)", "Vademécum Edifarm (Score 250 EC)"),
 "UNIFORM": ("Azoxistrobina 322 g/L + Metalaxil-M 124 g/L (SE)", "Etiqueta Uniform Syngenta (SENASA Perú)"),
 "ATAJO": ("Piraclostrobin 133 g/L + Epoxiconazol 50 g/L (SE)" + REF, "Referencia: formulación estándar piraclostrobin + epoxiconazol (Opera, Edifarm)"),
 "SICO": ("Difenoconazol 250 g/L (EC)", "Nombre comercial (Sico 250 EC, Syngenta)"),
 "TILT": ("Propiconazol 250 g/L (EC)", "Nombre comercial (Tilt 250 EC, Syngenta)"),
 "MERTECT": ("Tiabendazol 500 g/L (SC)", "Mertect 500, reg. 031-F6/NA (Edifarm)"),
 "INSPIRE GOLD": ("Ciprodinil 251 g/L + Difenoconazol 87 g/L (EW)", "Inspire Gold 33.8 EW (catálogo AERU; etiqueta SAG Chile)"),
 "CARBOVAX": ("Carboxin 200 g/L + Thiram 200 g/L (SC)", "Vademécum Edifarm"),
 "KASUMIN": ("Kasugamicina 20 g/L (SL)", "Vademécum Edifarm"),
 "TERRACLOR": ("Quintoceno (PCNB) 750 g/kg (WP)", "Vademécum Edifarm"),
 "APRECIO": ("Captan 800 g/kg (WG)", "Vademécum Edifarm"),
 "TIRO FIJO": ("Glufosinato de amonio 200 g/L (SL)" + REF, "Referencia: formulación estándar de glufosinato (Edifarm)"),
 "GUADAÑA": ("Glifosato 480 g/L (SL)", "Ficha Agrizon"),
 "ECUAMINA": ("2,4-D amina 720 g/L (SL)", "Nombre comercial (Ecuamina 720)"),
 "WINQUAT": ("Paraquat 200 g/L (SL)" + REF, "Referencia: formulación estándar de paraquat"),
 "NICORONY": ("Nicosulfuron 750 g/kg (WG)" + REF, "Referencia: formulación estándar de nicosulfuron en sachet"),
 "CYTOKIN": ("Citoquininas (kinetina) 0,01 %", "Vademécum Edifarm / Agrizon"),
 "NEW GIBB": ("Ácido giberélico 10 %", "Nombre comercial (New Gibb 10 %)"),
 "SOLUGRO 12-48-8": ("N 12 % · P₂O₅ 48 % · K₂O 8 % + micronutrientes", "Fórmula del producto"),
 "RAYPHOS": ("N 18 % · P₂O₅ 26 % + ácidos húmicos", "Fórmula del producto"),
 "NU-FILM P": ("Poli-1-p-menteno 960 g/L", "Vademécum Edifarm"),
 "VAPORGARD": ("Di-1-p-menteno 96 %" + REF, "Referencia: ficha Vaporgard (Miller Chemical)"),
 "SILWET": ("Heptametiltrisiloxano modificado con polialquilenóxido ~100 %", "Ficha Silwet L-77 (referencia)"),
 "FIJAFIX PH": ("Éster de poliglicol 25 %", "Vademécum Edifarm"),
 "ALCAPLANT": ("Óxido de calcio 35 %", "Lista de productos del asesor"),
 "SOLI TEC": ("12-4-23 + 13 S + 0,3 B + 0,5 Zn + 0,3 AA", "Fórmula del producto"),
 "SOLI PHOS": ("12-24-12 + 7 S + 0,3 AA", "Fórmula del producto"),
 "SOLI PLEX": ("2-10-18 + 2 Mg + 11 S + 0,2 Zn + 0,9 B + 0,8 Mn + 0,3 AA", "Fórmula del producto"),
 "SOLI NITRO": ("18-22-0 + 5 MO + 5 AA", "Fórmula del producto"),
 "SOLI K": ("0-0-54 + 2,5 MgO + 2 S + 0,3 Zn + 0,3 AA", "Fórmula del producto"),
}
IA_FALTA = {"VOLIAM FLEXI": "CLORANTRANILIPROL + TIAMETOXAM", "STARMITE": "CYENOPYRAFEN"}
for p in productos:
    if not p.get("ingrediente_activo") and p["nombre"].upper() in IA_FALTA:
        p["ingrediente_activo"] = IA_FALTA[p["nombre"].upper()]
        if p.get("nota") and "Completar:" in p["nota"]:
            antes, _, lista = p["nota"].partition("Completar:")
            quedan = [x.strip() for x in lista.split(",") if x.strip() and x.strip() != "ingrediente activo"]
            p["nota"] = (antes.strip() + (" Completar: " + ", ".join(quedan) if quedan else "")).strip() or None
    cc = CONC.get(p["nombre"].upper())
    p["concentracion"] = cc[0] if cc else None
    if cc and "Fórmula" not in cc[1] and "asesor" not in cc[1]:
        p["fuente"] = (p.get("fuente") or "") + " | Concentración: " + cc[1] + "."

# ---------------- precios y presentaciones oficiales (Lista de precios Ecuaquímica, división Agro, octubre 2025)
import os
LISTA = json.load(open(os.path.join(os.path.dirname(OUT), "lista-precios-ecuaquimica-2025-10.json")))
MAPA = json.load(open(os.path.join(os.path.dirname(__file__), "map_lista.json")))
LIM = {"cc": 20000, "g": 50000}   # presentaciones para agricultor: hasta 20 L o 50 kg
def limpiar_empaque(e):
    e = re.sub(r"^\(\s*\d+\s*x\s*\)\s*", "", e, flags=re.I).strip()
    return re.sub(r"\s+,", ",", e)
for p in productos:
    nom = MAPA.get(p["nombre"].upper())
    pres = []
    for r in LISTA:
        if not nom or r["nombre"] != nom: continue
        emp, cant = limpiar_empaque(r["empaque"]), r["cantidad"]
        if "/HA" in emp.upper():  # renglón con dosis pegada (Pyrigran): la funda es de 500 g
            emp, cant = "500 GRAMOS, FUNDA", 500.0
        if cant > LIM[r["unidad"]]: continue
        pres.append({"codigo": r["codigo"], "empaque": emp, "cantidad": round(cant, 1), "unidad": r["unidad"], "precio": r["precio"]})
    pres.sort(key=lambda x: x["cantidad"])
    p["presentaciones"] = pres
    if pres:
        if p["unidad"] == "cc" and all(x["unidad"] == "g" for x in pres): p["unidad"] = "g"
        ref = next((x for x in pres if x["cantidad"] in (1000.0,)), None) or min(pres, key=lambda x: abs(x["cantidad"] - 1000))
        if p.get("modo_aplicacion") == "suelo_ha" or p["categoria"] in ("Enmienda", "Fertilizante edáfico"):
            ref = max(pres, key=lambda x: x["cantidad"])
        p["pvp"], p["contenido"], p["contenido_unidad"], p["presentacion"] = ref["precio"], ref["cantidad"], ref["unidad"], ref["empaque"].split(",")[0].strip()
        p["fuente"] = (p.get("fuente") or "") + " | Precios y presentaciones: Lista de precios Ecuaquímica División Agro, octubre 2025."
        if p.get("nota") and "Completar:" in p["nota"]:
            antes, _, lista = p["nota"].partition("Completar:")
            quedan = [x.strip() for x in lista.split(",") if x.strip() and x.strip() not in ("presentación", "precio")]
            p["nota"] = (antes.strip() + (" Completar: " + ", ".join(quedan) if quedan else "")).strip() or None
    else:
        p["fuente"] = (p.get("fuente") or "") + " | No figura en la lista de precios Ecuaquímica de octubre 2025 (precio del Excel)."

ajustes = {"whatsapp_asesor": "https://wa.me/+593988763749", "nombre_asesor": "Sebastián", "volumen_tanque_l": 200, "volumen_bomba_l": 20, "litros_agua_ha": 400, "plantas_por_bomba": 60, "ph_acido": 5.5,
           "aviso_legal": "Recomendación técnica referencial. Lea siempre la etiqueta y verifique con su asesor."}

for pr in problemas: pr.setdefault("fotos", [])
cat = {"version": 8, "publicado": None, "cultivos": cultivos, "etapas": etapas, "productos": productos,
       "problemas": problemas, "recomendaciones": recs, "plan_sanitario": plan_sanitario,
       "plan_fertilizacion": fert, "compatibilidad": comp, "ajustes": ajustes}
json.dump(cat, open(OUT, "w"), ensure_ascii=False, indent=1)
print(len(productos), "productos;", len(problemas), "problemas;", len(recs), "recs;", len(plan_sanitario), "plan;", len(fert), "fert;", len(comp), "comp")
for p in productos:
    if p["nota"]: print("  revisar:", p["nombre"], "-", p["nota"])

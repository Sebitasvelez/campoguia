"""Agrega al catálogo la lista de productos Ecuaquímica (nov 2026) y actualiza precios.
Uso: python3 agregar_lista_nov2026.py <lista.xlsx> <catalogo.json>
- Productos que ya existían: se reemplazan presentaciones y precios por los de la lista nueva.
- Productos nuevos: se agregan con la información técnica encontrada (Edifarm primero; si no, ficha del fabricante;
  si no, dato referencial marcado "verificar etiqueta"); lo que no se encontró queda en nota "Completar: ...".
"""
import sys, json, re, unicodedata, openpyxl

XLSX, CAT = sys.argv[1], sys.argv[2]
GAL, LB = 3785.0, 453.6
LIM = {"cc": 20000, "g": 50000, "u": 10**9}
REF = " (referencial, verificar etiqueta)"
F_ED = "Vademécum Agrícola Edifarm"
F_REF = "Dato referencial por nombre comercial / formulación conocida; verificar con la etiqueta"
PRECIOS = "Precios y presentaciones: Lista de productos Ecuaquímica, noviembre 2026."

def norm(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9]", "", s)

def parse_pres(t, unidad_prod):
    """'1 LTS' -> (1000,'cc'); '2.5 GLNS' -> (9462.5,'cc'); '50 LBRS' -> (22680,'g') ..."""
    s = t.upper().replace("DE ", "").replace("BOTELLA ", "").strip()
    if unidad_prod == "u" or s.startswith("UNIDAD") or "SOBRE" in s and "GRAM" not in s:
        return 1.0, "u"
    m = re.match(r"(\d+)\s*/\s*(\d+)\s*(.*)", s)
    if m: n, rest = float(m.group(1)) / float(m.group(2)), m.group(3)
    else:
        m = re.match(r"([\d.,]+)\s*(.*)", s)
        if not m: return None, None
        n, rest = float(m.group(1).replace(",", ".")), m.group(2)
    if "SOBRES" in rest:                       # '1000 SOBRES 10 GRAMOS'
        g = re.search(r"([\d.]+)\s*GRAM", rest); return n * float(g.group(1)), "g"
    r = rest.strip().rstrip(".")
    if r.startswith(("LT", "LTS", "L ")) or r == "L": return n * 1000, "cc"
    if r.startswith(("ML", "CC")): return n, "cc"
    if r.startswith("GL"): return round(n * GAL, 1), "cc"
    if r.startswith("LB"): return round(n * LB, 1), "g"
    if r.startswith(("KG", "KILO")): return n * 1000, "g"
    if r.startswith(("GR", "G")): return n, "g"
    return None, None

def nombre_pres(cant, uni, original):
    return original.strip().upper()

# ------------------------------------------------------------ lista
wb = openpyxl.load_workbook(XLSX, data_only=True); ws = wb.active
lista = {}
for r in ws.iter_rows(min_row=2, values_only=True):
    if not r[0] or r[3] is None: continue
    lista.setdefault(r[0].strip(), []).append((str(r[2]).strip(), float(r[3])))

# correcciones evidentes de la lista (empaque mal escrito según el precio)
FIX_EMPAQUE = {("TRIZIMAN D", "250 KGMS"): "250 GRMS", ("VITAFOL 30-10-10 ECUAFOL", "800 GRMS", 48.0): "25 LBRS"}

# nombres de la lista que se juntan en un solo producto
UNIR = {"EXIT 1/4 LT": "EXIT", "PENTRATOR 1 LT": "PENTRATOR", "TOPAS 100 EC": "TOPAS",
        "BROCOLY BEANY X 5.000 SEMILLAS": "BROCOLY BEANY - 25.000 SEMILLAS"}

# lista -> producto existente (por nombre en la app)
EXISTENTES = {"ENGEO": "Engeo", "VOLIAM FLEXI": "Voliam Flexi", "SOLVIGO": "Solvigo", "NEEM-X 0.40 EC": "Neem X", "NINJA ZEON": "Ninja Zeon",
  "CURACRON": "Curacron", "FLECHA": "Flecha", "PYRIGRAN 20 GRMS": "Pyrigran", "BALA 55": "Bala", "TRYCLAN": "Tryclan", "ATTA-KILL": "Attakill",
  "MATABABOSA": "Matababosa", "THERON": "Theron", "FLORAMITE 500": "Floramite", "STARMITE": "Starmite", "OMITE - 30W": "Omite", "PHYTON": "Phyton",
  "DACONIL 720": "Daconil", "CODICOBRE": "Codicobre", "CALDO BORDELES 80 PM": "Caldo Bordeles", "KOCIDE 2000": "Kocide", "SCORE 250 EC": "Score",
  "UNIFORM": "Uniform", "ATAJO": "Atajo", "SICO": "Sico", "TILT 250 EC": "Tilt", "OVERSEAS": "Overseas", "MERTECT 500 SC": "Mertect",
  "INSPIRE GOLD": "Inspire Gold", "CARBOVAX": "Carbovax", "SIGRADO": "Sigrado", "KASUMIN 2 LIQ": "Kasumin", "TERRACLOR": "Terraclor", "APRECIO": "Aprecio",
  "TIRO FIJO": "Tiro Fijo", "GUADAÑA": "Guadaña", "ECUAMINA 720": "Ecuamina", "WINQUAT": "Winquat", "NICORONY": "Nicorony", "HORMONAGRO #1": "Hormonagro 1",
  "CYTOKIN": "Cytokin", "NEW GIBB-10%": "New Gibb", "SOL-U-GRO 12-48-8": "Solugro 12-48-8", "CUMPLIDOR": "Cumplidor", "RAYPHOS": "Rayphos",
  "ISABION": "Isabion", "NU - FILM - P": "Nu-Film P", "VAPOR GARD": "Vaporgard", "SILWET": "Silwet", "FIJAFIX PH": "Fijafix Ph",
  "INDICATE-5": "Indicate", "ALCAPLANT-NEW": "Alcaplant", "NUTRIQUIMICA TOMATE COSECHA": "Nutriq. Cosecha"}

# correcciones a productos existentes con la información nueva
CORRIGE = {"Omite": dict(concentracion="Propargite 30% (WP)" + REF, formulacion="polvo", unidad="g"),
           "Ecuamina": dict(concentracion="2,4-D amina 720 g/L (SL)")}

def P(nombre, cat, ia=None, conc=None, form=None, unidad="cc", dmin=None, dmax=None, dtexto=None, dha=None, carencia=None,
      reingreso=None, fuente=None, ref=False, nota=None, modo="tanque", control=None):
    return dict(nombre=nombre, categoria=cat, ingrediente_activo=ia, concentracion=(conc + REF if conc and ref else conc), formulacion=form,
                unidad=unidad, dosis_min=dmin, dosis_max=dmax, dosis_texto=dtexto, dha=dha, carencia_dias=carencia, reingreso_horas=reingreso,
                fuente=fuente, nota=nota, modo_aplicacion=modo, control=control)

C_IA = "Completar: ingrediente activo, concentración, dosis"
C_D = "Completar: dosis"
NUEVOS = {
 "ACIDO HUMICO 12%": P("Ácido Húmico 12%", "Bioestimulante", "ACIDOS HUMICOS", "Ácidos húmicos 12%", "liquido_foliar", fuente=F_REF, nota=C_D),
 "ACIDO HUMICO 75%": P("Ácido Húmico 75%", "Enmienda", "ACIDOS HUMICOS + FULVICOS", "Ácido húmico 75% mín + ácido fúlvico 12–14%", "granulado", "g", modo="suelo_ha",
                       dmin=220, dmax=330, dtexto="220 - 330 kg/ha", fuente=F_ED),
 "ACIERTO": P("Acierto", "Fungicida", "MANCOZEB + CIMOXANIL", "Mancozeb 640 g/kg + Cimoxanil 80 g/kg (WP)", "polvo", "g", dha=(2000, 2000),
              dtexto="2 kg/ha (etiqueta, rosa)", fuente=F_ED, nota=C_D + " por tanque"),
 "ACTARA 25 WG": P("Actara 25 WG", "Insecticida", "TIAMETOXAM", "Tiametoxam 250 g/kg (WG)", "polvo", "g", fuente=F_ED, nota=C_D),
 "ADENGO": P("Adengo", "Herbicida", "ISOXAFLUTOL + TIENCARBAZONA-METIL", "Isoxaflutol 225 g/L + Tiencarbazona-metil 90 g/L + Ciprosulfamida (SC)", "suspension",
             fuente=F_REF, ref=True, nota=C_D),
 "AFFIRM": P("Affirm", "Insecticida", "EMAMECTINA BENZOATO", "Emamectina benzoato 50 g/kg (SG)", "polvo", "g", dha=(150, 150), dtexto="0,15 kg/ha (maíz)",
             reingreso=12, fuente=F_ED, nota=C_D + " por tanque"),
 "AGRAL 90": P("Agral 90", "Coadyuvante", "NONILFENOL ETOXILADO", "Nonilfenol etoxilado 90%", "aceite_adherente", fuente=F_REF, ref=True, nota=C_D),
 "AGRESOR": P("Agresor", "Otros", nota=C_IA + ", categoría"),
 "AGRONITRÓGENO": P("Agronitrógeno", "Fertilizante foliar", "NITROGENO", form="liquido_foliar", nota="Completar: composición, dosis"),
 "AGROPOTASION": P("Agropotasion", "Fertilizante foliar", "POTASIO", form="liquido_foliar", nota="Completar: composición, dosis"),
 "ALGA-PLEX": P("Alga-Plex", "Bioestimulante", "EXTRACTO DE ALGAS", form="liquido_foliar", fuente=F_REF, nota="Completar: composición, dosis"),
 "ALGASOIL": P("Algasoil", "Bioestimulante", "EXTRACTO DE ALGAS", form="granulado", unidad="g", modo="suelo_ha", fuente=F_REF, nota="Completar: composición, dosis"),
 "ALTIMA": P("Altima", "Fungicida", "FLUAZINAM", "Fluazinam 500 g/L (SC)", "suspension", fuente=F_ED + " (ingrediente); concentración referencial", ref=True, nota=C_D),
 "ALTO": P("Alto 100 SL", "Fungicida", "CIPROCONAZOL", "Ciproconazol 100 g/L (SL)", "soluble", fuente=F_REF, ref=True, nota=C_D),
 "AMIGABLE": P("Amigable", "Otros", nota=C_IA + ", categoría"),
 "AQUABLAND": P("Aquabland", "Coadyuvante", form="corrector_ph", nota=C_IA),
 "AUDAX": P("Audax", "Otros", nota=C_IA + ", categoría"),
 "AVIRTUL": P("Avirtul", "Otros", nota=C_IA + ", categoría"),
 "AXANTA": P("Axanta", "Otros", nota=C_IA + ", categoría"),
 "AZUFRIN": P("Azufrín", "Fungicida preventivo", "AZUFRE", "Azufre 80% (WP)", "polvo", "g", fuente=F_REF, ref=True, nota=C_D),
 "BIO - TAC": P("Bio-Tac", "Otros", "POLIBUTENO", "Polibuteno 100% (adhesivo para trampas de insectos)", fuente=F_ED),
 "BIOSOLAR": P("Biosolar", "Bioestimulante", form="liquido_foliar", dmin=300, dmax=300, dtexto="1,5 cc/L (dosis general, foliar)", fuente=F_ED,
               nota="Completar: composición"),
 "BORO ZINC 10-10": P("Boro Zinc 10-10", "Fertilizante foliar", "BORO + ZINC", "B 10% + Zn 10%", "polvo", "g", fuente=F_REF, nota=C_D),
 "BROCOLY BEANY - 25.000 SEMILLAS": P("Semilla brócoli Beany", "Semilla", unidad="u"),
 "CALCIMEND GRANULADO": P("Calcimend granulado", "Enmienda", "SULFATO DE CALCIO DIHIDRATADO", "Sulfato de calcio dihidratado (yeso agrícola)", "granulado", "g",
                          modo="suelo_ha", fuente=F_REF, nota=C_D),
 "SULFATO DE CALCIO DIHIDRATADO CALCIMEND POLVO": P("Calcimend polvo", "Enmienda", "SULFATO DE CALCIO DIHIDRATADO", "Sulfato de calcio dihidratado (yeso agrícola)",
                          "polvo", "g", modo="suelo_ha", fuente=F_REF, nota=C_D),
 "CANPLITE": P("Canplite", "Otros", nota=C_IA + ", categoría"),
 "COGOLLERO": P("Cogollero", "Insecticida", "CIPERMETRINA", "Cipermetrina 200 g/L (EC)", "emulsion", dmin=120, dmax=120, dtexto="0,6 ml/L (maíz, gusano cogollero)",
                carencia=7, fuente=F_ED),
 "CONFORT": P("Confort", "Otros", nota=C_IA + ", categoría"),
 "CROP FINISHER 4-2-41": P("Crop Finisher 4-2-41", "Fertilizante foliar", "N-P-K + AZUFRE", "N 4% · P₂O₅ 2% · K₂O 41% + S 12,8%", "polvo", "g", fuente=F_ED, nota=C_D),
 "CUPROFIX EQ": P("Cuprofix EQ", "Fungicida preventivo", "MANCOZEB + COBRE", "Mancozeb 300 g/kg + Cobre 120 g/kg (WG)", "polvo", "g", fuente=F_ED, nota=C_D),
 "CYGRAN 20 GRMS": P("Cygran", "Insecticida", "CIPERMETRINA", "Cipermetrina (sobre 20 g)", "polvo", "g", fuente=F_REF, ref=True, nota="Completar: concentración, dosis"),
 "CYPERSUL": P("Cypersul", "Insecticida", "CIPERMETRINA", "Cipermetrina (EC)", "emulsion", fuente=F_ED + " (listado de insecticidas)", nota="Completar: concentración, dosis"),
 "DACOCIDA EQ": P("Dacocida EQ", "Herbicida", "2,4-D BUTIL ESTER", "2,4-D butil éster (EC)", "emulsion", fuente=F_ED, nota="Completar: concentración, dosis"),
 "DAMOCLES": P("Damocles", "Otros", nota=C_IA + ", categoría"),
 "DUAL GOLD 960 EC": P("Dual Gold 960 EC", "Herbicida", "S-METOLACLORO", "S-metolacloro 960 g/L (EC)", "emulsion", fuente=F_ED, nota=C_D),
 "ECUAFIX": P("Ecuafix", "Coadyuvante", "ETER FENOL POLIGLICOLICO", "Éter fenol poliglicólico", "aceite_adherente", dmin=100, dmax=100, dtexto="100 cc / 200 L", fuente=F_ED),
 "ETHREL 480 CE": P("Ethrel 480", "Bioestimulante", "ETEFON", "Etefón 480 g/L (SL)", "soluble", fuente=F_REF, ref=True, nota=C_D),
 "ETHYLBLOC (1.000 SACHETSX 2.5 GR)": P("Ethylbloc (1.000 sachets × 2,5 g)", "Otros", "1-METILCICLOPROPENO", "1-MCP en sachets (poscosecha)", unidad="u", fuente=F_REF),
 "EXIT": P("Exit", "Coadyuvante", "ESTERES METILADOS DE ACIDOS GRASOS", "Ésteres metilados de ácidos grasos 100%", "aceite_adherente", dmin=250, dmax=500,
           dtexto="250 - 500 cc / 200 L (uso general)", fuente=F_ED),
 "EXPRESS UNIVERSAL 300": P("Express Universal 300", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "FASCINATE 280 SL": P("Fascinate 280 SL", "Herbicida", "GLUFOSINATO DE AMONIO", "Glufosinato de amonio 280 g/L (SL)", "soluble", fuente=F_REF, ref=True, nota=C_D),
 "FOSTYL": P("Fostyl", "Fungicida", "FOSETIL ALUMINIO", "Fosetil aluminio 80% (WP)", "polvo", "g", fuente=F_ED, nota=C_D),
 "FURTIVE": P("Furtive", "Otros", nota=C_IA + ", categoría"),
 "GAIA": P("Gaia", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "GALIGAN 240 EC": P("Galigan 240 EC", "Herbicida", "OXIFLUORFEN", "Oxifluorfen 240 g/L (EC)", "emulsion", fuente=F_REF, ref=True, nota=C_D),
 "GENIUS AG": P("Genius AG", "Otros", nota=C_IA + ", categoría"),
 "GESAPRIM": P("Gesaprim 90 WG", "Herbicida", "ATRAZINA", "Atrazina 900 g/kg (WG)", "polvo", "g", fuente=F_REF, ref=True, nota=C_D),
 "GRAMOXONE": P("Gramoxone", "Herbicida", "PARAQUAT", "Paraquat 200 g/L (SL)", "soluble", fuente=F_REF, ref=True, nota=C_D),
 "GROW COMBI 1": P("Grow Combi 1", "Fertilizante foliar", "MICRONUTRIENTES", "Mg 5–9% · N 3% · B 0,5% · Cu 1,5% · Fe 4% + otros micronutrientes", "polvo", "g",
                   dmin=300, dmax=300, dtexto="1,5 g/L", fuente=F_ED),
 "HELIXADVA": P("Helix Adva", "Otros", nota=C_IA + ", categoría"),
 "HERBIZONA": P("Herbizona", "Herbicida", nota=C_IA),
 "HICURE": P("Hicure", "Bioestimulante", "AMINOACIDOS", form="liquido_foliar", fuente=F_REF, nota="Completar: composición, dosis"),
 "HORMONAGRO ANA": P("Hormonagro ANA", "Bioestimulante", "ACIDO NAFTALENACETICO", "Ácido naftalenacético (ANA)", "liquido_foliar", fuente=F_REF, ref=True,
                     nota="Completar: concentración, dosis"),
 "HYDRAFLOR 100": P("Hydraflor 100", "Otros", form="polvo", unidad="g", nota="Hidratante poscosecha de flores. Completar: composición"),
 "HYDRAFLOR CLEAR ULTRA 100": P("Hydraflor Clear Ultra 100", "Otros", nota="Hidratante poscosecha de flores. Completar: composición"),
 "INMORTAL": P("Inmortal", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "KAMSA": P("Kamsa 970 SG", "Insecticida", "ACEFATO", "Acefato 970 g/kg (SG)", "polvo", "g", dmin=500, dmax=500, dtexto="0,5 kg / 200 L (maíz, gusano cogollero)",
            fuente="Ficha técnica ADAMA Ecuador (reg. 35-I25/NA)"),
 "LANCHAFIN": P("Lanchafin", "Fungicida", "MANCOZEB + CIMOXANIL", "Mancozeb 640 g/kg + Cimoxanil 80 g/kg (WP)", "polvo", "g", fuente=F_ED, nota=C_D),
 "LAPO": P("Lapo", "Otros", nota=C_IA + ", categoría"),
 "MAGMA": P("Magma", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "MAINSPRING FLORA": P("Mainspring Flora", "Insecticida", "CIANTRANILIPROL", "Ciantraniliprol", "polvo", "g", fuente=F_REF, ref=True, nota="Completar: concentración, dosis"),
 "MATCH": P("Match", "Insecticida", "LUFENURON", "Lufenurón 50 g/L (EC)", "emulsion", fuente=F_REF, ref=True, nota=C_D),
 "MAXFUN": P("Maxfun", "Otros", nota=C_IA + ", categoría"),
 "METRINEX 50 EQ": P("Metrinex 50 EQ", "Otros", nota=C_IA + ", categoría"),
 "MICORA FLORA": P("Micora Flora", "Fungicida", "MANDIPROPAMID", "Mandipropamid (SC)", "suspension", fuente=F_REF, ref=True, nota="Completar: concentración, dosis"),
 "NEWBT 2X": P("New BT 2X", "Insecticida", "BACILLUS THURINGIENSIS", "Bacillus thuringiensis (insecticida biológico)", "polvo", "g",
               fuente=F_ED + " (listado de insecticidas biológicos)", nota="Completar: concentración, dosis"),
 "NEWFOL BORO": P("Newfol Boro", "Fertilizante foliar", "BORO", form="liquido_foliar", nota="Completar: composición, dosis"),
 "NEWFOL PLUS": P("Newfol Plus", "Fertilizante foliar", form="polvo", unidad="g", nota="Completar: composición, dosis"),
 "NEWGIBB 90% PS": P("New Gibb 90% PS", "Bioestimulante", "GIBERELINAS", "Ácido giberélico 90% (PS)", "polvo", "g", fuente=F_REF, nota=C_D),
 "NUTRI LEAF 20-20-20": P("Nutri-Leaf 20-20-20", "Fertilizante foliar", "N-P-K + MICRONUTRIENTES", "N 20% · P₂O₅ 20% · K₂O 20% + micronutrientes", "polvo", "g",
                          fuente=F_REF, nota=C_D),
 "NUTRIQUIMICA TOMATE FLORACION": P("Nutriquímica Tomate Floración", "Fertilizante edáfico", unidad="g", form="granulado", modo="suelo_ha",
                                    nota="Completar: composición, dosis"),
 "NUTRIQUIMICA TOMATE TRANSPLANTE": P("Nutriquímica Tomate Transplante", "Fertilizante edáfico", unidad="g", form="granulado", modo="suelo_ha",
                                      nota="Completar: composición, dosis"),
 "PALYSTRA DUO": P("Palystra Duo", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "PATADA": P("Patada", "Otros", nota=C_IA + ", categoría"),
 "PENTRATOR": P("Pentrator", "Coadyuvante", form="aceite_adherente", nota=C_IA),
 "PICATINA FLORA": P("Picatina Flora", "Fungicida", "PIDIFLUMETOFEN + FLUDIOXONIL", "Pidiflumetofen + Fludioxonil (SC)", "suspension", fuente=F_ED,
                     nota="Completar: concentración, dosis"),
 "PIMIENTO MARIELLE X 1000 SEMILLAS -SOBRE": P("Semilla pimiento Marielle (1.000 semillas)", "Semilla", unidad="u"),
 "PIMIENTO SHITARA X 1.000 SEMILLAS- SOBRE": P("Semilla pimiento Shitara (1.000 semillas)", "Semilla", unidad="u"),
 "PLENTRIX": P("Plentrix", "Fungicida", "AZOXISTROBINA + MEFENOXAM", "Azoxistrobina 28,2% + Mefenoxam 10,9% (SE)", "suspension",
               fuente="Etiqueta EPA (Syngenta); verificar etiqueta de Ecuador", ref=True, nota=C_D),
 "POLO 500": P("Polo 500", "Insecticida", "DIAFENTIURON", "Diafentiurón 500 g/L (SC)", "suspension", fuente=F_ED + " (ingrediente); concentración por nombre", ref=True, nota=C_D),
 "PRIORI ZTRA": P("Priori Xtra", "Fungicida", "AZOXISTROBINA + CIPROCONAZOL", "Azoxistrobina 200 g/L + Ciproconazol 80 g/L (SC)", "suspension", fuente=F_REF, ref=True, nota=C_D),
 "PUÑETE": P("Puñete", "Insecticida", "CLORPIRIFOS", "Clorpirifos (EC)", "emulsion", fuente=F_ED,
             nota="⚠ Contiene clorpirifos: en mayo de 2026 Agrocalidad prohibió su importación y registro en Ecuador. Verifica si aún puede recomendarse. Completar: concentración, dosis"),
 "QUADRIS 50 WG": P("Quadris 50 WG", "Fungicida", "AZOXISTROBINA", "Azoxistrobina 500 g/kg (WG)", "polvo", "g", dha=(400, 400), dtexto="400 g/ha (drench, brócoli)",
                    fuente=F_ED, nota=C_D + " por tanque"),
 "QUADRIS TOP": P("Quadris Top", "Fungicida", "AZOXISTROBINA + DIFENOCONAZOL", "Azoxistrobina 200 g/L + Difenoconazol 125 g/L (SC)", "suspension", fuente=F_ED, nota=C_D),
 "QUEEN": P("Queen", "Otros", nota=C_IA + ", categoría"),
 "QUICK DIP": P("Quick Dip", "Otros", nota=C_IA + ", categoría"),
 "REFLECT": P("Reflect", "Fungicida", "ISOPYRAZAM", "Isopyrazam 125 g/L (EC)", "emulsion", fuente=F_REF, ref=True, nota=C_D),
 "REVUS": P("Revus", "Fungicida", "MANDIPROPAMID", "Mandipropamid 250 g/L (SC)", "suspension", fuente=F_ED, nota=C_D),
 "REVUS OPTI": P("Revus Opti", "Fungicida", "MANDIPROPAMID + CLOROTALONIL", "Mandipropamid + Clorotalonil (SC)", "suspension", fuente=F_REF, ref=True,
                 nota="Completar: concentración, dosis"),
 "RIDOMIL GOLD": P("Ridomil Gold", "Fungicida", "MANCOZEB + METALAXIL-M", "Mancozeb 640 g/kg + Metalaxil-M 40 g/kg (WP)", "polvo", "g", fuente=F_ED, nota=C_D),
 "RIFIT": P("Rifit", "Herbicida", "PRETILACLORO", "Pretilacloro 500 g/L (EC)", "emulsion", fuente=F_REF, ref=True, nota=C_D),
 "RUNS": P("Runs", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "SEAROOT": P("Searoot", "Bioestimulante", "EXTRACTO DE ALGAS", form="polvo", unidad="g", fuente=F_REF, nota="Completar: composición, dosis"),
 "SEAWEED EXTRACT": P("Seaweed Extract", "Bioestimulante", "EXTRACTO DE ALGAS", form="liquido_foliar", fuente=F_REF, nota="Completar: composición, dosis"),
 "SEEKER": P("Seeker", "Fungicida", "FENPROPIDINA", "Fenpropidina (EC)", "emulsion", fuente="Ficha técnica Syngenta Ecuador (reg. 152-F1/NA)", nota="Completar: concentración, dosis"),
 "THIOPRON": P("Thiopron", "Fungicida preventivo", "AZUFRE", "Azufre 825 g/L (SC)", "suspension", fuente=F_REF, ref=True, nota=C_D),
 "SOLEI CAO 20": P("Solei CaO 20", "Fertilizante foliar", "CALCIO", "CaO 20%", "liquido_foliar", fuente=F_REF, nota=C_D),
 "SOLEI K 44 NT": P("Solei K 44 NT", "Fertilizante foliar", "POTASIO", "K₂O 44%", "liquido_foliar", fuente=F_REF, nota=C_D),
 "SOIL ACTIVATOR": P("Soil Activator", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "SOLIDARIDAD": P("Solidaridad", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "SOLVIT": P("Solvit", "Fungicida", "PENCONAZOL + FENPROPIDINA", "Penconazol 50 g/L + Fenpropidina (EW)", "emulsion",
             fuente="Etiqueta Solvit (Syngenta, SAG Chile); verificar etiqueta de Ecuador", nota="Completar: concentración de fenpropidina, dosis"),
 "SOPLETE": P("Soplete", "Otros", nota=C_IA + ", categoría"),
 "SUGAR EXPRESS 4-10-40": P("Sugar Express 4-10-40", "Fertilizante foliar", "N-P-K", "N 4% · P₂O₅ 10% · K₂O 40%", "polvo", "g", fuente=F_REF, nota=C_D),
 "SUNJET": P("Sunjet", "Fungicida", "ISOPYRAZAM", "Isopyrazam 125 g/L (EC)", "emulsion", fuente=F_ED, nota=C_D),
 "TASPA": P("Taspa", "Fungicida", "DIFENOCONAZOL + PROPICONAZOL", "Difenoconazol 250 g/L + Propiconazol 250 g/L (EC)", "emulsion", fuente=F_REF, ref=True, nota=C_D),
 "TERRAZOLE": P("Terrazole", "Desinfección de suelo", "ETRIDIAZOL", "Etridiazol 35% (WP)", "polvo", "g", fuente=F_REF, ref=True, nota=C_D),
 "TOMATE CHARLESTON - 2500 SEMILLAS": P("Semilla tomate Charleston (2.500 semillas)", "Semilla", unidad="u"),
 "TOMATE EL PAYE X 1000 SEMILLAS - SOBRE": P("Semilla tomate El Paye (1.000 semillas)", "Semilla", unidad="u"),
 "TOMATE PETROS X 1000 SEMILLAS - SOBRE": P("Semilla tomate Petros (1.000 semillas)", "Semilla", unidad="u"),
 "TOMATE TORRY": P("Semilla tomate Torry", "Semilla", unidad="u"),
 "TOMATE VENTO X 1.000 SEMILLAS": P("Semilla tomate Vento (1.000 semillas)", "Semilla", unidad="u"),
 "TOPAS": P("Topas 100 EC", "Fungicida", "PENCONAZOL", "Penconazol 100 g/L (EC)", "emulsion", fuente=F_REF, ref=True, nota=C_D),
 "TRANSPORT CARE PAPER FDA. X 200 LAMINAS": P("Transport Care Paper (200 láminas)", "Otros", unidad="u", nota="Papel para poscosecha / transporte."),
 "TRICAR 90WDG": P("Tricar 90 WDG", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "TRIGARD 75 WP": P("Trigard 75 WP", "Insecticida", "CIROMAZINA", "Ciromazina 750 g/kg (WP)", "polvo", "g", fuente=F_REF, ref=True, nota=C_D),
 "TRIZIMAN D": P("Triziman D", "Fungicida preventivo", "MANCOZEB", "Mancozeb 800 g/kg (WP)", "polvo", "g", carencia=7, fuente=F_ED, nota=C_D),
 "TROYA": P("Troya", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "FOGATA": P("Fogata", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "TUTAN": P("Tutan", "Otros", nota=C_IA + ", categoría"),
 "VERTIMEC 1.8": P("Vertimec 1.8", "Acaricida", "ABAMECTINA", "Abamectina 18 g/L (EC)", "emulsion", dha=(600, 600), dtexto="0,6 L/ha (rosa, ácaros)", reingreso=24,
                   fuente=F_ED, nota=C_D + " por tanque"),
 "VIGORIZADOR 30-10-10": P("Vigorizador 30-10-10", "Fertilizante foliar", "N-P-K", "N 30% · P₂O₅ 10% · K₂O 10%", "polvo", "g", fuente=F_REF, nota=C_D),
 "VITAFOL 10-20-30 ECUAFOL": P("Vitafol 10-20-30", "Fertilizante foliar", "N-P-K", "N 10% · P₂O₅ 20% · K₂O 30% + Mg 0,5% + S 1%", "polvo", "g", fuente=F_ED, nota=C_D),
 "VITAFOL 10-40-10 ECUAFOL": P("Vitafol 10-40-10", "Fertilizante foliar", "N-P-K", "N 10% · P₂O₅ 40% · K₂O 10% + Mg 0,5% + S 1%", "polvo", "g", fuente=F_ED, nota=C_D),
 "VITAFOL 20-20-20 ECUAFOL": P("Vitafol 20-20-20", "Fertilizante foliar", "N-P-K", "N 20% · P₂O₅ 20% · K₂O 20% + Mg 0,5% + S 1%", "polvo", "g", fuente=F_ED, nota=C_D),
 "VITAFOL 30-10-10 ECUAFOL": P("Vitafol 30-10-10", "Fertilizante foliar", "N-P-K", "N 30% · P₂O₅ 10% · K₂O 10% + Mg 0,5% + S 1%", "polvo", "g", fuente=F_ED, nota=C_D),
 "VOLATON AG": P("Volaton AG", "Insecticida", "FOXIM", "Foxim", "polvo", "g", fuente=F_REF, ref=True, nota="Completar: concentración, dosis"),
 "VYKENDA": P("Vykenda", "Insecticida", "ISOCICLOSERAM", "Isocicloseram", "suspension", fuente="Syngenta / ANLA Colombia (isocicloseram, IRAC 30)",
              nota="Completar: concentración, dosis"),
 "WELGRO": P("Welgro", "Otros", unidad="g", nota=C_IA + ", categoría"),
 "RADIFARM": P("Radifarm", "Bioestimulante", form="liquido_foliar", fuente=F_REF, nota="Bioestimulante radicular. Completar: composición, dosis"),
 "CALBIT": P("Calbit", "Fertilizante foliar", "CALCIO", form="liquido_foliar", fuente=F_REF, nota="Completar: composición, dosis"),
 "MEGAFOL": P("Megafol", "Bioestimulante", "AMINOACIDOS", form="liquido_foliar", fuente=F_REF, nota="Completar: composición, dosis"),
 "QUMIR": P("Qumir", "Otros", nota=C_IA + ", categoría"),
 "AGROD PRODUCCION": P("Agrod Producción", "Fertilizante edáfico", form="granulado", unidad="g", modo="suelo_ha", nota="Completar: composición, dosis"),
 "AGROD ELCOS INICIO": P("Agrod Elcos Inicio", "Fertilizante edáfico", form="granulado", unidad="g", modo="suelo_ha", nota="Completar: composición, dosis"),
 "AGRIMEC 84": P("Agrimec 84", "Acaricida", "ABAMECTINA", "Abamectina 84 g/L", "emulsion", fuente=F_REF, ref=True, nota="Completar: concentración, dosis"),
}

cat = json.load(open(CAT))
prods = cat["productos"]
por_nombre = {p["nombre"]: p for p in prods}
sig_id = max(p["id"] for p in prods) + 1

def presentaciones(nombre_lista, unidad):
    filas = []
    for nl in [nombre_lista] + [k for k, v in UNIR.items() if v == nombre_lista]:
        for emp, precio in lista.get(nl, []):
            emp2 = FIX_EMPAQUE.get((nl, emp, precio)) or FIX_EMPAQUE.get((nl, emp)) or emp
            cant, uni = parse_pres(emp2, unidad)
            if cant is None: print("  ! no entiendo empaque:", nl, emp); continue
            if uni != "u" and cant > LIM[uni]: continue
            m = re.search(r"([\d.]+)\s*SEMILLAS", nl)
            etiqueta = (m.group(1) + " SEMILLAS") if uni == "u" and m else emp2.upper()
            filas.append({"codigo": None, "empaque": etiqueta, "cantidad": round(cant, 1), "unidad": uni, "precio": precio})
    filas.sort(key=lambda x: x["cantidad"])
    return filas

def poner_precio(p, pres):
    p["presentaciones"] = pres
    if not pres: return
    ref = next((x for x in pres if x["cantidad"] == 1000.0), None) or min(pres, key=lambda x: abs(x["cantidad"] - 1000))
    if p.get("modo_aplicacion") == "suelo_ha" or p["categoria"] in ("Enmienda", "Fertilizante edáfico"):
        ref = max(pres, key=lambda x: x["cantidad"])
    p["pvp"], p["contenido"], p["contenido_unidad"], p["presentacion"] = ref["precio"], ref["cantidad"], ref["unidad"], ref["empaque"]
    if p.get("unidad") in ("cc", "g") and all(x["unidad"] == "g" for x in pres): p["unidad"] = "g"
    fuente = re.sub(r"\s*\|\s*Precios y presentaciones:[^|]*", "", p.get("fuente") or "")
    fuente = re.sub(r"\s*\|\s*No figura en la lista[^|]*", "", fuente)
    p["fuente"] = (fuente + " | " + PRECIOS).strip(" |")

vistos = set()
for nl in lista:
    if nl in UNIR: continue
    if nl in EXISTENTES:
        p = por_nombre[EXISTENTES[nl]]
        for k, v in CORRIGE.get(p["nombre"], {}).items(): p[k] = v
        poner_precio(p, presentaciones(nl, p.get("unidad") or "cc")); vistos.add(p["id"]); continue
    d = NUEVOS.get(nl)
    if not d: print("  ! sin datos para:", nl); continue
    dha = d.pop("dha")
    p = {"id": sig_id, "nombre": d["nombre"], "ingrediente_activo": d["ingrediente_activo"], "grupo": None, "categoria": d["categoria"],
         "formulacion": d["formulacion"] or ("polvo" if d["unidad"] == "g" else "liquido"), "modo_aplicacion": d["modo_aplicacion"],
         "dosis_min": d["dosis_min"], "dosis_max": d["dosis_max"],
         "unidad": "kg/ha" if d["modo_aplicacion"] == "suelo_ha" and d["dosis_min"] else (d["unidad"] if d["unidad"] != "u" else None),
         "dosis_texto": d["dosis_texto"], "presentacion": None, "contenido": None, "contenido_unidad": None, "pvp": None,
         "control": d["control"], "carencia_dias": d["carencia_dias"], "reingreso_horas": d["reingreso_horas"], "categoria_tox": None,
         "nota": d["nota"], "fuente": (d["fuente"] or "Sin ficha técnica encontrada"), "presentaciones": [],
         "dosis_ha_min": dha[0] if dha else None, "dosis_ha_max": dha[1] if dha else None, "activo": True, "concentracion": d["concentracion"]}
    poner_precio(p, presentaciones(nl, d["unidad"]))
    if p["unidad"] in (None,) and p["categoria"] == "Semilla": p["unidad"] = None
    prods.append(p); sig_id += 1

for p in prods:
    if p["id"] <= 59 and p["id"] not in vistos and "No figura en la lista de noviembre 2026" not in (p.get("fuente") or ""):
        p["fuente"] = (p.get("fuente") or "") + " | No figura en la lista de noviembre 2026: se mantiene el precio anterior."
cat["version"] = cat.get("version", 8) + 1
json.dump(cat, open(CAT, "w"), ensure_ascii=False, indent=1)
print(len(prods), "productos;", len([p for p in prods if p["id"] > 59]), "nuevos; sin lista nueva:", [p["nombre"] for p in prods if p["id"] <= 59 and p["id"] not in vistos])

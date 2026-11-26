"""Genera supabase/seed.sql a partir de data/catalogo-inicial.json"""
import json, sys
cat = json.load(open(sys.argv[1]))
out = open(sys.argv[2], "w")

def lit(v):
    if v is None: return "null"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return repr(v)
    if isinstance(v, (dict, list)): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"

COLS = {
    "cultivos": ["id", "nombre", "activo", "orden"],
    "etapas": ["id", "cultivo_id", "nombre", "uso", "semanas", "riesgo_hongos", "notas", "costo_ref_texto", "orden"],
    "productos": ["id", "nombre", "ingrediente_activo", "grupo", "categoria", "formulacion", "modo_aplicacion", "dosis_min",
                  "dosis_max", "unidad", "dosis_texto", "presentacion", "contenido", "contenido_unidad", "pvp", "control",
                  "carencia_dias", "reingreso_horas", "categoria_tox", "nota", "fuente", "presentaciones", "dosis_ha_min", "dosis_ha_max", "concentracion", "activo", "no_sugerir"],
    "problemas": ["id", "cultivo_id", "tipo", "nombre", "descripcion", "orden", "fuente", "fotos", "clasificacion", "como_actua"],
    "recomendaciones": ["id", "problema_id", "producto_id", "etapa_id", "prioridad", "dosis_min", "dosis_max", "nota"],
    "plan_sanitario": ["id", "etapa_id", "producto_id", "dosis_tanque", "unidad", "alternar", "orden"],
    "plan_fertilizacion": ["id", "cultivo_id", "etapa_id", "tipo", "producto_id", "dosis_kg_ha", "dosis_g_planta", "dosis_tanque",
                           "frecuencia_dias", "condicion", "nota", "orden"],
    "compatibilidad": ["id", "producto_a", "producto_b", "nivel", "nota"],
}
out.write("-- AgroDosis · datos iniciales (portafolio Ecuaquímica para pitahaya + plan sanitario)\n")
out.write("-- Ejecutar UNA sola vez, después de schema.sql.\nbegin;\n")
for t, cols in COLS.items():
    rows = cat[t]
    if not rows: continue
    out.write(f"\ninsert into {t} ({', '.join(cols)}) values\n")
    out.write(",\n".join("  (" + ", ".join(lit(r.get(c)) for c in cols) + ")" for r in rows) + ";\n")
    if t != "cultivos":
        out.write(f"select setval(pg_get_serial_sequence('{t}', 'id'), (select max(id) from {t}));\n")
out.write("\ninsert into ajustes (clave, valor) values\n")
out.write(",\n".join(f"  ({lit(k)}, {lit(v) if isinstance(v,(dict,list)) else lit(json.dumps(v, ensure_ascii=False))}::jsonb)" for k, v in cat["ajustes"].items()) + ";\n")
out.write("\nselect publicar_catalogo();\ncommit;\n")

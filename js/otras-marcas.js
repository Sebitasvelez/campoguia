/* Productos de otras marcas (no son del portafolio) y grupo químico por ingrediente activo.
   Sirve para la asesoría rápida: si el agricultor aplicó un producto de otra marca, la app sabe su grupo
   FRAC / IRAC y evita repetirlo. Los que el agricultor agrega se guardan en la base (otros_productos). */
(function (g) {
  "use strict";
  // ingrediente activo → grupo (FRAC fungicidas, IRAC insecticidas/acaricidas, HRAC herbicidas)
  const IA = {
    // FRAC
    "mancozeb": "FRAC M03", "maneb": "FRAC M03", "propineb": "FRAC M03", "metiram": "FRAC M03", "zineb": "FRAC M03", "ziram": "FRAC M03", "thiram": "FRAC M03", "tiram": "FRAC M03",
    "clorotalonil": "FRAC M05", "chlorothalonil": "FRAC M05", "captan": "FRAC M04", "folpet": "FRAC M04", "azufre": "FRAC M02", "sulfur": "FRAC M02",
    "cobre": "FRAC M01", "oxicloruro": "FRAC M01", "hidroxido de cobre": "FRAC M01", "sulfato de cobre": "FRAC M01", "oxido cuproso": "FRAC M01",
    "difenoconazol": "FRAC 3", "propiconazol": "FRAC 3", "tebuconazol": "FRAC 3", "epoxiconazol": "FRAC 3", "ciproconazol": "FRAC 3", "cyproconazol": "FRAC 3",
    "hexaconazol": "FRAC 3", "flutriafol": "FRAC 3", "triadimenol": "FRAC 3", "triadimefon": "FRAC 3", "flusilazol": "FRAC 3", "metconazol": "FRAC 3", "protioconazol": "FRAC 3", "prothioconazol": "FRAC 3",
    "tetraconazol": "FRAC 3", "miclobutanil": "FRAC 3", "penconazol": "FRAC 3", "procloraz": "FRAC 3", "prochloraz": "FRAC 3", "imazalil": "FRAC 3", "bromuconazol": "FRAC 3", "fenbuconazol": "FRAC 3", "mefentrifluconazol": "FRAC 3",
    "azoxistrobin": "FRAC 11", "pyraclostrobin": "FRAC 11", "piraclostrobin": "FRAC 11", "trifloxistrobin": "FRAC 11", "kresoxim": "FRAC 11", "picoxistrobin": "FRAC 11", "fluoxastrobin": "FRAC 11", "famoxadona": "FRAC 11",
    "metalaxil": "FRAC 4", "mefenoxam": "FRAC 4", "benalaxil": "FRAC 4",
    "boscalid": "FRAC 7", "fluopyram": "FRAC 7", "fluxapiroxad": "FRAC 7", "fluxapyroxad": "FRAC 7", "bixafen": "FRAC 7", "isopirazam": "FRAC 7", "pidiflumetofen": "FRAC 7", "carboxin": "FRAC 7", "flutolanil": "FRAC 7", "penflufen": "FRAC 7", "sedaxano": "FRAC 7",
    "carbendazim": "FRAC 1", "benomil": "FRAC 1", "benomyl": "FRAC 1", "tiabendazol": "FRAC 1", "tiofanato": "FRAC 1", "thiophanate": "FRAC 1",
    "cimoxanil": "FRAC 27", "cymoxanil": "FRAC 27", "dimetomorf": "FRAC 40", "dimethomorph": "FRAC 40", "mandipropamid": "FRAC 40", "iprovalicarb": "FRAC 40", "bentiavalicarb": "FRAC 40",
    "propamocarb": "FRAC 28", "fosetil": "FRAC P07", "fosfito": "FRAC P07", "fosfonato": "FRAC P07", "acido fosforoso": "FRAC P07",
    "fluopicolide": "FRAC 43", "oxatiapiprolina": "FRAC 49", "ametoctradina": "FRAC 45", "ciazofamida": "FRAC 21", "cyazofamid": "FRAC 21", "amisulbrom": "FRAC 21",
    "fluazinam": "FRAC 29", "iprodiona": "FRAC 2", "iprodione": "FRAC 2", "procimidona": "FRAC 2", "fludioxonil": "FRAC 12", "ciprodinil": "FRAC 9", "cyprodinil": "FRAC 9", "pirimetanil": "FRAC 9", "pyrimethanil": "FRAC 9",
    "fenhexamida": "FRAC 17", "fenhexamid": "FRAC 17", "pencicuron": "FRAC 20", "pencycuron": "FRAC 20", "validamicina": "FRAC U18", "kasugamicina": "FRAC 24", "estreptomicina": "FRAC 25", "oxitetraciclina": "FRAC 41",
    "quintozeno": "FRAC 14", "pentacloronitrobenceno": "FRAC 14", "tolclofos": "FRAC 14", "himexazol": "FRAC 32", "hymexazol": "FRAC 32", "spiroxamina": "FRAC 5", "fenpropimorf": "FRAC 5", "tridemorf": "FRAC 5",
    "quinoxifen": "FRAC 13", "metrafenona": "FRAC 50", "ciflufenamid": "FRAC U06", "zoxamida": "FRAC 22", "fenamidona": "FRAC 11", "acibenzolar": "FRAC P01",
    "bacillus subtilis": "FRAC BM02", "bacillus amyloliquefaciens": "FRAC BM02", "trichoderma": "FRAC BM02",
    // IRAC
    "clorpirifos": "IRAC 1B", "chlorpyrifos": "IRAC 1B", "profenofos": "IRAC 1B", "diazinon": "IRAC 1B", "malation": "IRAC 1B", "malathion": "IRAC 1B", "dimetoato": "IRAC 1B", "acefato": "IRAC 1B", "metamidofos": "IRAC 1B", "etoprofos": "IRAC 1B", "terbufos": "IRAC 1B", "fenamifos": "IRAC 1B", "triclorfon": "IRAC 1B", "metil paration": "IRAC 1B",
    "carbofuran": "IRAC 1A", "carbaril": "IRAC 1A", "metomil": "IRAC 1A", "methomyl": "IRAC 1A", "tiodicarb": "IRAC 1A", "oxamil": "IRAC 1A", "carbosulfan": "IRAC 1A",
    "cipermetrina": "IRAC 3A", "cypermethrin": "IRAC 3A", "lambdacialotrina": "IRAC 3A", "lambda cihalotrina": "IRAC 3A", "lambda cyhalothrin": "IRAC 3A", "deltametrina": "IRAC 3A", "bifentrina": "IRAC 3A", "permetrina": "IRAC 3A",
    "alfacipermetrina": "IRAC 3A", "zetacipermetrina": "IRAC 3A", "betaciflutrina": "IRAC 3A", "ciflutrina": "IRAC 3A", "fenvalerato": "IRAC 3A", "esfenvalerato": "IRAC 3A", "fenpropatrin": "IRAC 3A", "teflutrina": "IRAC 3A", "gamma cihalotrina": "IRAC 3A",
    "imidacloprid": "IRAC 4A", "tiametoxam": "IRAC 4A", "thiamethoxam": "IRAC 4A", "acetamiprid": "IRAC 4A", "clotianidina": "IRAC 4A", "dinotefuran": "IRAC 4A", "tiacloprid": "IRAC 4A", "sulfoxaflor": "IRAC 4C", "flupiradifurona": "IRAC 4D",
    "spinosad": "IRAC 5", "spinetoram": "IRAC 5", "abamectina": "IRAC 6", "abamectin": "IRAC 6", "emamectina": "IRAC 6", "milbemectina": "IRAC 6", "lepimectina": "IRAC 6",
    "piriproxifen": "IRAC 7C", "fenoxicarb": "IRAC 7B", "pimetrozina": "IRAC 9B", "flonicamid": "IRAC 29", "clofentezina": "IRAC 10A", "hexitiazox": "IRAC 10A", "etoxazol": "IRAC 10B",
    "bacillus thuringiensis": "IRAC 11A", "diafentiuron": "IRAC 12A", "propargite": "IRAC 12C", "tetradifon": "IRAC 12D", "clorfenapir": "IRAC 13", "sulfluramida": "IRAC 13", "cartap": "IRAC 14", "tiociclam": "IRAC 14", "thiocyclam": "IRAC 14",
    "lufenuron": "IRAC 15", "novaluron": "IRAC 15", "teflubenzuron": "IRAC 15", "triflumuron": "IRAC 15", "diflubenzuron": "IRAC 15", "flufenoxuron": "IRAC 15", "buprofezin": "IRAC 16", "ciromazina": "IRAC 17",
    "metoxifenozida": "IRAC 18", "tebufenozida": "IRAC 18", "amitraz": "IRAC 19", "bifenazate": "IRAC 20D", "acequinocil": "IRAC 20B", "fenpiroximato": "IRAC 21A", "piridaben": "IRAC 21A", "tebufenpirad": "IRAC 21A", "fenazaquin": "IRAC 21A",
    "indoxacarb": "IRAC 22A", "metaflumizona": "IRAC 22B", "spirotetramat": "IRAC 23", "spiromesifen": "IRAC 23", "spirodiclofen": "IRAC 23", "cienopirafen": "IRAC 25A", "cyenopyrafen": "IRAC 25A", "ciflumetofen": "IRAC 25A",
    "clorantraniliprol": "IRAC 28", "chlorantraniliprole": "IRAC 28", "ciantraniliprol": "IRAC 28", "flubendiamida": "IRAC 28", "ciclaniliprol": "IRAC 28", "fipronil": "IRAC 2B", "endosulfan": "IRAC 2A",
    "azadiractina": "IRAC UN", "azadirachtina": "IRAC UN", "neem": "IRAC UN", "beauveria": "IRAC UNF", "metarhizium": "IRAC UNF", "fluensulfona": "IRAC N-UN", "fluopyram nematicida": "IRAC N-3",
    // HRAC
    "glifosato": "HRAC 9", "glyphosate": "HRAC 9", "glufosinato": "HRAC 10", "paraquat": "HRAC 22", "diquat": "HRAC 22", "2 4 d": "HRAC 4", "2,4-d": "HRAC 4", "2 4d": "HRAC 4", "picloram": "HRAC 4", "triclopir": "HRAC 4", "fluroxipir": "HRAC 4", "dicamba": "HRAC 4", "aminopiralid": "HRAC 4",
    "atrazina": "HRAC 5", "ametrina": "HRAC 5", "diuron": "HRAC 5", "propanil": "HRAC 5", "metribuzina": "HRAC 5", "nicosulfuron": "HRAC 2", "metsulfuron": "HRAC 2", "bispiribac": "HRAC 2", "imazetapir": "HRAC 2", "halosulfuron": "HRAC 2",
    "oxifluorfen": "HRAC 14", "fomesafen": "HRAC 14", "saflufenacil": "HRAC 14", "pendimetalina": "HRAC 3", "metolaclor": "HRAC 15", "fluazifop": "HRAC 1", "cletodim": "HRAC 1", "haloxifop": "HRAC 1", "quizalofop": "HRAC 1", "isoxaflutol": "HRAC 27", "mesotriona": "HRAC 27", "clomazona": "HRAC 13", "bentazona": "HRAC 6",
  };
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ph/g, "f").replace(/th/g, "t").replace(/y/g, "i").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const CLAVES = Object.keys(IA).map((k) => ({ k: norm(k), g: IA[k] })).sort((a, b) => b.k.length - a.k.length);

  // «Mancozeb + Cimoxanil» → «FRAC M03 + 27»; «Imidacloprid + Ciflutrina» → «IRAC 4A + 3A»; vacío si no se conoce
  function grupoDeIA(ia) {
    const partes = String(ia || "").split(/\+|\/|;|,(?!\s*\d)|\by\b/i).map(norm).filter(Boolean), por = {};
    partes.forEach((p) => {
      const c = CLAVES.find((x) => p.includes(x.k) || (x.k.length >= 6 && x.k.includes(p) && p.length >= 6)); if (!c) return;
      const [pre, cod] = c.g.split(" "); por[pre] = por[pre] || []; if (!por[pre].includes(cod)) por[pre].push(cod);
    });
    return ["FRAC", "IRAC", "HRAC"].filter((p) => por[p]).map((p) => p + " " + por[p].join(" + ")).join(" · ");
  }
  const catDeGrupo = (gr) => /FRAC/.test(gr) ? "Fungicida" : /IRAC/.test(gr) ? "Insecticida" : /HRAC/.test(gr) ? "Herbicida" : "";

  // marcas comerciales frecuentes en el campo ecuatoriano que no están en el portafolio
  const LISTA = [
    ["Antracol", "Propineb", "Bayer"], ["Folicur", "Tebuconazol", "Bayer"], ["Silvacur", "Tebuconazol + Triadimenol", "Bayer"], ["Nativo", "Trifloxistrobin + Tebuconazol", "Bayer"],
    ["Luna Experience", "Fluopyram + Tebuconazol", "Bayer"], ["Previcur Energy", "Propamocarb + Fosetil", "Bayer"], ["Infinito", "Fluopicolide + Propamocarb", "Bayer"], ["Flint", "Trifloxistrobin", "Bayer"],
    ["Confidor", "Imidacloprid", "Bayer"], ["Decis", "Deltametrina", "Bayer"], ["Movento", "Spirotetramat", "Bayer"], ["Oberon", "Spiromesifen", "Bayer"], ["Belt", "Flubendiamida", "Bayer"], ["Sivanto", "Flupiradifurona", "Bayer"], ["Monceren", "Pencicuron", "Bayer"],
    ["Cabrio", "Piraclostrobin", "BASF"], ["Comet", "Piraclostrobin", "BASF"], ["Opera", "Piraclostrobin + Epoxiconazol", "BASF"], ["Bellis", "Boscalid + Piraclostrobin", "BASF"], ["Cantus", "Boscalid", "BASF"],
    ["Polyram", "Metiram", "BASF"], ["Forum", "Dimetomorf", "BASF"], ["Acrobat", "Dimetomorf + Mancozeb", "BASF"], ["Orkestra", "Fluxapiroxad + Piraclostrobin", "BASF"], ["Fastac", "Alfacipermetrina", "BASF"], ["Regent", "Fipronil", "BASF"], ["Basagran", "Bentazona", "BASF"],
    ["Dithane", "Mancozeb", "Corteva"], ["Curzate", "Cimoxanil + Mancozeb", "Corteva"], ["Lorsban", "Clorpirifos", "Corteva"], ["Exalt", "Spinetoram", "Corteva"], ["Success", "Spinosad", "Corteva"], ["Tracer", "Spinosad", "Corteva"], ["Tordon", "Picloram + 2,4-D", "Corteva"], ["Galant", "Haloxifop", "Corteva"],
    ["Coragen", "Clorantraniliprol", "FMC"], ["Benevia", "Ciantraniliprol", "FMC"], ["Talstar", "Bifentrina", "FMC"], ["Furadan", "Carbofuran", "FMC"], ["Rovral", "Iprodiona", "FMC"],
    ["Manzate", "Mancozeb", "UPL"], ["Mancozeb", "Mancozeb", ""], ["Oxicloruro de cobre", "Oxicloruro de cobre", ""], ["Cupravit", "Oxicloruro de cobre", ""], ["Benomil", "Benomil", ""], ["Carbendazim", "Carbendazim", ""], ["Derosal", "Carbendazim", ""], ["Bavistin", "Carbendazim", ""],
    ["Cymoxanil", "Cimoxanil + Mancozeb", ""], ["Phostrol", "Fosfito de potasio", ""], ["Aliette", "Fosetil aluminio", "Bayer"], ["Bumper", "Propiconazol", "Adama"], ["Orius", "Tebuconazol", "Adama"], ["Mospilan", "Acetamiprid", ""], ["Rescate", "Acetamiprid", ""],
    ["Cipermetrina", "Cipermetrina", ""], ["Clorpirifos", "Clorpirifos", ""], ["Malathion", "Malation", ""], ["Dimetoato", "Dimetoato", ""], ["Lannate", "Metomil", "Corteva"], ["Sevin", "Carbaril", ""], ["Mocap", "Etoprofos", ""], ["Counter", "Terbufos", ""],
    ["Abamectina", "Abamectina", ""], ["Proclaim", "Emamectina benzoato", ""], ["Imidacloprid", "Imidacloprid", ""], ["Thiodan", "Endosulfan", ""], ["Kumulus", "Azufre", "BASF"], ["Sulfocop", "Azufre + Cobre", ""], ["Validacin", "Validamicina", ""], ["Agry-gent", "Estreptomicina + Oxitetraciclina", ""],
    ["Roundup", "Glifosato", "Bayer"], ["Glifosato", "Glifosato", ""], ["Paraquat", "Paraquat", ""], ["Amina 2,4-D", "2,4-D", ""], ["Gesapax", "Ametrina", ""], ["Karmex", "Diuron", ""], ["Basta", "Glufosinato de amonio", "BASF"],
  ];
  const OTRAS = LISTA.map(([nombre, ia, empresa]) => { const grupo = grupoDeIA(ia); return { id: "o:" + norm(nombre), nombre, ingrediente_activo: ia.toUpperCase(), grupo, categoria: catDeGrupo(grupo), empresa, otra_marca: true }; });

  g.OtrasMarcas = { grupoDeIA, catDeGrupo, norm, lista: OTRAS };
})(typeof window !== "undefined" ? window : globalThis);

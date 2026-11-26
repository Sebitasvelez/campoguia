# CampoGuía: guía de instalación

CampoGuía es una app web que se instala en el celular. Funciona sin internet y trae:

- **App del agricultor** (`index.html`): manual técnico por cultivo (plagas, enfermedades, malezas y nutrición con sus productos), plan sanitario por fase, plan de fertilización por etapa; dosis por bomba o tanque; calculadora para la finca; mezclas; plan sanitario; plan de fertilización; lotes y registros con costos; alertas de carencia y recordatorios.
- **Panel del administrador** (`admin.html`): aquí editas toda la información técnica, la publicas a la app, ves a los agricultores y sus registros, y exportas a Excel.

La información inicial sale de tus archivos *Lista de productos EQ para pitahaya* y *Plan sanitario EQ*.

---

## Qué necesitas (todo gratis)

1. Una cuenta en **Supabase** (https://supabase.com). Es la base de datos donde se guardan los usuarios, los registros y el catálogo.
2. Un lugar donde publicar la app. Elige uno:
   - **GitHub Pages**: necesitas una cuenta en https://github.com.
   - **Netlify Drop**: arrastras la carpeta a https://app.netlify.com/drop y listo.

Tiempo aproximado: 20 a 30 minutos, una sola vez.

---

## Paso 1. Crear la base de datos en Supabase

1. Entra a https://supabase.com, crea tu cuenta y pulsa **New project**.
   - Nombre: `campoguia`
   - Región: la más cercana (por ejemplo *South America (São Paulo)*).
   - Anota la contraseña de la base de datos en un lugar seguro.
2. Cuando el proyecto esté listo, abre **SQL Editor**, luego **New query**.
3. Copia todo el contenido de `supabase/schema.sql`, pégalo y pulsa **Run**. Debe decir *Success*. Esto también crea la carpeta pública **fotos** (Storage) donde se guardan las fotografías del manual. Si actualizas una base que ya tenías, vuelve a correr `schema.sql`: agrega lo nuevo sin borrar datos.
4. Después corre `supabase/seguridad.sql` (ingreso con cédula + celular, límite de intentos, sesiones que caducan). Siempre va **después** de `schema.sql`.
4. Abre otra **New query**, pega todo el contenido de `supabase/seed.sql` y pulsa **Run**. Con esto se cargan los 59 productos, los problemas, el plan sanitario y el plan de fertilización inicial, y se publica la **versión 1**.

## Paso 2. Crear tu usuario de administrador

1. En Supabase ve a **Authentication**, luego **Users**, luego **Add user**, y elige **Create new user**.
   - Correo: el tuyo (por ejemplo `tu-correo@ejemplo.com`).
   - Contraseña: una segura.
   - Marca **Auto Confirm User**.
2. Vuelve a **SQL Editor** y ejecuta esto, cambiando el correo si usaste otro:

   ```sql
   insert into admins (user_id, nombre)
   select id, 'Sebastián' from auth.users where email = 'tu-correo@ejemplo.com';
   ```

   Si más adelante quieres otro administrador (por ejemplo un técnico de confianza), repite los dos pasos con su correo.

## Paso 3. Conectar la app con tu base de datos

1. En Supabase ve a **Project Settings**, luego **API** (o **Data API**).
2. Copia el **Project URL** y la clave **anon public**.
3. Abre el archivo `js/config.js` con el Bloc de notas y pega los dos valores entre las comillas:

   ```js
   window.AGRODOSIS_CONFIG = {
     SUPABASE_URL: "https://xxxxxxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi...",
   };
   ```

   La clave *anon* puede ir en la app sin problema: la base de datos tiene reglas que solo permiten a cada agricultor ver lo suyo, y solo tú editas el catálogo. **Nunca** pegues ahí la clave `service_role`.

## Paso 4. Publicar la app

**Opción A: Netlify Drop (la más fácil)**

1. Entra a https://app.netlify.com/drop (te pedirá crear una cuenta gratis).
2. Arrastra la carpeta completa de la app a la página.
3. Te da un link, por ejemplo `https://campoguia-123.netlify.app`. En *Site configuration* puedes cambiar el nombre.

**Opción B: GitHub Pages**

1. En GitHub crea un repositorio nuevo, por ejemplo `campoguia`. Para usar Pages gratis tiene que ser público.
2. Pulsa **Add file**, luego **Upload files**, arrastra todo el contenido de la carpeta y pulsa **Commit changes**.
3. Ve a **Settings**, luego **Pages**. En *Source* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y pulsa **Save**.
4. En uno o dos minutos la app queda en `https://TU-USUARIO.github.io/campoguia/`.

> Si el repositorio es público, cualquiera puede ver el código y el catálogo inicial, incluidos los precios. Los datos de los agricultores **no** quedan ahí: se guardan en Supabase.

## Paso 5. Probar

1. Abre `TU-LINK/admin.html` e ingresa con tu correo y contraseña.
2. En **Ajustes de la app** revisa tu WhatsApp (ya viene tu número: https://wa.me/+593988763749) y pulsa **Publicar a la app**.
3. En tu celular abre `TU-LINK` y crea una cuenta de prueba.
4. Para instalarla en el celular:
   - **Android (Chrome):** menú ⋮, luego **Instalar app** o **Agregar a pantalla principal**.
   - **iPhone (Safari):** botón Compartir, luego **Agregar a inicio**.

Comparte con tus agricultores solo el link principal. El panel de administración es para ti.

---

## Cómo funciona la actualización de información

1. En el panel editas productos, recomendaciones, planes, compatibilidad o ajustes. Esos cambios quedan como **borrador**.
2. Pulsas **Publicar a la app**, y se crea una versión nueva (2, 3, 4…).
3. Cada celular revisa si hay versión nueva al abrir la app, cuando recupera señal y cada 5 minutos. Si la hay, la descarga y la guarda para usarla sin internet. El agricultor ve el aviso «Tu asesor actualizó la información técnica».

Para cargar muchos productos de una vez: en **Productos** usa **Exportar Excel**, edita el archivo y súbelo con **Importar Excel**. Los productos se reconocen por su `id` o por su nombre.

## Presentaciones y precios (lista oficial Ecuaquímica, octubre 2025)

- Cada producto trae sus presentaciones reales de la lista **LISTA AGRO ÚNICA octubre 2025** (código, envase, contenido y precio de venta). Solo se incluyen envases de hasta 20 L o 50 kg; los tambores quedan fuera.
- Para la lista de compra, la app elige la combinación de envases **más barata** que cubre lo que se necesita. Si otra combinación con menos envases cuesta como máximo un 5 % más, prefiere esa.
- El **costo por tanque o bomba** se calcula con el precio por cc o gramo de la presentación de 1 L o 1 kg (o la más cercana).
- Productos que no están en la lista y mantienen el precio del Excel inicial: Omite, Terraclor, Caldolomita y Nutriq. Cosecha. Revísalos en el panel.
- Los precios son el «P. venta» de la lista; confirma si incluyen IVA.
- Para actualizar precios cuando salga una lista nueva: en **Productos**, botón **Actualizar precios (lista Excel)**. Sube la lista en Excel y los precios se actualizan por código de producto. También puedes editar las presentaciones a mano dentro de cada producto.

## Sin internet

- La app y la información técnica quedan guardadas en el teléfono después de la primera vez que se abre con señal.
- Los lotes y registros que el agricultor guarda sin señal se envían solos cuando vuelve a tener conexión.
- Para **crear la cuenta** y para **ingresar en un teléfono nuevo** sí se necesita internet.

## Cuentas de los agricultores

- Para **crear la cuenta** se piden: cédula, nombres, celular, **provincia**, **sector del cultivo**, cultivo principal, hectáreas y si es agricultor o técnico agrícola (ser técnico agrícola requiere aprobación del administrador desde «Agricultores y registros»; desde «Mi cuenta» se puede pedir el cambio o volver a agricultor). Se necesita internet.
- La cédula se valida con el dígito verificador ecuatoriano para evitar errores de digitación. Una cédula = una cuenta.
- **Ubicación de la finca (opcional):** si el agricultor está en la finca, toca «Estoy en mi finca: guardar ubicación» y la app guarda el punto GPS. Se puede hacer al crear la cuenta o después desde «Mi cuenta». El GPS funciona sin internet, pero para guardar el punto en «Mi cuenta» sí hace falta señal. En el panel ves el punto en Google Maps, y sale también en el Excel.
- Para **ingresar** solo se pide el **número de cédula**. Es lo más fácil para el agricultor. Ten en cuenta que quien conozca la cédula de alguien podría entrar a su cuenta. Si más adelante quieres más seguridad, se puede agregar un PIN.
- Desde el panel puedes **desactivar** una cuenta (sección Agricultores).
- **Ubicación de cada lote (opcional):** al crear o editar un lote, el agricultor puede tocar «Estoy en el lote: guardar ubicación» parado dentro del lote. El GPS funciona sin internet y el punto se envía cuando hay señal. En el panel, en cada agricultor, ves «Ver lote en el mapa», y el Excel trae la latitud y longitud de cada lote.

## Fotografías del manual

- En el panel, **Problemas por cultivo** → abre un tema → **Fotografías referenciales**.
- **+ Subir fotos** acepta varias a la vez desde la computadora o el celular. La app las reduce (máximo 1280 px) antes de subirlas para que carguen rápido en el campo.
- También puedes **pegar el enlace https** de una foto que ya esté en internet.
- Escribe el crédito de cada foto (por ejemplo «Foto: finca en Tarqui»), ordénalas con ↑ (la primera es la portada) y quita las que no sirvan con ✕. Luego **Guardar** y **Publicar a la app**.
- El agricultor ve la portada en la lista del manual y todas las fotos al abrir el tema; puede tocarlas para verlas en grande. Las fotos se guardan en el teléfono cuando hay señal, para verlas luego sin internet.
- Usa fotos propias de tus visitas de campo o con permiso de su autor.
- En la versión de demostración las fotos quedan solo en ese navegador y caben pocas (unas 20).

## Datos completados con fuentes de internet (revísalos)

Lo que faltaba en tus archivos se completó con fichas técnicas y manuales públicos. En el panel, cada dato completado tiene su **fuente** y aparece con la etiqueta «Dato de internet». En la app el agricultor ve el aviso «Carencia y reingreso referenciales: confírmalos en la etiqueta».

- **Formulación, categoría toxicológica, reingreso y carencia** de 15 productos: Engeo, Curacron, Ninja Zeon, Flecha, Daconil, Phyton, Kocide, Score, Tilt, Uniform, Mertect, Kasumin, Floramite, Bala y Pyrigran. Fuentes: fichas de Ecuaquímica y Syngenta Ecuador, Vademécum Agrícola Edifarm, ADAMA Ecuador y etiquetas registradas en otros países.
- **Carencias que siguen faltando:** la mayoría de etiquetas no traen carencia para pitahaya. Solo se cargó un valor donde había un dato publicado (Daconil, 14 días en cacao; Phyton, sin carencia). En el resto la app muestra «Ver etiqueta». Complétalas con las etiquetas que tienes en el almacén.
- **Compatibilidad:** se agregaron 7 reglas de las fichas técnicas. Daconil no se mezcla con aceites (Vaporgard, Nu-Film). Score, Sico, Inspire Gold y Mertect no se mezclan con caldo bordelés. Curacron va con precaución junto a Kocide.
- **Cacao:** 8 temas sugeridos desde manuales técnicos de cacao (ICA Colombia, CATIE y guía PNUD Ecuador): monilia, escoba de bruja, mazorca negra, chinche Monalonion, hormigas, malezas, suelo ácido y floración. Usan productos de tu portafolio, así que confirma las dosis para cacao.
- **Fertilización:** sobre nutrición de pitahaya hay poca investigación publicada en Ecuador, así que el plan sigue usando las dosis de tu portafolio (línea Soli: 3 sacos/ha). Ajusta g/planta y frecuencias en el panel.

⚠ **Clorpirifos:** en mayo de 2026 Agrocalidad prohibió la importación y el registro del clorpirifos. Lo contienen **Bala** y **Pyrigran**. Bala está en el plan sanitario (fase Brotación). La app muestra el aviso; decide en el panel si los desactivas.

## Datos que conviene completar en el panel

- Días de carencia, horas de reingreso y categoría toxicológica de los productos que aún dicen «Ver etiqueta».
- Productos con datos incompletos: Voliam Flexi, Pyrigran, Starmite, Carbovax y Sigrado.
- Formulación (SC, EC, SL, WG…) de los líquidos que siguen como «Líquido (sin definir)».
- Plan sanitario para cacao.
- En Ajustes: los litros de agua por hectárea y las plantas por bomba.

## Supuestos usados

- La columna «DOSIS cc ó gr/tanque» del Excel se tomó como **por tanque de 200 L**. La bomba de 20 L usa una décima parte.
- «3 sacos en mezcla/ha» (línea Soli) se tomó como 150 kg/ha de cada producto.
- Riesgo de sarna según los colores del plan: Brotación bajo, Desarrollo de flor ligero, Apertura y cuajado alto, Fructificación ligero, Engrose bajo.
- Fases de pitahaya: el plan sanitario usa las 5 fases de tu Excel (Brotación a Engrose). El plan de fertilización usa 4 etapas: Establecimiento / siembra, Desarrollo de pencas, Floración y Engrose. En el panel, cada etapa dice si es «sanitario», «fertilización» o «ambos».

Todo se puede cambiar desde el panel.

## Archivos

```
index.html            App del agricultor
admin.html            Panel del administrador
js/config.js          ← aquí van tus datos de Supabase
js/app.js             Pantallas del agricultor
js/admin.js           Panel
js/data.js            Conexión, modo sin internet y sincronización
js/logic.js           Cálculos de dosis, sacos, mezcla y costos
data/catalogo-inicial.json   Catálogo inicial (también se usa en el modo demostración)
supabase/schema.sql   Estructura de la base de datos
supabase/seguridad.sql  Refuerzo de seguridad (correr después de schema.sql)
supabase/seed.sql     Datos iniciales
sw.js, manifest.webmanifest, icons/   Instalación y uso sin internet
```

Si `js/config.js` está vacío, la app funciona en **modo demostración**: todo se guarda solo en ese equipo. Sirve para probarla sin crear nada.

## Regenerar el catálogo inicial (para desarrolladores)

```
python3 scripts/build_catalog.py <Excel productos> <Excel plan> data/catalogo-inicial.json
python3 scripts/agregar_lista_nov2026.py <LISTA_PRODUCTOS_ECUAQUIMICA.xlsx> data/catalogo-inicial.json
python3 scripts/otros_lista_agro.py data/catalogo-inicial.json   # quita semillas y completa "Otros" con la Lista Agro Única
python3 scripts/clasificacion_problemas.py data/catalogo-inicial.json   # aparato bucal / clase del hongo de plagas y enfermedades
python3 scripts/alternativas_recomendaciones.py data/catalogo-inicial.json   # opción recomendada + 4 alternativas ordenadas por eficiencia
python3 scripts/fertilizantes_actual.py LISTA_FERTILIZANTES_ACTUAL.xlsx data/catalogo-inicial.json   # fertilizantes edáficos (nov 2026)
node scripts/aplicar_grupos.js .   # grupos IRAC/FRAC/HRAC según ingrediente activo
python3 scripts/build_seed.py data/catalogo-inicial.json supabase/seed.sql
```

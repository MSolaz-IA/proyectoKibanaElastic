# 📚 Buscador y Gestor de Libros con Elasticsearch

Este proyecto es una aplicación web de página única (SPA) desarrollada con HTML, CSS y JavaScript (Vanilla) que interactúa directamente con una instancia de **Elasticsearch**. Permite realizar búsquedas avanzadas sobre un catálogo de libros utilizando *Search Templates* y gestionar los datos (CRUD) mediante búsquedas por ISBN y actualizaciones en tiempo real.

## 🚀 Características Principales

* **Búsquedas Avanzadas:** Interfaz para buscar libros por Título, Autor, Año de Publicación (por rango) o Editorial (con lógica de inclusión/exclusión).
* **Búsqueda Global:** Búsqueda *full-text* simultánea en todos los campos utilizando la consulta `multi_match` con tolerancia a errores de tipo (`lenient`).
* **Search Templates:** Uso de plantillas Mustache almacenadas en el clúster de Elasticsearch para optimizar, parametrizar y asegurar las consultas.
* **Edición de Documentos:** Recuperación de libros por su identificador único (ISBN), extracción de su `_id` interno y actualización de sus campos directamente en el servidor mediante la API `_update`.
* **Despliegue Contenerizado:** Infraestructura gestionada a través de Docker y Docker Compose para garantizar la reproducibilidad del entorno.

## 🛠️ Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (Fetch API).
* **Backend / Motor de Búsqueda:** Elasticsearch (v8.x).
* **Herramientas de desarrollo:** Kibana (Dev Tools) para la ingesta de datos, creación de pipelines, mappings y plantillas.
* **Infraestructura:** Docker & Docker Compose.

---

## 📁 Estructura del Proyecto

Se recomienda mantener la siguiente estructura para el correcto funcionamiento y despliegue:

```text
📁 proyecto_elasticsearch/
 ├── 📄 docker-compose.yml      # Configuración de contenedores (Elasticsearch + Kibana)
 ├── 📄 buscador.html           # Interfaz web de la aplicación
 ├── 📄 README.md               # Documentación del proyecto
 ├── 📁 datos/
 │    └── 📄 libros.csv         # Dataset original con la información de los libros
 └── 📁 setup_elastic/
      ├── 📄 1_pipeline.json    # Script para procesar los datos en la ingesta
      ├── 📄 2_mapping.json     # Definición estricta de los tipos de datos del índice
      └── 📄 3_templates.json   # Las 5 plantillas Mustache de búsqueda
```

---

## 🐳 Despliegue con Docker

Este proyecto incluye la configuración necesaria para levantar el entorno completo usando contenedores.

  1. Abre una terminal en la raíz del proyecto.
  2. Ejecuta el comando para levantar Elasticsearch y Kibana en segundo plano:
        docker-compose up -d
  3. Espera unos minutos a que los servicios estén activos.

Elasticsearch estará disponible en: http://localhost:9200
Kibana estará disponible en: http://localhost:5601


---

## 🌐 Configuración de CORS (¡Muy Importante!)

Como el frontend (navegador) hace peticiones directamente al servidor de Elasticsearch desde un origen distinto, es estrictamente necesario habilitar CORS para evitar bloqueos de seguridad.

  1. Accede al contenedor de Elasticsearch o a su archivo elasticsearch.yml (ubicado en /usr/share/elasticsearch/config/).
  2. Añade las siguientes líneas al final del archivo:
        http.cors.enabled: true
        http.cors.allow-origin: "*"
  3. Reinicia el contenedor o servicio de Elasticsearch para aplicar los cambios.

---

## 🗄️ Ingesta de Datos y Configuración en Kibana

Para que el buscador funcione correctamente y respete los tipos de datos (como el Año de Publicación), es vital preparar el índice antes de cargar el archivo CSV. Abre la consola de Kibana (Dev Tools) y sigue este orden utilizando los archivos de la carpeta setup_elastic/:

  1. Crear el Pipeline (1_pipeline.json): Ejecuta el script para crear el pipeline de ingesta que limpiará y formateará los campos del CSV (ej. convertir años a formato numérico).

  2. Crear el Mapping (2_mapping.json): Crea el índice (por defecto libros-intento1) definiendo estrictamente los tipos de datos (text, keyword, integer, etc.).

  3. Carga de Datos (CSV): * Ve a la interfaz principal de Kibana > Upload a file.

        Selecciona el archivo datos/libros.csv.

        En la configuración de importación (Advanced), asegúrate de indicarle que vuelque los datos en el índice creado en el paso 2 y que aplique el pipeline creado en el paso 1.

  4. Registrar Search Templates (3_templates.json): Ejecuta los scripts PUT _scripts/template_... para registrar las plantillas Mustache que consumirá la aplicación web.

--- 

## 📖 Uso de la Aplicación Web

Al ser una aplicación basada puramente en frontend estático sin dependencias de Node.js:

  Abre el archivo buscador.html directamente en tu navegador web preferido (doble clic) o utiliza un servidor local como Live Server en VS Code.
  Para buscar: Selecciona el criterio en el menú desplegable, rellena el campo dinámico y haz clic en "Enviar consulta". Los resultados se renderizarán en tarjetas y podrás desplegar el JSON crudo de respuesta.
  Para modificar: En la sección inferior, introduce un ISBN válido y busca el libro. Si existe, el formulario se rellenará automáticamente. Modifica los campos necesarios y pulsa "Actualizar Datos". Si vuelves a buscar el libro arriba, verás    los cambios reflejados.

---

## 👤 Autor

  [Maria Solaz Chávez ] - Práctica Evaluada de Elasticsearch
  

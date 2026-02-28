// ==========================================
// 1. CONFIGURACIÓN Y ESTADO
// ==========================================
const Config = {
    resultadosPorPagina: 10,
    estadoPaginacion: {
        paginaActual: 1,
        totalResultados: 0
    },
    ultimaBusqueda: null, // ¡NUEVO! Guardará los parámetros exactos de la consulta actual
    getBaseUrl: () => {
        const indice = document.getElementById('nombre-indice').value || 'libros';
        return `http://localhost:9200/${indice}`;
    }
};

// ==========================================
// 2. SERVICIO DE API (Llamadas a Elasticsearch)
// ==========================================
const API = {
    async fetchElastic(endpoint, method, body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) options.body = JSON.stringify(body);
        
        const response = await fetch(`${Config.getBaseUrl()}${endpoint}`, options);
        return await response.json();
    },

    async buscarPorTemplate(bodyData) {
        return await this.fetchElastic('/_search/template', 'POST', bodyData);
    },

    async buscarPorISBN(isbn) {
        const query = { query: { match: { isbn } } };
        return await this.fetchElastic('/_search', 'POST', query);
    },

    async actualizarDocumento(docId, datosActualizados) {
        return await this.fetchElastic(`/_update/${docId}`, 'POST', datosActualizados);
    }
};

// ==========================================
// 3. CONTROLADOR DE INTERFAZ DE USUARIO (UI)
// ==========================================
const UI = {
    getVal: (id) => document.getElementById(id).value,
    setVal: (id, val) => document.getElementById(id).value = val,
    getText: (id) => document.getElementById(id).textContent,
    setText: (id, text) => document.getElementById(id).textContent = text,
    show: (id) => document.getElementById(id).classList.add('visible'),
    hide: (id) => document.getElementById(id).classList.remove('visible'),
    setStyle: (id, prop, val) => document.getElementById(id).style[prop] = val,

    cambiarInputs() {
        document.querySelectorAll('.input-group').forEach(el => el.classList.remove('active'));
        const seleccion = UI.getVal('tipoBusqueda');
        document.getElementById(`input-${seleccion}`).classList.add('active');
    },

    mostrarMensaje(id, mensaje, color) {
        const el = document.getElementById(id);
        el.textContent = mensaje;
        el.style.color = color;
        el.hidden = false;
    },

    renderizarResultados(data) {
        UI.setText('jsonCrudo', JSON.stringify(data, null, 2));
        const resultadosDiv = document.getElementById('resultados');
        resultadosDiv.innerHTML = '';
        resultadosDiv.classList.add('grid-2-cols'); 

        if (data.hits && data.hits.hits.length > 0) {
            data.hits.hits.forEach(hit => {
                const src = hit._source;
                
                // 1. Cogemos la URL original
                let urlImagen = src.image_URL_M || 'https://via.placeholder.com/300x450?text=Sin+Imagen';
                
                // 2. MAGIA: Reemplazamos http:// por https:// para evitar el Mixed Content
                urlImagen = urlImagen.replace('http://', 'https://');

                resultadosDiv.innerHTML += `
                    <div class="result-item">
                        <div>
                            <strong>${src.titulo || 'Sin título'}</strong><br>
                            🧔 ${src.autor || 'N/A'}<br>
                            📅 ${src.anyoPublicacion || 'N/A'} | 🏢 ${src.editorial || 'N/A'}<br>
                            📖 ISBN: ${src.isbn || 'N/A'}
                        </div>
                        <button class="btn-portada" data-img="${urlImagen}" data-titulo="${src.titulo || 'Sin título'}">
                            🖼️ Ver Portada
                        </button>
                    </div>
                `;
            });
        } else {
            resultadosDiv.innerHTML = '<p style="color:red;">No se encontraron libros en esta página.</p>';
            resultadosDiv.classList.remove('grid-2-cols');
        }
    },

    actualizarControlesPaginacion() {
        const totalPaginas = Math.ceil(Config.estadoPaginacion.totalResultados / Config.resultadosPorPagina);
        const paginaActual = Config.estadoPaginacion.paginaActual;

        UI.setText('pagina-actual', paginaActual);
        UI.setText('total-paginas', totalPaginas);

        UI.setStyle('controles-paginacion', 'display', totalPaginas > 1 ? 'flex' : 'none');
        document.getElementById('btn-anterior').disabled = paginaActual === 1;
        document.getElementById('btn-siguiente').disabled = paginaActual >= totalPaginas;
    }
};

// ==========================================
// 4. LÓGICA DE LA APLICACIÓN
// ==========================================
const App = {
    // Esta función se ejecuta solo al darle al botón "Buscar", capturando los inputs actuales
    prepararNuevaBusqueda() {
        const tipo = UI.getVal('tipoBusqueda');
        const templates = {
            all:       { id: "template_libros_multiple", params: { termino_busqueda: UI.getVal('val-all') } },
            title:     { id: "template_libro_titulo", params: { titulo: UI.getVal('val-title') } },
            author:    { id: "template_libro_autor", params: { autor: UI.getVal('val-author') } },
            year:      { id: "template_libro_anyoPublicacion", params: { anio_desde: UI.getVal('val-year-desde'), anio_hasta: UI.getVal('val-year-hasta') } },
            publisher: { id: "template_libro_editorial", params: { editorial_incluir: UI.getVal('val-pub-inc'), editorial_excluir: UI.getVal('val-pub-exc') } }
        };

        // Guardamos la configuración base en el estado
        Config.ultimaBusqueda = templates[tipo];
        
        if (Config.ultimaBusqueda) {
            this.buscarPaginada(1); // Arrancamos siempre en la página 1
        }
    },

    // Esta función la consumen tanto el botón buscar como los botones de Siguiente/Anterior
    async buscarPaginada(pagina) {
        if (!Config.ultimaBusqueda) return;

        try {
            const offset = (pagina - 1) * Config.resultadosPorPagina;
            
            // Hacemos una copia profunda de la última búsqueda para no sobreescribir la original
            const bodyData = JSON.parse(JSON.stringify(Config.ultimaBusqueda));
            
            // Inyectamos explícitamente los parámetros de paginación
            bodyData.params.size = Config.resultadosPorPagina; // Ej: 10
            bodyData.params.from = offset;                     // Ej: 10 (para la pag. 2)

            const data = await API.buscarPorTemplate(bodyData);

            UI.show('container-resultados-busqueda');
            UI.hide('container-editar-libro');
            UI.renderizarResultados(data);

            if (data.hits) {
                // Manejamos diferencias de versión de Elasticsearch (objeto vs numérico)
                Config.estadoPaginacion.totalResultados = typeof data.hits.total === 'object' ? data.hits.total.value : data.hits.total;
                Config.estadoPaginacion.paginaActual = pagina;
                UI.actualizarControlesPaginacion();
            }
        } catch (error) {
            UI.setText('jsonCrudo', "Error: " + error.message);
        }
    },

    async buscarPorISBN() {
        const isbnBuscado = UI.getVal('search-isbn');
        if (!isbnBuscado) return UI.mostrarMensaje('msg-busqueda', 'Por favor, introduce un ISBN', 'orange');

        try {
            const data = await API.buscarPorISBN(isbnBuscado);
            UI.hide('container-resultados-busqueda');
            UI.setText('msg-actualizacion', ''); 

            if (data.hits && data.hits.hits.length > 0) {
                const libro = data.hits.hits[0];
                const src = libro._source;

                UI.setVal('edit-doc-id', libro._id);
                UI.setVal('edit-isbn', src.isbn || isbnBuscado);
                UI.setVal('edit-title', src.titulo || '');
                UI.setVal('edit-author', src.autor || '');
                UI.setVal('edit-year', src.anyoPublicacion || '');
                UI.setVal('edit-publisher', src.editorial || '');

                UI.mostrarMensaje('msg-busqueda', '✅ Libro encontrado. Ya puedes editarlo.', 'green');
                UI.setStyle('formulario-edicion', 'display', 'block');
                UI.show('container-editar-libro');
            } else {
                UI.mostrarMensaje('msg-busqueda', '❌ No se encontró ningún libro con ese ISBN.', 'red');
                UI.setStyle('formulario-edicion', 'display', 'none');
                UI.hide('container-editar-libro');
            }
        } catch (error) {
            console.error("Error al buscar ISBN:", error);
            UI.mostrarMensaje('msg-busqueda', '❌ Error de conexión al buscar.', 'red');
        }
    },

    async actualizarLibro() {
        const docId = UI.getVal('edit-doc-id');
        const datosActualizados = {
            doc: {
                titulo: UI.getVal('edit-title'),
                autor: UI.getVal('edit-author'),
                anyoPublicacion: Number(UI.getVal('edit-year')),
                editorial: UI.getVal('edit-publisher')
            }
        };

        try {
            const data = await API.actualizarDocumento(docId, datosActualizados);

            if (data.result === "updated" || data.result === "noop") {
                UI.mostrarMensaje('msg-actualizacion', "🎉 ¡Datos actualizados correctamente en Elasticsearch!", "green");
                setTimeout(() => {
                    UI.hide('container-editar-libro');
                    document.getElementById('msg-busqueda').hidden = true;
                }, 2000);
            } else {
                UI.mostrarMensaje('msg-actualizacion', "⚠️ Hubo un problema al actualizar: " + JSON.stringify(data), "orange");
            }
        } catch (error) {
            console.error("Error al actualizar:", error);
            UI.mostrarMensaje('msg-actualizacion', "❌ Error de conexión al actualizar.", "red");
        }
    },

    verPortada(urlImagen, titulo) {
        const wrapper = document.getElementById('wrapper-resultados-portada');
        const colPortada = document.getElementById('columna-portada');
        const imgPortada = document.getElementById('img-portada');
        
        // Animamos el CSS para contraer la lista y mostrar la portada
        wrapper.classList.add('mostrar-portada');
        colPortada.classList.remove('oculto');
        UI.setText('titulo-portada', titulo);
        
        // Cargamos la imagen directamente desde la URL de tu base de datos
        imgPortada.src = urlImagen;
    },

    cerrarPortada() {
        const wrapper = document.getElementById('wrapper-resultados-portada');
        const colPortada = document.getElementById('columna-portada');
        
        wrapper.classList.remove('mostrar-portada');
        colPortada.classList.add('oculto');
    },

    inicializarEventos() {
        document.getElementById('tipoBusqueda').addEventListener('change', UI.cambiarInputs);
        
        // ¡Ojo! Aquí cambiamos para que invoque a prepararNuevaBusqueda
        document.getElementById('btn-buscar').addEventListener('click', () => this.prepararNuevaBusqueda());
        
        document.getElementById('btn-anterior').addEventListener('click', () => {
            if (Config.estadoPaginacion.paginaActual > 1) {
                this.buscarPaginada(Config.estadoPaginacion.paginaActual - 1);
            }
        });

        document.getElementById('btn-siguiente').addEventListener('click', () => {
            const totalPaginas = Math.ceil(Config.estadoPaginacion.totalResultados / Config.resultadosPorPagina);
            if (Config.estadoPaginacion.paginaActual < totalPaginas) {
                this.buscarPaginada(Config.estadoPaginacion.paginaActual + 1);
            }
        });

        document.getElementById('btn-buscar-isbn').addEventListener('click', () => this.buscarPorISBN());
        document.getElementById('btn-actualizar').addEventListener('click', () => this.actualizarLibro());
    }
};

// ==========================================
// 5. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    App.inicializarEventos();
});

// Delegación de eventos para los botones "Ver Portada"
        document.getElementById('resultados').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-portada')) {
                const urlImagen = e.target.getAttribute('data-img');
                const titulo = e.target.getAttribute('data-titulo');
                
                // Usamos App directo en lugar de this para no perder el contexto
                App.verPortada(urlImagen, titulo);
            }
        });

        // Evento para cerrar el panel
        document.getElementById('btn-cerrar-portada').addEventListener('click', () => {
            // Usamos App directo en lugar de this
            App.cerrarPortada();
        });
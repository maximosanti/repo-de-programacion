// ---------- CONFIGURACIÓN DEL BACKEND ----------
// Si tu carpeta backend-php quedó con otro nombre o ruta, ajustá esta línea.
const API_URL = "http://localhost/backend-php";

// Caché en memoria de las evaluaciones del usuario logueado.
// Se recarga desde la base de datos cada vez que algo cambia.
let datosCompletos = [];
let idEditando = null;

// ---------- INICIALIZACIÓN ----------
window.onload = async function() {
    let temaGuardado = localStorage.getItem("tema");
    if (temaGuardado === "light") {
        document.body.setAttribute("data-theme", "light");
    }

    let usuarioId = localStorage.getItem("usuarioId");
    let correo = localStorage.getItem("correo");

    if (usuarioId) {
        mostrarAgenda(correo);
        await cargarNotas();
    } else {
        document.getElementById("pantallaLogin").style.display = "block";
        document.getElementById("pantallaAgenda").style.display = "none";
    }
};

// ---------- LLAMADAS AL BACKEND (fetch) ----------
async function loginApi(correo, nombre) {
    let respuesta = await fetch(`${API_URL}/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, nombre })
    });

    if (!respuesta.ok) {
        throw new Error("El servidor respondió con un error al iniciar sesión.");
    }

    return await respuesta.json();
}

async function obtenerEvaluaciones(usuarioId) {
    let respuesta = await fetch(`${API_URL}/evaluaciones.php?usuario_id=${usuarioId}`, { cache: "no-store" });

    if (!respuesta.ok) {
        throw new Error("El servidor respondió con un error al obtener las evaluaciones.");
    }

    return await respuesta.json();
}

async function crearEvaluacionApi(evaluacion) {
    let respuesta = await fetch(`${API_URL}/evaluaciones.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evaluacion)
    });

    if (!respuesta.ok) {
        throw new Error("El servidor respondió con un error al crear la evaluación.");
    }

    return await respuesta.json();
}

async function actualizarEvaluacionApi(evaluacion) {
    let respuesta = await fetch(`${API_URL}/evaluaciones.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evaluacion)
    });

    if (!respuesta.ok) {
        throw new Error("El servidor respondió con un error al actualizar la evaluación.");
    }

    return await respuesta.json();
}

async function eliminarEvaluacionApi(id) {
    let respuesta = await fetch(`${API_URL}/evaluaciones.php?id=${id}`, { method: "DELETE" });

    if (!respuesta.ok) {
        throw new Error("El servidor respondió con un error al eliminar la evaluación.");
    }

    return await respuesta.json();
}

async function eliminarTodasApi(usuarioId) {
    let respuesta = await fetch(`${API_URL}/evaluaciones.php?usuario_id=${usuarioId}`, { method: "DELETE" });

    if (!respuesta.ok) {
        throw new Error("El servidor respondió con un error al resetear los datos.");
    }

    return await respuesta.json();
}

// ---------- AUTENTICACIÓN ----------
async function login() {
    let nombreUsuario = document.getElementById("nombreUsuario").value.trim();
    let correo = document.getElementById("correo").value.trim();

    if (!correo.endsWith("@escuelasproa.edu.ar")) {
        alert("Por favor, usa un correo institucional válido (@escuelasproa.edu.ar)");
        return;
    }

    try {
        let usuario = await loginApi(correo, nombreUsuario);

        localStorage.setItem("usuarioId", usuario.id);
        localStorage.setItem("correo", usuario.correo);

        mostrarAgenda(usuario.correo);
        await cargarNotas();
    } catch (error) {
        console.error(error);
        alert("No se pudo conectar con el servidor. Verificá que XAMPP (Apache y MySQL) estén encendidos.");
    }
}

function mostrarAgenda(correo) {
    document.getElementById("pantallaLogin").style.display = "none";
    document.getElementById("pantallaAgenda").style.display = "block";
    document.getElementById("usuario").textContent = "Bienvenido/a: " + correo;
    actualizarIconoTema();
}

// ---------- TEMA CLARO / OSCURO ----------
function actualizarIconoTema() {
    let boton = document.getElementById("botonTema");
    if (!boton) return;
    boton.textContent = document.body.getAttribute("data-theme") === "light" ? "☀️" : "🌙";
}

function toggleTema() {
    let esClaro = document.body.getAttribute("data-theme") === "light";

    if (esClaro) {
        document.body.removeAttribute("data-theme");
        localStorage.setItem("tema", "oscuro");
    } else {
        document.body.setAttribute("data-theme", "light");
        localStorage.setItem("tema", "light");
    }

    actualizarIconoTema();
}

function logout() {
    localStorage.removeItem("usuarioId");
    localStorage.removeItem("correo");
    location.reload();
}

async function borrarDatos() {
    if (!confirm("¿Estás seguro de que deseas borrar todos los registros?")) {
        return;
    }

    let usuarioId = localStorage.getItem("usuarioId");

    try {
        await eliminarTodasApi(usuarioId);
        await cargarNotas();
        document.getElementById("promedio").textContent = "";
        mostrarToast("🗑 Todos los datos fueron borrados");
    } catch (error) {
        console.error(error);
        alert("No se pudieron borrar los datos.");
    }
}

// ---------- MOSTRAR/OCULTAR NOTA SEGÚN TIPO ----------
function actualizarVisibilidadNota() {
    let tipo = document.getElementById("tipo").value;
    let notaWrapper = document.getElementById("notaWrapper");

    if (tipo === "Recuperatorio") {
        notaWrapper.style.display = "block";
    } else {
        notaWrapper.style.display = "none";
        document.getElementById("nota").value = "";
    }
}

// ---------- CRUD: CREATE / UPDATE (Agregar o Guardar Cambios) ----------
async function agregarTarea() {
    let materia = document.getElementById("materia").value;
    let tipo = document.getElementById("tipo").value;
    let tarea = document.getElementById("tarea").value.trim();
    let fecha = document.getElementById("fecha").value;

    if (materia === "" || tipo === "" || tarea === "" || fecha === "") {
        alert("Por favor, completa todos los campos.");
        return;
    }

    let nota = null;
    let estado = "Pendiente";

    if (tipo === "Recuperatorio") {
        nota = parseFloat(document.getElementById("nota").value);

        if (isNaN(nota)) {
            alert("Por favor, ingresa la nota del recuperatorio.");
            return;
        }

        if (nota < 1 || nota > 10) {
            alert("La nota debe ser un número entre 1 y 10.");
            return;
        }

        estado = nota >= 6 ? "Aprobado" : "Desaprobado";
    }

    let usuarioId = localStorage.getItem("usuarioId");
    let evaluacion = { usuario_id: usuarioId, materia, tipo, tarea, nota, fecha, estado };

    try {
        if (idEditando !== null) {
            evaluacion.id = idEditando;
            await actualizarEvaluacionApi(evaluacion);
            await cargarNotas();
            limpiarCampos();
            mostrarToast("✔ Evaluación actualizada");
        } else {
            await crearEvaluacionApi(evaluacion);
            await cargarNotas();
            limpiarCampos();
            mostrarToast("✔ Evaluación agregada");
        }
    } catch (error) {
        console.error(error);
        alert("No se pudo guardar la evaluación. Verificá tu conexión con el servidor.");
    }
}

// Carga los datos de una evaluación existente en el formulario para editarla
function editar(id) {
    let n = datosCompletos.find(item => item.id == id);
    if (!n) return;

    document.getElementById("materia").value = n.materia;
    document.getElementById("tipo").value = n.tipo;
    actualizarVisibilidadNota();
    document.getElementById("tarea").value = n.tarea;
    document.getElementById("fecha").value = n.fecha;

    if (n.tipo === "Recuperatorio" && n.nota !== null) {
        document.getElementById("nota").value = n.nota;
    }

    idEditando = n.id;
    document.getElementById("botonAgregar").textContent = "Guardar Cambios";
    document.getElementById("botonCancelarEdicion").style.display = "block";

    document.querySelector(".form-container").scrollIntoView({ behavior: "smooth" });
}

// Cancela el modo edición sin guardar cambios
function cancelarEdicion() {
    limpiarCampos();
}

// ---------- CRUD: READ (Cargar / Mostrar, dividido en dos columnas) ----------
async function cargarNotas() {
    let usuarioId = localStorage.getItem("usuarioId");

    try {
        datosCompletos = await obtenerEvaluaciones(usuarioId);
    } catch (error) {
        console.error(error);
        alert("No se pudieron cargar tus evaluaciones. Verificá que el servidor (XAMPP) esté encendido.");
        datosCompletos = [];
    }

    renderizarListas();
}

// Dibuja las listas a partir de la caché en memoria (no vuelve a pedir datos al servidor)
function renderizarListas() {
    let listaTareas = document.getElementById("listaTareas");
    let listaRecuperatorios = document.getElementById("listaRecuperatorios");
    listaTareas.innerHTML = "";
    listaRecuperatorios.innerHTML = "";

    let filtroMateria = document.getElementById("filtroMateria").value;
    let textoBusqueda = document.getElementById("buscarTexto").value.trim().toLowerCase();

    let tareas = [];
    let recuperatorios = [];

    datosCompletos.forEach(n => {
        if (filtroMateria !== "" && n.materia !== filtroMateria) {
            return;
        }

        if (textoBusqueda !== "" && !n.tarea.toLowerCase().includes(textoBusqueda)) {
            return;
        }

        if (n.tipo === "Recuperatorio") {
            recuperatorios.push(n);
        } else {
            tareas.push(n);
        }
    });

    tareas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    recuperatorios.sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (tareas.length === 0) {
        listaTareas.innerHTML = "<li class='vacio'>No hay tareas registradas todavía.</li>";
    } else {
        tareas.forEach(n => listaTareas.appendChild(crearItemLista(n)));
    }

    if (recuperatorios.length === 0) {
        listaRecuperatorios.innerHTML = "<li class='vacio'>No hay recuperatorios.</li>";
    } else {
        recuperatorios.forEach(n => listaRecuperatorios.appendChild(crearItemLista(n)));
    }

    actualizarPanelBienvenida();
    actualizarResumenStats();
    actualizarHoyManana();
    actualizarProgresoMaterias();
}

// ---------- PANEL DE BIENVENIDA ----------
function diferenciaDias(fechaBaseStr, fechaObjetivoStr) {
    let base = new Date(fechaBaseStr + "T00:00:00");
    let objetivo = new Date(fechaObjetivoStr + "T00:00:00");
    let diffMs = objetivo - base;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function obtenerInicioSemana(fecha) {
    let copia = new Date(fecha);
    let dia = copia.getDay(); // 0 = domingo ... 6 = sábado
    let diff = dia === 0 ? 6 : dia - 1; // la semana arranca el lunes
    copia.setDate(copia.getDate() - diff);
    return copia;
}

function actualizarPanelBienvenida() {
    let contenedor = document.getElementById("panelBienvenida");

    if (datosCompletos.length === 0) {
        contenedor.innerHTML = `
            <h4>👋 Bienvenido/a</h4>
            <p class="bienvenida-vacio">Todavía no cargaste ninguna evaluación.</p>
        `;
        return;
    }

    let hoy = new Date();
    let hoyStr = formatearFechaISO(hoy);

    let pendientes = datosCompletos.filter(n => n.estado === "Pendiente").length;
    let completadas = datosCompletos.filter(n => n.estado === "Entregada" || n.estado.includes("Aprobado")).length;

    let proximas7Dias = datosCompletos.filter(n => {
        let diff = diferenciaDias(hoyStr, n.fecha);
        return diff >= 0 && diff <= 7;
    }).length;

    let proximas = datosCompletos
        .filter(n => n.fecha >= hoyStr)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

    let textoProxima = "No hay evaluaciones próximas.";
    if (proximas.length > 0) {
        let siguiente = proximas[0];
        let dias = diferenciaDias(hoyStr, siguiente.fecha);
        let textoDias = dias === 0 ? "hoy" : dias === 1 ? "mañana" : `faltan ${dias} días`;
        textoProxima = `${siguiente.materia} — ${siguiente.tarea} (${textoDias})`;
    }

    let inicioSemana = formatearFechaISO(obtenerInicioSemana(hoy));
    let completadasEstaSemana = datosCompletos.filter(n =>
        (n.estado === "Entregada" || n.estado.includes("Aprobado")) &&
        n.fecha >= inicioSemana && n.fecha <= hoyStr
    ).length;

    contenedor.innerHTML = `
        <h4>👋 Bienvenido/a</h4>
        <div class="bienvenida-datos">
            <span>📚 ${pendientes} pendientes</span>
            <span>📝 ${proximas7Dias} próximas (7 días)</span>
            <span>✅ ${completadas} completadas</span>
        </div>
        <p class="bienvenida-proxima">📅 Próxima evaluación: ${textoProxima}</p>
        <p class="bienvenida-semana">🗓️ Esta semana completaste ${completadasEstaSemana} evaluaciones.</p>
    `;
}

// ---------- RESUMEN CON CONTADORES ----------
function actualizarResumenStats() {
    let contenedor = document.getElementById("resumenStats");

    if (datosCompletos.length === 0) {
        contenedor.innerHTML = "";
        return;
    }

    let total = datosCompletos.length;
    let pendientes = datosCompletos.filter(n => n.estado === "Pendiente").length;
    let entregadas = datosCompletos.filter(n => n.estado === "Entregada").length;
    let aprobadas = datosCompletos.filter(n => n.estado.includes("Aprobado")).length;
    let desaprobadas = datosCompletos.filter(n => n.estado === "Desaprobado").length;

    contenedor.innerHTML = `
        <span class="stat-item stat-total">${total} en total</span>
        <span class="stat-item stat-pendiente">${pendientes} pendientes</span>
        <span class="stat-item stat-entregada">${entregadas} entregadas</span>
        <span class="stat-item stat-aprobada">${aprobadas} aprobadas</span>
        <span class="stat-item stat-desaprobada">${desaprobadas} desaprobadas</span>
    `;
}

// ---------- VISTA "HOY Y MAÑANA" ----------
function formatearFechaISO(fecha) {
    let anio = fecha.getFullYear();
    let mes = String(fecha.getMonth() + 1).padStart(2, "0");
    let dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function actualizarHoyManana() {
    let contenedor = document.getElementById("hoyManana");

    let hoy = new Date();
    let manana = new Date();
    manana.setDate(hoy.getDate() + 1);

    let hoyStr = formatearFechaISO(hoy);
    let mananaStr = formatearFechaISO(manana);

    let proximas = datosCompletos.filter(n => n.fecha === hoyStr || n.fecha === mananaStr);

    if (proximas.length === 0) {
        contenedor.innerHTML = "";
        return;
    }

    proximas.sort((a, b) => a.fecha.localeCompare(b.fecha));

    let itemsHtml = proximas.map(n => {
        let etiqueta = n.fecha === hoyStr ? "Hoy" : "Mañana";
        let claseUrgencia = n.fecha === hoyStr ? "urgente-hoy" : "urgente-manana";

        return `
            <div class="urgente-item ${claseUrgencia}">
                <span class="urgente-etiqueta">${etiqueta}</span>
                <strong>${n.tarea}</strong> — ${n.materia} (${n.tipo})
            </div>
        `;
    }).join("");

    contenedor.innerHTML = `<h4>⏰ Para hoy y mañana</h4>${itemsHtml}`;
}

// ---------- PROGRESO POR MATERIA ----------
function actualizarProgresoMaterias() {
    let contenedor = document.getElementById("progresoMaterias");

    if (datosCompletos.length === 0) {
        contenedor.innerHTML = "";
        return;
    }

    let porMateria = {};

    datosCompletos.forEach(n => {
        if (!porMateria[n.materia]) {
            porMateria[n.materia] = { aprobadas: 0, desaprobadas: 0, pendientes: 0, entregadas: 0, total: 0 };
        }

        porMateria[n.materia].total++;

        if (n.estado === "Pendiente") {
            porMateria[n.materia].pendientes++;
        } else if (n.estado === "Entregada") {
            porMateria[n.materia].entregadas++;
        } else if (n.estado.includes("Aprobado")) {
            porMateria[n.materia].aprobadas++;
        } else {
            porMateria[n.materia].desaprobadas++;
        }
    });

    let html = `<h4>📊 Progreso por materia</h4>`;

    Object.keys(porMateria).forEach(materia => {
        let datos = porMateria[materia];
        let pctAprobadas = (datos.aprobadas / datos.total) * 100;
        let pctDesaprobadas = (datos.desaprobadas / datos.total) * 100;
        let pctEntregadas = (datos.entregadas / datos.total) * 100;
        let pctPendientes = (datos.pendientes / datos.total) * 100;

        html += `
            <div class="progreso-fila">
                <div class="progreso-encabezado">
                    <span><span class="dot-materia" style="background:${obtenerColorMateria(materia)}"></span>${materia}</span>
                    <span class="progreso-numeros">${datos.aprobadas}/${datos.total} aprobadas</span>
                </div>
                <div class="progreso-barra">
                    <div class="progreso-segmento segmento-aprobado" style="width:${pctAprobadas}%"></div>
                    <div class="progreso-segmento segmento-desaprobado" style="width:${pctDesaprobadas}%"></div>
                    <div class="progreso-segmento segmento-entregada" style="width:${pctEntregadas}%"></div>
                    <div class="progreso-segmento segmento-pendiente" style="width:${pctPendientes}%"></div>
                </div>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

// ---------- CONFIRMACIONES (TOAST) ----------
function mostrarToast(mensaje) {
    let toast = document.getElementById("toast");
    toast.textContent = mensaje;
    toast.classList.add("mostrar");

    clearTimeout(toast._temporizador);
    toast._temporizador = setTimeout(() => {
        toast.classList.remove("mostrar");
    }, 2500);
}

// ---------- ATAJOS DE TECLADO ----------
document.addEventListener("keydown", function(evento) {
    if (evento.key === "Escape" && idEditando !== null) {
        cancelarEdicion();
    }
});

// ---------- COLOR POR MATERIA ----------
let coloresPorMateria = {
    "Matemática": "#f87171",
    "Historia": "#fb923c",
    "Programación": "#38bdf8",
    "Inglés": "#a78bfa",
    "Lengua": "#fbbf24",
    "Ciudadanía y política": "#4ade80",
    "Taller de inglés": "#c084fc",
    "Desarrollo de aplicaciones móviles": "#22d3ee",
    "Filosofía": "#f472b6",
    "Club de Ciencias": "#34d399",
    "Club de arte": "#fb7185",
    "Educación Artística": "#fcd34d"
};

function obtenerColorMateria(materia) {
    return coloresPorMateria[materia] || "#94a3b8";
}

// Crea el <li> de una evaluación (reutilizado por ambas columnas)
function crearItemLista(n) {
    let li = document.createElement("li");

    let claseEstado;
    if (n.estado === "Pendiente") {
        claseEstado = "estado-pendiente";
    } else if (n.estado === "Entregada") {
        claseEstado = "estado-entregada";
    } else {
        claseEstado = n.estado.includes("Aprobado") ? "estado-aprobado" : "estado-desaprobado";
    }

    let lineaNota = (n.nota !== null && n.nota !== undefined && n.nota !== "")
        ? `<span class="nota">Nota: ${n.nota}</span>`
        : "";

    let botonEntrega = "";
    if (n.tipo === "Tarea" && n.estado === "Pendiente") {
        botonEntrega = `<button class="btn-entregar" onclick="marcarEntrega(${n.id})" aria-label="Marcar ${n.tarea} como entregada">✔ Entregada</button>`;
    } else if (n.tipo === "Tarea" && n.estado === "Entregada") {
        botonEntrega = `<button class="btn-deshacer-entrega" onclick="marcarEntrega(${n.id})" aria-label="Marcar ${n.tarea} como pendiente de nuevo">↺ Pendiente</button>`;
    }

    li.innerHTML = `
        <div class="tarea-info">
            <strong>${n.tarea}</strong>
            <span>Tipo: ${n.tipo}</span>
            <span><span class="dot-materia" style="background:${obtenerColorMateria(n.materia)}"></span>Materia: ${n.materia}</span>
            <span>Fecha: ${n.fecha}</span>
            ${lineaNota}
            <span class="estado ${claseEstado}">${n.estado}</span>
        </div>

        <div class="acciones">
            <button class="btn-editar" onclick="editar(${n.id})" aria-label="Editar ${n.tarea}">✎</button>
            ${botonEntrega}
            ${n.estado === "Desaprobado" ? `<button class="btn-recuperar" onclick="recuperar(${n.id})" aria-label="Cargar nota de recuperatorio para ${n.tarea}">Recuperar</button>` : ''}
            <button class="btn-eliminar" onclick="eliminar(${n.id})" aria-label="Eliminar ${n.tarea}">✕</button>
        </div>
    `;

    return li;
}

// Marca una Tarea como Entregada, o la vuelve a Pendiente (no envía nada a ningún lado,
// es solo un cambio de estado en tu propia agenda)
async function marcarEntrega(id) {
    let n = datosCompletos.find(item => item.id == id);
    if (!n) return;

    let nuevoEstado = n.estado === "Entregada" ? "Pendiente" : "Entregada";

    let actualizado = {
        id: n.id,
        usuario_id: n.usuario_id,
        materia: n.materia,
        tipo: n.tipo,
        tarea: n.tarea,
        nota: n.nota,
        fecha: n.fecha,
        estado: nuevoEstado
    };

    try {
        await actualizarEvaluacionApi(actualizado);
        await cargarNotas();
        mostrarToast(nuevoEstado === "Entregada" ? "✔ Marcada como entregada" : "↺ Marcada como pendiente");
    } catch (error) {
        console.error(error);
        alert("No se pudo actualizar el estado.");
    }
}

// ---------- CRUD: UPDATE (Recuperar) ----------
async function recuperar(id) {
    let n = datosCompletos.find(item => item.id == id);
    if (!n) return;

    let nuevaNota = prompt("Ingresa la nueva nota del recuperatorio (1-10):");
    let notaNum = parseFloat(nuevaNota);

    if (isNaN(notaNum) || notaNum < 6 || notaNum > 10) {
        alert("Nota inválida o desaprobada. Debes ingresar un número entre 6 y 10 para aprobar.");
        return;
    }

    let actualizado = {
        id: n.id,
        usuario_id: n.usuario_id,
        materia: n.materia,
        tipo: n.tipo,
        tarea: n.tarea,
        nota: notaNum,
        fecha: n.fecha,
        estado: "Aprobado (Recuperatorio)"
    };

    try {
        await actualizarEvaluacionApi(actualizado);
        await cargarNotas();
        mostrarToast("✔ Nota de recuperatorio actualizada");
    } catch (error) {
        console.error(error);
        alert("No se pudo actualizar la nota.");
    }
}

// ---------- CRUD: DELETE (Eliminar) ----------
async function eliminar(id) {
    if (!confirm("¿Seguro que querés eliminar esta evaluación?")) {
        return;
    }

    try {
        await eliminarEvaluacionApi(id);
        await cargarNotas();
        mostrarToast("🗑 Evaluación eliminada");
    } catch (error) {
        console.error(error);
        alert("No se pudo eliminar la evaluación.");
    }
}

// ---------- PROMEDIO ----------
function calcularPromedio() {
    let notasValidas = datosCompletos.filter(n =>
        n.nota !== null && n.nota !== undefined && n.nota !== "" && !isNaN(Number(n.nota))
    );

    if (notasValidas.length === 0) {
        document.getElementById("promedio").textContent = "Sin notas para promediar.";
        return;
    }

    let suma = notasValidas.reduce((acc, curr) => acc + Number(curr.nota), 0);
    let promedio = suma / notasValidas.length;

    document.getElementById("promedio").textContent = `Promedio General: ${promedio.toFixed(2)}`;
}

// ---------- EXPORTAR A EXCEL (CSV) ----------
function exportarCSV() {
    if (datosCompletos.length === 0) {
        alert("No hay evaluaciones para exportar.");
        return;
    }

    let filas = [["Materia", "Tipo", "Nombre", "Nota", "Fecha", "Estado"]];

    datosCompletos.forEach(n => {
        filas.push([n.materia, n.tipo, n.tarea, n.nota !== null && n.nota !== undefined ? n.nota : "", n.fecha, n.estado]);
    });

    let contenidoCSV = filas
        .map(fila => fila.map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    let blob = new Blob(["\uFEFF" + contenidoCSV], { type: "text/csv;charset=utf-8;" });
    let url = URL.createObjectURL(blob);

    let enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "agenda_evaluaciones.csv";
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
}

// ---------- STEPPER DE NOTA ----------
function cambiarNota(delta) {
    let input = document.getElementById("nota");
    let valor = parseFloat(input.value);
    if (isNaN(valor)) valor = delta > 0 ? 0 : 11;
    valor += delta;
    if (valor < 1) valor = 1;
    if (valor > 10) valor = 10;
    input.value = valor;
}

// ---------- CALENDARIO GRANDE ----------
let mesCalendario, anioCalendario;

function toggleCalendarioGrande() {
    let cal = document.getElementById("calendarioGrande");

    if (cal.style.display === "none" || cal.style.display === "") {
        let fechaInput = document.getElementById("fecha").value;
        let base = fechaInput ? new Date(fechaInput + "T00:00:00") : new Date();
        mesCalendario = base.getMonth();
        anioCalendario = base.getFullYear();
        renderCalendario();
        cal.style.display = "flex";
    } else {
        cal.style.display = "none";
    }
}

function cambiarMes(delta) {
    mesCalendario += delta;
    if (mesCalendario < 0) { mesCalendario = 11; anioCalendario--; }
    if (mesCalendario > 11) { mesCalendario = 0; anioCalendario++; }
    renderCalendario();
}

function renderCalendario() {
    let nombresMes = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                       "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById("mesAnioLabel").textContent = `${nombresMes[mesCalendario]} ${anioCalendario}`;

    // Mapa fecha -> { tarea: bool, recuperatorio: bool }, armado desde la caché en memoria
    let mapaFechas = {};
    datosCompletos.forEach(n => {
        if (!mapaFechas[n.fecha]) mapaFechas[n.fecha] = { tarea: false, recuperatorio: false };
        if (n.tipo === "Recuperatorio") {
            mapaFechas[n.fecha].recuperatorio = true;
        } else {
            mapaFechas[n.fecha].tarea = true;
        }
    });

    let contenedor = document.getElementById("diasCalendario");
    contenedor.innerHTML = "";

    let primerDiaSemana = new Date(anioCalendario, mesCalendario, 1).getDay();
    let totalDias = new Date(anioCalendario, mesCalendario + 1, 0).getDate();

    for (let i = 0; i < primerDiaSemana; i++) {
        let vacio = document.createElement("div");
        vacio.className = "dia-celda vacio-dia";
        contenedor.appendChild(vacio);
    }

    let hoy = new Date();

    for (let dia = 1; dia <= totalDias; dia++) {
        let mesStr = String(mesCalendario + 1).padStart(2, "0");
        let diaStr = String(dia).padStart(2, "0");
        let fechaStr = `${anioCalendario}-${mesStr}-${diaStr}`;

        let celda = document.createElement("div");
        celda.className = "dia-celda";
        celda.textContent = dia;

        let info = mapaFechas[fechaStr];
        if (info) {
            if (info.tarea && info.recuperatorio) celda.classList.add("con-ambos");
            else if (info.recuperatorio) celda.classList.add("con-recuperatorio");
            else celda.classList.add("con-tarea");
        }

        if (hoy.getFullYear() === anioCalendario && hoy.getMonth() === mesCalendario && hoy.getDate() === dia) {
            celda.classList.add("hoy");
        }

        celda.onclick = () => {
            document.getElementById("fecha").value = fechaStr;
            document.getElementById("calendarioGrande").style.display = "none";
        };

        contenedor.appendChild(celda);
    }
}

// ---------- ASISTENTE DE LA TESINA ----------
let basePreguntasAsistente = [
    {
        palabras: ["hola", "buenas", "hey"],
        respuesta: "¡Hola! Soy el asistente de la Agenda Estudiantil ProA. Preguntame sobre cualquier botón o sección de la página: login, tareas, recuperatorios, calendario, promedio, etc."
    },
    {
        palabras: ["que es esto", "qué es esto", "para que sirve", "para qué sirve", "de que trata", "de qué trata"],
        respuesta: "Esta es la Agenda Estudiantil ProA: sirve para registrar tus tareas, exámenes y recuperatorios, con sus notas y fechas, y llevar un promedio general."
    },
    {
        palabras: ["login", "ingresar", "correo institucional", "iniciar sesion", "iniciar sesión"],
        respuesta: "Para entrar hay que poner un correo que termine en @escuelasproa.edu.ar y tocar 'Ingresar'. Con eso se crea o busca tu usuario en la base de datos y se abre la Agenda."
    },
    {
        palabras: ["cerrar sesion", "cerrar sesión", "logout", "salir"],
        respuesta: "El botón 'Cerrar sesión' (arriba, gris) te saca de la cuenta actual. Tus datos quedan guardados en la base de datos y los volvés a ver si entrás de nuevo con el mismo correo."
    },
    {
        palabras: ["resetear", "borrar todo", "borrar datos"],
        respuesta: "El botón rojo 'Resetear todo' borra TODOS tus registros de la base de datos (te pide confirmación antes). Es distinto al botón ✕ que borra solo una evaluación."
    },
    {
        palabras: ["materia", "seleccionar materia"],
        respuesta: "El primer campo del formulario es la Materia: elegís de la lista desplegable a qué materia corresponde la evaluación."
    },
    {
        palabras: ["tipo", "tarea o recuperatorio"],
        respuesta: "El segundo campo es el Tipo: 'Tarea / Examen' (para algo que todavía no rendiste) o 'Recuperatorio'. Según lo que elijas, cambia si te pide nota o no."
    },
    {
        palabras: ["nombre de la tarea", "nombre"],
        respuesta: "El campo de texto (tercero) es el nombre que le querés poner a esa tarea o examen, por ejemplo 'Parcial de Programación'."
    },
    {
        palabras: ["recuperatorio", "recuperar"],
        respuesta: "Un Recuperatorio se carga eligiendo el tipo 'Recuperatorio' en el formulario. Ahí sí te va a pedir una nota (1 a 10), y aparece en su propia sección. Si una nota queda Desaprobada, también le va a salir un botón 'Recuperar' para volver a cargar una nota nueva."
    },
    {
        palabras: ["examen", "agregar", "cargar", "nueva evaluacion", "nueva evaluación"],
        respuesta: "Para cargar algo tocá 'Agregar Evaluacion / tarea' después de completar: Materia, Tipo, Nombre, Fecha, y la Nota si corresponde (solo para Recuperatorios)."
    },
    {
        palabras: ["nota", "calificacion", "calificación", "flechitas", "flechas"],
        respuesta: "El campo Nota solo aparece si elegís el tipo 'Recuperatorio'. Tiene dos flechitas (▲▼) propias al lado para subir o bajar el número de a uno."
    },
    {
        palabras: ["pendiente"],
        respuesta: "El estado 'Pendiente' (color celeste) significa que es una Tarea/Examen que todavía no tiene nota cargada porque no se rindió aún."
    },
    {
        palabras: ["aprobado", "desaprobado", "estado"],
        respuesta: "El Estado de una evaluación puede ser: Pendiente (todavía no rendida), Aprobado (nota 6 o más) o Desaprobado (nota menor a 6, y ahí aparece el botón Recuperar)."
    },
    {
        palabras: ["calendario", "fecha grande", "boton calendario"],
        respuesta: "Al lado del campo Fecha hay un botón 📅 que abre un calendario mensual grande. Los días se pintan azul si hay una Tarea, naranja si hay un Recuperatorio, y combinado si hay ambos ese día. Al tocar un día, se carga en el campo Fecha."
    },
    {
        palabras: ["tareas y examenes", "seccion de tareas", "sección de tareas"],
        respuesta: "La sección '📘 Tareas y Exámenes' muestra todo lo que cargaste con el tipo 'Tarea/Examen'."
    },
    {
        palabras: ["seccion de recuperatorios", "sección de recuperatorios"],
        respuesta: "La sección '📕 Recuperatorios' muestra todo lo que cargaste con el tipo 'Recuperatorio'."
    },
    {
        palabras: ["eliminar", "borrar una", "boton x", "botón x"],
        respuesta: "El botón ✕ que aparece en cada evaluación la elimina individualmente de la base de datos."
    },
    {
        palabras: ["promedio"],
        respuesta: "El botón 'Calcular Promedio' saca el promedio solo de las evaluaciones que ya tienen una nota cargada (ignora las que están Pendientes)."
    },
    {
        palabras: ["asistente", "chatbot", "vos que sos", "quien sos", "quién sos"],
        respuesta: "Soy el asistente de esta página: respondo preguntas sobre cómo funciona la Agenda ProA usando respuestas ya definidas (no soy una IA conectada a internet)."
    },
    {
        palabras: ["gracias"],
        respuesta: "¡De nada! Cualquier otra duda sobre la página, avisame."
    },
    {
        palabras: ["editar", "modificar", "boton lapiz", "botón lápiz"],
        respuesta: "El botón ✎ de cada evaluación carga sus datos en el formulario de arriba para modificarla. El botón 'Agregar' cambia a 'Guardar Cambios' mientras editás, y podés tocar 'Cancelar edición' para salir sin guardar."
    },
    {
        palabras: ["filtro", "filtrar", "buscar"],
        respuesta: "Arriba del listado hay un selector 'Filtrar por materia' que muestra solo las evaluaciones de la materia que elijas. Con 'Todas las materias' se vuelve a ver todo."
    },
    {
        palabras: ["exportar", "excel", "csv", "descargar"],
        respuesta: "El botón 'Exportar a Excel (CSV)' descarga todas tus evaluaciones en un archivo que se abre directamente con Excel o Google Sheets."
    },
    {
        palabras: ["base de datos", "servidor", "backend"],
        respuesta: "Ahora tus evaluaciones se guardan en una base de datos MySQL a través de un backend en PHP, así que si entrás desde otra compu con el mismo correo, vas a ver los mismos datos (siempre que apunte al mismo servidor)."
    },
    {
        palabras: ["resumen", "contadores", "en total"],
        respuesta: "Arriba del listado hay un resumen con la cantidad total de evaluaciones, cuántas están pendientes, aprobadas y desaprobadas."
    },
    {
        palabras: ["hoy y mañana", "hoy y manana", "para hoy", "vence"],
        respuesta: "La sección '⏰ Para hoy y mañana' te muestra, destacado arriba de todo, lo que vence en las próximas 48 horas (hoy en rojo, mañana en naranja)."
    },
    {
        palabras: ["buscar por nombre", "busqueda", "búsqueda"],
        respuesta: "Al lado del filtro por materia hay un campo para buscar por el nombre de la tarea o examen, y filtra la lista mientras escribís."
    },
    {
        palabras: ["progreso", "grafico", "gráfico", "barra de progreso"],
        respuesta: "Abajo del listado hay un '📊 Progreso por materia': una barra por cada materia que muestra qué proporción de tus evaluaciones están aprobadas, desaprobadas o pendientes."
    },
    {
        palabras: ["toast", "mensaje de confirmacion", "confirmación"],
        respuesta: "Cuando agregás, editás, eliminás o reseteás algo, aparece un mensajito flotante abajo confirmando la acción."
    },
    {
        palabras: ["atajo", "teclado", "enter", "escape"],
        respuesta: "Podés apretar Enter en el campo de nombre para agregar o guardar la evaluación, y Escape para cancelar una edición en curso."
    },
    {
        palabras: ["entregada", "entregar", "marcar como"],
        respuesta: "El botón '✔ Entregada' en una Tarea/Examen la marca como entregada por vos (cambia su estado). Esto es solo dentro de tu agenda personal: no envía nada a tu profesor ni se conecta con Classroom, es para que vos hagas seguimiento de lo que ya presentaste."
    },
    {
        palabras: ["profesor", "classroom", "llega", "enviar"],
        respuesta: "Esta agenda es una herramienta personal: no está conectada con Classroom ni con tus profesores, y no envía ni entrega nada por vos. Para que la tarea le llegue de verdad al profesor, la tenés que entregar por el medio que use tu escuela (por ejemplo Classroom). Acá solo marcás para vos mismo qué es lo que ya entregaste."
    },
    {
        palabras: ["bienvenida", "panel", "resumen de bienvenida"],
        respuesta: "Arriba de todo, al entrar, hay un panel de bienvenida con un resumen rápido: pendientes, próximas evaluaciones (7 días), completadas, tu próxima evaluación con los días que faltan, y cuántas completaste esta semana."
    },
    {
        palabras: ["tema claro", "tema oscuro", "modo claro", "modo oscuro", "cambiar tema"],
        respuesta: "El botón 🌙/☀️ junto a 'Cerrar sesión' cambia entre tema oscuro y tema claro. Tu elección se guarda en este navegador para la próxima vez que entres."
    }
];

let respuestaPorDefecto = "No tengo una respuesta para eso todavía. Probá preguntarme sobre: tareas, recuperatorios, notas, el calendario, el promedio, editar, filtrar o exportar.";

function toggleAsistente() {
    let panel = document.getElementById("panelAsistente");

    if (panel.style.display === "none" || panel.style.display === "") {
        panel.style.display = "flex";

        if (document.getElementById("mensajesAsistente").children.length === 0) {
            agregarMensajeAsistente("bot", "¡Hola! Soy el asistente de la Agenda Estudiantil ProA. ¿En qué te puedo ayudar?");
        }
    } else {
        panel.style.display = "none";
    }
}

function enviarPreguntaAsistente() {
    let input = document.getElementById("inputAsistente");
    let texto = input.value.trim();

    if (texto === "") return;

    agregarMensajeAsistente("usuario", texto);
    input.value = "";

    let textoNormalizado = texto.toLowerCase();
    let coincidencia = basePreguntasAsistente.find(item =>
        item.palabras.some(palabra => textoNormalizado.includes(palabra))
    );

    setTimeout(() => {
        agregarMensajeAsistente("bot", coincidencia ? coincidencia.respuesta : respuestaPorDefecto);
    }, 300);
}

function agregarMensajeAsistente(tipo, texto) {
    let contenedor = document.getElementById("mensajesAsistente");
    let burbuja = document.createElement("div");
    burbuja.className = tipo === "bot" ? "mensaje-bot" : "mensaje-usuario";
    burbuja.textContent = texto;
    contenedor.appendChild(burbuja);
    contenedor.scrollTop = contenedor.scrollHeight;
}

// ---------- LIMPIAR CAMPOS ----------
function limpiarCampos() {
    document.getElementById("tarea").value = "";
    document.getElementById("tipo").value = "";
    document.getElementById("materia").value = "";
    document.getElementById("nota").value = "";
    document.getElementById("fecha").value = "";
    document.getElementById("notaWrapper").style.display = "none";

    idEditando = null;
    document.getElementById("botonAgregar").textContent = "Agregar Evaluacion / tarea";
    document.getElementById("botonCancelarEdicion").style.display = "none";
}

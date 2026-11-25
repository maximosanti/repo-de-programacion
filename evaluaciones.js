import {
    state,
    escaparHTML,
    obtenerPrimerNombre,
    prefijoNombre,
    formatearFechaISO,
    obtenerColorMateria,
    actualizarIconos
} from "./config-utilidades.js";
import {
    mostrarToast,
    marcarErrorCampo,
    limpiarErrorCampo,
    limpiarTodosLosErrores,
    mostrarModalAlerta,
    interpretarErrorConexion
} from "./errores-alertas.js";
import {
    obtenerEvaluaciones,
    crearEvaluacionApi,
    actualizarEvaluacionApi,
    eliminarEvaluacionApi
} from "./api.js";
import { obtenerEvaluacionesFiltradas } from "./filtros.js";
import { renderCalendarioInicio } from "./calendario.js";
import { actualizarCursadaHoy } from "./horario.js";
import {
    actualizarPanelBienvenida,
    actualizarResumenStats,
    actualizarHoyManana,
    actualizarProgresoMaterias,
    actualizarPromediosPorMateria,
    calcularSimulacion
} from "./metricas.js";

// ---------- CONTROLES DEL FORMULARIO ----------
export function limpiarCampos() {
    limpiarTodosLosErrores();
    document.getElementById("tarea").value = "";
    document.getElementById("detalles").value = "";
    document.getElementById("tipo").value = "";
    document.getElementById("materia").value = "";
    document.getElementById("fecha").value = "";

    state.idEditando = null;
    document.getElementById("formTitleText").textContent = "Cargar Nueva Evaluación";
    document.getElementById("botonAgregar").querySelector("span").textContent = "Agregar Evaluación";
    document.getElementById("botonCancelarEdicion").style.display = "none";
}

// ---------- CREATE / UPDATE ----------
export async function agregarTarea(callbackCambiarTab) {
    limpiarTodosLosErrores();

    const materia = document.getElementById("materia").value;
    const tipo = document.getElementById("tipo").value;
    const tarea = document.getElementById("tarea").value.trim();
    const detalles = document.getElementById("detalles").value.trim();
    const fecha = document.getElementById("fecha").value;

    let hayErrores = false;

    if (materia === "") {
        marcarErrorCampo("materia", "Elegí una materia de la lista.");
        hayErrores = true;
    }
    if (tipo === "") {
        marcarErrorCampo("tipo", "Indicá si es Tarea, Examen o Recuperatorio.");
        hayErrores = true;
    }
    if (tarea === "") {
        marcarErrorCampo("tarea", "Escribí el nombre de la evaluación.");
        hayErrores = true;
    }
    if (fecha === "") {
        marcarErrorCampo("fecha", "Seleccioná la fecha de entrega o examen.");
        hayErrores = true;
    }

    if (hayErrores) {
        mostrarToast(`${prefijoNombre()}completá los campos marcados en rojo para guardar.`, "warning", "Faltan datos obligatorios");
        return;
    }

    let nota = null;
    let estado = "Pendiente";

    if (state.idEditando !== null) {
        const anterior = state.datosCompletos.find(item => item.id == state.idEditando);
        if (anterior) {
            nota = anterior.nota;
            estado = anterior.estado;
        }
    }

    const btnAgregar = document.getElementById("botonAgregar");
    const spanBtn = btnAgregar.querySelector("span");
    const textoOriginal = spanBtn.textContent;
    btnAgregar.disabled = true;
    spanBtn.textContent = "Guardando...";

    const evaluacion = { materia, tipo, tarea, detalles, nota, fecha, estado };

    try {
        if (state.idEditando !== null) {
            evaluacion.id = state.idEditando;
            await actualizarEvaluacionApi(evaluacion);
            await cargarNotas();
            limpiarCampos();
            mostrarToast(`${prefijoNombre()}los cambios en "${tarea}" se guardaron bien.`, "success", "Evaluación actualizada");
            if (typeof callbackCambiarTab === "function") callbackCambiarTab("evaluaciones");
        } else {
            await crearEvaluacionApi(evaluacion);
            await cargarNotas();
            limpiarCampos();
            mostrarToast(`${prefijoNombre()}agregaste "${tarea}" a ${materia}.`, "success", "Evaluación guardada");
            if (typeof callbackCambiarTab === "function") callbackCambiarTab("evaluaciones");
        }
    } catch (error) {
        interpretarErrorConexion(error, "guardar la evaluación");
    } finally {
        btnAgregar.disabled = false;
        if (state.idEditando === null) {
            spanBtn.textContent = "Agregar Evaluación";
        } else {
            spanBtn.textContent = textoOriginal;
        }
    }
}

export function editar(id, callbackCambiarTab) {
    const n = state.datosCompletos.find(item => item.id == id);
    if (!n) return;

    if (typeof callbackCambiarTab === "function") callbackCambiarTab("nueva");

    document.getElementById("materia").value = n.materia;
    document.getElementById("tipo").value = n.tipo;
    document.getElementById("tarea").value = n.tarea;
    document.getElementById("detalles").value = n.detalles || "";
    document.getElementById("fecha").value = n.fecha;

    state.idEditando = n.id;
    document.getElementById("formTitleText").textContent = "Editar Evaluación";
    document.getElementById("botonAgregar").querySelector("span").textContent = "Guardar Cambios";
    document.getElementById("botonCancelarEdicion").style.display = "inline-flex";
}

export function cancelarEdicion() {
    limpiarCampos();
    mostrarToast("Edición cancelada.", "info", "Sin cambios");
}

// ---------- CALIFICACIÓN Y RECUPERATORIOS ----------
export function abrirModalCalificar(id, modo = "calificar") {
    const n = state.datosCompletos.find(item => item.id == id);
    if (!n) return;

    limpiarErrorCampo("modalCalificarInput");
    state.idCalificando = id;
    state.modoCalificacion = (n.tipo === "Recuperatorio") ? "recuperar" : modo;

    if (state.modoCalificacion === "recuperar") {
        document.getElementById("modalCalificarTitulo").textContent = `Recuperatorio: ${n.tarea}`;
        document.getElementById("modalCalificarSubtitulo").textContent = "Ingresá la nota obtenida en el recuperatorio (6 a 10 para aprobar):";
        document.getElementById("modalCalificarInput").value = (n.tipo === "Recuperatorio" && n.nota !== null && n.nota !== undefined) ? n.nota : "";
    } else {
        document.getElementById("modalCalificarTitulo").textContent = `Calificar: ${n.tarea}`;
        document.getElementById("modalCalificarSubtitulo").textContent = "Ingresá la calificación obtenida (1 a 10):";
        document.getElementById("modalCalificarInput").value = (n.nota !== null && n.nota !== undefined) ? n.nota : "";
    }

    document.getElementById("modalCalificar").style.display = "flex";
    document.getElementById("modalCalificarInput").focus();
}

export function cerrarModalCalificar() {
    state.idCalificando = null;
    limpiarErrorCampo("modalCalificarInput");
    document.getElementById("modalCalificar").style.display = "none";
}

export async function confirmarCalificacion() {
    if (state.idCalificando === null) return;
    const n = state.datosCompletos.find(item => item.id == state.idCalificando);
    if (!n) return;

    const notaNum = parseFloat(document.getElementById("modalCalificarInput").value);
    if (isNaN(notaNum) || notaNum < 1 || notaNum > 10) {
        marcarErrorCampo("modalCalificarInput", `${prefijoNombre()}ingresá un número válido entre 1 y 10.`);
        return;
    }

    const esRecuperatorioNuevo = (state.modoCalificacion === "recuperar" && n.tipo !== "Recuperatorio");
    const nuevoEstado = ((state.modoCalificacion === "recuperar" || n.tipo === "Recuperatorio") && notaNum >= 6)
        ? "Aprobado (Recuperatorio)"
        : (notaNum >= 6 ? "Aprobado" : "Desaprobado");

    const btnGuardar = document.getElementById("btnConfirmarCalificar");
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    try {
        if (esRecuperatorioNuevo) {
            const recuperatorio = {
                materia: n.materia,
                tipo: "Recuperatorio",
                tarea: `Recuperatorio: ${n.tarea}`,
                detalles: n.detalles || "",
                nota: notaNum,
                fecha: formatearFechaISO(new Date()),
                estado: nuevoEstado
            };
            await crearEvaluacionApi(recuperatorio);
        } else {
            const actualizado = {
                id: n.id,
                materia: n.materia,
                tipo: n.tipo,
                tarea: n.tarea,
                detalles: n.detalles || "",
                nota: notaNum,
                fecha: n.fecha,
                estado: nuevoEstado
            };
            await actualizarEvaluacionApi(actualizado);
        }

        cerrarModalCalificar();
        await cargarNotas();

        if (notaNum >= 6) {
            mostrarToast(`¡Felicitaciones ${obtenerPrimerNombre()}! Nota ${notaNum} registrada (${nuevoEstado}).`, "success", esRecuperatorioNuevo ? "Recuperatorio cargado" : "Calificación guardada");
        } else {
            mostrarToast(`${prefijoNombre()}se registró la nota ${notaNum}. Recordá que podés cargarle un recuperatorio.`, "warning", "Evaluación desaprobada");
        }
    } catch (error) {
        cerrarModalCalificar();
        interpretarErrorConexion(error, "guardar la calificación");
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = "Guardar Nota";
    }
}

// ---------- CARGA Y RENDERIZADO DE LISTAS ----------
export async function cargarNotas() {
    try {
        state.datosCompletos = await obtenerEvaluaciones();
    } catch (error) {
        state.datosCompletos = [];
        interpretarErrorConexion(error, "cargar tus evaluaciones");
    }

    renderizarListas();
}

export function renderizarListas() {
    const listaTareas = document.getElementById("listaTareas");
    const listaExamenes = document.getElementById("listaExamenes");
    const listaRecuperatorios = document.getElementById("listaRecuperatorios");

    listaTareas.innerHTML = "";
    listaExamenes.innerHTML = "";
    listaRecuperatorios.innerHTML = "";

    const { tareas, examenes, recuperatorios } = obtenerEvaluacionesFiltradas();

    if (tareas.length === 0) {
        listaTareas.innerHTML = "<li class='vacio'>No hay tareas registradas con ese filtro.</li>";
    } else {
        tareas.forEach(n => listaTareas.appendChild(crearItemLista(n)));
    }

    if (examenes.length === 0) {
        listaExamenes.innerHTML = "<li class='vacio'>No hay exámenes registrados con ese filtro.</li>";
    } else {
        examenes.forEach(n => listaExamenes.appendChild(crearItemLista(n)));
    }

    if (recuperatorios.length === 0) {
        listaRecuperatorios.innerHTML = "<li class='vacio'>No hay recuperatorios registrados con ese filtro.</li>";
    } else {
        recuperatorios.forEach(n => listaRecuperatorios.appendChild(crearItemLista(n)));
    }

    actualizarPanelBienvenida();
    actualizarCursadaHoy();
    actualizarResumenStats();
    actualizarHoyManana();
    actualizarProgresoMaterias();
    actualizarPromediosPorMateria();
    renderCalendarioInicio();
    calcularSimulacion();
    actualizarIconos();
}

function crearItemLista(n) {
    const li = document.createElement("li");
    const hoyStr = formatearFechaISO(new Date());
    const estaVencida = (n.estado === "Pendiente" && n.fecha < hoyStr);

    if (estaVencida) {
        li.classList.add("item-vencido");
    }

    let claseEstado;
    if (n.estado === "Pendiente") {
        claseEstado = "estado-pendiente";
    } else if (n.estado === "Entregada") {
        claseEstado = "estado-entregada";
    } else {
        claseEstado = n.estado.includes("Aprobado") ? "estado-aprobado" : "estado-desaprobado";
    }

    const badgeVencida = estaVencida ? `<span class="badge-vencida">⚠ Vencida</span>` : "";

    const lineaNota = (n.nota !== null && n.nota !== undefined && n.nota !== "")
        ? `<span class="nota">Nota: <strong>${escaparHTML(n.nota)}</strong></span>`
        : "";

    const bloqueDetalles = n.detalles
        ? `<div class="tarea-detalles"><strong>Temario:</strong> ${escaparHTML(n.detalles)}</div>`
        : "";

    let botonEntrega = "";
    if (n.estado === "Pendiente") {
        botonEntrega = `<button type="button" class="btn-entregar" data-accion="entregar" data-id="${n.id}">✔ Entregada</button>`;
    } else if (n.estado === "Entregada") {
        botonEntrega = `<button type="button" class="btn-deshacer-entrega" data-accion="entregar" data-id="${n.id}">↺ Pendiente</button>`;
    }

    const botonCalificar = `<button type="button" class="btn-calificar" data-accion="calificar" data-id="${n.id}">★ Calificar</button>`;

    li.innerHTML = `
        <div class="tarea-info">
            <strong>${escaparHTML(n.tarea)} ${badgeVencida}</strong>
            <span><span class="dot-materia" style="background:${obtenerColorMateria(n.materia)}"></span>${escaparHTML(n.materia)} · ${escaparHTML(n.tipo)}</span>
            <span>Fecha: ${escaparHTML(n.fecha)}</span>
            ${lineaNota}
            <span class="estado ${claseEstado}">${escaparHTML(n.estado)}</span>
            ${bloqueDetalles}
        </div>

        <div class="acciones">
            <button type="button" class="btn-editar" data-accion="editar" data-id="${n.id}" title="Editar">✎</button>
            ${botonEntrega}
            ${botonCalificar}
            ${(n.estado === "Desaprobado" && n.tipo !== "Recuperatorio") ? `<button type="button" class="btn-recuperar" data-accion="recuperar" data-id="${n.id}">Recuperar</button>` : ""}
            <button type="button" class="btn-gcal" data-accion="gcal" data-id="${n.id}" title="Guardar en Google Calendar">📅 Calendar</button>
            <button type="button" class="btn-eliminar" data-accion="eliminar" data-id="${n.id}" title="Eliminar">✕</button>
        </div>
    `;

    return li;
}

// ---------- ENTREGAS, ELIMINACIÓN Y GOOGLE CALENDAR ----------
export async function marcarEntrega(id) {
    const n = state.datosCompletos.find(item => item.id == id);
    if (!n) return;

    const nuevoEstado = n.estado === "Entregada" ? "Pendiente" : "Entregada";

    const actualizado = {
        id: n.id,
        materia: n.materia,
        tipo: n.tipo,
        tarea: n.tarea,
        detalles: n.detalles || "",
        nota: n.nota,
        fecha: n.fecha,
        estado: nuevoEstado
    };

    try {
        await actualizarEvaluacionApi(actualizado);
        await cargarNotas();
        mostrarToast(
            nuevoEstado === "Entregada"
                ? `${prefijoNombre()}marcaste "${n.tarea}" como entregada.`
                : `"${n.tarea}" volvió a estado pendiente.`,
            nuevoEstado === "Entregada" ? "success" : "info",
            nuevoEstado === "Entregada" ? "¡Entregada!" : "Estado actualizado"
        );
    } catch (error) {
        interpretarErrorConexion(error, "actualizar el estado de entrega");
    }
}

export function eliminar(id) {
    const n = state.datosCompletos.find(item => item.id == id);
    const nombreEval = n ? `"${escaparHTML(n.tarea)}"` : "esta evaluación";

    mostrarModalAlerta({
        titulo: "Eliminar evaluación",
        mensaje: `${prefijoNombre()}¿seguro que querés eliminar ${nombreEval} de ${n ? escaparHTML(n.materia) : "tu agenda"}?`,
        tipo: "warning",
        textoConfirmar: "Sí, eliminar",
        textoCancelar: "Cancelar",
        alConfirmar: async () => {
            try {
                await eliminarEvaluacionApi(id);
                await cargarNotas();
                mostrarToast(`Se eliminó ${n ? n.tarea : "la evaluación"}.`, "info", "Evaluación eliminada");
            } catch (error) {
                interpretarErrorConexion(error, "eliminar la evaluación");
            }
        }
    });
}

export function abrirGoogleCalendar(id) {
    const n = state.datosCompletos.find(item => item.id == id);
    if (!n) return;

    const fechaInicio = n.fecha.replace(/-/g, "");
    const fechaObj = new Date(n.fecha + "T00:00:00");
    fechaObj.setDate(fechaObj.getDate() + 1);
    const fechaFin = formatearFechaISO(fechaObj).replace(/-/g, "");

    const titulo = encodeURIComponent(`[EduAgenda] ${n.tipo} de ${n.materia}: ${n.tarea}`);
    const descripcion = encodeURIComponent(
        `Materia: ${n.materia}
Tipo: ${n.tipo}
Evaluación: ${n.tarea}` +
        (n.detalles ? `
Temario / Detalles: ${n.detalles}` : "")
    );

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${fechaInicio}/${fechaFin}&details=${descripcion}`;
    window.open(url, "_blank", "noopener,noreferrer");
}

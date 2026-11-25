import { state } from "./config-utilidades.js";
import { mostrarToast } from "./errores-alertas.js";

function coincideEstado(item, filtroEstado) {
    if (!filtroEstado) return true;
    if (filtroEstado === "Pendiente") return item.estado === "Pendiente";
    if (filtroEstado === "Entregada") return item.estado === "Entregada";
    if (filtroEstado === "Aprobada") return item.estado.includes("Aprobado");
    if (filtroEstado === "Desaprobada") return item.estado === "Desaprobado";
    return true;
}

// ---------- FILTRADO Y ORDENAMIENTO DE EVALUACIONES ----------
export function obtenerEvaluacionesFiltradas() {
    const filtroMateria = document.getElementById("filtroMateria")?.value || "";
    const textoBusqueda = (document.getElementById("buscarTexto")?.value || "").trim().toLowerCase();

    const tareas = [];
    const examenes = [];
    const recuperatorios = [];

    state.datosCompletos.forEach(n => {
        if (!coincideEstado(n, state.filtroEstado)) return;
        if (filtroMateria !== "" && n.materia !== filtroMateria) return;

        const coincideNombre = n.tarea.toLowerCase().includes(textoBusqueda);
        const coincideDetalle = (n.detalles || "").toLowerCase().includes(textoBusqueda);
        if (textoBusqueda !== "" && !coincideNombre && !coincideDetalle) return;

        if (n.tipo === "Tarea") {
            tareas.push(n);
        } else if (n.tipo === "Examen") {
            examenes.push(n);
        } else if (n.tipo === "Recuperatorio") {
            recuperatorios.push(n);
        }
    });

    tareas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    examenes.sort((a, b) => a.fecha.localeCompare(b.fecha));
    recuperatorios.sort((a, b) => a.fecha.localeCompare(b.fecha));

    return { tareas, examenes, recuperatorios };
}

export function establecerFiltroEstado(nuevoEstado, callbackRender) {
    state.filtroEstado = (state.filtroEstado === nuevoEstado) ? "" : nuevoEstado;
    if (typeof callbackRender === "function") callbackRender();
}

export function limpiarFiltros(callbackRender) {
    const selectMateria = document.getElementById("filtroMateria");
    const inputBuscar = document.getElementById("buscarTexto");

    if (selectMateria) selectMateria.value = "";
    if (inputBuscar) inputBuscar.value = "";
    state.filtroEstado = "";

    if (typeof callbackRender === "function") callbackRender();
    mostrarToast("Se muestran todas tus evaluaciones.", "info", "Filtros limpiados");
}

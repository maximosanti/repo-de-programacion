import { state, escaparHTML, prefijoNombre, obtenerColorMateria } from "./config-utilidades.js";
import { marcarErrorCampo, limpiarErrorCampo, mostrarToast, interpretarErrorConexion } from "./errores-alertas.js";
import { obtenerHorariosApi, crearHorarioApi, eliminarHorarioApi } from "./api.js";

// ---------- CARGA Y SINCRONIZACIÓN CON MYSQL ----------
export async function cargarHorario() {
    try {
        state.horariosCompletos = await obtenerHorariosApi();
    } catch (error) {
        state.horariosCompletos = [];
        interpretarErrorConexion(error, "cargar tu horario semanal");
    }
    renderizarHorario();
    actualizarCursadaHoy();
}

export async function agregarClaseHorario() {
    limpiarErrorCampo("horarioMateria");
    const dia = document.getElementById("horarioDia").value;
    const materia = document.getElementById("horarioMateria").value;
    const hora = document.getElementById("horarioHora").value.trim();

    if (materia === "") {
        marcarErrorCampo("horarioMateria", "Elegí una materia antes de agregarla.");
        mostrarToast(`${prefijoNombre()}seleccioná una materia para tu horario del ${dia}.`, "warning", "Falta la materia");
        return;
    }

    const btn = document.getElementById("btnAgregarHorario");
    const textoOriginal = btn.querySelector("span").textContent;
    btn.disabled = true;
    btn.querySelector("span").textContent = "Guardando...";

    try {
        await crearHorarioApi({ dia, materia, hora });
        document.getElementById("horarioHora").value = "";
        await cargarHorario();
        mostrarToast(`${materia} agregada al ${dia}.`, "success", "Horario actualizado");
    } catch (error) {
        interpretarErrorConexion(error, "guardar la materia en tu horario");
    } finally {
        btn.disabled = false;
        btn.querySelector("span").textContent = textoOriginal;
    }
}

export async function eliminarClaseHorario(id) {
    try {
        await eliminarHorarioApi(id);
        await cargarHorario();
        mostrarToast("Materia quitada del horario semanal.", "info", "Horario modificado");
    } catch (error) {
        interpretarErrorConexion(error, "quitar la materia del horario");
    }
}

function extraerMinutosHora(horaStr) {
    if (!horaStr) return 9999;
    const match = horaStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return 9998;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function ordenarClasesPorHora(clases) {
    return [...clases].sort((a, b) => {
        const minA = extraerMinutosHora(a.hora);
        const minB = extraerMinutosHora(b.hora);
        if (minA !== minB) return minA - minB;
        return a.materia.localeCompare(b.materia);
    });
}

// ---------- RENDERIZADO DEL HORARIO Y CURSADA ----------
export function renderizarHorario() {
    const contenedor = document.getElementById("gridHorarioSemanal");
    if (!contenedor) return;

    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const horario = state.horariosCompletos;

    contenedor.innerHTML = dias.map(dia => {
        const clases = ordenarClasesPorHora(horario.filter(c => c.dia === dia));
        const itemsHtml = clases.length === 0
            ? `<p class="detalle-vacio">Sin materias</p>`
            : clases.map(c => `
                <div class="clase-card">
                    <div>
                        <strong><span class="dot-materia" style="background:${obtenerColorMateria(c.materia)}"></span>${escaparHTML(c.materia)}</strong>
                        ${c.hora ? `<span class="clase-hora">${escaparHTML(c.hora)}</span>` : ""}
                    </div>
                    <button type="button" class="btn-borrar-clase" data-eliminar-clase="${c.id}" title="Quitar">✕</button>
                </div>
            `).join("");

        return `
            <div class="horario-columna">
                <h4>${dia}</h4>
                ${itemsHtml}
            </div>
        `;
    }).join("");
}

export function actualizarCursadaHoy() {
    const contenedor = document.getElementById("cursadaHoy");
    if (!contenedor) return;

    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const hoy = new Date();
    const nombreDia = diasSemana[hoy.getDay()];
    const horario = state.horariosCompletos;

    if (horario.length === 0) {
        contenedor.innerHTML = `
            <h4>🎒 Cursada de Hoy (${nombreDia})</h4>
            <p class="detalle-vacio">Aún no configuraste tu horario semanal. Podés cargarlo en la pestaña <strong>Mi Horario</strong>.</p>
        `;
        return;
    }

    const diaMostrar = (nombreDia === "Sábado" || nombreDia === "Domingo") ? "Lunes" : nombreDia;
    const tituloExtra = (nombreDia === "Sábado" || nombreDia === "Domingo") ? " (Próximo Lunes)" : "";
    const clasesDelDia = ordenarClasesPorHora(horario.filter(c => c.dia === diaMostrar));

    if (clasesDelDia.length === 0) {
        contenedor.innerHTML = `
            <h4>🎒 Cursada de Hoy${tituloExtra}</h4>
            <p class="detalle-vacio">No tenés materias cargadas para el ${diaMostrar}.</p>
        `;
        return;
    }

    const htmlClases = clasesDelDia.map(c => {
        const pendientesMateria = state.datosCompletos.filter(n => n.materia === c.materia && n.estado === "Pendiente").length;
        const textoPendiente = pendientesMateria === 1 ? "1 pendiente" : `${pendientesMateria} pendientes`;
        const alerta = pendientesMateria > 0
            ? `<span class="badge-alerta-clase">⚠ ${textoPendiente}</span>`
            : "";

        return `
            <div class="cursada-item">
                <span>
                    <span class="dot-materia" style="background:${obtenerColorMateria(c.materia)}"></span>
                    <strong>${escaparHTML(c.materia)}</strong>
                    ${c.hora ? `<small class="texto-tenue-inline"> (${escaparHTML(c.hora)})</small>` : ""}
                </span>
                ${alerta}
            </div>
        `;
    }).join("");

    contenedor.innerHTML = `
        <h4>🎒 Cursada de Hoy — ${diaMostrar}${tituloExtra}</h4>
        <div class="cursada-lista">${htmlClases}</div>
    `;
}

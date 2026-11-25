import {
    state,
    escaparHTML,
    obtenerPrimerNombre,
    prefijoNombre,
    formatearFechaISO,
    diferenciaDias,
    obtenerInicioSemana,
    obtenerColorMateria
} from "./config-utilidades.js";
import { mostrarToast } from "./errores-alertas.js";

// ---------- PANEL DE BIENVENIDA Y CONTADORES ----------
export function actualizarPanelBienvenida() {
    const contenedor = document.getElementById("panelBienvenida");
    const primerNombre = obtenerPrimerNombre();
    const saludo = primerNombre ? `¡Hola, ${escaparHTML(primerNombre)}!` : "¡Hola! Bienvenido/a a EduAgenda";

    if (state.datosCompletos.length === 0) {
        contenedor.innerHTML = `
            <h4>👋 ${saludo}</h4>
            <p class="bienvenida-vacio">Todavía no cargaste ninguna evaluación en tu agenda. Usá la pestaña <strong>Cargar Evaluación</strong> para empezar.</p>
        `;
        return;
    }

    const hoy = new Date();
    const hoyStr = formatearFechaISO(hoy);

    const pendientes = state.datosCompletos.filter(n => n.estado === "Pendiente").length;
    const completadas = state.datosCompletos.filter(n => n.estado === "Entregada" || n.estado.includes("Aprobado")).length;

    const proximas7Dias = state.datosCompletos.filter(n => {
        const diff = diferenciaDias(hoyStr, n.fecha);
        return diff >= 0 && diff <= 7;
    }).length;

    const proximas = state.datosCompletos
        .filter(n => n.fecha >= hoyStr)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

    let textoProxima = "No hay evaluaciones próximas.";
    if (proximas.length > 0) {
        const siguiente = proximas[0];
        const dias = diferenciaDias(hoyStr, siguiente.fecha);
        const textoDias = dias === 0 ? "hoy" : dias === 1 ? "mañana" : `faltan ${dias} días`;
        textoProxima = `${escaparHTML(siguiente.materia)} — ${escaparHTML(siguiente.tarea)} (${textoDias})`;
    }

    const inicioSemana = formatearFechaISO(obtenerInicioSemana(hoy));
    const completadasEstaSemana = state.datosCompletos.filter(n =>
        (n.estado === "Entregada" || n.estado.includes("Aprobado")) &&
        n.fecha >= inicioSemana && n.fecha <= hoyStr
    ).length;

    const textoSemana = completadasEstaSemana === 1 ? "1 evaluación" : `${completadasEstaSemana} evaluaciones`;

    contenedor.innerHTML = `
        <h4>👋 ${saludo} — Tu Resumen Actual</h4>
        <div class="bienvenida-datos">
            <span class="bienvenida-chip">📚 ${pendientes} pendientes</span>
            <span class="bienvenida-chip">📝 ${proximas7Dias} próximas (7 días)</span>
            <span class="bienvenida-chip">✅ ${completadas} completadas</span>
        </div>
        <p class="bienvenida-proxima">📅 Próxima evaluación: <strong>${textoProxima}</strong></p>
        <p class="bienvenida-semana">🗓️ Esta semana completaste ${textoSemana}.</p>
    `;
}

export function actualizarResumenStats() {
    const contenedor = document.getElementById("resumenStats");
    if (state.datosCompletos.length === 0) {
        contenedor.innerHTML = "";
        return;
    }

    const total = state.datosCompletos.length;
    const pendientes = state.datosCompletos.filter(n => n.estado === "Pendiente").length;
    const entregadas = state.datosCompletos.filter(n => n.estado === "Entregada").length;
    const aprobadas = state.datosCompletos.filter(n => n.estado.includes("Aprobado")).length;
    const desaprobadas = state.datosCompletos.filter(n => n.estado === "Desaprobado").length;

    const activo = (val) => state.filtroEstado === val ? "active" : "";

    contenedor.innerHTML = `
        <button type="button" class="stat-item stat-total ${activo("")}" data-filtro-estado="">${total} en total</button>
        <button type="button" class="stat-item stat-pendiente ${activo("Pendiente")}" data-filtro-estado="Pendiente">${pendientes} pendientes</button>
        <button type="button" class="stat-item stat-entregada ${activo("Entregada")}" data-filtro-estado="Entregada">${entregadas} entregadas</button>
        <button type="button" class="stat-item stat-aprobada ${activo("Aprobada")}" data-filtro-estado="Aprobada">${aprobadas} aprobadas</button>
        <button type="button" class="stat-item stat-desaprobada ${activo("Desaprobada")}" data-filtro-estado="Desaprobada">${desaprobadas} desaprobadas</button>
    `;
}

export function actualizarHoyManana() {
    const contenedor = document.getElementById("hoyManana");

    const hoy = new Date();
    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);

    const hoyStr = formatearFechaISO(hoy);
    const mananaStr = formatearFechaISO(manana);

    const proximas = state.datosCompletos.filter(n => n.fecha === hoyStr || n.fecha === mananaStr);

    if (proximas.length === 0) {
        contenedor.innerHTML = "";
        return;
    }

    proximas.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const itemsHtml = proximas.map(n => {
        const etiqueta = n.fecha === hoyStr ? "Hoy" : "Mañana";
        const claseUrgencia = n.fecha === hoyStr ? "urgente-hoy" : "urgente-manana";

        return `
            <div class="urgente-item ${claseUrgencia}">
                <span class="urgente-etiqueta">${etiqueta}</span>
                <strong>${escaparHTML(n.tarea)}</strong> — ${escaparHTML(n.materia)} (${escaparHTML(n.tipo)})
            </div>
        `;
    }).join("");

    contenedor.innerHTML = `<h4>⏰ Para hoy y mañana</h4>${itemsHtml}`;
}

// ---------- PROGRESO POR MATERIA ----------
export function actualizarProgresoMaterias() {
    const contenedor = document.getElementById("progresoMaterias");
    if (state.datosCompletos.length === 0) {
        contenedor.innerHTML = "";
        return;
    }

    const porMateria = {};

    state.datosCompletos.forEach(n => {
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
        const datos = porMateria[materia];
        const pctAprobadas = (datos.aprobadas / datos.total) * 100;
        const pctDesaprobadas = (datos.desaprobadas / datos.total) * 100;
        const pctEntregadas = (datos.entregadas / datos.total) * 100;
        const pctPendientes = (datos.pendientes / datos.total) * 100;

        html += `
            <div class="progreso-fila">
                <div class="progreso-encabezado">
                    <span><span class="dot-materia" style="background:${obtenerColorMateria(materia)}"></span>${escaparHTML(materia)}</span>
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

// ---------- CÁLCULO DE PROMEDIO Y SIMULADOR ----------
export function actualizarPromediosPorMateria() {
    const contenedor = document.getElementById("promediosPorMateria");
    if (!contenedor) return;

    const notasValidas = state.datosCompletos.filter(n =>
        n.nota !== null && n.nota !== undefined && n.nota !== "" && !isNaN(Number(n.nota))
    );

    if (notasValidas.length === 0) {
        contenedor.innerHTML = `<p class="detalle-vacio">Calificá tus evaluaciones para ver el promedio por materia.</p>`;
        return;
    }

    const agrupado = {};
    notasValidas.forEach(n => {
        if (!agrupado[n.materia]) agrupado[n.materia] = [];
        agrupado[n.materia].push(Number(n.nota));
    });

    const filas = Object.keys(agrupado).sort().map(materia => {
        const lista = agrupado[materia];
        const prom = lista.reduce((a, b) => a + b, 0) / lista.length;
        const claseNota = prom >= 6 ? "aprobada" : "desaprobada";
        const cantTexto = lista.length === 1 ? "1 nota" : `${lista.length} notas`;

        return `
            <div class="promedio-materia-item">
                <span><span class="dot-materia" style="background:${obtenerColorMateria(materia)}"></span><strong>${escaparHTML(materia)}</strong> <small class="texto-tenue-inline">(${cantTexto})</small></span>
                <span class="promedio-materia-nota ${claseNota}">${prom.toFixed(2)}</span>
            </div>
        `;
    }).join("");

    contenedor.innerHTML = filas;
}

export function calcularPromedio() {
    actualizarPromediosPorMateria();

    const notasValidas = state.datosCompletos.filter(n =>
        n.nota !== null && n.nota !== undefined && n.nota !== "" && !isNaN(Number(n.nota))
    );

    if (notasValidas.length === 0) {
        document.getElementById("promedio").textContent = "Sin notas cargadas para promediar.";
        mostrarToast(`${prefijoNombre()}todavía no tenés evaluaciones con nota para calcular el promedio.`, "info", "Sin calificaciones");
        return;
    }

    const suma = notasValidas.reduce((acc, curr) => acc + Number(curr.nota), 0);
    const promedio = suma / notasValidas.length;

    document.getElementById("promedio").textContent = `Promedio General: ${promedio.toFixed(2)}`;
    mostrarToast(`${prefijoNombre()}tu promedio actual es ${promedio.toFixed(2)}.`, "success", "Promedio calculado");
}

export function calcularSimulacion() {
    const box = document.getElementById("resultadoSimulador");
    if (!box) return;

    const materia = document.getElementById("simuladorMateria").value;
    const objetivo = parseFloat(document.getElementById("simuladorObjetivo").value);

    const filtradas = state.datosCompletos.filter(n =>
        n.nota !== null && n.nota !== undefined && n.nota !== "" && !isNaN(Number(n.nota)) &&
        (materia === "TODAS" || n.materia === materia)
    );

    if (filtradas.length === 0) {
        box.innerHTML = `Todavía no tenés notas cargadas para calcular. Si tu próxima evaluación es la primera, necesitás sacar al menos un <strong>${objetivo.toFixed(2)}</strong>.`;
        return;
    }

    const cantidad = filtradas.length;
    const suma = filtradas.reduce((acc, item) => acc + Number(item.nota), 0);
    const promedioActual = suma / cantidad;
    const notaNecesaria = (objetivo * (cantidad + 1)) - suma;
    const textoNotas = cantidad === 1 ? "1 nota" : `${cantidad} notas`;

    let mensajeExtra = "";
    if (notaNecesaria <= 1) {
        mensajeExtra = `¡Vas excelente! Incluso sacando un <strong>1.00</strong> mantenés un promedio igual o superior a ${objetivo.toFixed(2)}.`;
    } else if (notaNecesaria <= 10) {
        mensajeExtra = `Necesitás sacar al menos un <strong>${notaNecesaria.toFixed(2)}</strong> en tu próxima evaluación para alcanzar ${objetivo.toFixed(2)}.`;
    } else {
        mensajeExtra = `Con una sola evaluación no alcanza (necesitarías <strong>${notaNecesaria.toFixed(2)}</strong>). Vas a necesitar más de una instancia con notas altas.`;
    }

    box.innerHTML = `
        Promedio actual (${textoNotas}): <strong>${promedioActual.toFixed(2)}</strong>.<br>
        ${mensajeExtra}
    `;
}

// ---------- EXPORTACIÓN EXCEL (CSV) ----------
export function exportarCSV() {
    if (state.datosCompletos.length === 0) {
        mostrarToast(`${prefijoNombre()}cargá al menos una evaluación antes de exportar el archivo Excel.`, "warning", "Agenda vacía");
        return;
    }

    const filas = [["Materia", "Tipo", "Nombre", "Temario", "Nota", "Fecha", "Estado"]];

    state.datosCompletos.forEach(n => {
        filas.push([
            n.materia,
            n.tipo,
            n.tarea,
            n.detalles || "",
            n.nota !== null && n.nota !== undefined ? n.nota : "",
            n.fecha,
            n.estado
        ]);
    });

    const contenidoCSV = filas
        .map(fila => fila.map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "agenda_evaluaciones.csv";
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);

    mostrarToast("Archivo agenda_evaluaciones.csv descargado correctamente.", "success", "Exportación lista");
}

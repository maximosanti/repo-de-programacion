import { state, escaparHTML, formatearFechaISO } from "./config-utilidades.js";
import { limpiarErrorCampo } from "./errores-alertas.js";

// ---------- CALENDARIO VISIBLE EN INICIO ----------
let mesInicio = new Date().getMonth();
let anioInicio = new Date().getFullYear();
let fechaSeleccionadaInicio = null;

export function cambiarMesInicio(delta) {
    mesInicio += delta;
    if (mesInicio < 0) { mesInicio = 11; anioInicio--; }
    if (mesInicio > 11) { mesInicio = 0; anioInicio++; }
    renderCalendarioInicio();
}

export function renderCalendarioInicio() {
    const contenedor = document.getElementById("diasCalendarioInicio");
    if (!contenedor) return;

    const nombresMes = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById("mesAnioInicio").textContent = `${nombresMes[mesInicio]} ${anioInicio}`;

    const mapaFechas = {};
    state.datosCompletos.forEach(n => {
        if (!mapaFechas[n.fecha]) mapaFechas[n.fecha] = { tarea: false, recuperatorio: false };
        if (n.tipo === "Recuperatorio") {
            mapaFechas[n.fecha].recuperatorio = true;
        } else {
            mapaFechas[n.fecha].tarea = true;
        }
    });

    contenedor.innerHTML = "";
    const primerDiaSemana = new Date(anioInicio, mesInicio, 1).getDay();
    const totalDias = new Date(anioInicio, mesInicio + 1, 0).getDate();

    for (let i = 0; i < primerDiaSemana; i++) {
        const vacio = document.createElement("div");
        vacio.className = "dia-celda vacio-dia";
        contenedor.appendChild(vacio);
    }

    const hoyStr = formatearFechaISO(new Date());
    if (!fechaSeleccionadaInicio) fechaSeleccionadaInicio = hoyStr;

    for (let dia = 1; dia <= totalDias; dia++) {
        const mesStr = String(mesInicio + 1).padStart(2, "0");
        const diaStr = String(dia).padStart(2, "0");
        const fechaStr = `${anioInicio}-${mesStr}-${diaStr}`;

        const celda = document.createElement("div");
        celda.className = "dia-celda";
        celda.textContent = dia;

        const info = mapaFechas[fechaStr];
        if (info) {
            if (info.tarea && info.recuperatorio) celda.classList.add("con-ambos");
            else if (info.recuperatorio) celda.classList.add("con-recuperatorio");
            else celda.classList.add("con-tarea");
        }

        if (fechaStr === hoyStr) celda.classList.add("hoy");
        if (fechaStr === fechaSeleccionadaInicio) celda.classList.add("seleccionado");

        celda.addEventListener("click", () => {
            fechaSeleccionadaInicio = fechaStr;
            renderCalendarioInicio();
        });

        contenedor.appendChild(celda);
    }

    mostrarDetalleDiaInicio(fechaSeleccionadaInicio);
}

function mostrarDetalleDiaInicio(fechaStr) {
    const box = document.getElementById("detalleDiaCalendario");
    if (!box) return;

    const delDia = state.datosCompletos.filter(n => n.fecha === fechaStr);
    if (delDia.length === 0) {
        box.innerHTML = `<p class="detalle-vacio">Sin evaluaciones para el <strong>${escaparHTML(fechaStr)}</strong>.</p>`;
        return;
    }

    box.innerHTML = delDia.map(n => `
        <div class="detalle-item-dia">
            <strong>${escaparHTML(n.materia)}</strong> — ${escaparHTML(n.tarea)} (${escaparHTML(n.tipo)})
            <br><span class="texto-tenue-inline">Estado: ${escaparHTML(n.estado)}${n.nota ? ` | Nota: ${escaparHTML(n.nota)}` : ""}</span>
            ${n.detalles ? `<br><span class="texto-secundario-inline">Temario: ${escaparHTML(n.detalles)}</span>` : ""}
        </div>
    `).join("");
}

// ---------- CALENDARIO POPUP DEL FORMULARIO ----------
let mesCalendario, anioCalendario;

export function toggleCalendarioGrande() {
    const cal = document.getElementById("calendarioGrande");

    if (cal.style.display === "none" || cal.style.display === "") {
        const fechaInput = document.getElementById("fecha").value;
        let base = fechaInput ? new Date(fechaInput + "T00:00:00") : new Date();
        if (isNaN(base.getTime())) base = new Date();

        mesCalendario = base.getMonth();
        anioCalendario = base.getFullYear();
        renderCalendario();
        cal.style.display = "flex";
    } else {
        cal.style.display = "none";
    }
}

export function cerrarCalendarioGrande() {
    const cal = document.getElementById("calendarioGrande");
    if (cal) cal.style.display = "none";
}

export function cambiarMes(delta) {
    mesCalendario += delta;
    if (mesCalendario < 0) { mesCalendario = 11; anioCalendario--; }
    if (mesCalendario > 11) { mesCalendario = 0; anioCalendario++; }
    renderCalendario();
}

function renderCalendario() {
    const nombresMes = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById("mesAnioLabel").textContent = `${nombresMes[mesCalendario]} ${anioCalendario}`;

    const mapaFechas = {};
    state.datosCompletos.forEach(n => {
        if (!mapaFechas[n.fecha]) mapaFechas[n.fecha] = { tarea: false, recuperatorio: false };
        if (n.tipo === "Recuperatorio") {
            mapaFechas[n.fecha].recuperatorio = true;
        } else {
            mapaFechas[n.fecha].tarea = true;
        }
    });

    const contenedor = document.getElementById("diasCalendario");
    contenedor.innerHTML = "";

    const primerDiaSemana = new Date(anioCalendario, mesCalendario, 1).getDay();
    const totalDias = new Date(anioCalendario, mesCalendario + 1, 0).getDate();

    for (let i = 0; i < primerDiaSemana; i++) {
        const vacio = document.createElement("div");
        vacio.className = "dia-celda vacio-dia";
        contenedor.appendChild(vacio);
    }

    const hoy = new Date();

    for (let dia = 1; dia <= totalDias; dia++) {
        const mesStr = String(mesCalendario + 1).padStart(2, "0");
        const diaStr = String(dia).padStart(2, "0");
        const fechaStr = `${anioCalendario}-${mesStr}-${diaStr}`;

        const celda = document.createElement("div");
        celda.className = "dia-celda";
        celda.textContent = dia;

        const info = mapaFechas[fechaStr];
        if (info) {
            if (info.tarea && info.recuperatorio) celda.classList.add("con-ambos");
            else if (info.recuperatorio) celda.classList.add("con-recuperatorio");
            else celda.classList.add("con-tarea");
        }

        if (hoy.getFullYear() === anioCalendario && hoy.getMonth() === mesCalendario && hoy.getDate() === dia) {
            celda.classList.add("hoy");
        }

        celda.addEventListener("click", () => {
            document.getElementById("fecha").value = fechaStr;
            limpiarErrorCampo("fecha");
            cerrarCalendarioGrande();
        });

        contenedor.appendChild(celda);
    }
}

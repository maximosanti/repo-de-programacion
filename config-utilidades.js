// ---------- CONFIGURACIÓN Y ESTADO GLOBAL COMPARTIDO ----------
export const API_URL = "http://localhost/backend-php";

export const state = {
    datosCompletos: [],
    horariosCompletos: [],
    idEditando: null,
    idCalificando: null,
    modoCalificacion: "calificar",
    accionConfirmacionModal: null,
    filtroEstado: ""
};

// ---------- MATERIAS Y COLORES CENTRALIZADOS ----------
export const coloresPorMateria = {
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

export function obtenerColorMateria(materia) {
    return coloresPorMateria[materia] || "#94a3b8";
}

export function poblarSelectsMaterias() {
    const idsSelects = ["materia", "filtroMateria", "horarioMateria", "simuladorMateria"];
    const materias = Object.keys(coloresPorMateria);

    idsSelects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        materias.forEach(materia => {
            const option = document.createElement("option");
            option.value = materia;
            option.textContent = materia;
            select.appendChild(option);
        });
    });
}

// ---------- ICONOS Y UTILIDADES DE TEXTO ----------
export function actualizarIconos() {
    if (window.lucide) window.lucide.createIcons();
}

export function escaparHTML(texto) {
    if (!texto) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function obtenerPrimerNombre() {
    const nombreGuardado = localStorage.getItem("nombreUsuario");
    if (nombreGuardado && nombreGuardado.trim() !== "") {
        return nombreGuardado.trim().split(" ")[0];
    }
    const correo = localStorage.getItem("correo") || "";
    if (correo.includes("@")) {
        const parteUsuario = correo.split("@")[0].split(".")[0];
        return parteUsuario.charAt(0).toUpperCase() + parteUsuario.slice(1);
    }
    return "";
}

export function prefijoNombre() {
    const nombre = obtenerPrimerNombre();
    return nombre ? `${nombre}, ` : "";
}

// ---------- UTILIDADES DE FECHAS ----------
export function formatearFechaISO(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

export function diferenciaDias(fechaBaseStr, fechaObjetivoStr) {
    const base = new Date(fechaBaseStr + "T00:00:00");
    const objetivo = new Date(fechaObjetivoStr + "T00:00:00");
    const diffMs = objetivo - base;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function obtenerInicioSemana(fecha) {
    const copia = new Date(fecha);
    const dia = copia.getDay();
    const diff = dia === 0 ? 6 : dia - 1;
    copia.setDate(copia.getDate() - diff);
    return copia;

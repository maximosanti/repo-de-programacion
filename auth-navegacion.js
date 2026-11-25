import {
    poblarSelectsMaterias,
    escaparHTML,
    obtenerPrimerNombre,
    prefijoNombre,
    actualizarIconos
} from "./config-utilidades.js";
import {
    mostrarToast,
    marcarErrorCampo,
    limpiarErrorCampo,
    limpiarTodosLosErrores,
    mostrarModalAlerta,
    cerrarModalAlerta,
    ejecutarConfirmacionModal,
    interpretarErrorConexion
} from "./errores-alertas.js";
import { loginApi, logoutApi, eliminarTodasApi } from "./api.js";
import { establecerFiltroEstado, limpiarFiltros } from "./filtros.js";
import {
    cambiarMesInicio,
    toggleCalendarioGrande,
    cambiarMes,
    cerrarCalendarioGrande
} from "./calendario.js";
import {
    cargarHorario,
    agregarClaseHorario,
    eliminarClaseHorario
} from "./horario.js";
import {
    calcularPromedio,
    calcularSimulacion,
    exportarCSV
} from "./metricas.js";
import {
    agregarTarea,
    editar,
    cancelarEdicion,
    abrirModalCalificar,
    cerrarModalCalificar,
    confirmarCalificacion,
    cargarNotas,
    renderizarListas,
    marcarEntrega,
    eliminar,
    abrirGoogleCalendar
} from "./evaluaciones.js";

// ---------- TEMA OSCURO / CLARO ----------
function aplicarTema(tema) {
    const temaValido = tema === "claro" ? "claro" : "oscuro";
    document.documentElement.setAttribute("data-tema", temaValido);
    localStorage.setItem("temaEduAgenda", temaValido);

    const esClaro = temaValido === "claro";
    const icono = esClaro ? "moon" : "sun";
    const texto = esClaro ? "Modo Oscuro" : "Modo Claro";

    ["btnTemaLogin", "btnTemaDashboard"].forEach(idBtn => {
        const btn = document.getElementById(idBtn);
        if (!btn) return;
        btn.innerHTML = `<i data-lucide="${icono}"></i><span>${texto}</span>`;
    });

    actualizarIconos();
}

function alternarTema() {
    const actual = document.documentElement.getAttribute("data-tema") || "oscuro";
    aplicarTema(actual === "oscuro" ? "claro" : "oscuro");
}

// ---------- NAVEGACIÓN ENTRE PESTAÑAS ----------
const titulosPorTab = {
    inicio: "Panel General",
    nueva: "Cargar Evaluación",
    evaluaciones: "Mis Evaluaciones",
    horario: "Mi Horario Semanal",
    metricas: "Métricas y Reportes"
};

function cambiarTab(nombreTab) {
    limpiarTodosLosErrores();

    document.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.remove("active");
    });

    document.querySelectorAll(".nav-tab").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === nombreTab);
    });

    const tabSeleccionada = document.getElementById(`tab-${nombreTab}`);
    if (tabSeleccionada) {
        tabSeleccionada.classList.add("active");
    }

    const tituloTopbar = document.getElementById("topbarTituloVista");
    if (tituloTopbar && titulosPorTab[nombreTab]) {
        tituloTopbar.textContent = titulosPorTab[nombreTab];
    }

    if (nombreTab === "metricas") {
        calcularSimulacion();
    }

    actualizarIconos();
}

// ---------- AUTENTICACIÓN Y RESETEO ----------
async function login() {
    limpiarTodosLosErrores();

    const nombreUsuario = document.getElementById("nombreUsuario").value.trim();
    const correo = document.getElementById("correo").value.trim().toLowerCase();

    if (nombreUsuario.length < 2) {
        marcarErrorCampo("nombreUsuario", "Ingresá tu nombre y apellido para personalizar tu agenda.");
        mostrarToast("Necesitamos tu nombre para continuar.", "warning", "Falta tu nombre");
        return;
    }

    if (correo === "") {
        marcarErrorCampo("correo", "Ingresá tu correo institucional.");
        mostrarToast("Escribí tu correo antes de ingresar.", "warning", "Falta el correo");
        return;
    }

    if (!correo.endsWith("@escuelasproa.edu.ar")) {
        const primerNombre = nombreUsuario.split(" ")[0];
        marcarErrorCampo("correo", "Debe ser una cuenta institucional (@escuelasproa.edu.ar).");
        mostrarToast(`${primerNombre}, usá tu correo terminado en @escuelasproa.edu.ar.`, "error", "Correo no válido");
        return;
    }

    const btnLogin = document.getElementById("btnLogin");
    const spanLogin = btnLogin.querySelector("span");
    btnLogin.disabled = true;
    spanLogin.textContent = "Ingresando...";

    try {
        const usuario = await loginApi(correo, nombreUsuario);

        localStorage.setItem("usuarioId", usuario.id);
        localStorage.setItem("correo", usuario.correo);
        localStorage.setItem("nombreUsuario", usuario.nombre || nombreUsuario);

        mostrarAgenda(usuario.correo, usuario.nombre || nombreUsuario);
        await Promise.all([cargarNotas(), cargarHorario()]);
        calcularSimulacion();
        mostrarToast(`¡Bienvenido/a de nuevo, ${obtenerPrimerNombre()}!`, "success", "Sesión iniciada");
    } catch (error) {
        interpretarErrorConexion(error, "iniciar sesión");
    } finally {
        btnLogin.disabled = false;
        spanLogin.textContent = "Ingresar";
    }
}

function mostrarAgenda(correo, nombre = "") {
    document.getElementById("pantallaLogin").style.display = "none";
    document.getElementById("pantallaAgenda").style.display = "grid";
    const saludo = nombre ? `${nombre} (${correo})` : correo;
    document.getElementById("usuario").textContent = "Estudiante: " + saludo;
    actualizarIconos();
}

async function logout(mensajeOpcional = "") {
    try {
        await logoutApi();
    } catch (_) {
        // Ignorar errores de red al cerrar sesión
    }
    localStorage.removeItem("usuarioId");
    localStorage.removeItem("correo");
    localStorage.removeItem("nombreUsuario");

    document.getElementById("pantallaAgenda").style.display = "none";
    document.getElementById("pantallaLogin").style.display = "grid";
    if (mensajeOpcional) {
        mostrarToast(mensajeOpcional, "warning", "Sesión finalizada");
    }
}

function borrarDatos() {
    const nombre = obtenerPrimerNombre();
    const saludo = nombre ? `<strong>${escaparHTML(nombre)}</strong>, ¿estás` : "¿Estás";

    mostrarModalAlerta({
        titulo: "Resetear toda la agenda",
        mensaje: `${saludo} seguro de que querés eliminar <strong>todas</strong> tus evaluaciones registradas? Esta acción no se puede deshacer.`,
        tipo: "warning",
        textoConfirmar: "Sí, borrar todo",
        textoCancelar: "Cancelar",
        alConfirmar: async () => {
            try {
                await eliminarTodasApi();
                await cargarNotas();
                document.getElementById("promedio").textContent = "";
                const promMat = document.getElementById("promediosPorMateria");
                if (promMat) promMat.innerHTML = "";
                mostrarToast(`${prefijoNombre()}se borraron todos los registros de tu agenda.`, "info", "Agenda vaciada");
            } catch (error) {
                interpretarErrorConexion(error, "borrar los datos");
            }
        }
    });
}

// ---------- INICIALIZACIÓN Y EVENTOS ----------
function registrarEventos() {
    // Selector de tema Oscuro / Claro
    const btnTemaLogin = document.getElementById("btnTemaLogin");
    const btnTemaDashboard = document.getElementById("btnTemaDashboard");
    if (btnTemaLogin) btnTemaLogin.addEventListener("click", alternarTema);
    if (btnTemaDashboard) btnTemaDashboard.addEventListener("click", alternarTema);

    // Login
    document.getElementById("formLogin").addEventListener("submit", (e) => {
        e.preventDefault();
        login();
    });
    document.getElementById("nombreUsuario").addEventListener("input", () => limpiarErrorCampo("nombreUsuario"));
    document.getElementById("correo").addEventListener("input", () => limpiarErrorCampo("correo"));

    // Header y navegación
    document.getElementById("btnLogout").addEventListener("click", () => logout());
    document.getElementById("btnBorrarDatos").addEventListener("click", borrarDatos);

    document.querySelectorAll(".nav-tab").forEach(btn => {
        btn.addEventListener("click", () => cambiarTab(btn.dataset.tab));
    });

    const btnAccesoRapidoNueva = document.getElementById("btnAccesoRapidoNueva");
    if (btnAccesoRapidoNueva) {
        btnAccesoRapidoNueva.addEventListener("click", () => cambiarTab("nueva"));
    }

    // Calendario Inicio
    document.getElementById("btnMesInicioPrev").addEventListener("click", () => cambiarMesInicio(-1));
    document.getElementById("btnMesInicioNext").addEventListener("click", () => cambiarMesInicio(1));

    // Formulario de Evaluaciones
    document.getElementById("materia").addEventListener("change", () => limpiarErrorCampo("materia"));
    document.getElementById("tipo").addEventListener("change", () => limpiarErrorCampo("tipo"));
    document.getElementById("tarea").addEventListener("input", () => limpiarErrorCampo("tarea"));
    document.getElementById("tarea").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            agregarTarea(cambiarTab);
        }
    });
    document.getElementById("fecha").addEventListener("change", () => limpiarErrorCampo("fecha"));
    document.getElementById("btnToggleCalendario").addEventListener("click", toggleCalendarioGrande);
    document.getElementById("btnMesFormPrev").addEventListener("click", () => cambiarMes(-1));
    document.getElementById("btnMesFormNext").addEventListener("click", () => cambiarMes(1));
    document.getElementById("botonAgregar").addEventListener("click", () => agregarTarea(cambiarTab));
    document.getElementById("botonCancelarEdicion").addEventListener("click", cancelarEdicion);

    // Filtros y píldoras de estado
    document.getElementById("filtroMateria").addEventListener("change", renderizarListas);
    document.getElementById("buscarTexto").addEventListener("input", renderizarListas);
    document.getElementById("btnLimpiarFiltros").addEventListener("click", () => limpiarFiltros(renderizarListas));

    document.getElementById("resumenStats").addEventListener("click", (e) => {
        const pill = e.target.closest("[data-filtro-estado]");
        if (!pill) return;
        establecerFiltroEstado(pill.dataset.filtroEstado, renderizarListas);
    });

    // Delegación de acciones en tarjetas de Evaluaciones
    ["listaTareas", "listaExamenes", "listaRecuperatorios"].forEach(idLista => {
        document.getElementById(idLista).addEventListener("click", (e) => {
            const btn = e.target.closest("[data-accion]");
            if (!btn) return;
            const id = btn.dataset.id;
            const accion = btn.dataset.accion;

            if (accion === "editar") editar(id, cambiarTab);
            else if (accion === "entregar") marcarEntrega(id);
            else if (accion === "calificar") abrirModalCalificar(id, "calificar");
            else if (accion === "recuperar") abrirModalCalificar(id, "recuperar");
            else if (accion === "gcal") abrirGoogleCalendar(id);
            else if (accion === "eliminar") eliminar(id);
        });
    });

    // Horario Semanal
    document.getElementById("horarioMateria").addEventListener("change", () => limpiarErrorCampo("horarioMateria"));
    document.getElementById("horarioHora").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            agregarClaseHorario();
        }
    });
    document.getElementById("btnAgregarHorario").addEventListener("click", agregarClaseHorario);
    document.getElementById("gridHorarioSemanal").addEventListener("click", (e) => {
        const btnBorrar = e.target.closest("[data-eliminar-clase]");
        if (!btnBorrar) return;
        eliminarClaseHorario(btnBorrar.dataset.eliminarClase);
    });

    // Métricas y Simulador
    document.getElementById("btnCalcularPromedio").addEventListener("click", calcularPromedio);
    document.getElementById("btnExportarCSV").addEventListener("click", exportarCSV);
    document.getElementById("simuladorMateria").addEventListener("change", calcularSimulacion);
    document.getElementById("simuladorObjetivo").addEventListener("change", calcularSimulacion);

    // Modales y accesibilidad con teclado / clic exterior
    const modalCalificar = document.getElementById("modalCalificar");
    const modalAlerta = document.getElementById("modalAlerta");

    document.getElementById("modalCalificarInput").addEventListener("input", () => limpiarErrorCampo("modalCalificarInput"));
    document.getElementById("modalCalificarInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            confirmarCalificacion();
        }
    });
    document.getElementById("btnCancelarCalificar").addEventListener("click", cerrarModalCalificar);
    document.getElementById("btnConfirmarCalificar").addEventListener("click", confirmarCalificacion);

    document.getElementById("modalAlertaBtnCancelar").addEventListener("click", cerrarModalAlerta);
    document.getElementById("modalAlertaBtnConfirmar").addEventListener("click", ejecutarConfirmacionModal);

    modalCalificar.addEventListener("click", (e) => {
        if (e.target === modalCalificar) cerrarModalCalificar();
    });
    modalAlerta.addEventListener("click", (e) => {
        if (e.target === modalAlerta) cerrarModalAlerta();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            cerrarModalCalificar();
            cerrarModalAlerta();
            cerrarCalendarioGrande();
        }
    });

    // Sesión expirada en PHP
    window.addEventListener("eduagenda:sesion-expirada", () => {
        logout("Tu sesión expiró. Volvé a ingresar con tu correo institucional.");
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const temaGuardado = localStorage.getItem("temaEduAgenda") || "oscuro";
    aplicarTema(temaGuardado);

    poblarSelectsMaterias();
    registrarEventos();
    actualizarIconos();

    const usuarioId = localStorage.getItem("usuarioId");
    const correo = localStorage.getItem("correo");
    const nombre = localStorage.getItem("nombreUsuario");

    if (usuarioId && usuarioId !== "undefined" && usuarioId !== "null") {
        mostrarAgenda(correo, nombre);
        await Promise.all([cargarNotas(), cargarHorario()]);
        calcularSimulacion();
    } else {
        document.getElementById("pantallaLogin").style.display = "grid";
        document.getElementById("pantallaAgenda").style.display = "none";
    }
});

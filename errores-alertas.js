import { state, escaparHTML, obtenerPrimerNombre, actualizarIconos } from "./config-utilidades.js";

// ---------- NOTIFICACIONES TOAST ----------
export function mostrarToast(mensaje, tipo = "success", tituloPersonalizado = "") {
    const contenedor = document.getElementById("toastContainer");
    if (!contenedor) return;

    const configuracion = {
        error:   { icono: "alert-circle",   titulo: "No se pudo completar" },
        warning: { icono: "alert-triangle", titulo: "Revisá este dato" },
        success: { icono: "check-circle-2", titulo: "¡Listo!" },
        info:    { icono: "info",           titulo: "Información" }
    };

    const cfg = configuracion[tipo] || configuracion.info;
    const tituloFinal = tituloPersonalizado || cfg.titulo;

    const item = document.createElement("div");
    item.className = `toast-item toast-${tipo}`;
    item.innerHTML = `
        <div class="toast-icon"><i data-lucide="${cfg.icono}"></i></div>
        <div class="toast-body">
            <span class="toast-titulo">${escaparHTML(tituloFinal)}</span>
            <span>${escaparHTML(mensaje)}</span>
        </div>
        <button type="button" class="toast-cerrar" title="Cerrar">✕</button>
    `;

    item.querySelector(".toast-cerrar").addEventListener("click", () => item.remove());
    contenedor.appendChild(item);
    actualizarIconos();

    const duracion = (tipo === "error" || tipo === "warning") ? 4500 : 2800;
    setTimeout(() => {
        if (item.parentElement) item.remove();
    }, duracion);
}

// ---------- VALIDACIÓN VISUAL DE CAMPOS ----------
export function marcarErrorCampo(idCampo, mensaje) {
    const campo = document.getElementById(idCampo);
    const textoError = document.getElementById(`error-${idCampo}`);

    if (campo) {
        campo.classList.remove("campo-invalido");
        void campo.offsetWidth;
        campo.classList.add("campo-invalido");
        campo.focus();
    }

    if (textoError) {
        textoError.textContent = mensaje;
        textoError.classList.add("visible");
    }
}

export function limpiarErrorCampo(idCampo) {
    const campo = document.getElementById(idCampo);
    const textoError = document.getElementById(`error-${idCampo}`);
    if (campo) campo.classList.remove("campo-invalido");
    if (textoError) {
        textoError.textContent = "";
        textoError.classList.remove("visible");
    }
}

export function limpiarTodosLosErrores() {
    document.querySelectorAll(".campo-invalido").forEach(el => el.classList.remove("campo-invalido"));
    document.querySelectorAll(".mensaje-campo-error").forEach(el => {
        el.textContent = "";
        el.classList.remove("visible");
    });
}

// ---------- MODALES PERSONALIZADOS DE ERROR Y CONFIRMACIÓN ----------
export function mostrarModalAlerta({
    titulo = "Aviso de EduAgenda",
    mensaje = "",
    tipo = "error",
    textoConfirmar = "Entendido",
    textoCancelar = "",
    alConfirmar = null
}) {
    const modal = document.getElementById("modalAlerta");
    const iconoBox = document.getElementById("modalAlertaIconoBox");
    const tituloEl = document.getElementById("modalAlertaTitulo");
    const mensajeEl = document.getElementById("modalAlertaMensaje");
    const btnConfirmar = document.getElementById("modalAlertaBtnConfirmar");
    const btnCancelar = document.getElementById("modalAlertaBtnCancelar");

    const iconos = {
        error: "server-crash",
        warning: "alert-triangle",
        info: "info"
    };

    iconoBox.className = `modal-alerta-icono ${tipo}`;
    iconoBox.innerHTML = `<i data-lucide="${iconos[tipo] || 'alert-circle'}"></i>`;
    tituloEl.textContent = titulo;
    mensajeEl.innerHTML = mensaje;

    btnConfirmar.textContent = textoConfirmar;
    btnConfirmar.className = tipo === "warning" ? "btn-danger" : "btn-primary";

    if (textoCancelar) {
        btnCancelar.textContent = textoCancelar;
        btnCancelar.style.display = "inline-flex";
    } else {
        btnCancelar.style.display = "none";
    }

    state.accionConfirmacionModal = alConfirmar;
    modal.style.display = "flex";
    actualizarIconos();
}

export function cerrarModalAlerta() {
    document.getElementById("modalAlerta").style.display = "none";
    state.accionConfirmacionModal = null;
}

export async function ejecutarConfirmacionModal() {
    const callback = state.accionConfirmacionModal;
    cerrarModalAlerta();
    if (typeof callback === "function") {
        await callback();
    }
}

export function interpretarErrorConexion(error, contexto = "realizar la operación") {
    if (error && error.message === "SESION_EXPIRADA") return;

    console.error(error);
    const nombre = obtenerPrimerNombre();
    const saludo = nombre ? `<strong>${escaparHTML(nombre)}</strong>, no` : "No";

    if (error && error.message && error.message !== "Failed to fetch") {
        mostrarModalAlerta({
            titulo: "Error en el servidor",
            mensaje: `${saludo} pudimos ${contexto}.<br><br><strong>Detalle técnico:</strong> ${escaparHTML(error.message)}`,
            tipo: "error"
        });
    } else {
        mostrarModalAlerta({
            titulo: "Sin conexión con el servidor",
            mensaje: `${saludo} pudimos conectarnos con XAMPP para ${contexto}.<br><br>Verificá que:<br>• <strong>Apache</strong> y <strong>MySQL (puerto 3307)</strong> estén encendidos en XAMPP.<br>• Estés abriendo la página desde <code>http://localhost/...</code>.`,
            tipo: "error"
        });
    }
}

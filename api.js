import { API_URL } from "./config-utilidades.js";

// ---------- AGREGAR ID DE USUARIO A LA URL ----------
function agregarUidUrl(url) {
    const usuarioId = localStorage.getItem("usuarioId");
    if (!usuarioId || usuarioId === "undefined" || usuarioId === "null") {
        return url;
    }
    const separador = url.includes("?") ? "&" : "?";
    return `${url}${separador}uid=${encodeURIComponent(usuarioId)}`;
}

// ---------- MANEJADOR DE RESPUESTAS HTTP ----------
async function manejarRespuestaApi(respuesta, mensajePorDefecto) {
    let datos = null;
    try {
        datos = await respuesta.json();
    } catch (_) {
        datos = null;
    }

    if (respuesta.status === 401) {
        window.dispatchEvent(new Event("eduagenda:sesion-expirada"));
        throw new Error("SESION_EXPIRADA");
    }

    if (!respuesta.ok) {
        const mensajeServidor = (datos && (datos.error || datos.mensaje))
            ? (datos.error || datos.mensaje)
            : mensajePorDefecto;
        throw new Error(mensajeServidor);
    }
    return datos;
}

// ---------- ENDPOINTS DE AUTENTICACIÓN ----------
export async function loginApi(correo, nombre) {
    const respuesta = await fetch(`${API_URL}/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, nombre })
    });
    return await manejarRespuestaApi(respuesta, "El servidor respondió con un error al iniciar sesión.");
}

export async function logoutApi() {
    await fetch(agregarUidUrl(`${API_URL}/login.php?accion=logout`), {
        method: "POST"
    });
}

// ---------- ENDPOINTS DE EVALUACIONES ----------
export async function obtenerEvaluaciones() {
    const respuesta = await fetch(agregarUidUrl(`${API_URL}/evaluaciones.php`), {
        cache: "no-store"
    });
    return await manejarRespuestaApi(respuesta, "No se pudieron obtener las evaluaciones desde la base de datos.");
}

export async function crearEvaluacionApi(evaluacion) {
    const respuesta = await fetch(agregarUidUrl(`${API_URL}/evaluaciones.php`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evaluacion)
    });
    return await manejarRespuestaApi(respuesta, "Error al guardar la evaluación en la base de datos.");
}

export async function actualizarEvaluacionApi(evaluacion) {
    const respuesta = await fetch(agregarUidUrl(`${API_URL}/evaluaciones.php`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evaluacion)
    });
    return await manejarRespuestaApi(respuesta, "Error al actualizar la evaluación en la base de datos.");
}

export async function eliminarEvaluacionApi(id) {
    const respuesta = await fetch(agregarUidUrl(`${API_URL}/evaluaciones.php?id=${encodeURIComponent(id)}`), {
        method: "DELETE"
    });
    return await manejarRespuestaApi(respuesta, "Error al eliminar la evaluación.");
}

export async function eliminarTodasApi() {
    const respuesta = await fetch(agregarUidUrl(`${API_URL}/evaluaciones.php?todas=1`), {
        method: "DELETE"
    });
    return await manejarRespuestaApi(respuesta, "Error al resetear los registros.");
}

// ---------- ENDPOINTS DE HORARIO SEMANAL ----------
export async function obtenerHorariosApi() {
    const respuesta = await fetch(agregarUidUrl(`${API_URL}/horarios.php`), {
        cache: "no-store"
    });
    return await manejarRespuestaApi(respuesta, "No se pudo cargar tu horario semanal.");
}

export async function crearHorarioApi(clase) {
    const respuesta = await fetch(agregarUidUrl(`${API_URL}/horarios.php`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clase)
    });
    return await manejarRespuestaApi(respuesta, "No se pudo agregar la materia al horario.");
}

export async function eliminarHorarioApi(id) {
    const respuesta = await fetch(agregarUidUrl(`${API_URL}/horarios.php?id=${encodeURIComponent(id)}`), {
        method: "DELETE"
    });
    return await manejarRespuestaApi(respuesta, "No se pudo quitar la materia del horario.");
}

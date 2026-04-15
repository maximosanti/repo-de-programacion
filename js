// ---------- AL CARGAR ----------
window.onload = function(){

// SI NO hay usuario → mostrar login
let usuario = localStorage.getItem("usuario");

if(usuario){

mostrarAgenda(usuario);
cargarNotas();

}else{

document.getElementById("pantallaLogin").style.display = "block";
document.getElementById("pantallaAgenda").style.display = "none";

}

}


// ---------- LOGIN ----------
function login(){

let correo = document.getElementById("correo").value;

if(correo.endsWith("@escuelasproa.edu.ar")){

localStorage.setItem("usuario", correo);

mostrarAgenda(correo);
cargarNotas();

}else{

alert("Usa tu correo institucional");

}

}


// ---------- MOSTRAR AGENDA ----------
function mostrarAgenda(usuario){

document.getElementById("pantallaLogin").style.display = "none";
document.getElementById("pantallaAgenda").style.display = "block";

document.getElementById("usuario").textContent =
"Bienvenido: " + usuario;

}


// ---------- LOGOUT ----------
function logout(){

localStorage.removeItem("usuario");
location.reload();

}


// ---------- AGREGAR ----------
function agregarTarea(){

let tarea = document.getElementById("tarea").value;
let materia = document.getElementById("materia").value;
let nota = document.getElementById("nota").value;
let fecha = document.getElementById("fecha").value;

if(tarea === "" || nota === "" || fecha === ""){
alert("Completa todo");
return;
}

let estado = nota >= 6 ? "Aprobado" : "Desaprobado";

let nuevaNota = {tarea, materia, nota, fecha, estado};

let usuario = localStorage.getItem("usuario");

let datos = JSON.parse(localStorage.getItem(usuario)) || [];

datos.push(nuevaNota);

localStorage.setItem(usuario, JSON.stringify(datos));

cargarNotas();
limpiarCampos();

}


// ---------- CARGAR ----------
function cargarNotas(){

let lista = document.getElementById("lista");
lista.innerHTML = "";

let usuario = localStorage.getItem("usuario");
let datos = JSON.parse(localStorage.getItem(usuario)) || [];

datos.forEach((n, index) => {

let li = document.createElement("li");

li.innerHTML = `
<div class="tarea-info">
<strong>${n.tarea}</strong>
<span>${n.materia}</span>
<span>${n.fecha}</span>
<span class="nota">Nota: ${n.nota}</span>
<span class="estado">${n.estado}</span>
</div>

<div>
<button onclick="recuperar(${index})">Recuperar</button>
<button class="eliminar" onclick="eliminar(${index})">X</button>
</div>
`;

lista.appendChild(li);

});

}


// ---------- ELIMINAR ----------
function eliminar(index){

let usuario = localStorage.getItem("usuario");
let datos = JSON.parse(localStorage.getItem(usuario));

datos.splice(index,1);

localStorage.setItem(usuario, JSON.stringify(datos));

cargarNotas();

}


// ---------- RECUPERATORIO ----------
function recuperar(index){

let usuario = localStorage.getItem("usuario");
let datos = JSON.parse(localStorage.getItem(usuario));

datos[index].estado = "Aprobado (Recuperatorio)";

localStorage.setItem(usuario, JSON.stringify(datos));

cargarNotas();

}


// ---------- PROMEDIO ----------
function calcularPromedio(){

let usuario = localStorage.getItem("usuario");
let datos = JSON.parse(localStorage.getItem(usuario)) || [];

if(datos.length === 0){
document.getElementById("promedio").textContent = "Sin notas";
return;
}

let suma = 0;

datos.forEach(n => suma += parseFloat(n.nota));

let promedio = suma / datos.length;

document.getElementById("promedio").textContent =
"Promedio general: " + promedio.toFixed(2);

}


// ---------- LIMPIAR ----------
function limpiarCampos(){

document.getElementById("tarea").value="";
document.getElementById("nota").value="";
document.getElementById("fecha").value="";

}

function borrarDatos(){
localStorage.clear();
location.reload();
}

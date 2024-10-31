// Formulario
const formularioCliente = document.querySelector('#formulario');
const inputNombre = document.querySelector('#formulario #nombre');
const inputEmail = document.querySelector('#formulario #email');
const inputTelefono = document.querySelector('#formulario #telefono');
const inputEmpresa = document.querySelector('#formulario #empresa');
const botonSubmit = document.querySelector('#formulario input[type="submit"]');

// Listado clientes guardados
const listadoClientes = document.querySelector('#listado-clientes');

// Objeto para almacenar los datos que el usuario ponga en el formulario
const datosFormulario = {
    nombre: "",
    email: "",
    telefono: "",
    empresa: ""
}

// IndexedDB
const peticion = indexedDB.open("BaseDeDatos", 1);
let db;

peticion.onerror = evento => {
    alert(`Error al abrir la base de datos: ${evento.target.errorCode}`);
}
peticion.onsuccess = evento => {
    db = evento.target.result;
    listarClientes();
}
peticion.onupgradeneeded = evento => {
    db = evento.target.result;

    if (!db.objectStoreNames.contains("clientes")) {
        db.createObjectStore("clientes", {keyPath: "id", autoIncrement: true});
    }
}

// Listeners
window.addEventListener('load', iniciarApp)

/**
 * Inicia las funcionalidades de la app
 */
function iniciarApp() {
    // Si hay datos en el almacenamiento local y se van a usar para editar los datos de un cliente
    if (JSON.parse(localStorage.getItem("clienteEditar")) && botonSubmit.value === "Guardar Cambios") {
        const cliente = JSON.parse(localStorage.getItem("clienteEditar"));
        aplicarAlmacenamientoLocal(cliente)
    }

    // Si existe el formulario
    if (formularioCliente) {
        comprobarFormulario();

        inputNombre.addEventListener('blur', validarInput)
        inputEmail.addEventListener('blur', validarInput)
        inputTelefono.addEventListener('blur', validarInput)
        inputEmpresa.addEventListener('blur', validarInput)

        formularioCliente.addEventListener('submit', (evento) => {
            evento.preventDefault()

            // Si es el fomulario para editar datos de un cliente
            if (botonSubmit.value === "Guardar Cambios") {
                actualizarCliente({
                    id: JSON.parse(localStorage.getItem("clienteEditar")).id,
                    nombre: inputNombre.value,
                    email: inputEmail.value,
                    telefono: inputTelefono.value,
                    empresa: inputEmpresa.value,
                })
                localStorage.removeItem("clienteEditar");
                window.location.href = "./index.html";
            } else {
                // Si es el formulario para registrar un cliente nuevo
                almacenarCliente(datosFormulario)
                resetearFormulario();
                comprobarFormulario();
            }
        })
    }
}


// Funciones de los formularios

function validarInput(evento) {
    if (evento.target.value.trim() === "") {
        mostrarAlertaError(`El campo ${evento.target.id} no puede estar vacio`, evento.target.parentElement);
        datosFormulario[evento.target.id] = evento.target.value;
        comprobarFormulario()
        return;
    }
    if (evento.target.id === "nombre" && !validarNombre(evento.target.value)) {
        mostrarAlertaError("El campo nombre no tiene un formato correcto", evento.target.parentElement);
        comprobarFormulario()
        return;
    }

    if (evento.target.id === "email" && !validarEmail(evento.target.value)) {
        mostrarAlertaError("El campo email no tiene un formato correcto", evento.target.parentElement)
        comprobarFormulario()
        return;
    }

    if (evento.target.id === "telefono" && !validarTelefono(evento.target.value)) {
        mostrarAlertaError("El campo telefono no tiene un formato correcto", evento.target.parentElement);
        comprobarFormulario()
        return;
    }

    if (evento.target.id === "empresa" && !validarEmpresa(evento.target.value)) {
        mostrarAlertaError("El número de la empresa no tiene un formato correcto, debe tener 6 digitos", evento.target.parentElement);
        comprobarFormulario()
        return;
    }

    limpiarAlerta(evento.target.parentElement, ".bg-red-600");
    datosFormulario[evento.target.id] = evento.target.value;
    comprobarFormulario()
}

/**
 * Valida que formado solo por letras (mayúsculas y/o minúsculas) y permite espacios
 * @param nombre {String} Nombre
 * @returns {boolean} True si es válido // False si no es válido
 */
function validarNombre(nombre) {
    const regex = /^[a-zA-Z\s]+$/;
    return regex.test(nombre);
}

/**
 * Valida que sea un correo electrónico válido.
 * Debe seguir este formato:
 * caracteres_alfanuméricos@caracteres_alfanuméricos.caracteres_alfabéticos(de longitud entre 2 y 6)
 * @param email {String} Email
 * @returns {boolean} True si es válido // False si no es válido
 */
function validarEmail(email) {
    //
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
}

/**
 * Comprueba que sea un número de teléfono válido
 * Debe seguir este formato:
 * Prefijo: opcional
 * Empezar por 6 o 7
 * Estar formado por 9 números, que pueden estar separados por guiones o espacios
 * @param telefono {String} Teléfono
 * @returns {boolean} True si es válido // False si no es válido
 */
function validarTelefono(telefono) {
    const regex = /^(\+34|0034|34)?[ -]*(6|7)[ -]*([0-9][ -]*){8}$/;
    return regex.test(telefono);
}

/**
 * Comprobar que se un código de empresa válido
 * Debe seguir este formato: un número de 6 dígitos
 * @param empresa {String} Código de la empresa
 * @returns {boolean} True si es válido // False si no es válido
 */
function validarEmpresa(empresa) {
    const regex = /^\d{6}$/;
    return regex.test(empresa);
}

/**
 * Muestra al usuario un mensaje de error por 3 segundos
 * @param mensaje {String} Contenido del mensaje
 * @param referencia Elemento padre donde se debe colocar
 */
function mostrarAlertaError(mensaje, referencia) {
    limpiarAlerta(referencia, ".bg-red-600");

    const error = document.createElement('p');
    error.textContent = mensaje;
    error.classList.add('bg-red-600', 'text-center', 'text-white', 'p-2');
    referencia.appendChild(error);

    setTimeout(() => limpiarAlerta(referencia, ".bg-red-600"), 3000)

}

/**
 * Limpia las alertas según una clase
 * @param referencia {HTMLElement} Elemento padre que se quiere limpiar de alertas
 * @param clase {String} Clase que identifica las alertas
 */
function limpiarAlerta(referencia, clase) {
    const alerta = referencia.querySelector(clase);
    if (alerta) {
        alerta.remove();
    }
}

/**
 * Muuestra un mensaje de éxito al usuario por 3 segundos
 * @param mensaje {String} Mensaje que se quiere mostrar
 * @param referencia {HTMLElement} Elemento padre donde se quiere colocar
 */
function mostrarAlertaExito(mensaje, referencia) {
    limpiarAlerta(referencia, ".bg-green-600");

    const exito = document.createElement("p");
    exito.textContent = mensaje;
    exito.classList.add('bg-green-600', 'text-center', 'text-white', 'p-2');
    referencia.appendChild(exito);

    setTimeout(() => limpiarAlerta(referencia, ".bg-green-600"), 3000)
}

/**
 * Comprueba que todos los campos del formulario no están vacíos.
 * Modifica la opacidad y disponibilidad del boton de tipo submit.
 */
function comprobarFormulario() {
    const datos = Object.values(datosFormulario);

    if (datos.some(dato => dato === "")) {
        botonSubmit.classList.add('opacity-50');
        botonSubmit.disabled = true;
    } else {
        botonSubmit.classList.remove('opacity-50');
        botonSubmit.disabled = false;
    }
}

/**
 * Limpia los campos del formulario
 */
function resetearFormulario() {
    datosFormulario.nombre = ""
    datosFormulario.email = ""
    datosFormulario.telefono = ""
    datosFormulario.empresa = ""

    formularioCliente.reset();
}

/**
 * Carga los datos del cliente que estén guardados en el almacenamiento local del navegador
 * @param cliente {Object} Datos del cliente
 */
function aplicarAlmacenamientoLocal(cliente) {
    inputNombre.value = cliente.nombre;
    datosFormulario.nombre = cliente.nombre;
    inputEmail.value = cliente.email;
    datosFormulario.email = cliente.email;
    inputTelefono.value = cliente.telefono;
    datosFormulario.telefono = cliente.telefono;
    inputEmpresa.value = cliente.empresa;
    datosFormulario.empresa = cliente.empresa;
}

/**
 * Elimina los elementos hijos de un elemento
 * @param referencia {HTMLElement} Elemento padre
 */
function limpiarHTML(referencia) {
    while (referencia.firstChild) {
        referencia.removeChild(referencia.firstChild)
    }
}


// Funciones de la base de datos

/**
 * Almacena un cliente nuevo en la base de datos
 * @param cliente {Object} Objeto que contiene los datos
 */
function almacenarCliente(cliente) {
    const transaccion = db.transaction(['clientes'], "readwrite");
    const almacenObjetos = transaccion.objectStore('clientes');
    const peticion = almacenObjetos.add(cliente)

    peticion.onsuccess = () => {
        mostrarAlertaExito("El cliente se ha guardado correctamente", formularioCliente);
    }
    peticion.onerror = () => {
        mostrarAlertaError("ERROR: No se ha podido guardar el cliente", formularioCliente)
    }
}

/**
 * Listar todos los clientes almacenados en la base de datos
 */
function listarClientes() {
    const transaccion = db.transaction(['clientes']);
    const almacenObjetos = transaccion.objectStore('clientes');
    const peticion = almacenObjetos.getAll();

    peticion.onsuccess = () => {
        if (listadoClientes) {
            mostrarClientes(peticion.result)
        }
    }
    peticion.onerror = () => {
        mostrarAlertaError("ERROR: No se han podido listar los clientes", listadoClientes.parentElement)
    }
}

/**
 * Pinta en el navegador un listado de clientes
 * @param clientes listado
 */
function mostrarClientes(clientes) {
    if (clientes.length === 0) {
        mostrarAlertaError("No se han encontrado clientes en la base de datos", listadoClientes.parentElement.parentElement)
        return;
    }

    clientes.forEach(cliente => {
        const fila = document.createElement('TR')
        fila.id = cliente.id;

        const columnaNombre = document.createElement('TD');
        columnaNombre.classList.add('px-6', 'py-3')
        columnaNombre.textContent = cliente.nombre;

        const columnaTelefono = document.createElement("TD")
        columnaTelefono.classList.add('px-6', 'py-3');
        columnaTelefono.textContent = cliente.telefono;

        const columnaEmpresa = document.createElement("TD");
        columnaEmpresa.classList.add('px-6', 'py-3');
        columnaEmpresa.textContent = cliente.empresa

        const columnaAcciones = document.createElement("TD");
        columnaAcciones.classList.add('px-6', 'py-3');
        const editar = document.createElement("A");
        editar.textContent = "Editar";
        editar.classList.add('bg-teal-600', 'hover:bg-teal-900', 'text-white', 'p-2', 'mr-2');
        editar.href = "./editar-cliente.html";
        editar.onclick = function () {
            buscarCliente(fila.id)
        }

        const eliminar  = document.createElement("A");
        eliminar.textContent = "Eliminar";
        eliminar.classList.add('bg-red-600', 'hover:bg-red-900', 'text-white', 'p-2');
        columnaAcciones.appendChild(editar);
        columnaAcciones.appendChild(eliminar);
        eliminar.onclick = function() {
            eliminarCliente(cliente.id)
            limpiarHTML(listadoClientes)
            listarClientes()
        }

        fila.appendChild(columnaNombre);
        fila.appendChild(columnaTelefono);
        fila.appendChild(columnaEmpresa);
        fila.appendChild(columnaAcciones);
        listadoClientes.appendChild(fila)
    })

}

/**
 * Busca un cliente en la base de datos
 * @param idCliente {String} Id del cliente
 */
function buscarCliente(idCliente) {
    const transaccion = db.transaction(['clientes']);
    const almacenObjetos = transaccion.objectStore('clientes');
    const peticion = almacenObjetos.get(Number(idCliente));

    peticion.onsuccess = () => {
        localStorage.setItem('clienteEditar', JSON.stringify(peticion.result));
    }

    peticion.onerror = () => {
        mostrarAlertaError(`ERROR: No se han encontrado el cliente ${idCliente} en la base de datos`, listadoClientes.parentElement.parentElement)
    }
}

/**
 * Actualiza los datos de un cliente de la base de datos
 * @param clienteActualizado {Object} Datos nuevos del cliente
 */
function actualizarCliente(clienteActualizado) {
    const transaccion = db.transaction(['clientes'], "readwrite");
    const almacenObjetos = transaccion.objectStore('clientes');
    const peticion = almacenObjetos.put(clienteActualizado)

    peticion.onsuccess = () => {
        mostrarAlertaExito("El cliente se ha actualizado correctamente", formularioCliente);
    }
    peticion.onerror = () => {
        mostrarAlertaError("ERROR: No se han podido actualizar los datos del cliente", formularioCliente)

    }
}

/**
 * Elimina un cliente de la base de datos
 * @param idCliente {String} Id del cliente
 */
function eliminarCliente(idCliente) {
    const transaccion = db.transaction(['clientes'], "readwrite");
    const almacenObjetos = transaccion.objectStore('clientes');
    const peticion = almacenObjetos.delete(Number(idCliente));

    peticion.onerror = () => {
        mostrarAlertaError("ERROR: No se han podido borrar el cliente", listadoClientes.parentElement.parentElement)

    }
}
Es un sistema de bases de datos que se integra en el navegador del usuario y puede utilizarse para cualquier sitio web.
Es recomendable que la información de los programas cliente no se almacene solo en los servidores, sino que también algunos datos seleccionados de los sitios web se guarden del lado del cliente. De esta manera, como los datos no deben cargarse cada vez que se accede a la web, se acelera la velocidad de navegación. [¹]

[¹]: https://www.ionos.es/digitalguide/paginas-web/desarrollo-web/indexeddb/

# 1. Verificar compatibilidad
```js
if (!window.indexedDB) {
	alert("¡IndexedDB no es compatible!");
}
```

# 2. Abrir una base de datos
```js
const peticion = indexedDB.open("MyDB", 1);
```

Puede provocar tres eventos:
- **Error** -> Error al crear la BD
- **Success** -> La BD se ha creado correctamente
- **Upgradeneeded** -> Al modificar la versión de la BD. También aparece al crearla porque se cambia el número de versión (de inexistente a 1).

```js
peticion.onerror = (evento) => {
	console.error("ERROR", evento.target.errorCode);
}

peticion.onsuccess = (evento) => {
	// La variable db es un objeto `IDBDatabase`
	// Permite definir y modificar la estructura de la base de datos
	const db = evento.target.result;
	console.log("Base de datos abierta");
}

peticion.onupgradeneeded = (evento) => {
	const db = evento.target.result;

	// Crear almacen
}
```

# 3. Crear almacén de objetos
Un almacén de objetos se define en `onupgradeneeded`.

```js
peticion.onupgradeneeded = (evento) => {
	const db = evento.target.result;

	// Se ejecutará únicamente cuando el almacén no exista ya
	if (!db.objectStoreNames.contains('usuarios')) {
		db.createObjectStore('usuarios', {keyPath: 'id', autoIncrement: true});
	}
}
```

# 4. CRUD
Las operaciones se realizan por medio de transacciones, de las cuales existen tres tipos:
- **readonly** -> Lee los datos de un object store. Se pueden solapar sin problemas varias transacciones de este tipo, incluso si se refieren al mismo ámbito.
- **readwrite** -> Lee y escribe un registro. Se podrán desarrollar varias de estas transacciones al mismo tiempo solo en caso de que se refieran a ámbitos distintos.
- **versionchange** -> Realiza modificaciones en un object store o en un índice, creando y modificando también registros. Esta función no puede configurarse de manera manual, sino que se desencadena automáticamente con el evento upgradeneeded.
Por defecto, las transacciones son de tipo `readonly`, es la que se ejecutará si no se especifica.

Es posible acceder acceder a varios almacenes en una transacción. Ejemplo:
```js
const transaction = db.transaction(['usuarios', 'productos'], 'readonly');
const usuariosStore = transaction.objectStore('usuarios');
const productosStore = transaction.objectStore('productos');
```
## 4.1. Insertar datos
Para insertar datos, se necesita abrir una transacción y acceder al almacén de objetos. Ejemplo:
```js
function agregarUsuario(db, usuario) {
  const transaccion = db.transaction(['usuarios'], 'readwrite');
  const almacenObjetos = transaccion.objectStore('usuarios');
  const peticion = almacenObjetos.add(usuario);

  peticion.onsuccess = function() {
    console.log('Usuario agregado:', usuario);
  }

  peticion.onerror = function() {
    console.error('Error al agregar usuario:', peticion.error);
  }
}

const usuario = { nombre: 'Juan', edad: 30 };
agregarUsuario(db, usuario);
```

## 4.2. Leer datos
Para leer datos, usamos el método `get` para un solo elemento.
Ejemplo:
```js
function obtenerUsuario(db, id) {
  const transaccion = db.transaction(['usuarios'], 'readonly');
  const almacenObjetos = transaccion.objectStore('usuarios');
  const peticion = almacenObjetos.get(id);

  peticion.onsuccess = function(evento) {
    console.log('Usuario obtenido:', evento.target.result);
  }
}
```

 Para obtener todos `getAll`. 
 Ejemplo:
```js
 function obtenerTodosLosUsuarios(db) {
  const transaccion = db.transaction(['usuarios'], 'readonly');
  const almacenObjetos = transaccion.objectStore('usuarios');
  const peticion = almacenObjetos.getAll();

  peticion.onsuccess = function(evento) {
    console.log('Todos los usuarios:', evento.target.result);
  }
}
```

### 4.2.1 Consultas con índices
Los índices permiten buscar valores en base a atributos específicos.

#### 4.2.1.1 Crear índices
Para crear un índice en el almacén de objetos hay que hacerlo en el momento de creación del almacén o al cambiar de versión la base de datos para actualizar la estructura, es decir cuando se dispara el evento `onupgradeneeded`.
Ejemplo:
```js
const peticion = indexedDB.open("MyDB", 2); // Cambiar a la versión 2

peticion.onupgradeneeded = (evento) => {
	const db = evento.target.result;

	if (!db.objectStoreNames.contains('usuarios')) {
		const almacenObjetos = db.createObjectStore('usuarios', {keyPath: 'id', autoIncrement: true});
		almacenObjetos.createIndex("nombre", "nombre", { unique: false });
	}
}
```

#### 4.2.1.2 Consulta usando un índice
```js
const almacenObjetos = db.transaction('usuarios').objectStore('usuarios');
const index = almacenObjetos.index('nombre');

index.get('Gonzalo').onsuccess = function(evento) {
  console.log('Usuario encontrado:', evento.target.result);
};
```

### 4.2.2. Consultas con cursor
Los cursores son útiles para iterar sobre los datos.
Ejemplo:
```js
// Como no se especifica la transacción es de tipo readonly
const transaccion = db.transaction(["usuarios"]);
const almacenObjetos = transaccion.objectStore("usuarios");
const peticion = almacenObjetos.openCursor();

peticion.onsuccess = (evento) => {
  const cursor = evento.target.result;
  if (cursor) {
    console.log("Usuario:", cursor.value);
    cursor.continue();
  } else {
    console.log("No hay más usuarios");
  }
};
```

### 4.2.3. Rango de consultas
Podemos hacer búsquedas de rangos con `IDBKeyRange` para establecer filtros. 
Sintaxis :
```
IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen)
```

- `lower` -> El límite inferior del rango (valor mínimo).
- `upper` -> El límite superior del rango (valor máximo).
- `lowerOpen` (opcional) -> Si es true, el límite inferior es exclusivo (no se incluye en el rango); si es false, es inclusivo (se incluye en el rango). Por defecto, es false.
- `upperOpen` (opcional) -> Si es true, el límite superior es exclusivo; si es false, es inclusivo. Por defecto, es false.

Por ejemplo:
```js
// De A a M excluyendo M
const rango = IDBKeyRange.bound("A", "M", false, true);
```

Ejemplo 1, rango por orden alfabético:
```js
const transaccion = db.transaction(["usuarios"]);
const almacenObjetos = transaccion.objectStore("usuarios");
const indice = almacenObjetos.index("nombre");
const rango = IDBKeyRange.bound("A", "M");
const peticion = indice.openCursor(rango);

peticion.onsuccess = (evento) => {
  const cursor = evento.target.result;
  if (cursor) {
    console.log("Usuario en rango A-M:", cursor.value);
    cursor.continue();
  } else {
    console.log("No hay más usuarios en el rango");
  }
};
```


Ejemplo 2, rango de edad:
```js
const rango = IDBKeyRange.bound(18, 30); // Filtra usuarios entre 18 y 30 años
const peticion = store.index('edad').openCursor(rango);

peticion.onsuccess = function(evento) {
  const cursor = evento.target.result;
  if (cursor) {
    console.log('Usuario dentro del rango:', cursor.value);
    cursor.continue();
  }
};
```

## 4.3. Actualizar datos
La actualización se hace con `put`, que reemplaza un registro basado en la clave primaria.
Si el registro no existe, lo creará.
Ejemplo:
```js
function actualizarUsuario(db, usuarioActualizado) {
  const transaccion = db.transaction(['usuarios'], 'readwrite');
  const almacenObjetos = transaccion.objectStore('usuarios');
  const peticion = almacenObjetos.put(usuarioActualizado);

  peticion.onsuccess = function() {
    console.log('Usuario actualizado:', usuarioActualizado);
  }
}
```

## 4.4. Eliminar datos
Para eliminar un elemento, usamos `delete` especificando la clave primaria del objeto.
Ejemplo:
```js
function eliminarUsuario(db, id) {
  const transaccion = db.transaction(['usuarios'], 'readwrite');
  const almacenObjetos = transaccion.objectStore('usuarios');
  const peticion = almacenObjetos.delete(id);

  peticion.onsuccess = function() {
    console.log(`Usuario con id ${id} eliminado`);
  }
}
```

# 5. Cerrar conexión
Para cerrar la conexión a la base de datos utilizamos el método `.close()` en la instancia de `IDBDatabase`. Es recomendable cerrar la conexión cuando ya no la necesitamos, ya que mantener conexiones abiertas puede afectar el rendimiento, especialmente si tienes múltiples conexiones.
Ejemplo:
```js
const peticion = indexedDB.open('MyDB', 1);

peticion.onsuccess = function(evento) {
  const db = evento.target.result;
  
  // Realizar operaciones con la base de datos
  console.log('Conexión abierta');
  
  // Cerrar la conexión cuando ya no sea necesaria
  db.close();
  console.log('Conexión cerrada');
};
```


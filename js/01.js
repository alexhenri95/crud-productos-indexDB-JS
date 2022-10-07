let DB;

const formulario = document.querySelector('#formulario')
const listadoProductos = document.querySelector('#listado-productos')
const listadoBolsita = document.querySelector('#listado-bolsita')
const contenedorBotones = document.querySelector('#contenedor-botones')

let bolsita = []

document.addEventListener('DOMContentLoaded', () => {
    crearDB()

    if (window.indexedDB.open('productos', 1)) {
        obtenerProductos()
    }

    bolsita = JSON.parse(localStorage.getItem('bolsitaProductos')) || []
    generarBolsitaHTML()

    formulario.addEventListener('submit', validarFormulario)

})

function crearDB() {
    const productosDB = window.indexedDB.open('productos', 1)

    productosDB.onerror = function(){
        console.log('Hubo un error.');
    }

    productosDB.onsuccess = function() {
        DB = productosDB.result
        console.log('Base de datos creada');
    }

    productosDB.onupgradeneeded = function(e) {
        const db = e.target.result

        const tablaProductos = db.createObjectStore('productos', {
            keyPath: 'id',
            autoincrement: true
        })

        tablaProductos.createIndex('nombre', 'nombre', { unique: true })
        tablaProductos.createIndex('categoria', 'categoria', { unique: false })
        tablaProductos.createIndex('precio', 'precio', { unique: false })
        tablaProductos.createIndex('id', 'nombre', { unique: true })

        console.log('DB Lista');
    }
}

function validarFormulario(e) {
    e.preventDefault()

    const nombre = document.querySelector('#nombre').value
    const categoria = document.querySelector('#categoria').value
    const precio = Number(document.querySelector('#precio').value)

    if(nombre === '' || categoria === '' || precio === '') {
        imprimirAlerta('Todos los campos son requeridos.', 'error')
        return
    }

    const producto = {
        nombre,
        categoria,
        precio,
        id: Date.now()
    }

    crearNuevoProducto(producto)

}

function crearNuevoProducto(producto) {
    const transaction = DB.transaction(['productos'], 'readwrite')
    const objectStore = transaction.objectStore('productos')

    objectStore.add(producto)

    transaction.onerror = function() {
        imprimirAlerta('Hubo un error. Talvez algun dato duplicado.', 'error')
    }

    transaction.oncomplete = function () {
        imprimirAlerta('Producto agregado a la lista.')
        formulario.reset()
        setTimeout(() => {
            const formSection = document.getElementById('formulario-section')
            const listadoSection = document.getElementById('listado-section')
            formSection.classList.remove('active')
            listadoSection.classList.add('active')
            obtenerProductos()
        }, 3000);
    }
}

function obtenerProductos() {
    limpiarHTML()

    const abrirConexion = window.indexedDB.open('productos', 1)

    abrirConexion.onerror = function() {
        console.log('Hubo un error');
    }

    abrirConexion.onsuccess = function() {
        DB = abrirConexion.result
        const objectStore = DB.transaction('productos').objectStore('productos')
        objectStore.openCursor().onsuccess = function (e) {
            const cursor = e.target.result
            if (cursor) {
                const { nombre, categoria, precio, id } = cursor.value

                listadoProductos.innerHTML += `
                    <div class="flex items-center relative py-2 px-4">
                        <img class="absolute object-cover w-24 h-24 rounded-full" alt="User avatar" src="./img/${categoria}">
                        <div class="h-24 pl-10 pr-4 flex items-center justify-between px-2 py-3 flex w-full bg-gray-800 rounded-lg shadow-md ml-10">
                            
                            <div class="pl-7">
                                <p class="text-white font-semibold text-xl cursor-pointer" onclick="eliminarProducto(${id})">${nombre}</p>
                                <p class="text-amber-500 font-black text-xl">$${precio}</p>
                            </div>
                            
                            
                            <button type="button" data-producto="${id}" 
                                onClick="agregandoProducto( ${id},'${nombre}', '${categoria}', ${precio} )" 
                                class="transition ease-in duration-300 font-medium bg-yellow-500 px-4 py-4 hover:shadow-lg text-white rounded-full hover:bg-yellow-600 ">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg> 
                            </button>
                        </div>
                    </div>
                `
                cursor.continue()
            }
        }
    }
}

function agregandoProducto(id, nombre, categoria, precio, cantidad=1, estado=false) {
    const producto = {id, nombre, categoria, precio, cantidad, estado}

    const itemEnBolsita = bolsita.findIndex(p => p.id === id)
    if (itemEnBolsita >= 0) {
        bolsita[itemEnBolsita].cantidad++
    }else{
        bolsita = [ producto, ...bolsita ]
    }
    
    generarBolsitaHTML()
}

function eliminarProducto(id) {
    if (confirm('¿Desea eliminar el producto seleccionado?')) {

        const transaction = DB.transaction(['productos'], 'readwrite')
        objectStore = transaction.objectStore('productos')
        // console.log('eliminando');
        objectStore.delete(id)

        transaction.oncomplete = function() {
            console.log('Eliminado');
            obtenerProductos()
        }

        transaction.onerror = function() {
            console.log('Hubo un error');
        }
    }
}

function generarBolsitaHTML() {
    limpiarBolsaHTML()

    if (bolsita.length > 0) {
        
        bolsita.forEach( producto => {
            const { id, nombre, categoria, precio, cantidad,estado } = producto
            const tr = document.createElement('tr')
            tr.classList.add('hover:bg-yellow-200')
            tr.innerHTML = `
                <td class="p-4 w-4">
                    <div class="flex items-center">
                        <input id="checkbox-${id}" onClick="cambiarEstado(${id})" type="checkbox" class="w-6 h-6 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" ${ estado ? 'checked' : '' }>
                        <label for="checkbox-table-1" class="sr-only">checkbox</label>
                    </div>
                </td>
                <td class="py-4 px-6 ${ estado ? 'line-through':'' } text-sm font-medium text-gray-900 whitespace-nowrap">${nombre}</td>
                <td class="py-4 px-6 ${ estado ? 'line-through':'' } text-sm font-medium text-gray-900 whitespace-nowrap">$ ${precio}</td>
                <td class="py-4 px-6 ${ estado ? 'line-through':'' } text-sm font-medium text-gray-900 whitespace-nowrap">${cantidad}</td>
                <td class="py-4 px-6 ${ estado ? 'line-through':'' } text-sm font-medium text-gray-900 whitespace-nowrap">$ ${(precio * cantidad).toFixed(2)}</td>
                <td class="py-4 px-6 text-sm font-medium text-right whitespace-nowrap">
                    <button onClick="eliminarItemBolsita(${id})" class="text-red-600 dark:text-red-500 hover:underline font-bold">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </td>
            `
            listadoBolsita.appendChild(tr)
            
        } )

        calcularTotalPagar()

        generarBotonesLimpiar()
        
        localStorage.setItem('bolsitaProductos', JSON.stringify(bolsita))
    
    }else{
        const tr = document.createElement('tr')
        tr.classList.add('hover:bg-yellow-100')
        tr.innerHTML = `
            <td colspan="6" class="py-6 px-6 text-sm text-center font-medium text-gray-900 whitespace-nowrap">NO HAY NADA EN LA LISTA</td>
        `
        listadoBolsita.appendChild(tr)
    }
}

function calcularTotalPagar() {
    const totalPagar = bolsita.filter(producto => producto.estado === false)
                                    .reduce((total, p) => total + (p.precio*p.cantidad), 0)

    const trTotal = document.createElement('tr')
    trTotal.classList.add('hover:bg-gray-100')
    trTotal.innerHTML = `
        <td colspan="4" class="bg-yellow-500 py-2 px-6 text-lg font-medium text-white whitespace-nowrap ml-auto">TOTAL A PAGAR</td></td>
        <td colspan="2" class="bg-yellow-500 py-2 px-6 text-sm font-medium text-white whitespace-nowrap">$ ${totalPagar.toFixed(2)}</td>
    `
    listadoBolsita.appendChild(trTotal)
}

function generarBotonesLimpiar() {
    contenedorBotones.classList.add('mt-4', 'flex', 'items-center', 'justify-between')

    const botonComprasCompletadas = document.createElement('button')
    botonComprasCompletadas.classList.add('text-white','bg-yellow-500', 'hover:text-gray-700', 'focus:ring-4', 'focus:ring-yellow-300', 'font-medium', 'rounded', 'text-sm', 'px-3', 'py-3', 'text-center', 'inline-flex', 'items-center')
    botonComprasCompletadas.textContent = 'Limpiar Compras Completadas'
    botonComprasCompletadas.onclick = limpiarComprasCompletadas
    

    const botonLimpiarTodo = document.createElement('button')
    botonLimpiarTodo.classList.add('text-white','bg-yellow-500', 'hover:text-gray-700', 'focus:ring-4', 'focus:ring-yellow-300', 'font-medium', 'rounded', 'text-sm', 'px-3', 'py-3', 'text-center', 'inline-flex', 'items-center')

    botonLimpiarTodo.textContent = 'Limpiar todo'
    botonLimpiarTodo.onclick = limpiarBolsita

    contenedorBotones.appendChild(botonComprasCompletadas)
    contenedorBotones.appendChild(botonLimpiarTodo)
}

function eliminarItemBolsita(id) {
    if (confirm('¿Desea eliminar este producto de la lista?')) {
        bolsita = bolsita.filter(p => p.id !== id)
        generarBolsitaHTML()
    }
}

function cambiarEstado(id) {
    const itemEnBolsita = bolsita.findIndex(p => p.id === id)
    if (itemEnBolsita >= 0) {
        bolsita[itemEnBolsita].estado = !bolsita[itemEnBolsita].estado
    }

    generarBolsitaHTML()
}

function limpiarBolsita(){
    if (confirm('¿Deseas eliminar todas las compras listadas?')) {
        bolsita = []
        localStorage.clear()
        generarBolsitaHTML()
    }
}

function limpiarComprasCompletadas() {
    if (confirm('¿Deseas eliminar todas las compras completadas?')) {
        bolsita = bolsita = bolsita.filter(producto => producto.estado !== true)
        generarBolsitaHTML()
    }
}

function limpiarHTML() {
    listadoProductos.innerHTML = ''
}

function limpiarBolsaHTML() {
    listadoBolsita.innerHTML = ''
    contenedorBotones.innerHTML = ''
}

function imprimirAlerta(mensaje, tipo) {
    const divAlerta = document.querySelector('.error')

    if (!divAlerta) {
        const divAlerta = document.createElement('div')
        divAlerta.classList.add('py-2', 'px-4', 'rounded', 'border', 'text-white', 'mb-4', 'text-cener')

        if (tipo === 'error') {
            divAlerta.classList.add('error', 'bg-red-500', 'border-red-500')
        }else {
            divAlerta.classList.add('bg-yellow-500', 'border-yellow-500')
        }

        divAlerta.textContent = mensaje

        document.querySelector('#mensaje').appendChild(divAlerta)

        setTimeout(() => {
            divAlerta.remove()
        }, 3000);
    }

}
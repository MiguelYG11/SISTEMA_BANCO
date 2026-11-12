//conexion

const SUPABASE_URL = 'https://yvflgftwyqhyakqftvyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NdnfkjcmFtad5Htk9odZAA_TRvQmRCH';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables de estado para controlar si estamos creando o editando
let editandoClienteId = null;
let editandoCuentaId = null;

//cargar la pagina
document.addEventListener('DOMContentLoaded', () => {
    cargarClientes();
    cargarSelectTiposCuenta();
    cargarCuentas();
    cargarMovimientos();
});

// lectura de los datos

async function cargarClientes() {
    const { data, error } = await db
        .from('cliente')
        .select('*')
        .order('id_cliente', { ascending: true });

    if (error) return console.error('Error cargando clientes:', error.message);

    const select = document.getElementById('select_cliente');
    const tbody = document.getElementById('tablaClientes');

    select.innerHTML = '<option value="">Seleccione un cliente...</option>';
    tbody.innerHTML = '';

    data.forEach(cli => {
        // Llenar selector de cuentas
        select.innerHTML += `<option value="${cli.id_cliente}">${cli.id_cliente} - ${cli.nombres} ${cli.apellidos} (${cli.dni})</option>`;

        // Llenar tabla de clientes con botones Editar / Eliminar
        tbody.innerHTML += `
            <tr>
                <td><strong>${cli.id_cliente}</strong></td>
                <td>${cli.nombres} ${cli.apellidos}</td>
                <td>${cli.dni}</td>
                <td>${cli.telefono || '-'}</td>
                <td class="acciones-celda">
                    <button class="btn-editar" onclick="prepararEdicionCliente('${cli.id_cliente}', '${cli.nombres}', '${cli.apellidos}', '${cli.dni}', '${cli.telefono || ''}')">Editar</button>
                    <button class="btn-eliminar" onclick="eliminarCliente('${cli.id_cliente}')">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function cargarSelectTiposCuenta() {
    const { data, error } = await db.from('tipo_cuenta').select('id_tipo, nombre_tipo, tasa_interes');
    if (error) return console.error('Error cargando tipos:', error.message);

    const select = document.getElementById('select_tipo');
    select.innerHTML = '<option value="">Seleccione tipo de cuenta...</option>';
    data.forEach(tipo => {
        select.innerHTML += `<option value="${tipo.id_tipo}">${tipo.nombre_tipo} (Tasa: ${tipo.tasa_interes}%)</option>`;
    });
}

async function cargarCuentas() {
    const { data, error } = await db
        .from('cuenta')
        .select(`
            id_cuenta,
            numero_cuenta,
            saldo,
            id_cliente,
            id_tipo,
            cliente ( nombres, apellidos, dni ),
            tipo_cuenta ( nombre_tipo )
        `)
        .order('id_cuenta', { ascending: true });

    if (error) return console.error('Error cargando cuentas:', error.message);

    const tbody = document.getElementById('tablaCuentas');
    const selectCuentaMov = document.getElementById('select_cuenta_mov');
    
    tbody.innerHTML = '';
    selectCuentaMov.innerHTML = '<option value="">Seleccione una cuenta...</option>';

    data.forEach(cta => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${cta.id_cuenta}</strong></td>
                <td>${cta.numero_cuenta}</td>
                <td>${cta.cliente.nombres} ${cta.cliente.apellidos}</td>
                <td>${cta.cliente.dni}</td>
                <td>${cta.tipo_cuenta.nombre_tipo}</td>
                <td><strong>S/ ${parseFloat(cta.saldo).toFixed(2)}</strong></td>
                <td class="acciones-celda">
                    <button class="btn-editar" onclick="prepararEdicionCuenta('${cta.id_cuenta}', '${cta.numero_cuenta}', '${cta.id_cliente}', '${cta.id_tipo}', ${cta.saldo})">Editar</button>
                    <button class="btn-eliminar" onclick="eliminarCuenta('${cta.id_cuenta}')">Eliminar</button>
                </td>
            </tr>
        `;

        selectCuentaMov.innerHTML += `
            <option value="${cta.id_cuenta}">${cta.numero_cuenta} - ${cta.cliente.nombres} (Saldo: S/ ${parseFloat(cta.saldo).toFixed(2)})</option>
        `;
    });
}

async function cargarMovimientos() {
    const { data, error } = await db
        .from('movimiento')
        .select('*, cuenta(numero_cuenta)')
        .order('fecha_hora', { ascending: false });

    if (error) return console.error('Error cargando movimientos:', error.message);

    const tbody = document.getElementById('tablaMovimientos');
    tbody.innerHTML = '';

    data.forEach(mov => {
        const claseBadge = mov.tipo_movimiento === 'DEPOSITO' ? 'badge-deposito' : 'badge-retiro';
        tbody.innerHTML += `
            <tr>
                <td><strong>${mov.id_movimiento}</strong></td>
                <td>${mov.cuenta.numero_cuenta}</td>
                <td><span class="${claseBadge}">${mov.tipo_movimiento}</span></td>
                <td>S/ ${parseFloat(mov.monto).toFixed(2)}</td>
                <td>${mov.descripcion || '-'}</td>
                <td>${new Date(mov.fecha_hora).toLocaleString()}</td>
                <td class="acciones-celda">
                    <button class="btn-eliminar" onclick="eliminarMovimiento('${mov.id_movimiento}', '${mov.id_cuenta}', '${mov.tipo_movimiento}', ${mov.monto})">Anular</button>
                </td>
            </tr>
        `;
    });
}

//crear y modificar clientes

document.getElementById('formCliente').addEventListener('submit', async (e) => {
    e.preventDefault();

    const datosCliente = {
        nombres: document.getElementById('nombres').value.trim(),
        apellidos: document.getElementById('apellidos').value.trim(),
        dni: document.getElementById('dni').value.trim(),
        telefono: document.getElementById('telefono').value.trim()
    };

    if (editandoClienteId) {
        // modificar clientes
        const { error } = await db
            .from('cliente')
            .update(datosCliente)
            .eq('id_cliente', editandoClienteId);

        if (error) return alert('Error al actualizar cliente: ' + error.message);
        alert('Cliente actualizado correctamente.');
        cancelarEdicionCliente();
    } else {
        // insertar clientes
        datosCliente.id_cliente = document.getElementById('id_cliente').value.trim();
        const { error } = await db.from('cliente').insert([datosCliente]);

        if (error) return alert('Error al registrar cliente: ' + error.message);
        alert('Cliente registrado con éxito.');
        e.target.reset();
    }

    cargarClientes();
    cargarCuentas();
});

function prepararEdicionCliente(id, nombres, apellidos, dni, telefono) {
    editandoClienteId = id;
    document.getElementById('id_cliente').value = id;
    document.getElementById('id_cliente').disabled = true; // La PK no se modifica
    document.getElementById('nombres').value = nombres;
    document.getElementById('apellidos').value = apellidos;
    document.getElementById('dni').value = dni;
    document.getElementById('telefono').value = telefono;

    document.getElementById('tituloFormCliente').textContent = `Editando Cliente (${id})`;
    document.getElementById('btnGuardarCliente').textContent = 'Actualizar Cliente';
    document.getElementById('btnCancelarCliente').classList.remove('oculto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicionCliente() {
    editandoClienteId = null;
    document.getElementById('formCliente').reset();
    document.getElementById('id_cliente').disabled = false;
    document.getElementById('tituloFormCliente').textContent = '1. Registrar Cliente';
    document.getElementById('btnGuardarCliente').textContent = 'Guardar Cliente';
    document.getElementById('btnCancelarCliente').classList.add('oculto');
}

document.getElementById('btnCancelarCliente').addEventListener('click', cancelarEdicionCliente);

async function eliminarCliente(id) {
    if (!confirm(`¿Seguro que deseas eliminar al cliente ${id}?`)) return;

    const { error } = await db.from('cliente').delete().eq('id_cliente', id);

    if (error) {
        alert('No se puede eliminar: Este cliente tiene cuentas bancarias activas (Integridad Referencial FK).\n\nDetalle: ' + error.message);
    } else {
        alert('Cliente eliminado.');
        cargarClientes();
    }
}

// crear y modificar cuentas

document.getElementById('formCuenta').addEventListener('submit', async (e) => {
    e.preventDefault();

    const datosCuenta = {
        numero_cuenta: document.getElementById('numero_cuenta').value.trim(),
        id_cliente: document.getElementById('select_cliente').value,
        id_tipo: document.getElementById('select_tipo').value,
        saldo: parseFloat(document.getElementById('saldo_inicial').value)
    };

    if (editandoCuentaId) {
        // modificar
        const { error } = await db
            .from('cuenta')
            .update(datosCuenta)
            .eq('id_cuenta', editandoCuentaId);

        if (error) return alert('Error al actualizar cuenta: ' + error.message);
        alert('Cuenta actualizada correctamente.');
        cancelarEdicionCuenta();
    } else {
        // crear
        datosCuenta.id_cuenta = document.getElementById('id_cuenta_nueva').value.trim();
        const { error } = await db.from('cuenta').insert([datosCuenta]);

        if (error) return alert('Error al aperturar cuenta: ' + error.message);
        alert('Cuenta creada correctamente.');
        e.target.reset();
    }

    cargarCuentas();
});

function prepararEdicionCuenta(id, numero, idCliente, idTipo, saldo) {
    editandoCuentaId = id;
    document.getElementById('id_cuenta_nueva').value = id;
    document.getElementById('id_cuenta_nueva').disabled = true; // La PK no se modifica
    document.getElementById('numero_cuenta').value = numero;
    document.getElementById('select_cliente').value = idCliente;
    document.getElementById('select_tipo').value = idTipo;
    document.getElementById('saldo_inicial').value = saldo;

    document.getElementById('tituloFormCuenta').textContent = `Editando Cuenta (${id})`;
    document.getElementById('btnGuardarCuenta').textContent = 'Actualizar Cuenta';
    document.getElementById('btnCancelarCuenta').classList.remove('oculto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicionCuenta() {
    editandoCuentaId = null;
    document.getElementById('formCuenta').reset();
    document.getElementById('id_cuenta_nueva').disabled = false;
    document.getElementById('tituloFormCuenta').textContent = '2. Aperturar Cuenta';
    document.getElementById('btnGuardarCuenta').textContent = 'Crear Cuenta';
    document.getElementById('btnCancelarCuenta').classList.add('oculto');
}

document.getElementById('btnCancelarCuenta').addEventListener('click', cancelarEdicionCuenta);

async function eliminarCuenta(id) {
    if (!confirm(`¿Seguro que deseas eliminar la cuenta ${id}?`)) return;

    const { error } = await db.from('cuenta').delete().eq('id_cuenta', id);

    if (error) {
        alert('No se puede eliminar: Esta cuenta tiene movimientos registrados (Integridad Referencial FK).\n\nDetalle: ' + error.message);
    } else {
        alert('Cuenta eliminada.');
        cargarCuentas();
    }
}

// registrar y anular movimientos
document.getElementById('formMovimiento').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id_cuenta = document.getElementById('select_cuenta_mov').value;
    const tipo_movimiento = document.getElementById('tipo_movimiento').value;
    const monto = parseFloat(document.getElementById('monto').value);

    const { data: cuentaActual, error: errSaldo } = await db
        .from('cuenta')
        .select('saldo')
        .eq('id_cuenta', id_cuenta)
        .single();

    if (errSaldo) return alert('Error al verificar saldo: ' + errSaldo.message);

    let saldoCalculado = parseFloat(cuentaActual.saldo);

    if (tipo_movimiento === 'RETIRO' && saldoCalculado < monto) {
        alert('Operación rechazada: Saldo insuficiente.');
        return;
    }

    saldoCalculado = tipo_movimiento === 'DEPOSITO' 
        ? saldoCalculado + monto 
        : saldoCalculado - monto;

    const nuevoMovimiento = {
        id_movimiento: document.getElementById('id_movimiento').value.trim(),
        id_cuenta: id_cuenta,
        tipo_movimiento: tipo_movimiento,
        monto: monto,
        descripcion: document.getElementById('descripcion').value.trim()
    };

    const { error: errInsert } = await db.from('movimiento').insert([nuevoMovimiento]);
    if (errInsert) return alert('Error al registrar movimiento: ' + errInsert.message);

    await db.from('cuenta').update({ saldo: saldoCalculado }).eq('id_cuenta', id_cuenta);

    alert('Movimiento registrado y saldo actualizado.');
    e.target.reset();
    cargarCuentas();
    cargarMovimientos();
});

async function eliminarMovimiento(idMov, idCuenta, tipoMov, monto) {
    if (!confirm(`¿Anular y eliminar el movimiento ${idMov}? Se revertirá el monto en el saldo de la cuenta.`)) return;

    // 1. Obtener saldo actual de la cuenta para revertir la operación
    const { data: cuentaActual } = await db.from('cuenta').select('saldo').eq('id_cuenta', idCuenta).single();
    let saldoRevertido = parseFloat(cuentaActual.saldo);

    // Si fue depósito se resta; si fue retiro se devuelve
    saldoRevertido = tipoMov === 'DEPOSITO' ? saldoRevertido - parseFloat(monto) : saldoRevertido + parseFloat(monto);

    // 2. Eliminar el movimiento
    const { error } = await db.from('movimiento').delete().eq('id_movimiento', idMov);
    if (error) return alert('Error al eliminar movimiento: ' + error.message);

    // 3. Actualizar saldo de la cuenta
    await db.from('cuenta').update({ saldo: saldoRevertido }).eq('id_cuenta', idCuenta);

    alert('Movimiento eliminado y saldo revertido.');
    cargarCuentas();
    cargarMovimientos();
}
const API_URL = 'https://gym-backend-oasf.onrender.com';

function toggleHistorialModal(ejercicioId) {
    const modal = document.getElementById('modalHistorial');
    if (modal) {
        modal.remove();
    } else {
        mostrarGraficoHistorial(ejercicioId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const selectorEjercicios = document.getElementById('selector_ejercicios');
    const btnAgregar = document.getElementById('agregar_ejercicio');
    const contenedorRutina = document.getElementById('rutina_hoy');

    function cargarEjercicios() {
        fetch(`${API_URL}/ejercicios`)
            .then(response => response.json())
            .then(ejercicios => {
                selectorEjercicios.innerHTML = '';
                const optionDefault = document.createElement('option');
                optionDefault.value = '';
                optionDefault.textContent = 'Selecciona un ejercicio';
                selectorEjercicios.appendChild(optionDefault);

                ejercicios.forEach(ejercicio => {
                    const option = document.createElement('option');
                    option.value = ejercicio._id; // MongoDB usa _id
                    option.textContent = `${ejercicio.codigo} - ${ejercicio.grupo_muscular} - ${ejercicio.nombre}`;
                    selectorEjercicios.appendChild(option);
                });
            });
    }

    function cargarRutinaHoy() {
        fetch(`${API_URL}/rutina_hoy`)
            .then(response => response.json())
            .then(rutina => {
                contenedorRutina.innerHTML = '';
                rutina.forEach(item => {
                    const ejercicio = crearCardEjercicio(item);
                    contenedorRutina.appendChild(ejercicio);
                });
            });
    }

    function crearCardEjercicio(ejercicio) {
        const card = document.createElement('div');
        card.className = 'ejercicio-card';
        card.dataset.id = ejercicio.rutina_id;

        // Usa historial_series si existe, si no usa series original
        const series = Array.isArray(ejercicio.historial_series) && ejercicio.historial_series.length
            ? ejercicio.historial_series
            : (ejercicio.series || '').split('\n');
        let seriesHTML = '';

        // Detecta si es SN (series indeterminadas)
        const esSN = series[0]?.startsWith('SN');

        if (esSN) {
            // Parsear datos actuales si existen
            const partes = series[0].split(' ');
            const repsTotales = partes[1]?.substring(1) || '';
            const fallos = partes[2]?.substring(1).split('-').filter(Boolean) || [''];
            const kg = partes[3]?.substring(1) || '';
            const inc = partes[4]?.substring(1) || '';

            seriesHTML += `<div id="sn-series-list">`;
            fallos.forEach((fallo, idx) => {
                seriesHTML += `
                    <div class="sn-serie" data-index="${idx}" style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
                        <label>F <input type="number" class="sn-fallo" value="${fallo}" min="0" style="width:60px"></label>
                    </div>
                `;
            });
            seriesHTML += `</div>
                <div id="sn-total-reps" style="margin-bottom:8px; font-weight:bold; color:#1976d2;">Total ingresado: 0 / ${repsTotales}</div>
                <button type="button" class="sn-agregar-serie" style="margin-bottom:8px;">Agregar Serie</button>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                    <label>Reps totales <input type="number" class="sn-reps" value="${repsTotales}" min="1" style="width:70px"></label>
                    <label>K <input type="number" class="sn-kg" value="${kg}" min="0" step="0.5" style="width:70px"></label>
                    <label>+ <input type="number" class="sn-inc" value="${inc}" min="0" step="0.5" style="width:70px"></label>
                </div>
            `;
        } else {
            // Series fijas
            series.forEach((serie, index) => {
                const partes = serie.split(' ');
                if (partes.length < 5) return;

                seriesHTML += `
            <div class="serie" data-index="${index}">
                <div class="serie-info" style="font-weight:bold; font-size:1.1em;">${partes[0]} ${partes[1]}</div>
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
                    <label style="display:flex;align-items:center;">F <input type="text" class="fallo" style="width:100px;margin-left:2px;" value="${(partes[2] || 'F0').substring(1)}" min="0"></label>
                    <label style="display:flex;align-items:center;">K <input type="number" class="peso" style="width:70px;margin-left:2px;" value="${(partes[3] || 'K0').substring(1)}" min="0" step="0.5"></label>
                    <label style="display:flex;align-items:center;">< <input type="number" class="incremento" style="width:70px;margin-left:2px;" value="${(partes[4] || '+0').substring(1)}" min="0" step="0.5"></label>
                </div>
            </div>
        `;
            });
        }

        // Fecha por defecto: hoy en formato yyyy-mm-dd (ajustada a UTC-3)
        const now = new Date();
        const utc3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        const hoy = utc3.toISOString().slice(0, 10);

        card.innerHTML = `
            <div class="ejercicio-header">
                <h3>${ejercicio.codigo} - ${ejercicio.grupo_muscular} - ${ejercicio.nombre}</h3>
            </div>
            <div style="margin:8px 0;">
                <label>Fecha: 
                    <input type="date" class="fecha-ejercicio" value="${hoy}">
                </label>
            </div>
            <div class="series-container">${seriesHTML}</div>
            <div class="acciones-ejercicio" style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
                <div>
                    <button class="guardar-todas-series" style="background:#ccc;color:#333;" data-id="${ejercicio.rutina_id}">Guardar</button>
                    <button class="ver-historial" data-id="${ejercicio._id}">📈 Historial</button>
                </div>
                <button class="eliminar-ejercicio" data-id="${ejercicio.rutina_id}" style="background:#f44336;color:#fff;">Eliminar</button>
            </div>
        `;

        // --- Lógica para agregar series dinámicamente y contador para SN ---
        if (esSN) {
            const snSeriesList = card.querySelector('#sn-series-list');
            const totalRepsDiv = card.querySelector('#sn-total-reps');
            const repsInput = card.querySelector('.sn-reps');

            function actualizarTotalReps() {
                const repsTotales = parseInt(repsInput.value) || 0;
                const fallos = Array.from(card.querySelectorAll('.sn-fallo')).map(inp => parseInt(inp.value) || 0);
                const suma = fallos.reduce((a, b) => a + b, 0);
                const faltan = Math.max(repsTotales - suma, 0);
                totalRepsDiv.textContent = `Faltan: ${faltan} repeticiones`;
                totalRepsDiv.style.color = faltan === 0 ? '#388e3c' : '#d32f2f';
            }

            // Escucha cambios en todos los inputs F y reps totales
            card.addEventListener('input', function (e) {
                if (e.target.classList.contains('sn-fallo') || e.target.classList.contains('sn-reps')) {
                    actualizarTotalReps();
                }
            });

            // Al agregar una nueva serie, también actualiza el contador
            card.querySelector('.sn-agregar-serie').addEventListener('click', () => {
                const idx = snSeriesList.children.length;
                const div = document.createElement('div');
                div.className = 'sn-serie';
                div.dataset.index = idx;
                div.style = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';
                div.innerHTML = `<label>F <input type="number" class="sn-fallo" value="0" min="0" style="width:60px"></label>`;
                snSeriesList.appendChild(div);
                actualizarTotalReps();
            });

            // Inicializa el contador al cargar la card
            setTimeout(actualizarTotalReps, 0);
        }

        return card;
    }

    btnAgregar.addEventListener('click', () => {
        const ejercicioId = selectorEjercicios.value;
        if (!ejercicioId) return;

        fetch(`${API_URL}/rutina_hoy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ejercicio_id: ejercicioId })
        })
            .then(res => res.json())
            .then(() => {
                cargarRutinaHoy();
                selectorEjercicios.value = '';
            });
    });

    contenedorRutina.addEventListener('click', (e) => {
        // Eliminar ejercicio de la rutina
        if (e.target.classList.contains('eliminar-ejercicio')) {
            const rutinaId = e.target.dataset.id;
            fetch(`${API_URL}/rutina_hoy/${rutinaId}`, { method: 'DELETE' })
                .then(() => cargarRutinaHoy());
        }

        // Guardar todas las series de un ejercicio
        if (e.target.classList.contains('guardar-todas-series')) {
            const cardEjercicio = e.target.closest('.ejercicio-card');
            const rutinaId = cardEjercicio.dataset.id;

            // Detecta si es SN
            const esSN = !!cardEjercicio.querySelector('.sn-fallo');
            let seriesNuevas = [];

            if (esSN) {
                // Para SN: cada input F es una serie individual
                const reps = cardEjercicio.querySelector('.sn-reps').value;
                const kg = cardEjercicio.querySelector('.sn-kg').value;
                const inc = cardEjercicio.querySelector('.sn-inc').value;
                const snSeriesList = cardEjercicio.querySelectorAll('.sn-serie .sn-fallo');
                snSeriesList.forEach((input, idx) => {
                    seriesNuevas.push(`SN R${reps} F${input.value} K${kg} +${inc}`);
                });
            } else {
                // Series fijas
                const seriesDivs = cardEjercicio.querySelectorAll('.serie');
                seriesDivs.forEach(serieDiv => {
                    const partes = [];
                    const info = serieDiv.querySelector('.serie-info').textContent.split(' ');
                    partes.push(info[0]); // S1, S2, etc.
                    partes.push(info[1]); // R8, etc.
                    partes.push('F' + serieDiv.querySelector('.fallo').value);
                    partes.push('K' + serieDiv.querySelector('.peso').value);
                    partes.push('+' + serieDiv.querySelector('.incremento').value);
                    seriesNuevas.push(partes.join(' '));
                });
            }

            const fechaInput = cardEjercicio.querySelector('.fecha-ejercicio');
            const fechaSeleccionada = fechaInput ? fechaInput.value : undefined;

            fetch(`${API_URL}/ejercicios/serie`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rutina_id: rutinaId,
                    series: seriesNuevas.join('\n'),
                    fecha: fechaSeleccionada // <-- ahora se envía la fecha elegida
                })
            })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        e.target.style.background = '#4caf50';
                        e.target.style.color = '#fff';
                        e.target.textContent = 'Guardado';
                        setTimeout(() => {
                            e.target.style.background = '#ccc';
                            e.target.style.color = '#333';
                            e.target.textContent = 'Guardar';
                        }, 2000);
                    }
                });
        }

        // Ver historial (gráfico de barras, modal dinámico)
        if (e.target.classList.contains('ver-historial')) {
            const card = e.target.closest('.ejercicio-card');
            // Cierra cualquier historial abierto en otra card
            document.querySelectorAll('.historial-en-card').forEach(el => el.remove());
            mostrarGraficoHistorialEnCard(e.target.dataset.id, card);
        }
    });

    cargarEjercicios();
    cargarRutinaHoy();
});
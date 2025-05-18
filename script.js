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
        const series = (ejercicio.historial_series || ejercicio.series || '').split('\n');
        let seriesHTML = '';

        series.forEach((serie, index) => {
            const partes = serie.split(' ');
            if (partes.length < 5) return;

            seriesHTML += `
                <div class="serie" data-index="${index}">
                    <span class="serie-info">${partes[0]} ${partes[1]}</span>
                    <div class="controles-serie">
                        <label>Fallo:</label>
                        <input type="text" class="fallo" style="width:170px" value="${(partes[2] || 'F0').substring(1)}" min="0">
                        <label>Peso (kg):</label>
                        <input type="number" class="peso" value="${(partes[3] || 'K0').substring(1)}" min="0" step="0.5">
                        <label>Incremento:</label>
                        <input type="number" class="incremento" value="${(partes[4] || '+0').substring(1)}" min="0" step="0.5">
                    </div>
                </div>
            `;
        });

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
            const seriesDivs = cardEjercicio.querySelectorAll('.serie');
            let seriesNuevas = [];

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

            fetch(`${API_URL}/ejercicios/serie`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rutina_id: rutinaId, series: seriesNuevas.join('\n') })
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
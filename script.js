const API_URL = 'https://gym-backend-production-0130.up.railway.app';

// Spinner control
function mostrarSpinner() {
    const spinner = document.getElementById('spinner-cargando');
    if (spinner) spinner.style.display = 'flex';
}
function ocultarSpinner() {
    const spinner = document.getElementById('spinner-cargando');
    if (spinner) spinner.style.display = 'none';
}

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
    const datalist = document.getElementById('lista_ejercicios');

    function cargarEjercicios() {
        mostrarSpinner();
        fetch(`${API_URL}/ejercicios`)
            .then(response => response.json())
            .then(ejercicios => {
                datalist.innerHTML = '';
                window.ejerciciosPorCodigo = {};
                // Ordenar por el número al inicio del código (ej: "01", "10", etc.)
                ejercicios.sort((a, b) => {
                    const numA = parseInt((a.codigo || '').match(/^\d+/)?.[0] || '0', 10);
                    const numB = parseInt((b.codigo || '').match(/^\d+/)?.[0] || '0', 10);
                    return numA - numB;
                });
                ejercicios.forEach(ejercicio => {
                    const option = document.createElement('option');
                    option.value = ejercicio.codigo;
                    option.label = `${ejercicio.codigo} - ${ejercicio.grupo_muscular} - ${ejercicio.nombre}`;
                    option.textContent = `${ejercicio.codigo} - ${ejercicio.grupo_muscular} - ${ejercicio.nombre}`;
                    datalist.appendChild(option);
                    window.ejerciciosPorCodigo[ejercicio.codigo] = ejercicio._id;
                });
                ocultarSpinner();
            })
            .catch(() => ocultarSpinner());
    }

    function cargarRutinaHoy() {
        mostrarSpinner();
        fetch(`${API_URL}/rutina_hoy`)
            .then(response => response.json())
            .then(rutina => {
                contenedorRutina.innerHTML = '';
                rutina.forEach(item => {
                    const ejercicio = crearCardEjercicio(item);
                    contenedorRutina.appendChild(ejercicio);
                });
                ocultarSpinner();
            })
            .catch(() => ocultarSpinner());
    }

    function crearCardEjercicio(ejercicio) {
        // --- details y summary para colapsar ---
        const details = document.createElement('details');
        details.className = 'ejercicio-details';
        details.setAttribute('name', 'acordeon-ejercicios');

        const summary = document.createElement('summary');
        summary.innerHTML = `${ejercicio.codigo} - ${ejercicio.grupo_muscular} - ${ejercicio.nombre}`;
        details.appendChild(summary);

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
            // Toma los valores de la primera línea para reps, kg, inc
            let repsTotales = '';
            let kg = '';
            let inc = '';
            seriesHTML += `<div id="sn-series-list">`;
            series.forEach((linea, idx) => {
                const partes = linea.split(' ');
                repsTotales = partes[1]?.substring(1) || repsTotales;
                const fallo = partes[2]?.substring(1) || '';
                kg = partes[3]?.substring(1) || kg;
                inc = partes[4]?.substring(1) || inc;
                seriesHTML += `
                    <div class="sn-serie" data-index="${idx}" style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
                        <label>F <input type="number" class="sn-fallo" value="${fallo}" min="0" style="width:60px"></label>
                        <button type="button" class="eliminar-sn-serie" title="Eliminar serie" style="background:#f44336;color:#fff;border:none;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:1em;margin-left:6px;">❌</button>
                    </div>
                `;
            });
            seriesHTML += `</div>
                <div id="sn-total-reps" style="margin-bottom:8px; font-weight:bold; color:#1976d2;">Faltan: 0 repeticiones</div>
                <button type="button" class="sn-agregar-serie" style="margin-bottom:8px;">Agregar Serie</button>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                    <label>Reps totales <input type="number" class="sn-reps" value="${repsTotales}" min="1" style="width:67px"></label>
                    <label>K <input type="number" class="sn-kg" value="${kg}" min="0" step="0.5" style="width:67px"></label>
                    <label>< <input type="number" class="sn-inc" value="${inc}" min="0" step="0.5" style="width:67px"></label>
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
                    <label style="display:flex;align-items:center;">F <input type="number" class="fallo" style="width:67px;margin-left:2px;" value="${(partes[2] || 'F0').substring(1)}" min="0"></label>
                    <label style="display:flex;align-items:center;">K <input type="number" class="peso" style="width:67px;margin-left:2px;" value="${(partes[3] || 'K0').substring(1)}" min="0" step="0.5"></label>
                    <label style="display:flex;align-items:center;">< <input type="number" class="incremento" style="width:67px;margin-left:2px;" value="${(partes[4] || '<0').substring(1)}" min="0" step="0.5"></label>
                </div>
            </div>
        `;
            });
        }

        // Fecha por defecto: hoy en formato yyyy-mm-dd (ajustada a UTC-3)
        const now = new Date();
        const utc3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        const hoy = utc3.toISOString().slice(0, 10);

        // Temporizador de descanso
        const tiempoDescanso = ejercicio.descanso || 60;

        card.innerHTML = `
            
            <div style="margin:8px 0;">
                <label>Fecha: 
                    <input type="date" class="fecha-ejercicio" value="${hoy}">
                </label>
            </div>
            <div class="series-container">${seriesHTML}</div>
            <div class="descanso-timer" style="margin-top:14px;">
                <button class="iniciar-descanso" style="background:#1976d2;color:#fff;padding:6px 18px;border-radius:5px;">⏱️</button>
                <button class="pausar-descanso" style="background:#ffa726;color:#fff;padding:6px 18px;border-radius:5px;display:none;">⏸️</button>
                <button class="reiniciar-descanso" style="background:#e74c3c;color:#fff;padding:6px 18px;border-radius:5px;display:none;">⏹️</button>
                <span class="timer-text" style="margin-left:14px;font-weight:bold;color:#43a047;display:none;font-size:2em;">00:00</span>
                <span class="timer-label" style="margin-left:8px;color:#888;">(${tiempoDescanso}s)</span>
            </div>
            <div class="acciones-ejercicio" style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
                <div>
                    <button class="guardar-todas-series" style="background:#4caf50;color:#fff;font-size:1.1em;padding:6px 8px;" data-id="${ejercicio.rutina_id}">Guardar</button>
                    <button class="ver-historial" data-id="${ejercicio._id}" style="background:#ccc;color:#333;font-size:1.1em;padding:6px 8px;">Historial</button>
                </div>
                <button class="eliminar-ejercicio" data-id="${ejercicio.rutina_id}" style="background:#ffa726;color:#fff;font-size:1.1em;padding:6px 8px;">Quitar</button>
            </div>
        `;

        // --- Descripción y video en details anidado ---
        const detailsExtra = document.createElement('details');
        detailsExtra.className = 'ejercicio-extra';
        const summaryExtra = document.createElement('summary');
        summaryExtra.textContent = 'Descripción y Video';
        detailsExtra.appendChild(summaryExtra);

        // Descripción
        const descripcion = ejercicio.descripcion ? ejercicio.descripcion : 'Sin descripción';
        const descDiv = document.createElement('div');
        descDiv.style.margin = '8px 0';
        descDiv.innerHTML = descripcion;
        detailsExtra.appendChild(descDiv);

        // Video (si hay)
        if (ejercicio.url) {
            if (
                ejercicio.url.includes('youtube.com') ||
                ejercicio.url.includes('youtu.be')
            ) {
                // YouTube embed
                let videoId = '';
                if (ejercicio.url.includes('youtube.com')) {
                    const urlParams = new URLSearchParams(ejercicio.url.split('?')[1]);
                    videoId = urlParams.get('v');
                } else {
                    videoId = ejercicio.url.split('/').pop();
                }
                if (videoId) {
                    const videoEmbed = document.createElement('iframe');
                    videoEmbed.width = "288";
                    videoEmbed.height = "162";
                    videoEmbed.src = `https://www.youtube.com/embed/${videoId}`;
                    videoEmbed.setAttribute("frameborder", "0");
                    videoEmbed.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                    videoEmbed.allowFullscreen = true;
                    detailsExtra.appendChild(videoEmbed);
                } else {
                    // Si no se puede extraer el ID, muestra el link
                    const link = document.createElement('a');
                    link.href = ejercicio.url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = 'Ver video en página externa';
                    link.style.display = 'inline-block';
                    link.style.margin = '8px 0';
                    link.style.color = '#1976d2';
                    link.style.fontWeight = 'bold';
                    detailsExtra.appendChild(link);
                }
            } else {
                // Para cualquier otro caso, solo muestra el link
                const link = document.createElement('a');
                link.href = ejercicio.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = 'Ver video en página externa';
                link.style.display = 'inline-block';
                link.style.margin = '8px 0';
                link.style.color = '#1976d2';
                link.style.fontWeight = 'bold';
                detailsExtra.appendChild(link);
            }
        }

        card.appendChild(detailsExtra);

        // --- Lógica para agregar/eliminar series dinámicamente y contador para SN ---
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
                div.innerHTML = `<label>F <input type="number" class="sn-fallo" value="0" min="0" style="width:60px"></label>
                                 <button type="button" class="eliminar-sn-serie" title="Eliminar serie" style="background:#f44336;color:#fff;border:none;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:1em;margin-left:6px;">❌</button>`;
                snSeriesList.appendChild(div);
                actualizarTotalReps();
            });

            // Eliminar una serie SN
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('eliminar-sn-serie')) {
                    const div = e.target.closest('.sn-serie');
                    div.remove();
                    actualizarTotalReps();
                }
            });

            // Inicializa el contador al cargar la card
            setTimeout(actualizarTotalReps, 0);
        }

        // --- Temporizador de descanso con pausa y reinicio basado en hora real ---
        const btnDescanso = card.querySelector('.iniciar-descanso');
        const btnPausa = card.querySelector('.pausar-descanso');
        const btnReiniciar = card.querySelector('.reiniciar-descanso');
        const timerText = card.querySelector('.timer-text');
        let timerInterval = null;
        let tiempoRestante = tiempoDescanso;
        let fin = null;
        let enPausa = false;

        function actualizarTimerText() {
            const min = String(Math.floor(tiempoRestante / 60)).padStart(2, '0');
            const seg = String(tiempoRestante % 60).padStart(2, '0');
            timerText.textContent = `${min}:${seg}`;
        }

        btnDescanso.addEventListener('click', () => {
            btnDescanso.disabled = true;
            btnPausa.style.display = '';
            btnReiniciar.style.display = '';
            timerText.style.display = 'inline';
            timerText.style.color = '#43a047';
            enPausa = false;
            tiempoRestante = tiempoDescanso;
            fin = Date.now() + tiempoRestante * 1000;
            actualizarTimerText();

            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if (!enPausa) {
                    tiempoRestante = Math.max(0, Math.round((fin - Date.now()) / 1000));
                    actualizarTimerText();
                    if (tiempoRestante <= 0) {
                        clearInterval(timerInterval);
                        timerText.textContent = '¡Fin del descanso!';
                        timerText.style.color = '#e74c3c';
                        btnDescanso.disabled = false;
                        btnPausa.style.display = 'none';
                        btnReiniciar.style.display = 'none';
                    }
                }
            }, 500);
        });

        btnPausa.addEventListener('click', () => {
            enPausa = !enPausa;
            if (enPausa) {
                tiempoRestante = Math.max(0, Math.round((fin - Date.now()) / 1000));
                btnPausa.textContent = '▶️';
                btnPausa.title = 'Reanudar';
            } else {
                fin = Date.now() + tiempoRestante * 1000;
                btnPausa.textContent = '⏸️';
                btnPausa.title = 'Pausar';
            }
        });

        btnReiniciar.addEventListener('click', () => {
            clearInterval(timerInterval);
            tiempoRestante = tiempoDescanso;
            actualizarTimerText();
            timerText.style.color = '#43a047';
            btnDescanso.disabled = false;
            btnPausa.style.display = 'none';
            btnReiniciar.style.display = 'none';
            timerText.style.display = 'inline';
            btnPausa.textContent = '⏸️';
            btnPausa.title = 'Pausar';
            enPausa = false;
        });

        details.appendChild(card);
        return details;
    }

    btnAgregar.addEventListener('click', () => {
        const codigo = selectorEjercicios.value;
        const ejercicioId = window.ejerciciosPorCodigo ? window.ejerciciosPorCodigo[codigo] : null;
        if (!ejercicioId) return;

        mostrarSpinner();
        fetch(`${API_URL}/rutina_hoy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ejercicio_id: ejercicioId })
        })
            .then(res => res.json())
            .then(() => {
                cargarRutinaHoy();
                selectorEjercicios.value = '';
                ocultarSpinner();
            })
            .catch(() => ocultarSpinner());
    });

    contenedorRutina.addEventListener('click', (e) => {
        // Eliminar ejercicio de la rutina
        if (e.target.classList.contains('eliminar-ejercicio')) {
            const rutinaId = e.target.dataset.id;
            if (confirm('¿Seguro que quieres quitar este ejercicio de la rutina de hoy?')) {
                mostrarSpinner();
                fetch(`${API_URL}/rutina_hoy/${rutinaId}`, { method: 'DELETE' })
                    .then(() => {
                        cargarRutinaHoy();
                        ocultarSpinner();
                    })
                    .catch(() => ocultarSpinner());
            }
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
                    seriesNuevas.push(`SN R${reps} F${input.value} K${kg} <${inc}`);
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
                    partes.push('<' + serieDiv.querySelector('.incremento').value);
                    seriesNuevas.push(partes.join(' '));
                });
            }

            const fechaInput = cardEjercicio.querySelector('.fecha-ejercicio');
            const fechaSeleccionada = fechaInput ? fechaInput.value : undefined;

            mostrarSpinner();
            fetch(`${API_URL}/ejercicios/serie`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rutina_id: rutinaId,
                    series: seriesNuevas.join('\n'),
                    fecha: fechaSeleccionada
                })
            })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        e.target.style.background = '#A5D6A7'; // verde pálido
                        e.target.style.color = '#fff';
                        e.target.textContent = 'Guardado';

                        // Actualiza el historial si está abierto
                        const card = e.target.closest('.ejercicio-card');
                        const btnHistorial = card.querySelector('.ver-historial');
                        const historialDiv = card.querySelector('.historial-en-card');
                        if (historialDiv && btnHistorial) {
                            historialDiv.remove();
                            mostrarGraficoHistorialEnCard(btnHistorial.dataset.id, card);
                            btnHistorial.style.background = "#4caf50";
                            btnHistorial.style.color = "#fff";
                        }

                        setTimeout(() => {
                            e.target.style.background = '#4caf50';
                            e.target.style.color = '#fff';
                            e.target.textContent = 'Guardar';
                        }, 6000);
                    }
                    ocultarSpinner();
                })
                .catch(() => ocultarSpinner());
        }

        // Ver historial (toggle en la card)
        if (e.target.classList.contains('ver-historial')) {
            const card = e.target.closest('.ejercicio-card');
            const btn = e.target;

            // Cierra cualquier historial abierto en otra card
            document.querySelectorAll('.historial-en-card').forEach(div => {
                if (!card.contains(div)) div.remove();
            });
            document.querySelectorAll('.ver-historial').forEach(b => {
                if (b !== btn) {
                    b.style.background = "#ccc";
                    b.style.color = "#333";
                }
            });

            const existente = card.querySelector('.historial-en-card');
            if (existente) {
                // Si ya está abierto en esta card, solo lo cierra
                existente.remove();
                btn.style.background = "#ccc";
                btn.style.color = "#333";
            } else {
                mostrarGraficoHistorialEnCard(btn.dataset.id, card);
                btn.style.background = "#4caf50";
                btn.style.color = "#fff";
            }
        }
    });

    cargarEjercicios();
    cargarRutinaHoy();
});
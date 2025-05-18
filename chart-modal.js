function crearHistorialEnCard(card, mensaje, tipo = 'peso', onTipoChange) {
    // Elimina historial anterior en la card si existe
    const anterior = card.querySelector('.historial-en-card');
    if (anterior) anterior.remove();

    const contenedor = document.createElement('div');
    contenedor.className = 'historial-en-card';
    contenedor.style.background = '#fff';
    contenedor.style.border = '1px solid #ccc';
    contenedor.style.margin = '10px 0';
    contenedor.style.padding = '10px';

    contenedor.innerHTML = mensaje ? `<p style='text-align:center;'>${mensaje}</p>` : `
        <div style="text-align:center;margin-bottom:10px;">
            <label>Ver: 
                <select class="tipoDatoHistorial">
                    <option value="peso">Peso</option>
                    <option value="fallo">Fallo</option>
                </select>
            </label>
            <button class="cerrar-historial-en-card" style="float:right;">&times;</button>
        </div>
        <canvas class="chartHistorialEnCard"></canvas>
    `;
    card.appendChild(contenedor);

    // Cerrar historial
    const btnCerrar = contenedor.querySelector('.cerrar-historial-en-card');
    if (btnCerrar) btnCerrar.onclick = () => contenedor.remove();

    // Cambio de tipo
    if (!mensaje && onTipoChange) {
        const selector = contenedor.querySelector('.tipoDatoHistorial');
        selector.value = tipo;
        selector.addEventListener('change', (e) => {
            onTipoChange(e.target.value);
        });
    }
    return contenedor;
}

function mostrarGraficoHistorialEnCard(ejercicioId, card, tipo = 'peso') {
    fetch(`/historial/${ejercicioId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.length) {
                crearHistorialEnCard(card, '⚠️ No hay historial disponible para este ejercicio.');
                return;
            }

            const contenedor = crearHistorialEnCard(card, null, tipo, (nuevoTipo) => {
                mostrarGraficoHistorialEnCard(ejercicioId, card, nuevoTipo);
            });

            const ctx = contenedor.querySelector('.chartHistorialEnCard').getContext('2d');
            const fechas = data.map(item => item.fecha);
            const seriesPorIndice = {};

            data.forEach(item => {
                item.series_string.split('\n').forEach((serie, idx) => {
                    const partes = serie.split(' ');
                    const fallo = parseInt(partes[2]?.substring(1)) || 0;
                    const peso = parseFloat(partes[3]?.substring(1)) || 0;
                    if (!seriesPorIndice[idx]) {
                        seriesPorIndice[idx] = { fallo: [], peso: [] };
                    }
                    seriesPorIndice[idx].fallo.push(fallo);
                    seriesPorIndice[idx].peso.push(peso);
                });
            });

            const datasets = [];
            Object.entries(seriesPorIndice).forEach(([idx, datos], i) => {
                datasets.push({
                    label: `Serie ${+idx + 1}`,
                    data: datos[tipo],
                    backgroundColor: `hsl(${i * 60}, 70%, 60%)`
                });
            });

            new Chart(ctx, {
                type: 'bar',
                data: { labels: fechas, datasets },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: tipo === 'peso' ? 'Peso (kg)' : 'Fallo' } },
                        x: { title: { display: true, text: 'Fecha' } }
                    }
                }
            });
        });
}
// Usar la misma URL que está definida en script.js
function getApiUrl() {
    return window.API_URL || 'https://gym-backend-production-0130.up.railway.app';
}

function crearHistorialEnCard(card, mensaje) {
    // Elimina historial anterior en la card si existe
    const anterior = card.querySelector('.historial-en-card');
    if (anterior) anterior.remove();

    const contenedor = document.createElement('div');
    contenedor.className = 'historial-en-card';
    contenedor.style.background = '#fff';
    contenedor.style.border = '1px solid #ccc';
    contenedor.style.margin = '10px 0';
    contenedor.style.padding = '10px';

    contenedor.innerHTML = mensaje ? `<p style='text-align:center;'>${mensaje}</p>` : '';
    card.appendChild(contenedor);

    return contenedor;
}

function formatearFechaDDMMYY(fechaStr) {
    // fechaStr esperado: "YYYY-MM-DD" o "DD-MM-YYYY"
    if (fechaStr.includes('-')) {
        const partes = fechaStr.split('-');
        if (partes[0].length === 4) {
            // "YYYY-MM-DD" -> "DD-MM-YYYY"
            return `${partes[2]}-${partes[1]}-${partes[0]}`;
        } else {
            // "DD-MM-YYYY" -> igual
            return fechaStr;
        }
    }
    return fechaStr;
}

function mostrarGraficoHistorialEnCard(ejercicioId, card) {
    fetch(`${getApiUrl()}/historial/${ejercicioId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.length) {
                crearHistorialEnCard(card, '⚠️ No hay historial disponible para este ejercicio.');
                return;
            }

            // Ordena por fecha descendente (más reciente primero)
            data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            const contenedor = crearHistorialEnCard(card, null);

            // --- Lista de historial con botón eliminar y agrupación ---
            const lista = document.createElement('ul');
            lista.style.listStyle = 'none';
            lista.style.padding = '0';

            const ultimas = data.slice(0, 4);
            const antiguas = data.slice(4);

            // Mostrar las últimas 4 entradas directamente
            ultimas.forEach(item => {
                const li = document.createElement('li');
                li.style.marginBottom = '8px';
                li.innerHTML = `
        <strong>${formatearFechaDDMMYY(item.fecha)}</strong>
        <button class="eliminar-entrada-historial" data-id="${item._id}" style="margin-left:10px;background:#f44336;color:#fff;border:none;padding:2px 10px;border-radius:4px;cursor:pointer;">Eliminar</button>
        <br>
        <pre style="background:#f7f7f7;padding:4px 8px;border-radius:4px;">${item.series_string}</pre>
    `;
                lista.appendChild(li);
            });

            // Si hay más antiguas, agrúpalas en un <details>
            if (antiguas.length > 0) {
                const details = document.createElement('details');
                const summary = document.createElement('summary');
                summary.textContent = `Ver ${antiguas.length} entradas más antiguas`;
                details.appendChild(summary);

                antiguas.forEach(item => {
                    const li = document.createElement('li');
                    li.style.marginBottom = '8px';
                    li.innerHTML = `
            <strong>${formatearFechaDDMMYY(item.fecha)}</strong>
            <button class="eliminar-entrada-historial" data-id="${item._id}" style="margin-left:10px;background:#f44336;color:#fff;border:none;padding:2px 10px;border-radius:4px;cursor:pointer;">Eliminar</button>
            <br>
            <pre style="background:#f7f7f7;padding:4px 8px;border-radius:4px;">${item.series_string}</pre>
        `;
                    details.appendChild(li);
                });

                lista.appendChild(details);
            }

            contenedor.appendChild(lista);
        });
}

document.addEventListener('click', function (e) {
    if (e.target.classList.contains('eliminar-entrada-historial')) {
        const id = e.target.getAttribute('data-id');
        if (confirm('¿Seguro que quieres eliminar esta entrada del historial?')) {
            fetch(`${getApiUrl()}/historial/entrada/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        alert('Entrada eliminada');
                        // Recarga el historial en la card correspondiente
                        const card = e.target.closest('.ejercicio-card');
                        const ejercicioId = card ? card.querySelector('.ver-historial').dataset.id : null;
                        if (card && ejercicioId) {
                            mostrarGraficoHistorialEnCard(ejercicioId, card);
                        } else {
                            location.reload();
                        }
                    } else {
                        alert('Error al eliminar');
                    }
                });
        }
    }
});

window.mostrarGraficoHistorialEnCard = mostrarGraficoHistorialEnCard;
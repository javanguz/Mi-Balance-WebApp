document.addEventListener('DOMContentLoaded', function () {
    // --- INICIO CORRECCIÓN: LÓGICA PARA MENSAJE DE CONFIRMACIÓN DE ACTUALIZACIÓN ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('update') && urlParams.get('update') === 'success') {
        window.showToast('Movimiento actualizado con éxito.', 'success');
        // Limpiar el parámetro de la URL para evitar que el mensaje se muestre de nuevo al recargar
        urlParams.delete('update');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, document.title, newUrl);
    }
    // --- FIN CORRECCIÓN ---

    // Inicializar Tooltips de Bootstrap
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // --- LÓGICA PARA LOS BOTONES DE FILTRO DE TIPO ---
    const form = document.getElementById('registro-filtros-form');
    const tipoInput = document.getElementById('filtro_tipo');
    const tipoButtons = document.querySelectorAll('.tipo-btn');

    if (form && tipoInput && tipoButtons.length) {
        tipoButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Actualiza el valor del input oculto con el tipo seleccionado
                tipoInput.value = this.dataset.tipo;
                // Envía el formulario para aplicar el filtro
                form.submit();
            });
        });
    }

    // --- LÓGICA PARA EL BOTÓN DE ELIMINAR MOVIMIENTO ---
    const deleteModalEl = document.getElementById('modal-confirmar-eliminar-movimiento-registro');
    if (deleteModalEl) {
        const deleteModal = new bootstrap.Modal(deleteModalEl);
        const confirmDeleteBtn = document.getElementById('btn-confirmar-eliminacion-final-registro');
        let movementIdToDelete = null;

        // Escucha clics en todo el documento para delegar el evento
        document.body.addEventListener('click', function(event) {
            const deleteButton = event.target.closest('.btn-eliminar-movimiento-registro');
            if (deleteButton) {
                movementIdToDelete = deleteButton.dataset.id;
            }
        });

        // Cuando se confirma la eliminación en el modal
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!movementIdToDelete) return;
            try {
                const response = await fetch(`/venta/api/movimientos/${movementIdToDelete}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error al eliminar.');
                
                const row = document.getElementById(`movimiento-row-${movementIdToDelete}`);
                if (row) row.remove();
                
                window.showToast(result.message, 'success');
            } catch (error) {
                window.showToast(error.message, 'danger');
            } finally {
                deleteModal.hide();
                movementIdToDelete = null;
            }
        });
    }

    // --- LÓGICA PARA EL DATE RANGE PICKER ---
    const fechaDesdeInput = document.getElementById('fecha_desde');
    const fechaHastaInput = document.getElementById('fecha_hasta');
    const dateRangePicker = $('#daterange'); // Se necesita jQuery para daterangepicker

    if (fechaDesdeInput && fechaHastaInput && dateRangePicker.length) {
        const start = fechaDesdeInput.value ? moment(fechaDesdeInput.value) : null;
        const end = fechaHastaInput.value ? moment(fechaHastaInput.value) : null;

        dateRangePicker.daterangepicker({
            linkedCalendars: false,
            autoUpdateInput: false,
            autoApply: true,
            locale: {
                format: 'DD/MM/YYYY',
                applyLabel: 'Aplicar',
                cancelLabel: 'Limpiar',
                fromLabel: 'Desde',
                toLabel: 'Hasta',
                customRangeLabel: 'Personalizado',
                weekLabel: 'S',
                daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
                monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
                firstDay: 1
            },
            ranges: {
               'Hoy': [moment(), moment()],
               'Ayer': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
               'Últimos 7 Días': [moment().subtract(6, 'days'), moment()],
               'Este Mes': [moment().startOf('month'), moment().endOf('month')],
               'Este Año': [moment().startOf('year'), moment()]
            }
        });

        if (start && end) {
            dateRangePicker.val(start.format('DD/MM/YYYY') + ' - ' + end.format('DD/MM/YYYY'));
        }

        dateRangePicker.on('apply.daterangepicker', function(ev, picker) {
            $(this).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
            fechaDesdeInput.value = picker.startDate.format('YYYY-MM-DD');
            fechaHastaInput.value = picker.endDate.format('YYYY-MM-DD');
        });

        dateRangePicker.on('cancel.daterangepicker', function(ev, picker) {
            $(this).val('');
            fechaDesdeInput.value = '';
            fechaHastaInput.value = '';
        });

        // --- INICIO DE LA CORRECCIÓN ---
        // Se agrega un evento para manejar la entrada manual de fechas en el campo.
        dateRangePicker.on('change', function() {
            const value = $(this).val();
            const dates = value.split(' - ');
            if (dates.length === 2) {
                const startDate = moment(dates[0], 'DD/MM/YYYY', true);
                const endDate = moment(dates[1], 'DD/MM/YYYY', true);
        
                if (startDate.isValid() && endDate.isValid()) {
                    // Actualiza los campos ocultos que se envían al servidor
                    fechaDesdeInput.value = startDate.format('YYYY-MM-DD');
                    fechaHastaInput.value = endDate.format('YYYY-MM-DD');
        
                    // Actualiza el estado interno del daterangepicker para que el calendario refleje la fecha escrita
                    const picker = $(this).data('daterangepicker');
                    picker.setStartDate(startDate);
                    picker.setEndDate(endDate);
                }
            }
        });
        // --- FIN DE LA CORRECCIÓN ---
    }
    
    // --- LÓGICA DEL BOTÓN RESTABLECER ---
    const btnRestablecer = document.getElementById('btn-restablecer-filtros');
    if (btnRestablecer) {
        btnRestablecer.addEventListener('click', () => {
            window.location.href = '/registro';
        });
    }
    
    // Función para habilitar/deshabilitar el botón de restablecer
    function checkResetButtonState() {
        const busquedaInput = document.getElementById('busqueda');
        if (!btnRestablecer || !tipoInput || !fechaDesdeInput || !fechaHastaInput || !busquedaInput) return;

        const hasBusqueda = busquedaInput.value.trim() !== '';
        const hasFecha = fechaDesdeInput.value.trim() !== '' && fechaHastaInput.value.trim() !== '';
        const hasTipo = tipoInput.value !== 'todos';
        
        // El botón se habilita si hay al menos un filtro aplicado
        if (hasBusqueda || hasFecha || hasTipo) {
            btnRestablecer.removeAttribute('disabled');
        } else {
            btnRestablecer.setAttribute('disabled', 'disabled');
        }
    }

    // Verificar el estado del botón al cargar la página
    checkResetButtonState();
});

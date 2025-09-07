// public/js/reportes.client.js

document.addEventListener('DOMContentLoaded', function () {
    const reportesPage = document.getElementById('form-reportes');
    if (reportesPage) {

        // --- INICIO CORRECCIÓN: LÓGICA PARA MENSAJE DE CONFIRMACIÓN DE ACTUALIZACIÓN ---
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('update') && urlParams.get('update') === 'success') {
            window.showToast('Movimiento actualizado con éxito.', 'success');
            // Limpiar el parámetro de la URL para evitar que el mensaje se muestre de nuevo al recargar
            urlParams.delete('update');
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            window.history.replaceState({}, document.title, newUrl);
        }
        // --- FIN CORRECCIÓN ---

        function initializeTomSelect(selector, placeholder) {
            new TomSelect(selector, {
                plugins: ['remove_button'],
                create: false,
                maxItems: 10,
                placeholder: placeholder,
                render:{
                    item: function(data, escape) {
                        return `<div class="item">${escape(data.text)}</div>`;
                    },
                    option: function(data, escape) {
                        return `<div class="option">${escape(data.text)}</div>`;
                    }
                },
                onInitialize: function() {
                    if (this.items.length > 0) this.wrapper.classList.add('has-items');
                },
                onItemAdd: function() {
                    this.wrapper.classList.add('has-items');
                },
                onItemRemove: function() {
                    if (this.items.length === 0) this.wrapper.classList.remove('has-items');
                }
            });
        }

        initializeTomSelect('#categoria_id', 'Seleccione una o más categorías...');
        initializeTomSelect('#modalidad', 'Seleccione una o más modalidades...');
        initializeTomSelect('#clientes', 'Seleccione uno o más clientes...');
        initializeTomSelect('#proveedores', 'Seleccione uno o más proveedores...');
        
        const fechaDesdeInput = document.getElementById('fecha_desde');
        const fechaHastaInput = document.getElementById('fecha_hasta');
        const dateRangePicker = $('#daterange');
        const btnGenerarReporte = document.getElementById('btn-generar-reporte');
        
        function checkGenerarButtonState() {
            if (fechaDesdeInput.value && fechaHastaInput.value) {
                btnGenerarReporte.disabled = false;
            } else {
                btnGenerarReporte.disabled = true;
            }
        }

        if (fechaDesdeInput && fechaHastaInput && dateRangePicker.length) {
            const start = fechaDesdeInput.value ? moment(fechaDesdeInput.value) : null;
            const end = fechaHastaInput.value ? moment(fechaHastaInput.value) : null;

            dateRangePicker.daterangepicker({
                startDate: start || moment().startOf('year'),
                endDate: end || moment(),
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
                   'Este Mes': [moment().startOf('month'), moment().endOf('month')],
                   'Mes Pasado': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
                   'Últimos 3 Meses': [moment().subtract(2, 'month').startOf('month'), moment()],
                   'Este Año': [moment().startOf('year'), moment()],
                   'Año Pasado': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')]
                }
            });

            if (fechaDesdeInput.value && fechaHastaInput.value) {
                dateRangePicker.val(moment(start).format('DD/MM/YYYY') + ' - ' + moment(end).format('DD/MM/YYYY'));
            }

            dateRangePicker.on('apply.daterangepicker', function(ev, picker) {
                $(this).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
                fechaDesdeInput.value = picker.startDate.format('YYYY-MM-DD');
                fechaHastaInput.value = picker.endDate.format('YYYY-MM-DD');
                checkGenerarButtonState();
            });

            dateRangePicker.on('cancel.daterangepicker', function(ev, picker) {
                $(this).val('');
                fechaDesdeInput.value = '';
                fechaHastaInput.value = '';
                checkGenerarButtonState();
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
            
                        checkGenerarButtonState();
                    }
                }
            });
            // --- FIN DE LA CORRECCIÓN ---

            // --- INICIO DE LA CORRECCIÓN ---
            // Se asegura que los valores de fecha iniciales solo se establezcan
            // si no vienen ya definidos desde el servidor (para mantener el estado tras generar un reporte).
            if (!fechaDesdeInput.value || !fechaHastaInput.value) {
                const picker = dateRangePicker.data('daterangepicker');
                fechaDesdeInput.value = picker.startDate.format('YYYY-MM-DD');
                fechaHastaInput.value = picker.endDate.format('YYYY-MM-DD');
            }
            checkGenerarButtonState();
            // --- FIN DE LA CORRECCIÓN ---
        }

        const tipoInput = document.getElementById('tipo');
        const tipoButtonGroup = document.querySelector('.btn-group-reportes');

        if (tipoButtonGroup && tipoInput) {
            tipoButtonGroup.addEventListener('click', function(e) {
                const button = e.target.closest('button');
                if (button) {
                    const selectedValue = button.dataset.value;
                    tipoInput.value = selectedValue;
                    this.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    tipoInput.dispatchEvent(new Event('change'));
                }
            });
        }

        const resumenNivel1 = document.getElementById('resumen_nivel_1');
        const resumenNivel2 = document.getElementById('resumen_nivel_2');
        const resumenNivel3 = document.getElementById('resumen_nivel_3');
        const container2 = document.getElementById('resumen_nivel_2_container');
        const container3 = document.getElementById('resumen_nivel_3_container');
        
        const visualizacionContainer = document.getElementById('opciones-visualizacion-container');

        function toggleDisplayOptions() {
            const isResumenActive = resumenNivel1.value || resumenNivel2.value || resumenNivel3.value;
            if (visualizacionContainer) {
                visualizacionContainer.classList.toggle('d-none', isResumenActive);
            }
        }

        const allOptions = [
            { value: "", text: "-- Sin resumen --" },
            { value: "mensual", text: "Por Mes" },
            { value: "semanal", text: "Por Semana" },
            { value: "categoria", text: "Por Categoría" },
            { value: "entidad", text: "Por Cliente/Proveedor" },
            { value: "modalidad", text: "Por Modalidad" }
        ];

        const timeOptions = allOptions.filter(opt => opt.value === "" || opt.value === "mensual" || opt.value === "semanal");

        function populateSelect(select, options) {
            select.innerHTML = '';
            options.forEach(optData => {
                const option = new Option(optData.text, optData.value);
                select.add(option);
            });
        }

        function updateSummaryOptions() {
            const tipo = tipoInput.value;
            const optionsForLevel1 = (tipo === 'todos') ? timeOptions : allOptions;
            populateSelect(resumenNivel1, optionsForLevel1);
            resumenNivel1.dispatchEvent(new Event('change'));
            toggleDisplayOptions();
        }

        function updateSublevels() {
            const tipo = tipoInput.value;
            const val1 = resumenNivel1.value;
            const val2 = resumenNivel2.value;
            container2.style.display = 'none';
            container3.style.display = 'none';

            if (tipo === 'todos') {
                if (val1 === 'mensual') {
                    const options2 = allOptions.filter(opt => opt.value === '' || opt.value === 'semanal');
                    populateSelect(resumenNivel2, options2);
                    resumenNivel2.value = val2;
                    container2.style.display = 'block';
                }
            } else {
                if (val1) {
                    const options2 = allOptions.filter(opt => opt.value !== val1);
                    populateSelect(resumenNivel2, options2);
                    resumenNivel2.value = val2;
                    container2.style.display = 'block';
                }
                if (val1 && val2) {
                    const options3 = allOptions.filter(opt => opt.value !== val1 && opt.value !== val2);
                    populateSelect(resumenNivel3, options3);
                    container3.style.display = 'block';
                }
            }
            toggleDisplayOptions();
        }
        
        tipoInput.addEventListener('change', updateSummaryOptions);
        resumenNivel1.addEventListener('change', updateSublevels);
        resumenNivel2.addEventListener('change', updateSublevels);
        resumenNivel3.addEventListener('change', toggleDisplayOptions);

        function restoreSummaryState() {
            const urlParams = new URLSearchParams(window.location.search);
            updateSummaryOptions();
            
            const queryVal1 = urlParams.get('resumen_nivel_1');
            if (queryVal1) {
                resumenNivel1.value = queryVal1;
                updateSublevels();
                
                const queryVal2 = urlParams.get('resumen_nivel_2');
                if (queryVal2) {
                    resumenNivel2.value = queryVal2;
                    updateSublevels();
                    
                    const queryVal3 = urlParams.get('resumen_nivel_3');
                    if (queryVal3) {
                        resumenNivel3.value = queryVal3;
                    }
                }
            }
        }
        
        restoreSummaryState();

        const reporteGenerado = document.getElementById('reporte-generado');
        const btnVolverArriba = document.getElementById('btn-volver-arriba-reporte');

        if (reporteGenerado && btnVolverArriba) {
            
            const tooltipVolverArriba = bootstrap.Tooltip.getInstance(btnVolverArriba) || new bootstrap.Tooltip(btnVolverArriba);

            reporteGenerado.scrollIntoView({ behavior: 'smooth', block: 'start' });

            const scrollThreshold = reporteGenerado.offsetTop + 200;

            window.addEventListener('scroll', () => {
                if (window.scrollY > scrollThreshold) {
                    btnVolverArriba.classList.remove('d-none');
                } else {
                    btnVolverArriba.classList.add('d-none');
                    if (tooltipVolverArriba) {
                        tooltipVolverArriba.hide();
                    }
                }
            });

            btnVolverArriba.addEventListener('click', () => {
                if (tooltipVolverArriba) {
                    tooltipVolverArriba.hide();
                }
                reporteGenerado.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }

        const modalConfirmarAccionEl = document.getElementById('modal-confirmar-accion');
        if (modalConfirmarAccionEl) {
            const modalConfirmarAccion = new bootstrap.Modal(modalConfirmarAccionEl);
            const btnConfirmarFinal = document.getElementById('btn-confirmar-accion-final');
            let accionPendiente = null;

            document.body.addEventListener('click', function(event) {
                const button = event.target.closest('[data-bs-toggle="modal"][data-bs-target="#modal-confirmar-accion"]');
                if (button) {
                    accionPendiente = { type: button.dataset.action };
                    let msg = '¿Está seguro que desea continuar?';
                    if (accionPendiente.type.startsWith('pdf')) msg = '¿Desea generar el reporte en formato PDF?';
                    if (accionPendiente.type.startsWith('excel')) msg = '¿Desea generar el reporte en formato Excel?';
                    document.getElementById('confirmar-accion-body').textContent = msg;
                    modalConfirmarAccion.show();
                }
            });

            btnConfirmarFinal.addEventListener('click', async () => {
                if (!accionPendiente) return;

                const { type } = accionPendiente;
                const form = document.getElementById('form-reportes');
                const formData = new FormData(form);
                const params = new URLSearchParams();

                const multiSelects = ['categoria_id', 'modalidad', 'clientes', 'proveedores'];
                
                formData.forEach((value, key) => {
                    if (!multiSelects.includes(key)) params.append(key, value);
                });
                
                multiSelects.forEach(name => {
                    const select = form.querySelector(`select[name="${name}"]`);
                    if (select) Array.from(select.selectedOptions).forEach(option => params.append(name, option.value));
                });
                
                if (type.startsWith('pdf') || type.startsWith('excel')) {
                    const [formato] = type.split('-');                  
                    const resumenNivel1Value = params.get('resumen_nivel_1');
                    const route = resumenNivel1Value ? 'resumen' : 'detalle';
                    const finalParams = new URLSearchParams();
                    finalParams.append('desde', params.get('fecha_desde'));
                    finalParams.append('hasta', params.get('fecha_hasta'));
                    params.forEach((value, key) => {
                        if (key !== 'fecha_desde' && key !== 'fecha_hasta') finalParams.append(key, value);
                    });
                    
                    window.location.href = `/reportes/exportar/${route}/${formato}?${finalParams.toString()}`;
                }
                
                modalConfirmarAccion.hide();
                accionPendiente = null;
            });
        }

        const btnRestablecer = document.getElementById('btn-restablecer-filtros');
        if (btnRestablecer) {
            const comentariosSwitch = document.getElementById('mostrar_comentarios');
            const ordenSwitch = document.getElementById('invertir_orden');
            
            const tomSelects = ['#categoria_id', '#modalidad', '#clientes', '#proveedores']
                .map(selector => document.querySelector(selector)?.tomselect)
                .filter(Boolean);

            const checkResetButtonState = () => {
                const isReportGenerated = window.location.pathname.includes('/generar');
                const hasUserChanges = 
                    tipoInput.value !== 'todos' ||
                    comentariosSwitch.checked ||
                    ordenSwitch.checked ||
                    tomSelects.some(ts => ts.items.length > 0) ||
                    fechaDesdeInput.value !== '' ||
                    resumenNivel1.value !== '';
                btnRestablecer.disabled = !(isReportGenerated || hasUserChanges);
            };

            tipoInput.addEventListener('change', checkResetButtonState);
            comentariosSwitch.addEventListener('change', checkResetButtonState);
            ordenSwitch.addEventListener('change', checkResetButtonState);
            tomSelects.forEach(ts => ts.on('change', checkResetButtonState));
            dateRangePicker.on('apply.daterangepicker', checkResetButtonState);
            dateRangePicker.on('cancel.daterangepicker', checkResetButtonState);
            resumenNivel1.addEventListener('change', checkResetButtonState);
            resumenNivel2.addEventListener('change', checkResetButtonState);
            resumenNivel3.addEventListener('change', checkResetButtonState);

            btnRestablecer.addEventListener('click', () => {
                window.location.href = '/reportes';
            });

            checkResetButtonState();
        }
    }
});

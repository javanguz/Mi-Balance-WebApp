document.addEventListener('DOMContentLoaded', function () {
    const pagoPage = document.getElementById('form-cargar-pago');
    if (pagoPage) {
        // --- INYECCIÓN DE ESTILOS PARA LA BARRA DE DESPLAZAMIENTO ---
        const style = document.createElement('style');
        style.textContent = `.scrollable-results-pago { max-height: 300px; overflow-y: auto; }`;
        document.head.appendChild(style);

        // --- ELEMENTOS DEL DOM ---
        const searchInput = document.getElementById('proveedor-search');
     
           const searchResults = document.getElementById('search-results-pago');
        const proveedorIdInput = document.getElementById('proveedor_id');
        const categoriaSelect = document.getElementById('categoria_id_pago');
        const fechaInput = document.getElementById('fecha');
        const importeInput = document.getElementById('importe');
        const btnConfirmarMovimiento = document.getElementById('btn-confirmar-movimiento-pago');
        const btnConfirmarWrapper = document.getElementById('btn-confirmar-wrapper-pago');
        const confirmarTooltip = new bootstrap.Tooltip(btnConfirmarWrapper);
        const historialContainer = document.getElementById('historial-proveedor-container');
        const checkAjuste = document.getElementById('es_ajuste_pago');
        const btnClearProveedorSelection = document.getElementById('btn-clear-proveedor-selection');
        
        // --- MODALES ---
        const modalAgregarProveedor = new bootstrap.Modal(document.getElementById('modal-agregar-proveedor'));
        const modalConfirmarEliminarProveedor = new bootstrap.Modal(document.getElementById('modal-confirmar-eliminar-proveedor'));
        const modalConfirmarEliminarMovimiento = new bootstrap.Modal(document.getElementById('modal-confirmar-eliminar-movimiento-pago'));
        const modalConfirmarAjuste = new bootstrap.Modal(document.getElementById('modal-confirmar-ajuste-pago'));
        const modalConfirmarGestion = new bootstrap.Modal(document.getElementById('modal-confirmar-gestion-pago'));
        const modalConfirmarRestablecer = new bootstrap.Modal(document.getElementById('modal-confirmar-restablecer-pago'));
        const modalConfirmarGestionBody = document.getElementById('modal-confirmar-gestion-body-pago');
        const btnConfirmarGestionFinal = document.getElementById('btn-confirmar-gestion-final-pago');

        const btnEliminarProveedorModal = document.getElementById('btn-eliminar-proveedor-modal');
        if (btnEliminarProveedorModal) {
            btnEliminarProveedorModal.addEventListener('click', () => {
                modalAgregarProveedor.hide();

                const palabras = ['eliminar', 'borrar', 'quitar'];
                const palabra = palabras[Math.floor(Math.random() * palabras.length)];
                document.getElementById('palabra-confirmacion-pago').textContent = palabra;
                document.getElementById('input-confirmacion-pago').value = '';
                document.getElementById('btn-confirmar-eliminacion-final-pago').disabled = true;
                modalConfirmarEliminarProveedor.show();
        
            });
        }

        document.getElementById('input-confirmacion-pago').addEventListener('input', function() {
            const palabra = document.getElementById('palabra-confirmacion-pago').textContent;
            document.getElementById('btn-confirmar-eliminacion-final-pago').disabled = this.value.toLowerCase() !== palabra;
        });
        document.getElementById('btn-confirmar-eliminacion-final-pago').addEventListener('click', async () => {
            const id = document.getElementById('modal-proveedor-id').value;
            if (!id) return;
            try {
                const response = await fetch(`/pago/api/proveedores/${id}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error al eliminar.');
                
                window.showToast(result.message, 'success');
                modalConfirmarEliminarProveedor.hide();

                if (proveedorIdInput.value === id) {
                    resetearSeleccionProveedor();
                }
            } catch(error) {
                window.showToast(error.message, 'danger');
            }
        });
        
        const modalConfirmarGestionEl = document.getElementById('modal-confirmar-gestion-pago');
        if (modalConfirmarGestionEl) {
            modalConfirmarGestionEl.addEventListener('shown.bs.modal', () => {
                const backdrops = document.querySelectorAll('.modal-backdrop.fade.show');
                if (backdrops.length > 1) backdrops[backdrops.length - 1].style.zIndex = 1056;
            });
        }
        
        const checkAjustePago = document.getElementById('es_ajuste_pago');
        if (checkAjustePago && importeInput) {
            const labelAjustePago = document.querySelector('label[for="es_ajuste_pago"]');
            const infoIcon = checkAjustePago.closest('.d-flex').querySelector('.info-icon');

            const actualizarEstiloImporte = () => {
                if (checkAjustePago.checked) {
                    if (labelAjustePago) labelAjustePago.classList.remove('text-muted');
                    if (infoIcon) infoIcon.classList.remove('text-muted');
                    importeInput.classList.add('text-ingreso-regular');
                } else {
                    if (labelAjustePago) labelAjustePago.classList.add('text-muted');
                    if (infoIcon) infoIcon.classList.add('text-muted');
                    importeInput.classList.remove('text-ingreso-regular');
                }
            };
            checkAjustePago.addEventListener('change', actualizarEstiloImporte);
            actualizarEstiloImporte();
        }

        function checkFormValidity() {
            const isFormValid = proveedorIdInput.value.trim() !== '' && fechaInput.value.trim() !== '' && importeInput.value.trim() !== '' && parseFloat(importeInput.value) > 0 && categoriaSelect.value.trim() !== '';
            btnConfirmarMovimiento.disabled = !isFormValid;
            if (isFormValid) {
                confirmarTooltip.disable();
            } else {
                confirmarTooltip.enable();
            }
        }

        const comentarioTextarea = document.getElementById('comentarios');
        const charCounter = document.getElementById('char-counter-pago');
        const btnClearComentario = document.getElementById('btn-clear-comentario-pago');

        if (comentarioTextarea && charCounter && btnClearComentario) {
            const autoGrow = () => {
                comentarioTextarea.style.height = 'auto';
                comentarioTextarea.style.height = (comentarioTextarea.scrollHeight) + 'px';
            };

            const updateCounter = () => {
                const count = comentarioTextarea.value.length;
                charCounter.textContent = `${count} / 140`;
                btnClearComentario.classList.toggle('d-none', count === 0);
                charCounter.classList.toggle('d-none', count === 0);
            };
            comentarioTextarea.addEventListener('input', () => {
                updateCounter();
                autoGrow();
            });
            btnClearComentario.addEventListener('click', () => {
                comentarioTextarea.value = '';
                updateCounter();
                autoGrow();
                comentarioTextarea.focus();
            });
            updateCounter();
            autoGrow();
        }

        const modalidadSelect = document.getElementById('modalidad-select-pago');
        const modalGestionModalidadesEl = document.getElementById('modal-gestion-modalidades-pago');
        if (modalidadSelect && modalGestionModalidadesEl) {
            const modalOtraModalidad = new bootstrap.Modal(document.getElementById('modal-otra-modalidad-pago'));
            const nuevaModalidadInput = document.getElementById('input-nueva-modalidad-pago');
            let previousModalidadValue = modalidadSelect.value;

            modalidadSelect.addEventListener('focus', function() { previousModalidadValue = this.value; });
            modalidadSelect.addEventListener('change', function() {
                if (this.value === 'Otra...') {
                    nuevaModalidadInput.value = '';
                    modalOtraModalidad.show();
                }
            });
            document.getElementById('btn-guardar-nueva-modalidad-pago').addEventListener('click', function() {
                const nuevaModalidad = nuevaModalidadInput.value.trim();
                
                if (!nuevaModalidad) {
                    modalidadSelect.value = previousModalidadValue;
                    modalOtraModalidad.hide();
                    return;
                }

                const existingOptions = Array.from(modalidadSelect.options).map(opt => opt.text.toLowerCase());
                if (existingOptions.includes(nuevaModalidad.toLowerCase())) {
                    window.showToast('Esa modalidad ya existe.', 'danger');
                    return;
                }
                
                const existingCustomOption = modalidadSelect.querySelector('.custom-modalidad');
                if (existingCustomOption) existingCustomOption.remove();
               
                const newOption = new Option(nuevaModalidad, nuevaModalidad, true, true);
                newOption.classList.add('custom-modalidad');
                modalidadSelect.insertBefore(newOption, modalidadSelect.querySelector('option[value="Otra..."]'));
                
                modalOtraModalidad.hide();
            });

            modalGestionModalidadesEl.addEventListener('show.bs.modal', populateModalidadesGestion);
            modalGestionModalidadesEl.addEventListener('hidden.bs.modal', () => refreshModalidadSelect());
        }

        async function refreshModalidadSelect(selectedValue) {
            try {
                const response = await fetch('/pago/api/modalidades');
                if (!response.ok) throw new Error('No se pudieron cargar las modalidades.');
                const modalidades = await response.json();
                
                const customOption = modalidadSelect.querySelector('.custom-modalidad');
                const currentValue = selectedValue || (customOption ? customOption.value : modalidadSelect.value);
                
                modalidadSelect.innerHTML = '';
                modalidades.forEach(mod => modalidadSelect.add(new Option(mod.nombre, mod.nombre)));
                if (customOption) modalidadSelect.add(customOption);
                modalidadSelect.add(new Option('Otra...', 'Otra...'));

                if (Array.from(modalidadSelect.options).some(opt => opt.value === currentValue)) {
                    modalidadSelect.value = currentValue;
                } else if (modalidades.length > 0) {
                    modalidadSelect.value = modalidades[0].nombre;
                }
            } catch (error) {
                window.showToast(error.message, 'danger');
            }
        }

        async function populateModalidadesGestion() {
            try {
                const response = await fetch('/pago/api/modalidades');
                if (!response.ok) throw new Error('No se pudieron cargar las modalidades.');
                const modalidades = await response.json();
                const listaModalidadesGestion = document.getElementById('lista-modalidades-gestion-pago');
                listaModalidadesGestion.innerHTML = '';

                modalidades.forEach(mod => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.className = `flex-grow-1 ${mod.es_editable ? '' : 'text-muted'}`;
                    nameSpan.textContent = mod.nombre;
                    li.appendChild(nameSpan);
                   
                    if (mod.es_editable) {
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'd-flex gap-1';
                    
                        const editBtn = document.createElement('button');
                        editBtn.className = 'btn btn-sm btn-icon btn-primary';
                        editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
                        editBtn.title = 'Editar modalidad';

                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'btn btn-sm btn-icon btn-danger';
                        deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                        deleteBtn.title = 'Eliminar modalidad';

                        actionsDiv.appendChild(editBtn);
                        actionsDiv.appendChild(deleteBtn);
                        li.appendChild(actionsDiv);
      
                        editBtn.addEventListener('click', () => {
                            if (li.querySelector('input.form-control-sm')) return;

                            editBtn.disabled = true;
                            deleteBtn.disabled = true;
                            nameSpan.style.display = 'none';
                            actionsDiv.style.display = 'none';

                            const editContainer = document.createElement('div');
                            editContainer.className = 'd-flex align-items-center gap-2 flex-grow-1';
                            
                            const input = document.createElement('input');
                            input.type = 'text';
                            input.value = mod.nombre;
                            input.className = 'form-control form-control-sm';
                 
                            const saveBtn = document.createElement('button');
                            saveBtn.className = 'btn btn-sm btn-icon btn-primary';
                            saveBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
                            saveBtn.title = 'Guardar cambios';
        
                            const cancelBtn = document.createElement('button');
                            cancelBtn.className = 'btn btn-sm btn-icon btn-primary';
                            cancelBtn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
                            cancelBtn.title = 'Cancelar edición';
        
                            editContainer.appendChild(input);
                            editContainer.appendChild(saveBtn);
                            editContainer.appendChild(cancelBtn);
                            li.prepend(editContainer);
                            input.focus();

                            const cancelEdit = () => {
                                editContainer.remove();
                                nameSpan.style.display = 'block';
                                actionsDiv.style.display = 'flex';
                                editBtn.disabled = false;
                                deleteBtn.disabled = false;
                            };
        
                            cancelBtn.addEventListener('click', cancelEdit);
                            saveBtn.addEventListener('click', async () => {
                                const newValue = input.value.trim();
                                if (newValue && newValue !== mod.nombre) {
                                     try {
                                        const saveResponse = await fetch(`/pago/api/modalidades/${mod.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ nombre: newValue })
                                        });
                                        const result = await saveResponse.json();
                                         if (!saveResponse.ok) throw new Error(result.message);
                                         mod.nombre = newValue;
                                        nameSpan.textContent = newValue;
                                        window.showToast('Modalidad actualizada.', 'success');
                                        cancelEdit();
                                    } catch (error) {
                                        window.showToast(error.message, 'danger');
                                    }
                                } else {
                                    cancelEdit();
                                }
                            });
                        });

                        deleteBtn.addEventListener('click', () => {
                             modalConfirmarGestionBody.innerHTML = `¿Seguro que desea eliminar la modalidad <strong>${mod.nombre}</strong>? Los movimientos asociados se cambiarán a <strong>Efectivo</strong>.`;
                             modalConfirmarGestion.show();
                             btnConfirmarGestionFinal.onclick = async () => {
                                 try {
                                     const delResponse = await fetch(`/pago/api/modalidades/${mod.id}`, { method: 'DELETE' });
                                     const result = await delResponse.json();
                                     if (!delResponse.ok) throw new Error(result.message);
                                     window.showToast(result.message, 'success');
                                     populateModalidadesGestion();
                                 } catch (error) { window.showToast(error.message, 'danger');
                                 }
                                 finally { modalConfirmarGestion.hide();
                                 }
                             };
                        });
                    }
                    listaModalidadesGestion.appendChild(li);
                });
            } catch (error) { window.showToast(error.message, 'danger'); }
        }

        document.getElementById('form-agregar-modalidad-pago').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('input-nueva-modalidad-gestion-pago');
            const nombre = input.value.trim();
            if (!nombre) return;

            const listaModalidadesGestion = document.getElementById('lista-modalidades-gestion-pago');
           const existingNames = Array.from(listaModalidadesGestion.querySelectorAll('li span.flex-grow-1'))
                                    .map(span => span.textContent.trim().toLowerCase());
            
            if (existingNames.includes(nombre.toLowerCase())) {
                window.showToast('Esa modalidad ya existe.', 'danger');
                return;
            }

            try {
                 const response = await fetch('/pago/api/modalidades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre }) });
                 const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                input.value = '';
                 populateModalidadesGestion();
                window.showToast('Modalidad agregada.', 'success');
            } catch (error) { window.showToast(error.message, 'danger'); }
        });

        const modalGestionCategoriasEl = document.getElementById('modal-gestion-categorias-pago');
        if (modalGestionCategoriasEl) {
            modalGestionCategoriasEl.addEventListener('show.bs.modal', populateCategoriasGestion);
            modalGestionCategoriasEl.addEventListener('hidden.bs.modal', () => refreshAllCategorySelects(categoriaSelect.value));
        }

        async function refreshAllCategorySelects(newValueToSelect) {
            try {
                const response = await fetch(`/pago/api/categorias?tipo=proveedor`);
                if (!response.ok) throw new Error('No se pudieron cargar las categorías.');
                const categories = await response.json();
                document.querySelectorAll(`select[id*="categoria"]`).forEach(select => {
                    const currentValue = select.value;
                    select.innerHTML = '<option value="">-- Seleccione --</option>';
                    categories.forEach(cat => {
                        const option = new Option(cat.nombre, cat.id);
                        option.dataset.editable = cat.es_editable;
                        select.add(option);
                    });
                    select.value = (select.id === 'categoria_id_pago') ? newValueToSelect : currentValue;
                 });
                if (newValueToSelect) categoriaSelect.value = newValueToSelect;
            } catch (error) { window.showToast(error.message, 'danger');
            }
        }

        async function populateCategoriasGestion() {
            try {
                const response = await fetch(`/pago/api/categorias?tipo=proveedor`);
                if (!response.ok) throw new Error('No se pudieron cargar las categorías.');
                const categorias = await response.json();
                const listaCategoriasGestion = document.getElementById('lista-categorias-gestion-pago');
                listaCategoriasGestion.innerHTML = '';
        
                const categoriasEditables = categorias.filter(cat => cat.es_editable === 1);
        
                categoriasEditables.forEach(cat => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'flex-grow-1';
                    nameSpan.textContent = cat.nombre;
                    li.appendChild(nameSpan);
        
                    if (cat.es_editable) {
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'd-flex gap-1';
        
                        const editBtn = document.createElement('button');
                        editBtn.className = 'btn btn-sm btn-icon btn-primary';
                        editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
                        editBtn.title = 'Editar categoría';
        
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'btn btn-sm btn-icon btn-danger';
                        deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                        deleteBtn.title = 'Eliminar categoría';
        
                        actionsDiv.appendChild(editBtn);
                        actionsDiv.appendChild(deleteBtn);
                        li.appendChild(actionsDiv);
                        editBtn.addEventListener('click', () => {
                            if (li.querySelector('input.form-control-sm')) return;
        
                            editBtn.disabled = true;
                            deleteBtn.disabled = true;
                            nameSpan.style.display = 'none';
                            actionsDiv.style.display = 'none';
        
                            const editContainer = document.createElement('div');
                            editContainer.className = 'd-flex align-items-center gap-2 flex-grow-1';
                            
                            const input = document.createElement('input');
                            input.type = 'text';
                            input.value = cat.nombre;
                            input.className = 'form-control form-control-sm';
                 
                            const saveBtn = document.createElement('button');
                            saveBtn.className = 'btn btn-sm btn-icon btn-primary';
                            saveBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
                            saveBtn.title = 'Guardar cambios';
        
                            const cancelBtn = document.createElement('button');
                            cancelBtn.className = 'btn btn-sm btn-icon btn-primary';
                            cancelBtn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
                            cancelBtn.title = 'Cancelar edición';
        
                            editContainer.appendChild(input);
                            editContainer.appendChild(saveBtn);
                            editContainer.appendChild(cancelBtn);
                            li.prepend(editContainer);
                            input.focus();
                            const cancelEdit = () => {
                                editContainer.remove();
                                nameSpan.style.display = 'block';
                                actionsDiv.style.display = 'flex';
                                editBtn.disabled = false;
                                deleteBtn.disabled = false;
                            };
        
                            cancelBtn.addEventListener('click', cancelEdit);
                            saveBtn.addEventListener('click', async () => {
                                const newValue = input.value.trim();
                                if (newValue && newValue !== cat.nombre) {
                                     try {
                                        const saveResponse = await fetch(`/pago/api/categorias/${cat.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ nombre: newValue })
                                        });
                                        const result = await saveResponse.json();
                                         if (!saveResponse.ok) throw new Error(result.message);
                                         cat.nombre = newValue;
                                        nameSpan.textContent = newValue;
                                        window.showToast('Categoría actualizada.', 'success');
                                        cancelEdit();
                                    } catch (error) {
                                        window.showToast(error.message, 'danger');
                                    }
                                } else {
                                    cancelEdit();
                                }
                            });
                        });
        
                        deleteBtn.addEventListener('click', () => {
                            modalConfirmarGestionBody.innerHTML = `¿Seguro que desea eliminar la categoría <strong>${cat.nombre}</strong>? Los movimientos asociados pasarán a <strong>Egresos sin categoría</strong>.`;
                            modalConfirmarGestion.show();
                        
                            btnConfirmarGestionFinal.onclick = async () => {
                                try {
                                    const delResponse = await fetch(`/pago/api/categorias/${cat.id}`, { method: 'DELETE' });
                                     const result = await delResponse.json();
                                    if (!delResponse.ok) throw new Error(result.message);
                                     window.showToast(result.message, 'success');
                                    populateCategoriasGestion();
                                } catch (error) {
                                     window.showToast(error.message, 'danger');
                                } finally {
                                    modalConfirmarGestion.hide();
                                }
                            };
                        });
                    } else {
                        nameSpan.classList.add('text-muted');
                    }
                    listaCategoriasGestion.appendChild(li);
                });
            } catch (error) {
                window.showToast(error.message, 'danger');
            }
        }

        document.getElementById('form-agregar-categoria-pago').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('input-nueva-categoria-gestion-pago');
            const nombre = input.value.trim();
            if (!nombre) return;

            const listaCategoriasGestion = document.getElementById('lista-categorias-gestion-pago');
           const existingNames = Array.from(listaCategoriasGestion.querySelectorAll('li span.flex-grow-1'))
                                    .map(span => span.textContent.trim().toLowerCase());

            if (existingNames.includes(nombre.toLowerCase())) {
                window.showToast('Esa categoría ya existe.', 'danger');
                return;
            }

            try {
                 const response = await fetch('/pago/api/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, tipo: 'proveedor' }) });
                 const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                input.value = '';
                 populateCategoriasGestion();
                window.showToast('Categoría agregada.', 'success');
            } catch (error) { window.showToast(error.message, 'danger'); }
        });

        async function cargarHistorialProveedor(proveedorId) {
            try {
                const response = await fetch(`/pago/api/proveedores/${proveedorId}/movimientos`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'No se pudo cargar el historial.');
                historialContainer.innerHTML = data.html;
                const tooltipTriggerList = historialContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
                [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
            } catch (error) {
                window.showToast(error.message, 'danger');
                historialContainer.innerHTML = '<p class="text-center text-danger">Error al cargar el historial.</p>';
            }
        }

        function seleccionarProveedor(proveedor) {
            proveedorIdInput.value = proveedor.id;
            searchInput.value = `${proveedor.nombre} (${proveedor.id})`;
            searchInput.disabled = true;
            searchResults.innerHTML = '';
            
            btnClearProveedorSelection.classList.remove('d-none');
            
            const defaultOption = Array.from(categoriaSelect.options).find(opt => opt.dataset.editable === '0');
            categoriaSelect.value = proveedor.categoria_id || (defaultOption ? defaultOption.value : "");
            cargarHistorialProveedor(proveedor.id);
            checkFormValidity();
        }

        function resetearSeleccionProveedor() {
            proveedorIdInput.value = '';
            const defaultOption = Array.from(categoriaSelect.options).find(opt => opt.dataset.editable === '0');
            categoriaSelect.value = defaultOption ? defaultOption.value : categoriaSelect.options[0].value;
            searchInput.value = '';
            searchInput.disabled = false;
            searchInput.focus();
            historialContainer.innerHTML = '';
            
            btnClearProveedorSelection.classList.add('d-none');
            
            checkFormValidity();
        }

        function restablecerFormularioCompleto() {
            resetearSeleccionProveedor();
            pagoPage.reset();
            fechaInput.value = new Date().toISOString().slice(0, 10);
            if (checkAjustePago) {
                checkAjustePago.checked = false;
                checkAjustePago.dispatchEvent(new Event('change'));
            }
            if (comentarioTextarea) {
                comentarioTextarea.value = '';
                comentarioTextarea.dispatchEvent(new Event('input'));
            }
            checkFormValidity();
            window.showToast('Formulario restablecido.', 'success');
        }
        
        function checkAndApplyScroll() {
            const itemCount = searchResults.children.length;
            searchResults.classList.toggle('scrollable-results-pago', itemCount > 5);
        }

        async function mostrarProveedoresRecientes() {
            if (proveedorIdInput.value) { searchResults.innerHTML = '';
                return; }
            try {
                const response = await fetch('/pago/api/proveedores/recientes');
                const proveedoresRecientes = await response.json();
                if (!response.ok) throw new Error('No se pudieron cargar los proveedores recientes.');
                
                searchResults.innerHTML = '';
                if (proveedoresRecientes.length > 0) {
                    const header = document.createElement('li');
                    header.className = 'list-group-item border-start border-end border-bottom small bg-light text-muted fw-semibold';
                    header.textContent = 'Últimos utilizados';
                    searchResults.appendChild(header);
                    proveedoresRecientes.forEach(p => {
                        const item = document.createElement('a');
                        item.href = '#';
                        item.className = 'list-group-item list-group-item-action bg-light d-flex align-items-center';
               
                          item.innerHTML = `<span class="badge rounded-pill me-2" style="background-color: #cecbd1ff; color: #48536b">${p.id}</span>${p.nombre}`;
                        item.addEventListener('click', (e) => { e.preventDefault(); seleccionarProveedor(p); });
                        searchResults.appendChild(item);
                    });
                }
                checkAndApplyScroll();
            } catch (error) {
                window.showToast(error.message, 'danger');
            }
        }
        
        async function buscarTodosLosProveedores() {
            try {
                const response = await fetch('/pago/api/proveedores/todos');
                const proveedores = await response.json();
                if (!response.ok) throw new Error('No se pudo cargar el listado completo de proveedores.');
                searchResults.innerHTML = '';
                if (proveedores.length > 0) {
                    const header = document.createElement('li');
                    header.className = 'list-group-item list-group-item-secondary small bg-light text-muted fw-semibold';
                    header.textContent = `Mostrando ${proveedores.length} proveedores`;
                    searchResults.appendChild(header);
                    proveedores.forEach(p => {
                        const item = document.createElement('a');
                        item.href = '#';
                        item.className = 'list-group-item list-group-item-action bg-light d-flex align-items-center';
               
                          item.innerHTML = `<span class="badge rounded-pill me-2" style="background-color: #cecbd1ff; color: #48536b">${p.id}</span>${p.nombre}`;
                        item.addEventListener('click', (e) => { e.preventDefault(); seleccionarProveedor(p); });
                        searchResults.appendChild(item);
                    });
                } else {
                     const noResultsItem = document.createElement('li');
                     noResultsItem.className = 'list-group-item text-muted';
                     noResultsItem.textContent = 'No hay proveedores registrados.';
                     searchResults.appendChild(noResultsItem);
                }
                checkAndApplyScroll();
            } catch (error) {
                window.showToast(error.message, 'danger');
            }
        }

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim() === '') mostrarProveedoresRecientes();
        });
        searchInput.addEventListener('blur', () => {
            setTimeout(() => { searchResults.innerHTML = ''; }, 200);
        });
        searchInput.addEventListener('input', async () => {
            const query = searchInput.value;
            if (query === '*') { buscarTodosLosProveedores(); return; }
            if (query.length === 0) { mostrarProveedoresRecientes(); return; }
            if (query.length < 2) { searchResults.innerHTML = ''; return; }

            try {
                const response = await fetch(`/pago/api/proveedores?q=${query}`);
                const proveedores = await response.json();
                if (!response.ok) throw new Error('Error al buscar.');
                
                searchResults.innerHTML = '';
                const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

                proveedores.forEach(p => {
                const item = document.createElement('a');
                item.href = '#';
                  item.className = 'list-group-item list-group-item-action bg-light d-flex justify-content-between align-items-center';
                const nombreResaltado = p.nombre.replace(regex, `<strong class="search-highlight">$&</strong>`);
                const idResaltado = p.id.toString().replace(regex, `<strong class="search-highlight">$&</strong>`);
                let htmlPrincipal = `<div><span class="badge bg-secondary rounded-pill me-2">${idResaltado}</span>${nombreResaltado}</div>`;
                let htmlCuit = '';
                if (p.cuit && p.cuit.match(regex)) {
                    const cuitResaltado = p.cuit.replace(regex, `<strong class="search-highlight">$&</strong>`);
                    htmlCuit = `<div class="text-muted small">CUIT: ${cuitResaltado}</div>`;
                }
                item.innerHTML = htmlPrincipal + htmlCuit;
                item.addEventListener('click', (e) => { e.preventDefault(); seleccionarProveedor(p); });
                searchResults.appendChild(item);
            });
                checkAndApplyScroll();
            } catch (error) {
                window.showToast(error.message, 'danger');
            }
        });

        btnClearProveedorSelection.addEventListener('click', resetearSeleccionProveedor);
        document.getElementById('btn-guardar-proveedor').addEventListener('click', async () => {
            const id = document.getElementById('modal-proveedor-id').value;
            const data = {
                nombre: document.getElementById('modal-proveedor-nombre').value,
                cuit: document.getElementById('modal-proveedor-cuit').value,
                telefono: document.getElementById('modal-proveedor-telefono').value,
                email: document.getElementById('modal-proveedor-email').value,
                categoria_id: document.getElementById('modal-proveedor-categoria').value,
                comentarios: document.getElementById('modal-proveedor-comentarios').value,
            };
            if (!data.nombre || !data.cuit) { window.showToast('Nombre y CUIT son obligatorios.', 'danger'); return; }
            
             try {
                const response = await fetch(id ? `/pago/api/proveedores/${id}` : '/pago/api/proveedores', {
                    method: id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error al guardar.');
                
                modalAgregarProveedor.hide();
                window.showToast(`Proveedor ${id ? 'actualizado' : 'creado'} con éxito.`, 'success');
                seleccionarProveedor(result.newProveedor || result.updatedProveedor);
            } catch(error) {
                window.showToast(error.message, 'danger');
            }
        });
        
        async function procesarEnvioFormulario() {
            const formData = new FormData(pagoPage);
            const data = Object.fromEntries(formData.entries());
            if (!data.proveedor_id || !data.categoria_id || !data.importe || data.importe <= 0) {
                window.showToast('Complete todos los campos obligatorios.', 'danger');
                return;
            }
            try {
                const response = await fetch(pagoPage.action, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error al procesar el egreso.');
                if (result.redirectTo) {
                    window.location.href = result.redirectTo;
                } else {
                    window.showToast(result.message, 'success');
                    importeInput.value = '';
                    if (comentarioTextarea) {
                        comentarioTextarea.value = '';
                        comentarioTextarea.dispatchEvent(new Event('input'));
                    }
                    cargarHistorialProveedor(data.proveedor_id);
                    checkFormValidity();
                }
            } catch (error) {
                window.showToast(error.message, 'danger');
            }
        }

        pagoPage.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (checkAjuste.checked) {
                modalConfirmarAjuste.show();
            } else {
                procesarEnvioFormulario();
             }
        });
        document.getElementById('btn-continuar-ajuste-pago').addEventListener('click', () => {
            modalConfirmarAjuste.hide();
            procesarEnvioFormulario();
        });
        document.getElementById('btn-volver-ajuste-pago').addEventListener('click', () => {
            checkAjuste.checked = false;
            checkAjuste.dispatchEvent(new Event('change'));
        });

        // --- LÓGICA PARA ELIMINAR MOVIMIENTO DESDE HISTORIAL ---
        historialContainer.addEventListener('click', function(event) {
            const deleteButton = event.target.closest('.btn-eliminar-movimiento-historial');
            if (deleteButton) {
                const movId = deleteButton.dataset.id;
                const modalConfirmBtn = document.getElementById('btn-confirmar-eliminacion-movimiento-final-pago');
                if (modalConfirmBtn) {
                    modalConfirmBtn.dataset.id = movId;
                    modalConfirmarEliminarMovimiento.show();
                }
            }
        });
        
        document.getElementById('btn-confirmar-eliminacion-movimiento-final-pago').addEventListener('click', async function() {
            const movId = this.dataset.id;
            if (!movId) return;
            try {
                const response = await fetch(`/venta/api/movimientos/${movId}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error al eliminar.');
                window.showToast(result.message, 'success');
                // Vuelve a cargar el historial del proveedor para reflejar el cambio.
                if (proveedorIdInput.value) {
                    cargarHistorialProveedor(proveedorIdInput.value);
                }
            } catch(error) {
                window.showToast(error.message, 'danger');
            } finally {
                modalConfirmarEliminarMovimiento.hide();
            }
        });


        const modalGestionarProveedoresEl = document.getElementById('modal-gestionar-proveedores');
        if (modalGestionarProveedoresEl) {
            const modalGestionarProveedores = new bootstrap.Modal(modalGestionarProveedoresEl);
            const listaGestionProveedores = document.getElementById('lista-gestion-proveedores');
            const inputBuscarGestion = document.getElementById('input-buscar-gestion-proveedor');
            const btnNuevoProveedorGestion = document.getElementById('btn-nuevo-proveedor-gestion');
            async function populateProveedoresGestion() {
            try {
                const response = await fetch('/pago/api/proveedores/todos');
                if (!response.ok) throw new Error('No se pudo cargar la lista de proveedores.');
                const proveedores = await response.json();
                
                listaGestionProveedores.innerHTML = '';
                if (proveedores.length === 0) {
                    listaGestionProveedores.innerHTML = '<li class="list-group-item text-muted">No hay proveedores registrados.</li>';
                    return;
                }

                proveedores.forEach(proveedor => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                
                    li.dataset.nombre = proveedor.nombre.toLowerCase();
                    li.dataset.id = proveedor.id.toString();

                    const nombreSpan = document.createElement('span');
                    nombreSpan.innerHTML = `${proveedor.nombre}  <span class="text-muted small me-2">(${proveedor.id})</span>`;
                    li.appendChild(nombreSpan);

                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn btn-sm btn-icon btn-primary';
                    editBtn.innerHTML = '<i class="fa-solid fa-user-gear"></i>';
                    editBtn.title = 'Editar Proveedor';
                    editBtn.addEventListener('click', async () => {
                        modalGestionarProveedores.hide();
                        const response = await fetch(`/pago/api/proveedores/${proveedor.id}`);
                        const proveedorData = await response.json();
                
                        if (response.ok) {
                            document.getElementById('modal-proveedor-label').textContent = 'Editar Proveedor';
                            document.getElementById('modal-proveedor-id').value = proveedorData.id;
                            document.getElementById('modal-proveedor-nombre').value = proveedorData.nombre;
                            document.getElementById('modal-proveedor-cuit').value = proveedorData.cuit;
                            document.getElementById('modal-proveedor-telefono').value = proveedorData.telefono;
                            document.getElementById('modal-proveedor-email').value = proveedorData.email;
                            document.getElementById('modal-proveedor-categoria').value = proveedorData.categoria_id || '';
                            document.getElementById('modal-proveedor-comentarios').value = proveedorData.observaciones;
                            document.getElementById('btn-eliminar-proveedor-modal').classList.remove('d-none');
                            modalAgregarProveedor.show();
                        } else {
                            window.showToast('No se pudo cargar la información del proveedor.', 'danger');
                        }
                    });
                    li.appendChild(editBtn);
                    listaGestionProveedores.appendChild(li);
                });

            } catch (error) {
                window.showToast(error.message, 'danger');
                listaGestionProveedores.innerHTML = '<li class="list-group-item text-danger">Error al cargar proveedores.</li>';
            }
         }

            modalGestionarProveedoresEl.addEventListener('show.bs.modal', populateProveedoresGestion);
          inputBuscarGestion.addEventListener('input', function() {
            const normalizeText = (text) => {
                return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
             };

            const filtro = this.value.toLowerCase();
            const filtroNormalizado = normalizeText(filtro);
            const items = listaGestionProveedores.querySelectorAll('li[data-nombre]');
    
            items.forEach(item => {
                const nombre = item.dataset.nombre;
                const id = item.dataset.id;
              
                const nombreNormalizado = normalizeText(nombre);
                const coincide = nombreNormalizado.includes(filtroNormalizado) || id.includes(filtro);
                
                item.classList.toggle('d-none', !coincide);
            });
              });


                btnNuevoProveedorGestion.addEventListener('click', () => {
                modalGestionarProveedores.hide();
                const form = document.getElementById('form-agregar-proveedor');
                if (form) form.reset();
                document.getElementById('modal-proveedor-label').textContent = 'Agregar Nuevo Proveedor';
                document.getElementById('btn-eliminar-proveedor-modal').classList.add('d-none');
                 document.getElementById('modal-proveedor-id').value = '';

                modalAgregarProveedor.show();
            });
        }

        // --- INICIALIZACIÓN FINAL ---
        [fechaInput, importeInput, categoriaSelect].forEach(el => {
            el.addEventListener('input', checkFormValidity);
            el.addEventListener('change', checkFormValidity);
        });
        if (proveedorIdInput.value) {
            cargarHistorialProveedor(proveedorIdInput.value);
        }
        
        checkFormValidity();
        const btnConfirmarRestablecerFinal = document.getElementById('btn-confirmar-restablecer-final-pago');
        if (btnConfirmarRestablecerFinal) {
            btnConfirmarRestablecerFinal.addEventListener('click', () => {
                restablecerFormularioCompleto();
                modalConfirmarRestablecer.hide();
            });
        }
    }
});

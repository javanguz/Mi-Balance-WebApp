//--- public\js\venta.client.js

document.addEventListener('DOMContentLoaded', function () {
    const ventaPage = document.getElementById('form-cargar-venta');
    if (ventaPage) {
        
        // Se inicializan todos los tooltips de Bootstrap en la página.
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
                
        // --- INYECCIÓN DE ESTILOS PARA LA BARRA DE DESPLAZAMIENTO ---
        const style = document.createElement('style');
        style.textContent = `.scrollable-results { max-height: 300px; overflow-y: auto; }`;
        document.head.appendChild(style);

        // Elementos del formulario
        const searchInput = document.getElementById('cliente-search');
        const searchResults = document.getElementById('search-results');
        const clienteIdInput = document.getElementById('cliente_id');
        const categoriaSelect = document.getElementById('categoria_id');
        const fechaInput = document.getElementById('fecha');
        const importeInput = document.getElementById('importe');
        const btnConfirmarMovimiento = document.getElementById('btn-confirmar-movimiento');
        const btnConfirmarWrapper = document.getElementById('btn-confirmar-wrapper');
        const confirmarTooltip = new bootstrap.Tooltip(btnConfirmarWrapper);
        // Elementos de la UI
        const historialContainer = document.getElementById('historial-cliente-container');
        const checkAjuste = document.getElementById('es_ajuste_venta');
        const btnClearClienteSelection = document.getElementById('btn-clear-cliente-selection');
        
        // Modales
        const modalAgregarCliente = new bootstrap.Modal(document.getElementById('modal-agregar-cliente'));
        const modalEditarCliente = new bootstrap.Modal(document.getElementById('modal-editar-cliente'));
        const modalConfirmarEliminarCliente = new bootstrap.Modal(document.getElementById('modal-confirmar-eliminar'));
        const modalConfirmarEliminarMovimiento = new bootstrap.Modal(document.getElementById('modal-confirmar-eliminar-movimiento'));
        const modalConfirmarAjuste = new bootstrap.Modal(document.getElementById('modal-confirmar-ajuste'));
        const modalConfirmarGestion = new bootstrap.Modal(document.getElementById('modal-confirmar-gestion'));
        const modalConfirmarRestablecer = new bootstrap.Modal(document.getElementById('modal-confirmar-restablecer'));
        const modalConfirmarGestionBody = document.getElementById('modal-confirmar-gestion-body');
        const btnConfirmarGestionFinal = document.getElementById('btn-confirmar-gestion-final');
        const modalConfirmarGestionEl = document.getElementById('modal-confirmar-gestion');
        const modalAgregarClienteEl = document.getElementById('modal-agregar-cliente');
        
        if (modalAgregarClienteEl) {
            modalAgregarClienteEl.addEventListener('show.bs.modal', () => {
                const form = modalAgregarClienteEl.querySelector('#form-agregar-cliente');
                if (form) {
                    form.reset();
                }
            });
        }

        if (modalConfirmarGestionEl) {
            modalConfirmarGestionEl.addEventListener('shown.bs.modal', () => {
                const backdrops = document.querySelectorAll('.modal-backdrop.fade.show');
                if (backdrops.length > 1) {
                    backdrops[backdrops.length - 1].style.zIndex = 1056;
                 }
            });
        }
        
        const btnEliminarClienteModal = document.getElementById('btn-eliminar-cliente-modal');
        if (btnEliminarClienteModal) {
            btnEliminarClienteModal.addEventListener('click', () => {
                const idClienteAEliminar = document.getElementById('modal-editar-cliente-id').value;
                if (!idClienteAEliminar) {
                    window.showToast('No se pudo identificar al cliente a eliminar.', 'danger');
                    return;
                }
                modalEditarCliente.hide();
                
                const btnConfirmacionFinal = document.getElementById('btn-confirmar-eliminacion-final');
                btnConfirmacionFinal.dataset.idCliente = idClienteAEliminar;

                const palabras = ['eliminar', 'borrar', 'quitar'];
                const palabra = palabras[Math.floor(Math.random() * palabras.length)];
                document.getElementById('palabra-confirmacion').textContent = palabra;
                document.getElementById('input-confirmacion').value = '';
                btnConfirmacionFinal.disabled = true;
                modalConfirmarEliminarCliente.show();
            });
        }

        // --- LÓGICA DEL SWITCH "INVERTIR" ---
        const checkAjusteVenta = document.getElementById('es_ajuste_venta');
        if (checkAjusteVenta && importeInput) {
            const labelAjusteVenta = document.querySelector('label[for="es_ajuste_venta"]');
            const infoIcon = checkAjusteVenta.closest('.d-flex').querySelector('.info-icon');

            const actualizarEstiloImporte = () => {
                if (checkAjusteVenta.checked) {
                    if (labelAjusteVenta) labelAjusteVenta.classList.remove('text-muted');
                    if (infoIcon) infoIcon.classList.remove('text-muted');
                    importeInput.classList.add('text-egreso-regular');
                } else {
                    if (labelAjusteVenta) labelAjusteVenta.classList.add('text-muted');
                    if (infoIcon) infoIcon.classList.add('text-muted');
                    importeInput.classList.remove('text-egreso-regular');
                }
            };
            checkAjusteVenta.addEventListener('change', actualizarEstiloImporte);
            actualizarEstiloImporte();
        }

        function checkFormValidity() {
            const isClienteSelected = clienteIdInput.value.trim() !== '';
            const isFechaFilled = fechaInput.value.trim() !== '';
            const isImporteValid = importeInput.value.trim() !== '' && parseFloat(importeInput.value) > 0;
            const isCategoriaSelected = categoriaSelect.value.trim() !== '';
            const isFormValid = isClienteSelected && isFechaFilled && isImporteValid && isCategoriaSelected;

            btnConfirmarMovimiento.disabled = !isFormValid;
            if (isFormValid) {
                btnConfirmarMovimiento.style.pointerEvents = 'auto';
                confirmarTooltip.disable();
            } else {
                btnConfirmarMovimiento.style.pointerEvents = 'none';
                confirmarTooltip.enable();
            }
        }
        
        // --- LÓGICA PARA EL CAMPO DE COMENTARIO CON AUTOGROW ---
        const comentarioTextarea = document.getElementById('comentarios');
        const charCounter = document.getElementById('char-counter');
        const btnClearComentario = document.getElementById('btn-clear-comentario');

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

        // --- LÓGICA PARA GESTIÓN DE COMENTARIOS (MODAL CLIENTE) ---
        const modalEditarComentarios = document.getElementById('modal-editar-cliente-comentarios');
        if(modalEditarComentarios) {
            const modalEditarCharCounter = document.getElementById('modal-editar-char-counter');
            const modalEditarClienteEl = document.getElementById('modal-editar-cliente');
            const updateClienteCharCounter = () => {
                const count = modalEditarComentarios.value.length;
                if(modalEditarCharCounter) modalEditarCharCounter.textContent = `${count} / 140`;
            };

            modalEditarComentarios.addEventListener('input', updateClienteCharCounter);
            
            if (modalEditarClienteEl) {
                modalEditarClienteEl.addEventListener('show.bs.modal', () => {
                    updateClienteCharCounter();
                });
            }
        }

        // --- LÓGICA PARA MODALIDAD (Opción "Otra...") ---
        const modalidadSelect = document.getElementById('modalidad-select');
        const modalOtraModalidadEl = document.getElementById('modal-otra-modalidad');

        if (modalidadSelect && modalOtraModalidadEl) {
            const otraModalidadModal = new bootstrap.Modal(modalOtraModalidadEl);
            const nuevaModalidadInput = document.getElementById('input-nueva-modalidad');
            const guardarModalidadBtn = document.getElementById('btn-guardar-nueva-modalidad');
            let previousModalidadValue = modalidadSelect.value;
            modalidadSelect.addEventListener('focus', function() {
                previousModalidadValue = this.value;
            });
            modalidadSelect.addEventListener('change', function() {
                const existingCustomOption = this.querySelector('.custom-modalidad');
                if (existingCustomOption && this.value !== existingCustomOption.value) {
                    existingCustomOption.remove();
                }
                if (this.value === 'Otra...') {
                     nuevaModalidadInput.value = '';
                    otraModalidadModal.show();
                }
            });
            
            guardarModalidadBtn.addEventListener('click', function() {
                const nuevaModalidad = nuevaModalidadInput.value.trim();
                
                if (!nuevaModalidad) {
                    modalidadSelect.value = previousModalidadValue;
                    otraModalidadModal.hide();
                    return;
                }

                const existingOptions = Array.from(modalidadSelect.options).map(opt => opt.text.toLowerCase());
                if (existingOptions.includes(nuevaModalidad.toLowerCase())) {
                    window.showToast('Esa modalidad ya existe.', 'danger');
                    return;
                }

                const existingCustomOption = modalidadSelect.querySelector('.custom-modalidad');
                if (existingCustomOption) {
                    existingCustomOption.remove();
                }

                const newOption = document.createElement('option');
                newOption.value = nuevaModalidad;
                newOption.textContent = nuevaModalidad;
                newOption.selected = true;
                newOption.classList.add('custom-modalidad');
                const otraOption = modalidadSelect.querySelector('option[value="Otra..."]');
                modalidadSelect.insertBefore(newOption, otraOption);
                otraModalidadModal.hide();
            });

            modalOtraModalidadEl.addEventListener('hidden.bs.modal', function () {
                if (modalidadSelect.value === 'Otra...') {
                    modalidadSelect.value = previousModalidadValue;
                }
            });
        }

        // --- LÓGICA PARA GESTIÓN DE MODALIDADES ---
        const modalGestionModalidadesEl = document.getElementById('modal-gestion-modalidades');
        if (modalGestionModalidadesEl) {
            const listaModalidadesGestion = document.getElementById('lista-modalidades-gestion');
            const formAgregarModalidad = document.getElementById('form-agregar-modalidad');
            const inputNuevaModalidad = document.getElementById('input-nueva-modalidad-gestion');

            async function refreshModalidadSelect(selectedValue) {
                try {
                    const response = await fetch('/venta/api/modalidades');
                    if (!response.ok) throw new Error('No se pudieron cargar las modalidades.');
                    const modalidades = await response.json();
                    
                    const customOption = modalidadSelect.querySelector('.custom-modalidad');
                    const currentValue = selectedValue || (customOption ? customOption.value : modalidadSelect.value);
                    
                    modalidadSelect.innerHTML = '';
                    modalidades.forEach(mod => {
                        const option = new Option(mod.nombre, mod.nombre);
                        modalidadSelect.add(option);
                    });
                    if (customOption) {
                         modalidadSelect.add(customOption);
                    }
                    
                    const otraOption = new Option('Otra...', 'Otra...');
                    modalidadSelect.add(otraOption);

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
                    const response = await fetch('/venta/api/modalidades');
                    if (!response.ok) throw new Error('No se pudieron cargar las modalidades para gestionar.');
                    const modalidades = await response.json();

                    listaModalidadesGestion.innerHTML = '';
                    modalidades.forEach(mod => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item d-flex justify-content-between align-items-center';
                        
                         const nameSpan = document.createElement('span');
                        nameSpan.textContent = mod.nombre;
                        nameSpan.className = 'flex-grow-1';
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
                                saveBtn.setAttribute('data-bs-toggle', 'tooltip');
                                saveBtn.title = 'Guardar cambios';
                                const cancelBtn = document.createElement('button');
                                cancelBtn.className = 'btn btn-sm btn-icon btn-primary';
                                cancelBtn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
                                cancelBtn.setAttribute('data-bs-toggle', 'tooltip');
                                cancelBtn.title = 'Cancelar edición';

                                editContainer.appendChild(input);
                                editContainer.appendChild(saveBtn);
                                editContainer.appendChild(cancelBtn);
                                li.prepend(editContainer);
                                input.focus();

                                const saveTooltip = new bootstrap.Tooltip(saveBtn);
                                const cancelTooltip = new bootstrap.Tooltip(cancelBtn);
                                const cancelEdit = () => {
                                    saveTooltip.dispose();
                                    cancelTooltip.dispose();
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
                                            const saveResponse = await fetch(`/venta/api/modalidades/${mod.id}`, {
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
                                modalConfirmarGestionBody.innerHTML = `¿Está seguro que desea eliminar la modalidad <strong>${mod.nombre}</strong>? Los movimientos asociados se cambiarán a <strong>Efectivo</strong>.`;
                                modalConfirmarGestion.show();

                                 btnConfirmarGestionFinal.onclick = async () => {
                                    try {
                                        const deleteResponse = await fetch(`/venta/api/modalidades/${mod.id}`, { method: 'DELETE' });
                                        const result = await deleteResponse.json();
                                         if(!deleteResponse.ok) throw new Error(result.message || 'Error al eliminar');
                                          window.showToast(result.message || 'Modalidad eliminada.', 'success');
                                        populateModalidadesGestion();
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
                        
                        listaModalidadesGestion.appendChild(li);
                    });
                } catch (error) {
                    window.showToast(error.message, 'danger');
                }
            }
            
            formAgregarModalidad.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nombre = inputNuevaModalidad.value.trim();
                if (!nombre) return;

                const existingNames = Array.from(listaModalidadesGestion.querySelectorAll('li span.flex-grow-1'))
                                        .map(span => span.textContent.trim().toLowerCase());
                
                if (existingNames.includes(nombre.toLowerCase())) {
                    window.showToast('Esa modalidad ya existe.', 'danger');
                    return;
                }

                try {
                     const response = await fetch('/venta/api/modalidades', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre })
                    });
                    const result = await response.json();
                     if (!response.ok) throw new Error(result.message);
                    inputNuevaModalidad.value = '';
                     populateModalidadesGestion();
                    window.showToast('Modalidad agregada.', 'success');
                } catch (error) {
                     window.showToast(error.message, 'danger');
                }
            });

            modalGestionModalidadesEl.addEventListener('show.bs.modal', populateModalidadesGestion);
            modalGestionModalidadesEl.addEventListener('hidden.bs.modal', () => {
                refreshModalidadSelect();
            });
        }

        // --- LÓGICA PARA GESTIÓN DE CATEGORÍAS ---
        const modalGestionCategoriasEl = document.getElementById('modal-gestion-categorias-venta');
        if (modalGestionCategoriasEl) {
            let allCategories = [];
            const listaCategoriasGestion = document.getElementById('lista-categorias-gestion-venta');
            const formAgregarCategoria = document.getElementById('form-agregar-categoria-venta');
            const inputNuevaCategoria = document.getElementById('input-nueva-categoria-gestion-venta');
            const API_BASE_URL = '/venta/api/categorias';
            
            async function refreshAllCategorySelects(newValueToSelect) {
                try {
                    const response = await fetch(`${API_BASE_URL}?tipo=cliente`);
                    const categories = await response.json();
                    if (!response.ok) throw new Error('No se pudieron cargar las categorías.');

                    const allSelects = document.querySelectorAll(`select[id*="categoria"]`);
                    allSelects.forEach(select => {
                        const currentValue = select.value;
                        select.innerHTML = '<option value="">-- Seleccione una categoría --</option>';
                        categories.forEach(cat => {
                             const option = new Option(cat.nombre, cat.id);
                            option.dataset.editable = cat.es_editable;
                            select.add(option);
                         });
                        select.value = (select.id === 'categoria_id') ? newValueToSelect : currentValue;
                    });
                    if (newValueToSelect) {
                        categoriaSelect.value = newValueToSelect;
                    }
                } catch (error) {
                    console.error('Error refrescando categorías:', error);
                    window.showToast(error.message, 'danger');
                }
            }

            async function populateCategoriasGestion() {
                try {
                    const response = await fetch(`${API_BASE_URL}/all`);
                    if (!response.ok) throw new Error('No se pudieron cargar las categorías para gestionar.');
                    allCategories = await response.json();
                    
                    const categoriasParaMostrar = allCategories.filter(cat => cat.tipo === 'cliente' && cat.es_editable === 1);

                    listaCategoriasGestion.innerHTML = '';
                    categoriasParaMostrar.forEach(cat => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item d-flex justify-content-between align-items-center';
                        
                         const nameSpan = document.createElement('span');
                        nameSpan.textContent = cat.nombre;
                        nameSpan.className = 'flex-grow-1';
                        li.appendChild(nameSpan);

                         if (cat.es_editable) {
                            const actionsDiv = document.createElement('div');
                            actionsDiv.className = 'd-flex gap-1';

                             const editBtn = document.createElement('button');
                            editBtn.className = 'btn btn-sm btn-icon btn-primary';
                            editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
                            editBtn.title = 'Editar categoría';
                            editBtn.setAttribute('data-bs-toggle', 'tooltip');
                            const deleteBtn = document.createElement('button');
                            deleteBtn.className = 'btn btn-sm btn-icon btn-danger';
                            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                            deleteBtn.title = 'Eliminar categoría';
                            deleteBtn.setAttribute('data-bs-toggle', 'tooltip');


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
                                saveBtn.setAttribute('data-bs-toggle', 'tooltip');
                                saveBtn.title = 'Guardar cambios';
                                const cancelBtn = document.createElement('button');
                                cancelBtn.className = 'btn btn-sm btn-icon btn-primary';
                                cancelBtn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
                                cancelBtn.setAttribute('data-bs-toggle', 'tooltip');
                                cancelBtn.title = 'Cancelar edición';

                                editContainer.appendChild(input);
                                editContainer.appendChild(saveBtn);
                                editContainer.appendChild(cancelBtn);
                                li.prepend(editContainer);
                                input.focus();

                                const saveTooltip = new bootstrap.Tooltip(saveBtn);
                                const cancelTooltip = new bootstrap.Tooltip(cancelBtn);
                                const cancelEdit = () => {
                                    saveTooltip.dispose();
                                    cancelTooltip.dispose();
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
                                        if (allCategories.some(c => c.nombre.toLowerCase() === newValue.toLowerCase() && c.id !== cat.id)) {
                                            window.showToast('Ya existe una categoría con ese nombre.', 'danger');
                                            return;
                                        }
                                         try {
                                            const saveResponse = await fetch(`${API_BASE_URL}/${cat.id}`, {
                                                 method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ nombre: newValue })
                                            });
                                             const result = await saveResponse.json();
                                            if (!saveResponse.ok) throw new Error(result.message);
                                             
                                            window.showToast('Categoría actualizada.', 'success');
                                            populateCategoriasGestion();
                                        } catch (error) {
                                            window.showToast(error.message, 'danger');
                                        }
                                    } else {
                                        cancelEdit();
                                    }
                                });
                            });

                            deleteBtn.addEventListener('click', () => {
                                modalConfirmarGestionBody.innerHTML = `¿Está seguro que desea eliminar la categoría <strong>${cat.nombre}</strong>? Los movimientos asociados pasarán a estar <strong>Ingresos sin categoría</strong>.`;
                                modalConfirmarGestion.show();
                                  
                                btnConfirmarGestionFinal.onclick = async () => {
                                    try {
                                         const deleteResponse = await fetch(`${API_BASE_URL}/${cat.id}`, { method: 'DELETE' });
                                        const result = await deleteResponse.json();
                                         if(!deleteResponse.ok) throw new Error(result.message || 'Error al eliminar');
                                         window.showToast(result.message || 'Categoría eliminada.', 'success');
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

                    const tooltipTriggerList = listaCategoriasGestion.querySelectorAll('[data-bs-toggle="tooltip"]');
                    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
                    
                } catch (error) {
                    window.showToast(error.message, 'danger');
                }
            }

            formAgregarCategoria.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nombre = inputNuevaCategoria.value.trim();
                if (!nombre) return;

                if (allCategories.some(cat => cat.nombre.toLowerCase() === nombre.toLowerCase())) {
                    window.showToast('Ya existe una categoría con ese nombre.', 'danger');
                    return;
                }

                try {
                     const response = await fetch(API_BASE_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre, tipo: 'cliente' })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    inputNuevaCategoria.value = '';
                     populateCategoriasGestion();
                    window.showToast('Categoría agregada.', 'success');
                } catch (error) {
                      window.showToast(error.message, 'danger');
                }
             });

            modalGestionCategoriasEl.addEventListener('show.bs.modal', populateCategoriasGestion);
            modalGestionCategoriasEl.addEventListener('hidden.bs.modal', () => {
                refreshAllCategorySelects(categoriaSelect.value);
            });
        }
        
        async function cargarHistorialCliente(clienteId) {
            try {
                const response = await fetch(`/venta/api/clientes/${clienteId}/movimientos`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'No se pudo cargar el historial.');
                
                historialContainer.innerHTML = data.html;
                const tooltipTriggerList = historialContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
                [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

            } catch (error) {
                console.error('Error al cargar historial:', error);
                window.showToast(error.message, 'danger');
                historialContainer.innerHTML = '<p class="text-center text-danger">Error al cargar el historial.</p>';
            }
        }

        function seleccionarCliente(cliente) {
            clienteIdInput.value = cliente.id;
            searchInput.value = `${cliente.nombre} (${cliente.id})`;
            searchInput.disabled = true;
            searchResults.innerHTML = '';
            searchResults.classList.remove('scrollable-results');
            
            btnClearClienteSelection.classList.remove('d-none');
            
            const defaultOption = Array.from(categoriaSelect.options).find(opt => opt.dataset.editable === '0');
            categoriaSelect.value = cliente.categoria_id || (defaultOption ? defaultOption.value : "");
            
            categoriaSelect.dispatchEvent(new Event('change'));
            cargarHistorialCliente(cliente.id);
            checkFormValidity();
        }

        function resetearSeleccionCliente() {
            clienteIdInput.value = '';
            const defaultOption = Array.from(categoriaSelect.options).find(opt => opt.dataset.editable === '0');
            if (defaultOption) {
                categoriaSelect.value = defaultOption.value;
            } else {
                categoriaSelect.selectedIndex = 0;
            }
            categoriaSelect.dispatchEvent(new Event('change'));
            searchInput.value = '';
            searchInput.disabled = false;
            searchInput.focus();
            historialContainer.innerHTML = '';
            
            btnClearClienteSelection.classList.add('d-none');
            
            checkFormValidity();
        }

        function restablecerFormularioCompleto() {
            resetearSeleccionCliente();
            ventaPage.reset();
            fechaInput.value = new Date().toISOString().slice(0, 10);
            
            const checkAjusteVenta = document.getElementById('es_ajuste_venta');
            if (checkAjusteVenta) {
                checkAjusteVenta.checked = false;
                checkAjusteVenta.dispatchEvent(new Event('change'));
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
            if (itemCount > 5) {
                searchResults.classList.add('scrollable-results');
            } else {
                searchResults.classList.remove('scrollable-results');
            }
        }

        async function mostrarClientesRecientes() {
            if (clienteIdInput.value) {
                searchResults.innerHTML = '';
                return;
            }
            try {
                const response = await fetch('/venta/api/clientes/recientes');
                const clientesRecientes = await response.json();
                if (!response.ok) throw new Error('No se pudieron cargar los clientes recientes.');
                
                searchResults.innerHTML = '';
                if (clientesRecientes.length > 0) {
                    const header = document.createElement('li');
                    header.classList.add('list-group-item', 'border-start', 'border-end', 'border-bottom', 'small', 'bg-light', 'text-muted', 'fw-semibold');
                    header.textContent = 'Últimos utilizados';
                    searchResults.appendChild(header);
                    clientesRecientes.forEach(cliente => {
                        const item = document.createElement('a');
                        item.href = '#';
                        item.classList.add('list-group-item', 'list-group-item-action', 'bg-light', 'd-flex', 'align-items-center');
                         item.innerHTML = `<span class="badge rounded-pill me-2" style="background-color: #cecbd1ff; color: #48536b">${cliente.id}</span>${cliente.nombre}`;
                        item.addEventListener('click', (e) => { e.preventDefault(); seleccionarCliente(cliente); });
                        searchResults.appendChild(item);
                    });
                }
                checkAndApplyScroll();
            } catch (error) {
                console.error("Error al buscar clientes recientes:", error);
                window.showToast(error.message, 'danger');
            }
        }

        async function buscarTodosLosClientes() {
            try {
                const response = await fetch('/venta/api/clientes/todos');
                const clientes = await response.json();
                if (!response.ok) throw new Error('No se pudo cargar el listado completo de clientes.');
                searchResults.innerHTML = '';
                if (clientes.length > 0) {
                    const header = document.createElement('li');
                    header.classList.add('list-group-item', 'list-group-item-secondary', 'small', 'bg-light', 'text-muted', 'fw-semibold');
                    header.textContent = `Mostrando ${clientes.length} clientes`;
                    searchResults.appendChild(header);
                clientes.forEach(cliente => {
                    const item = document.createElement('a');
                    item.href = '#';
                    item.className = 'list-group-item list-group-item-action bg-light d-flex align-items-center';
                    item.innerHTML = `<span class="badge rounded-pill me-2" style="background-color: #cecbd1ff; color: #48536b">${cliente.id}</span>${cliente.nombre}`;
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        seleccionarCliente(cliente);
                    });
                    searchResults.appendChild(item);
                });
                } else {
                     const noResultsItem = document.createElement('li');
                     noResultsItem.classList.add('list-group-item', 'text-muted');
                     noResultsItem.textContent = 'No hay clientes registrados.';
                     searchResults.appendChild(noResultsItem);
                }
                checkAndApplyScroll();
            } catch (error) {
                console.error("Error al buscar todos los clientes:", error);
                window.showToast(error.message, 'danger');
            }
        }

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim() === '') {
                mostrarClientesRecientes();
            }
        });
        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                searchResults.innerHTML = '';
                searchResults.classList.remove('scrollable-results');
            }, 200);
        });
        searchInput.addEventListener('input', async () => {
            const query = searchInput.value;

            if (query === '*') {
                buscarTodosLosClientes();
                return;
            }

            if (query.length === 0) {
                 mostrarClientesRecientes();
                return;
            }

            if (query.length < 2) {
                searchResults.innerHTML = '';
                searchResults.classList.remove('scrollable-results');
                 return;
            }

            try {
                const response = await fetch(`/venta/api/clientes?q=${query}`);

                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.message || 'Error desconocido del servidor.');
                 const clientes = responseData;
                searchResults.innerHTML = '';
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedQuery, 'gi');
                clientes.forEach(cliente => {
                    const item = document.createElement('a');
                    item.href = '#';
                    item.classList.add('list-group-item', 'list-group-item-action', 'bg-light', 'd-flex', 'justify-content-between', 'align-items-center', 'cliente-resultado-item');
                    
                     const nombreResaltado = cliente.nombre.replace(regex, `<strong class="search-highlight">$&</strong>`);
                    const idResaltado = cliente.id.toString().replace(regex, `<strong class="search-highlight">$&</strong>`);
                    let htmlPrincipal = `<div><span class="badge bg-secondary rounded-pill me-2">${idResaltado}</span>${nombreResaltado}</div>`;

                    let htmlCuit = '';
                     if (cliente.cuit && cliente.cuit.match(regex)) {
                        const cuitResaltado = cliente.cuit.replace(regex, `<strong class="search-highlight">$&</strong>`);
                        htmlCuit = `<div class="text-muted small">CUIT: ${cuitResaltado}</div>`;
                    }
                    
                    item.innerHTML = htmlPrincipal + htmlCuit;
                    item.addEventListener('click', (e) => { e.preventDefault(); seleccionarCliente(cliente); });
                    searchResults.appendChild(item);
                });
                checkAndApplyScroll();
            } catch (error) {
                console.error("Error al buscar clientes:", error);
                window.showToast(error.message, 'danger');
            }
        });

        btnClearClienteSelection.addEventListener('click', resetearSeleccionCliente);

        document.getElementById('btn-guardar-nuevo-cliente').addEventListener('click', async () => {
            const clienteData = {
                nombre: document.getElementById('modal-agregar-cliente-nombre').value,
                cuit: document.getElementById('modal-agregar-cliente-cuit').value,
                telefono: document.getElementById('modal-agregar-cliente-telefono').value,
                email: document.getElementById('modal-agregar-cliente-email').value,
                 categoria_id: document.getElementById('modal-agregar-cliente-categoria').value,
                comentarios: document.getElementById('modal-agregar-cliente-comentarios').value,
            };
            if (!clienteData.nombre || !clienteData.cuit) { window.showToast('Nombre y CUIT son obligatorios.', 'danger'); return; }
            try {
                const response = await fetch('/venta/api/clientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clienteData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error al guardar el cliente.');
                modalAgregarCliente.hide();
                window.showToast(`Cliente creado con éxito.`, 'success');
                seleccionarCliente(result.newCliente);
            } catch(error) {
                window.showToast(error.message, 'danger');
            }
        });

        document.getElementById('btn-actualizar-cliente').addEventListener('click', async () => {
            const id = document.getElementById('modal-editar-cliente-id').value;
            const clienteData = {
                nombre: document.getElementById('modal-editar-cliente-nombre').value,
                cuit: document.getElementById('modal-editar-cliente-cuit').value,
                telefono: document.getElementById('modal-editar-cliente-telefono').value,
                 email: document.getElementById('modal-editar-cliente-email').value,
                categoria_id: document.getElementById('modal-editar-cliente-categoria').value,
                comentarios: document.getElementById('modal-editar-cliente-comentarios').value,
            };
            if (!clienteData.nombre || !clienteData.cuit) { window.showToast('Nombre y CUIT son obligatorios.', 'danger'); return; }
            try {
                 const response = await fetch(`/venta/api/clientes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clienteData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error al guardar el cliente.');
                modalEditarCliente.hide();
                window.showToast(`Cliente actualizado con éxito.`, 'success');
                searchInput.value = `${result.updatedCliente.nombre} (${result.updatedCliente.id})`;
            } catch(error) {
                window.showToast(error.message, 'danger');
            }
        });

        document.getElementById('input-confirmacion').addEventListener('input', function() {
            const palabra = document.getElementById('palabra-confirmacion').textContent;
            document.getElementById('btn-confirmar-eliminacion-final').disabled = this.value.toLowerCase() !== palabra;
        });

        document.getElementById('btn-confirmar-eliminacion-final').addEventListener('click', async function() {
            const id = this.dataset.idCliente;
            if (!id) return;
            try {
                const response = await fetch(`/venta/api/clientes/${id}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error al eliminar.');
                
                window.showToast(result.message, 'success');
                modalConfirmarEliminarCliente.hide();

                if (clienteIdInput.value === id) {
                    resetearSeleccionCliente();
                }
            } catch(error) {
                window.showToast(error.message, 'danger');
            }
        });

        async function procesarEnvioFormulario() {
            const formData = new FormData(ventaPage);
            const data = Object.fromEntries(formData.entries());
            if (!data.cliente_id || !data.categoria_id || !data.importe || data.importe <= 0) {
                window.showToast('Complete todos los campos obligatorios.', 'danger');
                return;
            }
            try {
                const response = await fetch(ventaPage.action, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error al procesar la venta.');
                if (result.redirectTo) {
                    window.location.href = result.redirectTo;
                } else {
                    window.showToast(result.message, 'success');
                    ventaPage.querySelector('#importe').value = '';
                    if (comentarioTextarea) {
                        comentarioTextarea.value = '';
                        comentarioTextarea.dispatchEvent(new Event('input'));
                    }
                    cargarHistorialCliente(data.cliente_id);
                    checkFormValidity();
                }
            } catch (error) {
                window.showToast(error.message, 'danger');
            }
        }

        ventaPage.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (checkAjuste.checked) {
                modalConfirmarAjuste.show();
            } else {
                procesarEnvioFormulario();
             }
        });

        const btnContinuarAjuste = document.getElementById('btn-continuar-ajuste');
        const btnVolverAjuste = document.getElementById('btn-volver-ajuste');
        btnContinuarAjuste.addEventListener('click', () => {
            modalConfirmarAjuste.hide();
            procesarEnvioFormulario();
        });
        btnVolverAjuste.addEventListener('click', () => {
            checkAjuste.checked = false;
        });
        document.getElementById('btn-confirmar-eliminacion-movimiento-final').addEventListener('click', async function() {
            const movId = this.dataset.id;
            if (!movId) return;
            try {
                const response = await fetch(`/venta/api/movimientos/${movId}`, { method: 'DELETE' });
                const result = await response.json();
                 if (!response.ok) throw new Error(result.message || 'Error al eliminar.');
                window.showToast(result.message, 'success');
                cargarHistorialCliente(clienteIdInput.value);
            } catch(error) {
                window.showToast(error.message, 'danger');
            }
             modalConfirmarEliminarMovimiento.hide();
        });

        const modalGestionarClientesEl = document.getElementById('modal-gestionar-clientes');
        if (modalGestionarClientesEl) {
            const modalGestionarClientes = new bootstrap.Modal(modalGestionarClientesEl);
            const listaGestionClientes = document.getElementById('lista-gestion-clientes');
            const inputBuscarGestion = document.getElementById('input-buscar-gestion-cliente');
            const btnNuevoClienteGestion = document.getElementById('btn-nuevo-cliente-gestion');

            async function populateClientesGestion() {
                try {
                    const response = await fetch('/venta/api/clientes/todos');
                    if (!response.ok) throw new Error('No se pudo cargar la lista de clientes.');
                    const clientes = await response.json();
                    
                    listaGestionClientes.innerHTML = '';
                    if (clientes.length === 0) {
                        listaGestionClientes.innerHTML = '<li class="list-group-item text-muted">No hay clientes registrados.</li>';
                        return;
                    }

                    clientes.forEach(cliente => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item d-flex justify-content-between align-items-center';
                        
                        li.dataset.nombre = cliente.nombre.toLowerCase();
                        li.dataset.id = cliente.id.toString();

                        const nombreSpan = document.createElement('span');
                        nombreSpan.innerHTML = `${cliente.nombre}  <span class="text-muted small me-2">(${cliente.id})</span>`;
                        li.appendChild(nombreSpan);

                        const editBtn = document.createElement('button');
                        editBtn.className = 'btn btn-sm btn-icon btn-primary';
                        editBtn.innerHTML = '<i class="fa-solid fa-user-gear"></i>';
                        editBtn.title = 'Editar Cliente';
                        editBtn.addEventListener('click', async () => {
                            modalGestionarClientes.hide();
                            const response = await fetch(`/venta/api/clientes/${cliente.id}`);
                            const clienteData = await response.json();
                            if (response.ok) {
                                document.getElementById('modal-editar-cliente-id').value = clienteData.id;
                                document.getElementById('modal-editar-cliente-nombre').value = clienteData.nombre;
                                document.getElementById('modal-editar-cliente-cuit').value = clienteData.cuit;
                                document.getElementById('modal-editar-cliente-telefono').value = clienteData.telefono;
                                document.getElementById('modal-editar-cliente-email').value = clienteData.email;
                                document.getElementById('modal-editar-cliente-categoria').value = clienteData.categoria_id || '';
                                document.getElementById('modal-editar-cliente-comentarios').value = clienteData.observaciones;
                                modalEditarCliente.show();
                            } else {
                                window.showToast('No se pudo cargar la información del cliente.', 'danger');
                            }
                        });
                        li.appendChild(editBtn);
                        listaGestionClientes.appendChild(li);
                    });

                } catch (error) {
                    console.error('DEBUG: Error en populateClientesGestion:', error);
                    window.showToast(error.message, 'danger');
                    listaGestionClientes.innerHTML = '<li class="list-group-item text-danger">Error al cargar clientes.</li>';
                }
            }

            modalGestionarClientesEl.addEventListener('show.bs.modal', populateClientesGestion);

            inputBuscarGestion.addEventListener('input', function() {
                const normalizeText = (text) => {
                    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                };

                const filtro = this.value.toLowerCase();
                const filtroNormalizado = normalizeText(filtro);
                const items = listaGestionClientes.querySelectorAll('li[data-nombre]');
                
                items.forEach(item => {
                    const nombre = item.dataset.nombre;
                    const id = item.dataset.id;
                    const nombreNormalizado = normalizeText(nombre);
                    const coincide = nombreNormalizado.includes(filtroNormalizado) || id.includes(filtro);
                    item.classList.toggle('d-none', !coincide);
                });
            });
            
            btnNuevoClienteGestion.addEventListener('click', () => {
                modalGestionarClientes.hide();
                modalAgregarCliente.show();
            });
        }

        [fechaInput, importeInput, categoriaSelect].forEach(el => {
            el.addEventListener('input', checkFormValidity);
            el.addEventListener('change', checkFormValidity);
        });
        if (clienteIdInput.value) {
            cargarHistorialCliente(clienteIdInput.value);
        }
        
        checkFormValidity();
        
        const btnRestablecerFormulario = document.getElementById('btn-restablecer-formulario');
        if (btnRestablecerFormulario) {
            btnRestablecerFormulario.addEventListener('click', (e) => {
                e.preventDefault();
                restablecerFormularioCompleto();
            });
        }
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const dbPage = document.querySelector('.db-management-container');
    if (!dbPage) return;

    // --- Lógica para mostrar toasts de estado desde la URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    if (status) {
        const messages = {
            local_backup_success: { text: 'Respaldo local creado con éxito.', type: 'success' },
            local_backup_error: { text: 'Error al crear el respaldo local.', type: 'danger' },
            local_restore_error: { text: 'Error al restaurar desde la lista.', type: 'danger' },
            local_restore_error_no_file: { text: 'No se seleccionó ningún archivo para restaurar.', type: 'danger' },
            local_restore_error_invalid_file: { text: 'El archivo seleccionado no es válido. Debe ser .sqlite.', type: 'danger' },
            local_restore_error_db_close: { text: 'Error al preparar la base de datos para la restauración.', type: 'danger' },
            local_restore_error_generic: { text: 'Ocurrió un error inesperado durante la restauración.', type: 'danger' },
            reset_pin_error: { text: 'PIN incorrecto. La operación ha sido cancelada.', type: 'danger' }
        };
        if (messages[status]) {
            window.showToast(messages[status].text, messages[status].type);
            
            // Si el error fue por el PIN, reabrimos el modal de reseteo.
            if (status === 'reset_pin_error') {
                const resetModalEl = document.getElementById('modal-confirmar-reseteo');
                if (resetModalEl) {
                    const resetModal = new bootstrap.Modal(resetModalEl);
                    resetModal.show();
                }
            }
            
            // Limpiar la URL para que el mensaje no se muestre de nuevo al recargar
            urlParams.delete('status');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, document.title, newUrl);
        }
    }
    // --- Elementos del DOM ---
    const isLicensed = dbPage.dataset.isLicensed === 'true';
    if (!isLicensed) return; // No inicializar lógica si no hay licencia

    const formSettings = document.getElementById('local-settings-form');
    const btnSaveSettings = document.getElementById('btn-save-db-settings');
    const settingInputs = formSettings.querySelectorAll('.setting-input');
    const btnVerifyPath = document.getElementById('btn-verify-path');
    const pathTestResult = document.getElementById('path-test-result');
    const backupPathInput = document.getElementById('backupPath');
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const automaticSettingsContainer = document.getElementById('automatic-settings-local');
    const timeSettingsContainer = document.getElementById('automatic-time-settings');

    const modalConfirmarRestauracionEl = document.getElementById('modal-confirmar-restauracion');
    const btnConfirmarRestauracionFinal = document.getElementById('btn-confirmar-restauracion-final');
    let formToRestore = null;

    const modalConfirmarEliminarEl = document.getElementById('modal-confirmar-eliminacion-respaldo');
    const btnConfirmarEliminarFinal = document.getElementById('btn-confirmar-eliminacion-respaldo-final');
    let backupToDelete = { path: null, id: null };

    // --- Lógica para guardar configuración de respaldos ---
    settingInputs.forEach(input => {
        input.addEventListener('change', () => {
            btnSaveSettings.disabled = false;
        });
    });

    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const showAutomatic = e.target.value !== 'manual';
            const showTime = ['daily', 'weekdays'].includes(e.target.value);
            automaticSettingsContainer.classList.toggle('d-none', !showAutomatic);
            timeSettingsContainer.classList.toggle('d-none', !showTime);
        });
    });

    btnSaveSettings.addEventListener('click', async () => {
        const formData = new FormData(formSettings);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/settings/database/local/update-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            window.showToast(result.message, 'success');
            btnSaveSettings.disabled = true;

            if (result.message.toLowerCase().includes('reinicie')) {
                showRestartToast();
            }

        } catch (error) {
            window.showToast(error.message, 'danger');
        }
    });

    // --- Función para mostrar toast con botón de reinicio ---
    function showRestartToast() {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'restart-toast';
        
        if (document.getElementById(toastId)) return;

        const toastHtml = `
            <div id="${toastId}" class="toast bg-info text-white" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="false">
                <div class="toast-header bg-info text-white border-bottom border-light">
                    <strong class="me-auto">Reinicio Requerido</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    Para aplicar los cambios en la programación, es necesario reiniciar.
                    <div class="d-grid mt-2">
                        <button class="btn btn-light btn-sm" id="btn-restart-from-toast">Reiniciar Ahora</button>
                    </div>
                </div>
            </div>`;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);

        toastElement.querySelector('#btn-restart-from-toast').addEventListener('click', async () => {
            try {
                await fetch('/settings/restart-app', { method: 'POST' });
                window.showToast('Reiniciando la aplicación...', 'info');
                toast.hide();
                setTimeout(() => window.location.href = '/login', 5000);
            } catch (e) {
                window.showToast('No se pudo comunicar con el servidor para reiniciar.', 'danger');
            }
        });

        toast.show();
    }

    // --- Lógica para verificar ruta ---
    btnVerifyPath.addEventListener('click', async () => {
        const path = backupPathInput.value;
        pathTestResult.textContent = 'Verificando...';
        pathTestResult.className = 'form-text mt-2';
        try {
            const response = await fetch('/settings/database/local/test-path', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ backupPath: path })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            pathTestResult.textContent = result.message;
            pathTestResult.classList.add('text-success');
        } catch (error) {
            pathTestResult.textContent = error.message;
            pathTestResult.classList.add('text-danger');
        }
    });

    // --- Lógica para restaurar respaldo ---
    if (modalConfirmarRestauracionEl) {
        modalConfirmarRestauracionEl.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const formId = button.getAttribute('data-form-id');
            formToRestore = document.getElementById(formId);
        });

        btnConfirmarRestauracionFinal.addEventListener('click', () => {
            if (formToRestore) {
                btnConfirmarRestauracionFinal.disabled = true;
                btnConfirmarRestauracionFinal.innerHTML = `
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Restaurando...
                `;
                formToRestore.submit();
            }
        });
    }

    // --- Lógica para eliminar respaldo ---
    if (modalConfirmarEliminarEl) {
        modalConfirmarEliminarEl.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            backupToDelete.path = button.getAttribute('data-backup-path');
            backupToDelete.id = button.getAttribute('data-backup-id');
        });

        btnConfirmarEliminarFinal.addEventListener('click', async () => {
            if (!backupToDelete.path) return;
            
            try {
                const response = await fetch('/settings/database/local/delete-backup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ backupFilePath: backupToDelete.path })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                window.showToast(result.message, 'success');
                const itemToRemove = document.getElementById(backupToDelete.id);
                if (itemToRemove) itemToRemove.remove();

            } catch (error) {
                window.showToast(error.message, 'danger');
            } finally {
                const modal = bootstrap.Modal.getInstance(modalConfirmarEliminarEl);
                modal.hide();
                backupToDelete = { path: null, id: null };
            }
        });
    }

    // --- Lógica para Restaurar desde archivo subido ---
    const formUploadRestore = document.getElementById('form-upload-restore');
    if (formUploadRestore) {
        const backupFileInput = document.getElementById('backupFile');
        const btnUploadRestore = document.getElementById('btn-upload-restore');
        const fileFeedback = document.getElementById('file-selection-feedback');

        backupFileInput.addEventListener('change', () => {
            if (backupFileInput.files.length > 0) {
                const file = backupFileInput.files[0];
                const fileName = file.name;
                const fileExtension = fileName.split('.').pop().toLowerCase();

                if (fileExtension === 'sqlite') {
                    fileFeedback.textContent = `Archivo seleccionado: ${fileName}`;
                    fileFeedback.className = 'form-text mt-1 text-success';
                    btnUploadRestore.disabled = false;
                } else {
                    fileFeedback.textContent = 'Por favor, seleccione un archivo .sqlite válido.';
                    fileFeedback.className = 'form-text mt-1 text-danger';
                    btnUploadRestore.disabled = true;
                }
            } else {
                fileFeedback.textContent = '';
                btnUploadRestore.disabled = true;
            }
        });
    }

    // --- Lógica para el nuevo modal de reseteo ---
    const modalConfirmarReseteoEl = document.getElementById('modal-confirmar-reseteo');
    if (modalConfirmarReseteoEl) {
        const pinInput = modalConfirmarReseteoEl.querySelector('#pin-reset');
        const form = modalConfirmarReseteoEl.querySelector('#form-reset-database');
        const submitBtn = modalConfirmarReseteoEl.querySelector('#btn-confirmar-reseteo-final');

        modalConfirmarReseteoEl.addEventListener('shown.bs.modal', () => {
            if(pinInput) pinInput.focus();
        });

        modalConfirmarReseteoEl.addEventListener('hidden.bs.modal', () => {
            if(pinInput) pinInput.value = '';
        });

        if (form) {
            form.addEventListener('submit', () => {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = `
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Procesando...
                    `;
                }
            });
        }
    }
});

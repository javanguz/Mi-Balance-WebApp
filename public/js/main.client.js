// public/js/main.client.js

document.addEventListener('DOMContentLoaded', function () {
    // 1. Función Global para Toasts (Notificaciones)
    // Se ajusta para que cada tipo de notificación tenga un color representativo.
    window.showToast = function(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            console.error('Toast container not found!');
            return;
        }

        const toastId = 'toast-' + Math.random().toString(36).substring(2, 9);
        
        const toastIconClasses = {
            success: 'fa-solid fa-check-circle',
            danger: 'fa-solid fa-triangle-exclamation',
            warning: 'fa-solid fa-circle-exclamation',
            info: 'fa-solid fa-circle-info'
        };

        const toastColorClasses = {
            success: 'bg-success text-white',
            danger: 'bg-danger text-white',
            warning: 'bg-warning text-dark',
            info: 'bg-dark text-white'
        };

        const colorClass = toastColorClasses[type] || toastColorClasses['info'];
        const closeButtonClass = type === 'warning' ? '' : 'btn-close-white';

        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center ${colorClass} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="5000">
              <div class="d-flex">
                <div class="toast-body">
                  <i class="${toastIconClasses[type] || toastIconClasses['info']} me-2"></i>
                  ${message}
                </div>
                <button type="button" class="btn-close ${closeButtonClass} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
              </div>
            </div>`;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
        toast.show();
    };

    // 2. Lógica para el menú lateral y superior (Side Nav / Top Nav)
    const settingsToggleBtn = document.getElementById('settings-toggle-btn');
    const settingsSubmenu = document.getElementById('settings-submenu');
    if (settingsToggleBtn && settingsSubmenu) {
        settingsToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsSubmenu.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!settingsSubmenu.contains(e.target) && !settingsToggleBtn.contains(e.target)) {
                settingsSubmenu.classList.remove('show');
            }
        });
    }

    // 3. Lógica del modal de licencia
    const modalLicenciaEl = document.getElementById('modal-licencia');
    if (modalLicenciaEl) {
        const licenseActiveView = document.getElementById('license-active-view');
        const licenseActivationView = document.getElementById('license-activation-view');
        const activeLicenseUsername = document.getElementById('active-license-username');
        const btnActivarLicencia = document.getElementById('btn-activar-licencia');
        const btnDeleteLicense = document.getElementById('btn-delete-license');
        const licenseStatusMessage = document.getElementById('license-status-message');
        const modalEliminarLicencia = new bootstrap.Modal(document.getElementById('modal-confirmar-eliminar-licencia'));

        const updateLicenseView = async () => {
            try {
                const response = await fetch('/settings/api/license-status');
                const data = await response.json();
                if (data.activated) {
                    licenseActiveView.classList.remove('d-none');
                    licenseActivationView.classList.add('d-none');
                    activeLicenseUsername.textContent = data.username;
                } else {
                    licenseActiveView.classList.add('d-none');
                    licenseActivationView.classList.remove('d-none');
                }
            } catch (error) {
                console.error("Error fetching license status:", error);
            }
        };

        modalLicenciaEl.addEventListener('show.bs.modal', updateLicenseView);

        btnActivarLicencia.addEventListener('click', async () => {
            const licenseKey = document.getElementById('license-key-input').value;
            const username = document.getElementById('license-username-input').value;
            const cuit = document.getElementById('license-cuit-input').value;
            licenseStatusMessage.innerHTML = '';

            try {
                const response = await fetch('/settings/api/activate-license', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ licenseKey, username, cuit })
                });
                const result = await response.json();
                if (response.ok) {
                    licenseStatusMessage.innerHTML = `<div class="alert alert-success">${result.message}</div>`;
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    licenseStatusMessage.innerHTML = `<div class="alert alert-danger">${result.message}</div>`;
                }
            } catch (error) {
                licenseStatusMessage.innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
            }
        });

        btnDeleteLicense.addEventListener('click', () => {
            const palabras = ['eliminar', 'borrar', 'quitar'];
            const palabra = palabras[Math.floor(Math.random() * palabras.length)];
            document.getElementById('palabra-confirmacion-licencia').textContent = palabra;
            document.getElementById('input-confirmacion-licencia').value = '';
            document.getElementById('btn-confirmar-eliminacion-final-licencia').disabled = true;
            modalEliminarLicencia.show();
        });

        document.getElementById('input-confirmacion-licencia').addEventListener('input', function() {
            const palabra = document.getElementById('palabra-confirmacion-licencia').textContent;
            document.getElementById('btn-confirmar-eliminacion-final-licencia').disabled = this.value.toLowerCase() !== palabra;
        });

        document.getElementById('btn-confirmar-eliminacion-final-licencia').addEventListener('click', async () => {
             try {
                const response = await fetch('/settings/api/delete-license', { method: 'POST' });
                const result = await response.json();
                if (response.ok) {
                    modalEliminarLicencia.hide();
                    window.showToast(result.message + ' Reiniciando...');
                    setTimeout(() => window.location.href = '/login', 2000);
                } else {
                    throw new Error(result.message);
                }
            } catch(error) {
                window.showToast(error.message, 'danger');
            }
        });
    }

    // 4. Lógica para cambiar PIN
    const modalCambiarPinEl = document.getElementById('modal-cambiar-pin');
    if (modalCambiarPinEl) {
        const form = document.getElementById('form-cambiar-pin');
        const errorDiv = document.getElementById('cambiar-pin-error');
        const forcePinChangeInput = document.getElementById('forcePinChange');
        const currentPinContainer = document.getElementById('current-pin-container');
        const modal = new bootstrap.Modal(modalCambiarPinEl);
        
        // --- MODIFICACIÓN ---
        // Función para mostrar el modal de cambio de PIN en modo forzado.
        const showForcedPinChange = () => {
            forcePinChangeInput.value = 'true';
            currentPinContainer.style.display = 'none';
            form.querySelector('#current_pin').required = false;
            // Se previene la reapertura si ya está visible.
            if (!modal._isShown) {
                modal.show();
            }
        };

        // Se comprueba si la URL contiene el parámetro para forzar el cambio.
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('forcePinChange') === 'true') {
            showForcedPinChange();
        }

        // Se agrega un event listener al botón del toast para abrir el modal.
        document.body.addEventListener('click', function(e) {
            if (e.target.id === 'btn-change-pin-toast') {
                showForcedPinChange();
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.classList.add('d-none');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/settings/cambiar-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    modal.hide();
                    window.showToast(result.message, 'success');
                    // Limpiar la URL de parámetros y luego redirigir a logout.
                    setTimeout(() => { 
                        window.history.replaceState({}, document.title, window.location.pathname);
                        window.location.href = '/logout';
                    }, 2000);
                } else {
                    errorDiv.textContent = result.message;
                    errorDiv.classList.remove('d-none');
                }
            } catch (error) {
                 errorDiv.textContent = 'Error de conexión.';
                 errorDiv.classList.remove('d-none');
            }
        });
    }

});

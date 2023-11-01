document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#btn-delete-response').addEventListener('click', event => {
        const formId = event.target.dataset.formId;
        const responseId = event.target.dataset.responseId;

        deleteResponse(formId, responseId);
    });
});

function deleteResponse(formId, responseId) {
    const url = `/api/forms/${formId}/responses/${responseId}`;

    const init = {
        mode: 'same-origin',
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': CSRF_TOKEN,
        },
    };

    fetch(url, init)
        .then(response => {
            if (!response.ok) throw new Error(response.statusText)
            window.location.replace(`/forms/${formId}/responses`);
        })
        .catch(error => {
            console.error(error);
            notifyError('Error deleting response');
        });
}

function notifyError(message) {
    const toastTemplate = document.querySelector('#toast-template');
    const toastContainer = document.querySelector('#toast-container');

    const toastElement = toastTemplate.content.cloneNode(true).querySelector('.toast');
    toastElement.classList.add('text-bg-danger');
    toastElement.querySelector('.toast-body').innerText = message;

    toastContainer.appendChild(toastElement);

    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}
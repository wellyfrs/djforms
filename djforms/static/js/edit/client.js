export default class Client {

    /**
     * @param {string} baseUrl
     */
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * @typedef FormFetchResponse
     * @type {object}
     * @property {FormResponse} form
     */

    /**
     * Fetches the form and the form settings.
     * @param {number} formId
     * @returns {Promise<*>}
     */
    fetchForm = formId =>
        this._request(new URL(`/api/forms/${formId}`, this.baseUrl));

    /**
     * @param {FormResponse} form
     * @return {Promise<*>}
     */
    saveForm = form =>
        this._request(new URL(`/api/forms/${form.id}`, this.baseUrl), HTTPMethod.PUT, form);

    /**
     * @param {number} formId
     * @param {SettingsResponse} settings
     * @return {Promise<*>}
     */
    saveSettings = (formId, settings) =>
        this._request(new URL(`/api/forms/${formId}/settings`, this.baseUrl), HTTPMethod.PUT, settings);

    /**
     * @param {number} formId
     * @return {Promise<*>}
     */
    deleteForm = formId =>
        this._request(new URL(`/api/forms/${formId}`, this.baseUrl), HTTPMethod.DELETE);

    /**
     * @param {URL} url
     * @param {string} method
     * @param {object} body
     * @returns {Promise<*>}
     * @private
     */
    _request(url = new URL(this.baseUrl), method = HTTPMethod.GET, body = null) {
        let init = {
            mode: 'same-origin',
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': CSRF_TOKEN,
            },
        };

        if ([HTTPMethod.POST, HTTPMethod.PUT, HTTPMethod.PATCH].includes(method)) {
            init.body = JSON.stringify(body);
        }

        return fetch(url, init)
            .then(response => {
                if (!response.ok) throw new Error(response.statusText)
                return response;
            });
    }
}

const HTTPMethod = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE'
}
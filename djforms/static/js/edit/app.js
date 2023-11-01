import {Model} from "./model.js";
import View from "./view.js";
import Controller from "./controller.js";
import Client from "./client.js";

const URL_PATTERN = /\/forms\/(\d+)\/edit/

class EditApp {
    constructor(config = {}) {
        const defaultConfig = {
            baseUrl: 'http://localhost',
        };

        this.config = {...defaultConfig, ...config};

        this.model = new Model();
        this.view = new View();
        this.client = new Client(this.config.baseUrl);
        this.controller = new Controller(this.model, this.view, this.client);

        this.controller.init(this._getFormId());
    }

    /**
     * Extracts the form ID from the URL.
     * @return {string|null}
     * @private
     */
    _getFormId = () => {
        const match = window.location.pathname.match(URL_PATTERN);
        return match && match[1] ? match[1] : null;
    }
}

new EditApp({
    baseUrl: "http://127.0.0.1:8000"
});
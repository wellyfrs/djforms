import {Form, Question, QuestionOption, Settings} from "./model.js";

export default class Controller {

    /**
     * @param {Model} model
     * @param {View} view
     * @param {Client} client
     */
    constructor(model, view, client) {
        /**
         * @type {Model}
         */
        this.model = model;

        /**
         * @type {View}
         */
        this.view = view;

        /**
         * @type {Client}
         */
        this.client = client;

        this.view.bindSubmitFormForm(this.handleSubmitFormForm);
        this.view.bindChangeTitle(this.handleChangeTitle);
        this.view.bindChangeDescription(this.handleChangeDescription);
        this.view.bindAddQuestion(this.handleAddQuestion);
        this.view.bindRemoveQuestion(this.handleRemoveQuestion);
        this.view.bindSelectQuestionType(this.handleSelectQuestionType);
        this.view.bindChangeQuestionText(this.handleChangeQuestionText);
        this.view.bindChangeQuestionRequired(this.handleChangeQuestionRequired);
        this.view.bindAddQuestionOption(this.handleAddQuestionOption);
        this.view.bindChangeQuestionOptionText(this.handleChangeQuestionOptionText);
        this.view.bindRemoveQuestionOption(this.handleRemoveQuestionOption);

        this.view.bindToggleOpenCloseForm(this.handleToggleOpenCloseForm);
        this.view.bindToggleAuthenticatedResponse(this.handleToggleAuthenticatedResponse);
        this.view.bindToggleMultipleResponse(this.handleToggleMultipleResponse);
        this.view.bindSubmitSettingsForm(this.handleSubmitSettingsForm);

        this.view.bindDeleteForm(this.handleDeleteForm);
    }

    /**
     * @param {number|null} formId
     */
    init = (formId) => {
        if (!formId) {
            this.view.setFetchErrorStatus();
            return;
        }

        this.client.fetchForm(formId)
            .then(response => response.json())
            .then(response => {
                this.model.form = Form.deserialize(response.form);
                this.model.settings = Settings.deserialize(this.model.form.id, response.form.settings);
            }).catch(error => {
                console.error(error);
                this.view.setFetchErrorStatus();
            });
    }

    /**
     * @callback changeTitleHandlerCallback
     * @param {string} title
     */
    handleChangeTitle = title => {
        this.model.form.title = title;
    }

    /**
     * @callback changeDescriptionHandlerCallback
     * @param {string} description
     */
    handleChangeDescription = description => {
        this.model.form.description = description;
    }

    /**
     * @callback submitFormFormHandlerCallback
     */
    handleSubmitFormForm = () => {
        this.client.saveForm(this.model.form.toJSON())
            .then(_ => {
                this.view.notifySuccess('Form saved');
            }).catch(error => {
                console.error(error);
                this.view.notifyError('Error saving form');
            });
    }

    /**
     * @callback bindToggleOpenCloseFormHandlerCallback
     * @param {boolean} isOpen
     */
    handleToggleOpenCloseForm = isOpen => {
        this.model.settings.isOpen = isOpen;
    }

    /**
     * @callback bindToggleAuthenticatedResponseHandlerCallback
     * @param {boolean} authenticatedResponse
     */
    handleToggleAuthenticatedResponse = authenticatedResponse => {
        this.model.settings.authenticatedResponse = authenticatedResponse;
    }

    /**
     * @callback bindToggleMultipleResponseHandlerCallback
     * @param {boolean} multipleResponse
     */
    handleToggleMultipleResponse = multipleResponse => {
        this.model.settings.multipleResponse = multipleResponse;
    }

    /**
     * @callback submitSettingsFormHandlerCallback
     */
    handleSubmitSettingsForm = () => {
        try {
            const formId = this.model.form.id;
            const settings = this.model.settings.toJSON();

            this.client.saveSettings(formId, settings)
                .then(_ => {
                    this.view.notifySuccess('Settings saved');
                });
        } catch (error) {
            console.error(error);
            this.view.notifyError('Error saving settings');
        }
    }

    /**
     * @callback deleteFormHandlerCallback
     */
    handleDeleteForm = () => {
        this.client.deleteForm(this.model.form.id)
            .then(_ => {
                window.location.replace("/");
            })
            .catch(error => {
                this.view.notifyError('Error deleting form');
                console.error(error);
            });
    }

    /**
     * @callback addQuestionHandlerCallback
     */
    handleAddQuestion = () => {
        const question = Question.factory();
        this.model.form.appendQuestion(question);
        this.view.renderAdditionalQuestion(question);
        this._updateQuestionRemoval();
    }

    /**
     * @callback removeQuestionHandlerCallback
     */
    handleRemoveQuestion = questionOrder => {
        this.model.form.removeQuestion(questionOrder);
        this.view.removeQuestion(questionOrder);
        this._updateQuestionRemoval();
    }

    /**
     * Does not remove options to allow redo action.
     * @callback selectQuestionTypeHandlerCallback
     * @param {number} questionOrder
     * @param {string} type
     */
    handleSelectQuestionType = (questionOrder, type) => {
        const question = this.model.form.getQuestionByOrder(questionOrder);
        question.type = type;
        this.view.updateQuestionType(question);
        this._updateOptionRemoval(question);
    }

    /**
     * @callback changeQuestionTextHandlerCallback
     * @param {number} questionOrder
     * @param {string} text
     */
    handleChangeQuestionText = (questionOrder, text) => {
        this.model.form.getQuestionByOrder(questionOrder).text = text;
    }

    /**
     * @callback changeQuestionRequiredHandlerCallback
     * @param {number} questionOrder
     * @param {boolean} isRequired
     */
    handleChangeQuestionRequired = (questionOrder, isRequired) => {
        this.model.form.getQuestionByOrder(questionOrder).isRequired = isRequired;
    }

    /**
     * @callback addQuestionOptionHandlerCallback
     * @param {number} questionOrder
     */
    handleAddQuestionOption = questionOrder => {
        const question = this.model.form.getQuestionByOrder(questionOrder);
        const option = QuestionOption.factory(question.nextOptionOrder());

        this.model.form.appendQuestionOption(questionOrder, option);

        this.view.renderAdditionalQuestionOption(question, option);
        this._updateOptionRemoval(question);
        this.view.giveOptionValidationFeedback(questionOrder, question.validateOptions());
    }

    /**
     * @callback changeQuestionOptionTextHandlerCallback
     * @param {number} questionOrder
     * @param {number} optionOrder
     * @param {string} text
     */
    handleChangeQuestionOptionText = (questionOrder, optionOrder, text) => {
        const question = this.model.form.getQuestionByOrder(questionOrder);
        const option = question.getOptionByOrder(optionOrder);
        option.text = text;
        this.view.giveOptionValidationFeedback(questionOrder, question.validateOptions());
    }

    /**
     * @callback removeQuestionOptionHandlerCallback
     * @param {number} questionOrder
     * @param {number} optionOrder
     */
    handleRemoveQuestionOption = (questionOrder, optionOrder) => {
        const question = this.model.form.getQuestionByOrder(questionOrder);
        this.model.form.removeQuestionOption(questionOrder, optionOrder);
        this.view.removeQuestionOption(questionOrder, optionOrder);
        this._updateOptionRemoval(question);
        this.view.giveOptionValidationFeedback(questionOrder, question.validateOptions());
    }

    /**
     * @private
     */
    _updateQuestionRemoval = () => {
        this.view.toggleQuestionRemoval(this.model.form.isQuestionRemovalDisabled());
    }

    /**
     * @param {Question} question
     * @private
     */
    _updateOptionRemoval = (question) => {
        this.view.toggleOptionRemoval(question.order, question.isOptionRemovalDisabled());
    }
}
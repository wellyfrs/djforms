import {Question, QUESTION_TYPE} from './model.js';

/**
 * Matches [Bootstrap contextual classes](https://getbootstrap.com/docs/5.3/components/alerts)
 */
const NotificationContext = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    SUCCESS: 'success',
    DANGER: 'danger',
    WARNING: 'warning',
    INFO: 'info',
    LIGHT: 'light',
    DARK: 'dark',
}

const NOTIFICATION_CONTEXT_CLASS_PREFIX = 'text-bg-';

export default class View {

    constructor() {
        this.container = document.querySelector('#container');

        // form elements for each tab
        this.formFormElement = document.querySelector('#form-form');
        this.settingsFormElement = document.querySelector('#settings-form');

        // basic information
        this.titleInput = document.querySelector('#input-title');
        this.descriptionInput = document.querySelector('#input-description');

        // questions
        this.questionContainer = document.querySelector('#question-container');
        this.addQuestionButton = document.querySelector('#btn-add-question');

        // question templates
        this.questionTemplate = document.querySelector('#template-question');

        // question body templates
        this.shortTextTemplate = document.querySelector('#template-question-short-text');
        this.longTextTemplate = document.querySelector('#template-question-long-text');
        this.radioTemplate = document.querySelector('#template-question-radio');
        this.checkboxTemplate = document.querySelector('#template-question-checkbox');

        // question option templates
        this.radioOptionTemplate = document.querySelector('#template-radio-option');
        this.checkboxOptionTemplate = document.querySelector('#template-checkbox-option');

        // controls for settings
        this.openCloseFormSwitch = document.querySelector('#is-open');
        this.authenticatedResponseSwitch = document.querySelector('#authenticated-response');
        this.multipleResponseSwitch = document.querySelector('#multiple-response');
        this.deleteFormButton = document.querySelector('#btn-delete-form');

        // notifications
        this.toastContainer = document.querySelector('#toast-container');
        this.toastTemplate = document.querySelector('#toast-template');

        this.init();
    }

    init = () => {
        this.questionContainer.querySelectorAll('.question').forEach(questionElement => {
            this._addQuestionEventListeners(questionElement);
        });
    }

    // bindings

    /**
     * @param {changeTitleHandlerCallback} handler
     */
    bindChangeTitle = handler => this.titleInput.addEventListener('change', event => {
        handler(event.target.value);

        if (event.target.value === '') {
            event.target.classList.add('is-invalid');
        } else {
            event.target.classList.remove('is-invalid');
        }
    });

    /**
     * @param {changeDescriptionHandlerCallback} handler
     */
    bindChangeDescription = handler => this.descriptionInput.addEventListener('change', event => {
        handler(event.target.value);
    });

    /**
     * @param {submitFormFormHandlerCallback} handler
     */
    bindSubmitFormForm = handler => this.formFormElement.addEventListener('submit', event => {
        event.preventDefault();
        handler();
    });

    /**
     * @param {bindToggleOpenCloseFormHandlerCallback} handler
     */
    bindToggleOpenCloseForm = handler => this.openCloseFormSwitch.addEventListener('change', event => {
        handler(event.target.checked);
    });

    /**
     * @param {bindToggleAuthenticatedResponseHandlerCallback} handler
     */
    bindToggleAuthenticatedResponse = handler => this.authenticatedResponseSwitch.addEventListener('change', event => {
        handler(event.target.checked);
        this.multipleResponseSwitch.disabled = !event.target.checked;
    });

    /**
     * @param {bindToggleMultipleResponseHandlerCallback} handler
     */
    bindToggleMultipleResponse = handler => this.multipleResponseSwitch.addEventListener('change', event => {
        handler(event.target.checked);
    });

    /**
     * @param {submitSettingsFormHandlerCallback} handler
     */
    bindSubmitSettingsForm = handler => this.settingsFormElement.addEventListener('submit', event => {
        event.preventDefault();
        handler();
    });

    /**
     * @param {deleteFormHandlerCallback} handler
     */
    bindDeleteForm = handler => this.deleteFormButton.addEventListener('click', event => {
        event.preventDefault();
        handler();
    });

    /**
     * @param {addQuestionHandlerCallback} handler
     */
    bindAddQuestion = handler => this.addQuestionButton.addEventListener('click', event => {
        event.preventDefault();
        handler();
    });

    /**
     * @param {removeQuestionHandlerCallback} handler
     */
    bindRemoveQuestion = handler => this.removeQuestionHandler = handler;

    /**
     * @param {selectQuestionTypeHandlerCallback} handler
     */
    bindSelectQuestionType = handler => this.selectQuestionTypeHandler = handler;

    /**
     * @param {changeQuestionTextHandlerCallback} handler
     */
    bindChangeQuestionText = handler => this.changeQuestionTextHandler = handler;

    /**
     * @param {changeQuestionRequiredHandlerCallback} handler
     */
    bindChangeQuestionRequired = handler => this.changeQuestionRequiredHandler = handler;

    /**
     * @param {addQuestionOptionHandlerCallback} handler
     */
    bindAddQuestionOption = handler => this.addQuestionOptionHandler = handler;

    /**
     * @param {changeQuestionOptionTextHandlerCallback} handler
     */
    bindChangeQuestionOptionText = handler => this.changeQuestionOptionText = handler;

    /**
     * @param {removeQuestionOptionHandlerCallback} handler
     */
    bindRemoveQuestionOption = handler => this.removeQuestionOptionHandler = handler;

    // operations

    /**
     * @param {Question} question
     */
    updateQuestionType = question => {
        const questionElement = this._getQuestionElement(question.order);
        const questionTypeSelect = questionElement.querySelector('.question-type-select');
        questionTypeSelect.value = question.type;
        this._renderQuestionType(question, questionElement);
    }

    /**
     * @param {Question} question
     */
    renderAdditionalQuestion = question => {
        const questionElement = this.questionTemplate.content.cloneNode(true);
        const questionTypeSelect = questionElement.querySelector('.question-type-select');

        for (const { id, name } of Object.values(QUESTION_TYPE)) {
            questionTypeSelect.add(new Option(name, id));
        }
        questionTypeSelect.value = QUESTION_TYPE.RADIO.id; // radio as default type

        questionElement.querySelector('.question-text').value = question.text;
        this._renderQuestionType(question, questionElement);
        this._addQuestionEventListeners(questionElement);
        this.questionContainer.appendChild(questionElement);
    }

    /**
     * @param {Question} question
     * @param {QuestionOption} option
     */
    renderAdditionalQuestionOption = (question, option) => {
        const questionElement = this._getQuestionElement(question.order);
        let optionElement;

        if (question.type === QUESTION_TYPE.RADIO.id) {
            optionElement = this.radioOptionTemplate.content.cloneNode(true);
        } else if(question.type === QUESTION_TYPE.CHECKBOX.id) {
            optionElement = this.checkboxOptionTemplate.content.cloneNode(true);
        } else {
            throw new Error('Only radio and checkbox questions can have options.');
        }

        const input = optionElement.querySelector('input[type=text]');
        input.value = option.text;
        input.addEventListener('change', this._onChangeQuestionOptionText);

        optionElement.querySelectorAll('.btn-remove-option').forEach(btn => {
            btn.addEventListener('click', this._onRemoveQuestionOption);
        });

        questionElement.querySelector('.question-option-container').appendChild(optionElement);
    }

    /**
     * @param {number} order
     */
    removeQuestion = order => {
        this._getQuestionElement(order).remove();
    }

    /**
     * @param {number} questionOrder
     * @param {number} optionOrder
     */
    removeQuestionOption = (questionOrder, optionOrder) => {
        this._getQuestionOptionElement(questionOrder, optionOrder).remove();
    }

    /**
     * @param {boolean} isDisabled
     */
    toggleQuestionRemoval = isDisabled => {
        document.querySelectorAll('.btn-remove-question').forEach(btn => { btn.disabled = isDisabled; });
    }

    setFetchErrorStatus = () => {
        this.container.innerHTML = '<div class="alert alert-danger" role="alert">Oh, no! An error occurred. Please try refreshing the page.</div>'
    }

    /**
     * @param {number} questionOrder
     * @param {boolean} isDisabled
     */
    toggleOptionRemoval = (questionOrder, isDisabled) => {
        this._getQuestionElement(questionOrder).querySelectorAll('.btn-remove-option').forEach(btn => {
            btn.disabled = isDisabled;
        });
    }

    /**
     * @param {number} questionOrder
     * @param {[ValidatedOption]} validatedOptions
     */
    giveOptionValidationFeedback = (questionOrder, validatedOptions) => {
        validatedOptions.forEach(validatedOption => {
            const optionElement = this._getQuestionOptionElement(questionOrder, validatedOption.optionOrder);
            const input = optionElement.querySelector('input[type=text]');
            input.setCustomValidity(validatedOption.isValid ? '' : 'Provide an unique option');

            if (validatedOption.isValid) {
                input.classList.remove('is-invalid');
            } else {
                input.classList.add('is-invalid');
            }
        });
    }

    // notifications

    /**
     * Displays success toast.
     * @param {string} message
     */
    notifySuccess = (message) => {
        this._notify(message, NotificationContext.SUCCESS);
    }

    /**
     * Displays error toast.
     * @param {string} message
     */
    notifyError = (message) => {
        this._notify(message, NotificationContext.DANGER);
    }

    /**
     * Displays notification toast.
     * @param {string} message
     * @param {NotificationContext} [context=NotificationContext.INFO]
     * @private
     */
    _notify = (message, context = NotificationContext.INFO) => {
        const toastElement = this.toastTemplate.content.cloneNode(true).querySelector('.toast');
        toastElement.classList.add(`${NOTIFICATION_CONTEXT_CLASS_PREFIX}${context}`);
        toastElement.querySelector('.toast-body').innerText = message;

        this.toastContainer.appendChild(toastElement);

        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    }

    // renders

    /**
     * @param {Question} question
     * @param {HTMLElement} questionElement
     * @private
     */
    _renderQuestionType = (question, questionElement) => {
        questionElement.querySelector('.question-answer').innerHTML = '';

        const renders = {
            [QUESTION_TYPE.SHORT_TEXT.id]: this._renderShortTextType,
            [QUESTION_TYPE.LONG_TEXT.id]: this._renderLongTextType,
            [QUESTION_TYPE.RADIO.id]: this._renderRadioType,
            [QUESTION_TYPE.CHECKBOX.id]: this._renderCheckboxType,
        };

        if (renders[question.type]) {
            renders[question.type](question, questionElement);
        } else {
            throw new Error(`Question type '${question.type}' is not supported.`);
        }
    }

    /**
     * @param {Question} question
     * @param {HTMLElement} questionElement
     * @private
     */
    _renderShortTextType = (question, questionElement) => {
        const shortTextTemplate = this.shortTextTemplate.content.cloneNode(true);
        const questionAnswer = questionElement.querySelector('.question-answer');
        questionAnswer.appendChild(shortTextTemplate);
    }

    /**
     * @param {Question} question
     * @param {HTMLElement} questionElement
     * @private
     */
    _renderLongTextType = (question, questionElement) => {
        const longTextTemplate = this.longTextTemplate.content.cloneNode(true);
        const questionAnswer = questionElement.querySelector('.question-answer');
        questionAnswer.appendChild(longTextTemplate);
    }

    /**
     *
     * @param {Question} question
     * @param {HTMLElement} questionElement
     * @private
     */
    _renderRadioType = (question, questionElement) => {
        const optionElement = this.radioTemplate.content.cloneNode(true);
        this._renderQuestionWithOptions(questionElement, question, optionElement, this.radioOptionTemplate);
    }

    /**
     * @param {Question} question
     * @param {HTMLElement} questionElement
     * @private
     */
    _renderCheckboxType = (question, questionElement) => {
        const optionElement = this.checkboxTemplate.content.cloneNode(true);
        this._renderQuestionWithOptions(questionElement, question, optionElement, this.checkboxOptionTemplate);
    }

    /**
     * @param {HTMLElement} questionElement
     * @param {Question} question
     * @param {HTMLElement} optionElement
     * @param {HTMLTemplateElement} optionTemplate
     * @private
     */
    _renderQuestionWithOptions = (questionElement, question, optionElement, optionTemplate) => {
        const optionContainer = optionElement.querySelector('.question-option-container');

        question.options.forEach(option => {
            const optionElement = optionTemplate.content.cloneNode(true);
            const input = optionElement.querySelector('input[type=text]');
            input.value = option.text;

            input.addEventListener('change', this._onChangeQuestionOptionText);

            optionElement.querySelectorAll('.btn-remove-option').forEach(btn => {
                btn.addEventListener('click', this._onRemoveQuestionOption);
            });

            optionContainer.appendChild(optionElement);
        });

        optionElement.querySelector('.btn-add-option').addEventListener('click', this._onAddQuestionOption);
        optionElement.querySelectorAll('.btn-remove-option').forEach(btn => btn.addEventListener('click', this._onRemoveQuestionOption));
        questionElement.querySelector('.question-answer').appendChild(optionElement);
    }

    // listeners

    /**
     * @param {HTMLElement} questionElement
     * @private
     */
    _addQuestionEventListeners = questionElement => {
        questionElement.querySelector('.question-type-select').addEventListener('change', this._onSelectQuestionType);
        questionElement.querySelector('.question-text').addEventListener('change', this._onChangeQuestionText);
        questionElement.querySelector('.question-required-switch').addEventListener('change', this._onSetRequired);

        if (questionElement.querySelector('.question-option-container')) {
            questionElement.querySelector('.btn-add-option').addEventListener('click', this._onAddQuestionOption);

            questionElement.querySelectorAll('.question-option-text').forEach(input => {
               input.addEventListener('change', this._onChangeQuestionOptionText);
            });

            questionElement.querySelectorAll('.btn-remove-option').forEach(button => {
                button.addEventListener('click', this._onRemoveQuestionOption);
            });
        }

        questionElement.querySelector('.btn-remove-question').addEventListener('click', this._onRemoveQuestion);
    }

    /**
     * @param {Event} event
     * @private
     */
    _onSelectQuestionType = event => {
        const questionOrder = this._determineQuestionOrder(event.target.closest('.question'));
        this.selectQuestionTypeHandler(questionOrder, event.target.value);
    }

    /**
     * @param {Event} event
     * @private
     */
    _onChangeQuestionText = event => {
        const questionOrder = this._determineQuestionOrder(event.target.closest('.question'));
        this.changeQuestionTextHandler(questionOrder, event.target.value);

        if (event.target.value === '') {
            event.target.classList.add('is-invalid');
        } else {
            event.target.classList.remove('is-invalid');
        }
    }

    /**
     * @param {Event} event
     * @private
     */
    _onSetRequired = event => {
        const order = this._determineQuestionOrder(event.target.closest('.question'));
        this.changeQuestionRequiredHandler(order, event.target.checked);
    }

    /**
     * @param {Event} event
     * @private
     */
    _onAddQuestionOption = event => {
        event.preventDefault();
        const questionOrder = this._determineQuestionOrder(event.target.closest('.question'));
        this.addQuestionOptionHandler(questionOrder);
    }

    /**
     * @param {Event} event
     * @private
     */
    _onChangeQuestionOptionText = event => {
        const questionOrder = this._determineQuestionOrder(event.target.closest('.question'));

        const questionElement = event.target.closest('.question');
        const questionOptionElement = event.target.closest('.question-option');
        const optionOrder = this._determineQuestionOptionOrder(questionElement, questionOptionElement);

        this.changeQuestionOptionText(questionOrder, optionOrder, event.target.value);
    }

    /**
     * @param {Event} event
     * @private
     */
    _onRemoveQuestionOption = event => {
        event.preventDefault();
        const questionOrder = this._determineQuestionOrder(event.target.closest('.question'));

        const questionElement = event.target.closest('.question');
        const questionOptionElement = event.target.closest('.question-option');
        const optionOrder = this._determineQuestionOptionOrder(questionElement, questionOptionElement);

        this.removeQuestionOptionHandler(questionOrder, optionOrder);
    }

    /**
     * @param {Event} event
     * @private
     */
    _onRemoveQuestion = event => {
        event.preventDefault();
        const order = this._determineQuestionOrder(event.target.closest('.question'));
        this.removeQuestionHandler(order);
    }

    // utils

    /**
     * @param {HTMLElement} questionElement
     * @return {number} order
     * @private
     */
    _determineQuestionOrder = questionElement =>
        [...this.questionContainer.querySelectorAll('.question')].indexOf(questionElement) + 1;

    /**
     * @param {HTMLElement} questionElement
     * @param {HTMLElement} questionOptionElement
     * @return {number}
     * @private
     */
    _determineQuestionOptionOrder = (questionElement, questionOptionElement) =>
        [...questionElement.querySelectorAll('.question-option')].indexOf(questionOptionElement) + 1;

    /**
     * @param {number} order
     * @return {HTMLElement} question HTML element
     * @private
     */
    _getQuestionElement = order =>
        [...this.questionContainer.querySelectorAll('.question')].at(order - 1);

    /**
     * @param {number} questionOrder
     * @param {number} optionOrder
     * @return {HTMLElement} question option HTML element
     * @private
     */
    _getQuestionOptionElement = (questionOrder, optionOrder) =>
        [...this._getQuestionElement(questionOrder).querySelectorAll('.question-option')].at(optionOrder - 1);
}
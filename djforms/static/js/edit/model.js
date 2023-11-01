export const QUESTION_TYPE = {
    SHORT_TEXT: { id: 'SHORT_TEXT', name: 'Short text' },
    LONG_TEXT: { id: 'LONG_TEXT', name: 'Long text' },
    RADIO: { id: 'RADIO', name: 'Radio' },
    CHECKBOX: { id: 'CHECKBOX', name: 'Checkbox' },
};

export class Model {

    constructor() {
        /**
         * @type {Form|null}
         */
        this.form = null;

        /**
         * @type {Settings|null}
         */
        this.settings = null;
    }
}

export class Form {

    /**
     * @param {number} id
     * @param {string} title
     * @param {string} description
     * @param {[Question]} questions
     */
    constructor(id, title, description, questions) {
        /**
         * @type {number}
         */
        this.id = id;

        /**
         * @type {string}
         */
        this.title = title;

        /**
         * @type {string}
         */
        this.description = description;

        /**
         * @type {boolean}
         */
        this.questionRemovalDisabled = questions.length === 1;

        /**
         * @type {[Question]}
         */
        this.questions = [];

        questions.forEach(question => {
            this.appendQuestion(question);
        });
    }

    /**
     * @typedef FormResponse
     * @type {object}
     * @property {number} id
     * @property {string} title
     * @property {string} description
     * @property {string} created_by
     * @property {string} created_at
     * @property {string} updated_at
     * @property {QuestionResponse} questions
     * @property {SettingsResponse} settings
     */

    /**
     * @typedef QuestionResponse
     * @type {object}
     * @property {number} id
     * @property {string} text
     * @property {string} type
     * @property {boolean} is_required
     * @property {number} order
     * @property {[QuestionOptionResponse]} [options]
     */

    /**
     * @typedef QuestionOptionResponse
     * @type {object}
     * @property {number} id
     * @property {string} text
     * @property {number} order
     */

    /**
     * @param {FormResponse} obj
     * @return {Form}
     */
    static deserialize = obj => {
        const questions = obj.questions.map(objQuestion => {
            let options = [];

            if (objQuestion.options) {
                options = objQuestion.options.map(objQuestionOption => {
                   return new QuestionOption(
                       objQuestionOption.id,
                       objQuestionOption.text,
                       objQuestionOption.order,
                   )
                });
            }

            return new Question(
                objQuestion.id,
                objQuestion.text,
                objQuestion.type,
                objQuestion.is_required,
                objQuestion.order,
                options,
            );
        });

        return new Form(obj.id, obj.title, obj.description, questions);
    }

    /**
     * Invoked by `JSON.stringify()`.
     * @return {FormResponse}
     */
    toJSON = () => {
        const obj = {};

        obj.id = this.id;
        obj.title = this.title;
        obj.description = this.description;
        obj.questions = this.questions.map(question => question.toJSON());

        return obj;
    }

    /**
     * @param {number} questionOrder
     * @return {Question}
     */
    getQuestionByOrder = questionOrder => {
        const index = this.questions.findIndex(question => question.order === questionOrder);
        if (index === -1) {
            throw new Error('Question not found');
        }
        return this.questions.at(index);
    }

    /**
     * @return {number} order
     */
    nextQuestionOrder = () => this.questions.length + 1;

    /**
     * @param {Question} question
     */
    appendQuestion = question => {
        question.order = this.nextQuestionOrder();
        this.questions.push(question);

        if (this.isQuestionRemovalDisabled() && this.questions.length > 1) {
            this.enableQuestionRemoval();
        }
    }

    /**
     * @param {number} questionOrder
     */
    removeQuestion = questionOrder => {
        if (questionOrder < 1 || questionOrder > this.questions.length) {
            throw new Error('Question not found');
        }

        if (this.questions.length === 1) {
            throw new Error('Form must have at least one question');
        }

        this.questions = this.questions.filter(question => question.order !== questionOrder)
            .map(question => {
                if (question.order > questionOrder) {
                    question.order -= 1;
                }
                return question
            });

        if (this.questions.length === 1) {
            this.disableQuestionRemoval();
        }
    }

    /**
     * @param {number} questionOrder
     * @param {QuestionOption} option
     */
    appendQuestionOption = (questionOrder, option) => {
        const question = this.getQuestionByOrder(questionOrder);
        option.order = question.nextOptionOrder();
        question.appendOption(option);

        if (question.isOptionRemovalDisabled() && question.options.length > 1) {
            question.enableOptionRemoval();
        }
    }

    removeQuestionOption = (questionOrder, optionOrder) => {
        const question = this.getQuestionByOrder(questionOrder);

        if ([QUESTION_TYPE.RADIO.id, QUESTION_TYPE.CHECKBOX.id].includes(question.type) && question.options.length === 1) {
            throw new Error('Radio and checkbox questions must have at least one option');
        }

        question.removeOption(optionOrder);

        if (question.options.length === 1) {
            question.disableOptionRemoval();
        }
    }

    /**
     * @return {boolean}
     */
    isQuestionRemovalDisabled = () => this.questionRemovalDisabled;

    enableQuestionRemoval = () => this.questionRemovalDisabled = false;

    disableQuestionRemoval = () => this.questionRemovalDisabled = true;
}

export class Settings {

    /**
     * @param {number} id
     * @param {boolean} isOpen
     * @param {boolean} authenticatedResponse
     * @param {boolean} multipleResponse
     */
    constructor(id, isOpen, authenticatedResponse, multipleResponse) {
        /**
         * @type {number}
         */
        this.id = id;

        /**
         * @type {boolean}
         */
        this.isOpen = isOpen;

        /**
         * @type {boolean}
         */
        this.authenticatedResponse = authenticatedResponse;

        /**
         * @type {boolean}
         */
        this.multipleResponse = multipleResponse;
    }

    /**
     * @typedef SettingsResponse
     * @type {object}
     * @property {boolean} is_open
     * @property {boolean} authenticated_response
     * @property {boolean} multiple_response
     */

    /**
     * @param {number} formId
     * @param {SettingsResponse} obj
     */
    static deserialize = (formId, obj) => {
        return new Settings(formId, obj.is_open, obj.authenticated_response, obj.multiple_response);
    }

    /**
     * Invoked by `JSON.stringify()`.
     * @return {SettingsResponse}
     */
    toJSON = () => {
        const obj = {};

        obj.id = this.id;
        obj.is_open = this.isOpen;
        obj.authenticated_response = this.authenticatedResponse;
        obj.multiple_response = this.multipleResponse;

        return obj;
    }
}

export class Question {

    /**
     * @param {number|null} [id=null]
     * @param {string} text
     * @param {string} type
     * @param {boolean} isRequired
     * @param {number} order
     * @param {[QuestionOption]} [options]
     */
    constructor(id = null, text, type, isRequired, order, options) {
        /**
         * @type {?number}
         */
        this.id = id;

        /**
         * @type {string}
         */
        this.text = text;

        /**
         * @type {string}
         */
        this.type = type;

        /**
         * @type {boolean}
         */
        this.isRequired = isRequired;

        /**
         * @type {number}
         */
        this.order = order;

        /**
         * @type {boolean}
         */
        this.optionRemovalDisabled = options.length === 1;

        /**
         * @type {[QuestionOption]}
         */
        this.options = [];

        options.forEach(option => {
            option.order = this.nextOptionOrder();
            this.appendOption(option);
        });
    }

    /**
     * Invoked by `JSON.stringify()`.
     * @return {QuestionResponse}
     */
    toJSON = () => {
        const obj = {};

        if (this.id) {
            obj.id = this.id;
        }

        obj.text = this.text;
        obj.type = this.type;
        obj.is_required = this.isRequired;
        obj.order = this.order;

        if ([QUESTION_TYPE.RADIO.id, QUESTION_TYPE.CHECKBOX.id].includes(this.type)) {
            obj.options = this.options.map(option => option.toJSON());
        }

        return obj;
    }

    /**
     * @param {number} order
     * @return {Question}
     */
    static factory = (order = 1) => new Question(
        null,
        'Untitled question',
        QUESTION_TYPE.RADIO.id,
        true,
        order,
        [QuestionOption.factory()],
    );

    /**
     * @param {number} optionOrder
     * @return {QuestionOption}
     */
    getOptionByOrder = optionOrder => {
        const index = this.options.findIndex(option => option.order === optionOrder);
        if (index === -1) {
            throw new Error('Option not found');
        }
        return this.options.at(index);
    }

    /**
     * @return {number} order
     */
    nextOptionOrder = () => this.options.length + 1;

    /**
     * @param {QuestionOption} option
     */
    appendOption = option => {
        this.options.push(option);
    }

    /**
     * @param {number} optionOrder
     * @return {boolean}
     */
    removeOption = optionOrder => {
        if (optionOrder < 1 || optionOrder > this.options.length) {
            throw new Error('Option not found');
        }

        this.options = this.options.filter(option => option.order !== optionOrder)
            .map(option => {
                if (option.order > optionOrder) {
                    option.order -= 1;
                }
                return option
            });
    }

    /**
     * @return {boolean}
     */
    isOptionRemovalDisabled = () => this.optionRemovalDisabled;

    enableOptionRemoval = () => {
        this.optionRemovalDisabled = false;
    }

    disableOptionRemoval = () => {
        this.optionRemovalDisabled = true;
    }

    /**
     * @typedef ValidatedOption
     * @type {object}
     * @property {number} optionOrder
     * @property {boolean} isValid
     */

    /**
     * Validates all the options of the question.
     * Options must be unique.
     * @return {[ValidatedOption]}
     */
    validateOptions = () => this.options.map(option => {
        return {
            'optionOrder': option.order,
            'isValid': option.isValid() && this.options.filter(o =>
                (o.isValid()) && (o.text.trim() === option.text.trim())
            ).length === 1
        }
    });
}

export class QuestionOption {

    /**
     * @param {number|null} [id=null]
     * @param {string} text
     * @param {number} order
     */
    constructor(id = null, text, order) {
        /**
         * @type {?number}
         */
        this.id = id;

        /**
         * @type {string}
         */
        this.text = text;

        /**
         * @type {number}
         */
        this.order = order;
    }

    /**
     * Invoked by `JSON.stringify()`.
     * @return {QuestionOptionResponse}
     */
    toJSON = () => {
        const obj = {};

        if (this.id) {
            obj.id = this.id;
        }

        obj.text = this.text;
        obj.order = this.order;

        return obj;
    }

    /**
     * @param {number} order
     * @return {QuestionOption}
     */
    static factory = (order = 1) => new QuestionOption(
        null,
        `Option`,
        order,
    );

    /**
     * @return {boolean}
     */
    isValid = () => typeof this.text === 'string' && this.text.trim() !== '';
}
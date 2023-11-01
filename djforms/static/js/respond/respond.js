document.addEventListener('DOMContentLoaded', function() {
    setCustomValidationOnChange();
    setCustomValidationOnSubmit();
});

function setCustomValidationOnChange() {
    document.querySelectorAll('.question-checkbox.question-required').forEach(questionElement => {
        validateRequiredCheckboxQuestion(questionElement);

        questionElement.querySelectorAll('.form-check-input').forEach(option => {
            option.addEventListener('change', event => {
                validateRequiredCheckboxQuestion(questionElement);
            });
        });
    });

    document.querySelectorAll('textarea[required]').forEach(textarea => {
        validateRequiredTextarea(textarea);

        textarea.addEventListener('change', event => {
           validateRequiredTextarea(textarea);
        });
    });
}

function setCustomValidationOnSubmit() {
    document.querySelector('#form').addEventListener('submit', event => {
        document.querySelectorAll('.question-checkbox.question-required').forEach(questionElement => {
            validateRequiredCheckboxQuestion(questionElement);
        });

        document.querySelectorAll('textarea[required]').forEach(textarea => {
            validateRequiredTextarea(textarea);
        });
    });
}

/**
 * Validates required checkbox question, which is not natively supported by HTML5 like radio.
 * It requires at least one option to be checked.
 * @param {HTMLElement} questionElement
 */
function validateRequiredCheckboxQuestion(questionElement) {
    const options = questionElement.querySelectorAll('.form-check-input');
    const hasAtLeastOneOptionChecked = [...options].some(option => option.checked);

    options.forEach(option => {
        option.setCustomValidity(hasAtLeastOneOptionChecked ? '' : 'Please select one of these options.');
    });
}

/**
 * Validates required textarea question against blank text, which is not natively supported by using `pattern`.
 * @param {HTMLTextAreaElement} textarea
 */
function validateRequiredTextarea(textarea) {
    const validRegex = /^.*\S+.*$/;
    textarea.setCustomValidity(validRegex.test(textarea.value) ? '' : 'Please fill a non-blank text in this field.');
}
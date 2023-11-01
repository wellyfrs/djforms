from django import template

register = template.Library()


@register.filter(name="answer_question")
def answer_question(answers, question):
    if answers:
        if question.id in answers:
            return answers[question.id]
    return None

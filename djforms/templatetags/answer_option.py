from django import template

register = template.Library()


@register.filter(name="answer_option")
def answer_option(question_answer, option):
    if isinstance(question_answer, list):
        if option.id in question_answer:
            return option.id
    elif question_answer == option.id:
        return option.id
    return None

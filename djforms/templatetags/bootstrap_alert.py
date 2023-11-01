from django import template

register = template.Library()


@register.filter(name="bootstrap_alert")
def convert_message_to_bootstrap_alert(tag):
    match tag:
        case "success":
            return "alert-success"
        case "error":
            return "alert-danger"
        case "warning":
            return "alert-warning"
        case "info":
            return "alert-info"
        case "debug":
            return "alert-dark"
        case _:
            return "alert-info"

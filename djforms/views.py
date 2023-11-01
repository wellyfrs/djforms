import csv
import json
import traceback

from django import forms
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError, PermissionDenied
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count
from django.http import HttpResponseRedirect, JsonResponse, Http404, HttpResponseNotAllowed, HttpResponse, HttpRequest, \
    StreamingHttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify

from .forms import FormForm, QuestionForm, OptionForm, SettingsForm
from .models import User, Form, Question, Option, Response, Settings, Answer
from .util import parse_form_data_arrays

ITEMS_PER_PAGE = 10


def index(request):
    if request.user.is_authenticated:  # my forms
        my_forms = Form.objects.filter(created_by=request.user).order_by("-created_at").annotate(
            responses=Count("response")
        )
        paginator = Paginator(my_forms, ITEMS_PER_PAGE)

        page_number = request.GET.get('page')
        page_obj = paginator.get_page(page_number)

        return render(request, "djforms/dash.html", {
            "page_obj": page_obj
        })

    return render(request, "djforms/index.html")


def login_view(request):
    if request.method == "POST":
        username = request.POST["username"]
        password = request.POST["password"]

        if not username or not password:
            messages.error(request, "Please provide username and password.")
            return render(request, "djforms/login.html")

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            messages.error(request, "Invalid username and/or password.")
            return render(request, "djforms/login.html")
    else:
        return render(request, "djforms/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        try:
            username = request.POST["username"]
            email = request.POST["email"]

            password = request.POST["password"]
            confirmation = request.POST["confirmation"]

            if not username or not email or not password or not confirmation:
                raise ValidationError("Missing information")

            if password != confirmation:
                messages.error(request, "Passwords must match.")
                return render(request, "djforms/register.html")

            if User.objects.filter(username=username).count() != 0:
                messages.error(request, "Username already taken.")
                return render(request, "djforms/register.html")

            user = User.objects.create_user(username, email, password)
            user.full_clean()
            user.save()
        except ValidationError:
            messages.error(request, "Please provide valid input.")
            return render(request, "djforms/register.html")

        login(request, user)

        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "djforms/register.html")


@login_required
def create(request):
    with transaction.atomic():
        form = Form(
            title="Untitled form",
            created_by=request.user,
        )
        form.save()

        settings = Settings(form=form)
        settings.save()

        question = Question(
            form=form,
            text="Untitled question",
            type=Question.QuestionType.RADIO,
            order=1,
        )
        question.save()

        option = Option(
            question=question,
            text="Option",
            order=1,
        )
        option.save()

    return redirect("edit", form.id)


@login_required
def user_responses(request):
    objects = Response.objects.filter(user=request.user).order_by("-created_at")
    paginator = Paginator(objects, ITEMS_PER_PAGE)

    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, "djforms/user_responses.html", {
        "page_obj": page_obj,
    })


@login_required
def form_responses(request, form_id):
    form = get_object_or_404(Form, pk=form_id)

    if form.created_by != request.user:
        raise PermissionDenied()

    objects = Response.objects.filter(form=form).order_by("-created_at")
    paginator = Paginator(objects, ITEMS_PER_PAGE)

    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, "djforms/form_responses.html", {
        "form": form,
        "page_obj": page_obj,
    })


@login_required
def download(request, form_id):
    form = get_object_or_404(Form, pk=form_id)

    if form.created_by != request.user:
        raise PermissionDenied()

    class Echo:
        def write(self, value):
            return value

    filename = f"djforms-{slugify(form.title[0:20])}-{slugify(timezone.now())}.csv"
    objects = Response.objects.select_related("user").filter(form=form).order_by("-created_at")

    return StreamingHttpResponse(
        (_stream_form_response_csv_rows(form, objects, Echo())),
        content_type='text/csv',
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _stream_form_response_csv_rows(form, objects, pseudo_buffer):
    writer = csv.writer(pseudo_buffer, delimiter=",", quoting=csv.QUOTE_ALL)

    # write header
    question_texts = [q.text for q in form.questions.all()]
    header = ['User', 'Email', 'Timestamp'] + question_texts
    yield writer.writerow(header)

    # write responses
    for form_response in objects.iterator():
        user = form_response.user.username if form_response.user else "Anonymous"
        email = form_response.user.email if form_response.user else ""
        timestamp = str(form_response.created_at)

        row_data = [user, email, timestamp]

        answers = form_response.answers_as_dict()

        for question in form.questions.all():
            if question.type in [Question.QuestionType.SHORT_TEXT,
                                 Question.QuestionType.LONG_TEXT]:
                if question.id in answers:
                    row_data.append(answers.get(question.id))
                else:
                    row_data.append(None)
            elif question.type == Question.QuestionType.RADIO:
                if question.id in answers:
                    option = Option.objects.get(pk=answers[question.id])
                    row_data.append(option.text)
                else:
                    row_data.append(None)
            elif question.type == Question.QuestionType.CHECKBOX:
                if question.id in answers:
                    options = Option.objects.filter(pk__in=answers[question.id])
                    joined_choices = '; '.join([option.text for option in options])
                    row_data.append(joined_choices)
                else:
                    row_data.append(None)
            else:
                raise ValueError(f"Question type {question.type} not supported")

        yield writer.writerow(row_data)


@login_required
def response(request, response_id):
    form_response = Response.objects.prefetch_related(
        "answers__choices",
        "form__questions__options",
        "form__settings"
    ).filter(pk=response_id).first()

    if not form_response:
        raise Http404()

    if (request.user != form_response.form.created_by) and (request.user != form_response.user):
        raise PermissionDenied()

    return render(request, "djforms/response.html", {
        "form_response": form_response,
        "answers": form_response.answers_as_dict(),
    })


def respond(request, form_id):
    form = Form.objects.prefetch_related('questions__options', 'settings').filter(pk=form_id).first()
    form_response = None

    if request.method == "POST":
        if form:
            form_response = _save_form_response(request, form)
        else:
            messages.error(request, "Sorry, looks like this form was deleted while you were filling it out.")

        return render(request, "djforms/responded.html", {
            "form_response": form_response,
        })
    elif request.method == "GET":
        if not form:
            raise Http404()

        if request.user.is_authenticated:
            last_response = Response.objects.filter(user=request.user, form=form).order_by("-created_at").first()
        else:
            last_response = None

        return render(request, "djforms/respond.html", {
            "form": form,
            "last_response": last_response
        })
    else:
        return HttpResponseNotAllowed(permitted_methods=["GET", "POST"])


def _save_form_response(request, form_model):
    # noinspection PyBroadException
    try:
        with (transaction.atomic()):  # all or nothing
            response_model = Response(form=form_model)

            if form_model.settings.authenticated_response:
                if not request.user.is_authenticated:
                    raise PermissionDenied()

                if not form_model.settings.multiple_response \
                        and Response.objects.filter(form=form_model, user=request.user).count() > 0:
                    raise PermissionDenied()

                response_model.user = request.user

            response_model.full_clean()
            response_model.save()

            _save_answers(request, form_model, response_model)

            messages.success(request, "Your response has been recorded.")

            return response_model
    except Exception:
        print(traceback.format_exc())
        messages.error(request, "Ops! Something went wrong.")
        return None


def _save_answers(request, form: Form, response_model: Response):
    parsed_form_data = parse_form_data_arrays(request.POST)
    answers_data = parsed_form_data.get("answers", {})

    questions = Question.objects.filter(form=form).prefetch_related('options')
    questions_by_id = {str(question.id): question for question in questions}
    answered_question_ids = []

    for question_id in answers_data:
        answer_data = answers_data[question_id]

        if question_id not in questions_by_id:
            raise ValidationError("Answered not found question", code="answered_question_not_found")
        question = questions_by_id[question_id]

        answer = Answer.objects.create(
            response=response_model,
            question=question,
        )

        if question.type in [Question.QuestionType.SHORT_TEXT, Question.QuestionType.LONG_TEXT]:
            answer.text = answer_data
        elif question.type in [Question.QuestionType.RADIO, Question.QuestionType.CHECKBOX]:
            if question.type == Question.QuestionType.RADIO:
                answer_data = [answer_data]

            options = Option.objects.filter(pk__in=answer_data)
            answer.choices.add(*options)
        else:
            raise ValueError(f"Question type {question.type} not supported")

        answer.full_clean()
        answer.save()

        answered_question_ids.append(questions_by_id.pop(question_id))

    required_question_ids = [question for question in questions if question.is_required]

    if len(set(required_question_ids) - set(answered_question_ids)) > 0:
        raise ValidationError("Question required", code="question_required")


@login_required
def edit(request, form_id):
    form = Form.objects.prefetch_related('questions__options', 'settings').filter(pk=form_id).first()

    if not form:
        raise Http404()

    if request.user != form.created_by:
        raise PermissionDenied()

    return render(request, "djforms/edit.html", {
        "form": form,
        "count_questions": form.questions.all().count(),
        "question_types": [{'id': choice[0], 'name': choice[1]} for choice in Question.QuestionType.choices],
    })


# API


@login_required
def api_forms(request: HttpRequest, form_id):
    form = Form.objects.prefetch_related('questions__options', 'settings').filter(pk=form_id).first()

    if not form:
        return JsonResponse({"error": "Form not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({"form": form.serialize()}, status=200)

    if request.method == "PUT":
        if request.user != form.created_by:
            raise PermissionDenied()

        return _update_form(form, json.loads(request.body))

    if request.method == "DELETE":
        if request.user != form.created_by:
            raise PermissionDenied()
        form.delete()
        return HttpResponse(status=204)

    return HttpResponseNotAllowed(permitted_methods=["GET", "PUT", "DELETE"])


def _update_form(form: Form, form_data: dict):
    """
    Saves the edited form with all question and options, removing orphans
    Use of Django formsets instead of multiple model forms would also be possible.
    """
    try:
        with transaction.atomic():  # all or nothing
            form_data["updated_at"] = timezone.now()

            form = FormForm(form_data, instance=form)

            if not form.is_valid():
                raise forms.ValidationError(form.errors.as_text(), code="invalid_form")
            form = form.save()

            _update_questions(form, form_data)

            form = Form.objects.prefetch_related('questions__options', 'settings').get(pk=form.id)
            return JsonResponse({"form": form.serialize()}, status=200)

    except ValidationError as e:
        return JsonResponse({"error": "Invalid input data", "details": e.messages}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


def _update_questions(form: Form, form_data: dict):
    questions_data = form_data.get("questions", [])

    if not questions_data or len(questions_data) < 1:
        raise ValidationError("Form must have at least one question", code="question_required")

    question_ids_in_db = [q.id for q in Question.objects.filter(form=form)]
    question_ids_in_payload = [q.get("id") for q in questions_data if q.get("id") is not None]

    if set(question_ids_in_payload) - set(question_ids_in_db):
        raise ValidationError("Attempt to change question not belonging to the form")

    # delete from database the removed questions
    form.questions.exclude(pk__in=question_ids_in_payload).delete()

    for question_data in questions_data:
        question_data["form"] = form.id
        question_id = question_data.get("id")

        if question_id:
            # update existing question
            question = form.questions.get(pk=question_id)
            question_form = QuestionForm(question_data, instance=question)
        else:
            # create a new question
            question_form = QuestionForm(question_data)

        question_form.form = form
        if not question_form.is_valid():
            raise forms.ValidationError(question_form.errors.as_text(), code="invalid_question")
        question = question_form.save()

        _update_options(question, question_data)


def _update_options(question: Question, question_data: dict):
    if question.type in [Question.QuestionType.RADIO, Question.QuestionType.CHECKBOX]:
        options_data = question_data.get("options", [])

        if not options_data or len(options_data) < 1:
            raise ValidationError(
                message=f"Question ID {question.id} of {question.type} type must have at least one option",
                code="option_required",
            )

        option_ids_in_db = [o.id for o in Option.objects.filter(question=question)]
        option_ids_in_payload = [o.get("id") for o in options_data if o.get("id") is not None]

        if set(option_ids_in_payload) - set(option_ids_in_db):
            raise ValidationError("Attempt to change option of question not belonging to the form")

        # delete from database the removed options
        question.options.exclude(pk__in=option_ids_in_payload).delete()

        for option_data in options_data:
            option_data["question"] = question
            option_id = option_data.get("id")

            if option_id:
                # update existing option
                option = question.options.get(pk=option_id)
                option_form = OptionForm(option_data, instance=option)
            else:
                # create a new option
                option_form = OptionForm(option_data)

            if not option_form.is_valid():
                raise forms.ValidationError(option_form.errors.as_text(), code="invalid_option")
            option_form.save()
    else:
        # remove all options for changed question type to non-radio and non-checkbox
        question.options.all().delete()


@login_required
def api_form_settings(request: HttpRequest, form_id):
    form = Form.objects.prefetch_related('settings').filter(pk=form_id).first()

    if not form:
        return JsonResponse({"error": "Form not found"}, status=404)

    if request.user != form.created_by:
        raise PermissionDenied()

    if request.method == "PUT":
        return _update_settings(form, json.loads(request.body))

    return HttpResponseNotAllowed(permitted_methods=["PUT"])


def _update_settings(form: Form, settings_data: dict):
    try:
        model_form = SettingsForm(settings_data, instance=form.settings)
        if not model_form.is_valid():
            raise forms.ValidationError(model_form.errors.as_text(), code="invalid_settings")
        settings = model_form.save()

        return JsonResponse({"settings": settings.serialize()}, status=200)
    except ValidationError as e:
        return JsonResponse({"error": "Invalid input data", "details": e.messages}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def api_form_responses(request: HttpRequest, form_id, response_id):
    if request.method != "DELETE":
        return HttpResponseNotAllowed(permitted_methods=["DELETE"])

    form_response = Response.objects.filter(pk=response_id).first()

    if not form_response:
        raise Http404()

    if request.user != form_response.form.created_by:
        raise PermissionDenied()

    form_response.delete()

    return HttpResponse(status=204)

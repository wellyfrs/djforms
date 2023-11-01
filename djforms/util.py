from django.utils.datastructures import MultiValueDict


def parse_form_data_arrays(multi_value_dict: MultiValueDict):
    """
    Processes a MultiValueDict object to parse arrays in the form ``checkbox[1][]``
    """
    result_dict = {}

    for key in multi_value_dict:
        value = multi_value_dict.getlist(key)

        if "[" in key:
            sub_key, sub_rest = key.split("[", 1)
            sub_key = sub_key.replace("]", "")
            sub_rest = sub_rest.rstrip("]")

            if sub_rest == "":
                result_dict.setdefault(sub_key, value)
                continue

            if sub_key not in result_dict:
                result_dict[sub_key] = {}

            sub_dict = {sub_rest: value}
            result_dict[sub_key].update(parse_form_data_arrays(MultiValueDict(sub_dict)))
        else:
            result_dict[key] = value[0] if len(value) == 1 else value

    return result_dict

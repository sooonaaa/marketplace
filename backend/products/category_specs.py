"""Шаблоны характеристик по категориям для формы продавца и каталога."""

CATEGORY_SPEC_TEMPLATES = {
    'food': [
        {'key': 'weight', 'label': 'Вес', 'type': 'number', 'unit': 'г', 'required': True},
        {'key': 'composition', 'label': 'Состав', 'type': 'text', 'required': True},
        {'key': 'expiry', 'label': 'Срок годности', 'type': 'text', 'required': True},
        {'key': 'honey_type', 'label': 'Вид мёда', 'type': 'text', 'required': False},
    ],
    'clothes': [
        {'key': 'material', 'label': 'Материал', 'type': 'text', 'required': True},
        {'key': 'size', 'label': 'Размер', 'type': 'text', 'required': True},
        {'key': 'care', 'label': 'Уход', 'type': 'text', 'required': True},
        {'key': 'origin', 'label': 'Производство', 'type': 'text', 'required': False},
    ],
    'crafts': [
        {'key': 'material', 'label': 'Материал', 'type': 'text', 'required': True},
        {'key': 'volume', 'label': 'Объём', 'type': 'number', 'unit': 'л', 'required': False},
        {'key': 'height', 'label': 'Высота', 'type': 'number', 'unit': 'см', 'required': False},
        {'key': 'size', 'label': 'Размер', 'type': 'text', 'required': False},
        {'key': 'coating', 'label': 'Покрытие', 'type': 'text', 'required': False},
    ],
    'home': [
        {'key': 'material', 'label': 'Материал', 'type': 'text', 'required': True},
        {'key': 'size', 'label': 'Размер', 'type': 'text', 'required': False},
        {'key': 'diameter', 'label': 'Диаметр', 'type': 'number', 'unit': 'см', 'required': False},
        {'key': 'weight', 'label': 'Вес', 'type': 'number', 'unit': 'г', 'required': False},
        {'key': 'care', 'label': 'Уход', 'type': 'text', 'required': False},
        {'key': 'burn_time', 'label': 'Время горения', 'type': 'text', 'required': False},
        {'key': 'scent', 'label': 'Аромат', 'type': 'text', 'required': False},
    ],
}

PRODUCT_STATUS_LABELS = {
    'created': 'Создан',
    'pending': 'На рассмотрении',
    'published': 'Опубликован',
    'rejected': 'Отклонён',
    'removed': 'Удалён',
}


def get_category_spec_templates(category_id: str):
    return CATEGORY_SPEC_TEMPLATES.get(category_id, [
        {'key': 'spec', 'label': 'Характеристика', 'type': 'text', 'required': True},
    ])


def build_specs_from_form(category_id: str, raw_specs: dict) -> list:
    """Собирает specs [{label, value}] из полей формы."""
    templates = get_category_spec_templates(category_id)
    result = []
    for field in templates:
        label = field['label']
        val = (raw_specs.get(field['key']) or raw_specs.get(label) or '').strip()
        if not val:
            if field.get('required'):
                return None
            continue
        if field['type'] == 'number' and field.get('unit'):
            val = f'{val} {field["unit"]}'
        result.append({'label': label, 'value': val})
    return result

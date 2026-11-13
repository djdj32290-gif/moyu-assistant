"""Stable MSI identity shared by the helper compiler and installer authoring."""
import uuid

NAMESPACE = uuid.UUID('b6404434-5342-4c9f-95a5-6b54e55d233d')


def product_code(version):
    return str(uuid.uuid5(NAMESPACE, 'product-' + version)).upper()

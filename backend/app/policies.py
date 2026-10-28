POLICIES = {
    "PUBLIC": {
        "encryption_required": False,
        "india_residency_required": True,
        "external_sharing": "ALLOWED",
        "integrity_required": True,
        "audit_required": False,
        "allowed_storage_region": "INDIA"
    },

    "CONFIDENTIAL": {
        "encryption_required": True,
        "india_residency_required": True,
        "external_sharing": "RESTRICTED",
        "integrity_required": True,
        "audit_required": True,
        "allowed_storage_region": "INDIA"
    },

    "RESTRICTED": {
        "encryption_required": True,
        "india_residency_required": True,
        "external_sharing": "DISABLED",
        "integrity_required": True,
        "audit_required": True,
        "allowed_storage_region": "INDIA"
    }
}

def get_policy(classification: str):
    classification = classification.upper()

    if classification not in POLICIES:
        raise ValueError(
            "Invalid file classification"
        )

    return POLICIES[classification]
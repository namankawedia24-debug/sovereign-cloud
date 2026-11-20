
POLICIES = {
    "PUBLIC": {
        "encryption_required": False,
        "india_residency_required": True,
        "allowed_storage_region": "INDIA",
        "external_sharing": "ALLOWED",
        "access_policy": "OWNER_ONLY",
        "integrity_required": True,
        "audit_required": False,
        "replication_required": False,
        "retention_days": 365
    },

    "CONFIDENTIAL": {
        "encryption_required": True,
        "india_residency_required": True,
        "allowed_storage_region": "INDIA",
        "external_sharing": "RESTRICTED",
        "access_policy": "AUTHORIZED_USERS",
        "integrity_required": True,
        "audit_required": True,
        "replication_required": True,
        "retention_days": 180
    },

    "RESTRICTED": {
        "encryption_required": True,
        "india_residency_required": True,
        "allowed_storage_region": "INDIA",
        "external_sharing": "DISABLED",
        "access_policy": "OWNER_ONLY",
        "integrity_required": True,
        "audit_required": True,
        "replication_required": True,
        "retention_days": 90
    }
}


def get_policy(classification: str):
    classification = classification.upper()

    if classification not in POLICIES:
        raise ValueError("Invalid file classification")

    return POLICIES[classification]

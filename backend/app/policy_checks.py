
from app.policies import get_policy


def check_file_policy(file):
    policy = get_policy(file.classification)
    violations = []

    # Check required storage region
    required_region = policy["allowed_storage_region"]

    if file.storage_region != required_region:
        violations.append({
            "rule": "DATA_RESIDENCY",
            "expected": required_region,
            "actual": file.storage_region,
            "message": "File is stored outside its policy-required region"
        })

    # Check required encryption
    encryption_required = policy["encryption_required"]

    if encryption_required and file.classification not in {
        "CONFIDENTIAL",
        "RESTRICTED"
    }:
        violations.append({
            "rule": "ENCRYPTION",
            "message": "File classification requires encryption"
        })

    return violations

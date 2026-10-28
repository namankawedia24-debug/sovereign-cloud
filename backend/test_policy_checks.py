
from types import SimpleNamespace

from app.policy_checks import check_file_policy


# Simulate a restricted file with an incorrect storage region
test_file = SimpleNamespace(
    classification="RESTRICTED",
    storage_region="US"
)

violations = check_file_policy(test_file)

print("Detected violations:", violations)

assert any(
    violation["rule"] == "DATA_RESIDENCY"
    for violation in violations
)

print("Policy violation test passed!")

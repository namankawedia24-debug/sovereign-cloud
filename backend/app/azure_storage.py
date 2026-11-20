
import os

from azure.storage.blob import BlobServiceClient


AZURE_STORAGE_CONNECTION_STRING = os.getenv(
    "AZURE_STORAGE_CONNECTION_STRING"
)

AZURE_STORAGE_CONTAINER_NAME = os.getenv(
    "AZURE_STORAGE_CONTAINER_NAME",
    "sovereign-files",
)


def get_container_client():
    if not AZURE_STORAGE_CONNECTION_STRING:
        raise RuntimeError(
            "AZURE_STORAGE_CONNECTION_STRING is not configured"
        )

    blob_service_client = BlobServiceClient.from_connection_string(
        AZURE_STORAGE_CONNECTION_STRING
    )

    return blob_service_client.get_container_client(
        AZURE_STORAGE_CONTAINER_NAME
    )
    

def get_replica_container_client():
    replica_connection_string = os.getenv(
        "AZURE_REPLICA_CONNECTION_STRING"
    )

    replica_container_name = os.getenv(
        "AZURE_REPLICA_CONTAINER_NAME",
        "sovereign-replica"
    )

    if not replica_connection_string:
        raise RuntimeError(
            "AZURE_REPLICA_CONNECTION_STRING is not configured"
        )

    replica_service_client = BlobServiceClient.from_connection_string(
        replica_connection_string
    )

    return replica_service_client.get_container_client(
        replica_container_name
    )


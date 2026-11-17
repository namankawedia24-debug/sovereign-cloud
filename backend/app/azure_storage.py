
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

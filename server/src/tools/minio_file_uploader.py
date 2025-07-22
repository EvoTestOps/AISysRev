from src.tools.minio_client import minio_client, BUCKET_NAME

def minio_file_uploader(file_obj, filename):
    if not minio_client.bucket_exists(BUCKET_NAME):
        minio_client.make_bucket(BUCKET_NAME)
        print("Created bucket", BUCKET_NAME)

    file_obj.seek(0)
    minio_client.put_object(
        bucket_name=BUCKET_NAME,
        object_name=filename,
        data=file_obj,
        length=-1,
        part_size=10 * 1024 * 1024,
        content_type="text/csv"
    )
    print(f"{filename} successfully uploaded to bucket {BUCKET_NAME}")

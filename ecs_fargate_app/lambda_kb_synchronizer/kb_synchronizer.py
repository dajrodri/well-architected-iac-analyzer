# lambda_kb_synchronizer/kb_synchronizer.py

import csv
import json
import os
from io import StringIO

import boto3
import requests
from botocore.exceptions import ClientError


def download_file(url):
    response = requests.get(url)
    response.raise_for_status()
    return response.content


def upload_to_s3(bucket_name, file_name, file_content):
    s3_client = boto3.client("s3")
    try:
        s3_client.put_object(Bucket=bucket_name, Key=file_name, Body=file_content)
        print(f"File {file_name} uploaded successfully")
    except ClientError as e:
        print(f"Error uploading file {file_name}: {e}")
        raise


def get_lens_review(workload_id, lens_alias):
    client = boto3.client("wellarchitected")
    response = client.get_lens_review(WorkloadId=workload_id, LensAlias=lens_alias)
    return response["LensReview"]


def upgrade_lens_review(workload_id, lens_alias):
    client = boto3.client("wellarchitected")
    client.upgrade_lens_review(
        WorkloadId=workload_id,
        LensAlias=lens_alias,
        MilestoneName="string",
        ClientRequestToken="string",
    )
    return


def list_answers(workload_id, lens_alias):
    client = boto3.client("wellarchitected")
    answers = []
    next_token = None

    while True:
        if next_token:
            response = client.list_answers(
                WorkloadId=workload_id, LensAlias=lens_alias, NextToken=next_token
            )
        else:
            response = client.list_answers(WorkloadId=workload_id, LensAlias=lens_alias)

        answers.extend(response["AnswerSummaries"])

        if "NextToken" in response:
            next_token = response["NextToken"]
        else:
            break

    return answers


def process_answers(answers, pillar_mapping):
    result = []
    for answer in answers:
        pillar_id = answer["PillarId"]
        pillar_name = pillar_mapping.get(pillar_id, pillar_id)
        question = answer["QuestionTitle"]
        for choice in answer["Choices"]:
            if choice["Title"] != "None of these":
                result.append(
                    {
                        "Pillar": pillar_name,
                        "Question": question,
                        "Best Practice": choice["Title"],
                    }
                )
    return result


def create_json(data):
    return json.dumps(data, indent=2)


def create_csv(data):
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=["Pillar", "Question", "Best Practice"])
    writer.writeheader()
    for row in data:
        writer.writerow(row)
    return output.getvalue()


def handler(event, context):
    bucket_name = os.environ["WA_DOCS_BUCKET_NAME"]
    workload_id = os.environ.get("WORKLOAD_ID")
    lens_alias = "wellarchitected"

    files_to_download = [
        {
            "url": "https://docs.aws.amazon.com/pdfs/wellarchitected/latest/cost-optimization-pillar/wellarchitected-cost-optimization-pillar.pdf",
            "name": "wellarchitected-cost-optimization-pillar.pdf",
        },
        {
            "url": "https://docs.aws.amazon.com/pdfs/wellarchitected/latest/operational-excellence-pillar/wellarchitected-operational-excellence-pillar.pdf",
            "name": "wellarchitected-operational-excellence-pillar.pdf",
        },
        {
            "url": "https://docs.aws.amazon.com/pdfs/wellarchitected/latest/performance-efficiency-pillar/wellarchitected-performance-efficiency-pillar.pdf",
            "name": "wellarchitected-performance-efficiency-pillar.pdf",
        },
        {
            "url": "https://docs.aws.amazon.com/pdfs/wellarchitected/latest/reliability-pillar/wellarchitected-reliability-pillar.pdf",
            "name": "wellarchitected-reliability-pillar.pdf",
        },
        {
            "url": "https://docs.aws.amazon.com/pdfs/wellarchitected/latest/security-pillar/wellarchitected-security-pillar.pdf",
            "name": "wellarchitected-security-pillar.pdf",
        },
        {
            "url": "https://docs.aws.amazon.com/pdfs/wellarchitected/latest/sustainability-pillar/wellarchitected-sustainability-pillar.pdf",
            "name": "wellarchitected-sustainability-pillar.pdf",
        },
    ]

    for file in files_to_download:
        try:
            content = download_file(file["url"])
            upload_to_s3(bucket_name, file["name"], content)
        except Exception as e:
            print(f"Error uploading WA whitepaper {file['name']}: {e}")

    # Parse and upload Best Practices names as JSON and CSV
    try:
        # Upgrade lens review
        upgrade_lens_review(workload_id, lens_alias)

        # Get lens review
        lens_review = get_lens_review(workload_id, lens_alias)

        # Create pillar mapping
        pillar_mapping = {
            pillar["PillarId"]: pillar["PillarName"]
            for pillar in lens_review["PillarReviewSummaries"]
        }

        # Get answers
        answers = list_answers(workload_id, lens_alias)

        # Process answers
        processed_data = process_answers(answers, pillar_mapping)

        # Create JSON
        json_data = create_json(processed_data)

        # Create CSV
        csv_data = create_csv(processed_data)

        # Upload JSON to S3
        upload_to_s3(bucket_name, "well_architected_best_practices.json", json_data)

        # Upload CSV to S3
        upload_to_s3(bucket_name, "well_architected_best_practices.csv", csv_data)

    except Exception as e:
        print(f"Error uploading JSON and CSV files to bucket {bucket_name}: {str(e)}")

    # After uploading WA whitepaper and JSON/CSV files, start the ingestion job
    bedrock_agent = boto3.client("bedrock-agent")

    response = bedrock_agent.start_ingestion_job(
        knowledgeBaseId=os.environ["KNOWLEDGE_BASE_ID"],
        dataSourceId=os.environ["DATA_SOURCE_ID"],
    )

    print(f"Started ingestion job: {response['ingestionJob']['ingestionJobId']}")
    return

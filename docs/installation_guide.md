# Installation Guide

**Prerequisite: PostgreSQL must be installed.**

### Clone the Project:
```bash
git clone git@github.com:EvoTestOps/TitleAbstractScreening.git
```

### Navigate to the Client Directory:
```bash
cd TitleAbstractScreening/client
```

### Install Dependencies:
```bash
npm install
```

### Navigate to server folder:
```bash
cd TitleAbstractScreening/server
```

### Set Up a Virtual Environment:
```bash
python3 -m venv venv
```

### Activate the Virtual Environment:
```bash
source venv/bin/activate
```

### Install Dependencies:
```bash
pip install -r requirements.txt
```

### Create an .env-file:
```bash
touch .env
```

### Generate and Add the Secret Key to the .env file:
```bash
python3 -c "import secrets; print(f'SECRET_KEY={secrets.token_hex(64)}')" >> .env
```

### Add these lines to .env-file:
```bash
DB_URL="postgresql://your_username:your_password@localhost:5432/your_database"
MINIO_ENDPOINT=minio:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=strong-password
MINIO_BUCKET=llm-screening-poc-bucket
```

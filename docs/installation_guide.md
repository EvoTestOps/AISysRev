# Installation Guide

**Prerequisite: NVM (Node Version Manager), Python3 and PostgreSQL must be installed.**

### Clone the Project:
```bash
git clone git@github.com:EvoTestOps/TitleAbstractScreening.git
```

### Navigate to the Client Directory:
```bash
cd TitleAbstractScreening/client
```

### Use the Node Version 22:
```bash
nvm use 22
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
cp .env.example .env
```

### Generate and Add the Secret Key to the .env file:
```bash
python3 -c "import secrets; print(f'SECRET_KEY={secrets.token_hex(64)}')" >> .env
```

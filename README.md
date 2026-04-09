# AISysRev - LLM-based Tool for Title-abstract Screening

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/EvoTestOps/AiSysRev)


![Claude](https://img.shields.io/badge/Claude-D97757?style=for-the-badge&logo=claude&logoColor=white) ![ChatGPT](https://img.shields.io/badge/chatGPT-74aa9c?style=for-the-badge&logo=openai&logoColor=white) ![Google Gemini](https://img.shields.io/badge/google%20gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white) ![MistralAI](https://img.shields.io/badge/mistralai-FA520F?style=for-the-badge&logo=mistralai&logoColor=white) ![Ollama](https://img.shields.io/badge/ollama-%23000000.svg?style=for-the-badge&logo=ollama&logoColor=white)

> [!IMPORTANT]
> AISysRev is a Minimum Viable Product (MVP) with core functionality working. Some features are missing and there might be bugs. You can also checkout command line alternative [AISysRevCmdLine](https://github.com/EvoTestOps/AISysRevCmdLine)

This web-application offers AI-based support for Systematic Literature Reviews. Currently, only one step is supported: title–abstract screening. Although the application runs in a web browser, all data is stored locally on your machine. LLMs are accessed through [OpenRouter](https://openrouter.ai/), [OpenAI](https://platform.openai.com/docs/api-reference) or through a local provider (OpenAI SDK). Data for screening can be imported as a CSV from [Scopus](https://www.scopus.com/). 
The application allows you to:
- Import a CSV file with paper titles and abstracts. You can also use our [Demo CSV file](data/Demo_TimePressure_5_papers.csv)
- Specify include/exclude criteria for paper screening
- Evaluate papers against the criteria using multiple LLMs
- Receive LLM evaluations as binary decisions (include/exclude), ordinal ratings (1-7), or inclusion probabilities (0–1)
- Perform manual evaluation of titles and abstracts alongside LLM evaluations
- Export evaluation results to CSV for further analysis in Microsoft Excel, Google Sheets, R, Python, etc.

The application is based on our research papers on this topic. Please consider citing if you use the application [1–2](#references).

<p align="left">
  <img src="https://github.com/user-attachments/assets/e0d5aaf2-8c67-4991-bfa4-460fa9e06bfc" width="700"><br>
  <em>Main view shows LLM screening tasks.</em>
</p>

<p align="left">
  <img src="https://github.com/user-attachments/assets/03a9ea35-e1f6-4489-9e85-2e0efce829f9" width="700"><br>
  <em>Manual evaluation view, with LLM evaluations (binary, ordinal, probability) alongside manual review.</em>
</p>

<p align="left">
  <img src="https://github.com/user-attachments/assets/d8e3de7d-7ccd-41a4-8af0-b2c7ca3a65e7" width="700"><br>
  <em>Manual evaluation list view, with papers sorted by inclusion probability according to all executed LLMs.</em>
</p>


## Getting started

### Data
The tool has been tested with CSV data exported from [Scopus](https://www.scopus.com/). Support for [Web of Science](https://www.webofscience.com/) can be achieved by editing the columns headers to match the ones from Scopus. The minimum required fields are: Document title, DOI, Abstract, Authors, and Source title. 

<img width="60%" height="60%" alt="image" src="https://github.com/user-attachments/assets/beff785a-c91a-4179-9fb4-163e4102ce83" />


### LLMs Access
The application is integrated with [OpenRouter](https://openrouter.ai/), which supports multiple LLMs ranging from very affordable to top-tier models like OpenAI’s ChatGPT, Google’s Gemini, Anthropic’s Claude, Meta's LLama, and Mistral. To use the models, you need to provide an [OpenRouter](https://openrouter.ai/) key. You can set spending limits for each key directly on the [OpenRouter](https://openrouter.ai/) website. New users also receive $5 in free credits when creating an account.

<img width="784" height="117" alt="{585DBE92-5A2F-412E-BEF1-A727015EE872}" src="https://github.com/user-attachments/assets/bc112d74-31a0-4ce0-aeec-4879030c391e" />

### LLM screening speed
LLM calls are parallelized, and you should achieve a screening speed exceeding 100 papers per minute when using OpenRouter.


### System and software requirements
- Docker, with Compose and buildx plugins installed.
- `uv` Python package and project manager: https://docs.astral.sh/uv/getting-started/installation/
- Enough RAM (At least 8GB recommended)
- Network connection

See [https://docs.docker.com/desktop/](https://docs.docker.com/desktop/) for Docker installation instructions. **Docker Desktop includes Docker Compose, Docker Buildx, Docker Engine and the Docker CLI.**

If Docker Desktop did not include Buildx plugin, see: [https://github.com/docker/buildx][https://github.com/docker/buildx]

1. Run `docker info` to verify you have Docker installed
   - Docker `26.0.0` has been tested as working. For MacOS computers with Colima, Docker version `28.5.1` confirmed to be working.
2. Run `docker buildx version` to verify you have Docker Buildx installed. For MacOS computers, Buildx plugin version `0.29.1` confirmed to be working.
3. Run `docker compose version` to verify you have Compose installed. For MacOS computers, Compose plugin version `2.40.3` confirmed to be working.
   - Version `2.33.1` has been tested as working, newer versions should also work.
   - **Note:** Older versions of Compose use `docker-compose` as the compose command. We don't provide support for legacy Compose versions.


### Running the application
First, clone the repository to your local computer.
```bash
git clone https://github.com/EvoTestOps/AISysRev.git
```
move to correct directory
```bash
cd AISysRev
```

#### MacOS, Linux and Windows (WSL)
Start the application in production mode:
```bash
make start-prod
``` 
If you want to develop the app, run:
```bash
make start-dev
``` 
The startup of the app may a while due to the download of corresponding Docker images & services, application dependencies and building of the application.

After startup, open the application:

If you ran `start-prod`, navigate to [https://localhost:3000](https://localhost:3000) (the Caddy server's root CA is by default untrusted. You can bypass the browser warning).

If you used `make start-dev`, navigate to [http://localhost:3001](http://localhost:3001)


#### Windows (non-WSL)

If you do not have Windows Subsystem for Linux (WSL), start the application with 
```bash
./start-prod.bat
```

## Technology

### Front-end

TypeScript, React, Tailwind CSS, Vite, Wouter, Zod, Redux

### Back-end

Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic

### System design

See [Architecture.md](docs/Architecture.md)

## Development requirements
- Node.js v22 LTS
- Python 3.14
- Docker, with Compose plugin installed
- UV: https://docs.astral.sh/uv/getting-started/installation/

## Running in development mode

### MacOS, Linux and Windows (WSL)

`make start-dev`

### Windows (non-WSL)

`./start-dev.bat`

### Getting started with development

Open up the client: [http://localhost:3001](http://localhost:3001)

`/api` is internally proxied to the backend container, e.g. `http://localhost:3001/api/v1/health` will be proxied to `http://localhost:8080/api/v1/health`.

API: [http://localhost:3001/api/v1](http://localhost:3001/api/v1)

API docs: [http://localhost:3001/documentation](http://localhost:3001/docs)

Adminer GUI: [http://localhost:8081/?pgsql=postgres&username=your_username&db=your_database_dev&ns=](http://localhost:8081/?pgsql=postgres&username=your_username&db=your_database_dev&ns=) password: **your_password**

## Mock data

Mock data is located in `data/mock` -folder.

## Tests

### Client

Run in [client/](./client/):

- `npm test` for unit and component tests
- `npm run test:e2e` for e2e tests

### Server

Run in repository root: 

- `make backend-test` (`./backend-test.bat` for Windows non-WSL) for backend tests
- `make backend-test-html` (`./backend-test-html.bat` for Windows non-WSL) for backend tests and HTML coverage report

## Makefile Commands

The project includes a `Makefile` for common development and database operations:

### Development

| Command           | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| `make start-dev`  | Start dev containers with live reloading and build on startup (default setup) |
| `make start-test` | Start test containers and rebuild images (isolated test environment)          |
| `make start-prod` | Start production container and rebuild images                                 |

> **Note:** Run all commands from the project root.  
> Containers are isolated by environment using the Docker Compose `-p` flag.

### Database Migrations (Alembic)

| Command                     | Description                                                           |
| --------------------------- | --------------------------------------------------------------------- |
| `make m-create m="Message"` | Create a new migration with an autogenerated diff (replace `Message`) |
| `make m-up`                 | Apply all pending migrations (upgrade to latest)                      |
| `make m-hist`               | Show the full migration history with details                          |
| `make m-current`            | Display the current migration version in the database                 |

## Supported LLMs

Currently, we support models provided via Openrouter, OpenAI or via a local provider (OpenAI SDK).

## BibTeX Citation

Please use the following BibTeX citation to cite our work:

### Conference proceedings

Coming soon.

### Preprint

```
@misc{huotalaAISysRevLLMbasedTool2025,
	title = {{AISysRev} -- {LLM}-based {Tool} for {Title}-abstract {Screening}},
	url = {http://arxiv.org/abs/2510.06708},
	doi = {10.48550/arXiv.2510.06708},
	publisher = {arXiv},
	author = {Huotala, Aleksi and Kuutila, Miikka and Turtio, Olli-Pekka and Mäntylä, Mika},
	month = oct,
	year = {2025},
	note = {arXiv:2510.06708 [cs]},
	keywords = {Computer Science - Artificial Intelligence, Computer Science - Software Engineering}
}
```


## License

MIT

## References

[1]  Huotala, A., Kuutila, M., Ralph, P., & Mäntylä, M. (2024). The promise and challenges of using llms to accelerate the screening process of systematic reviews. Proceedings of the 28th International Conference on Evaluation and Assessment in Software Engineering, 262–271. [https://doi.org/10.1145/3661167.3661172](https://doi.org/10.1145/3661167.3661172)

[2] Huotala A, Kuutila M, Mäntylä M. SESR-Eval: Dataset for Evaluating LLMs in the Title-Abstract Screening of Systematic Reviews. In Proceedings of the The 19th ACM/IEEE International Symposium on Empirical Software Engineering and Measurement (ESEM) 2025 Oct 218 (pp. 1-12) [https://arxiv.org/abs/2507.19027](https://arxiv.org/abs/2507.19027)

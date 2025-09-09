# AISysRev
Project Status: This is a minimum viable product with core functionality working, but many features are missing and bugs remain.

This web-application offers AI-based support for Systematic Literature Reviews. Currently, only one step is supported: title–abstract screening. Although the application runs in a web browser, all data is stored locally on your machine. LLMs are accessed through [OpenRouter](https://openrouter.ai/), and data for screening can be imported from [Scopus](https://www.scopus.com/). 
The application allows you to:
- Import a CSV file with paper titles and abstracts
- Specify include/exclude criteria for paper screening
- Evaluate papers against the criteria using multiple LLMs
- Receive LLM evaluations as binary decisions (include/exclude), ordinal ratings (1-7), or inclusion probabilities (0–1)
- Perform manual evaluation of titles and abstracts alongside LLM evaluations
- Export evaluation results to CSV for further analysis in Microsoft Excel, Google Sheets, R, Python, etc.

The application is based on our research papers on this topic. Please consider citing if you use the application [1–2](#references).

<p align="left">
  <img src="https://github.com/user-attachments/assets/e0d5aaf2-8c67-4991-bfa4-460fa9e06bfc" width="700"><br>
  <em>This view shows LLM screening tasks.</em>
</p>

<p align="left">
  <img src="https://github.com/user-attachments/assets/03a9ea35-e1f6-4489-9e85-2e0efce829f9" width="700"><br>
  <em>This view shows LLM evaluations (binary, ordinal, probability) alongside manual review.</em>
</p>



## Getting started

### Data
The tool has been tested with CSV data exported from [Scopus](https://www.scopus.com/). Support for [Web of Science](https://www.webofscience.com/) can be achieved by editing the columns headers to match the ones from Scopus. The minimum required fields are: Document title, DOI, Abstract, Authors, and Source title. 

<img width="60%" height="60%" alt="image" src="https://github.com/user-attachments/assets/beff785a-c91a-4179-9fb4-163e4102ce83" />


### LLMs Access and LLM screening speed
The application is integrated with [OpenRouter](https://openrouter.ai/), which supports multiple LLMs ranging from very affordable to top-tier models like OpenAI’s ChatGPT, Google’s Gemini, Anthropic’s Claude, Meta's LLama, and Mistral. To use the models, you need to provide an [OpenRouter](https://openrouter.ai/) key. You can set spending limits for each key directly on the [OpenRouter](https://openrouter.ai/) website. New users also receive $5 in free credits when creating an account.
<img width="784" height="117" alt="{585DBE92-5A2F-412E-BEF1-A727015EE872}" src="https://github.com/user-attachments/assets/bc112d74-31a0-4ce0-aeec-4879030c391e" />

Note: Paper screening speed is about 4,5s per paper. We are working on parallelizing this after which it should go down to about 0.2s/paper. 


### System and software requirements
- Docker, with Compose plugin installed
- Enough RAM (16GB recommended) to run multiple containers
- Network connection

See [https://docs.docker.com/desktop/](https://docs.docker.com/desktop/) for Docker installation instructions. **Docker Desktop includes Docker Compose, Docker Engine and the Docker CLI.**

1. Run `docker info` to verify you have Docker installed
   - Docker `26.0.0` has been tested as working. For MacOS computers, Colima has been rigorously tested to work.
3. Run `docker compose version` to verify you have Compose installed.
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
Start the application
```bash
make start-prod
``` 
If it does not work try
```bash
make start-dev
``` 
The start up may take up to 3 minutes to start due to installation and downloading of necessary components. After starup open the application. If `start-prod` worked [http://localhost:80](http://localhost:80) if you used `make start-dev` then [http://localhost:3001](http://localhost:3001)

#### Windows (non-WSL)
If you do not have Windows Subsystem for Linux (WSL). Start with 
```bash
./start-prod.bat
```

## Technology

### Front-end

TypeScript, React, Tailwind CSS, Vite, Wouter, Zod, Redux

### Back-end

Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic

## Development requirements
- Node.js v22 LTS
- Python 3.9
- Docker, with Compose plugin installed

## Running in development mode

### MacOS, Linux and Windows (WSL)

`make start-dev`

### Windows (non-WSL)

`./start-dev.bat`

### Getting started with development

Open up the client: [http://localhost:3000](http://localhost:3000)

`/api` is proxied to the backend container, e.g. `http://localhost:3000/api/v1/health` will be proxied to `http://localhost:8080/api/v1/health`.

API docs: [http://localhost:3000/documentation](http://localhost:3000/docs)

Server: [http://localhost:8080](http://localhost:3000)

Adminer GUI: [http://localhost:8081/?pgsql=postgres&username=your_username&db=your_database_dev&ns=][http://localhost:8081/?pgsql=postgres&username=your_username&db=your_database_dev&ns=] password: **your_password**

## Mock data

Mock data is located in `data/mock` -folder.

## Tests

Run in [client/](./client/) `npm test` for e2e tests

Run in root `make backend-test` (`./backend-test.bat` for Windows non-WSL) for backend tests

Run in root `make backend-test-html` (`./backend-test-html.bat` for Windows non-WSL) for backend tests and HTML coverage report

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

Currently, we support models provided via Openrouter.

## License

CC-BY-ND 4.0


## References

[1]  Huotala, A., Kuutila, M., Ralph, P., & Mäntylä, M. (2024). The promise and challenges of using llms to accelerate the screening process of systematic reviews. Proceedings of the 28th International Conference on Evaluation and Assessment in Software Engineering, 262–271. [https://doi.org/10.1145/3661167.3661172](https://doi.org/10.1145/3661167.3661172)

[2] Huotala A, Kuutila M, Mäntylä M. SESR-Eval: Dataset for Evaluating LLMs in the Title-Abstract Screening of Systematic Reviews. In Proceedings of the The 19th ACM/IEEE International Symposium on Empirical Software Engineering and Measurement 2025 Oct 218 (pp. 1-12) [https://arxiv.org/abs/2507.19027](https://arxiv.org/abs/2507.19027)

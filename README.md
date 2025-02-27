# AI-automated screening PoC

![alt text](docs/client/assets/image-1.png)

## Introduction

This proof-of-concept (PoC) application demonstrates the current capabilities of AI-automated title-abstract screening of systematic reviews (SRs). This PoC is based on a conference paper "The Promise and Challenges of Using LLMs to Accelerate the Screening Process of Systematic Reviews" by Huotala et al.

## Technology

### Front-end

TypeScript, React, Tailwind CSS, Vite, Wouter, Zod, Redux

### Back-end

Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic

## Requirements

Node.js v22 LTS and Python 3.9 are required.

## Running

Run `docker-compose up` in the root folder.

## Tests

Run `npm test`

## Supported LLMs

Currently, we support models provided via Openrouter.

## License

CC-BY-ND 4.0

## References

Huotala, A., Kuutila, M., Ralph, P., & Mäntylä, M. (2024). The promise and challenges of using llms to accelerate the screening process of systematic reviews. Proceedings of the 28th International Conference on Evaluation and Assessment in Software Engineering, 262–271. https://doi.org/10.1145/3661167.3661172

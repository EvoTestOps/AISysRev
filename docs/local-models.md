> [!WARNING]
> This setup guide is work in progress (WIP)

# Using local LLMs with AiSysRev

AISysRev supports local LLMs. This setup guide is intended to help setting up a local LLM and calling it successfully via the UI. Please note, that reaching an adequate paper screening output a powerful machine should be used.

## MacOS - LM Studio

1. Download and setup LM Studio
2. Start the LM Studio server. The server should by default start at http://localhost:1234/
3. In AISysDev, put `http://localhost:1234/` as the base URL for the local provider, and click save.
4. Local models hosted by LM Studio should appear in the model dropdown.

> [!NOTE]
> Reaching the same token throughput as models hosted in GCP, Azure or AWS with beefy machines compute clusters require substantial compute capabilities (NVIDIA Ampere / Hopper / Blackwell or AMD Radeon Instinct accelerators with a minimum of 32GB VRAM). The developers of AISysRev will not provide support for performance issues of locally hosted LLMs.

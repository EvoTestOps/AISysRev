> [!WARNING]
> This setup guide is work in progress (WIP)

# Using local LLMs with AiSysRev

AISysRev supports local LLMs. This setup guide is intended to help setting up a local LLM and calling it successfully via the UI. Please note, that reaching an adequate paper screening output a powerful machine should be used.

## MacOS - LM Studio

1. Download and setup LM Studio
2. Start the LM Studio server. The server should by default start at http://localhost:1234/
3. In AISysDev, put `http://localhost:1234/` as the base URL for the local provider.

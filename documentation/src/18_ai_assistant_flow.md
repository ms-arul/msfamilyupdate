<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 18</div>
    <h1>AI Assistant Reasoning Sequence</h1>
    <div class="chapter-subtitle">Language processing, Context builds, Gemini APIs, and Output translation</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the query parsing and context generation steps used by the AI assistant.
    </div>
</div>

## 1. Inquiry Pipeline
Shows the processing steps for incoming user questions.

```mermaid
%% id: flow-ai
%% caption: AI Assistant Query Processing Pipeline
flowchart TD
    Query[1. User inputs query] --> DetectLang{2. Detect language?}
    
    DetectLang -->|Non-English| Translate[3. Translate context to English]
    DetectLang -->|English| LoadContext[4. Fetch active ledger data]
    
    Translate --> LoadContext
    
    LoadContext --> FetchLimits[5. Query active user budget limits]
    FetchLimits --> BuildPrompt[6. Execute prompt builder templates]
    BuildPrompt --> GeminiAPI[7. Call Gemini 2.5 Flash API]
    
    GeminiAPI --> ValidateJson{8. Validate JSON schema?}
    
    ValidateJson -->|Invalid| Fallback[9. Execute parser recovery template]
    ValidateJson -->|Valid| FormatResponse[10. Render formatted Markdown output]
    
    Fallback --> FormatResponse
    FormatResponse --> TranslateBack{11. Original query non-English?}
    
    TranslateBack -->|Yes| TranslateOutput[12. Convert output to user language]
    TranslateBack -->|No| Output[13. Display response in chat UI]
    
    TranslateOutput --> Output
```

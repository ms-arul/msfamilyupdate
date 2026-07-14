<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 38</div>
    <h1>AI &amp; LLM Engineering Pattern</h1>
    <div class="chapter-subtitle">Prompt configurations, JSON schema validations, and fallback parser structures</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the prompt configurations, schemas, and fallback parser structures.
    </div>
</div>

## 1. Gemini Ingestion Prompt Structure
When processing receipts in `MyProofs`, the system sends the image payload to Gemini with a structured prompt:

<div class="code-container">
    <div class="code-header">
        <span>prompt_templates/receipt_extraction.txt</span>
        <span class="code-lang-badge">text</span>
    </div>
```text
Return ONLY a valid JSON object matching the schema below. Do not include markdown formatting or markdown wrappers like ```json.
SCHEMA:
{
  "amount": number,
  "category": "Food" | "Utilities" | "Health" | "Travel" | "Other",
  "merchantName": string,
  "documentNumber": string or null,
  "date": "YYYY-MM-DD" or null,
  "summary": "1-sentence summary of the document contents"
}
```
</div>

## 2. Parsing &amp; Recovery Flow
The frontend validates the JSON format of the response from Gemini. If the response contains markdown code fences, they are removed. If parsing fails, the system falls back to basic regex extraction before prompting the user for manual entry:

<div class="code-container">
    <div class="code-header">
        <span>src/pages/MyProofs.tsx</span>
        <span class="code-lang-badge">javascript</span>
    </div>
```javascript
// Example recovery parsing helper in MyProofs.tsx
function parseGeminiJson(text: string): any {
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?
?/, '').replace(/
?```$/, '');
  }
  return JSON.parse(cleanText);
}
```
</div>

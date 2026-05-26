const apiKey = 'AIzaSyDQdFB6J9dkFEgwGo5GTmgH1mE7ljhK1Ak';

// First list available models, then test gemini-2.5-flash
async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.models) {
    console.log('Available models:');
    data.models
      .filter(m => m.name.includes('flash') || m.name.includes('gemini'))
      .forEach(m => console.log(`  ${m.name} - ${m.supportedGenerationMethods?.join(', ')}`));
  } else {
    console.log('Error listing models:', JSON.stringify(data));
  }
}

async function testModel(model) {
  console.log(`\nTesting model: ${model}`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say hello in one word' }] }]
    })
  });
  const data = await response.json();
  console.log('Status:', response.status);
  if (data.error) {
    console.log('Error:', data.error.message?.substring(0, 200));
  } else {
    console.log('Response:', data.candidates?.[0]?.content?.parts?.[0]?.text);
  }
}

async function main() {
  await listModels();
  await testModel('gemini-2.5-flash');
}

main();

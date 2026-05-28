require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'DUMMY_GEMINI_KEY') {
    console.error('❌ Please configure your GEMINI_API_KEY in the .env file first.');
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) {
      console.error('❌ Google API Error:', data.error);
      return;
    }
    
    console.log('=== Supported Gemini Models for your API Key ===\n');
    if (data.models) {
      data.models.forEach(m => {
        console.log(`- ${m.name.replace('models/', '')} (${m.displayName})`);
        console.log(`  Supported Actions: ${m.supportedGenerationMethods.join(', ')}\n`);
      });
    } else {
      console.log('No models returned. Full response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error fetching models:', error);
  }
}

listModels();

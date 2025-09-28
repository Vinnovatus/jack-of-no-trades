exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { publicationTitle, publicationLink } = JSON.parse(event.body);
    
    if (!publicationTitle) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Publication title is required' })
      };
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY};
    
    const prompt = `Analyze this NASA space bioscience publication and provide a comprehensive scientific analysis:

Publication Title: "${publicationTitle}"
Publication Link: ${publicationLink || 'N/A'}

Please provide response in JSON format:
{
  "summary": "Brief overview of the research and its significance",
  "problemsAddressed": ["List of key problems this research addresses"],
  "keyFindings": ["List of major findings and results"],
  "researchGoals": ["Primary goals and objectives of the study"],
  "futureDirections": ["Recommended future research directions"],
  "methodology": ["Key methodological approaches used"],
  "impact": "Assessment of research impact and significance",
  "visualDiagram": {
    "type": "flowchart",
    "title": "Research Process Flow",
    "nodes": ["Step1", "Step2", "Step3", "Step4", "Step5"],
    "connections": [["Step1", "Step2"], ["Step2", "Step3"], ["Step3", "Step4"], ["Step4", "Step5"]],
    "description": "Description of the research process"
  }
}`;

    console.log('Making request to Gemini API...');

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `Gemini API error: ${response.status}`,
          details: errorText 
        })
      };
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Invalid response format from Gemini API' })
      };
    }

    const aiText = data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON from response
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: parsedResponse, rawResponse: aiText })
        };
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            data: {
              summary: aiText.substring(0, 500) + (aiText.length > 500 ? "..." : ""),
              problemsAddressed: ["Analysis completed - see raw response"],
              keyFindings: ["Detailed findings provided"],
              researchGoals: ["Research objectives analyzed"],
              futureDirections: ["Future directions recommended"],
              methodology: ["Methodology identified"],
              impact: "Research impact assessed",
              visualDiagram: {
                type: "flowchart",
                title: "Research Process",
                nodes: ["Research Question", "Methodology", "Data Collection", "Analysis", "Conclusions"],
                connections: [
                  ["Research Question", "Methodology"],
                  ["Methodology", "Data Collection"], 
                  ["Data Collection", "Analysis"],
                  ["Analysis", "Conclusions"]
                ],
                description: "General research process flow"
              }
            },
            rawResponse: aiText 
          })
        };
      }
    } catch (parseError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to parse AI response',
          rawResponse: aiText 
        })
      };
    }
    
  } catch (error) {
    console.error('Netlify function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

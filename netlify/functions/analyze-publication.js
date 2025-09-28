// netlify/functions/analyze-publication.js

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${GEMINI_API_KEY}`;
    
    console.log('Starting analysis for:', publicationTitle);
    console.log('Publication link:', publicationLink);

    // Step 1: Fetch publication content
    let publicationContent = '';
    let contentSource = 'title-only';
    
    if (publicationLink && publicationLink.includes('http')) {
      try {
        console.log('Fetching publication content from:', publicationLink);
        
        const response = await fetch(publicationLink, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000
        });
        
        if (response.ok) {
          const html = await response.text();
          publicationContent = extractTextFromHTML(html);
          contentSource = 'full-content';
          console.log('Successfully extracted content, length:', publicationContent.length);
        } else {
          console.log('Failed to fetch publication:', response.status);
        }
      } catch (fetchError) {
        console.log('Error fetching publication:', fetchError.message);
      }
    }

    // Step 2: Prepare analysis prompt based on available content
    let prompt;
    
    if (contentSource === 'full-content' && publicationContent.length > 500) {
      // Truncate content to fit within API limits (keep most important parts)
      const truncatedContent = truncateContent(publicationContent, 3000);
      
      prompt = `Analyze this NASA space biology research publication:

Title: "${publicationTitle}"
Link: ${publicationLink}

Publication Content:
${truncatedContent}

Based on the actual publication content above, provide detailed analysis in this JSON format:
{
  "summary": "Comprehensive summary of the research based on actual content (2-3 detailed sentences)",
  "problemsAddressed": [
    "Specific problem 1 mentioned in the paper",
    "Specific problem 2 mentioned in the paper",
    "Specific problem 3 mentioned in the paper"
  ],
  "keyFindings": [
    "Actual finding 1 from the research",
    "Actual finding 2 from the research", 
    "Actual finding 3 from the research"
  ],
  "researchGoals": [
    "Actual objective 1 stated in the paper",
    "Actual objective 2 stated in the paper"
  ],
  "futureDirections": [
    "Future work mentioned in the paper",
    "Research recommendations from authors"
  ],
  "methodology": [
    "Actual method 1 used in the study",
    "Actual method 2 used in the study"
  ],
  "impact": "Actual significance and implications as stated by the authors"
}`;
    } else {
      // Fallback to title-based analysis with clear indication
      prompt = `Analyze this NASA space biology publication title and provide scientific insights:

Title: "${publicationTitle}"
Note: Full content not available, analysis based on title and domain knowledge.

Provide analysis in this JSON format:
{
  "summary": "Scientific analysis of what this research likely investigates based on the title and space biology knowledge",
  "problemsAddressed": [
    "Likely space biology challenge 1",
    "Likely space biology challenge 2",
    "Likely space biology challenge 3"
  ],
  "keyFindings": [
    "Type of findings typical for this research area",
    "Expected outcomes for this type of study",
    "Likely discoveries based on methodology"
  ],
  "researchGoals": [
    "Probable research objective 1",
    "Probable research objective 2"
  ],
  "futureDirections": [
    "Logical next research steps",
    "Future implications for space medicine"
  ],
  "methodology": [
    "Likely experimental approach for this type of study",
    "Common methods in this research area"
  ],
  "impact": "Expected significance for space biology and astronaut health"
}`;
    }

    console.log('Sending to Gemini API, content source:', contentSource);

    const apiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Gemini API error:', apiResponse.status, errorText);
      return {
        statusCode: apiResponse.status,
        headers,
        body: JSON.stringify({ 
          error: `Gemini API error: ${apiResponse.status}`,
          details: errorText 
        })
      };
    }

    const data = await apiResponse.json();
    console.log('Received API response, structure:', JSON.stringify(data, null, 2));
    
    // Parse response with robust error handling
    let aiText = '';
    
    if (!data) {
      throw new Error('No data in API response');
    }
    
    if (!data.candidates) {
      console.error('No candidates in response:', data);
      if (data.error) {
        throw new Error(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      throw new Error('No candidates in API response');
    }
    
    if (!Array.isArray(data.candidates) || data.candidates.length === 0) {
      console.error('Candidates is not a valid array:', data.candidates);
      throw new Error('Candidates array is empty or invalid');
    }
    
    const candidate = data.candidates[0];
    if (!candidate) {
      throw new Error('First candidate is null or undefined');
    }
    
    if (!candidate.content) {
      console.error('No content in candidate:', candidate);
      if (candidate.finishReason) {
        throw new Error(`API stopped generating: ${candidate.finishReason}`);
      }
      throw new Error('No content in candidate');
    }
    
    if (!candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
      console.error('No parts in content:', candidate.content);
      throw new Error('No parts in content');
    }
    
    const part = candidate.content.parts[0];
    if (!part || !part.text) {
      console.error('No text in first part:', part);
      throw new Error('No text in first part');
    }
    
    aiText = part.text;
    console.log('Successfully extracted AI text, length:', aiText.length);

    // Extract and parse JSON
    try {
      let cleanText = aiText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            data: {
              ...parsedResponse,
              contentSource: contentSource,
              contentLength: publicationContent.length,
              visualDiagram: generateDiagram(publicationTitle, parsedResponse)
            },
            rawResponse: aiText 
          })
        };
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError.message);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          data: {
            summary: aiText.substring(0, 500) + (aiText.length > 500 ? "..." : ""),
            problemsAddressed: ["Analysis completed - see raw response"],
            keyFindings: ["Detailed findings in raw response"],
            researchGoals: ["Research objectives analyzed"],
            futureDirections: ["Future directions recommended"],
            methodology: ["Methodology approaches identified"],
            impact: "Research impact assessed",
            contentSource: contentSource,
            visualDiagram: generateDiagram(publicationTitle, null)
          },
          rawResponse: aiText,
          note: "JSON parsing failed, showing raw response"
        })
      };
    }
    
  } catch (error) {
    console.error('Function error:', error);
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

// Extract text content from HTML
function extractTextFromHTML(html) {
  try {
    // Remove script and style tags
    let cleaned = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
    cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gis, '');
    
    // Focus on likely content areas for scientific papers
    const contentPatterns = [
      /<article[^>]*>(.*?)<\/article>/is,
      /<main[^>]*>(.*?)<\/main>/is,
      /<div[^>]*class[^>]*content[^>]*>(.*?)<\/div>/is,
      /<div[^>]*class[^>]*article[^>]*>(.*?)<\/div>/is,
      /<body[^>]*>(.*?)<\/body>/is
    ];
    
    let bestContent = '';
    for (const pattern of contentPatterns) {
      const match = cleaned.match(pattern);
      if (match && match[1].length > bestContent.length) {
        bestContent = match[1];
      }
    }
    
    if (bestContent) {
      cleaned = bestContent;
    }
    
    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Extract meaningful sections (abstract, introduction, results, conclusion)
    const sections = extractSections(cleaned);
    
    return sections;
  } catch (error) {
    console.error('Error extracting text from HTML:', error);
    return '';
  }
}

// Extract key sections from publication text
function extractSections(text) {
  const sectionKeywords = [
    'abstract', 'introduction', 'background', 'methods', 'methodology',
    'results', 'findings', 'discussion', 'conclusion', 'implications'
  ];
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const importantSentences = [];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (sectionKeywords.some(keyword => lowerSentence.includes(keyword)) ||
        sentence.length > 100) {
      importantSentences.push(sentence.trim());
    }
  }
  
  return importantSentences.slice(0, 20).join('. ') + '.';
}

// Truncate content to fit API limits while preserving important parts
function truncateContent(content, maxLength) {
  if (content.length <= maxLength) {
    return content;
  }
  
  // Try to keep beginning and end
  const beginning = content.substring(0, maxLength * 0.6);
  const end = content.substring(content.length - maxLength * 0.3);
  
  return beginning + '\n\n[...content truncated...]\n\n' + end;
}

// Generate contextual diagram based on content
function generateDiagram(title, analysisData) {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('bone') || titleLower.includes('osteo')) {
    return {
      type: "flowchart",
      title: "Bone Research Process",
      nodes: ["Microgravity Exposure", "Bone Density Measurement", "Cellular Analysis", "Intervention Testing", "Clinical Outcomes"],
      connections: [
        ["Microgravity Exposure", "Bone Density Measurement"],
        ["Bone Density Measurement", "Cellular Analysis"],
        ["Cellular Analysis", "Intervention Testing"],
        ["Intervention Testing", "Clinical Outcomes"]
      ],
      description: "Bone loss research methodology and outcomes"
    };
  }
  
  if (titleLower.includes('radiation')) {
    return {
      type: "flowchart", 
      title: "Radiation Effects Study",
      nodes: ["Radiation Exposure", "DNA Damage Assessment", "Repair Mechanisms", "Long-term Effects", "Protection Strategies"],
      connections: [
        ["Radiation Exposure", "DNA Damage Assessment"],
        ["DNA Damage Assessment", "Repair Mechanisms"],
        ["Repair Mechanisms", "Long-term Effects"],
        ["Long-term Effects", "Protection Strategies"]
      ],
      description: "Radiation biology research workflow"
    };
  }
  
  // Default research process
  return {
    type: "flowchart",
    title: "Space Biology Research",
    nodes: ["Research Question", "Experimental Design", "Data Collection", "Analysis", "Conclusions"],
    connections: [
      ["Research Question", "Experimental Design"],
      ["Experimental Design", "Data Collection"],
      ["Data Collection", "Analysis"],
      ["Analysis", "Conclusions"]
    ],
    description: "General space biology research process"
  };
}

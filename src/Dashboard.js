import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Rocket, Brain, Loader2, ExternalLink, Zap } from 'lucide-react';

const Dashboard = () => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    organism: 'all'
  });

  // Auto-categorize publications based on title keywords
  const categorizePublication = (title) => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('bone') || titleLower.includes('osteo') || titleLower.includes('skeletal')) {
      return 'Bone & Musculoskeletal';
    }
    if (titleLower.includes('radiation') || titleLower.includes('cosmic') || titleLower.includes('particle')) {
      return 'Radiation Biology';
    }
    if (titleLower.includes('plant') || titleLower.includes('arabidopsis') || titleLower.includes('root') || titleLower.includes('leaf')) {
      return 'Plant Biology';
    }
    if (titleLower.includes('muscle') || titleLower.includes('cardiac') || titleLower.includes('heart')) {
      return 'Cardiovascular & Muscle';
    }
    if (titleLower.includes('immune') || titleLower.includes('infection') || titleLower.includes('pathogen')) {
      return 'Immunology';
    }
    if (titleLower.includes('cell') || titleLower.includes('stem') || titleLower.includes('tissue')) {
      return 'Cell & Tissue Biology';
    }
    if (titleLower.includes('gene') || titleLower.includes('dna') || titleLower.includes('rna') || titleLower.includes('protein')) {
      return 'Molecular Biology';
    }
    if (titleLower.includes('microgravity') || titleLower.includes('weightless') || titleLower.includes('gravity')) {
      return 'Microgravity Effects';
    }
    if (titleLower.includes('behavior') || titleLower.includes('cognitive') || titleLower.includes('neural')) {
      return 'Neuroscience & Behavior';
    }
    if (titleLower.includes('metabolism') || titleLower.includes('nutrition') || titleLower.includes('diet')) {
      return 'Metabolism & Nutrition';
    }
    return 'General Space Biology';
  };

  // Extract likely organism from title
  const extractOrganism = (title) => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('human') || titleLower.includes('astronaut') || titleLower.includes('crew')) {
      return 'Human';
    }
    if (titleLower.includes('mouse') || titleLower.includes('mice') || titleLower.includes('murine')) {
      return 'Mouse';
    }
    if (titleLower.includes('rat') || titleLower.includes('rodent')) {
      return 'Rat';
    }
    if (titleLower.includes('arabidopsis') || titleLower.includes('plant')) {
      return 'Arabidopsis';
    }
    if (titleLower.includes('drosophila') || titleLower.includes('fly')) {
      return 'Drosophila';
    }
    if (titleLower.includes('cell line') || titleLower.includes('culture') || titleLower.includes('in vitro')) {
      return 'Cell Culture';
    }
    return 'Multiple/Other';
  };

  // Extract entities from title for AI processing
  const extractEntitiesFromTitle = (title) => {
    const entities = [];
    const titleLower = title.toLowerCase();
    
    const entityMap = {
      'microgravity': 'Environmental Condition',
      'radiation': 'Environmental Hazard',
      'bone': 'Biological System',
      'muscle': 'Biological System',
      'plant': 'Organism Type',
      'cell': 'Biological Unit',
      'gene': 'Molecular Component',
      'protein': 'Molecular Component',
      'dna': 'Molecular Component',
      'immune': 'Biological System',
      'metabolism': 'Biological Process'
    };
    
    Object.keys(entityMap).forEach(key => {
      if (titleLower.includes(key)) {
        entities.push({ term: key, type: entityMap[key] });
      }
    });
    
    return entities;
  };

  // Generate diagram data for visualization
  const generateDiagramData = (title) => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('bone')) {
      return {
        type: 'flowchart',
        title: 'Bone Loss Process',
        nodes: ['Microgravity', 'Osteoblast Inhibition', 'Osteoclast Activation', 'Bone Loss', 'Fracture Risk'],
        connections: [
          ['Microgravity', 'Osteoblast Inhibition'],
          ['Microgravity', 'Osteoclast Activation'],
          ['Osteoblast Inhibition', 'Bone Loss'],
          ['Osteoclast Activation', 'Bone Loss'],
          ['Bone Loss', 'Fracture Risk']
        ]
      };
    }
    
    if (titleLower.includes('radiation')) {
      return {
        type: 'flowchart',
        title: 'Radiation Damage Process',
        nodes: ['Space Radiation', 'DNA Damage', 'Cell Cycle Arrest', 'Repair/Apoptosis', 'Long-term Effects'],
        connections: [
          ['Space Radiation', 'DNA Damage'],
          ['DNA Damage', 'Cell Cycle Arrest'],
          ['Cell Cycle Arrest', 'Repair/Apoptosis'],
          ['Repair/Apoptosis', 'Long-term Effects']
        ]
      };
    }
    
    return {
      type: 'flowchart',
      title: 'Research Process',
      nodes: ['Space Environment', 'Biological Response', 'Physiological Changes', 'Health Impact'],
      connections: [
        ['Space Environment', 'Biological Response'],
        ['Biological Response', 'Physiological Changes'],
        ['Physiological Changes', 'Health Impact']
      ]
    };
  };

  // Load publications - try GitHub first, fallback to sample data
  useEffect(() => {
    // Sample data for demonstration (used as fallback)
    const samplePublications = [
      {
        id: 1,
        title: "Effects of Microgravity on Bone Density in Long-Duration Spaceflight",
        link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123456/",
        category: "Bone & Musculoskeletal",
        organism: "Human"
      },
      {
        id: 2,
        title: "Plant Growth and Development in Simulated Martian Conditions",
        link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC789012/",
        category: "Plant Biology",
        organism: "Arabidopsis"
      },
      {
        id: 3,
        title: "Radiation-Induced DNA Damage in Space Environment Using Cell Culture Models",
        link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC345678/",
        category: "Radiation Biology",
        organism: "Cell Culture"
      },
      {
        id: 4,
        title: "Muscle Atrophy Prevention During Extended Space Missions",
        link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC901234/",
        category: "Cardiovascular & Muscle",
        organism: "Human"
      },
      {
        id: 5,
        title: "Immune System Response to Microgravity in Mouse Models",
        link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC567890/",
        category: "Immunology",
        organism: "Mouse"
      }
    ];

    const loadPublications = async () => {
      try {
        console.log("🌐 Attempting to fetch NASA publications from GitHub...");
        
        // Try to fetch from GitHub first
        const response = await fetch('https://raw.githubusercontent.com/jgalazka/SB_publications/refs/heads/main/SB_publication_PMC.csv');
        
        if (!response.ok) {
          throw new Error(`GitHub fetch failed: ${response.status}`);
        }
        
        const csvContent = await response.text();
        console.log("✅ CSV data received from GitHub");
        
        // Simple CSV parsing for demo (you could use Papa Parse here)
        const lines = csvContent.split('\n');
        const data = lines.slice(1).filter(line => line.trim());
        
        const pubs = data.map((line, index) => {
          const values = line.split(',');
          const title = values[0]?.replace(/"/g, '') || '';
          const link = values[1]?.replace(/"/g, '') || '';
          
          if (!title.trim()) return null;
          
          return {
            id: index + 1,
            title: title.trim(),
            link: link.trim(),
            category: categorizePublication(title),
            organism: extractOrganism(title),
            processed: false
          };
        }).filter(Boolean);
        
        console.log(`🎉 Successfully processed ${pubs.length} publications`);
        setPublications(pubs);
        
      } catch (error) {
        console.warn('⚠️ GitHub fetch failed, using sample data:', error.message);
        
        // Fallback to sample data
        setPublications(samplePublications);
        console.log('📋 Loaded sample publications for demonstration');
      }
      
      setLoading(false);
    };

    loadPublications();
  }, []);

  // Filter publications based on search and filters
  const filteredPublications = publications.filter(pub => {
    if (!pub || !pub.title) return false;
    
    const matchesSearch = searchTerm === '' || pub.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filters.category === 'all' || pub.category === filters.category;
    const matchesOrganism = filters.organism === 'all' || pub.organism === filters.organism;
    
    return matchesSearch && matchesCategory && matchesOrganism;
  });

  // AI processing using Netlify function
  const processPublicationWithAI = async (publication) => {
    setSelectedPublication(publication);
    setAiProcessing(true);
    setAiResponse(null);

    try {
      console.log("Making request to Netlify function...");

      // For production: /.netlify/functions/analyze-publication
      // For local development: http://localhost:8888/.netlify/functions/analyze-publication
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8888/.netlify/functions/analyze-publication'
        : '/.netlify/functions/analyze-publication';

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicationTitle: publication.title,
          publicationLink: publication.link
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Netlify function error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setAiResponse(result.data);
      } else {
        throw new Error('Invalid response format from Netlify function');
      }
      
    } catch (error) {
      console.error('API call failed:', error);
      
      let errorMessage = error.message;
      let troubleshooting = [];
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = "Cannot connect to Netlify function";
        troubleshooting = [
          "Make sure you're running 'netlify dev' for local development",
          "Check if your site is deployed to Netlify for production",
          "Verify the function is deployed correctly"
        ];
      } else if (error.message.includes('500')) {
        errorMessage = "Netlify function error - check function logs";
        troubleshooting = [
          "Check Netlify function logs in your dashboard",
          "Verify your GEMINI_API_KEY environment variable is set",
          "Make sure you redeployed after adding the API key"
        ];
      } else if (error.message.includes('API key not configured')) {
        errorMessage = "Gemini API key not found";
        troubleshooting = [
          "Add GEMINI_API_KEY to your Netlify environment variables",
          "Redeploy your site after adding the environment variable"
        ];
      }
      
      setAiResponse({
        error: true,
        message: errorMessage,
        troubleshooting: troubleshooting,
        summary: "Unable to analyze publication due to API connectivity issues.",
        problemsAddressed: ["API connectivity issues prevent analysis"],
        keyFindings: ["Analysis temporarily unavailable"],
        researchGoals: ["Unable to retrieve research objectives"],
        futureDirections: ["Fix API configuration and retry"],
        methodology: ["Analysis failed due to technical issues"],
        entities: extractEntitiesFromTitle(publication.title),
        impact: "Analysis temporarily unavailable due to technical limitations",
        visualDiagram: generateDiagramData(publication.title)
      });
    }

    setAiProcessing(false);
  };

  // Get category counts for statistics
  const categoryStats = publications.reduce((acc, pub) => {
    acc[pub.category] = (acc[pub.category] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading NASA Publications Database</h2>
          <p className="text-gray-400">Fetching space bioscience publications...</p>
          <p className="text-xs text-gray-500 mt-2">Please wait while we load the data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-blue-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Rocket className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                NASA Bioscience Explorer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-blue-300">
                {filteredPublications.length} of {publications.length} Publications • AI-Enhanced Analysis
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 mb-8 border border-blue-500/30">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search publications by title or keywords..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-4">
              <select
                className="bg-white/10 border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-white"
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="all">All Categories</option>
                <option value="Bone & Musculoskeletal">Bone & Musculoskeletal</option>
                <option value="Radiation Biology">Radiation Biology</option>
                <option value="Plant Biology">Plant Biology</option>
                <option value="Cardiovascular & Muscle">Cardiovascular & Muscle</option>
                <option value="Immunology">Immunology</option>
                <option value="Cell & Tissue Biology">Cell & Tissue Biology</option>
                <option value="Molecular Biology">Molecular Biology</option>
                <option value="Microgravity Effects">Microgravity Effects</option>
                <option value="Neuroscience & Behavior">Neuroscience & Behavior</option>
                <option value="Metabolism & Nutrition">Metabolism & Nutrition</option>
                <option value="General Space Biology">General Space Biology</option>
              </select>

              <select
                className="bg-white/10 border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-white"
                value={filters.organism}
                onChange={(e) => setFilters({...filters, organism: e.target.value})}
              >
                <option value="all">All Organisms</option>
                <option value="Human">Human</option>
                <option value="Mouse">Mouse</option>
                <option value="Rat">Rat</option>
                <option value="Arabidopsis">Arabidopsis</option>
                <option value="Drosophila">Drosophila</option>
                <option value="Cell Culture">Cell Culture</option>
                <option value="Multiple/Other">Multiple/Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-4 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">{publications.length}</div>
            <div className="text-sm text-gray-300">Total Publications</div>
          </div>
          {topCategories.slice(0, 4).map(([category, count], index) => (
            <div key={category} className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-4 border border-purple-500/30">
              <div className="text-2xl font-bold text-purple-400">{count}</div>
              <div className="text-sm text-gray-300">{category.split(' ')[0]}...</div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Publications List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-blue-400" />
              Publications Database
              <span className="ml-3 text-sm font-normal text-green-400">
                ({filteredPublications.length} shown)
              </span>
            </h2>
            
            <div className="space-y-3 max-h-[800px] overflow-y-auto pr-4">
              {filteredPublications.map((publication) => (
                <div
                  key={publication.id}
                  className={`bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm rounded-xl p-4 border cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/10 ${
                    selectedPublication?.id === publication.id 
                      ? 'border-blue-400/70 bg-blue-500/10' 
                      : 'border-blue-500/30 hover:border-blue-400/50'
                  }`}
                  onClick={() => processPublicationWithAI(publication)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-2 text-blue-300 leading-tight">
                        {publication.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded text-xs border border-purple-500/30">
                          {publication.category}
                        </span>
                        <span className="bg-green-600/20 text-green-300 px-2 py-1 rounded text-xs border border-green-500/30">
                          {publication.organism}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center space-x-2">
                      <a 
                        href={publication.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <Zap className="w-4 h-4 text-yellow-400" title="Click for AI Analysis" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Panel */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-400" />
              AI Analysis Panel
            </h2>

            {!selectedPublication && (
              <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm rounded-xl p-6 border border-gray-600 text-center">
                <Brain className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">Select a Publication</h3>
                <p className="text-sm text-gray-500">Click on any publication to get AI-powered analysis and insights</p>
              </div>
            )}

            {selectedPublication && aiProcessing && (
              <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-purple-300 mb-2">Gemini AI Analysis in Progress...</h3>
                <p className="text-sm text-gray-400">Analyzing publication with Google's Gemini AI</p>
                <p className="text-xs text-gray-500 mt-2">This may take 10-30 seconds for comprehensive analysis</p>
              </div>
            )}

            {selectedPublication && !aiProcessing && aiResponse && (
              <div className="space-y-6">
                {/* Publication Info */}
                <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
                  <h3 className="font-semibold text-blue-300 mb-2 text-sm leading-tight">
                    {selectedPublication.title}
                  </h3>
                  <div className="flex gap-2 mb-3">
                    <span className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded text-xs">
                      {selectedPublication.category}
                    </span>
                    <span className="bg-green-600/20 text-green-300 px-2 py-1 rounded text-xs">
                      {selectedPublication.organism}
                    </span>
                  </div>
                  <a 
                    href={selectedPublication.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs flex items-center"
                  >
                    View Full Paper <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>

                {/* Enhanced Error Display */}
                {aiResponse.error && (
                  <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 backdrop-blur-sm rounded-xl p-4 border border-red-500/30">
                    <h4 className="font-semibold text-red-400 mb-2 text-sm flex items-center">
                      <Brain className="w-4 h-4 mr-1" />
                      API Analysis Error
                    </h4>
                    <p className="text-xs text-gray-300 mb-3">{aiResponse.message}</p>
                    
                    {aiResponse.troubleshooting && aiResponse.troubleshooting.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-semibold text-red-300 mb-1">Troubleshooting:</h5>
                        <ul className="text-xs text-gray-400 space-y-1">
                          {aiResponse.troubleshooting.map((tip, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-red-400 mr-2">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => processPublicationWithAI(selectedPublication)}
                      className="bg-red-600/30 hover:bg-red-600/50 px-3 py-1 rounded text-xs text-red-200 transition-colors"
                    >
                      Retry Analysis
                    </button>
                  </div>
                )}

                {/* AI Analysis Results */}
                {!aiResponse.error && (
                  <>
                    {/* Summary */}
                    <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
                      <h4 className="font-semibold text-green-400 mb-2 text-sm flex items-center">
                        <Brain className="w-4 h-4 mr-1" />
                        Gemini AI Summary
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed">{aiResponse.summary}</p>
                    </div>

                    {/* Problems Addressed */}
                    {aiResponse.problemsAddressed && (
                      <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm rounded-xl p-4 border border-red-500/30">
                        <h4 className="font-semibold text-red-400 mb-2 text-sm">Problems Addressed</h4>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {aiResponse.problemsAddressed.map((problem, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-red-400 mr-2">•</span>
                              <span>{problem}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Key Findings */}
                    {aiResponse.keyFindings && (
                      <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30">
                        <h4 className="font-semibold text-yellow-400 mb-2 text-sm">Key Findings</h4>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {aiResponse.keyFindings.map((finding, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-yellow-400 mr-2">•</span>
                              <span>{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Visual Diagram */}
                    {aiResponse.visualDiagram && (
                      <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/30">
                        <h4 className="font-semibold text-cyan-400 mb-3 text-sm">AI-Generated Research Diagram</h4>
                        <div className="bg-gray-800 rounded-lg p-4 mb-2">
                          <h5 className="text-cyan-300 text-xs mb-2 font-medium">{aiResponse.visualDiagram.title}</h5>
                          <svg viewBox="0 0 400 200" className="w-full h-32">
                            {aiResponse.visualDiagram.nodes.map((node, index) => {
                              const x = 40 + (index * 70);
                              const y = 100;
                              return (
                                <g key={index}>
                                  <rect 
                                    x={x-30} 
                                    y={y-20} 
                                    width="60" 
                                    height="40" 
                                    fill="#3b82f6" 
                                    fillOpacity="0.3" 
                                    stroke="#3b82f6" 
                                    strokeWidth="1"
                                    rx="8"
                                  />
                                  <text 
                                    x={x} 
                                    y={y-5} 
                                    textAnchor="middle" 
                                    fontSize="7" 
                                    fill="#ffffff"
                                    className="font-medium"
                                  >
                                    {node.length > 10 ? node.substring(0, 10) + '...' : node}
                                  </text>
                                  <text 
                                    x={x} 
                                    y={y+5} 
                                    textAnchor="middle" 
                                    fontSize="6" 
                                    fill="#60a5fa"
                                  >
                                    {node.length > 10 ? node.substring(10) : ''}
                                  </text>
                                </g>
                              );
                            })}
                            {aiResponse.visualDiagram.connections && aiResponse.visualDiagram.connections.map((connection, index) => {
                              const startIdx = aiResponse.visualDiagram.nodes.indexOf(connection[0]);
                              const endIdx = aiResponse.visualDiagram.nodes.indexOf(connection[1]);
                              if (startIdx !== -1 && endIdx !== -1) {
                                const x1 = 40 + (startIdx * 70) + 30;
                                const x2 = 40 + (endIdx * 70) - 30;
                                return (
                                  <line 
                                    key={index}
                                    x1={x1} 
                                    y1={100} 
                                    x2={x2} 
                                    y2={100}
                                    stroke="#60a5fa" 
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                  />
                                );
                              }
                              return null;
                            })}
                            <defs>
                              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
                              </marker>
                            </defs>
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Research Impact */}
                    <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30">
                      <h4 className="font-semibold text-orange-400 mb-2 text-sm">Research Impact</h4>
                      <p className="text-xs text-gray-300">{aiResponse.impact}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, Rocket, Brain, Loader2, ExternalLink, Zap, Network, Eye, EyeOff } from 'lucide-react';
import * as d3 from 'd3';

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
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);

  // Knowledge Graph Component
  const KnowledgeGraph = ({ publications, onPublicationSelect, selectedPublication }) => {
    const svgRef = useRef();
    const [focusedGraph, setFocusedGraph] = useState({ nodes: [], links: [] });
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodeTypes, setNodeTypes] = useState({
      publications: true,
      authors: true,
      concepts: true
    });
    const [graphSearchTerm, setGraphSearchTerm] = useState('');

    // Generate focused graph based on selected publication
    useEffect(() => {
      if (!selectedPublication || !publications || publications.length === 0) {
        setFocusedGraph({ nodes: [], links: [] });
        return;
      }

      const nodes = [];
      const links = [];
      const nodeMap = new Map();
      
      const addNode = (id, label, type, data = {}) => {
        if (!nodeMap.has(id)) {
          const node = { id, label, type, ...data };
          nodes.push(node);
          nodeMap.set(id, node);
        }
        return nodeMap.get(id);
      };

      const extractConcepts = (title, category) => {
        const concepts = new Set();
        concepts.add(category);
        
        const keyTerms = [
          'microgravity', 'radiation', 'bone', 'muscle', 'plant', 'cell',
          'gene', 'protein', 'dna', 'immune', 'metabolism', 'neural',
          'cardiac', 'space', 'astronaut', 'tissue', 'growth', 'development'
        ];
        
        const titleLower = title.toLowerCase();
        keyTerms.forEach(term => {
          if (titleLower.includes(term)) {
            concepts.add(term.charAt(0).toUpperCase() + term.slice(1));
          }
        });
        
        return Array.from(concepts);
      };

      const generateAuthors = (title) => {
        const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
        const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda'];
        
        // Generate consistent authors based on publication ID for reproducibility
        const seed = selectedPublication.id || 1;
        const authorCount = (seed % 3) + 1;
        const authors = [];
        
        for (let i = 0; i < authorCount; i++) {
          const firstIdx = (seed + i * 3) % firstNames.length;
          const lastIdx = (seed + i * 5) % surnames.length;
          authors.push(`${firstNames[firstIdx]} ${surnames[lastIdx]}`);
        }
        return authors;
      };

      // Add the central publication node
      const centralPub = addNode(
        `pub_${selectedPublication.id}`,
        selectedPublication.title.length > 50 ? selectedPublication.title.substring(0, 50) + '...' : selectedPublication.title,
        'publication',
        { 
          fullTitle: selectedPublication.title,
          category: selectedPublication.category,
          organism: selectedPublication.organism,
          link: selectedPublication.link,
          publicationData: selectedPublication,
          isCentral: true
        }
      );

      // Add concepts for the selected publication
      const concepts = extractConcepts(selectedPublication.title, selectedPublication.category);
      const conceptNodes = [];
      
      concepts.forEach(concept => {
        const conceptNode = addNode(
          `concept_${concept.toLowerCase()}`,
          concept,
          'concept',
          { relatedPublications: [] }
        );
        conceptNodes.push(conceptNode);
        
        links.push({
          source: centralPub.id,
          target: conceptNode.id,
          type: 'studies'
        });
      });

      // Add authors for the selected publication
      const authors = generateAuthors(selectedPublication.title);
      const authorNodes = [];
      
      authors.forEach(author => {
        const authorNode = addNode(
          `author_${author.replace(/\s+/g, '_').toLowerCase()}`,
          author,
          'author',
          { publications: [selectedPublication.id] }
        );
        authorNodes.push(authorNode);
        
        links.push({
          source: authorNode.id,
          target: centralPub.id,
          type: 'authored'
        });
      });

      // Find related publications based on shared concepts
      const relatedPublications = publications.filter(pub => {
        if (pub.id === selectedPublication.id) return false;
        
        // Check if publication shares category or key concepts
        if (pub.category === selectedPublication.category) return true;
        
        const pubConcepts = extractConcepts(pub.title, pub.category);
        return concepts.some(concept => pubConcepts.includes(concept));
      }).slice(0, 8); // Limit to 8 related publications to avoid overcrowding

      // Add related publications
      relatedPublications.forEach(pub => {
        const relatedPubNode = addNode(
          `pub_${pub.id}`,
          pub.title.length > 40 ? pub.title.substring(0, 40) + '...' : pub.title,
          'publication',
          { 
            fullTitle: pub.title,
            category: pub.category,
            organism: pub.organism,
            link: pub.link,
            publicationData: pub,
            isCentral: false
          }
        );

        // Connect related publications to shared concepts
        const relatedConcepts = extractConcepts(pub.title, pub.category);
        conceptNodes.forEach(conceptNode => {
          if (relatedConcepts.includes(conceptNode.label)) {
            links.push({
              source: relatedPubNode.id,
              target: conceptNode.id,
              type: 'studies',
              isSecondary: true
            });
          }
        });

        // Connect to authors if they work on similar topics
        const relatedAuthors = generateAuthors(pub.title);
        relatedAuthors.forEach(author => {
          // Check if author already exists or create new one
          const authorId = `author_${author.replace(/\s+/g, '_').toLowerCase()}`;
          let authorNode = nodeMap.get(authorId);
          
          if (!authorNode) {
            authorNode = addNode(
              authorId,
              author,
              'author',
              { publications: [pub.id] }
            );
          } else {
            authorNode.publications.push(pub.id);
          }
          
          links.push({
            source: authorNode.id,
            target: relatedPubNode.id,
            type: 'authored',
            isSecondary: true
          });
        });
      });

      setFocusedGraph({ nodes, links });
    }, [selectedPublication, publications]);

    // Filter graph data
    const filteredGraphData = React.useMemo(() => {
      let filteredNodes = focusedGraph.nodes.filter(node => nodeTypes[node.type + 's']);
      
      if (graphSearchTerm) {
        filteredNodes = filteredNodes.filter(node => 
          node.label.toLowerCase().includes(graphSearchTerm.toLowerCase())
        );
      }
      
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredLinks = focusedGraph.links.filter(link => 
        nodeIds.has(link.source.id || link.source) && 
        nodeIds.has(link.target.id || link.target)
      );
      
      return { nodes: filteredNodes, links: filteredLinks };
    }, [focusedGraph, nodeTypes, graphSearchTerm]);

    // D3 visualization
    useEffect(() => {
      if (!filteredGraphData.nodes.length) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const width = 800;
      const height = 500;

      svg.attr("width", width).attr("height", height);

      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          container.attr("transform", event.transform);
        });

      svg.call(zoom);

      const container = svg.append("g");

      const colorScale = {
        publication: '#3b82f6',
        author: '#10b981', 
        concept: '#f59e0b'
      };

      const simulation = d3.forceSimulation(filteredGraphData.nodes)
        .force("link", d3.forceLink(filteredGraphData.links)
          .id(d => d.id)
          .distance(d => d.type === 'studies' ? 120 : 80)
          .strength(d => d.isSecondary ? 0.2 : 0.5)
        )
        .force("charge", d3.forceManyBody().strength(d => d.isCentral ? -400 : -200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => 
          d.isCentral ? 35 : (d.type === 'publication' ? 25 : d.type === 'concept' ? 20 : 15)
        ));

      const links = container.append("g")
        .selectAll("line")
        .data(filteredGraphData.links)
        .enter().append("line")
        .attr("stroke", d => d.isSecondary ? "#64748b" : "#94a3b8")
        .attr("stroke-opacity", d => d.isSecondary ? 0.4 : 0.8)
        .attr("stroke-width", d => d.isSecondary ? 1 : 2);

      const nodes = container.append("g")
        .selectAll("circle")
        .data(filteredGraphData.nodes)
        .enter().append("circle")
        .attr("r", d => d.isCentral ? 12 : (d.type === 'publication' ? 8 : d.type === 'concept' ? 6 : 5))
        .attr("fill", d => colorScale[d.type])
        .attr("stroke", d => d.isCentral ? "#fbbf24" : "#fff")
        .attr("stroke-width", d => d.isCentral ? 4 : 2)
        .style("cursor", "pointer")
        .call(d3.drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
        );

      const labels = container.append("g")
        .selectAll("text")
        .data(filteredGraphData.nodes)
        .enter().append("text")
        .text(d => d.label)
        .attr("font-size", d => d.isCentral ? "12px" : "10px")
        .attr("font-weight", d => d.isCentral ? "bold" : "normal")
        .attr("fill", "#374151")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .style("pointer-events", "none");

      nodes
        .on("click", (event, d) => {
          setSelectedNode(d);
          if (d.type === 'publication' && onPublicationSelect) {
            onPublicationSelect(d.publicationData);
          }
        })
        .on("mouseover", function(event, d) {
          d3.select(this).attr("stroke-width", d.isCentral ? 6 : 4);
          
          const connectedNodeIds = new Set();
          filteredGraphData.links.forEach(link => {
            if (link.source.id === d.id) connectedNodeIds.add(link.target.id);
            if (link.target.id === d.id) connectedNodeIds.add(link.source.id);
          });
          
          nodes.attr("opacity", node => 
            node.id === d.id || connectedNodeIds.has(node.id) ? 1 : 0.3
          );
          links.attr("opacity", link => 
            link.source.id === d.id || link.target.id === d.id ? 1 : 0.1
          );
        })
        .on("mouseout", function(event, d) {
          d3.select(this).attr("stroke-width", d.isCentral ? 4 : 2);
          nodes.attr("opacity", 1);
          links.attr("opacity", d => d.isSecondary ? 0.4 : 0.8);
        });

      simulation.on("tick", () => {
        links
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        nodes
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);

        labels
          .attr("x", d => d.x)
          .attr("y", d => d.y + (d.isCentral ? 25 : 20));
      });

      return () => {
        simulation.stop();
      };
    }, [filteredGraphData, onPublicationSelect]);

    const nodeTypeCounts = React.useMemo(() => {
      return {
        publications: focusedGraph.nodes.filter(n => n.type === 'publication').length,
        authors: focusedGraph.nodes.filter(n => n.type === 'author').length,
        concepts: focusedGraph.nodes.filter(n => n.type === 'concept').length
      };
    }, [focusedGraph]);

    if (!selectedPublication) {
      return (
        <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm rounded-xl p-6 border border-indigo-500/30 mt-6">
          <h3 className="text-lg font-bold mb-4 flex items-center text-indigo-400">
            <Network className="w-5 h-5 mr-2" />
            Knowledge Graph
          </h3>
          <div className="text-center py-8">
            <Network className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-400 mb-2">Select a Publication to Explore</h4>
            <p className="text-sm text-gray-500">Click on any publication above to see its research network including related authors, concepts, and connected publications.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm rounded-xl p-6 border border-indigo-500/30 mt-6">
        <h3 className="text-lg font-bold mb-4 flex items-center text-indigo-400">
          <Network className="w-5 h-5 mr-2" />
          Knowledge Graph: "{selectedPublication.title.substring(0, 50)}..."
          <span className="ml-3 text-sm font-normal text-gray-400">
            ({filteredGraphData.nodes.length} nodes, {filteredGraphData.links.length} connections)
          </span>
        </h3>

        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              className="w-full pl-9 pr-4 py-2 bg-white/10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 text-sm"
              value={graphSearchTerm}
              onChange={(e) => setGraphSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {Object.entries(nodeTypes).map(([type, visible]) => (
              <button
                key={type}
                onClick={() => setNodeTypes(prev => ({ ...prev, [type]: !visible }))}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-xs transition-colors ${
                  visible 
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50' 
                    : 'bg-gray-600/30 text-gray-400 border border-gray-600/50'
                }`}
              >
                {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span className="capitalize">{type}</span>
                <span className="bg-black/30 px-1 rounded text-xs">
                  {nodeTypeCounts[type]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 mb-4 relative overflow-hidden">
          <svg ref={svgRef} className="w-full border border-gray-700 rounded bg-gray-800"></svg>
          
          <div className="absolute top-4 right-4 bg-black/70 rounded-lg p-3 text-xs">
            <div className="text-gray-300 font-semibold mb-2">Legend</div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-yellow-400"></div>
                <span className="text-gray-300">Selected Pub</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-300">Related Pubs</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-300">Authors</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-300">Concepts</span>
              </div>
            </div>
          </div>
        </div>

        {selectedNode && (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
            <h4 className="font-semibold text-white mb-2 flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                selectedNode.type === 'publication' ? 'bg-blue-500' :
                selectedNode.type === 'author' ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              {selectedNode.type === 'publication' ? 'Publication' :
               selectedNode.type === 'author' ? 'Author' : 'Concept'}
              {selectedNode.isCentral && <span className="ml-2 text-yellow-400 text-xs">(Selected)</span>}
            </h4>
            <p className="text-gray-300 text-sm mb-2">
              {selectedNode.type === 'publication' ? selectedNode.fullTitle : selectedNode.label}
            </p>
            {selectedNode.category && (
              <div className="text-xs text-gray-400">
                Category: {selectedNode.category} • Organism: {selectedNode.organism}
              </div>
            )}
            {selectedNode.publications && (
              <div className="text-xs text-gray-400">
                Connected to {selectedNode.publications.length} publication(s)
              </div>
            )}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500">
          <p><strong>Focused Network:</strong> Shows connections for the selected publication • Click other publications to explore their networks • Drag nodes to reposition • Hover to highlight connections</p>
        </div>
      </div>
    );
  };

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-400" />
                Publications Database
                <span className="ml-3 text-sm font-normal text-green-400">
                  ({filteredPublications.length} shown)
                </span>
              </h2>
              
              {/* Knowledge Graph Toggle */}
              <button
                onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  showKnowledgeGraph 
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50' 
                    : 'bg-gray-600/30 text-gray-400 border border-gray-600/50 hover:bg-gray-500/30'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>{showKnowledgeGraph ? 'Hide' : 'Show'} Knowledge Graph</span>
              </button>
            </div>

            {/* Knowledge Graph */}
            {showKnowledgeGraph && (
              <KnowledgeGraph 
                publications={filteredPublications} 
                onPublicationSelect={processPublicationWithAI}
                selectedPublication={selectedPublication}
              />
            )}
            
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
                      <div className="max-h-32 overflow-y-auto pr-2">
                        <p className="text-xs text-gray-300 leading-relaxed">{aiResponse.summary}</p>
                      </div>
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

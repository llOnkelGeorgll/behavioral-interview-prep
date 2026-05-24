import { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import ReactMarkdown from 'react-markdown';
import { Search, FileText } from 'lucide-react';
import storiesData from './data/stories.json';
import './index.css';

function App() {
  const [query, setQuery] = useState('');
  const [selectedStory, setSelectedStory] = useState(null);

  // Initialize Fuse for fuzzy searching
  const fuse = useMemo(() => new Fuse(storiesData, {
    keys: ['title', 'content'],
    threshold: 0.4,
    ignoreLocation: true
  }), []);

  // Filter stories based on search query
  const filteredStories = useMemo(() => {
    if (!query) return storiesData;
    return fuse.search(query).map(result => result.item);
  }, [query, fuse]);

  // Select first story by default
  useEffect(() => {
    if (filteredStories.length > 0 && !selectedStory && !query) {
      setSelectedStory(filteredStories[0]);
    }
  }, [filteredStories, selectedStory, query]);

  return (
    <div className="layout">
      {/* Sidebar (~25% to be readable) */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Interview Assistant</h2>
          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search keyword or question..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="story-list">
          {filteredStories.map(story => (
            <div 
              key={story.id} 
              className={`story-card ${selectedStory?.id === story.id ? 'active' : ''}`}
              onClick={() => setSelectedStory(story)}
            >
              <FileText size={16} className="card-icon" />
              <div className="card-title">{story.title}</div>
            </div>
          ))}
          {filteredStories.length === 0 && (
            <div className="no-results">No matching stories found.</div>
          )}
        </div>
      </aside>

      {/* Main View (~75%) */}
      <main className="main-content">
        {selectedStory ? (
          <div className="story-viewer">
            <ReactMarkdown>{selectedStory.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="empty-state">
            <FileText size={48} className="empty-icon" />
            <p>Select a story from the sidebar to view it.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

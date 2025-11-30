
import React, { useState, useEffect } from 'react';
import { SearchParams, LoadingState, SavedCommunity, SavedToken } from '../types';

interface InputFormProps {
  onAnalyze: (params: SearchParams) => void;
  loadingState: LoadingState;
}

const PRESET_COMMUNITIES: SavedCommunity[] = [
  { name: 'public137114', url: 'public137114' },
  { name: 'public23153323', url: 'public23153323' },
  { name: 'public60109889', url: 'public60109889' },
  { name: 'public86830443', url: 'public86830443' },
  { name: 'public36621543', url: 'public36621543' },
];

const PRESET_TOKENS: SavedToken[] = [
  { name: 'Default Service Key', token: '69862cb369862cb369862cb3e16abbbe2e6698669862cb300ad55d449d7546d00f127c8' }
];

const InputForm: React.FC<InputFormProps> = ({ onAnalyze, loadingState }) => {
  // Default to last 7 days
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');

  // --- Saved Communities State ---
  const [savedCommunities, setSavedCommunities] = useState<SavedCommunity[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vk_saved_communities');
      let initialList: SavedCommunity[] = [];
      if (saved) {
        try { initialList = JSON.parse(saved); } catch (e) { console.error(e); }
      }
      // Merge presets
      const existingUrls = new Set(initialList.map(c => c.url));
      const newPresets = PRESET_COMMUNITIES.filter(p => !existingUrls.has(p.url));
      return [...initialList, ...newPresets];
    }
    return PRESET_COMMUNITIES;
  });

  // --- Saved Tokens State ---
  const [savedTokens, setSavedTokens] = useState<SavedToken[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vk_saved_tokens');
      let initialList: SavedToken[] = [];
      if (saved) {
        try { initialList = JSON.parse(saved); } catch (e) { console.error(e); }
      }
      // Merge presets
      const existingTokens = new Set(initialList.map(t => t.token));
      const newPresets = PRESET_TOKENS.filter(p => !existingTokens.has(p.token));
      
      const combined = [...initialList, ...newPresets];
      
      return combined;
    }
    return PRESET_TOKENS;
  });

  // Initialize token with the first available saved token if input is empty
  useEffect(() => {
    if (!token && savedTokens.length > 0) {
      setToken(savedTokens[0].token);
    }
  }, []); // Run once on mount

  const [startDate, setStartDate] = useState(formatDate(lastWeek));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('vk_saved_communities', JSON.stringify(savedCommunities));
  }, [savedCommunities]);

  useEffect(() => {
    localStorage.setItem('vk_saved_tokens', JSON.stringify(savedTokens));
  }, [savedTokens]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !token) return;
    // Trim inputs to avoid whitespace errors
    onAnalyze({ communityUrl: url.trim(), startDate, endDate, accessToken: token.trim() });
  };

  // --- Handlers for Communities ---
  const handleSaveCommunity = () => {
    if (!url) return;
    const name = window.prompt("Enter a friendly name for this community:", url);
    if (name) {
      const newCommunity = { name, url };
      const existingIndex = savedCommunities.findIndex(c => c.url === url);
      if (existingIndex >= 0) {
        const updated = [...savedCommunities];
        updated[existingIndex] = newCommunity;
        setSavedCommunities(updated);
      } else {
        setSavedCommunities([...savedCommunities, newCommunity]);
      }
    }
  };

  const handleRemoveCommunity = (urlToRemove: string) => {
    if (window.confirm("Remove this community from saved list?")) {
      setSavedCommunities(savedCommunities.filter(c => c.url !== urlToRemove));
      if (url === urlToRemove) setUrl('');
    }
  };

  // --- Handlers for Tokens ---
  const handleSaveToken = () => {
    if (!token) return;
    const name = window.prompt("Enter a name for this Access Key (e.g. 'My Service Key'):", "My Service Key");
    if (name) {
      const newToken = { name, token };
      const existingIndex = savedTokens.findIndex(t => t.token === token);
      if (existingIndex >= 0) {
        const updated = [...savedTokens];
        updated[existingIndex] = newToken;
        setSavedTokens(updated);
      } else {
        setSavedTokens([...savedTokens, newToken]);
      }
    }
  };

  const handleRemoveToken = (tokenToRemove: string) => {
    if (window.confirm("Remove this token from saved list?")) {
      setSavedTokens(savedTokens.filter(t => t.token !== tokenToRemove));
      if (token === tokenToRemove) setToken('');
    }
  };

  const isCurrentUrlSaved = savedCommunities.some(c => c.url === url);
  const isCurrentTokenSaved = savedTokens.some(t => t.token === token);

  const getLoadingText = () => {
    switch (loadingState) {
      case LoadingState.RESOLVING_ID: return 'Finding Community...';
      case LoadingState.FETCHING_POSTS: return 'Fetching Posts...';
      default: return 'Loading...';
    }
  };

  const isLoading = loadingState !== LoadingState.IDLE && loadingState !== LoadingState.SUCCESS && loadingState !== LoadingState.ERROR;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Token Input Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              VK Service Access Key
            </label>
            <button 
              type="button" 
              onClick={() => setShowTokenHelp(!showTokenHelp)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              How to get it?
            </button>
          </div>
          
          {showTokenHelp && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-3 text-sm text-gray-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to <a href="https://dev.vk.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">dev.vk.com/my/apps</a></li>
                <li>Click <strong>"Create App"</strong> (use 'Standalone App' or 'Website').</li>
                <li>Go to <strong>Settings</strong> -> <strong>"Service Access Key"</strong>.</li>
              </ol>
            </div>
          )}

           {/* Saved Tokens Dropdown */}
           {savedTokens.length > 0 && (
            <div className="mb-2">
              <select
                id="saved-tokens"
                className="block w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                onChange={(e) => {
                  if (e.target.value) setToken(e.target.value);
                }}
                value={isCurrentTokenSaved ? token : ''}
              >
                <option value="">-- Select a saved key --</option>
                {savedTokens.map((t, idx) => (
                  <option key={idx} value={t.token}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex rounded-lg shadow-sm">
            <input
              type="password"
              id="token"
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
              placeholder="vk1.a.longstring..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={isCurrentTokenSaved ? () => handleRemoveToken(token) : handleSaveToken}
              className={`inline-flex items-center px-4 py-2.5 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isCurrentTokenSaved ? 'text-yellow-500' : 'text-gray-400'}`}
              title={isCurrentTokenSaved ? "Remove from saved" : "Save this key"}
            >
               <svg className="h-5 w-5" fill={isCurrentTokenSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
        </div>

        {/* URL Input Section */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            VK Community URL
          </label>
          
           {/* Saved Communities Dropdown */}
          {savedCommunities.length > 0 && (
             <div className="mb-2">
              <select
                id="saved-communities"
                className="block w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                onChange={(e) => {
                  if (e.target.value) setUrl(e.target.value);
                }}
                value={isCurrentUrlSaved ? url : ''}
              >
                <option value="">-- Choose from your list --</option>
                {savedCommunities.map((c, idx) => (
                  <option key={idx} value={c.url}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="relative flex rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <span className="text-gray-400">vk.com/</span>
            </div>
            <input
              type="text"
              id="url"
              className="block w-full pl-20 pr-12 py-3 border border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500 transition-colors z-0"
              placeholder="apiclub"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={isCurrentUrlSaved ? () => handleRemoveCommunity(url) : handleSaveCommunity}
              className={`inline-flex items-center px-4 py-3 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isCurrentUrlSaved ? 'text-yellow-500' : 'text-gray-400'}`}
              title={isCurrentUrlSaved ? "Remove from saved" : "Save to favorites"}
            >
              <svg className="h-5 w-5" fill={isCurrentUrlSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !url || !token}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all
              ${isLoading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {getLoadingText()}
              </>
            ) : (
              'Parse Posts'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputForm;

import React, { useState } from 'react';
import Header from './components/Header';
import InputForm from './components/InputForm';
import PostList from './components/PostList';
import { AnalysisResult, LoadingState, SearchParams } from './types';
import { resolveCommunityId, fetchPosts } from './services/vkService';

const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (params: SearchParams) => {
    setLoadingState(LoadingState.RESOLVING_ID);
    setError(null);
    setResult(null);

    try {
      // 1. Resolve Community
      const community = await resolveCommunityId(params.communityUrl, params.accessToken);
      
      // 2. Fetch Posts
      setLoadingState(LoadingState.FETCHING_POSTS);
      const posts = await fetchPosts(community.id, params.startDate, params.endDate, params.accessToken);

      if (posts.length === 0) {
        setResult({
          posts: [],
          communityName: community.name,
          communityPhoto: community.photo
        });
        setLoadingState(LoadingState.SUCCESS);
        return;
      }

      // 3. Sort by Likes
      const sortedPosts = posts.sort((a, b) => b.likes - a.likes);

      setResult({
        posts: sortedPosts,
        communityName: community.name,
        communityPhoto: community.photo
      });
      setLoadingState(LoadingState.SUCCESS);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while interacting with VK API.");
      setLoadingState(LoadingState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">VK Post Analyzer</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find the most popular posts from any public VK community by likes.
            </p>
          </div>

          <InputForm onAnalyze={handleAnalyze} loadingState={loadingState} />

          {error && (
            <div className="rounded-lg bg-red-50 p-4 border border-red-200 mb-8 animate-fade-in">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="animate-fade-in space-y-8">
              
              {/* Header Info */}
              <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                {result.communityPhoto && (
                  <img src={result.communityPhoto} alt={result.communityName} className="w-16 h-16 rounded-full" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{result.communityName}</h3>
                  <p className="text-sm text-gray-500">{result.posts.length} posts found in period</p>
                </div>
              </div>

              {/* Stats & Posts */}
              <PostList posts={result.posts} />
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Powered by VK API</p>
          <p className="mt-2 text-xs text-gray-400">Data retrieved via VK API. This tool is for personal analytical use.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;

'use client';

import { useState, useEffect } from 'react';
import { Upload, Trophy, Users, TrendingUp, X, AlertCircle, CheckCircle, Clock, Award, RefreshCw } from 'lucide-react';

export default function Home() {
    const [submissions, setSubmissions] = useState([]);
    const [file, setFile] = useState(null);
    const [rollNumber, setRollNumber] = useState('');
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        try {
            const response = await fetch('/api/submissions');
            const data = await response.json();
            setSubmissions(data.submissions || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching submissions:', error);
            setMessage({ type: 'error', text: 'Failed to load submissions' });
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.py')) {
            setFile(selectedFile);
            setMessage({ type: '', text: '' });
        } else {
            setMessage({ type: 'error', text: 'Please select a valid Python (.py) file' });
            setFile(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !rollNumber) {
            setMessage({ type: 'error', text: 'Please provide both roll number and file' });
            return;
        }

        setUploading(true);
        setMessage({ type: 'info', text: 'Uploading and running tournament...' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('rollNumber', rollNumber);

            const response = await fetch('/api/run-tournament', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: 'Tournament completed successfully!' });
                setFile(null);
                setRollNumber('');
                fetchSubmissions();
            } else {
                setMessage({ type: 'error', text: result.error || 'Submission failed' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setUploading(false);
        }
    };
    const handleUnsubmit = async (id) => {
    if (!confirm('Are you sure you want to remove this submission?')) return;

    try {
      const response = await fetch('/api/delete-submission', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Submission removed successfully' });
        fetchSubmissions();
      } else {
        const result = await response.json();
        setMessage({ type: 'error', text: result.error || 'Failed to remove submission' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const getRankBadge = (index) => {
    if (index === 0) return <Award className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Award className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-700" />;
    return <span className="text-gray-600 font-semibold">#{index + 1}</span>;
  };

  const formatScore = (score) => {
    if (!isFinite(score)) return 'FAILED';
    return score;
  };

  const successfulSubmissions = submissions.filter(s => isFinite(s.score));
  const highestScore = successfulSubmissions.length > 0 
    ? Math.max(...successfulSubmissions.map(s => s.score)) 
    : 0;
  const successRate = submissions.length > 0
    ? Math.round((successfulSubmissions.length / submissions.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              CSP Tournament
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Colour Me If You Can - Graph Coloring Challenge</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Participants</p>
                <p className="text-3xl font-bold text-gray-800">{submissions.length}</p>
              </div>
              <Users className="w-12 h-12 text-indigo-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Highest Score</p>
                <p className="text-3xl font-bold text-gray-800">{highestScore}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Success Rate</p>
                <p className="text-3xl font-bold text-gray-800">{successRate}%</p>
              </div>
              <CheckCircle className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Submission Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <Upload className="w-6 h-6 mr-2 text-indigo-600" />
            Submit Your Agent
          </h2>
          
          {message.text && (
            <div className={`mb-4 p-4 rounded-lg flex items-start ${
              message.type === 'error' ? 'bg-red-50 text-red-800' :
              message.type === 'success' ? 'bg-green-50 text-green-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {message.type === 'error' && <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />}
              {message.type === 'success' && <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />}
              {message.type === 'info' && <Clock className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 animate-spin" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roll Number
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g., 2021CS10001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent File (.py)
              </label>
              <input
                type="file"
                accept=".py"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={uploading}
              />
              {file && (
                <p className="mt-2 text-sm text-green-600 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {file.name}
                </p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={uploading || !file || !rollNumber}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Running Tournament...
                </span>
              ) : (
                'Submit & Run Tournament'
              )}
            </button>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Trophy className="w-6 h-6 mr-2" />
              Leaderboard
            </h2>
            <button
              onClick={fetchSubmissions}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              title="Refresh leaderboard"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-indigo-600 animate-spin" />
                <p className="text-gray-500">Loading submissions...</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Roll Number</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Score</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Moves</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Reassignments</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {submissions.map((submission, index) => (
                    <tr 
                      key={submission.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getRankBadge(index)}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {submission.rollNumber}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          !isFinite(submission.score)
                            ? 'bg-red-100 text-red-800' 
                            : submission.score >= 100 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {formatScore(submission.score)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-700">{submission.moves}</td>
                      <td className="px-6 py-4 text-center text-gray-700">{submission.reassignments}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          isFinite(submission.score)
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isFinite(submission.score) ? '✓ Success' : '✗ Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleUnsubmit(submission.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Remove submission"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && submissions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No submissions yet. Be the first to submit!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import loadBalancer from '../config/loadBalancer';

/**
 * Load Balancer Stats Component
 * Shows real-time status of all 3 backend servers
 */
export default function LoadBalancerStats() {
  const [stats, setStats] = useState(null);
  const [servers, setServers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(loadBalancer.getStats());
      setServers(loadBalancer.getServerStatus());
    };

    // Update immediately
    updateStats();

    // Update every 5 seconds
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg shadow-lg font-medium transition-all ${
          stats.healthy === stats.total
            ? 'bg-green-500 text-white hover:bg-green-600'
            : stats.healthy > 0
            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
            : 'bg-red-500 text-white hover:bg-red-600'
        }`}
      >
        🌐 Servers: {stats.healthy}/{stats.total}
      </button>

      {/* Detailed Stats Panel */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Load Balancer Status
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.healthy}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">
                Healthy Servers
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.unhealthy}
              </div>
              <div className="text-xs text-red-700 dark:text-red-300">
                Unhealthy Servers
              </div>
            </div>
          </div>

          {/* Server List */}
          <div className="space-y-2">
            {servers.map((server, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-2 transition-all ${
                  server.healthy
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {server.name}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      server.healthy
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {server.healthy ? '✓ Healthy' : '✗ Down'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {server.url.replace('https://', '')}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    Fails: {server.failCount}
                  </span>
                  {server.lastCheck && (
                    <span className="text-gray-500 dark:text-gray-400">
                      Last: {new Date(server.lastCheck).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Health checks every 30 seconds
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

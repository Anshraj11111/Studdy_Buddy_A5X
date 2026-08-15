/**
 * Client-Side Load Balancer for 3 Render Backend Servers
 * 
 * Features:
 * - Round-robin load distribution
 * - Automatic health checks
 * - Failover to healthy servers
 * - Request retry logic
 * - Server status tracking
 */

class LoadBalancer {
  constructor() {
    // All backend URLs - add more as you scale
    // For 10K users: Use 6 servers (2 per database)
    this.servers = [
      // PRIMARY Database servers (Users/Auth/Communities)
      {
        url: 'https://studdy-buddy-backend-a5x.onrender.com',
        name: 'Server-1 (Primary-A)',
        healthy: true,
        lastCheck: null,
        failCount: 0,
        group: 'primary',
      },
      // SECONDARY Database servers (Content/Doubts/Resources)
      {
        url: 'https://studdy-buddy-backend-a5x-ytip.onrender.com',
        name: 'Server-2 (Secondary-A)',
        healthy: true,
        lastCheck: null,
        failCount: 0,
        group: 'secondary',
      },
      // TERTIARY Database servers (Messages/Broadcasts/Real-time)
      {
        url: 'https://studdy-buddy-backend-a5x-2dn7.onrender.com',
        name: 'Server-3 (Tertiary-A)',
        healthy: true,
        lastCheck: null,
        failCount: 0,
        group: 'tertiary',
      },
      
      // ────────────────────────────────────────────────────────
      // 🚀 ADD 3 MORE SERVERS FOR 10K USERS (Uncomment when ready)
      // ────────────────────────────────────────────────────────
      // {
      //   url: 'https://studdy-buddy-backend-a5x-4xxx.onrender.com',
      //   name: 'Server-4 (Primary-B)',
      //   healthy: true,
      //   lastCheck: null,
      //   failCount: 0,
      //   group: 'primary',
      // },
      // {
      //   url: 'https://studdy-buddy-backend-a5x-5xxx.onrender.com',
      //   name: 'Server-5 (Secondary-B)',
      //   healthy: true,
      //   lastCheck: null,
      //   failCount: 0,
      //   group: 'secondary',
      // },
      // {
      //   url: 'https://studdy-buddy-backend-a5x-6xxx.onrender.com',
      //   name: 'Server-6 (Tertiary-B)',
      //   healthy: true,
      //   lastCheck: null,
      //   failCount: 0,
      //   group: 'tertiary',
      // },
    ];

    this.currentIndex = 0;
    this.maxRetries = 3;
    this.healthCheckInterval = 30000; // 30 seconds
    this.failureThreshold = 3; // Mark unhealthy after 3 consecutive failures

    // Start health checks
    this.startHealthChecks();
  }

  /**
   * Get next healthy server using round-robin
   */
  getNextServer() {
    const healthyServers = this.servers.filter(s => s.healthy);
    
    if (healthyServers.length === 0) {
      console.warn('⚠️ No healthy servers! Using first server as fallback.');
      return this.servers[0];
    }

    // Round-robin among healthy servers
    const server = healthyServers[this.currentIndex % healthyServers.length];
    this.currentIndex = (this.currentIndex + 1) % healthyServers.length;
    
    console.log(`🎯 Using ${server.name}: ${server.url}`);
    return server;
  }

  /**
   * Get API URL with load balancing
   */
  getApiUrl() {
    const server = this.getNextServer();
    return `${server.url}/api`;
  }

  /**
   * Get Socket.IO URL with load balancing
   */
  getSocketUrl() {
    const server = this.getNextServer();
    return server.url;
  }

  /**
   * Mark server as failed
   */
  markServerFailed(serverUrl) {
    const server = this.servers.find(s => s.url === serverUrl);
    if (server) {
      server.failCount++;
      console.warn(`⚠️ ${server.name} failed (${server.failCount}/${this.failureThreshold})`);

      if (server.failCount >= this.failureThreshold) {
        server.healthy = false;
        console.error(`❌ ${server.name} marked UNHEALTHY`);
      }
    }
  }

  /**
   * Mark server as successful
   */
  markServerSuccess(serverUrl) {
    const server = this.servers.find(s => s.url === serverUrl);
    if (server) {
      server.failCount = 0;
      if (!server.healthy) {
        server.healthy = true;
        console.log(`✅ ${server.name} recovered and marked HEALTHY`);
      }
    }
  }

  /**
   * Health check for all servers
   */
  async checkHealth() {
    console.log('🏥 Running health checks...');
    
    const checks = this.servers.map(async (server) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(`${server.url}/health`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          server.healthy = true;
          server.failCount = 0;
          server.lastCheck = new Date();
          console.log(`✅ ${server.name} is healthy`);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        server.failCount++;
        console.warn(`⚠️ ${server.name} health check failed:`, error.message);
        
        if (server.failCount >= this.failureThreshold) {
          server.healthy = false;
          console.error(`❌ ${server.name} marked UNHEALTHY`);
        }
      }
    });

    await Promise.allSettled(checks);
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    // Initial health check
    this.checkHealth();

    // Periodic checks
    setInterval(() => {
      this.checkHealth();
    }, this.healthCheckInterval);
  }

  /**
   * Get all servers status
   */
  getServerStatus() {
    return this.servers.map(s => ({
      name: s.name,
      url: s.url,
      healthy: s.healthy,
      failCount: s.failCount,
      lastCheck: s.lastCheck,
    }));
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.servers.length;
    const healthy = this.servers.filter(s => s.healthy).length;
    const unhealthy = total - healthy;

    return {
      total,
      healthy,
      unhealthy,
      healthPercentage: ((healthy / total) * 100).toFixed(1),
    };
  }
}

// Singleton instance
const loadBalancer = new LoadBalancer();

export default loadBalancer;

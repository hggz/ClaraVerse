const { EventEmitter } = require('events');
const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { app, dialog } = require('electron');
const tar = require('tar-fs');
const http = require('http');

class DockerSetup extends EventEmitter {
  constructor() {
    super();
    this.isDevMode = process.env.NODE_ENV === 'development';
    this.appDataPath = path.join(os.homedir(), '.clara');
    
    // Docker binary paths - using Docker CLI path for both docker and compose commands
    this.dockerPath = '/usr/local/bin/docker';
    
    // Initialize Docker client with the first working socket
    this.docker = this.initializeDockerClient();

    // Path for storing pull timestamps
    this.pullTimestampsPath = path.join(this.appDataPath, 'pull_timestamps.json');

    // Get system architecture
    this.systemArch = this.getSystemArchitecture();
    console.log(`Detected system architecture: ${this.systemArch}`);

    // Container configuration - Removed Ollama container
    this.containers = {
      python: {
        name: 'clara_python',
        image: this.getArchSpecificImage('clara17verse/clara-backend', 'latest'),
        port: 5001,
        internalPort: 5000,
        healthCheck: this.isPythonRunning.bind(this),
        volumes: [
          `${this.appDataPath}:/root/.clara`
        ]
      },
      n8n: {
        name: 'clara_n8n',
        image: this.getArchSpecificImage('n8nio/n8n', 'latest'),
        port: 5678,
        internalPort: 5678,
        healthCheck: this.checkN8NHealth.bind(this),
        volumes: [
          `${path.join(this.appDataPath, 'n8n')}:/home/node/.n8n`
        ]
      }
    };

    // Ensure app data directory exists
    if (!fs.existsSync(this.appDataPath)) {
      fs.mkdirSync(this.appDataPath, { recursive: true });
    }

    // Initialize pull timestamps if not exists
    this.initializePullTimestamps();

    // Docker Compose file path
    this.composeFilePath = path.join(this.appDataPath, 'docker-compose.yml');
    
    // Docker Desktop app paths
    this.dockerAppPaths = {
      darwin: '/Applications/Docker.app'
    };

    // Get the app root directory
    this.appRoot = path.resolve(__dirname, '..');

    // Default ports with fallbacks
    this.ports = {
      python: 5001,
      n8n: 5678,
      ollama: 11434
    };

    // Maximum retry attempts for service health checks
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds

    // Clara container names
    this.containerNames = ['clara_python', 'clara_n8n'];

    // Create subdirectories for each service
    Object.keys(this.containers).forEach(service => {
      const servicePath = path.join(this.appDataPath, service);
      if (!fs.existsSync(servicePath)) {
        fs.mkdirSync(servicePath, { recursive: true });
      }
    });
  }

  /**
   * Get system architecture and map to Docker platform
   */
  getSystemArchitecture() {
    const arch = os.arch();
    const platform = os.platform();
    
    console.log(`System info - Platform: ${platform}, Arch: ${arch}`);
    
    // Map Node.js arch to Docker platform
    const archMap = {
      'x64': 'amd64',
      'arm64': 'arm64',
      'arm': 'arm/v7',
      'ia32': '386'
    };
    
    const dockerArch = archMap[arch] || arch;
    return `${platform}/${dockerArch}`;
  }

  /**
   * Get architecture-specific image name
   */
  getArchSpecificImage(baseImage, tag) {
    // For multi-arch images, Docker will automatically pull the correct architecture
    // But we can specify platform if needed
    return `${baseImage}:${tag}`;
  }

  /**
   * Check if container image has updates available
   */
  async checkForImageUpdates(imageName, statusCallback) {
    try {
      statusCallback(`Checking for updates to ${imageName}...`);
      
      // Get local image info
      let localImage = null;
      try {
        localImage = await this.docker.getImage(imageName).inspect();
      } catch (error) {
        if (error.statusCode === 404) {
          statusCallback(`${imageName} not found locally, will download...`);
          return { hasUpdate: true, reason: 'Image not found locally' };
        }
        throw error;
      }

      // Pull latest image info without downloading
      return new Promise((resolve, reject) => {
        this.docker.pull(imageName, { platform: this.systemArch }, (err, stream) => {
          if (err) {
            console.error('Error checking for updates:', err);
            resolve({ hasUpdate: false, reason: 'Failed to check for updates', error: err.message });
            return;
          }

          let hasUpdate = false;
          let updateReason = '';
          let downloadingDetected = false;

          stream.on('data', (data) => {
            const lines = data.toString().split('\n').filter(Boolean);
            lines.forEach(line => {
              try {
                const parsed = JSON.parse(line);
                
                // Check for various update indicators
                if (parsed.status) {
                  if (parsed.status.includes('Image is up to date')) {
                    hasUpdate = false;
                    updateReason = 'Image is up to date';
                  } else if (parsed.status.includes('Downloading') || 
                           parsed.status.includes('Extracting') ||
                           parsed.status.includes('Pulling fs layer')) {
                    hasUpdate = true;
                    downloadingDetected = true;
                    updateReason = 'New version available';
                  } else if (parsed.status.includes('Pull complete')) {
                    if (downloadingDetected) {
                      hasUpdate = true;
                      updateReason = 'Update downloaded';
                    }
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            });
          });

          stream.on('end', () => {
            statusCallback(`Update check complete for ${imageName}`);
            resolve({ 
              hasUpdate, 
              reason: updateReason || 'No updates available',
              imageName 
            });
          });

          stream.on('error', (error) => {
            console.error('Stream error during update check:', error);
            resolve({ 
              hasUpdate: false, 
              reason: 'Error checking for updates', 
              error: error.message 
            });
          });
        });
      });
    } catch (error) {
      console.error('Error checking for image updates:', error);
      return { 
        hasUpdate: false, 
        reason: 'Error checking for updates', 
        error: error.message 
      };
    }
  }

  /**
   * Show update dialog and handle user choice
   */
  async showUpdateDialog(updateInfo) {
    const updatesAvailable = updateInfo.filter(info => info.hasUpdate);
    
    if (updatesAvailable.length === 0) {
      return { updateAll: false, updates: [] };
    }

    const updateList = updatesAvailable.map(info => 
      `• ${info.imageName}: ${info.reason}`
    ).join('\n');

    const response = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Update Now', 'Skip Updates', 'Cancel'],
      defaultId: 0,
      title: 'Container Updates Available',
      message: `Updates are available for the following containers:\n\n${updateList}\n\nWould you like to update them now?`,
      detail: `Architecture: ${this.systemArch}\n\nUpdating will ensure you have the latest features and security fixes.`
    });

    return {
      updateAll: response.response === 0,
      skip: response.response === 1,
      cancel: response.response === 2,
      updates: updatesAvailable
    };
  }

  /**
   * Pull image with progress tracking and architecture specification
   */
  async pullImageWithProgress(imageName, statusCallback) {
    return new Promise((resolve, reject) => {
      statusCallback(`Pulling ${imageName} for ${this.systemArch}...`);
      
      this.docker.pull(imageName, { platform: this.systemArch }, (err, stream) => {
        if (err) {
          console.error('Error pulling image:', err);
          reject(err);
          return;
        }

        let lastStatus = '';
        let progress = {};

        stream.on('data', (data) => {
          const lines = data.toString().split('\n').filter(Boolean);
          lines.forEach(line => {
            try {
              const parsed = JSON.parse(line);
              
              if (parsed.error) {
                console.error('Pull error:', parsed.error);
                reject(new Error(parsed.error));
                return;
              }

              if (parsed.status && parsed.status !== lastStatus) {
                lastStatus = parsed.status;
                
                // Track progress for different layers
                if (parsed.id && parsed.progressDetail) {
                  progress[parsed.id] = parsed.progressDetail;
                  
                  // Calculate overall progress
                  const layers = Object.values(progress);
                  const totalCurrent = layers.reduce((sum, layer) => sum + (layer.current || 0), 0);
                  const totalTotal = layers.reduce((sum, layer) => sum + (layer.total || 0), 0);
                  
                  if (totalTotal > 0) {
                    const percentage = Math.round((totalCurrent / totalTotal) * 100);
                    statusCallback(`Pulling ${imageName}: ${parsed.status} (${percentage}%)`);
                  } else {
                    statusCallback(`Pulling ${imageName}: ${parsed.status}`);
                  }
                } else {
                  statusCallback(`Pulling ${imageName}: ${parsed.status}`);
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          });
        });

        stream.on('end', () => {
          statusCallback(`✓ Successfully pulled ${imageName}`);
          this.updatePullTimestamp(imageName);
          resolve();
        });

        stream.on('error', (error) => {
          console.error('Stream error:', error);
          reject(error);
        });
      });
    });
  }

  async execAsync(command, timeout = 60000) {
    // Replace docker-compose with docker compose
    command = command
      .replace(/^docker-compose\s/, `"${this.dockerPath}" compose `)
      .replace(/^docker\s/, `"${this.dockerPath}" `);

    return new Promise((resolve, reject) => {
      exec(command, { 
        timeout, 
        env: { 
          ...process.env,
          PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
        }
      }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async findAvailablePort(startPort, endPort = startPort + 100) {
    for (let port = startPort; port <= endPort; port++) {
      try {
        await this.execAsync(`lsof -i :${port}`);
      } catch (error) {
        // If lsof fails, it means the port is available
        return port;
      }
    }
    throw new Error(`No available ports found between ${startPort} and ${endPort}`);
  }

  async isPortInUse(port) {
    try {
      await this.execAsync(`lsof -i :${port}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async findWorkingDockerSocket() {
    // List of possible Docker socket locations
    const possibleSockets = [
      // Docker Desktop locations
      path.join(os.homedir(), '.docker', 'desktop', 'docker.sock'),
      path.join(os.homedir(), '.docker', 'docker.sock'),
      // Traditional Linux socket locations
      '/var/run/docker.sock',
      '/run/docker.sock',
      // WSL2 socket location
      '/mnt/wsl/docker-desktop/docker.sock',
      // Colima socket location (for macOS/Linux)
      path.join(os.homedir(), '.colima', 'docker.sock'),
      // Rancher Desktop socket location
      path.join(os.homedir(), '.rd', 'docker.sock')
    ];

    // Windows pipe
    if (process.platform === 'win32') {
      return '//./pipe/docker_engine';
    }

    // Check environment variable first
    if (process.env.DOCKER_HOST) {
      const match = process.env.DOCKER_HOST.match(/unix:\/\/(.*)/);
      if (match && match[1]) {
        try {
          const docker = new Docker({ socketPath: match[1] });
          await docker.ping();
          console.log('Using Docker socket from DOCKER_HOST:', match[1]);
          return match[1];
        } catch (error) {
          console.log('DOCKER_HOST socket not working:', error.message);
        }
      }
    }

    // Try each socket location
    for (const socketPath of possibleSockets) {
      try {
        if (fs.existsSync(socketPath)) {
          const docker = new Docker({ socketPath });
          await docker.ping();
          console.log('Found working Docker socket at:', socketPath);
          return socketPath;
        }
      } catch (error) {
        console.log('Socket not working at:', socketPath, error.message);
        continue;
      }
    }

    throw new Error('No working Docker socket found');
  }

  initializeDockerClient() {
    try {
      // For Windows, always use the named pipe
      if (process.platform === 'win32') {
        return new Docker({ socketPath: '//./pipe/docker_engine' });
      }

      // For other platforms, try to find a working socket synchronously
      const socketPaths = [
        process.env.DOCKER_HOST ? process.env.DOCKER_HOST.replace('unix://', '') : null,
        path.join(os.homedir(), '.docker', 'desktop', 'docker.sock'),
        path.join(os.homedir(), '.docker', 'docker.sock'),
        '/var/run/docker.sock',
        '/run/docker.sock',
        '/mnt/wsl/docker-desktop/docker.sock',
        path.join(os.homedir(), '.colima', 'docker.sock'),
        path.join(os.homedir(), '.rd', 'docker.sock')
      ].filter(Boolean);

      for (const socketPath of socketPaths) {
        if (fs.existsSync(socketPath)) {
          try {
            return new Docker({ socketPath });
          } catch (error) {
            console.log(`Failed to initialize Docker with socket ${socketPath}:`, error.message);
          }
        }
      }

      // If no socket works, fall back to default
      return new Docker({ socketPath: '/var/run/docker.sock' });
    } catch (error) {
      console.error('Error initializing Docker client:', error);
      // Return a default client - the isDockerRunning check will handle the error case
      return new Docker({ socketPath: '/var/run/docker.sock' });
    }
  }

  async isDockerRunning() {
    try {
      // If current client isn't working, try to find a working socket
      try {
        await this.docker.ping();
        return true;
      } catch (error) {
        // Current socket not working, try to find a working one
        const workingSocket = await this.findWorkingDockerSocket();
        this.docker = new Docker({ socketPath: workingSocket });
        await this.docker.ping();
        return true;
      }
    } catch (error) {
      console.error('Docker is not running or not accessible:', error.message);
      return false;
    }
  }

  async createNetwork() {
    try {
      // First check if the network already exists
      const networks = await this.docker.listNetworks();
      const networkExists = networks.some(network => network.Name === 'clara_network');
      
      if (networkExists) {
        console.log('Network clara_network already exists, skipping creation');
        return;
      }
      
      // Create the network if it doesn't exist
      try {
        await this.docker.createNetwork({
          Name: 'clara_network',
          Driver: 'bridge'
        });
        console.log('Successfully created clara_network');
      } catch (error) {
        // Special handling for conflict error (network created between our check and creation)
        if (error.statusCode === 409) {
          console.log('Network already exists (409 error), continuing...');
          return;
        }
        
        // Log details for other errors to help troubleshooting
        console.error('Error creating network:', error.message);
        console.error('Error details:', error);
        
        // For Mac-specific issues, provide more guidance
        if (process.platform === 'darwin') {
          console.log('On macOS, make sure Docker Desktop is running and properly configured');
          console.log('Try restarting Docker Desktop if issues persist');
        }
        
        throw new Error(`Failed to create network: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in createNetwork:', error.message);
      // Don't throw here to allow the application to continue even if network creation fails
      // We'll let containers attempt to connect, which might work if the network exists but we failed to detect it
    }
  }

  async pullImage(imageName, statusCallback) {
    // Use the new architecture-aware pull method
    return this.pullImageWithProgress(imageName, statusCallback);
  }

  async startContainer(config) {
    try {
      // Check if container exists and is running
      try {
        const existingContainer = await this.docker.getContainer(config.name);
        const containerInfo = await existingContainer.inspect();
        
        if (containerInfo.State.Running) {
          console.log(`Container ${config.name} is already running, checking health...`);
          
          // Check if the running container is healthy
          const isHealthy = await config.healthCheck();
          if (isHealthy) {
            console.log(`Container ${config.name} is running and healthy, skipping recreation`);
            return;
          }
          
          console.log(`Container ${config.name} is running but not healthy, will recreate`);
          await existingContainer.stop();
          await existingContainer.remove({ force: true });
        } else {
          console.log(`Container ${config.name} exists but is not running, will recreate`);
          await existingContainer.remove({ force: true });
        }
      } catch (error) {
        if (error.statusCode !== 404) {
          console.error(`Error checking container ${config.name}:`, error);
        } else {
          console.log(`No existing container ${config.name}, will create new one`);
        }
      }

      // First ensure we have the image
      try {
        await this.docker.getImage(config.image).inspect();
      } catch (error) {
        if (error.statusCode === 404) {
          console.log(`Image ${config.image} not found locally, pulling for ${this.systemArch}...`);
          await this.pullImageWithProgress(config.image, (status) => console.log(status));
        } else {
          throw error;
        }
      }

      console.log(`Creating container ${config.name} with port mapping ${config.internalPort} -> ${config.port}`);
      
      // Create and start container
      const containerConfig = {
        Image: config.image,
        name: config.name,
        ExposedPorts: {
          [`${config.internalPort}/tcp`]: {}
        },
        HostConfig: {
          PortBindings: {
            [`${config.internalPort}/tcp`]: [{ HostPort: config.port.toString() }]
          },
          Binds: config.volumes,
          NetworkMode: 'clara_network'
        },
        Env: [
          'PYTHONUNBUFFERED=1',
          'OLLAMA_BASE_URL=http://clara_ollama:11434'
        ]
      };

      const newContainer = await this.docker.createContainer(containerConfig);
      console.log(`Container ${config.name} created, starting...`);
      await newContainer.start();
      console.log(`Container ${config.name} started, waiting for health check...`);

      // Initial delay to give the container time to fully start
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Wait for health check
      let healthy = false;
      for (let i = 0; i < 5; i++) {
        console.log(`Health check attempt ${i + 1} for ${config.name}...`);
        try {
          healthy = await config.healthCheck();
          console.log(`Health check result for ${config.name}: ${healthy}`);
          if (healthy) break;
        } catch (error) {
          console.error(`Health check error for ${config.name}:`, error);
        }
        // Increased delay between attempts to 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      if (!healthy) {
        // Get container logs to help diagnose the issue
        const container = await this.docker.getContainer(config.name);
        const logs = await container.logs({
          stdout: true,
          stderr: true,
          tail: 50
        });
        console.error(`Container logs for ${config.name}:`, logs.toString());
        throw new Error(`Container ${config.name} failed health check after 5 attempts`);
      }
    } catch (error) {
      console.error(`Error starting ${config.name}:`, error);
      throw error;
    }
  }

  async initializePullTimestamps() {
    try {
      if (!fs.existsSync(this.pullTimestampsPath)) {
        const initialTimestamps = {};
        Object.keys(this.containers).forEach(key => {
          initialTimestamps[this.containers[key].image] = 0;
        });
        fs.writeFileSync(this.pullTimestampsPath, JSON.stringify(initialTimestamps, null, 2));
      }
    } catch (error) {
      console.error('Error initializing pull timestamps:', error);
    }
  }

  getPullTimestamps() {
    try {
      if (fs.existsSync(this.pullTimestampsPath)) {
        return JSON.parse(fs.readFileSync(this.pullTimestampsPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error reading pull timestamps:', error);
    }
    return {};
  }

  updatePullTimestamp(imageName) {
    try {
      const timestamps = this.getPullTimestamps();
      timestamps[imageName] = Date.now();
      fs.writeFileSync(this.pullTimestampsPath, JSON.stringify(timestamps, null, 2));
    } catch (error) {
      console.error('Error updating pull timestamp:', error);
    }
  }

  async checkImageUpdate(imageName) {
    try {
      // First try to inspect the local image
      try {
        await this.docker.getImage(imageName).inspect();
      } catch (error) {
        // If image doesn't exist locally, we need to pull it
        if (error.statusCode === 404) {
          return true;
        }
      }

      // Try to pull the image to check for updates
      return new Promise((resolve, reject) => {
        this.docker.pull(imageName, (err, stream) => {
          if (err) {
            // If we can't pull, but have local image, use local
            if (err.statusCode === 404) {
              resolve(false);
              return;
            }
            reject(err);
            return;
          }

          let needsUpdate = false;
          
          stream.on('data', (data) => {
            const lines = data.toString().split('\n').filter(Boolean);
            lines.forEach(line => {
              try {
                const parsed = JSON.parse(line);
                // Check for "up to date" message
                if (parsed.status && parsed.status.includes('up to date')) {
                  needsUpdate = false;
                }
                // Check for "downloading" or "extracting" which indicates an update
                if (parsed.status && (parsed.status.includes('Downloading') || parsed.status.includes('Extracting'))) {
                  needsUpdate = true;
                }
              } catch (e) {
                // Ignore parse errors
              }
            });
          });

          stream.on('end', () => {
            resolve(needsUpdate);
          });

          stream.on('error', (error) => {
            console.error('Stream error during pull:', error);
            resolve(true); // If we can't determine, assume update needed
          });
        });
      });
    } catch (error) {
      console.error('Error checking image update:', error);
      return true; // If we can't determine, assume update needed
    }
  }

  shouldPullImage(imageName, forceCheck = false) {
    try {
      if (forceCheck) {
        return this.checkImageUpdate(imageName);
      }

      const timestamps = this.getPullTimestamps();
      const lastPull = timestamps[imageName] || 0;
      const daysSinceLastPull = (Date.now() - lastPull) / (1000 * 60 * 60 * 24);
      return daysSinceLastPull >= 10;
    } catch (error) {
      console.error('Error checking pull timestamp:', error);
      return true; // Pull if there's an error reading timestamps
    }
  }

  async setup(statusCallback, forceUpdateCheck = false) {
    try {
      if (!await this.isDockerRunning()) {
        let dockerDownloadLink;
        let installMessage;
        switch (process.platform) {
          case 'darwin':
            dockerDownloadLink = 'https://desktop.docker.com/mac/main/arm64/Docker.dmg';
            installMessage = 'download Docker Desktop';
            break;
          case 'win32':
            dockerDownloadLink = 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe';
            installMessage = 'download Docker Desktop';
            break;
          case 'linux':
          default:
            dockerDownloadLink = 'https://docs.docker.com/engine/install/';
            installMessage = 'install Docker Engine';
            break;
        }
        const errorMessage = `Docker is not running. Please ${installMessage} for better experience with workflows and automation.\n\nDownload from: ${dockerDownloadLink}`;
        statusCallback(errorMessage, 'warning');
        
        // Return false but don't throw error - let the app continue without Docker
        return false;
      }

      statusCallback('Creating Docker network...');
      await this.createNetwork();

      // Check if Ollama is running on the system (no container management)
      const ollamaRunning = await this.checkOllamaAvailability();
      if (ollamaRunning) {
        statusCallback('✓ Ollama detected and available at http://localhost:11434', 'success');
      } else {
        statusCallback('⚠️ Ollama not detected. Please install Ollama manually if you want local AI models. Visit: https://ollama.com', 'warning');
      }

      // Check for container updates
      statusCallback(`Checking for container updates (${this.systemArch})...`);
      const updateChecks = [];
      
      for (const [name, config] of Object.entries(this.containers)) {
        updateChecks.push(
          this.checkForImageUpdates(config.image, statusCallback)
            .then(result => ({ ...result, containerName: name }))
        );
      }

      const updateResults = await Promise.all(updateChecks);
      const updatesAvailable = updateResults.filter(result => result.hasUpdate);

      if (updatesAvailable.length > 0) {
        statusCallback(`Found ${updatesAvailable.length} container update(s) available`);
        
        // Show update dialog
        const updateChoice = await this.showUpdateDialog(updateResults);
        
        if (updateChoice.cancel) {
          statusCallback('Setup cancelled by user', 'warning');
          return false;
        }
        
        if (updateChoice.updateAll) {
          statusCallback('Updating containers...');
          
          // Pull updated images
          for (const update of updateChoice.updates) {
            try {
              await this.pullImageWithProgress(update.imageName, statusCallback);
            } catch (error) {
              statusCallback(`Failed to update ${update.imageName}: ${error.message}`, 'warning');
              console.error('Update error:', error);
            }
          }
        } else if (updateChoice.skip) {
          statusCallback('Skipping container updates');
        }
      } else {
        statusCallback('All containers are up to date');
      }

      // Ensure all images are available locally
      for (const [name, config] of Object.entries(this.containers)) {
        try {
          await this.docker.getImage(config.image).inspect();
          statusCallback(`✓ ${name} image ready`);
        } catch (error) {
          if (error.statusCode === 404) {
            statusCallback(`Downloading ${name} image...`);
            await this.pullImageWithProgress(config.image, statusCallback);
          } else {
            throw error;
          }
        }
      }

      // Start containers in sequence
      for (const [name, config] of Object.entries(this.containers)) {
        statusCallback(`Starting ${name} service...`);
        await this.startContainer(config);
      }

      statusCallback('All services started successfully');
      return true;
    } catch (error) {
      statusCallback(`Setup failed: ${error.message}`, 'error');
      // Return false instead of throwing to allow app to continue
      return false;
    }
  }

  async stop() {
    try {
      for (const [name, config] of Object.entries(this.containers)) {
        try {
          const container = await this.docker.getContainer(config.name);
          await container.stop();
          await container.remove();
        } catch (error) {
          // Ignore errors if container doesn't exist
        }
      }

      // Clean up network
      try {
        const network = await this.docker.getNetwork('clara_network');
        await network.remove();
      } catch (error) {
        // Ignore network removal errors
      }
    } catch (error) {
      console.error('Error stopping services:', error);
      throw error;
    }
  }

  async isPythonRunning() {
    try {
      if (!this.ports.python) {
        console.log('Python port not set');
        return false;
      }

      console.log(`Checking Python health at http://localhost:${this.ports.python}/health`);
      
      const response = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${this.ports.python}/health`, (res) => {
          console.log(`Python health check status code: ${res.statusCode}`);
          
          if (res.statusCode === 200) {
            let data = '';
            res.on('data', chunk => {
              data += chunk;
            });
            res.on('end', () => {
              console.log('Python health check response:', data);
              try {
                const jsonResponse = JSON.parse(data);
                const isHealthy = jsonResponse.status === 'healthy' || jsonResponse.status === 'ok';
                console.log(`Python health parsed result: ${isHealthy}`);
                resolve(isHealthy);
              } catch (e) {
                console.error('Failed to parse health check JSON:', e);
                resolve(false);
              }
            });
          } else {
            reject(new Error(`Python health check failed with status ${res.statusCode}`));
          }
        });

        req.on('error', (error) => {
          console.error('Python health check request error:', error);
          resolve(false);
        });

        req.setTimeout(5000, () => {
          console.error('Python health check timeout');
          req.destroy();
          resolve(false);
        });
      });

      return response;
    } catch (error) {
      console.error('Python health check error:', error);
      return false;
    }
  }

  async checkN8NHealth() {
    try {
      const response = await new Promise((resolve, reject) => {
        http.get(`http://localhost:${this.ports.n8n}/healthz`, (res) => {
          if (res.statusCode === 200) {
            resolve({ success: true });
          } else {
            reject(new Error(`N8N health check failed with status ${res.statusCode}`));
          }
        }).on('error', (error) => reject(error));
      });
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkOllamaAvailability() {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:11434/api/tags', (res) => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        
        req.on('error', () => resolve(false));
        
        // Add timeout to avoid hanging
        req.setTimeout(3000, () => {
          req.destroy();
          resolve(false);
        });
      });
      
      return response;
    } catch (error) {
      return false;
    }
  }

  /**
   * Manual update check that can be called from the main process
   */
  async checkForUpdates(statusCallback) {
    try {
      if (!await this.isDockerRunning()) {
        throw new Error('Docker is not running');
      }

      statusCallback(`Checking for container updates (${this.systemArch})...`);
      const updateChecks = [];
      
      for (const [name, config] of Object.entries(this.containers)) {
        updateChecks.push(
          this.checkForImageUpdates(config.image, statusCallback)
            .then(result => ({ ...result, containerName: name }))
        );
      }

      const updateResults = await Promise.all(updateChecks);
      const updatesAvailable = updateResults.filter(result => result.hasUpdate);

      return {
        updatesAvailable: updatesAvailable.length > 0,
        updates: updateResults,
        architecture: this.systemArch
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw error;
    }
  }

  /**
   * Update specific containers
   */
  async updateContainers(containerNames, statusCallback) {
    try {
      if (!await this.isDockerRunning()) {
        throw new Error('Docker is not running');
      }

      const containersToUpdate = containerNames || Object.keys(this.containers);
      const results = [];

      for (const containerName of containersToUpdate) {
        const config = this.containers[containerName];
        if (!config) {
          results.push({
            container: containerName,
            success: false,
            error: 'Container not found'
          });
          continue;
        }

        try {
          statusCallback(`Updating ${containerName}...`);
          
          // Stop and remove existing container
          try {
            const existingContainer = await this.docker.getContainer(config.name);
            const containerInfo = await existingContainer.inspect();
            
            if (containerInfo.State.Running) {
              await existingContainer.stop();
            }
            await existingContainer.remove({ force: true });
            statusCallback(`Stopped and removed old ${containerName} container`);
          } catch (error) {
            // Container might not exist, which is fine
            if (error.statusCode !== 404) {
              console.warn(`Warning removing old container ${config.name}:`, error.message);
            }
          }

          // Pull latest image
          await this.pullImageWithProgress(config.image, statusCallback);
          
          // Start new container
          await this.startContainer(config);
          
          results.push({
            container: containerName,
            success: true,
            message: `Successfully updated ${containerName}`
          });
          
          statusCallback(`✓ ${containerName} updated successfully`);
        } catch (error) {
          results.push({
            container: containerName,
            success: false,
            error: error.message
          });
          statusCallback(`✗ Failed to update ${containerName}: ${error.message}`, 'error');
        }
      }

      return results;
    } catch (error) {
      console.error('Error updating containers:', error);
      throw error;
    }
  }
}

module.exports = DockerSetup; 
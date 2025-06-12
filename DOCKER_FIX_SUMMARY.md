# Docker Socket Fix for ClaraVerse

## Problem
ClaraVerse UI was showing "Docker Not Available" despite Docker Desktop being installed and running. The troubleshooting script confirmed Docker was working from command line.

## Root Cause
Docker Desktop on macOS was using the socket path `/Users/[username]/.docker/run/docker.sock`, but ClaraVerse was only checking for:
- `/Users/[username]/.docker/desktop/docker.sock`
- `/Users/[username]/.docker/docker.sock`
- `/var/run/docker.sock`
- Other paths, but missing the `/run/` subdirectory

## Solution
Added the missing socket path to both socket detection methods in `electron/dockerSetup.cjs`:

1. **`findWorkingDockerSocket()` method** - Used by `isDockerRunning()`
2. **`initializeDockerClient()` method** - Used during Docker client initialization

Updated socket search order to prioritize the new path:
```javascript
const possibleSockets = [
  path.join(os.homedir(), '.docker', 'run', 'docker.sock'),     // ← ADDED
  path.join(os.homedir(), '.docker', 'desktop', 'docker.sock'),
  path.join(os.homedir(), '.docker', 'docker.sock'),
  // ... other paths
];
```

## Files Modified
- `electron/dockerSetup.cjs` - Added missing socket path to both detection methods
- `troubleshoot/dockertroubleshoot.sh` - Updated socket paths for future troubleshooting

## Verification
The fix was tested and confirmed working:
- Docker detection now returns `dockerAvailable: true`
- Socket connection successful
- ClaraVerse UI should now show Docker as "Available" instead of "Not Available"

## Testing
You can verify the fix by running ClaraVerse and checking the Services tab in Settings. Docker should now show as "Available" with a green indicator instead of the previous "Docker Not Available" error message.

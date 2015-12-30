self.addEventListener('message', function(e) {
    var data = e.data;
    switch (data.cmd) {
        case 'start':
            self.postMessage('WORKER STARTED');
            break;
        case 'cleanup_inactive_sessions':
            self.postMessage('cleanup_inactive_sessions');
            break;
        case 'stop':
        self.postMessage('WORKER STOPPED');
            self.close(); // Terminates the worker.
            break;
        default:
            self.postMessage('Unknown command: ' + data);
    };
}, false);
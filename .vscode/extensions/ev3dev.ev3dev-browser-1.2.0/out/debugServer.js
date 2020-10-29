"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_debugadapter_1 = require("vscode-debugadapter");
const THREAD_ID = 0;
class Ev3devBrowserDebugSession extends vscode_debugadapter_1.DebugSession {
    initializeRequest(response, args) {
        if (response.body) {
            response.body.supportTerminateDebuggee = true;
        }
        this.sendResponse(response);
    }
    launchRequest(response, args) {
        this.sendEvent(new vscode_debugadapter_1.Event('ev3devBrowser.debugger.launch', args));
        this.sendResponse(response);
        this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
    }
    customRequest(command, response, args) {
        switch (command) {
            case 'ev3devBrowser.debugger.thread':
                this.sendEvent(new vscode_debugadapter_1.ThreadEvent(args, THREAD_ID));
                this.sendResponse(response);
                break;
            case 'ev3devBrowser.debugger.terminate':
                this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
                this.sendResponse(response);
                break;
        }
    }
    disconnectRequest(response, args) {
        this.sendEvent(new vscode_debugadapter_1.Event('ev3devBrowser.debugger.stop', args));
        this.sendResponse(response);
    }
    threadsRequest(response) {
        response.body = {
            threads: [
                new vscode_debugadapter_1.Thread(THREAD_ID, 'thread')
            ]
        };
        this.sendResponse(response);
    }
    pauseRequest(response, args) {
        this.sendEvent(new vscode_debugadapter_1.Event('ev3devBrowser.debugger.interrupt', args));
        this.sendResponse(response);
    }
}
exports.Ev3devBrowserDebugSession = Ev3devBrowserDebugSession;
if (require.main === module) {
    vscode_debugadapter_1.DebugSession.run(Ev3devBrowserDebugSession);
}
//# sourceMappingURL=debugServer.js.map
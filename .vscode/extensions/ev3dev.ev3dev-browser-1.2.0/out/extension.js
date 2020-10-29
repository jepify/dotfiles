"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const temp = require("temp");
const vscode = require("vscode");
const debugServer_1 = require("./debugServer");
const device_1 = require("./device");
const utils_1 = require("./utils");
// fs.constants.S_IXUSR is undefined on win32!
const S_IXUSR = 0o0100;
let config;
let output;
let resourceDir;
let ev3devBrowserProvider;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    config = new WorkspaceConfig(context.workspaceState);
    output = vscode.window.createOutputChannel('ev3dev');
    resourceDir = context.asAbsolutePath('resources');
    ev3devBrowserProvider = new Ev3devBrowserProvider();
    const factory = new Ev3devDebugAdapterDescriptorFactory();
    const provider = new Ev3devDebugConfigurationProvider();
    context.subscriptions.push(output, ev3devBrowserProvider, vscode.window.registerTreeDataProvider('ev3devBrowser', ev3devBrowserProvider), vscode.commands.registerCommand('ev3devBrowser.deviceTreeItem.openSshTerminal', d => d.openSshTerminal()), vscode.commands.registerCommand('ev3devBrowser.deviceTreeItem.captureScreenshot', d => d.captureScreenshot()), vscode.commands.registerCommand('ev3devBrowser.deviceTreeItem.showSysinfo', d => d.showSysinfo()), vscode.commands.registerCommand('ev3devBrowser.deviceTreeItem.reconnect', d => d.connect()), vscode.commands.registerCommand('ev3devBrowser.deviceTreeItem.connectNew', d => pickDevice()), vscode.commands.registerCommand('ev3devBrowser.deviceTreeItem.disconnect', d => d.disconnect()), vscode.commands.registerCommand('ev3devBrowser.deviceTreeItem.select', d => d.handleClick()), vscode.commands.registerCommand('ev3devBrowser.fileTreeItem.run', f => f.run()), vscode.commands.registerCommand('ev3devBrowser.fileTreeItem.runInTerminal', f => f.runInTerminal()), vscode.commands.registerCommand('ev3devBrowser.fileTreeItem.delete', f => f.delete()), vscode.commands.registerCommand('ev3devBrowser.fileTreeItem.showInfo', f => f.showInfo()), vscode.commands.registerCommand('ev3devBrowser.fileTreeItem.upload', f => f.upload()), vscode.commands.registerCommand('ev3devBrowser.fileTreeItem.select', f => f.handleClick()), vscode.commands.registerCommand('ev3devBrowser.action.pickDevice', () => pickDevice()), vscode.commands.registerCommand('ev3devBrowser.action.download', () => downloadAll()), vscode.commands.registerCommand('ev3devBrowser.action.refresh', () => refresh()), vscode.debug.onDidReceiveDebugSessionCustomEvent(e => handleCustomDebugEvent(e)), vscode.debug.registerDebugAdapterDescriptorFactory('ev3devBrowser', factory), vscode.debug.registerDebugConfigurationProvider('ev3devBrowser', provider));
}
exports.activate = activate;
class Ev3devDebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(session, executable) {
        if (!this.server) {
            // start listening on a random port
            this.server = net.createServer(socket => {
                const session = new debugServer_1.Ev3devBrowserDebugSession();
                session.setRunAsServer(true);
                session.start(socket, socket);
            }).listen(0);
        }
        // make VS Code connect to debug server
        return new vscode.DebugAdapterServer(this.server.address().port);
    }
    dispose() {
        var _a;
        (_a = this.server) === null || _a === void 0 ? void 0 : _a.close();
    }
}
class Ev3devDebugConfigurationProvider {
    resolveDebugConfiguration(_folder, debugConfiguration, token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Object.keys(debugConfiguration).length === 0) {
                const items = [
                    {
                        label: "Download and run current file",
                        description: "in interactive terminal",
                        interactiveTerminal: true,
                    },
                    {
                        label: "Download and run current file",
                        description: "in output pane",
                        interactiveTerminal: false,
                    },
                ];
                const selected = yield vscode.window.showQuickPick(items, {
                    matchOnDescription: true,
                    ignoreFocusOut: true,
                    placeHolder: "Debug configuration"
                }, token);
                if (selected) {
                    return {
                        type: "ev3devBrowser",
                        name: `${selected.label} ${selected.description}`,
                        request: "launch",
                        program: "/home/robot/${workspaceFolderBasename}/${relativeFile}",
                        interactiveTerminal: selected.interactiveTerminal
                    };
                }
            }
            return debugConfiguration;
        });
    }
}
// this method is called when your extension is deactivated
function deactivate() {
    // The "temp" module should clean up automatically, but do this just in case.
    temp.cleanupSync();
}
exports.deactivate = deactivate;
function pickDevice() {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield device_1.Device.pickDevice();
        if (!device) {
            // user canceled
            return;
        }
        yield vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Connecting..."
        }, (progress) => __awaiter(this, void 0, void 0, function* () {
            ev3devBrowserProvider.setDevice(device);
            try {
                yield device.connect();
                utils_1.toastStatusBarMessage(`Connected`);
            }
            catch (err) {
                const troubleshoot = 'Troubleshoot';
                vscode.window.showErrorMessage(`Failed to connect to ${device.name}: ${err.message}`, troubleshoot)
                    .then((value) => {
                    if (value === troubleshoot) {
                        const wiki = vscode.Uri.parse('https://github.com/ev3dev/vscode-ev3dev-browser/wiki/Troubleshooting');
                        vscode.commands.executeCommand('vscode.open', wiki);
                    }
                });
            }
        }));
    });
}
const activeDebugSessions = new Set();
let debugTerminal;
let debugRestarting;
function handleCustomDebugEvent(event) {
    return __awaiter(this, void 0, void 0, function* () {
        let device;
        switch (event.event) {
            case 'ev3devBrowser.debugger.launch':
                const args = event.body;
                device = yield ev3devBrowserProvider.getDevice();
                if (device && !device.isConnected) {
                    const item = ev3devBrowserProvider.getDeviceTreeItem();
                    if (item) {
                        yield item.connect();
                    }
                }
                if (!device || !device.isConnected) {
                    yield event.session.customRequest('ev3devBrowser.debugger.terminate');
                    break;
                }
                // optionally download before running - workspaceFolder can be undefined
                // if the request did not come from a specific project, in which case we
                // download all projects
                const folder = event.session.workspaceFolder;
                if (args.download !== false && !(folder ? yield download(folder, device) : yield downloadAll())) {
                    // download() shows error messages, so don't show additional message here.
                    yield event.session.customRequest('ev3devBrowser.debugger.terminate');
                    break;
                }
                // run the program
                try {
                    const dirname = path.posix.dirname(args.program);
                    if (args.interactiveTerminal) {
                        const command = `brickrun -r --directory="${dirname}" "${args.program}"`;
                        const config = vscode.workspace.getConfiguration(`terminal.integrated.env.${utils_1.getPlatform()}`);
                        const termEnv = config.get('TERM');
                        const env = Object.assign(Object.assign({}, vscode.workspace.getConfiguration('ev3devBrowser').get('env')), vscode.workspace.getConfiguration('ev3devBrowser').get('interactiveTerminal.env'));
                        const ch = yield device.exec(command, env, { term: termEnv || process.env['TERM'] || 'xterm-256color' });
                        const writeEmitter = new vscode.EventEmitter();
                        ch.stdout.on('data', (data) => writeEmitter.fire(String(data)));
                        ch.stderr.on('data', (data) => writeEmitter.fire(String(data)));
                        if (debugTerminal) {
                            debugTerminal.dispose();
                        }
                        debugTerminal = vscode.window.createTerminal({
                            name: `${path.posix.basename(args.program)} on ${device.name}`,
                            pty: {
                                onDidWrite: writeEmitter.event,
                                open: (dim) => {
                                    if (dim !== undefined) {
                                        ch.setWindow(dim.rows, dim.columns, 0, 0);
                                    }
                                    writeEmitter.fire(`Starting: ${command}\r\n`);
                                    writeEmitter.fire('----------\r\n');
                                },
                                close: () => {
                                    ch.close();
                                    activeDebugSessions.delete(event.session.id);
                                },
                                handleInput: (data) => {
                                    ch.stdin.write(data);
                                },
                                setDimensions: (dim) => {
                                    ch.setWindow(dim.rows, dim.columns, 0, 0);
                                },
                            },
                        });
                        ch.on('close', () => {
                            if (debugRestarting) {
                                activeDebugSessions.add(event.session.id);
                                event.session.customRequest('ev3devBrowser.debugger.thread', 'started');
                                debugRestarting = false;
                            }
                            else {
                                event.session.customRequest('ev3devBrowser.debugger.terminate');
                            }
                            ch.destroy();
                        });
                        ch.on('exit', (code, signal, coreDump, desc) => {
                            writeEmitter.fire('----------\r\n');
                            if (code === 0) {
                                writeEmitter.fire('Completed successfully.\r\n');
                            }
                            else if (code) {
                                writeEmitter.fire(`Exited with error code ${code}.\r\n`);
                            }
                            else {
                                writeEmitter.fire(`Exited with signal ${signal}.\r\n`);
                            }
                            activeDebugSessions.delete(event.session.id);
                        });
                        ch.on('error', (err) => {
                            vscode.window.showErrorMessage(`Connection error: ${err || err.message}`);
                            debugTerminal.dispose();
                            ch.destroy();
                        });
                        debugTerminal.show();
                        event.session.customRequest('ev3devBrowser.debugger.thread', 'started');
                    }
                    else {
                        const command = `brickrun --directory="${dirname}" "${args.program}"`;
                        output.show(true);
                        output.clear();
                        output.appendLine(`Starting: ${command}`);
                        const env = vscode.workspace.getConfiguration('ev3devBrowser').get('env');
                        const channel = yield device.exec(command, env);
                        channel.on('close', () => {
                            if (debugRestarting) {
                                activeDebugSessions.add(event.session.id);
                                output.clear();
                                output.appendLine(`Restarting: ${command}`);
                                output.appendLine('----------');
                                event.session.customRequest('ev3devBrowser.debugger.thread', 'started');
                                debugRestarting = false;
                            }
                            else {
                                event.session.customRequest('ev3devBrowser.debugger.terminate');
                            }
                        });
                        channel.on('exit', (code, signal, coreDump, desc) => {
                            if (!debugRestarting) {
                                output.appendLine('----------');
                                if (code === 0) {
                                    output.appendLine('Completed successfully.');
                                }
                                else if (code) {
                                    output.appendLine(`Exited with error code ${code}.`);
                                }
                                else {
                                    output.appendLine(`Exited with signal ${signal}.`);
                                }
                                activeDebugSessions.delete(event.session.id);
                            }
                        });
                        channel.on('data', (chunk) => {
                            output.append(chunk.toString());
                        });
                        channel.stderr.on('data', (chunk) => {
                            output.append(chunk.toString());
                        });
                        output.appendLine('----------');
                        event.session.customRequest('ev3devBrowser.debugger.thread', 'started');
                    }
                    activeDebugSessions.add(event.session.id);
                }
                catch (err) {
                    yield event.session.customRequest('ev3devBrowser.debugger.terminate');
                    vscode.window.showErrorMessage(`Failed to run file: ${err.message}`);
                }
                break;
            case 'ev3devBrowser.debugger.stop':
                debugRestarting = event.body.restart;
                device = ev3devBrowserProvider.getDeviceSync();
                if (activeDebugSessions.has(event.session.id) && device && device.isConnected) {
                    device.exec('conrun-kill --signal=SIGKILL --group');
                }
                // update remote file browser in case program created new files
                refresh();
                break;
            case 'ev3devBrowser.debugger.interrupt':
                device = ev3devBrowserProvider.getDeviceSync();
                if (activeDebugSessions.has(event.session.id) && device && device.isConnected) {
                    device.exec('conrun-kill --signal=SIGINT');
                }
                // update remote file browser in case program created new files
                refresh();
                break;
        }
    });
}
/**
 * Download all workspace folders to the device.
 *
 * @return Promise of true on success, otherwise false.
 */
function downloadAll() {
    return __awaiter(this, void 0, void 0, function* () {
        let device = yield ev3devBrowserProvider.getDevice();
        if (!device) {
            // get device will have shown an error message, so we don't need another here
            return false;
        }
        if (!device.isConnected) {
            vscode.window.showErrorMessage('Device is not connected.');
            return false;
        }
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('Must have a folder open to send files to device.');
            return false;
        }
        yield vscode.workspace.saveAll();
        for (const localFolder of vscode.workspace.workspaceFolders) {
            if (!(yield download(localFolder, device))) {
                return false;
            }
        }
        return true;
    });
}
/**
 * Download workspace folder to the device.
 *
 * @param folder The folder.
 * @param device The device.
 * @return Promise of true on success, otherwise false.
 */
function download(folder, device) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = vscode.workspace.getConfiguration('ev3devBrowser.download', folder.uri);
        const includeFiles = new vscode.RelativePattern(folder, config.get('include', ''));
        const excludeFiles = new vscode.RelativePattern(folder, config.get('exclude', ''));
        const projectDir = config.get('directory') || path.basename(folder.uri.fsPath);
        const remoteBaseDir = path.posix.join(device.homeDirectoryPath, projectDir);
        const deviceName = device.name;
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Sending',
            cancellable: true,
        }, (progress, token) => __awaiter(this, void 0, void 0, function* () {
            try {
                const files = yield vscode.workspace.findFiles(includeFiles, excludeFiles);
                // If there are no files matching the given include and exclude patterns,
                // let the user know about it.
                if (!files.length) {
                    const msg = 'No files selected for download. Please check the ev3devBrowser.download.include and ev3devBrowser.download.exclude settings.';
                    // try to make it easy for the user to fix the problem by offering to
                    // open the settings editor
                    const openSettings = 'Open Settings';
                    vscode.window.showErrorMessage(msg, openSettings).then(result => {
                        if (result === openSettings) {
                            vscode.commands.executeCommand('workbench.action.openSettings2');
                        }
                    });
                    // "cancel" the download
                    return false;
                }
                const increment = 100 / files.length;
                let fileIndex = 1;
                const reportProgress = (message) => progress.report({ message: message });
                for (const f of files) {
                    if (token.isCancellationRequested) {
                        ev3devBrowserProvider.fireDeviceChanged();
                        return false;
                    }
                    const relativePath = vscode.workspace.asRelativePath(f, false);
                    const baseProgressMessage = `(${fileIndex}/${files.length}) ${relativePath}`;
                    reportProgress(baseProgressMessage);
                    const basename = path.basename(f.fsPath);
                    let relativeDir = path.dirname(relativePath);
                    if (path === path.win32) {
                        relativeDir = relativeDir.replace(path.win32.sep, path.posix.sep);
                    }
                    const remoteDir = path.posix.join(remoteBaseDir, relativeDir);
                    const remotePath = path.posix.resolve(remoteDir, basename);
                    // File permission handling:
                    // - If the file starts with a shebang, then assume it should be
                    //   executable.
                    // - Otherwise use the existing file permissions. On Windows
                    //   we also check for ELF file format to know if a file
                    //   should be executable since Windows doesn't know about
                    //   POSIX file permissions.
                    let mode;
                    if (yield utils_1.verifyFileHeader(f.fsPath, new Buffer('#!/'))) {
                        mode = '755';
                    }
                    else {
                        const stat = fs.statSync(f.fsPath);
                        if (process.platform === 'win32') {
                            // fs.stat() on win32 return something like '100666'
                            // See https://github.com/joyent/libuv/blob/master/src/win/fs.c
                            // and search for `st_mode`
                            // So, we check to see the file uses ELF format, if
                            // so, make it executable.
                            if (yield utils_1.verifyFileHeader(f.fsPath, new Buffer('\x7fELF'))) {
                                stat.mode |= S_IXUSR;
                            }
                        }
                        mode = stat.mode.toString(8);
                    }
                    // make sure the directory exists
                    if (!device) {
                        throw new Error("Lost connection");
                    }
                    yield device.mkdir_p(remoteDir);
                    // then we can copy the file
                    yield device.put(f.fsPath, remotePath, mode, percentage => reportProgress(`${baseProgressMessage} - ${percentage}%`));
                    fileIndex++;
                    progress.report({ increment: increment });
                }
                // make sure any new files show up in the browser
                ev3devBrowserProvider.fireDeviceChanged();
                vscode.window.showInformationMessage(`Download to ${deviceName} complete`);
            }
            catch (err) {
                vscode.window.showErrorMessage(`Error sending file: ${err.message}`);
                return false;
            }
            return true;
        }));
    });
}
function refresh() {
    ev3devBrowserProvider.fireDeviceChanged();
}
class Ev3devBrowserProvider extends vscode.Disposable {
    constructor() {
        super(() => {
            this.setDevice(undefined);
        });
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.noDeviceTreeItem = new CommandTreeItem('Click here to connect to a device', 'ev3devBrowser.action.pickDevice');
    }
    setDevice(device) {
        if ((this.device && this.device.device) === device) {
            return;
        }
        if (this.device) {
            this.device.device.disconnect();
            this.device = undefined;
        }
        if (device) {
            this.device = new DeviceTreeItem(device);
        }
        this.fireDeviceChanged();
    }
    /**
     * Gets the current device.
     *
     * Will prompt the user to select a device if there is not one already connected
     */
    getDevice() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.device) {
                const connectNow = 'Connect Now';
                const result = yield vscode.window.showErrorMessage('No ev3dev device is connected.', connectNow);
                if (result === connectNow) {
                    yield pickDevice();
                }
            }
            return this.device && this.device.device;
        });
    }
    /**
     * Gets the current device or undefined if no device is connected.
     */
    getDeviceSync() {
        return this.device && this.device.device;
    }
    getDeviceTreeItem() {
        return this.device;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return [this.device || this.noDeviceTreeItem];
        }
        if (element instanceof DeviceTreeItem) {
            // should always have element.rootDirectory - included in if statement just for type checking
            if (element.device.isConnected && element.rootDirectory) {
                return [element.statusItem, element.rootDirectory];
            }
            return [];
        }
        if (element instanceof DeviceStatusTreeItem) {
            return element.children;
        }
        if (element instanceof File) {
            return element.getFiles();
        }
        return [];
    }
    fireDeviceChanged() {
        // not sure why, but if we pass device to fire(), vscode does not call
        // back to getTreeItem(), so we are refreshing the entire tree for now
        this._onDidChangeTreeData.fire();
    }
    fireFileChanged(file) {
        this._onDidChangeTreeData.fire(file);
    }
    fireStatusChanged(status) {
        this._onDidChangeTreeData.fire(status);
    }
}
/**
 * Possible states for a Device.
 *
 * These are used for the tree view context value.
 */
var DeviceState;
(function (DeviceState) {
    DeviceState["Disconnected"] = "ev3devBrowser.device.disconnected";
    DeviceState["Connecting"] = "ev3devBrowser.device.connecting";
    DeviceState["Connected"] = "ev3devBrowser.device.connected";
})(DeviceState || (DeviceState = {}));
class DeviceTreeItem extends vscode.TreeItem {
    constructor(device) {
        super(device.name);
        this.device = device;
        this.command = { command: 'ev3devBrowser.deviceTreeItem.select', title: '', arguments: [this] };
        device.onWillConnect(() => this.handleConnectionState(DeviceState.Connecting));
        device.onDidConnect(() => this.handleConnectionState(DeviceState.Connected));
        device.onDidDisconnect(() => this.handleConnectionState(DeviceState.Disconnected));
        if (device.isConnecting) {
            this.handleConnectionState(DeviceState.Connecting);
        }
        else if (device.isConnected) {
            this.handleConnectionState(DeviceState.Connected);
        }
        else {
            this.handleConnectionState(DeviceState.Disconnected);
        }
        this.statusItem = new DeviceStatusTreeItem(device);
    }
    handleConnectionState(state) {
        this.contextValue = state;
        utils_1.setContext('ev3devBrowser.context.connected', false);
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
        this.rootDirectory = undefined;
        let icon;
        switch (state) {
            case DeviceState.Connecting:
                icon = 'yellow-circle.svg';
                break;
            case DeviceState.Connected:
                utils_1.setContext('ev3devBrowser.context.connected', true);
                this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
                this.rootDirectory = new File(this.device, undefined, '', {
                    filename: this.device.homeDirectoryPath,
                    longname: '',
                    attrs: this.device.homeDirectoryAttr
                });
                this.rootDirectory.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
                icon = 'green-circle.svg';
                this.statusItem.connectBrickd();
                break;
            case DeviceState.Disconnected:
                icon = 'red-circle.svg';
                break;
        }
        if (icon) {
            this.iconPath = {
                dark: path.join(resourceDir, 'icons', 'dark', icon),
                light: path.join(resourceDir, 'icons', 'light', icon),
            };
        }
        else {
            this.iconPath = undefined;
        }
        ev3devBrowserProvider.fireDeviceChanged();
    }
    handleClick() {
        // Attempt to keep he collapsible state correct. If we don't do this,
        // strange things happen on a refresh.
        switch (this.collapsibleState) {
            case vscode.TreeItemCollapsibleState.Collapsed:
                this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
                break;
            case vscode.TreeItemCollapsibleState.Expanded:
                this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                break;
        }
    }
    openSshTerminal() {
        const config = vscode.workspace.getConfiguration(`terminal.integrated.env.${utils_1.getPlatform()}`);
        const termEnv = config.get('TERM');
        this.device.shell({ term: termEnv || process.env['TERM'] || 'xterm-256color' }).then(ch => {
            const writeEmitter = new vscode.EventEmitter();
            ch.stdout.on('data', (data) => writeEmitter.fire(String(data)));
            ch.stderr.on('data', (data) => writeEmitter.fire(String(data)));
            const term = vscode.window.createTerminal({
                name: `SSH: ${this.label}`,
                pty: {
                    onDidWrite: writeEmitter.event,
                    open: (dim) => {
                        if (dim !== undefined) {
                            ch.setWindow(dim.rows, dim.columns, 0, 0);
                        }
                    },
                    close: () => {
                        ch.close();
                    },
                    handleInput: (data) => {
                        ch.stdin.write(data);
                    },
                    setDimensions: (dim) => {
                        ch.setWindow(dim.rows, dim.columns, 0, 0);
                    },
                },
            });
            ch.on('close', () => {
                term.dispose();
                ch.destroy();
            });
            ch.on('error', (err) => {
                vscode.window.showErrorMessage(`SSH connection error: ${err || err.message}`);
                term.dispose();
                ch.destroy();
            });
            term.show();
        }).catch(err => {
            vscode.window.showErrorMessage(`Failed to create SSH terminal: ${err || err.message}`);
        });
    }
    captureScreenshot() {
        return __awaiter(this, void 0, void 0, function* () {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                title: "Capturing screenshot..."
            }, progress => {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    const handleCaptureError = (e) => {
                        vscode.window.showErrorMessage("Error capturing screenshot: " + (e.message || e));
                        reject();
                    };
                    try {
                        const screenshotDirectory = yield utils_1.getSharedTempDir('ev3dev-screenshots');
                        const screenshotBaseName = `ev3dev-${utils_1.sanitizedDateString()}.png`;
                        const screenshotFile = `${screenshotDirectory}/${screenshotBaseName}`;
                        const conn = yield this.device.exec('fbgrab -');
                        const writeStream = fs.createWriteStream(screenshotFile);
                        conn.on('error', (e) => {
                            writeStream.removeAllListeners('finish');
                            handleCaptureError(e);
                        });
                        writeStream.on('open', () => {
                            conn.stdout.pipe(writeStream);
                        });
                        writeStream.on('error', (e) => {
                            vscode.window.showErrorMessage("Error saving screenshot: " + e.message);
                            reject();
                        });
                        writeStream.on('finish', () => __awaiter(this, void 0, void 0, function* () {
                            const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                            if (yield utils_1.verifyFileHeader(screenshotFile, pngHeader)) {
                                utils_1.toastStatusBarMessage("Screenshot captured");
                                resolve();
                                vscode.commands.executeCommand('vscode.open', vscode.Uri.file(screenshotFile), vscode.ViewColumn.Two);
                            }
                            else {
                                handleCaptureError("The screenshot was not in the correct format. You may need to upgrade to fbcat 0.5.0.");
                            }
                        }));
                    }
                    catch (e) {
                        handleCaptureError(e);
                    }
                }));
            });
        });
    }
    showSysinfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                output.clear();
                output.show();
                output.appendLine('========== ev3dev-sysinfo ==========');
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: 'Grabbing ev3dev system info...'
                }, (progress) => __awaiter(this, void 0, void 0, function* () {
                    const [stdout, stderr] = yield this.device.createExecObservable('ev3dev-sysinfo');
                    yield Promise.all([
                        stdout.forEach(v => output.appendLine(v)),
                        stderr.forEach(v => output.appendLine(v))
                    ]);
                }));
                utils_1.toastStatusBarMessage('System info retrieved');
            }
            catch (err) {
                vscode.window.showErrorMessage('An error occurred while getting system info: ' + (err.message || err));
            }
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: `Connecting to ${this.label}`
                }, (progress) => __awaiter(this, void 0, void 0, function* () {
                    yield this.device.connect();
                }));
                utils_1.toastStatusBarMessage(`Connected to ${this.label}`);
            }
            catch (err) {
                const troubleshoot = 'Troubleshoot';
                vscode.window.showErrorMessage(`Failed to connect to ${this.label}: ${err.message}`, troubleshoot)
                    .then((value) => {
                    if (value === troubleshoot) {
                        const wiki = vscode.Uri.parse('https://github.com/ev3dev/vscode-ev3dev-browser/wiki/Troubleshooting');
                        vscode.commands.executeCommand('vscode.open', wiki);
                    }
                });
            }
        });
    }
    disconnect() {
        this.device.disconnect();
    }
}
/**
 * File states are used for the context value of a File.
 */
var FileState;
(function (FileState) {
    FileState["None"] = "ev3devBrowser.file";
    FileState["Folder"] = "ev3devBrowser.file.folder";
    FileState["RootFolder"] = "ev3devBrowser.file.folder.root";
    FileState["Executable"] = "ev3devBrowser.file.executable";
})(FileState || (FileState = {}));
class File extends vscode.TreeItem {
    constructor(device, parent, directory, fileInfo) {
        super(fileInfo.filename);
        this.device = device;
        this.parent = parent;
        this.fileInfo = fileInfo;
        this.fileCache = new Array();
        // work around bad typescript bindings
        const stats = fileInfo.attrs;
        this.path = directory + fileInfo.filename;
        this.isExecutable = stats.isFile() && !!(stats.mode & S_IXUSR);
        this.isDirectory = stats.isDirectory();
        if (this.isDirectory) {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            if (this.parent) {
                this.contextValue = FileState.Folder;
            }
            else {
                this.contextValue = FileState.RootFolder;
            }
        }
        else if (this.isExecutable) {
            this.contextValue = FileState.Executable;
        }
        else {
            this.contextValue = FileState.None;
        }
        this.command = { command: 'ev3devBrowser.fileTreeItem.select', title: '', arguments: [this] };
    }
    createOrUpdate(device, directory, fileInfo) {
        const path = directory + fileInfo.filename;
        const match = this.fileCache.find(f => f.path === path);
        if (match) {
            match.fileInfo = fileInfo;
            return match;
        }
        const file = new File(device, this, directory, fileInfo);
        this.fileCache.push(file);
        return file;
    }
    static compare(a, b) {
        // directories go first
        if (a.isDirectory && !b.isDirectory) {
            return -1;
        }
        if (!a.isDirectory && b.isDirectory) {
            return 1;
        }
        // then sort in ASCII order
        return a.path < b.path ? -1 : +(a.path > b.path);
    }
    getFiles() {
        return new Promise((resolve, reject) => {
            this.device.ls(this.path).then(list => {
                const files = new Array();
                if (list) {
                    list.forEach(element => {
                        // skip hidden files
                        if (element.filename[0] !== '.') {
                            const file = this.createOrUpdate(this.device, this.path + "/", element);
                            files.push(file);
                        }
                    }, this);
                }
                // sort directories first, then by ASCII
                files.sort(File.compare);
                resolve(files);
                this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
            }, err => {
                reject(err);
            });
        });
    }
    handleClick() {
        // keep track of state so that it is preserved during refresh
        if (this.collapsibleState === vscode.TreeItemCollapsibleState.Expanded) {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            // This causes us to refresh the files each time the directory is collapsed
            this.fileCache.length = 0;
            ev3devBrowserProvider.fireFileChanged(this);
        }
        // Show a quick-pick to allow users to run an executable program.
        if (this.isExecutable) {
            const runItem = {
                label: 'Run',
                description: this.path
            };
            const runInTerminalItem = {
                label: 'Run in interactive terminal',
                description: this.path
            };
            vscode.window.showQuickPick([runItem, runInTerminalItem]).then(value => {
                switch (value) {
                    case runItem:
                        this.run();
                        break;
                    case runInTerminalItem:
                        this.runInTerminal();
                        break;
                }
            });
        }
    }
    run() {
        vscode.debug.startDebugging(undefined, {
            type: 'ev3devBrowser',
            name: 'Run',
            request: 'launch',
            program: this.path,
            download: false,
            interactiveTerminal: false,
        });
    }
    runInTerminal() {
        vscode.debug.startDebugging(undefined, {
            type: 'ev3devBrowser',
            name: 'Run in interactive terminal',
            request: 'launch',
            program: this.path,
            download: false,
            interactiveTerminal: true,
        });
    }
    delete() {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: `Deleting '${this.path}'`
        }, (progress) => __awaiter(this, void 0, void 0, function* () {
            try {
                const config = vscode.workspace.getConfiguration('ev3devBrowser');
                const confirm = config.get('confirmDelete');
                if (confirm) {
                    const deleteItem = "Delete";
                    const dontShowAgainItem = "Don't show this again";
                    const result = yield vscode.window.showInformationMessage(`Are you sure you want to delete '${this.path}'? This cannot be undone.`, deleteItem, dontShowAgainItem);
                    if (!result) {
                        return;
                    }
                    else if (result === dontShowAgainItem) {
                        config.update('confirmDelete', false, vscode.ConfigurationTarget.Global);
                    }
                }
                yield this.device.rm_rf(this.path);
                ev3devBrowserProvider.fireFileChanged(this.parent);
                utils_1.toastStatusBarMessage(`Deleted '${this.path}'`);
            }
            catch (err) {
                vscode.window.showErrorMessage(`Error deleting '${this.path}': ${err.message}`);
            }
        }));
    }
    showInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            output.clear();
            output.show();
            output.appendLine('Getting file info...');
            output.appendLine('');
            try {
                let [stdout, stderr] = yield this.device.createExecObservable(`/bin/ls -lh "${this.path}"`);
                yield Promise.all([
                    stdout.forEach(line => output.appendLine(line)),
                    stderr.forEach(line => output.appendLine(line))
                ]);
                output.appendLine('');
                [stdout, stderr] = yield this.device.createExecObservable(`/usr/bin/file "${this.path}"`);
                yield Promise.all([
                    stdout.forEach(line => output.appendLine(line)),
                    stderr.forEach(line => output.appendLine(line))
                ]);
            }
            catch (err) {
                output.appendLine(`Error: ${err.message}`);
            }
        });
    }
    upload() {
        return __awaiter(this, void 0, void 0, function* () {
            const basename = path.posix.basename(this.path);
            const result = yield vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.join(config.uploadDir, basename))
            });
            if (!result) {
                return;
            }
            yield vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                title: 'Uploading'
            }, (progress) => __awaiter(this, void 0, void 0, function* () {
                yield this.device.get(this.path, result.fsPath, percentage => {
                    progress.report({ message: `${this.path} - ${percentage}%` });
                });
            }));
            config.uploadDir = path.dirname(result.fsPath);
        });
    }
}
/**
 * A tree view item that runs a command when clicked.
 */
class CommandTreeItem extends vscode.TreeItem {
    constructor(label, command) {
        super(label);
        if (command) {
            this.command = {
                command: command,
                title: ''
            };
        }
    }
}
class DeviceStatusTreeItem extends CommandTreeItem {
    constructor(device) {
        super("Status", undefined);
        this.device = device;
        this.defaultBatteryLabel = "Battery: N/A";
        this.children = new Array();
        this.batteryItem = new CommandTreeItem(this.defaultBatteryLabel, undefined);
        this.children.push(this.batteryItem);
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    connectBrickd() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.brickd) {
                this.brickd.removeAllListeners();
                this.brickd = undefined;
                this.batteryItem.label = this.defaultBatteryLabel;
            }
            try {
                this.brickd = yield this.device.brickd();
                this.brickd.on('message', message => {
                    const [m1, ...m2] = message.split(' ');
                    switch (m1) {
                        case 'WARN':
                        case 'CRITICAL':
                            vscode.window.showWarningMessage(`${this.device.name}: ${m2.join(' ')}`);
                            break;
                        case 'PROPERTY':
                            switch (m2[0]) {
                                case "system.battery.voltage":
                                    const voltage = Number(m2[1]) / 1000;
                                    this.batteryItem.label = `Battery: ${voltage.toFixed(2)}V`;
                                    ev3devBrowserProvider.fireStatusChanged(this);
                            }
                            break;
                    }
                });
                this.brickd.on('error', err => {
                    vscode.window.showErrorMessage(`${this.device.name}: ${err.message}`);
                });
                this.brickd.on('ready', () => {
                    if (!this.brickd) {
                        return;
                    }
                    // serialNumber is used elsewhere, so tack it on to the device object
                    this.device['serialNumber'] = this.brickd.serialNumber;
                });
            }
            catch (err) {
                vscode.window.showWarningMessage('Failed to get brickd connection. No status will be available.');
                return;
            }
        });
    }
}
/**
 * Wrapper around vscode.ExtensionContext.workspaceState
 */
class WorkspaceConfig {
    constructor(state) {
        this.state = state;
    }
    /**
     * Gets or sets the upload directory for the current workspace.
     */
    get uploadDir() {
        return this.state.get('uploadDir', os.homedir());
    }
    set uploadDir(value) {
        this.state.update('uploadDir', value);
    }
}
//# sourceMappingURL=extension.js.map
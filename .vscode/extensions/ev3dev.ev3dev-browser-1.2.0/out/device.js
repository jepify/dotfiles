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
const path = require("path");
const os = require("os");
const readline = require("readline");
const ssh2 = require("ssh2");
const vscode = require("vscode");
const Observable = require("zen-observable");
const brickd_1 = require("./brickd");
const dnssd = require("./dnssd");
/**
 * Object that represents a remote ev3dev device.
 */
class Device extends vscode.Disposable {
    constructor(service) {
        super(() => {
            this.disconnect();
            this._onWillConnect.dispose();
            this._onDidConnect.dispose();
            this._onDidDisconnect.dispose();
            this.client.destroy();
        });
        this.service = service;
        this._isConnecting = false;
        this._isConnected = false;
        this._onWillConnect = new vscode.EventEmitter();
        /**
         * Event that fires when a connection is initiated.
         *
         * This will be followed by either onDidConnect or onDidDisconnect.
         */
        this.onWillConnect = this._onWillConnect.event;
        this._onDidConnect = new vscode.EventEmitter();
        /**
         * Event that fires when a connection has completed successfully.
         */
        this.onDidConnect = this._onDidConnect.event;
        this._onDidDisconnect = new vscode.EventEmitter();
        /**
         * Event that fires when a connection has been closed.
         */
        this.onDidDisconnect = this._onDidDisconnect.event;
        this.username = service.txt['ev3dev.robot.user'];
        this.client = new ssh2.Client();
        this.client.on('end', () => {
        });
        this.client.on('close', () => {
            this.disconnect();
        });
        this.client.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => __awaiter(this, void 0, void 0, function* () {
            const answers = new Array();
            for (const p of prompts) {
                const choice = yield vscode.window.showInputBox({
                    ignoreFocusOut: true,
                    password: !p.echo,
                    prompt: p.prompt
                });
                // FIXME: how to cancel properly?
                answers.push(choice || '');
            }
            finish(answers);
        }));
    }
    /**
     * Connect to the device using SSH.
     */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            this._isConnecting = true;
            this._onWillConnect.fire();
            yield this.connectClient();
            try {
                this.sftp = yield this.getSftp();
                this._homeDirectoryAttr = yield this.stat(this.homeDirectoryPath);
                this._isConnecting = false;
                this._isConnected = true;
                this._onDidConnect.fire();
            }
            catch (err) {
                this._isConnecting = false;
                this.disconnect();
                throw err;
            }
        });
    }
    connectClient() {
        return new Promise((resolve, reject) => {
            this.client.once('ready', resolve);
            this.client.once('error', reject);
            let address = this.service.address;
            if (this.service.ipv === 'IPv6' && address.startsWith('fe80::')) {
                // this is IPv6 link local address, so we need to add the network
                // interface to the end
                if (process.platform === 'win32') {
                    // Windows uses the interface index
                    address += `%${this.service.iface}`;
                }
                else {
                    // everyone else uses the interface name
                    address += `%${this.service['ifaceName']}`;
                }
            }
            const config = vscode.workspace.getConfiguration('ev3devBrowser');
            this.client.connect({
                host: address,
                username: this.username,
                password: config.get('password'),
                tryKeyboard: true,
                keepaliveCountMax: 5,
                keepaliveInterval: 1000,
                readyTimeout: config.get('connectTimeout', 30) * 1000,
            });
        });
    }
    getSftp() {
        return new Promise((resolve, reject) => {
            // This can keep the connection busy for a long time. On Bluetooth,
            // it is enough for the keepalive timeout to expire. So, we ignore
            // the keepalive during this operation.
            const timer = setInterval(() => {
                this.client._resetKA();
            }, 1000);
            this.client.sftp((err, sftp) => {
                clearInterval(timer);
                if (err) {
                    reject(err);
                    return;
                }
                resolve(sftp);
            });
        });
    }
    /**
     * Disconnect from the device.
     */
    disconnect() {
        this._isConnected = false;
        if (this.sftp) {
            this.sftp.end();
            this.sftp = undefined;
        }
        this.client.end();
        this._onDidDisconnect.fire();
    }
    /**
     * Tests if a connection is currently in progress.
     */
    get isConnecting() {
        return this._isConnecting;
    }
    /**
     * Tests if a device is currently connected.
     */
    get isConnected() {
        return this._isConnected;
    }
    /**
     * Gets the name of the device.
     */
    get name() {
        return this.service.name;
    }
    /**
     * Get the file attributes of the home directory.
     */
    get homeDirectoryAttr() {
        if (!this._homeDirectoryAttr) {
            throw new Error('Not connected');
        }
        return this._homeDirectoryAttr;
    }
    /**
     * Gets the home directory path for the device.
     */
    get homeDirectoryPath() {
        return this.service.txt['ev3dev.robot.home'] || `/home/${this.username}`;
    }
    /**
     * Sets file permissions.
     * @param path The path to a file or directory
     * @param mode The file permissions
     */
    chmod(path, mode) {
        return new Promise((resolve, reject) => {
            if (!this.sftp) {
                reject(new Error('Not connected'));
                return;
            }
            this.sftp.chmod(path, mode, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Executes a command on the remote device.
     * @param command The absolute path of the command.
     */
    exec(command, env, pty) {
        return new Promise((resolve, reject) => {
            const options = {
                env: env,
                pty: pty,
            };
            this.client.exec(command, options, (err, channel) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(channel);
            });
        });
    }
    /**
     * Create an observable that monitors the stdout and stderr of a command.
     * @param command The command to execute.
     */
    createExecObservable(command) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const conn = yield this.exec(command);
                    const stdout = new Observable(observer => {
                        readline.createInterface({
                            input: conn.stdout
                        }).on('line', line => {
                            observer.next(line);
                        }).on('close', () => {
                            observer.complete();
                        });
                    });
                    const stderr = new Observable(observer => {
                        readline.createInterface({
                            input: conn.stderr
                        }).on('line', line => {
                            observer.next(line);
                        }).on('close', () => {
                            observer.complete();
                        });
                    });
                    resolve([stdout, stderr]);
                }
                catch (err) {
                    reject(err);
                }
            }));
        });
    }
    /**
     * Starts a new shell on the remote device.
     * @param window Optional pty settings or false to not allocate a pty.
     */
    shell(window) {
        return new Promise((resolve, reject) => {
            const options = {
                env: vscode.workspace.getConfiguration('ev3devBrowser').get('env')
            };
            this.client.shell(window, options, (err, stream) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(stream);
                }
            });
        });
    }
    /**
     * Create a directory.
     * @param path the path of the directory.
     */
    mkdir(path) {
        return new Promise((resolve, reject) => {
            if (!this.sftp) {
                reject(new Error('Not connected'));
                return;
            }
            this.sftp.mkdir(path, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Recursively create a directory (equivalent of mkdir -p).
     * @param dirPath the path of the directory
     */
    mkdir_p(dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!path.posix.isAbsolute(dirPath)) {
                throw new Error("The supplied file path must be absolute.");
            }
            const names = dirPath.split('/');
            // Leading slash produces empty first element
            names.shift();
            let part = '/';
            while (names.length) {
                part = path.posix.join(part, names.shift());
                // Create the directory if it doesn't already exist
                try {
                    const stat = yield this.stat(part);
                    if (!stat.isDirectory()) {
                        throw new Error(`Cannot create directory: "${part}" exists but isn't a directory`);
                    }
                }
                catch (err) {
                    if (err.code !== ssh2.SFTP_STATUS_CODE.NO_SUCH_FILE) {
                        throw err;
                    }
                    yield this.mkdir(part);
                }
            }
        });
    }
    /**
     * Copy a remote file to the local host.
     * @param remote The remote path.
     * @param local The path where the file will be saved.
     * @param reportPercentage An optional progress reporting callback
     */
    get(remote, local, reportPercentage) {
        return new Promise((resolve, reject) => {
            if (!this.sftp) {
                reject(new Error('Not connected'));
                return;
            }
            this.sftp.fastGet(remote, local, {
                concurrency: 1,
                step: (transferred, chunk, total) => {
                    if (reportPercentage) {
                        reportPercentage(Math.round(transferred / total * 100));
                    }
                },
            }, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Copy a local file to the remote device.
     * @param local The path to a local file.
     * @param remote The remote path where the file will be saved.
     * @param mode The file permissions
     * @param reportPercentage An optional progress reporting callback
     */
    put(local, remote, mode, reportPercentage) {
        return new Promise((resolve, reject) => {
            if (!this.sftp) {
                reject(new Error('Not connected'));
                return;
            }
            this.sftp.fastPut(local, remote, {
                concurrency: 1,
                step: (transferred, chunk, total) => {
                    if (reportPercentage) {
                        reportPercentage(Math.round(transferred / total * 100));
                    }
                },
                mode: mode
            }, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * List the contents of a remote directory.
     * @param path The path to a directory.
     */
    ls(path) {
        return new Promise((resolve, reject) => {
            if (!this.sftp) {
                reject(new Error('Not connected'));
                return;
            }
            this.sftp.readdir(path, (err, list) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(list);
                }
            });
        });
    }
    /**
     * Stat a remote file or directory.
     * @param path The path to a remote file or directory.
     */
    stat(path) {
        return new Promise((resolve, reject) => {
            if (!this.sftp) {
                reject(new Error('Not connected'));
                return;
            }
            this.sftp.stat(path, (err, stats) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(stats);
                }
            });
        });
    }
    /**
     * Remove a remote file.
     * @param path The path to a file or symlink to remove (unlink)
     */
    rm(path) {
        return new Promise((resolve, reject) => {
            if (!this.sftp) {
                reject(new Error('Not connected'));
                return;
            }
            this.sftp.unlink(path, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    rm_rf(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const stat = yield this.stat(path);
            if (stat.isDirectory()) {
                for (const f of yield this.ls(path)) {
                    yield this.rm_rf(`${path}/${f.filename}`);
                }
                yield this.rmdir(path);
            }
            else {
                yield this.rm(path);
            }
        });
    }
    rmdir(path) {
        return new Promise((resolve, reject) => {
            if (!this.sftp) {
                reject(new Error('Not connected'));
                return;
            }
            this.sftp.rmdir(path, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    static getDnssdClient() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Device.dnssdClient) {
                Device.dnssdClient = yield dnssd.getInstance();
            }
            return Device.dnssdClient;
        });
    }
    static additionalDeviceToDnssdService(device) {
        const txt = {};
        txt['ev3dev.robot.user'] = device.username || 'robot';
        txt['ev3dev.robot.home'] = device.homeDirectory || `/home/${txt['ev3dev.robot.user']}`;
        return {
            name: device.name,
            address: device.ipAddress,
            ipv: 'IPv4',
            port: 22,
            service: 'sftp-ssh',
            transport: 'tcp',
            txt: txt
        };
    }
    /**
     * Read additional device definitions from the config and convert them to
     * ServiceItems
     */
    static getServicesFromConfig() {
        const services = new Array();
        const devices = vscode.workspace.getConfiguration('ev3devBrowser').get('additionalDevices', []);
        for (const device of devices) {
            services.push({
                label: device.name,
                service: this.additionalDeviceToDnssdService(device)
            });
        }
        return services;
    }
    /**
     * Use a quick-pick to browse discovered devices and select one.
     * @returns A new Device or undefined if the user canceled the request
     */
    static pickDevice() {
        return __awaiter(this, void 0, void 0, function* () {
            const configItems = this.getServicesFromConfig();
            const manualEntry = {
                label: "I don't see my device..."
            };
            const selectedItem = yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                // start browsing for devices
                const dnssdClient = yield Device.getDnssdClient();
                const browser = yield dnssdClient.createBrowser({
                    ipv: 'IPv6',
                    service: 'sftp-ssh'
                });
                const items = new Array();
                let cancelSource;
                let done = false;
                // if a device is added or removed, cancel the quick-pick
                // and then show a new one with the update list
                browser.on('added', (service) => {
                    if (service.txt['ev3dev.robot.home']) {
                        // this looks like an ev3dev device
                        const ifaces = os.networkInterfaces();
                        for (const ifaceName in ifaces) {
                            if (ifaces[ifaceName].find(v => v.scopeid === service.iface)) {
                                service['ifaceName'] = ifaceName;
                                break;
                            }
                        }
                        const item = new ServiceItem(service);
                        items.push(item);
                        cancelSource === null || cancelSource === void 0 ? void 0 : cancelSource.cancel();
                    }
                });
                browser.on('removed', (service) => {
                    const index = items.findIndex(si => si.service === service);
                    if (index > -1) {
                        items.splice(index, 1);
                        cancelSource === null || cancelSource === void 0 ? void 0 : cancelSource.cancel();
                    }
                });
                // if there is a browser error, cancel the quick-pick and show
                // an error message
                browser.on('error', err => {
                    cancelSource === null || cancelSource === void 0 ? void 0 : cancelSource.cancel();
                    browser.destroy();
                    done = true;
                    reject(err);
                });
                yield browser.start();
                while (!done) {
                    cancelSource = new vscode.CancellationTokenSource();
                    // using this promise in the quick-pick will cause a progress
                    // bar to show if there are no items.
                    const list = new Array();
                    if (items) {
                        list.push(...items);
                    }
                    if (configItems) {
                        list.push(...configItems);
                    }
                    list.push(manualEntry);
                    const selected = yield vscode.window.showQuickPick(list, {
                        ignoreFocusOut: true,
                        placeHolder: "Searching for devices... Select a device or press ESC to cancel."
                    }, cancelSource.token);
                    if (cancelSource.token.isCancellationRequested) {
                        continue;
                    }
                    browser.destroy();
                    done = true;
                    resolve(selected);
                }
            }));
            if (!selectedItem) {
                // cancelled
                return undefined;
            }
            if (selectedItem === manualEntry) {
                const name = yield vscode.window.showInputBox({
                    ignoreFocusOut: true,
                    prompt: "Enter a name for the device",
                    placeHolder: 'Example: "ev3dev (Bluetooth)"'
                });
                if (!name) {
                    // cancelled
                    return undefined;
                }
                const ipAddress = yield vscode.window.showInputBox({
                    ignoreFocusOut: true,
                    prompt: "Enter the IP address of the device",
                    placeHolder: 'Example: "192.168.137.3"',
                    validateInput: (v) => {
                        if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)) {
                            return 'Not a valid IP address';
                        }
                        return undefined;
                    }
                });
                if (!ipAddress) {
                    // cancelled
                    return undefined;
                }
                const device = {
                    name: name,
                    ipAddress: ipAddress
                };
                const config = vscode.workspace.getConfiguration('ev3devBrowser');
                const existing = config.get('additionalDevices', []);
                existing.push(device);
                config.update('additionalDevices', existing, vscode.ConfigurationTarget.Global);
                return new Device(this.additionalDeviceToDnssdService(device));
            }
            return new Device(selectedItem.service);
        });
    }
    forwardOut(srcAddr, srcPort, destAddr, destPort) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.client.forwardOut(srcAddr, srcPort, destAddr, destPort, (err, channel) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(channel);
                    }
                });
            });
        });
    }
    /**
     * Gets a new connection to brickd.
     *
     * @returns A promise of a Brickd object.
     */
    brickd() {
        return __awaiter(this, void 0, void 0, function* () {
            const channel = yield this.forwardOut('localhost', 0, 'localhost', 31313);
            return new brickd_1.Brickd(channel);
        });
    }
}
exports.Device = Device;
/**
 * Quick pick item used in DeviceManager.pickDevice().
 */
class ServiceItem {
    constructor(service) {
        this.service = service;
        this.label = service.name;
        this.description = service['ifaceName'];
    }
}
//# sourceMappingURL=device.js.map
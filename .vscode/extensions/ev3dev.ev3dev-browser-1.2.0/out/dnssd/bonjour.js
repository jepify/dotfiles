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
const bonjour = require("bonjour");
const events = require("events");
const os = require("os");
function getInstance() {
    return new BonjourClient();
}
exports.getInstance = getInstance;
class BonjourClient extends events.EventEmitter {
    constructor() {
        super(...arguments);
        this.bClients = {};
        this.ifaceAddresses = new Array();
        this.ifaceTimer = setInterval(() => this.updateInterfaces(), 500);
    }
    forEachClient(func) {
        for (const a in this.bClients) {
            func(this.bClients[a]);
        }
    }
    createBrowser(opts) {
        const browser = new BonjourBrowser(this, opts);
        return Promise.resolve(browser);
    }
    destroy() {
        clearInterval(this.ifaceTimer);
        for (const a in this.bClients) {
            this.destroyClient(a);
        }
        this.removeAllListeners();
    }
    // The bonjour package doesn't seem to be able to handle broadcasting and
    // receiving on all interfaces. So, we are monitoring network interfaces
    // ourselves and creating a bonjour.Bonjour instance for each network
    // interface (actually, each address of each interface, which could be
    // more than one).
    updateInterfaces() {
        const newAddresses = new Array();
        const ifaces = os.networkInterfaces();
        for (let i in ifaces) {
            // on Windows, only the local link address has a scopeid that matches
            // the index of the network interface.
            const localLinkAddr = ifaces[i].find(v => v.address.startsWith('fe80:'));
            if (!localLinkAddr) {
                continue;
            }
            const ifaceIndex = localLinkAddr.scopeid;
            // only supporting IPv6 for now
            const addresses = ifaces[i].filter(v => v.internal === false && v.family === 'IPv6').map(v => `${v.address}%${process.platform === 'win32' ? v.scopeid : i}`);
            newAddresses.push(...addresses.map(v => ({ iface: ifaceIndex, address: v })));
        }
        const added = newAddresses.filter(a => this.ifaceAddresses.indexOf(a.address) === -1);
        const removed = this.ifaceAddresses.filter(a => newAddresses.findIndex(v => v.address === a) === -1);
        if (added.length) {
            for (const a of added) {
                this.ifaceAddresses.push(a.address);
                this.createClient(a.iface, a.address);
            }
        }
        if (removed.length) {
            const indexes = removed.map(a => this.ifaceAddresses.indexOf(a));
            indexes.forEach(i => {
                const [a] = this.ifaceAddresses.splice(i, 1);
                this.destroyClient(a);
            }, this);
        }
    }
    /**
     * Asynchronously create an new bonjour.Bonjour client object
     * @param ifaceIndex the index of the network interface
     * @param ifaceAddress the IP address
     */
    createClient(ifaceIndex, ifaceAddress) {
        // On Windows, we need the full IP address as part of the multicast socket
        // interface or things don't work right. On Linux, we have to strip the
        // IP address or things don't work right.
        const iface = (os.platform() === 'win32') ? ifaceAddress : ifaceAddress.replace(/.*%/, '::%');
        // work around bonjour issue where error is not handled
        new Promise((resolve, reject) => {
            const bClient = bonjour({
                type: 'udp6',
                ip: 'ff02::fb',
                interface: iface,
            });
            bClient['iface'] = ifaceIndex;
            bClient._server.mdns.on('ready', () => resolve(bClient));
            bClient._server.mdns.on('error', (err) => reject(err));
        }).then(bClient => {
            if (this.ifaceAddresses.indexOf(ifaceAddress) < 0) {
                // iface was removed while we were waiting for promise
                bClient.destroy();
                return;
            }
            this.bClients[ifaceAddress] = bClient;
            this.emit('clientAdded', bClient);
        }).catch(err => {
            if (err.code === 'EADDRNOTAVAIL') {
                // when a new network interface first comes up, we can get this
                // error when we try to bind to the socket, so keep trying until
                // we are bound or the interface goes away.
                setTimeout(() => {
                    if (this.ifaceAddresses.indexOf(ifaceAddress) >= 0) {
                        this.createClient(ifaceIndex, ifaceAddress);
                    }
                }, 500);
            }
            // FIXME: other errors are currently ignored
        });
    }
    /**
     * Destroys the bonjour.Bonjour client associated with ifaceAddress
     * @param ifaceAddress the IP address
     */
    destroyClient(ifaceAddress) {
        const bClient = this.bClients[ifaceAddress];
        delete this.bClients[ifaceAddress];
        this.emit('clientRemoved', bClient);
        bClient.destroy();
    }
}
class BonjourBrowser extends events.EventEmitter {
    constructor(client, opts) {
        super();
        this.client = client;
        this.opts = opts;
        this.started = false;
        this.browsers = new Array();
        this.addBrowser = this.addBrowser.bind(this);
        this.removeBrowser = this.removeBrowser.bind(this);
        client.on('clientAdded', this.addBrowser);
        client.on('clientRemoved', this.removeBrowser);
        client.forEachClient(c => this.addBrowser(c));
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const b of this.browsers) {
                this.startClientBrowser(b);
            }
            this.started = true;
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const b of this.browsers) {
                this.stopClientBrowser(b);
            }
            this.started = false;
        });
    }
    destroy() {
        this.removeAllListeners();
        this.client.off('clientAdded', this.addBrowser);
        this.client.off('clientRemoved', this.removeBrowser);
        this.stop();
    }
    addBrowser(bClient) {
        const browser = bClient.find({
            type: this.opts.service,
            protocol: this.opts.transport,
        });
        const services = new Array();
        browser.on('up', s => {
            s['iface'] = bClient['iface'];
            for (const b of this.browsers) {
                for (const bs of b.services) {
                    const bss = bs.bService;
                    if (s['iface'] === bss['iface'] && s.name === bs.name && s.type === bss.type && s.fqdn === bss.fqdn.replace(/\.$/, '')) {
                        // ignore duplicates
                        return;
                    }
                }
            }
            const service = new BonjourService(s);
            services.push(service);
            this.emit('added', service, false);
        });
        browser.on('down', s => {
            const index = services.findIndex(v => v.bService === s);
            const [service] = services.splice(index, 1);
            this.emit('removed', service, false);
        });
        const clientBrowser = { bClient: bClient, browser: browser, services: services };
        this.browsers.push(clientBrowser);
        // If a new client is added after we have already started browsing, we need
        // to start that browser as well.
        if (this.started) {
            this.startClientBrowser(clientBrowser);
        }
    }
    removeBrowser(bClient) {
        const i = this.browsers.findIndex(v => v.bClient === bClient);
        const [removed] = this.browsers.splice(i, 1);
        this.stopClientBrowser(removed);
        for (const s of removed.services) {
            this.emit('removed', s);
        }
    }
    startClientBrowser(clientBrowser) {
        clientBrowser.browser.start();
        clientBrowser.updateInterval = setInterval(() => {
            // poll again every 1 second
            clientBrowser.browser.update();
        }, 1000);
    }
    stopClientBrowser(clientBrowser) {
        if (clientBrowser.updateInterval) {
            clearInterval(clientBrowser.updateInterval);
            clientBrowser.browser.stop();
        }
    }
}
class BonjourService {
    constructor(bService) {
        this.bService = bService;
        this.name = bService.name;
        this.service = bService.type;
        this.transport = bService.protocol;
        this.iface = bService['iface'];
        this.host = bService.host;
        this.domain = bService.domain;
        this.ipv = 'IPv6';
        this.address = bService.addresses[0]; // FIXME
        this.port = bService.port;
        this.txt = bService.txt;
    }
}
//# sourceMappingURL=bonjour.js.map
"use strict";
// This implements the interface from the 'bonjour' npm package using the
// avahi-browse command. Not all features are implemented.
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
const dbus = require("dbus-next");
const events = require("events");
const PROTO_INET = 0;
const PROTO_INET6 = 1;
const IF_UNSPEC = -1;
let cachedServer;
function getServer() {
    return __awaiter(this, void 0, void 0, function* () {
        if (cachedServer === undefined) {
            const bus = dbus.systemBus();
            // dbus-next will queue messages and wait forever for a connection
            // so we have to hack in a timeout, otherwise we end up with a deadlock
            // on systems without D-Bus.
            yield new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(Error("Timeout while connecting to D-Bus"));
                }, 100);
                bus.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            const proxy = yield bus.getProxyObject('org.freedesktop.Avahi', '/');
            const iface = proxy.getInterface('org.freedesktop.Avahi.Server');
            const version = yield iface.GetAPIVersion();
            cachedServer = { proxy, iface };
        }
        return cachedServer;
    });
}
function getInstance() {
    return __awaiter(this, void 0, void 0, function* () {
        const server = yield getServer();
        return new AvahiClient(server);
    });
}
exports.getInstance = getInstance;
class AvahiClient {
    constructor(server) {
        this.server = server;
        this.destroyOps = new Array();
    }
    createBrowser(options) {
        return new Promise((resolve, reject) => {
            const browser = new AvahiBrowser(this, options);
            browser.once('ready', () => {
                browser.removeAllListeners('error');
                resolve(browser);
            });
            browser.once('error', err => {
                browser.removeAllListeners('ready');
                reject(err);
            });
        });
    }
    // interface method implementation
    destroy() {
        this.destroyOps.forEach(op => op());
        this.destroyOps.length = 0;
    }
    /**
     * Adds an operation to be performed when destroy() is called.
     * @param op operation to add
     * @return the op argument
     */
    pushDestroyOp(op) {
        this.destroyOps.push(op);
        return op;
    }
    /**
     * Removes an operation that was added with pushDestroyOp()
     * @param op the operation to remove
     */
    popDestroyOp(op) {
        let i = this.destroyOps.findIndex(v => v === op);
        if (i >= 0) {
            this.destroyOps.splice(i, 1);
        }
    }
}
class AvahiBrowser extends events.EventEmitter {
    constructor(client, options) {
        super();
        this.client = client;
        this.options = options;
        this.services = new Array();
        // Due to race condition: https://github.com/lathiat/avahi/issues/9
        // we have to add signal listeners now before creating browser objects
        // otherwise we miss signals.
        this.bus = client.server.proxy.bus;
        this.bus.on('message', (msg) => {
            if (msg.type !== dbus.MessageType.SIGNAL) {
                return;
            }
            if (msg.interface !== 'org.freedesktop.Avahi.ServiceBrowser') {
                return;
            }
            // TODO: should also check msg.path, but we can receive messages
            // before ServiceBrowserNew() returns when we don't know the path
            // yet.
            switch (msg.member) {
                case 'ItemNew':
                    {
                        const [iface, protocol, name, type, domain, flags] = msg.body;
                        client.server.iface.ResolveService(iface, protocol, name, type, domain, protocol, 0).then(([iface, protocol, name, type, domain, host, aprotocol, addr, port, txt, flags]) => {
                            const service = new AvahiService(iface, protocol, name, type, domain, host, aprotocol, addr, port, txt, flags);
                            this.services.push(service);
                            this.emit('added', service);
                        });
                    }
                    break;
                case 'ItemRemove':
                    {
                        const [iface, protocol, name, type, domain, flags] = msg.body;
                        const i = this.services.findIndex(s => s.match(iface, protocol, name, type, domain));
                        if (i >= 0) {
                            const [service] = this.services.splice(i, 1);
                            this.emit('removed', service);
                        }
                    }
                    break;
                case 'Failure':
                    {
                        const [error] = msg.body;
                        this.emit('error', new Error(error));
                    }
                    break;
            }
        });
        const addMatchMessage = new dbus.Message({
            destination: 'org.freedesktop.DBus',
            path: '/org/freedesktop/DBus',
            interface: 'org.freedesktop.DBus',
            member: 'AddMatch',
            signature: 's',
            body: [`type='signal',sender='org.freedesktop.Avahi',interface='org.freedesktop.Avahi.ServiceBrowser'`]
        });
        this.bus.call(addMatchMessage).then(() => this.emit('ready')).catch((err) => this.emit('error', err));
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const proto = this.options.ipv === 'IPv6' ? PROTO_INET6 : PROTO_INET;
            const type = `_${this.options.service}._${this.options.transport || 'tcp'}`;
            const objPath = yield this.client.server.iface.ServiceBrowserNew(IF_UNSPEC, proto, type, '', 0);
            const proxy = yield this.bus.getProxyObject('org.freedesktop.Avahi', objPath);
            this.browser = proxy.getInterface('org.freedesktop.Avahi.ServiceBrowser');
        });
    }
    stop() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield ((_a = this.browser) === null || _a === void 0 ? void 0 : _a.Free());
            this.browser = undefined;
        });
    }
    destroy() {
        this.removeAllListeners();
        this.stop();
    }
}
class AvahiService {
    constructor(iface, protocol, name, type, domain, host, aprotocol, address, port, txt, flags) {
        this.iface = iface;
        this.protocol = protocol;
        this.name = name;
        this.type = type;
        this.domain = domain;
        this.host = host;
        this.address = address;
        this.port = port;
        const [service, transport] = type.split('.');
        // remove leading '_'
        this.service = service.slice(1);
        this.transport = transport.slice(1);
        this.ipv = protocol === PROTO_INET6 ? 'IPv6' : 'IPv4';
        this.txt = AvahiService.parseText(txt);
    }
    match(iface, protocol, name, type, domain) {
        return this.iface === iface && this.protocol === protocol &&
            this.name === name && this.type === type && this.domain === domain;
    }
    static parseText(txt) {
        const result = new Object();
        if (txt) {
            txt.forEach(v => {
                // dbus-next is supposed to treat array of bytes as buffer but
                // it currently treats it as a regular array of numbers.
                if (!(v instanceof Buffer)) {
                    v = Buffer.from(v);
                }
                const [key, value] = v.toString().split(/=/);
                result[key] = value;
            });
        }
        return result;
    }
}
//# sourceMappingURL=avahi.js.map
"use strict";
// This implements the interface from the 'bonjour' npm package using the
// dns-sd command. Not all features are implemented.
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
const events = require("events");
const dns = require("./dnssd-client");
function getInstance() {
    if (!dns.checkDaemonRunning()) {
        throw new Error('Could not find mDNSResponder');
    }
    return new DnssdClient();
}
exports.getInstance = getInstance;
class DnssdClient {
    constructor() {
        this.destroyOps = new Array();
    }
    // interface method implementation
    createBrowser(options) {
        const browser = new DnssdBrowser(this, options);
        return Promise.resolve(browser);
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
class DnssdBrowser extends events.EventEmitter {
    constructor(dnssd, options) {
        super();
        this.dnssd = dnssd;
        this.options = options;
        this.services = new Array();
        this.destroyOp = this.dnssd.pushDestroyOp(() => this.destroy());
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const regType = `_${this.options.service}._${this.options.transport || 'tcp'}`;
            const domain = ''; // TODO: is this part of options?
            this.service = yield dns.Service.browse(0, 0, regType, domain, (s, f, i, e, n, t, d) => __awaiter(this, void 0, void 0, function* () {
                if (e) {
                    this.emit('error', new dns.ServiceError(e, 'Error while browsing.'));
                    return;
                }
                if (f & dns.ServiceFlags.Add) {
                    const resolveService = yield s.resolve(0, i, n, t, d, (s, f, i, e, fn, h, p, txt) => __awaiter(this, void 0, void 0, function* () {
                        if (e) {
                            this.emit('error', new dns.ServiceError(e, 'Resolving service failed.'));
                            return;
                        }
                        const addrService = yield s.getAddrInfo(0, i, dns.ServiceProtocol.IPv6, h, (s, f, i, e, h, a, ttl) => {
                            if (e) {
                                this.emit('error', new dns.ServiceError(e, 'Querying service failed.'));
                                return;
                            }
                            if (this.services.findIndex(v => v.iface === i && v.name === n && v.type === t && v.domain === d.replace(/\.$/, '')) !== -1) {
                                // ignore duplicates
                                return;
                            }
                            const service = new DnssdService(i, n, t, d, h, a, p, txt);
                            this.services.push(service);
                            this.emit('added', service);
                        });
                        yield addrService.processResult();
                        addrService.destroy();
                    }));
                    yield resolveService.processResult();
                    resolveService.destroy();
                }
                else {
                    const index = this.services.findIndex(s => s.match(i, n, t, d));
                    if (index >= 0) {
                        const [service] = this.services.splice(index, 1);
                        this.emit('removed', service);
                    }
                }
            }));
            // process received results in the background
            (() => __awaiter(this, void 0, void 0, function* () {
                while (this.service) {
                    try {
                        yield this.service.processResult();
                    }
                    catch (err) {
                        this.emit('error', err);
                    }
                }
            }))();
        });
    }
    stop() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            (_a = this.service) === null || _a === void 0 ? void 0 : _a.destroy();
            this.service = undefined;
        });
    }
    destroy() {
        this.removeAllListeners();
        this.stop();
        this.dnssd.popDestroyOp(this.destroyOp);
    }
}
class DnssdService extends events.EventEmitter {
    constructor(iface, name, type, domain, host, address, port, txt) {
        super();
        this.iface = iface;
        this.name = name;
        this.type = type;
        this.address = address;
        this.port = port;
        const [service, transport] = type.split('.');
        // remove leading '_'
        this.service = service.slice(1);
        this.transport = transport.slice(1);
        // strip trailing '.'
        this.host = host.replace(/\.$/, '');
        this.domain = domain.replace(/\.$/, '');
        this.ipv = 'IPv6';
        this.txt = DnssdService.parseText(txt);
    }
    match(iface, name, type, domain) {
        return this.iface === iface && this.name === name && this.type === type && this.domain === domain;
    }
    static parseText(txt) {
        const result = new Object();
        if (!txt) {
            return result;
        }
        txt.forEach(v => {
            const [key, value] = v.split(/=/);
            result[key] = value;
        });
        return result;
    }
}
//# sourceMappingURL=dnssd.js.map
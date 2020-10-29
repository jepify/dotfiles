"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const compareVersions = require("compare-versions");
const events = require("events");
const readline = require("readline");
const Observable = require("zen-observable");
const minBrickdVersion = '1.1.0';
const maxBrickdVersion = '2.0.0';
var BrickdConnectionState;
(function (BrickdConnectionState) {
    BrickdConnectionState[BrickdConnectionState["start"] = 0] = "start";
    BrickdConnectionState[BrickdConnectionState["handshake"] = 1] = "handshake";
    BrickdConnectionState[BrickdConnectionState["watchPower"] = 2] = "watchPower";
    BrickdConnectionState[BrickdConnectionState["getBatteryVoltage"] = 3] = "getBatteryVoltage";
    BrickdConnectionState[BrickdConnectionState["getSerialNum"] = 4] = "getSerialNum";
    BrickdConnectionState[BrickdConnectionState["ok"] = 5] = "ok";
    BrickdConnectionState[BrickdConnectionState["bad"] = 6] = "bad";
})(BrickdConnectionState || (BrickdConnectionState = {}));
/**
 * Connection to a brickd server.
 */
class Brickd extends events.EventEmitter {
    constructor(channel) {
        super();
        this.channel = channel;
        this._serialNumber = '';
        const reader = readline.createInterface(channel);
        const observable = new Observable(observer => {
            reader.on('line', line => {
                observer.next(line);
            }).on('close', () => {
                observer.complete();
            });
        });
        let state = BrickdConnectionState.start;
        observable.forEach(line => {
            const [m1, ...m2] = line.split(' ');
            // emit messages
            if (m1 === "MSG") {
                this.emit('message', m2.join(' '));
                return;
            }
            // everything else is handled from state machine
            switch (state) {
                case BrickdConnectionState.start:
                    if (m1 === "BRICKD") {
                        const version = m2[1];
                        if (compareVersions(version, minBrickdVersion) < 0) {
                            state = BrickdConnectionState.bad;
                            this.emit('error', new Error(`Brickd is too old. Please upgrade to version >= ${minBrickdVersion}`));
                            break;
                        }
                        if (compareVersions(version, maxBrickdVersion) >= 0) {
                            state = BrickdConnectionState.bad;
                            this.emit('error', new Error('Brickd version is too new.'));
                            break;
                        }
                        state = BrickdConnectionState.handshake;
                        channel.write('YOU ARE A ROBOT\n');
                    }
                    else {
                        state = BrickdConnectionState.bad;
                        this.emit('error', new Error('Brickd server did not send expected welcome message.'));
                    }
                    break;
                case BrickdConnectionState.handshake:
                    if (m1 === "OK") {
                        state = BrickdConnectionState.watchPower;
                        channel.write("WATCH POWER\n");
                    }
                    else if (m1 === "BAD") {
                        state = BrickdConnectionState.bad;
                        this.emit('error', new Error("Brickd handshake failed."));
                    }
                    break;
                case BrickdConnectionState.watchPower:
                    if (m1 === "OK") {
                        state = BrickdConnectionState.getBatteryVoltage;
                        channel.write("GET system.battery.voltage\n");
                    }
                    else {
                        state = BrickdConnectionState.bad;
                        this.emit('error', new Error("Brickd failed to register for power events."));
                    }
                    break;
                case BrickdConnectionState.getBatteryVoltage:
                    if (m1 === "OK") {
                        this.emit('message', `PROPERTY system.battery.voltage ${m2.join(' ')}`);
                        state = BrickdConnectionState.getSerialNum;
                        channel.write("GET system.info.serial\n");
                    }
                    else {
                        state = BrickdConnectionState.bad;
                        this.emit('error', new Error("Brickd failed to get battery voltage"));
                    }
                    break;
                case BrickdConnectionState.getSerialNum:
                    if (m1 === "OK") {
                        this._serialNumber = m2.join(' ');
                        state = BrickdConnectionState.ok;
                        this.emit('ready');
                    }
                    else {
                        state = BrickdConnectionState.bad;
                        this.emit('error', new Error("Brickd failed to get serial number"));
                    }
                    break;
            }
        });
    }
    /**
     * Gets the serial number of the main board.
     */
    get serialNumber() {
        return this._serialNumber;
    }
}
exports.Brickd = Brickd;
//# sourceMappingURL=brickd.js.map
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
const avahi = require("./dnssd/avahi");
const dnssd = require("./dnssd/dnssd");
const bonjour = require("./dnssd/bonjour");
/**
 * Gets in instance of the Bonjour interface.
 *
 * It will try to use a platform-specific implementation. Or if one is not
 * present, it falls back to a pure js implementation.
 */
function getInstance() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield avahi.getInstance();
        }
        catch (err) {
            try {
                return dnssd.getInstance();
            }
            catch (err) {
                // fall back to pure-javascript implementation
                return bonjour.getInstance();
            }
        }
    });
}
exports.getInstance = getInstance;
//# sourceMappingURL=dnssd.js.map
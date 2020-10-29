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
const vscode = require("vscode");
const temp = require("temp");
const fs = require("fs");
const os = require("os");
const util_1 = require("util");
const toastDuration = 5000;
function sanitizedDateString(date) {
    const d = date || new Date();
    const pad = (num) => ("00" + num).slice(-2);
    // Months are zero-indexed
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}
exports.sanitizedDateString = sanitizedDateString;
const tempDirs = {};
function getSharedTempDir(sharedKey) {
    if (tempDirs[sharedKey]) {
        return Promise.resolve(tempDirs[sharedKey]);
    }
    return new Promise((resolve, reject) => {
        temp.track();
        temp.mkdir(sharedKey, (err, dirPath) => {
            if (err) {
                reject(err);
            }
            else {
                tempDirs[sharedKey] = dirPath;
                resolve(dirPath);
            }
        });
    });
}
exports.getSharedTempDir = getSharedTempDir;
function openAndRead(path, offset, length, position) {
    return new Promise((resolve, reject) => {
        fs.open(path, 'r', (err, fd) => {
            if (err) {
                reject(err);
                return;
            }
            const buffer = new Buffer(length);
            fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
                fs.close(fd, err => console.log(err));
                if (err) {
                    reject(err);
                    return;
                }
                resolve(buffer);
            });
        });
    });
}
exports.openAndRead = openAndRead;
function verifyFileHeader(filePath, expectedHeader, offset = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        const bufferExpectedHeader = util_1.isArray(expectedHeader) ? new Buffer(expectedHeader) : expectedHeader;
        const header = yield openAndRead(filePath, 0, bufferExpectedHeader.length, offset);
        return header.compare(bufferExpectedHeader) === 0;
    });
}
exports.verifyFileHeader = verifyFileHeader;
function toastStatusBarMessage(message) {
    vscode.window.setStatusBarMessage(message, toastDuration);
}
exports.toastStatusBarMessage = toastStatusBarMessage;
/**
 * Sets a context that can be use for when clauses in package.json
 *
 * This may become official vscode API some day.
 * https://github.com/Microsoft/vscode/issues/10471
 * @param context The context name
 */
function setContext(context, state) {
    vscode.commands.executeCommand('setContext', context, state);
}
exports.setContext = setContext;
/**
 * Gets the runtime platform suitable for use in settings lookup.
 */
function getPlatform() {
    let platform;
    switch (os.platform()) {
        case 'win32':
            platform = 'windows';
            break;
        case 'darwin':
            platform = 'osx';
            break;
        case 'linux':
            platform = 'linux';
            break;
    }
    return platform;
}
exports.getPlatform = getPlatform;
//# sourceMappingURL=utils.js.map
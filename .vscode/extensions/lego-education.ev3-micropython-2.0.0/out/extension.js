"use strict";
// SPDX-License-Identifier: MIT
// Author: David Lechner <david@lechnology.com>
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
const path = require("path");
const os = require("os");
const vscode = require("vscode");
let _context;
/**
 * Gets the path name of a folder based on configuration settings and possibly
 * user input.
 * @returns The path of the folder or undefined if the user canceled the folder
 * selection dialog.
 */
function getNewProjectParentFolder() {
    return __awaiter(this, void 0, void 0, function* () {
        const config = vscode.workspace.getConfiguration("ev3-micropython");
        const defaultDir = (config.get("defaultNewProjectFolder") || os.homedir()).replace(/^~/, os.homedir());
        if (!config.get("showNewProjectFolderPicker", true)) {
            return defaultDir;
        }
        // use the last folder selected if any or the directory from the configuration options
        const defaultFolder = _context.globalState.get("lastNewProjectParentFolder", defaultDir);
        const uris = yield vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: vscode.Uri.file(defaultFolder),
            openLabel: "Select Folder",
        });
        if (!uris || uris.length === 0) {
            // canceled
            return undefined;
        }
        const selectedFolder = uris[0].fsPath;
        // remember the folder we selected for next time
        yield _context.globalState.update("lastNewProjectParentFolder", selectedFolder);
        return selectedFolder;
    });
}
/**
 * Wrapper around fs.mkdir()
 * @param pathName The directory path to create.
 */
function mkdir(pathName) {
    return new Promise((resolve, reject) => {
        fs.mkdir(pathName, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
/**
 * Recursively create a new directory.
 * @param pathName The directory path name.
 */
function mkdirp(pathName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mkdir(pathName);
        }
        catch (err) {
            // ENOENT means the parent directory does not exist
            if (err.code !== "ENOENT") {
                // any other error is passed along
                throw err;
            }
            // create the parent directory, then try creating pathName again.
            yield mkdirp(path.dirname(pathName));
            yield mkdirp(pathName);
        }
    });
}
function readdir(pathName) {
    return new Promise((resolve, reject) => {
        fs.readdir(pathName, (err, files) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(files);
        });
    });
}
function stat(pathName) {
    return new Promise((resolve, reject) => {
        fs.stat(pathName, (err, stats) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(stats);
        });
    });
}
function copyFile(src, dest) {
    return new Promise((resolve, reject) => {
        fs.copyFile(src, dest, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
/**
 * Copies a directory recursively.
 * @param src The source directory.
 * @param dest The destination directory.
 */
function copyDir(src, dest) {
    return __awaiter(this, void 0, void 0, function* () {
        const items = yield readdir(src);
        for (const key in items) {
            if (items.hasOwnProperty(key)) {
                const item = items[key];
                const itemSrc = path.join(src, item);
                const itemDest = path.join(dest, item);
                const stats = yield stat(itemSrc);
                if (stats.isDirectory()) {
                    yield mkdir(itemDest);
                    yield copyDir(itemSrc, itemDest);
                }
                else {
                    yield copyFile(itemSrc, itemDest);
                }
            }
        }
    });
}
/**
 * Creates a new project directory and opens it.
 * @param name Optional project name.
 */
function newProject(name, template = "new_project") {
    return __awaiter(this, void 0, void 0, function* () {
        const projectName = yield vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "ex: my_project",
            value: name,
            prompt: "Enter project name",
            validateInput: function (value) {
                if (value.match(/^[A-Za-z0-9_]+$/g)) {
                    return undefined;
                }
                return "Name can only contain letters, numbers and underscore";
            },
        });
        // undefined value indicates that input box was canceled
        if (!projectName) {
            return;
        }
        const projectParentDir = yield getNewProjectParentFolder();
        if (!projectParentDir) {
            return;
        }
        const projectDir = path.join(projectParentDir, projectName);
        try {
            yield mkdirp(projectDir);
        }
        catch (err) {
            let message;
            switch (err.code) {
                case "EEXIST":
                    message = `Cannot create project. Directory already exists at '${projectDir}'. Use a different name.`;
                    break;
                default:
                    message = `Failed to create directory '${projectDir}'. ${err.message}`;
                    break;
            }
            const tryAgain = "Try again";
            const response = yield vscode.window.showErrorMessage(message, tryAgain);
            if (response === tryAgain) {
                newProject(projectName, template);
            }
            return;
        }
        try {
            const templateDir = path.join(_context.extensionPath, "resources", "projects", template);
            yield copyDir(templateDir, projectDir);
            yield vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(projectDir));
        }
        catch (err) {
            yield vscode.window.showErrorMessage(err.message);
        }
    });
}
let exampleBrowserPanel;
// Opens a webview for browsing example projects
function showExampleBrowser() {
    if (exampleBrowserPanel === undefined) {
        const resourceUri = vscode.Uri.file(path.join(_context.extensionPath, "resources"));
        exampleBrowserPanel = vscode.window.createWebviewPanel("ev3-micropython.examples", "Example Projects", vscode.ViewColumn.One, {
            localResourceRoots: [resourceUri],
            enableCommandUris: true,
        });
        exampleBrowserPanel.onDidDispose(() => {
            exampleBrowserPanel = undefined;
        });
        const styleUri = exampleBrowserPanel.webview.asWebviewUri(resourceUri.with({
            path: path.posix.join(resourceUri.path, "css", "custom.css"),
        }));
        const openExampleUri = vscode.Uri.parse(`command:ev3-micropython.openExample`);
        function openExampleCommand(name) {
            return openExampleUri.with({
                query: encodeURIComponent(JSON.stringify([name])),
            });
        }
        function imageUrl(name) {
            return exampleBrowserPanel.webview.asWebviewUri(resourceUri.with({
                path: path.posix.join(resourceUri.path, "images", "projects", name),
            }));
        }
        function openExampleLink(project, displayName) {
            const tooltip = `Click to create a new ${displayName} project`;
            return `
                <div>
                    <a href="${openExampleCommand(project)}">
                        <span title="${tooltip}">
                            <img src="${imageUrl(project)}.jpg" />
                        </span>
                    </a>
                </div>
                <div class="title">
                    <a href="${openExampleCommand(project)}">
                        <span title="${tooltip}">${displayName}</span>
                    </a>
                </div>
            `;
        }
        exampleBrowserPanel.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Example Projects</title>
        <link rel="stylesheet" type="text/css" href="${styleUri}">
    </head>
    <body>
        <table>
            <tr>
                <td colspan=2>
                    <h1 class="title">Basic Examples</h1>
                </td>
            </tr>
            <tr>
                <td>
                    ${openExampleLink("new_project", "New Project")}
                </td>
                <td>
                    ${openExampleLink("datalog", "Data Logging Project")}
                </td>
            </tr>
            <tr>
                <td>
                    ${openExampleLink("buttons_quickstart", "Mission Button Menu")}
                </td>
                <td>
                    ${openExampleLink("robot_educator_basic", "Basic Movement")}
                </td>
            </tr>
            <tr>
                <td colspan=2>
                    <h1 class="title">Using Sensors</h1>
                </td>
            </tr>
            <tr>
                <td>
                    ${openExampleLink("robot_educator_ultrasonic", "Obstacle Avoidance")}
                </td>
                <td>
                    ${openExampleLink("robot_educator_line", "Line Following")}
                </td>
            </tr>
            <tr>
                <td colspan=2>
                    <h1 class="title">LEGO® MINDSTORMS® Education EV3 Core Set Models</h1>
                </td>
            </tr>
            <tr>
                <td>
                    ${openExampleLink("color_sorter", "Color Sorter")}
                </td>
                <td>
                    ${openExampleLink("puppy", "Puppy")}
                </td>
            </tr>
            <tr>
                <td>
                    ${openExampleLink("gyro_boy", "Gyro Boy")}
                </td>
                <td>
                    ${openExampleLink("robot_arm", "Robot Arm")}
                </td>
            </tr>
            <tr>
                <td colspan=2>
                    <h1 class="title">LEGO® MINDSTORMS® Education EV3 Expansion Set Models</h1>
                </td>
            </tr>
            <tr>
                <td>
                    ${openExampleLink("elephant", "Elephant")}
                </td>
                <td>
                    ${openExampleLink("stair_climber", "Stair Climber")}
                </td>
            </tr>
            <tr>
                <td>
                    ${openExampleLink("tank_bot", "Tank Bot")}
                </td>
                <td>
                    ${openExampleLink("znap", "Znap")}
                </td>
            </tr>
        </table>
    </body>
    </html>`;
    }
    else {
        exampleBrowserPanel.reveal();
    }
}
function openExample(arg) {
    const name = String(arg);
    newProject(name, name);
}
/**
 * Opens the online version of the documentation.
 */
function openOfflineDocs() {
    const docPath = _context.asAbsolutePath(path.join("resources", "docs", "index.html"));
    const uri = vscode.Uri.file(docPath);
    vscode.env.openExternal(uri);
}
// activities that appear in the view container
const activities = [
    {
        id: "ev3-micropython.activity.newProject",
        command: {
            command: "ev3-micropython.newProject",
            title: "new project",
        },
        label: "Create a new project",
    },
    {
        id: "ev3-micropython.activity.showExampleBrowser",
        command: {
            command: "ev3-micropython.showExampleBrowser",
            title: "explore example projects",
        },
        label: "Explore example projects",
    },
    {
        id: "ev3-micropython.activity.openOfflineDocs",
        command: {
            command: "ev3-micropython.openOfflineDocs",
            title: "open offline docs",
        },
        label: "Open user guide",
    },
];
// trivial tree provider for activities
const activitiesProvider = {
    getChildren: function (element) {
        if (element) {
            return undefined;
        }
        return activities;
    },
    getTreeItem: function (element) {
        return element;
    },
};
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    _context = context;
    context.subscriptions.push(vscode.commands.registerCommand("ev3-micropython.newProject", newProject), vscode.commands.registerCommand("ev3-micropython.showExampleBrowser", showExampleBrowser), vscode.commands.registerCommand("ev3-micropython.openExample", openExample), vscode.commands.registerCommand("ev3-micropython.openOfflineDocs", openOfflineDocs), vscode.window.registerTreeDataProvider("ev3-micropython.activities", activitiesProvider));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
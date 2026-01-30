import { fs } from "@zenfs/core";
import {
    requestBusyState,
    releaseBusyState,
} from "../../utils/busyStateManager.js";
import { ShowDialogWindow } from "../../components/DialogWindow.js";
import { showInputDialog } from "./components/InputDialog.js";
import { handleFileSystemError } from "./utils/ErrorHandler.js";
import { joinPath, normalizePath, getPathName, getParentPath } from "./utils/PathUtils.js";
import ZenClipboardManager from "./utils/ZenClipboardManager.js";
import { RecycleBinManager } from "./utils/RecycleBinManager.js";
import ZenUndoManager from "./utils/ZenUndoManager.js";
import ZenLayoutManager from "./utils/ZenLayoutManager.js";

/**
 * FileOperations - Handles file system operations with user interaction
 */

export class FileOperations {
    constructor(app) {
        this.app = app;
    }

    /**
     * Cut items to clipboard
     * @param {Array<string>} paths - Paths to cut
     */
    cutItems(paths) {
        if (paths.length === 0) return;
        ZenClipboardManager.set(paths, "cut");
    }

    /**
     * Copy items to clipboard
     * @param {Array<string>} paths - Paths to copy
     */
    copyItems(paths) {
        if (paths.length === 0) return;
        ZenClipboardManager.set(paths, "copy");
    }

    /**
     * Paste items from clipboard
     * @param {string} destinationPath - Path to paste into
     */
    async pasteItems(destinationPath) {
        const { items, operation } = ZenClipboardManager.get();
        if (items.length === 0) return;

        // If pasting into Recycle Bin, it's a recycle operation
        if (RecycleBinManager.isRecycleBinPath(destinationPath)) {
            const { ProgressBarDialogWindow } = await import("./components/ProgressBarDialogWindow.js");
            const totalSize = await this.getTotalSize(items);
            const dialog = new ProgressBarDialogWindow("recycle", items.length, totalSize);
            try {
                await RecycleBinManager.moveItemsToRecycleBin(items, dialog);
                if (operation === "cut") ZenClipboardManager.clear();
            } finally {
                dialog.close();
            }
            return;
        }

        // If pasting FROM Recycle Bin, it's a restore operation (effectively)
        if (items.some(p => RecycleBinManager.isRecycledItemPath(p))) {
            await this.restoreItems(items);
            if (operation === "cut") ZenClipboardManager.clear();
            return;
        }

        const { ProgressBarDialogWindow } = await import("./components/ProgressBarDialogWindow.js");
        const totalSize = await this.getTotalSize(items);
        const dialog = new ProgressBarDialogWindow(operation, items.length, totalSize);

        try {
            if (operation === "cut") {
                await this.moveItemsDirect(items, destinationPath, {}, dialog);
                ZenClipboardManager.clear();
            } else if (operation === "copy") {
                await this.copyItemsDirect(items, destinationPath, {}, dialog);
            }
        } finally {
            dialog.close();
        }
    }

    /**
     * Move items directly to a destination
     * @param {Array<string>} sourcePaths
     * @param {string} destinationPath
     * @param {Object} options
     * @param {ProgressBarDialogWindow} dialog
     */
    async moveItemsDirect(sourcePaths, destinationPath, options = {}, dialog = null) {
        const targetPaths = [];
        try {
            for (const itemPath of sourcePaths) {
                if (dialog && dialog.cancelled) break;

                const itemName = getPathName(itemPath);
                const targetPath = await this.getUniquePastePath(destinationPath, itemName, "cut");

                if (dialog) {
                    const stats = await fs.promises.stat(itemPath);
                    const sourceDir = getParentPath(itemPath);
                    dialog.update(itemPath, sourceDir, destinationPath, 0);

                    await fs.promises.rename(itemPath, targetPath);

                    const itemSize = stats.isDirectory() ? 0 : stats.size;
                    dialog.finishItem(itemSize);
                    dialog.update(itemPath, sourceDir, destinationPath, 0);
                } else {
                    await fs.promises.rename(itemPath, targetPath);
                }

                targetPaths.push(targetPath);
            }

            // Save positions if provided
            if (options.dropX !== undefined && options.dropY !== undefined) {
                const positions = {};
                targetPaths.forEach((path, i) => {
                    const name = getPathName(path);
                    const offset = options.offsets ? options.offsets[i] : { x: i * 10, y: i * 10 };
                    positions[name] = { x: options.dropX + offset.x, y: options.dropY + offset.y };
                });
                await ZenLayoutManager.updateItemPositions(destinationPath, positions, this.app.win.element.id);
            }

            ZenUndoManager.push({
                type: 'move',
                data: { from: sourcePaths, to: targetPaths }
            });

            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        } catch (e) {
            handleFileSystemError("move", e, "items");
            throw e;
        }
    }

    /**
     * Copy items directly to a destination
     * @param {Array<string>} sourcePaths
     * @param {string} destinationPath
     * @param {Object} options
     * @param {ProgressBarDialogWindow} dialog
     */
    async copyItemsDirect(sourcePaths, destinationPath, options = {}, dialog = null) {
        const targetPaths = [];
        try {
            for (const itemPath of sourcePaths) {
                if (dialog && dialog.cancelled) break;

                const itemName = getPathName(itemPath);
                const targetPath = await this.getUniquePastePath(destinationPath, itemName, "copy");
                await this.copyRecursive(itemPath, targetPath, dialog);
                targetPaths.push(targetPath);
            }

            // Save positions if provided
            if (options.dropX !== undefined && options.dropY !== undefined) {
                const positions = {};
                targetPaths.forEach((path, i) => {
                    const name = getPathName(path);
                    const offset = options.offsets ? options.offsets[i] : { x: i * 10, y: i * 10 };
                    positions[name] = { x: options.dropX + offset.x, y: options.dropY + offset.y };
                });
                await ZenLayoutManager.updateItemPositions(destinationPath, positions, this.app.win.element.id);
            }

            ZenUndoManager.push({
                type: 'copy',
                data: { created: targetPaths }
            });

            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        } catch (e) {
            handleFileSystemError("copy", e, "items");
            throw e;
        }
    }

    /**
     * Get a unique path for pasting to avoid collisions
     * @private
     */
    async getUniquePastePath(destPath, originalName, operation) {
        let checkPath = normalizePath(joinPath(destPath, originalName));
        try {
            await fs.promises.stat(checkPath);
            // If it doesn't throw, it exists. We need a new name.
        } catch (e) {
            // Doesn't exist, we can use it.
            return checkPath;
        }

        if (operation === "cut") {
            let name = originalName;
            let counter = 1;
            const extensionIndex = originalName.lastIndexOf('.');
            const hasExtension = extensionIndex > 0;
            const baseName = hasExtension ? originalName.substring(0, extensionIndex) : originalName;
            const ext = hasExtension ? originalName.substring(extensionIndex) : '';

            while (true) {
                name = hasExtension ? `${baseName} (${counter})${ext}` : `${originalName} (${counter})`;
                checkPath = normalizePath(joinPath(destPath, name));
                try {
                    await fs.promises.stat(checkPath);
                    counter++;
                } catch (e) {
                    return checkPath;
                }
            }
        } else {
            // Windows-style copy naming: "Copy of X", "Copy (2) of X", etc.
            const copyNOfRegex = /^Copy \((\d+)\) of (.*)$/;
            const copyOfRegex = /^Copy of (.*)$/;

            let baseName = originalName;
            let match;
            if ((match = originalName.match(copyNOfRegex))) {
                baseName = match[2];
            } else if ((match = originalName.match(copyOfRegex))) {
                baseName = match[1];
            }

            let candidateName = `Copy of ${baseName}`;
            checkPath = normalizePath(joinPath(destPath, candidateName));
            try {
                await fs.promises.stat(checkPath);
                // "Copy of X" exists, try "Copy (2) of X", "Copy (3) of X", etc.
                let counter = 2;
                while (true) {
                    candidateName = `Copy (${counter}) of ${baseName}`;
                    checkPath = normalizePath(joinPath(destPath, candidateName));
                    try {
                        await fs.promises.stat(checkPath);
                        counter++;
                    } catch (e) {
                        return checkPath;
                    }
                }
            } catch (e) {
                return checkPath;
            }
        }
    }

    /**
     * Recursively copy a file or directory
     * @private
     */
    async copyRecursive(src, dest, dialog = null) {
        if (dialog && dialog.cancelled) return;

        const stats = await fs.promises.stat(src);
        if (stats.isDirectory()) {
            await fs.promises.mkdir(dest, { recursive: true });
            const files = await fs.promises.readdir(src);
            for (const file of files) {
                if (dialog && dialog.cancelled) return;
                await this.copyRecursive(joinPath(src, file), joinPath(dest, file), dialog);
            }
        } else {
            if (dialog) {
                await this.copyFileWithProgress(src, dest, stats.size, dialog);
                dialog.finishItem(stats.size);
            } else {
                const data = await fs.promises.readFile(src);
                await fs.promises.writeFile(dest, data);
            }
        }
    }

    /**
     * Copy a file with progress reporting
     * @private
     */
    async copyFileWithProgress(src, dest, totalSize, dialog) {
        const bufferSize = 64 * 1024; // 64KB
        const buffer = new Uint8Array(bufferSize);
        let bytesReadTotal = 0;

        const handleIn = await fs.promises.open(src, 'r');
        const handleOut = await fs.promises.open(dest, 'w');

        try {
            const sourceDir = getParentPath(src);
            const destDir = getParentPath(dest);

            while (bytesReadTotal < totalSize) {
                if (dialog && dialog.cancelled) break;

                const { bytesRead } = await handleIn.read(buffer, 0, bufferSize, bytesReadTotal);
                if (bytesRead === 0) break;

                await handleOut.write(buffer, 0, bytesRead, bytesReadTotal);
                bytesReadTotal += bytesRead;

                if (dialog) {
                    dialog.update(src, sourceDir, destDir, bytesReadTotal);
                }

                // Yield occasionally
                if (bytesReadTotal % (bufferSize * 16) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        } finally {
            await handleIn.close();
            await handleOut.close();
        }
    }

    /**
     * Get total size of items
     * @private
     */
    async getTotalSize(paths) {
        let total = 0;
        for (const path of paths) {
            try {
                const stats = await fs.promises.stat(path);
                if (stats.isDirectory()) {
                    total += await this._getRecursiveSize(path);
                } else {
                    total += stats.size;
                }
            } catch (e) {
                console.error("Error getting size for", path, e);
            }
        }
        return total;
    }

    /**
     * Get recursive size of a directory
     * @private
     */
    async _getRecursiveSize(path) {
        let size = 0;
        try {
            const files = await fs.promises.readdir(path);
            for (const file of files) {
                const fullPath = joinPath(path, file);
                const stats = await fs.promises.stat(fullPath);
                if (stats.isDirectory()) {
                    size += await this._getRecursiveSize(fullPath);
                } else {
                    size += stats.size;
                }
            }
        } catch (e) {
            console.error("Error in _getRecursiveSize", e);
        }
        return size;
    }

    /**
     * Delete items with confirmation dialog
     * @param {Array<string>} paths - Paths to delete
     * @param {boolean} permanent - Whether to bypass Recycle Bin
     */
    async deleteItems(paths, permanent = false) {
        if (paths.length === 0) return;

        // If items are already in Recycle Bin, deletion is always permanent
        const alreadyInRecycle = paths.some(path => RecycleBinManager.isRecycledItemPath(path));
        const isPermanent = permanent || alreadyInRecycle;

        const message = isPermanent
            ? (paths.length === 1
                ? `Are you sure you want to permanently delete '${getPathName(paths[0])}'?`
                : `Are you sure you want to permanently delete these ${paths.length} items?`)
            : (paths.length === 1
                ? `Are you sure you want to send '${getPathName(paths[0])}' to the Recycle Bin?`
                : `Are you sure you want to send these ${paths.length} items to the Recycle Bin?`);

        ShowDialogWindow({
            title: "Confirm File Delete",
            text: message,
            parentWindow: this.app.win,
            modal: true,
            buttons: [
                {
                    label: "Yes",
                    isDefault: true,
                    action: async () => {
                        const busyId = `delete-${Math.random()}`;
                        requestBusyState(busyId, this.app.win.element);

                        const { ProgressBarDialogWindow } = await import("./components/ProgressBarDialogWindow.js");
                        const totalSize = await this.getTotalSize(paths);
                        const dialog = new ProgressBarDialogWindow(isPermanent ? "delete" : "recycle", paths.length, totalSize);

                        try {
                            if (isPermanent) {
                                for (const path of paths) {
                                    if (dialog.cancelled) break;
                                    await this.removeRecursiveWithProgress(path, dialog);
                                }
                                // If it was in recycle bin, we should also clean up metadata
                                if (alreadyInRecycle && !dialog.cancelled) {
                                    const metadata = await RecycleBinManager.getMetadata();
                                    let changed = false;
                                    for (const path of paths) {
                                        const id = getPathName(path);
                                        if (metadata[id]) {
                                            delete metadata[id];
                                            changed = true;
                                        }
                                    }
                                    if (changed) {
                                        await RecycleBinManager.saveMetadata(metadata);
                                        document.dispatchEvent(new CustomEvent("zen-recycle-bin-change"));
                                    }
                                }
                            } else {
                                const recycledIds = await RecycleBinManager.moveItemsToRecycleBin(paths, dialog);
                                if (recycledIds.length > 0) {
                                    ZenUndoManager.push({
                                        type: 'delete',
                                        data: { recycledIds }
                                    });
                                }
                            }

                            // If it was permanent and NOT in recycle bin, we need to refresh manually
                            // because no event was dispatched. If an event was dispatched,
                            // ZenExplorerApp already refreshed.
                            if (isPermanent && !alreadyInRecycle) {
                                await this.app.navigateTo(this.app.currentPath, true, true);
                                document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
                            }
                        } catch (e) {
                            handleFileSystemError("delete", e, "items");
                        } finally {
                            dialog.close();
                            releaseBusyState(busyId, this.app.win.element);
                        }
                    }
                },
                { label: "No" }
            ]
        });
    }

    /**
     * Rename item using inline rename
     * @param {string} fullPath - Full path to item
     */
    async renameItem(fullPath) {
        this.app.enterRenameModeByPath(fullPath);
    }

    /**
     * Create new folder with inline rename
     */
    async createNewFolder() {
        const busyId = `create-folder-${Math.random()}`;
        requestBusyState(busyId, this.app.win.element);
        try {
            const name = await this.getUniqueName(this.app.currentPath, "New Folder");
            const newPath = joinPath(this.app.currentPath, name);
            await fs.promises.mkdir(newPath);
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
            this.app.enterRenameModeByPath(newPath);
        } catch (e) {
            handleFileSystemError("create", e, "folder");
        } finally {
            releaseBusyState(busyId, this.app.win.element);
        }
    }

    /**
     * Create new text document with inline rename
     */
    async createNewTextFile() {
        const busyId = `create-file-${Math.random()}`;
        requestBusyState(busyId, this.app.win.element);
        try {
            const name = await this.getUniqueName(this.app.currentPath, "New Text Document", ".txt");
            const newPath = joinPath(this.app.currentPath, name);
            await fs.promises.writeFile(newPath, "");
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
            this.app.enterRenameModeByPath(newPath);
        } catch (e) {
            handleFileSystemError("create", e, "file");
        } finally {
            releaseBusyState(busyId, this.app.win.element);
        }
    }

    /**
     * Recursively remove a file or directory with progress reporting
     * @private
     */
    async removeRecursiveWithProgress(path, dialog) {
        if (dialog && dialog.cancelled) return;

        let stats;
        try {
            stats = await fs.promises.stat(path);
        } catch (e) {
            // If it doesn't exist, just return
            return;
        }

        const sourceDir = getParentPath(path);

        if (stats.isDirectory()) {
            const files = await fs.promises.readdir(path);
            for (const file of files) {
                if (dialog && dialog.cancelled) return;
                await this.removeRecursiveWithProgress(joinPath(path, file), dialog);
            }
            if (dialog && dialog.cancelled) return;
            await fs.promises.rmdir(path);
        } else {
            if (dialog) {
                dialog.update(path, sourceDir, null, 0);
            }
            await fs.promises.unlink(path);
            if (dialog) {
                dialog.finishItem(stats.size);
                dialog.update(path, sourceDir, null, 0);
            }
        }
    }

    /**
     * Get a unique name for a new item
     * @private
     */
    async getUniqueName(parentPath, baseName, extension = "") {
        let name = baseName + extension;
        let counter = 1;
        while (true) {
            const checkPath = joinPath(parentPath, name);
            try {
                await fs.promises.stat(checkPath);
                // Exists, try next
                counter++;
                name = `${baseName} (${counter})${extension}`;
            } catch (e) {
                // Doesn't exist, we can use it
                return name;
            }
        }
    }

    /**
     * Restore items from Recycle Bin with progress
     */
    async restoreItems(paths) {
        if (paths.length === 0) return;

        const busyId = `restore-${Math.random()}`;
        requestBusyState(busyId, this.app.win.element);

        const { ProgressBarDialogWindow } = await import("./components/ProgressBarDialogWindow.js");
        const totalSize = await this.getTotalSize(paths);
        const dialog = new ProgressBarDialogWindow("restore", paths.length, totalSize);

        try {
            const ids = paths.map(p => getPathName(p));
            await RecycleBinManager.restoreItems(ids, dialog);
        } catch (e) {
            handleFileSystemError("restore", e, "items");
        } finally {
            dialog.close();
            releaseBusyState(busyId, this.app.win.element);
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        }
    }

    /**
     * Empty the Recycle Bin with progress
     */
    async emptyRecycleBin() {
        const isEmpty = await RecycleBinManager.isEmpty();
        if (isEmpty) return;

        ShowDialogWindow({
            title: "Confirm Empty Recycle Bin",
            text: "Are you sure you want to permanently delete all items in the Recycle Bin?",
            parentWindow: this.app.win,
            modal: true,
            buttons: [
                {
                    label: "Yes",
                    isDefault: true,
                    action: async () => {
                        const busyId = `empty-recycle-${Math.random()}`;
                        requestBusyState(busyId, this.app.win.element);

                        const metadata = await RecycleBinManager.getMetadata();
                        const ids = Object.keys(metadata);
                        const paths = ids.map(id => joinPath("/C:/Recycled", id));

                        const { ProgressBarDialogWindow } = await import("./components/ProgressBarDialogWindow.js");
                        const totalSize = await this.getTotalSize(paths);
                        const dialog = new ProgressBarDialogWindow("empty", ids.length, totalSize);

                        try {
                            await RecycleBinManager.emptyRecycleBin(dialog);
                            const { playSound } = await import("../../utils/soundManager.js");
                            playSound("EmptyRecycleBin");
                        } catch (e) {
                            handleFileSystemError("delete", e, "items");
                        } finally {
                            dialog.close();
                            releaseBusyState(busyId, this.app.win.element);
                            await this.app.navigateTo(this.app.currentPath, true, true);
                        }
                    }
                },
                { label: "No" }
            ]
        });
    }

    /**
     * Undo the last file operation
     */
    async undo() {
        const op = ZenUndoManager.peek();
        if (!op) return;

        const busyId = `undo-${Math.random()}`;
        requestBusyState(busyId, this.app.win.element);
        try {
            switch (op.type) {
                case 'rename':
                    await this._undoRename(op.data);
                    break;
                case 'move':
                    await this._undoMove(op.data);
                    break;
                case 'copy':
                    await this._undoCopy(op.data);
                    break;
                case 'delete':
                    await this._undoDelete(op.data);
                    break;
                case 'create':
                    await this._undoCreate(op.data);
                    break;
            }
            ZenUndoManager.pop(); // Only pop if successful
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        } catch (e) {
            ShowDialogWindow({
                title: "Undo",
                text: `Could not undo operation: ${e.message}`,
                parentWindow: this.app.win,
                modal: true,
                buttons: [{ label: "OK" }]
            });
        } finally {
            releaseBusyState(busyId, this.app.win.element);
        }
    }

    async _undoRename(data) {
        // data: { from, to }
        try {
            await fs.promises.stat(data.from);
            throw new Error(`The destination already contains an item named '${getPathName(data.from)}'.`);
        } catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }
        await fs.promises.rename(data.to, data.from);
    }

    async _undoMove(data) {
        // data: { from: [], to: [] }
        // First check all collisions and existence
        for (let i = 0; i < data.to.length; i++) {
            const to = data.to[i];
            const from = data.from[i];

            await fs.promises.stat(to); // Ensure 'to' still exists

            try {
                await fs.promises.stat(from);
                throw new Error(`The destination already contains an item named '${getPathName(from)}'.`);
            } catch (e) {
                if (e.code !== 'ENOENT') throw e;
            }
        }

        // Perform the moves
        for (let i = 0; i < data.to.length; i++) {
            await fs.promises.rename(data.to[i], data.from[i]);
        }
    }

    async _undoCopy(data) {
        // data: { created: [] }
        for (const path of data.created) {
            try {
                await fs.promises.rm(path, { recursive: true });
            } catch (e) {
                // Ignore if already deleted
                if (e.code !== 'ENOENT') throw e;
            }
        }
    }

    async _undoDelete(data) {
        // data: { recycledIds: [] }
        await RecycleBinManager.restoreItems(data.recycledIds);
    }

    async _undoCreate(data) {
        // data: { path }
        try {
            await fs.promises.rm(data.path, { recursive: true });
        } catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }
    }
}

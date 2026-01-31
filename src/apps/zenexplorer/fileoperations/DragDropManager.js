import { openApps } from "../../Application.js";
import { getParentPath } from "../navigation/PathUtils.js";
import { RecycleBinManager } from "./RecycleBinManager.js";

export class DragDropManager {
    constructor() {
        this.isDragging = false;
        this.draggedItems = [];
        this.sourceApp = null;
        this.ghostElement = null;
        this.dropTarget = null;
        this.startX = 0;
        this.startY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    startDrag(iconElements, sourceApp, x, y) {
        if (this.isDragging) return;
        this.isDragging = true;
        this.draggedItems = iconElements.map(el => {
            const rect = el.getBoundingClientRect();
            return {
                element: el,
                path: el.getAttribute('data-path'),
                type: el.getAttribute('data-type'),
                offsetX: x - rect.left,
                offsetY: y - rect.top
            };
        });
        this.sourceApp = sourceApp;
        this.startX = x;
        this.startY = y;
        if (this.draggedItems.length > 0) {
            this.offsetX = this.draggedItems[0].offsetX;
            this.offsetY = this.draggedItems[0].offsetY;
        }
        this._createGhost(iconElements, x, y);
        this._boundMouseMove = this._handleMouseMove.bind(this);
        this._boundMouseUp = this._handleMouseUp.bind(this);
        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup', this._boundMouseUp);
        document.body.classList.add('dragging');
    }

    _createGhost(iconElements, x, y) {
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.style.position = 'fixed';
        ghost.style.left = `${x - this.offsetX}px`;
        ghost.style.top = `${y - this.offsetY}px`;
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '99999';
        ghost.style.opacity = '0.6';
        iconElements.forEach((el, index) => {
            const item = this.draggedItems[index];
            const clone = el.cloneNode(true);
            clone.classList.remove('selected');
            clone.classList.add('ghost-item');
            clone.style.position = 'absolute';
            clone.style.left = `${this.offsetX - item.offsetX}px`;
            clone.style.top = `${this.offsetY - item.offsetY}px`;
            clone.style.margin = '0';
            ghost.appendChild(clone);
        });
        document.body.appendChild(ghost);
        this.ghostElement = ghost;
    }

    _handleMouseMove(e) {
        if (!this.isDragging) return;
        if (this.ghostElement) {
            this.ghostElement.style.left = `${e.clientX - this.offsetX}px`;
            this.ghostElement.style.top = `${e.clientY - this.offsetY}px`;
        }
        this._updateDropTarget(e);
    }

    _updateDropTarget(e) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        let newTarget = null;
        for (const el of elements) {
            const icon = el.closest('.explorer-icon');
            if (icon) {
                const type = icon.getAttribute('data-type');
                if (type === 'directory') {
                    const targetPath = icon.getAttribute('data-path');
                    if (!this.draggedItems.some(item => item.path === targetPath || targetPath.startsWith(item.path + '/'))) {
                         const sourceDir = this.draggedItems[0] ? getParentPath(this.draggedItems[0].path) : null;
                         const targetDir = getParentPath(targetPath);
                         if (sourceDir === "/" && targetDir === "/") {}
                         else { newTarget = icon; break; }
                    }
                }
            }
            if (el.classList.contains('explorer-icon-view')) {
                const targetPath = el.getAttribute('data-current-path');
                if (targetPath) { newTarget = el; break; }
            }
        }
        if (this.dropTarget !== newTarget) {
            if (this.dropTarget) this.dropTarget.classList.remove('drop-target-highlight');
            this.dropTarget = newTarget;
            if (this.dropTarget && this.dropTarget.classList.contains('explorer-icon')) this.dropTarget.classList.add('drop-target-highlight');
        }
    }

    _handleMouseUp(e) {
        if (!this.isDragging) return;
        this._performDrop(e, e.ctrlKey);
        this._cleanup();
    }

    async _performDrop(e, isCopy) {
        const sourceApp = this.sourceApp;
        if (!this.dropTarget || !sourceApp) return;
        let destinationPath = null;
        let targetWindow = this.dropTarget.closest('.window');
        let targetApp = targetWindow ? openApps.get(targetWindow.id) : null;
        if (this.dropTarget.classList.contains('explorer-icon')) destinationPath = this.dropTarget.getAttribute('data-path');
        else if (this.dropTarget.classList.contains('explorer-icon-view')) destinationPath = this.dropTarget.getAttribute('data-current-path');
        if (!destinationPath) return;
        const sourcePaths = this.draggedItems.map(item => item.path);
        const offsets = this.draggedItems.map(item => ({ x: this.offsetX - item.offsetX, y: this.offsetY - item.offsetY }));
        let dropX = null, dropY = null;
        if (targetApp && targetApp.iconContainer) {
            const rect = targetApp.iconContainer.getBoundingClientRect();
            dropX = e.clientX - rect.left + targetApp.iconContainer.scrollLeft - this.offsetX;
            dropY = e.clientY - rect.top + targetApp.iconContainer.scrollTop - this.offsetY;
        }
        const sourceDir = sourcePaths[0].substring(0, sourcePaths[0].lastIndexOf('/')) || '/';
        if (!isCopy && destinationPath === sourceDir) {
            if (sourceApp.handleRearrange) await sourceApp.handleRearrange(sourcePaths, dropX, dropY, offsets);
            return;
        }
        if (sourceDir === "/") return;
        if (sourcePaths.some(p => RecycleBinManager.isRecycledItemPath(p))) {
            await sourceApp.fileOps.restoreItems(sourcePaths);
            return;
        }
        if (RecycleBinManager.isRecycleBinPath(destinationPath)) {
            const { ProgressBarDialogWindow } = await import("../interface/ProgressBarDialogWindow.js");
            const totalSize = await sourceApp.fileOps.getTotalSize(sourcePaths);
            const dialog = new ProgressBarDialogWindow("recycle", sourcePaths.length, totalSize);
            try { await RecycleBinManager.moveItemsToRecycleBin(sourcePaths, dialog); }
            finally { dialog.close(); }
            return;
        }
        const { ProgressBarDialogWindow } = await import("../interface/ProgressBarDialogWindow.js");
        const totalSize = await sourceApp.fileOps.getTotalSize(sourcePaths);
        const dialog = new ProgressBarDialogWindow(isCopy ? "copy" : "move", sourcePaths.length, totalSize);
        try {
            if (isCopy) await sourceApp.fileOps.copyItemsDirect(sourcePaths, destinationPath, { dropX, dropY, offsets }, dialog);
            else await sourceApp.fileOps.moveItemsDirect(sourcePaths, destinationPath, { dropX, dropY, offsets }, dialog);
        } catch (err) { console.error('Drop failed:', err); }
        finally { dialog.close(); }
    }

    _cleanup() {
        this.isDragging = false;
        if (this.ghostElement && this.ghostElement.parentElement) this.ghostElement.parentElement.removeChild(this.ghostElement);
        this.ghostElement = null;
        if (this.dropTarget) this.dropTarget.classList.remove('drop-target-highlight');
        this.dropTarget = null;
        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('mouseup', this._boundMouseUp);
        document.body.classList.remove('dragging');
        this.draggedItems = [];
        this.sourceApp = null;
    }
}
export default new DragDropManager();

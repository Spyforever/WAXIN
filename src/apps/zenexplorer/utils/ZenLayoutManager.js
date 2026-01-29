import { fs } from "@zenfs/core";
import { joinPath } from "./PathUtils.js";

/**
 * ZenLayoutManager - Manages folder layouts (icon positions and order)
 */
export const ZenLayoutManager = {
  /**
   * Get layout for a specific path
   * @param {string} path
   * @returns {Promise<Object>}
   */
  async getLayout(path) {
    const layoutPath = joinPath(path, ".zen_layout.json");
    try {
      const content = await fs.promises.readFile(layoutPath, "utf8");
      return JSON.parse(content);
    } catch (e) {
      // Default layout
      return {
        autoArrange: true,
        positions: {},
        order: [],
      };
    }
  },

  /**
   * Save layout for a specific path
   * @param {string} path
   * @param {Object} layout
   */
  async saveLayout(path, layout) {
    const layoutPath = joinPath(path, ".zen_layout.json");
    try {
      await fs.promises.writeFile(layoutPath, JSON.stringify(layout, null, 2));
      // Notify other windows
      document.dispatchEvent(
        new CustomEvent("zen-layout-change", { detail: { path } }),
      );
    } catch (e) {
      console.error("Failed to save layout:", e);
    }
  },

  /**
   * Update position for a single item
   * @param {string} path - Folder path
   * @param {string} name - Item name
   * @param {number} x
   * @param {number} y
   */
  async updateItemPosition(path, name, x, y) {
    const layout = await this.getLayout(path);
    layout.positions[name] = { x, y };
    await this.saveLayout(path, layout);
  },

  /**
   * Update positions for multiple items
   * @param {string} path - Folder path
   * @param {Object} positions - Map of name to {x, y}
   */
  async updateItemPositions(path, positions) {
    const layout = await this.getLayout(path);
    layout.positions = { ...layout.positions, ...positions };
    await this.saveLayout(path, layout);
  },
};

export default ZenLayoutManager;

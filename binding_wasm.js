import { getDefaultContext } from "@emnapi/runtime";

try {
    const wasm = await import("./prebuilds/leveldb_wasm.js");
    bindings = wasm.emnapiInit({ context: getDefaultContext() });
} catch (e) {
    console.error(e);
    console.warn("LevelDB ZLIB WASM not found.");
}

export default bindings;

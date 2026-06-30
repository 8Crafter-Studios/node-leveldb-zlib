const helper = require("./helpers/buildPath.js");
const path = require("path");
const debug = require("debug")("leveldb");

if (!process.versions.electron) {
    // Electron has its own crash handler, and segfault-handler
    // uses NAN which is a hassle, so only load outside electron
    try {
        const SegfaultHandler = require("segfault-handler");
        SegfaultHandler.registerHandler("crash.log");
    } catch (e) {
        debug(
            "[leveldb] segfault handler is not installed. If you run into crashing issues, install it with `npm i -D segfault-handler` to get debug info on native crashes"
        );
    }
}

let bindings;
const pathToSearch = helper.getPath(!process.env.VERSIONLESS_LEVELDB_ZLIB);
if (pathToSearch) {
    const rpath = path.join(__dirname, pathToSearch, "node-leveldb.node");
    try {
        bindings = require(rpath);
    } catch (e) {
        debug(e);
        debug("[leveldb] did not find lib in ", rpath);
        const rpathContainer = path.join(__dirname, pathToSearch, "../");
        try {
            const fs = require("fs");
            const files = fs.readdirSync(rpathContainer).filter((f) => fs.statSync(path.join(rpathContainer, f)).isDirectory());
            const mostSimilar = helper.findMostSimilarPath(files);
            if (mostSimilar) {
                const rpathMostSimilar = path.join(rpathContainer, mostSimilar, "node-leveldb.node");
                try {
                    bindings = require(rpathMostSimilar);
                    debug("[leveldb] loaded lib from most similar folder ", rpathMostSimilar);
                } catch (e2) {
                    debug(e2);
                    debug("[leveldb] did not find lib in ", rpathMostSimilar);
                }
            } else {
                debug("[leveldb] did not find any similar folder in ", rpathContainer);
            }
        } catch (e2) {
            debug(e2);
            debug("[leveldb] did not find matching subfolder with lib in ", rpathContainer);
        }
    }
}
if (!bindings) {
    bindings = require("bindings")("node-leveldb.node");
}

module.exports = bindings;


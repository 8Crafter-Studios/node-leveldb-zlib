// Some helpful pre-build enviornment checks
const fs = require("fs");
const cp = require("child_process");
const os = require("os");

const _osVersion = os.release();

const plat = process.platform;
const arch = process.arch;
const ver = _osVersion.split(".", 1)[0];

function checkIfPrebuildExists() {
    console.log(
        `[leveldb] platform details: ${plat}-${ver}-${arch}${process.env.LEVELDB_ZLIB_ARCH_OVERRIDE ? ` (with architecture override: ${process.env.LEVELDB_ZLIB_ARCH_OVERRIDE})` : ""}`
    );
    try {
        const bindings = require("./binding_node");
        if (!bindings) throw Error("Bindings are undefined");
        console.log("[leveldb] not building as already have prebuild");
        return true;
    } catch (e) {
        console.log(e);
        console.log("[leveldb] need to build");
    }
}

let runCmake = true;

if (!process.env.FORCE_BUILD && !process.env.BUILDING_WASM) {
    if (checkIfPrebuildExists()) {
        runCmake = false;
    }
}
if (process.env.SKIP_BUILD) {
    runCmake = false;
}

async function runChecks() {
    if (!fs.existsSync("./leveldb-mcpe/include")) {
        console.info("Cloning submodules...");
        cp.execSync("git submodule init", { stdio: "inherit" });
        cp.execSync("git submodule update", { stdio: "inherit" });

        if (!fs.existsSync("./leveldb-mcpe/include")) {
            // npm install does not clone submodules...
            cp.execSync("git clone https://github.com/8Crafter-Studios/leveldb-mcpe"); // so do it manually

            if (!fs.existsSync("./leveldb-mcpe/include")) {
                // gie up
                console.error("******************* READ ME ****************\n");
                console.error(" Failed to install git submodules. Please create an issue at https://github.com/extremeheat/node-leveldb-zlib\n");
                console.error("******************* READ ME ****************\n");
                process.exit(1);
            }
        }
    }

    if (process.platform === "win32") {
        if (!process.env.CMAKE_TOOLCHAIN_FILE) {
            const exec = require("child_process");
            // Try to set CMAKE_TOOLCHAIN_FILE with pre-packaged vcpkg
            exec.execSync("cd helpers && win-build.bat");

            if (!fs.existsSync("helpers/CMakeExtras.txt")) {
                console.error("******************* READ ME ****************\n");
                console.error(" CMAKE_TOOLCHAIN_FILE was not set. Please see the Windows build steps at https://github.com/extremeheat/node-leveldb-zlib/\n");
                console.error(" The build below probably failed.\n");
                console.error("******************* READ ME ****************\n");
            } else {
                console.log("Using pre-bundled vcpkg");
            }
        }
    } else if (process.platform === "darwin") {
        if (!fs.existsSync("/usr/local/opt/zlib/include/")) {
            console.error("******************* READ ME ****************\n");
            console.error(" zlib was not found. Run `xcode-select --install` and try again.\n");
            console.error(" The build below probably failed.\n");
            console.error("******************* READ ME ****************\n");
        }
    } else {
        if (!fs.existsSync("/usr/include/zlib.h") && !fs.existsSync("/usr/local/include/zlib.h")) {
            console.error("******************* READ ME ****************\n");
            console.error(" zlib headers were not found. If the build fails, try `sudo apt-get install libz-dev`\n");
            console.error("******************* READ ME ****************\n");
        }
    }
}

if (runCmake) {
    runChecks().then(() => {
        console.log("Build checks are passing! Building...");
        if (process.env.BUILDING_WASM) {
            console.log("Building WASM...");
            cp.execSync("./emsdk/emsdk install latest", { stdio: "inherit" });
            cp.execSync("./emsdk/emsdk activate latest", { stdio: "inherit" });

            const path = require("path");
            function runEmsdkEnv(emsdkRoot) {
                let cmd;

                const sh = path.join(emsdkRoot, "emsdk_env.sh");
                const ps1 = path.join(emsdkRoot, "emsdk_env.ps1");
                const bat = path.join(emsdkRoot, "emsdk_env.bat");

                if (process.platform === "win32") {
                    if (fs.existsSync(ps1)) {
                        cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}"`;
                    } else {
                        cmd = `cmd.exe /c "${bat}"`;
                    }
                } else {
                    cmd = `bash -c "source '${sh}'"`;
                }

                execSync(cmd, { stdio: "inherit" });
            }
            runEmsdkEnv(path.join(process.cwd(), "emsdk"));

            cp.execSync(
                'emcmake cmake -B build-wasm -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE="$env:EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"',
                { stdio: "inherit" }
            );
            cp.execSync("cmake --build build-wasm", { stdio: "inherit" });
        } else {
            console.log("Building Node bindings...");
            cp.execSync(
                `cmake-js compile${(process.env.LEVELDB_ZLIB_CMAKE_ARCH_OVERRIDE ?? process.env.LEVELDB_ZLIB_ARCH_OVERRIDE) ? ` --arch ${process.env.LEVELDB_ZLIB_CMAKE_ARCH_OVERRIDE ?? process.env.LEVELDB_ZLIB_ARCH_OVERRIDE}` : ""}`,
                { stdio: "inherit" }
            );
        }
    });
}

module.exports = () => {};

# 8Crafter's node-leveldb-zlib

[![NPM version](https://img.shields.io/npm/v/@8crafter/leveldb-zlib.svg)](http://npmjs.com/package/@8crafter/leveldb-zlib)
[![Build Status](https://github.com/8Crafter-Studios/node-leveldb-zlib/workflows/CI/badge.svg)](https://github.com/8Crafter-Studios/node-leveldb-zlib/actions?query=workflow%3A%22CI%22)
[![Discord](https://img.shields.io/discord/1213197616570048512?logo=discord&label=discord&link=https%3A%2F%2Fdiscord.8crafter.com)](https://discord.8crafter.com)

LevelDB bindings for Node.js and WebAssembly with zlib compression, with a modern promise-based API that actually builds! Includes WebAssembly (WASM) support for browser compatibility.

This is a fork of [node-leveldb-zlib](https://npmjs.com/package/leveldb-zlib) that fixed the errors caused by the minimum CMake version being set too low and added WASM support.

## Install

```sh
npm install @8crafter/leveldb-zlib
```

Prebuilds are provided for 64-bit Windows 10, Linux and macOS Catalina. If a prebuild does not work, please create an issue and set enviornment variable FORCE_BUILD to force a manual build.

## Usage

Some example usage to create a new Key-Value database and save once you're done. The API is very similar to leveldown.

```js
const { LevelDB } = require("@8crafter/leveldb-zlib");

const db = new LevelDB(pathToDb, { createIfMissing: true });
await db.open(); // Make sure to wait for DB to open!
await db.put("Key", "Value");
const val = await db.getAsString("Key");
console.assert("Value" == val);
await db.close(); // Make sure to save and close when you're done!
```

WebAssembly example:

```js
import { LevelDB } from "@8crafter/leveldb-zlib/wasm";

const db = new LevelDB(pathToDb, { createIfMissing: true });
await db.open(); // Make sure to wait for DB to open!
await db.put("Key", "Value");
const val = await db.getAsString("Key");
console.assert("Value" == val);
await db.close(); // Make sure to save and close when you're done!
```

To override the architecture to build for, set the `LEVELDB_ZLIB_ARCH_OVERRIDE` environment variable.

You can override the CMake architecture separately with the `LEVELDB_ZLIB_CMAKE_ARCH_OVERRIDE` environment variable.

## Cloning

If cloning from git, you must clone this repo recursively.

```sh
git clone --recursive https://github.com/8Crafter-Studios/node-leveldb-zlib
```

## Dependencies

For the most part, pre-builds are provided so you don't need to worry about having the correct build tools installed. But if a pre-build doesn't work, you may need to install the following deps:

Linux:

```sh
sudo apt-get install libz-dev
```

Windows: zlib is packaged inside the repo. You do not need any extra dependencies.

Mac OS: You need to install xcode utilities first (this is _not_ the whole Xcode!):

```sh
xcode-select --install
```

#### vcpkg

You can also use vcpkg to manage your C++ dependencies. If you don't already have vcpkg installed, install it with the steps at https://github.com/microsoft/vcpkg/#getting-started.

In vcpkg, install zlib: run `vcpkg install zlib`

Then [set environment variable](https://www.onmsft.com/how-to/how-to-set-an-environment-variable-in-windows-10) `DCMAKE_TOOLCHAIN_FILE=[path to vcpkg]/scripts/buildsystems/vcpkg.cmake`.

## API

See [API.md](docs/API.md)

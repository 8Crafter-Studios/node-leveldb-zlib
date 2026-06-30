cmake_minimum_required(VERSION 3.10)

# Remove-Item -Recurse -Force build-wasm
# emcmake cmake -B build-wasm -G Ninja -DCMAKE_BUILD_TYPE=Release
# cmake --build build-wasm

if (WIN32)
    if(NOT DEFINED CMAKE_TOOLCHAIN_FILE AND NOT DEFINED ENV{CMAKE_TOOLCHAIN_FILE})
        message("Including CMakeExtras.txt")
        include( helpers/CMakeExtras.txt OPTIONAL )
    endif()
    
    if(NOT DEFINED CMAKE_TOOLCHAIN_FILE AND DEFINED ENV{CMAKE_TOOLCHAIN_FILE})
        set(CMAKE_TOOLCHAIN_FILE $ENV{CMAKE_TOOLCHAIN_FILE})
    endif()
    message("Using CMAKE_TOOLCHAIN_FILE ${ENV} ${CMAKE_TOOLCHAIN_FILE}")

    # Uncomment this to dump env vars:
    # get_cmake_property(_variableNames VARIABLES)
    # list (SORT _variableNames)
    # foreach (_variableName ${_variableNames})
    #     message(STATUS "${_variableName}=${${_variableName}}")
    # endforeach()

    if (NOT DEFINED CMAKE_TOOLCHAIN_FILE)
        message(FATAL_ERROR "Cmake toolchain file was not found. Set it as an system enviornment variable and restart")
    endif()

endif()

set(CMAKE_POSITION_INDEPENDENT_CODE ON)
project( node-leveldb )

# # ---------------------------------------------------------
# # WebAssembly build (Emscripten)
# # ---------------------------------------------------------
# if (CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
#     message(STATUS "Configuring WebAssembly build for node-leveldb")

#     # # Disable platform-specific LevelDB code
#     # set(DISABLED_SOURCES
#     #     port/port_posix.cc
#     #     util/env_posix.cc
#     #     port/port_posix_sse.cc
#     #     port/port_win.cc
#     #     util/env_win.cc
#     #     util/win_logger.cc
#     #     db/zlib_compressor.cc
#     #     db/zstd_compressor.cc
#     # )

#     # # Pass list to leveldb-mcpe
#     # set(LEVELDB_WASM_DISABLED_SOURCES "${DISABLED_SOURCES}" CACHE INTERNAL "")

#     # Emscripten flags
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -sALLOW_MEMORY_GROWTH=1 -sMODULARIZE=1 -sENVIRONMENT=web,worker")

#     # Build only the LevelDB WASM library
#     add_subdirectory(leveldb-mcpe)

#     add_executable(leveldb_wasm wasm/leveldb_wasm.cpp)
#     target_link_libraries(leveldb_wasm leveldb_mcpe)
#     target_include_directories(leveldb_wasm PRIVATE "${CMAKE_SOURCE_DIR}/leveldb-mcpe/include")
#     target_link_options(leveldb_wasm PRIVATE "-sUSE_ZLIB=1" "-sMODULARIZE=1" "-sENVIRONMENT=web,worker" "-lembind" "-sMODULARIZE=1" "-sEXPORT_ES6=1")
#     add_definitions("-DDLLX=")

#     # Do NOT build the Node addon in WASM mode
#     return()
# endif()

# ---------------------------------------------------------
# WebAssembly build (Emscripten + emnapi + embind + browser)
# ---------------------------------------------------------
if (CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
    message(STATUS "Configuring WebAssembly (browser + emnapi + embind) build for node-leveldb")

    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -sALLOW_MEMORY_GROWTH=1 -sMODULARIZE=1 -sENVIRONMENT=web,webview,worker,node")

    add_subdirectory(leveldb-mcpe)

    add_executable(leveldb_wasm src/bindings.cpp)
    target_link_libraries(leveldb_wasm leveldb_mcpe)
    target_include_directories(leveldb_wasm PRIVATE "${CMAKE_SOURCE_DIR}/leveldb-mcpe/include")

    # emnapi: Node-API ABI in the browser
    # target_compile_definitions(leveldb_wasm PRIVATE
    #     BUILDING_NODE_EXTENSION
    #     NAPI_EXTERN=__attribute__((__import_module__("env")))
    # )
    target_compile_definitions(leveldb_wasm PRIVATE
        BUILDING_NODE_EXTENSION
        # NAPI_EXTERN="__attribute__((__import_module__(\"env\")))"
    )

    target_include_directories(leveldb_wasm PRIVATE
        "${CMAKE_SOURCE_DIR}/node_modules/emnapi/include/node"
    )

    add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/emnapi")
    target_link_libraries(leveldb_wasm emnapi)
    target_link_options(leveldb_wasm PRIVATE
        # LevelDB needs zlib
        "-sUSE_ZLIB=1"

        # embind (your wrapper depends on this)
        "-lembind"

        "-sMODULARIZE=1"
        "-sENVIRONMENT=web,webview,worker,node"
        "-sEXPORT_ES6=1"

        # emnapi JS library + native lib
        # "-nostdlib"
        # "-Wl,--export=napi_register_wasm_v1"
        # "-Wl,--export-if-defined=node_api_module_get_api_version_v1"
        # "-Wl,--no-entry"
        # "-Wl,--export-dynamic,--export=malloc,--export=free,--import-undefined,--export-table"
        -DNAPI_DISABLE_CPP_EXCEPTIONS
        -DNODE_ADDON_API_ENABLE_MAYBE
        "-L${CMAKE_SOURCE_DIR}/node_modules/emnapi/lib/wasm32-emscripten"
        "--js-library=${CMAKE_SOURCE_DIR}/node_modules/emnapi/dist/library_napi.js"
        "-lemnapi"

        # required exports for emnapi
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_napi_register_wasm_v1','_node_api_module_get_api_version_v1']"
        "-sEXPORTED_RUNTIME_METHODS=['emnapiInit']"
    )
    target_link_libraries(leveldb_wasm emmalloc)

    # DLLX is a no-op in WASM
    add_definitions("-DDLLX=")

    # Stop native addon build
    return()
endif()

# ---------------------------------------------------------
# Native build (Node addon)
# ---------------------------------------------------------
add_subdirectory( leveldb-mcpe )

if (UNIX)
    add_definitions(-DLEVELDB_PLATFORM_POSIX "-DDLLX=")
    if(APPLE)
        add_definitions(-DOS_MACOSX)
    endif()
elseif (WIN32)
    add_definitions(-DLEVELDB_PLATFORM_WINDOWS "-DDLLX=__declspec(dllexport)")
endif()

include_directories("leveldb-mcpe/include")

include_directories(${CMAKE_JS_INC})
file(GLOB SOURCE_FILES "src/*.cpp" "src/*.h")
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})

# Include N-API wrappers
include_directories(
    ${CMAKE_SOURCE_DIR}/node_modules/node-addon-api 
    ${CMAKE_SOURCE_DIR}/node_modules/node-addon-api/src
    ${CMAKE_JS_INC}
)

message(STATUS "Include dirs")
get_property(dirs DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR} PROPERTY INCLUDE_DIRECTORIES)
foreach(dir ${dirs})
  message(STATUS "dir='${dir}'")
endforeach()


# define NPI_VERSION
add_definitions(-DNAPI_VERSION=3)

target_link_libraries( node-leveldb leveldb_mcpe )

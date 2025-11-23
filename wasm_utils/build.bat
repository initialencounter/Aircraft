@echo off

:: 设置输出路径变量
set WASM_OUT_DIR=C:\Users\29115\RustroverProjects\Aircraft\packages\wxt\public

echo Building wasm module...
wasm-pack build --release --out-dir "%WASM_OUT_DIR%" --out-name "aircraft" --target web

echo Removing trash files...
if exist "%WASM_OUT_DIR%\.gitignore" del "%WASM_OUT_DIR%\.gitignore"
if exist "%WASM_OUT_DIR%\package.json" del "%WASM_OUT_DIR%\package.json"
echo Done
pause
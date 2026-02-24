from PyInstaller.utils.hooks import collect_submodules
from pathlib import Path
import os

# PyInstaller spec files do NOT define __file__
project_dir = Path(os.getcwd()).resolve()
static_dir = project_dir / "static"

hiddenimports = collect_submodules("scapy")

a = Analysis(
    ["app.py"],
    pathex=[str(project_dir)],
    binaries=[],
    datas=[(str(static_dir), "static")] if static_dir.exists() else [],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="Helm",
    debug=False,
    strip=False,
    upx=True,
    console=True,   # set False later if you want no console window
)
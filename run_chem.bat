@echo off
cd /d "D:\project\chem-discovery-family"
echo ==================================================================
echo   ChemDiscovery (A25-CS106) - Family-Friendly Edition (Port 8087)
echo ==================================================================
start "" "http://localhost:8087"
python backend\main.py

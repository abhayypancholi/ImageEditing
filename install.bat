@echo off
echo ========================================
echo Installing Backend Dependencies
echo ========================================
echo.

echo Step 1: Upgrading pip...
python -m pip install --upgrade pip
echo.

echo Step 2: Installing core dependencies...
pip install -r requirements-minimal.txt
echo.

echo Step 3: Installing AI dependencies (this will take 5-10 minutes)...
echo Note: This downloads large packages (PyTorch, TensorFlow)
pip install -r requirements-ai.txt
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Copy .env.example to .env
echo 2. Edit .env with your MongoDB URI
echo 3. Run: python run.py
echo.
pause

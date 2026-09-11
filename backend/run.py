import os
import sys
import uvicorn

# Ensure the backend directory is on sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" 🚀 STARTING REC GUARDIAN BACKEND PLATFORM")
    print(" AI-Powered REC Fraud Detection & Forensic Intelligence")
    print("=" * 60)
    print(" Interactive API Docs: http://127.0.0.1:8000/docs")
    print(" Alternative Docs:    http://127.0.0.1:8000/redoc")
    print(" Health Endpoint:     http://127.0.0.1:8000/health")
    print("=" * 60 + "\n")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )

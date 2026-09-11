import os
import subprocess
import sys

def run_tests():
    print("Running test suite...")
    result = subprocess.run(["pytest", "tests/"], capture_output=True, text=True)
    if result.returncode != 0:
        print("Tests failed!")
        print(result.stdout)
        sys.exit(1)
    print("All tests passed successfully.\n")

def start_server():
    print("Starting FastAPI server...")
    process = subprocess.Popen(
        ["uvicorn", "src.api.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    return process

if __name__ == '__main__':
    run_tests()
    server_process = start_server()
    
    print("\n" + "="*50)
    print("System is successfully running!")
    print("Dashboard available at: http://127.0.0.1:8000")
    print("="*50 + "\n")
    
    try:
        server_process.wait()
    except KeyboardInterrupt:
        server_process.terminate()
        print("Server stopped.")

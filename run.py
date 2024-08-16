import os
import subprocess
import sys
import time
from threading import Thread

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def run_backend():
    backend_dir = os.path.join(BASE_DIR, "backend")
    os.chdir(backend_dir)
    subprocess.run([sys.executable, "app.py"])

def run_frontend():
    frontend_dir = os.path.join(BASE_DIR, "frontend")
    os.chdir(frontend_dir)
    if sys.platform.startswith('win'):
        subprocess.run(["npm.cmd", "start"])
    else:
        subprocess.run(["npm", "start"])

def main():
    backend_thread = Thread(target=run_backend)
    backend_thread.start()

    time.sleep(5)

    frontend_thread = Thread(target=run_frontend)
    frontend_thread.start()

    try:
        backend_thread.join()
        frontend_thread.join()
    except KeyboardInterrupt:
        print("\nZatrzymywanie aplikacji...")


if __name__ == "__main__":
    main()
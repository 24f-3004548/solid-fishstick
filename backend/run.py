from dotenv import load_dotenv
load_dotenv()

import os
from app import create_app

env = os.getenv("FLASK_ENV", "development")
app = create_app(env)
backend_port = int(os.getenv("BACKEND_PORT", 5001))

if __name__ == "__main__":
    
    app.run(host="0.0.0.0",port = backend_port, debug=(env == "development"))
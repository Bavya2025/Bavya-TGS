---
description: How to run TGS application with and without Nginx
---

# Running TGS Locally

You can run the application in two modes: **Development (Standalone)** and **Production (Nginx Proxied)**.

## 1. Development Mode (Without Nginx)

Use this for rapid development. Vite will proxy your API requests directly to Django.

### Backend

1. Open a terminal in `e:\TGS-V1.1`.
2. Activate your virtual environment: `venv\Scripts\activate`.
3. Start the Django server:
   ```powershell
   python backend/manage.py runserver 0.0.0.0:4567
   ```

### Frontend

1. Open a second terminal in `e:\TGS-V1.1\TGS_FRONTEND`.
2. Start the Vite dev server:
   ```powershell
   npm run dev
   ```
3. Access the app at: `http://localhost:6786`.

---

## 2. Production Mode (Full-Stack Automation)
Use this unified script to manage both the **Frontend and Backend** of all three applications.

### Using the Automated Launcher
1. Open the file **[start_tgs.bat](file:///E:/TGS-V1.1/start_tgs.bat)**.
2. **One-Click Run**: The script will automatically:
   - **Build Frontend**: Runs `npm install` and `npm run build` to generate the static files Nginx needs.
   - **Setup Backend**: Creates the virtual environment, installs Python dependencies, and collects static files.
   - **Launch Workers**: Starts backend workers for all 3 apps.
3. **High Load Toggle**: Set `APP1_HIGH_LOAD=true` near the top of the script to scale TGS with multiple workers.
4. **App Locations**: Ensure `APPX_PATH` and `APPX_FRONTEND` variables point to your actual folders.

### How Nginx Interacts
Your **[nginx.conf](file:///E:/TGS-V1.1/nginx.conf)** is already configured to look for the `dist` folders created by this script. Once the script finishes, Nginx will serve the newly built frontend instantly.

---

## 3. Containerized Mode (Docker)

Use this for the most robust, reproducible environment. It handles the database, backend, and frontend as isolated services.

### Prerequisites
- Install **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** for Windows.

### Build and Launch
1. Ensure your **[.env](file:///E:/TGS-V1.1/.env)** file is in the root directory with correct database credentials.
2. Open a terminal in the root directory (`e:\TGS-V1.1`).
3. Run the following command:
   ```powershell
   docker-compose up --build -d
   ```
   - *This will build the images, start the MySQL database, run migrations, start the scheduler, and serve the frontend via Nginx.*

### Access the Apps
- **TGS Web Dashboard**: [http://localhost:6785](http://localhost:6785)
- **Database**: Port `3307` on localhost.

### Useful Docker Commands
- **View Logs**: `docker-compose logs -f` (or specify service: `docker-compose logs -f backend`)
- **Restart a Service**: `docker-compose restart backend`
- **Rebuild and Sync Changes**: `docker-compose up --build -d`
- **Stop and Remove Containers**: `docker-compose down`

---

## 4. Load Balanced Mode (High Traffic)

Use this to test the system's ability to handle multiple concurrent users across three separate applications.

### Backend Workers
For each application, you can start multiple workers on different ports:
- **App 1 Workers**: `python manage.py runserver 127.0.0.1:4567` AND `python manage.py runserver 127.0.0.1:4568`
- **App 2 Workers**: `python manage.py runserver 127.0.0.1:4570` AND `python manage.py runserver 127.0.0.1:4571`
- **App 3 Workers**: `python manage.py runserver 127.0.0.1:4573` AND `python manage.py runserver 127.0.0.1:4574`

### How Nginx Handles It
- **Sticky Sessions**: Nginx will use `ip_hash` to ensure a single user always talks to the same worker, preventing session loss.
- **Failover**: If one backend port fails, Nginx automatically routes traffic to the other workers in the cluster.

---

## 5. Stopping the Applications (Legacy/Local Scripts)

If you are running the apps via the `.bat` scripts:

1. Open the file **[stop_tgs.bat](file:///E:/TGS-V1.1/stop_tgs.bat)**.
2. The script will automatically search for and terminate all processes running on the backend ports (4567, 4568, 4570, etc.).

### Why use this instead of closing windows?
- **Ensures Port Release**: Sometimes closing a window leaves a "ghost" process that keeps the port busy.

---

## 6. Configuration Management (IP & Ports)
 
### Using an IP Address (Network Access)
To access the app via your system IP (e.g., `192.168.1.10`) instead of `localhost`:
1. **Find your IP**: Run `ipconfig` in your Windows terminal.
2. **Update Backend Settings**: Open `backend/tgs_backend/settings.py`:
   - Add your IP to `ALLOWED_HOSTS`.
   - Add `http://YOUR_IP:6785` to `CSRF_TRUSTED_ORIGINS`.
3. **Restart**: Run `docker-compose up -d`.
 
### Changing Ports
#### **Method 1: Change External Port (Easy)**
If port `6785` is in use, change how you access the app from outside Docker.
- **File**: `docker-compose.yml`
- **Action**: Change the first number in the `ports` mapping.
  - Frontend: `"9000:80"` (Accessible at `http://localhost:9000`)
  - Backend: `"8001:8000"` (Accessible at `http://localhost:8001`)
 
#### **Method 2: Change Internal Port (Advanced)**
To change the port inside the container (e.g., changing `8000` to `9000`):
1. **Entrypoint**: Update `backend/entrypoint.sh` to bind Gunicorn to the new port.
2. **Nginx**: Update `TGS_FRONTEND/nginx.conf` (`proxy_pass`) to point to the new internal port.
3. **Compose**: Update `docker-compose.yml` to match the new internal port.
 
---
 
## Troubleshooting
 
- **View Backend Logs**: `docker-compose logs -f backend` (Best for debugging Python errors).
- **View Nginx Logs**: `docker-compose logs -f frontend` (Best for debugging routing/404/502 errors).
- **Docker Migration Errors**: If the database fails to start, check logs with `docker-compose logs -f db`.
- **CSRF Error**: Ensure the origin/port you are using (e.g., `http://your-ip:6785`) is listed in `CSRF_TRUSTED_ORIGINS` in `settings.py`.

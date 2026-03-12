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

## 4. Stopping the Applications
To shut down all backend workers safely:

1. Open the file **[stop_tgs.bat](file:///E:/TGS-V1.1/stop_tgs.bat)**.
2. The script will automatically search for and terminate all processes running on the backend ports (4567, 4568, 4570, etc.).
3. Once completed, all backend windows will close.

### Why use this instead of closing windows?
- **Ensures Port Release**: Sometimes closing a window leaves a "ghost" process that keeps the port busy. The stop script ensures the port is fully released for the next run.

---

## 3. Load Balanced Mode (High Traffic)

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

## Troubleshooting

- **Backend Offline**: Ensure the port in `nginx.conf` (upstream) matches the port in your `runserver` command.
- **CSRF Error**: Ensure the origin/port you are using (e.g., `http://localhost:6786` or `http://IP:6785`) is listed in `CSRF_TRUSTED_ORIGINS` in `settings.py`.
- **404 Not Found**: Verify that `proxy_pass` in `nginx.conf` points to the correct `upstream` cluster name.

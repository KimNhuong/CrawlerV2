# Cách cài đặt

Hướng dẫn nhanh để cài đặt và chạy backend crawler (Node.js) trên Windows.

1) Xóa thư mục node_modules (nếu có)

	 - Xóa thủ công hoặc dùng PowerShell:

```powershell
Remove-Item -Recurse -Force .\node_modules
```

2) Cài dependencies

```powershell
npm i
```

3) Chrome / Puppeteer

- Nếu worker của bạn dùng `puppeteer-core` (hoặc puppeteer) và cần đường dẫn tới Chrome/Chromium, mở file `services/crawlerWorker.js` và chỉnh `executablePath` tới trình duyệt đã cài (ví dụ Chrome trên Windows):

	C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe

- Nếu chưa cài Chrome, tải từ: https://www.google.com/chrome/

4) MySQL Workbench (tuỳ chọn)

- Nếu muốn quản lý DB bằng giao diện, cài MySQL Workbench Community: https://dev.mysql.com/downloads/workbench/

5) Tạo schema (database) và user

- Bạn có thể tạo schema và user bằng MySQL Workbench hoặc bằng dòng lệnh. Ví dụ SQL (thay đổi tên/mật khẩu theo ý bạn):

```sql
CREATE DATABASE IF NOT EXISTS `crawlerv2` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'crawler'@'%' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON `crawlerv2`.* TO 'crawler'@'%';
FLUSH PRIVILEGES;
```

6) Cấu hình kết nối database

- Theo cấu trúc project hiện tại, ứng dụng đọc cấu hình DB từ file `.env` (nằm trong thư mục dự án). Mở `.env` và chỉnh các giá trị:

```
DB_HOST=mysql
DB_PORT=3306
DB_USER=crawler
DB_PASSWORD=your_password_here
DB_DATABASE=crawlerv2
```

- (Tùy chọn) Thay vì `.env`, bạn có thể chỉnh trực tiếp `config/Database.js` để ghi cứng cấu hình — nhưng `.env` là cách an toàn và linh hoạt hơn.

7) Chạy ứng dụng (PowerShell)

```powershell
npm start
```

Gợi ý Docker Compose (nếu dùng container)

- Nếu bạn muốn chạy MySQL và app bằng Docker Compose, dùng `compose.yaml` trong dự án:

```powershell
docker compose -f .\compose.yaml up --build
```

- Nếu thay đổi file init SQL (`mysql-init/*.sql`) và muốn nó chạy lại, hãy xóa volume MySQL (cảnh báo: sẽ xóa dữ liệu):

```powershell
docker compose -f .\compose.yaml down -v
docker compose -f .\compose.yaml up --build
```



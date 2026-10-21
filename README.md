
# Smart Learning AI

Cấu trúc dự án nền tảng học tập thông minh tích hợp AI.
=======
# smart-learning-ai
Web Nền tảng Hỗ trợ Học tập &amp; Luyện thi thông minh tích hợp AI

# Smart Learning AI

Nền tảng hỗ trợ học tập và luyện thi thông minh, tích hợp trợ lý AI, quản lý khóa học, flashcard, bài kiểm tra và theo dõi tiến độ học tập.

## Tính năng

- Đăng ký, đăng nhập và quản lý phiên làm việc.
- Dashboard theo dõi tiến độ học tập.
- Quản lý khóa học và bài học.
- Làm bài kiểm tra và xem kết quả.
- Tạo, quản lý và ôn tập flashcard.
- Trợ lý AI hỗ trợ giải đáp câu hỏi học tập.
- Tải tài liệu để tạo dữ liệu học tập và flashcard.
- Giao diện đa ngôn ngữ Việt/Anh.
- Lưu cài đặt cá nhân của người dùng.

## Công nghệ sử dụng

### Frontend

- React
- TypeScript và TSX
- Vite
- i18next
- React Markdown và KaTeX

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- Mongoose
- JWT và bcrypt

### Cơ sở dữ liệu

- PostgreSQL: tài khoản người dùng, phiên đăng nhập và cài đặt ứng dụng.
- MongoDB: khóa học, bài học, kết quả, flashcard và lịch sử trò chuyện AI.

### AI và hạ tầng

- AI service viết bằng Python tại `ai-service/`.
- Docker và Docker Compose.
- Nginx và Kubernetes manifest trong `infra/`.

## Cấu trúc dự án

```text
smart-learning-ai/
├── ai-service/       # Các service AI viết bằng Python
├── backend/          # REST API viết bằng Node.js/TypeScript
│   ├── prisma/       # Prisma schema và migration PostgreSQL
│   └── src/          # Module, route, service và middleware
├── frontend-web/     # Ứng dụng web React
├── database/         # Tài nguyên và dữ liệu database
├── docs/             # Tài liệu phân tích và thiết kế
├── infra/            # Docker, Nginx, Kubernetes và CI/CD
├── scripts/          # Script cài đặt, seed và backup
└── shared/           # Tài nguyên dùng chung
```

## Yêu cầu môi trường

- Node.js 18 trở lên.
- npm.
- PostgreSQL.
- MongoDB.
- Python 3.10 trở lên nếu chạy `ai-service`.

## Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/ngyenlananh/smart-learning-ai.git
cd smart-learning-ai
```

### 2. Cấu hình backend

Tạo file `backend/.env` từ file mẫu:

```bash
copy backend\.env.example backend\.env
```

Trên macOS/Linux có thể dùng:

```bash
cp backend/.env.example backend/.env
```

Điền thông tin kết nối database và các secret cần thiết trong `backend/.env`. Không commit file `.env` lên Git.

Các biến môi trường chính:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/smart_learning
MONGODB_URI=mongodb://127.0.0.1:27017/smart_learning
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
CLIENT_URL=http://localhost:5173
PORT=4000
```

### 3. Cài đặt và khởi tạo backend

```bash
cd backend
npm install
npx prisma generate
npm run prisma:migrate
npm run dev
```

Backend chạy mặc định tại:

```text
http://localhost:4000
```

Kiểm tra trạng thái backend:

```text
http://localhost:4000/api/health
```

### 4. Cài đặt và chạy frontend

Mở terminal mới:

```bash
cd frontend-web
npm install
npm run dev
```

Frontend chạy mặc định tại:

```text
http://localhost:5173
```

### 5. Chạy AI service

AI service nằm trong thư mục `ai-service/`. Cài dependencies theo file `requirements.txt`, sau đó cấu hình các biến môi trường cần thiết cho provider AI trước khi chạy service.

## Các lệnh thường dùng

### Backend

```bash
npm run dev      # Chạy development server
npm run build    # Build TypeScript
npm start        # Chạy bản build
```

### Frontend

```bash
npm run dev      # Chạy Vite development server
npm run build    # Kiểm tra type và build production
npm run preview  # Xem bản build production
```

## API chính

| Nhóm | Đường dẫn |
|---|---|
| Health check | `/api/health` |
| Xác thực | `/api/auth` |
| Khóa học | `/courses` |
| Bài kiểm tra | `/exams` |
| Flashcard | `/flashcards`, `/flashcard-sets` |
| Trợ lý AI | `/ai` |
| Cài đặt | `/settings` |
| Dashboard | `/dashboard/summary` |

## Bảo mật

- Không commit `backend/.env`, token, mật khẩu hoặc thông tin kết nối database.
- Chỉ commit file `.env.example` với giá trị mẫu.
- Sử dụng secret đủ dài cho JWT khi triển khai thực tế.
- Thay đổi các secret mẫu trước khi chạy môi trường production.

## Đóng góp

1. Tạo branch mới từ `main`.
2. Thực hiện thay đổi và kiểm tra local.
3. Tạo commit mô tả rõ nội dung thay đổi.
4. Tạo pull request để review.

## License

Dự án được phát hành theo giấy phép MIT. Xem file [LICENSE](./LICENSE).

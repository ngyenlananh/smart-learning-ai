# TÀI LIỆU PHÂN TÍCH YÊU CẦU & THIẾT KẾ NỀN TẢNG
## Đề tài: Hỗ trợ Học tập & Luyện thi thông minh (Tích hợp AI)

> Tài liệu này là bước nền của dự án, gồm 3 phần: (1) Use case & User story, (2) ER Diagram cho MongoDB, (3) Wireframe các màn hình chính. Đây là cơ sở để triển khai Backend, Frontend và AI Service ở các bước sau.

---

## PHẦN 1: PHÂN TÍCH YÊU CẦU (USE CASE & USER STORY)

### 1.1. Danh sách tác nhân (Actors)

| Tác nhân | Mô tả |
|---|---|
| **Học viên** | Người dùng chính, học bài, luyện thi, tương tác với AI |
| **Giáo viên** | Tạo/quản lý khóa học, ngân hàng câu hỏi, theo dõi học viên |
| **Quản trị viên (Admin)** | Quản lý toàn hệ thống, phân quyền, kiểm duyệt nội dung |
| **Hệ thống AI** | Tác nhân tự động: sinh đề, chấm điểm, tư vấn học tập, chatbot |

### 1.2. Danh sách Use Case

| Mã | Tên Use Case | Tác nhân chính | Mô tả ngắn |
|---|---|---|---|
| UC-01 | Đăng ký / Đăng nhập | Học viên, Giáo viên | Xác thực tài khoản qua email hoặc Google OAuth |
| UC-02 | Xem & đăng ký khóa học | Học viên | Duyệt danh sách khóa học, đăng ký tham gia |
| UC-03 | Học bài (video/tài liệu) | Học viên | Xem nội dung bài giảng theo từng chương |
| UC-04 | Làm bài luyện thi | Học viên | Làm đề trắc nghiệm/tự luận có giới hạn thời gian |
| UC-05 | Xem kết quả & phân tích | Học viên | Xem điểm số, câu sai, phân tích điểm yếu do AI đưa ra |
| UC-06 | Trò chuyện với AI Tutor | Học viên | Đặt câu hỏi, nhận giải thích dựa trên giáo trình (RAG) |
| UC-07 | Ôn tập Flashcard | Học viên | Học từ vựng/kiến thức theo phương pháp lặp ngắt quãng |
| UC-08 | Xem phân tích tiến độ | Học viên | Xem biểu đồ năng lực theo thời gian, gợi ý lộ trình |
| UC-09 | Quản lý khóa học & câu hỏi | Giáo viên | Tạo/sửa/xóa bài học, ngân hàng câu hỏi |
| UC-10 | Sinh đề thi tự động | Hệ thống AI | Tự động tạo đề theo chủ đề, độ khó được chọn |
| UC-11 | Chấm điểm tự luận bằng AI | Hệ thống AI | Chấm và phản hồi bài tự luận bằng NLP |
| UC-12 | Gợi ý lộ trình cá nhân hóa | Hệ thống AI | Phân tích lịch sử làm bài, đề xuất nội dung cần ôn |
| UC-13 | Quản lý người dùng | Admin | Khóa/mở tài khoản, phân quyền vai trò |

### 1.3. Đặc tả chi tiết Use Case quan trọng nhất

**UC-04: Làm bài luyện thi**
- **Điều kiện trước:** Học viên đã đăng nhập và chọn được đề thi.
- **Luồng chính:**
  1. Học viên bấm "Bắt đầu làm bài" → hệ thống hiển thị câu hỏi đầu tiên kèm đồng hồ đếm giờ.
  2. Học viên chọn đáp án hoặc nhập câu trả lời tự luận, có thể chuyển qua lại giữa các câu.
  3. Học viên bấm "Nộp bài" hoặc hết giờ → hệ thống tự động nộp.
  4. Hệ thống chấm điểm (trắc nghiệm: so khớp đáp án; tự luận: gọi AI Service).
  5. Hệ thống lưu kết quả vào collection `results` và chuyển sang UC-05.
- **Ngoại lệ:** Mất kết nối giữa chừng → hệ thống tự lưu tiến trình mỗi 30 giây để khôi phục.

**UC-06: Trò chuyện với AI Tutor**
- **Điều kiện trước:** Học viên đang ở trong một bài học hoặc màn hình chat AI.
- **Luồng chính:**
  1. Học viên nhập câu hỏi.
  2. Backend chuyển tiếp câu hỏi sang AI Service.
  3. AI Service truy xuất đoạn giáo trình liên quan (RAG) rồi gọi LLM sinh câu trả lời.
  4. Câu trả lời được trả về, lưu vào `ai_logs` để phục vụ phân tích tiến độ sau này.

### 1.4. User Stories

| Mã | User Story |
|---|---|
| US-01 | Là **học viên**, tôi muốn **đăng nhập bằng Google** để không phải nhớ thêm mật khẩu riêng. |
| US-02 | Là **học viên**, tôi muốn **xem tiến độ học tập trên dashboard** để biết mình đang học đến đâu. |
| US-03 | Là **học viên**, tôi muốn **luyện đề có giới hạn thời gian** để làm quen với áp lực phòng thi thật. |
| US-04 | Là **học viên**, tôi muốn **AI chỉ ra phần kiến thức tôi còn yếu** để tập trung ôn đúng trọng tâm thay vì học lan man. |
| US-05 | Là **học viên**, tôi muốn **hỏi AI Tutor bất cứ lúc nào** để không phải chờ giáo viên phản hồi. |
| US-06 | Là **học viên**, tôi muốn **ôn từ vựng bằng flashcard** để ghi nhớ lâu hơn so với học thuộc lòng thông thường. |
| US-07 | Là **giáo viên**, tôi muốn **tạo đề thi tự động bằng AI theo chủ đề** để tiết kiệm thời gian soạn đề thủ công. |
| US-08 | Là **giáo viên**, tôi muốn **xem thống kê học viên nào đang gặp khó khăn** để hỗ trợ kịp thời. |
| US-09 | Là **quản trị viên**, tôi muốn **khóa tài khoản vi phạm** để đảm bảo an toàn hệ thống. |

---

## PHẦN 2: ER DIAGRAM CHO MONGODB

*(Sơ đồ trực quan đã được tạo ở phần trước trong cuộc trò chuyện — dưới đây là đặc tả schema chi tiết bằng văn bản để đưa vào tài liệu báo cáo.)*

### 2.1. Danh sách Collection

| Collection | Vai trò | Quan hệ |
|---|---|---|
| `users` | Tài khoản người dùng | 1–N với `results`, `flashcards`, `ai_logs`; N–N với `courses` |
| `courses` | Khóa học | 1–N với `lessons`, `exams` |
| `lessons` | Bài học trong khóa học | N–1 với `courses` |
| `exams` | Đề thi (nhúng sẵn câu hỏi) | N–1 với `courses`; 1–N với `results` |
| `results` | Kết quả làm bài | N–1 với `users`, `exams` |
| `flashcards` | Thẻ ôn tập | N–1 với `users` |
| `ai_logs` | Lịch sử hội thoại AI | N–1 với `users` |

### 2.2. Cấu trúc document mẫu (JSON Schema)

```json
// Collection: users
{
  "_id": ObjectId,
  "fullName": "Nguyễn Minh Anh",
  "email": "minhanh@email.com",
  "passwordHash": "...",
  "role": "student", // "student" | "teacher" | "admin"
  "enrolledCourseIds": [ObjectId, ObjectId],
  "createdAt": ISODate
}

// Collection: courses
{
  "_id": ObjectId,
  "title": "Toán 12 - Ôn thi THPT Quốc gia",
  "subject": "math",
  "teacherId": ObjectId,
  "enrolledUserIds": [ObjectId, ObjectId],
  "createdAt": ISODate
}

// Collection: lessons
{
  "_id": ObjectId,
  "courseId": ObjectId,
  "chapter": "Chương 2: Hàm số mũ, logarit",
  "title": "Bài 5: Hàm số mũ và logarit",
  "videoUrl": "https://...",
  "content": "Nội dung bài giảng dạng text/markdown",
  "order": 5
}

// Collection: exams (câu hỏi được NHÚNG trực tiếp, không tách collection riêng)
{
  "_id": ObjectId,
  "courseId": ObjectId,
  "title": "Đề luyện tập Chương 2",
  "difficulty": "medium",
  "aiGenerated": true,
  "durationMinutes": 45,
  "questions": [
    {
      "questionId": "q1",
      "content": "Cho hàm số y = x³ − 3x² + 2...",
      "type": "multiple_choice",
      "options": ["(0;2)", "(2;−2)", "(−1;−2)", "(1;0)"],
      "correctAnswer": "(2;−2)"
    }
  ]
}

// Collection: results (câu trả lời của học viên được NHÚNG trực tiếp)
{
  "_id": ObjectId,
  "userId": ObjectId,
  "examId": ObjectId,
  "score": 8.4,
  "durationTaken": 1720, // giây
  "answers": [
    { "questionId": "q1", "selected": "(2;−2)", "isCorrect": true }
  ],
  "aiAnalysis": {
    "weakTopics": ["Phương trình logarit"],
    "strongTopics": ["Ứng dụng đạo hàm"]
  },
  "submittedAt": ISODate
}

// Collection: flashcards
{
  "_id": ObjectId,
  "userId": ObjectId,
  "deckName": "TOEIC Unit 5",
  "term": "Negotiate",
  "meaning": "Đàm phán, thương lượng",
  "reviewLevel": 2, // dùng cho thuật toán spaced repetition
  "nextReviewAt": ISODate
}

// Collection: ai_logs
{
  "_id": ObjectId,
  "userId": ObjectId,
  "context": "lesson_5_toan12", // ngữ cảnh RAG, nếu có
  "message": "Giải thích nguyên hàm từng phần",
  "aiResponse": "Công thức: ∫u dv = uv − ∫v du...",
  "createdAt": ISODate
}
```

### 2.3. Nguyên tắc thiết kế đã áp dụng

- **Nhúng (embed)** dữ liệu chỉ dùng riêng cho 1 document cha và không cần truy vấn độc lập: `questions` trong `exams`, `answers` trong `results`.
- **Tham chiếu (reference)** dữ liệu được nhiều nơi dùng chung, cần truy vấn/join linh hoạt: `userId`, `courseId`, `examId`.
- Trường `aiAnalysis` trong `results` giúp Frontend hiển thị ngay phần phân tích mà không cần gọi AI Service lại mỗi lần xem kết quả cũ.

---

## PHẦN 3: WIREFRAME CÁC MÀN HÌNH CHÍNH

*(Tham chiếu trực tiếp các mockup trực quan đã dựng ở phần trước của cuộc trò chuyện. Dưới đây là đặc tả chức năng đi kèm từng màn hình.)*

### 3.1. Màn hình Đăng nhập (`auth/`)
- **Thành phần:** Logo, ô nhập email/mật khẩu, nút đăng nhập, nút đăng nhập Google, link "Quên mật khẩu" và "Đăng ký".
- **Dữ liệu liên quan:** `users` (kiểm tra `email` + `passwordHash`).
- **API cần có:** `POST /auth/login`, `POST /auth/register`.

### 3.2. Dashboard tổng quan (`dashboard/`)
- **Thành phần:** Chuỗi ngày học liên tiếp (streak), 3 thẻ thống kê (khóa học/đề đã luyện/điểm TB), thanh tiến độ theo môn, banner gợi ý từ AI, 2 nút hành động nhanh.
- **Dữ liệu liên quan:** Tổng hợp từ `users.enrolledCourseIds`, `results` (đếm & tính trung bình), `ai_logs` hoặc kết quả phân tích mới nhất.
- **API cần có:** `GET /dashboard/summary`.

### 3.3. Trang khóa học (`learning/`)
- **Thành phần:** Danh sách chương học dạng list, trạng thái mỗi chương (hoàn thành/đang học/khóa), thanh tiến độ phần trăm.
- **Dữ liệu liên quan:** `courses`, `lessons`, tiến độ tính dựa trên lịch sử truy cập bài học của user (cần thêm field `completedLessonIds` trong `users` hoặc collection `progress` riêng nếu mở rộng).
- **API cần có:** `GET /courses/:id/lessons`.

### 3.4. Trang xem bài học (`learning/lesson-detail`)
- **Thành phần:** Video player, tab chuyển đổi (video/tài liệu/bài tập), khối tóm tắt nhanh bởi AI.
- **Dữ liệu liên quan:** `lessons.content`, `lessons.videoUrl`; tóm tắt AI gọi riêng qua AI Service (không lưu cứng để luôn cập nhật).
- **API cần có:** `GET /lessons/:id`, `POST /ai/summarize`.

### 3.5. Trang làm bài thi (`exam/`)
- **Thành phần:** Câu hỏi hiện tại + 4 lựa chọn, đồng hồ đếm ngược, bảng điều hướng câu hỏi (đã làm/chưa làm/đang xem), nút chuyển câu.
- **Dữ liệu liên quan:** `exams.questions`; câu trả lời tạm lưu ở localStorage/state, chỉ gửi lên server khi nộp bài.
- **API cần có:** `GET /exams/:id`, `POST /exams/:id/submit`.

### 3.6. Trang kết quả bài thi (`exam/result`)
- **Thành phần:** Điểm số tổng, số câu đúng/sai, thời gian làm bài, khối phân tích AI (điểm mạnh/yếu), 2 nút hành động (xem lời giải / luyện phần yếu).
- **Dữ liệu liên quan:** `results.score`, `results.answers`, `results.aiAnalysis`.
- **API cần có:** `GET /results/:id`.

### 3.7. AI Tutor Chatbot (`ai-tutor/`)
- **Thành phần:** Khung hội thoại dạng bong bóng chat, gợi ý câu hỏi nhanh, ô nhập liệu.
- **Dữ liệu liên quan:** `ai_logs` (lưu lịch sử), ngữ cảnh RAG lấy từ `lessons.content` liên quan.
- **API cần có:** `POST /ai/chat`.

### 3.8. Flashcard ôn tập (`flashcard/`)
- **Thành phần:** Thẻ hiển thị thuật ngữ, nút lật thẻ xem nghĩa, 3 nút đánh giá mức độ nhớ (Chưa nhớ/Mơ hồ/Đã thuộc).
- **Dữ liệu liên quan:** `flashcards.reviewLevel`, `flashcards.nextReviewAt` — cập nhật theo thuật toán spaced repetition (vd: SM-2) mỗi khi học viên đánh giá.
- **API cần có:** `GET /flashcards/due`, `PATCH /flashcards/:id/review`.

### 3.9. Trang phân tích tiến độ (`analytics/`)
- **Thành phần:** Biểu đồ cột điểm số theo tuần, thanh mức độ thành thạo theo chủ đề (màu theo mức độ), banner lộ trình AI đề xuất.
- **Dữ liệu liên quan:** Tổng hợp từ nhiều `results` theo thời gian; lộ trình đề xuất do AI Service tính toán định kỳ (có thể chạy batch job hàng ngày thay vì tính real-time).
- **API cần có:** `GET /analytics/progress`, `GET /analytics/recommendation`.

---

## Việc tiếp theo sau tài liệu này

1. Vẽ **use case diagram** dạng hình ảnh (Draw.io) dựa trên bảng UC ở Phần 1 — chỉ cần vẽ hình, nội dung đã có sẵn ở đây.
2. Từ schema Phần 2, viết **Mongoose schema thực tế** trong `backend/src/database/schemas/`.
3. Từ đặc tả Phần 3, bắt đầu code Frontend theo đúng thứ tự đã thống nhất: Login → Dashboard → Course → Exam → AI Tutor → Flashcard → Analytics.

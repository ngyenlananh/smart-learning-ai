import { Layers, BookmarkCheck } from "lucide-react";

type Category = "all" | "general" | "core" | "applied";
type Status = "all" | "studying" | "not_started" | "completed";

const categoryLabels: Record<Category, string> = {
  all: "Tất cả",
  general: "Lý luận chính trị & Đại cương",
  core: "Cơ sở ngành & Cốt lõi",
  applied: "Chuyên ngành & Ứng dụng",
};

const statusLabels: Record<Status, string> = {
  all: "Tất cả trạng thái",
  studying: "Đang học",
  not_started: "Chưa bắt đầu",
  completed: "Đã hoàn thành",
};

export function FilterBar({
  category,
  status,
  onCategoryChange,
  onStatusChange,
  countCategory,
  countStatus,
}: {
  category: Category;
  status: Status;
  onCategoryChange: (cat: Category) => void;
  onStatusChange: (st: Status) => void;
  countCategory: (cat: Category) => number;
  countStatus: (st: Status) => number;
}) {
  return (
    <div className="modern-filter-container">
      {/* Nhóm 1: Khối kiến thức */}
      <div className="filter-group-row">
        <div className="filter-group-label">
          <Layers size={14} className="filter-group-icon" />
          <span>Khối kiến thức</span>
        </div>
        <div className="filter-pills-list">
          {(Object.keys(categoryLabels) as Category[]).map((catKey) => {
            const isSelected = category === catKey;
            return (
              <button
                key={catKey}
                type="button"
                className={`filter-pill pill-float ${isSelected ? "selected" : ""}`}
                onClick={() => onCategoryChange(catKey)}
              >
                <span>{categoryLabels[catKey]}</span>
                <b className={`pill-counter ${isSelected ? "counter-selected" : ""}`}>
                  {countCategory(catKey)}
                </b>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nhóm 2: Trạng thái học tập */}
      <div className="filter-group-row">
        <div className="filter-group-label">
          <BookmarkCheck size={14} className="filter-group-icon" />
          <span>Trạng thái học</span>
        </div>
        <div className="filter-pills-list">
          {(Object.keys(statusLabels) as Status[]).map((stKey) => {
            const isSelected = status === stKey;
            return (
              <button
                key={stKey}
                type="button"
                className={`filter-pill pill-float ${isSelected ? "selected" : ""}`}
                onClick={() => onStatusChange(stKey)}
              >
                <span>{statusLabels[stKey]}</span>
                <b className={`pill-counter ${isSelected ? "counter-selected" : ""}`}>
                  {countStatus(stKey)}
                </b>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

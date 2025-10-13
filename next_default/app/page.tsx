export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">대시보드</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p>메인 콘텐츠가 여기에 표시됩니다.</p>
        {/* 스크롤 테스트를 위한 더미 콘텐츠 */}
        <div className="mt-4 space-y-2">
          {Array.from({ length: 50 }).map((_, i) => (
            <p key={i} className="text-gray-500">스크롤 테스트용 라인 {i + 1}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

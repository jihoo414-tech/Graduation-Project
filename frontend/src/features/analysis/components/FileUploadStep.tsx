type FileUploadStepProps = {
  mutationFile: File | null;
  expressionFile: File | null;
  onMutationFileChange: (file: File | null) => void;
  onExpressionFileChange: (file: File | null) => void;
  onBack: () => void;
};

export function FileUploadStep({
  mutationFile,
  expressionFile,
  onMutationFileChange,
  onExpressionFileChange,
  onBack,
}: FileUploadStepProps) {
  return (
    <>
      <div className="analysis-step-banner">
        <span>02</span>
        <div>
          <strong>분석 파일 업로드</strong>
          <p>돌연변이 CSV와 RNA-seq CSV를 업로드하면 모델 분석을 실행합니다.</p>
        </div>
      </div>
      <div className="upload-page-grid">
        <label className="file-dropzone">
          <span>돌연변이 유전자 CSV</span>
          <input
            aria-label="돌연변이 유전자 CSV"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => onMutationFileChange(event.target.files?.[0] ?? null)}
          />
          {mutationFile && <strong>{mutationFile.name}</strong>}
        </label>
        <label className="file-dropzone">
          <span>RNA-seq 발현량 CSV</span>
          <input
            aria-label="RNA-seq 발현량 CSV"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => onExpressionFileChange(event.target.files?.[0] ?? null)}
          />
          {expressionFile && <strong>{expressionFile.name}</strong>}
        </label>
      </div>
      <p className="clinical-disclaimer">
        이 결과는 임상 의사결정 보조용 위험 예측 정보이며, 진단 또는 치료 결정을 대체하지 않습니다.
      </p>
      <div className="button-row">
        <button className="primary-button" type="submit">
          분석 실행
        </button>
        <button className="secondary-button" type="button" onClick={onBack}>
          이전
        </button>
      </div>
    </>
  );
}

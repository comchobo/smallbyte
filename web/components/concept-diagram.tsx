import { Icon, type IconName, taskIcon } from "@/components/icon";

function Endpoint({
  icon,
  title,
  detail,
}: {
  icon: IconName;
  title: string;
  detail: string;
}) {
  return (
    <div className="diagram-endpoint">
      <Icon name={icon} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

export function ConceptDiagram({
  taskId,
  compact = false,
}: {
  taskId: string;
  compact?: boolean;
}) {
  const titles: Record<string, string> = {
    http: "요청을 보내고, 응답을 읽습니다",
    cache: "같은 URL, 다른 재검증 결과",
    dns: "연결은 세 단계를 거칩니다",
    session: "식별자는 쿠키에, 상태는 서버에",
  };
  if (!titles[taskId]) return null;
  return (
    <figure className={`concept-diagram${compact ? " is-compact" : ""}`}>
      <figcaption>
        <Icon name={taskIcon(taskId)} />
        <strong>{titles[taskId]}</strong>
        <span>개념도</span>
      </figcaption>
      {taskId === "http" && (
        <>
          <div className="diagram-exchange">
            <Endpoint icon="code" title="클라이언트" detail="요청을 구성" />
            <div className="diagram-arrows">
              <span>
                GET · HEAD · POST <Icon name="arrow" />
              </span>
              <span>
                <Icon name="arrow" className="icon points-left" /> 상태 · 헤더 ·
                본문
              </span>
            </div>
            <Endpoint
              icon="server"
              title="로컬 서버"
              detail="메서드와 경로 처리"
            />
          </div>
          <p className="diagram-note">
            HEAD 응답에는 본문이 없습니다. POST의 결과는 서버의 지원 범위에 따라
            달라집니다.
          </p>
        </>
      )}
      {taskId === "cache" && (
        <>
          <div className="diagram-cache">
            <div>
              <span>첫 요청</span>
              <strong>200</strong>
              <small>본문 + ETag 받기</small>
            </div>
            <Icon name="arrow" />
            <div>
              <span>같은 ETag 재전송</span>
              <strong>304</strong>
              <small>본문 없이 재검증</small>
            </div>
            <Icon name="arrow" />
            <div>
              <span>본문 변경 · 이전 ETag</span>
              <strong>200</strong>
              <small>새 본문 + 새 ETag</small>
            </div>
          </div>
          <p className="diagram-note">
            수동 조건부 요청의 예시입니다. 브라우저의 자동 저장·재사용과
            구분해서 살펴보세요.
          </p>
        </>
      )}
      {taskId === "dns" && (
        <>
          <div className="diagram-stages">
            <Endpoint icon="network" title="DNS" detail="이름 → 주소" />
            <Icon name="arrow" />
            <Endpoint icon="link" title="TCP" detail="IP·포트로 연결" />
            <Icon name="arrow" />
            <Endpoint icon="key" title="TLS" detail="암호화 협상·서버 인증" />
          </div>
          <p className="diagram-note">
            주소를 찾았다고 연결과 인증까지 성공한 것은 아닙니다. 멈춘 단계를
            구분합니다.
          </p>
        </>
      )}
      {taskId === "session" && (
        <>
          <div className="diagram-exchange">
            <Endpoint
              icon="user"
              title="클라이언트"
              detail="쿠키에 식별자 보관"
            />
            <div className="diagram-arrows">
              <span>
                <Icon name="arrow" className="icon points-left" /> Set-Cookie
              </span>
              <span>
                Cookie <Icon name="arrow" />
              </span>
            </div>
            <Endpoint icon="server" title="서버" detail="식별자로 조회" />
          </div>
          <p className="diagram-note">
            쿠키만 삭제한 상태와 서버 세션을 무효화한 상태는 다릅니다.
          </p>
        </>
      )}
    </figure>
  );
}

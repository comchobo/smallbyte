import type { Metadata } from "next";
import {
  PolicyDocument,
  type PolicySection,
} from "@/components/policy-document";
import { PolicyShell } from "@/components/policy-shell";
import { currentUser } from "@/lib/auth-server";
import { POLICY_CONTACT } from "@/lib/policy";

export const metadata: Metadata = {
  title: "개인정보처리방침 · smallbyte",
  description:
    "smallbyte가 처리하는 개인정보 항목, 이용 목적, 보관 기간, 제3자 처리, 쿠키와 이용자 권리를 안내합니다.",
};

const sections: PolicySection[] = [
  { id: "overview", title: "총칙" },
  { id: "items", title: "수집하는 개인정보" },
  { id: "purposes", title: "수집 및 이용 목적" },
  { id: "retention", title: "보관 기간 및 파기" },
  { id: "third-parties", title: "제3자 제공 및 처리 위탁" },
  { id: "cookies", title: "쿠키" },
  { id: "leaderboard", title: "리더보드 공개 정보" },
  { id: "rights", title: "이용자의 권리" },
  { id: "security", title: "안전성 확보 조치" },
  { id: "children", title: "아동의 개인정보" },
  { id: "contact", title: "문의 및 권익침해 구제" },
  { id: "changes", title: "방침의 변경" },
];

export default async function Page() {
  const user = await currentUser();
  return (
    <PolicyShell page="privacy" initialUser={user}>
      <PolicyDocument
        title="개인정보처리방침"
        summary="smallbyte는 학습에 필요한 최소한의 정보만 처리합니다. 어떤 정보를 왜 수집하고, 어디에 보관하며, 어떻게 삭제할 수 있는지 안내합니다."
        sections={sections}
      >
        <section id="overview">
          <h2>총칙</h2>
          <p>
            smallbyte(이하 “서비스”)는 학습자가 웹 CS 원리를 작은 실험으로
            익히고 작업물에 대한 대화로 이해를 확인하도록 돕는 학습
            서비스입니다. smallbyte 운영자(이하 “운영자”)는 개인정보 보호법 등
            관계 법령에 따라 이용자의 개인정보를 필요한 범위에서 처리하고
            안전하게 보호합니다.
          </p>
          <p>
            이 방침은 운영자가 제공하는 서비스 전체에 적용됩니다. 서비스
            화면에서 별도로 안내하는 경우에는 해당 안내가 우선합니다.
          </p>
        </section>

        <section id="items">
          <h2>수집하는 개인정보</h2>
          <p>
            서비스는 로그인, 학습 진행, 제출물 평가, 기록 제공을 위해 다음
            정보를 처리합니다.
          </p>
          <div className="policy-table-wrap">
            <table className="policy-table">
              <thead>
                <tr>
                  <th scope="col">구분</th>
                  <th scope="col">항목</th>
                  <th scope="col">수집 시점</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">계정</th>
                  <td>GitHub 사용자 ID, GitHub 아이디, 표시 이름</td>
                  <td>GitHub 로그인 시</td>
                </tr>
                <tr>
                  <th scope="row">학습 설정</th>
                  <td>학습 목적, 학습 목표, 경험 수준, 기본 제출 저장소 URL</td>
                  <td>학습 설정 또는 마이페이지 저장 시</td>
                </tr>
                <tr>
                  <th scope="row">학습 기록</th>
                  <td>
                    과제 식별자와 제목, 진행 상태, 제출 저장소 URL, 공개
                    저장소에서 읽은 텍스트 파일의 경로와 내용, 확인한 평가 항목,
                    평가 결과, 사용한 AI 모델명, 시작·완료 시각
                  </td>
                  <td>과제 시작·제출·평가 시</td>
                </tr>
                <tr>
                  <th scope="row">대화</th>
                  <td>
                    학습자가 입력한 답변, AI의 질문과 피드백, 요청 식별자, 작성
                    시각
                  </td>
                  <td>대화형 평가 시</td>
                </tr>
                <tr>
                  <th scope="row">활동</th>
                  <td>과제 시작·제출·답변·평가 완료 이벤트와 시각</td>
                  <td>서비스 이용 중 자동</td>
                </tr>
                <tr>
                  <th scope="row">인증</th>
                  <td>
                    로그인 세션 토큰의 해시, 만료 시각, OAuth state 해시,
                    브라우저 바인딩 해시
                  </td>
                  <td>로그인과 세션 생성 시</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="policy-note">
            서비스는 GitHub OAuth의 <code>read:user</code> 권한만 요청하며,
            저장소 쓰기 권한이나 이메일 주소는 요청하지 않습니다. GitHub OAuth
            액세스 토큰은 저장하지 않습니다. 제출 저장소는 공개 저장소여야 하며,
            서비스는 과제에 지정된 브랜치의 텍스트 파일만 읽습니다.
          </p>
        </section>

        <section id="purposes">
          <h2>수집 및 이용 목적</h2>
          <ul>
            <li>GitHub 계정으로 이용자를 식별하고 로그인 세션을 유지합니다.</li>
            <li>
              학습 목적·목표·경험 수준에 따라 코스 순서와 다음 과제를
              추천합니다.
            </li>
            <li>
              과제 진행 상황을 기록하고, 공개 저장소의 제출물을 읽어 AI 대화형
              평가를 제공합니다.
            </li>
            <li>학습 기록과 최근 7일 활동 리더보드를 제공합니다.</li>
            <li>
              요청 빈도 제한, 오류 대응, 부정 이용 방지로 서비스 안정성을
              유지합니다.
            </li>
            <li>문의와 개인정보 삭제 요청에 응답합니다.</li>
          </ul>
          <p>
            운영자는 위 목적과 관련 없는 용도로 개인정보를 이용하지 않으며,
            목적이 변경되면 필요한 동의를 받거나 이 방침을 통해 안내합니다.
          </p>
        </section>

        <section id="retention">
          <h2>보관 기간 및 파기</h2>
          <ul>
            <li>
              <strong>OAuth state:</strong> 생성 후 10분이 지나면 만료되며, 다음
              로그인 시 만료된 기록을 삭제합니다.
            </li>
            <li>
              <strong>로그인 세션:</strong> 마지막 로그인 후 30일 동안 유지되며,
              로그아웃하거나 만료되면 삭제됩니다. 만료된 세션은 다음 로그인 시
              정리됩니다.
            </li>
            <li>
              <strong>계정·학습 설정·학습 기록·대화·활동 기록:</strong> 이용자가
              삭제를 요청할 때까지 보관합니다. 별도의 자동 삭제 기간은 두지
              않습니다.
            </li>
            <li>
              삭제 요청을 받으면 지체 없이, 늦어도 10일 이내에 해당 정보를
              파기합니다. 관계 법령에 따라 보존해야 하는 정보는 해당 기간 동안
              분리 보관합니다.
            </li>
            <li>
              전자적 파일은 복구할 수 없는 방법으로 삭제하고, 출력물이 있는 경우
              분쇄하거나 소각합니다.
            </li>
          </ul>
          <p>
            공개 GitHub 저장소에 이미 게시된 제출물은 서비스가 삭제하더라도
            GitHub 에 남을 수 있습니다. 해당 저장소의 삭제나 공개 범위 변경은
            이용자가 직접 관리해야 합니다.
          </p>
        </section>

        <section id="third-parties">
          <h2>제3자 제공 및 처리 위탁</h2>
          <p>
            서비스는 개인정보를 판매하지 않습니다. 다음 제공자에게 서비스 운영에
            필요한 범위의 정보를 전송하거나 조회합니다.
          </p>
          <div className="policy-table-wrap">
            <table className="policy-table">
              <thead>
                <tr>
                  <th scope="col">제공자</th>
                  <th scope="col">목적</th>
                  <th scope="col">전송·조회 항목</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">GitHub, Inc.</th>
                  <td>GitHub 로그인, 공개 저장소 조회</td>
                  <td>
                    GitHub 사용자 ID·아이디·표시 이름, 제출 저장소 URL, 공개
                    저장소의 텍스트 파일
                  </td>
                </tr>
                <tr>
                  <th scope="row">Ollama</th>
                  <td>AI 대화형 평가</td>
                  <td>
                    과제 설명과 평가 기준, 제출 파일의 경로와 내용, 대화 메시지,
                    학습자 답변
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            GitHub과 Ollama의 서버는 국외에 위치할 수 있으며, 전송된 정보의
            처리에는 해당 제공자의 개인정보 처리방침이 적용됩니다. 운영자는
            제공자에게 서비스 제공 목적 외의 사용을 요청하지 않습니다.
          </p>
          <p>
            법령에 따라 수사기관 등이 적법하게 요청하는 경우를 제외하고,
            이용자의 동의 없이 제3자에게 개인정보를 제공하지 않습니다.
          </p>
        </section>

        <section id="cookies">
          <h2>쿠키</h2>
          <p>
            서비스는 로그인과 보안을 위해 필수 쿠키만 사용합니다. 분석·광고·추적
            쿠키는 사용하지 않습니다.
          </p>
          <div className="policy-table-wrap">
            <table className="policy-table">
              <thead>
                <tr>
                  <th scope="col">쿠키</th>
                  <th scope="col">목적</th>
                  <th scope="col">속성과 보관 기간</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">
                    <code>smallbyte_session</code>
                  </th>
                  <td>로그인 세션 유지</td>
                  <td>
                    HttpOnly, SameSite=Lax, HTTPS에서 Secure, 경로 `/`, 30일
                  </td>
                </tr>
                <tr>
                  <th scope="row">
                    <code>smallbyte_oauth</code>
                  </th>
                  <td>
                    GitHub 로그인 요청과 브라우저를 연결하여 위조 요청 방지
                  </td>
                  <td>
                    HttpOnly, SameSite=Lax, HTTPS에서 Secure, 경로 `/api/auth`,
                    10분
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            이용자는 브라우저 설정에서 쿠키를 차단하거나 삭제할 수 있습니다.
            다만 필수 쿠키를 차단하면 로그인과 학습 기록 저장이 동작하지
            않습니다.
          </p>
        </section>

        <section id="leaderboard">
          <h2>리더보드 공개 정보</h2>
          <p>
            로그인한 이용자는 리더보드에서 다른 이용자의 표시 이름, GitHub
            아이디 (@handle), 서비스가 이용자 ID로 생성한 아바타, 최근 7일 활동
            횟수와 순위를 볼 수 있습니다. 리더보드는 최근 7일 동안 활동한 상위
            50명과 경계의 동점자를 표시하며, 활동 횟수가 같으면 공동 순위로
            표시합니다.
          </p>
          <p>
            표시 이름은 마이페이지에서 변경할 수 있습니다. 활동 횟수는 과제
            시작, 제출, 답변, 평가 완료를 각 1회로 합산합니다. 리더보드는
            로그인한 이용자에게만 제공됩니다.
          </p>
        </section>

        <section id="rights">
          <h2>이용자의 권리</h2>
          <p>
            이용자는 언제든지 자신의 개인정보를 조회·수정하거나 처리 정지를
            요청할 수 있습니다.
          </p>
          <ul>
            <li>
              마이페이지에서 표시 이름, 학습 방향, 기본 제출 저장소를 직접
              변경할 수 있습니다.
            </li>
            <li>
              계정과 학습 기록의 삭제, 처리 정지, 동의 철회는{" "}
              <a href={`mailto:${POLICY_CONTACT}`}>{POLICY_CONTACT}</a>로 요청할
              수 있습니다. 운영자는 본인 확인 후 지체 없이 처리합니다.
            </li>
            <li>
              삭제 요청 시 리더보드와 학습 기록에서 해당 정보가 제거됩니다. 공개
              GitHub 저장소에 이미 게시된 제출물은 이용자가 직접 관리해야
              합니다.
            </li>
            <li>
              법정대리인이나 위임을 받은 대리인을 통한 요청도 가능합니다. 이
              경우 본인 또는 대리 관계를 확인할 수 있는 자료를 요청할 수
              있습니다.
            </li>
          </ul>
          <p>
            운영자는 요청을 받은 날부터 늦어도 10일 이내에 처리 결과를
            안내합니다.
          </p>
        </section>

        <section id="security">
          <h2>안전성 확보 조치</h2>
          <ul>
            <li>
              GitHub OAuth 액세스 토큰을 저장하지 않고, 로그인 세션 토큰은
              해시로 저장합니다.
            </li>
            <li>
              세션 쿠키는 HttpOnly, SameSite=Lax로 설정하고, HTTPS 환경에서는
              Secure를 적용합니다.
            </li>
            <li>
              서비스는 HTTPS로 제공되며, 요청 본문 크기와 AI 호출 빈도를
              제한합니다.
            </li>
            <li>제출된 코드를 실행하지 않고 텍스트로만 읽습니다.</li>
            <li>
              이용자별 접근 권한을 확인하여 다른 이용자의 학습 기록에 접근하지
              못하도록 합니다.
            </li>
            <li>
              개인정보 처리 시스템에 대한 접근을 최소화하고, 보안 설정을
              점검합니다.
            </li>
          </ul>
          <p>
            어떤 방법도 완전한 보안을 보장하지 않습니다. 취약점이나 개인정보
            침해 의심 상황을 발견하면 즉시 문의처로 알려 주세요.
          </p>
        </section>

        <section id="children">
          <h2>아동의 개인정보</h2>
          <p>
            서비스는 만 14세 이상 이용자를 대상으로 합니다. 만 14세 미만 아동의
            개인정보를 의도적으로 수집하지 않으며, 그러한 정보가 수집된 사실을
            알게 되면 지체 없이 삭제합니다. 만 14세 미만 아동이 서비스를 이용한
            사실을 발견한 경우 문의처로 알려 주세요.
          </p>
        </section>

        <section id="contact">
          <h2>문의 및 권익침해 구제</h2>
          <ul>
            <li>
              <strong>개인정보 보호책임자:</strong> smallbyte 운영자
            </li>
            <li>
              <strong>문의:</strong>{" "}
              <a href={`mailto:${POLICY_CONTACT}`}>{POLICY_CONTACT}</a>
            </li>
          </ul>
          <p>
            이용자는 개인정보 침해에 대한 상담을 위해 개인정보침해 신고센터(국번
            없이 118, privacy.kisa.or.kr) 또는 개인정보
            분쟁조정위원회(1833-6972, www.kopico.go.kr)에 도움을 요청할 수
            있습니다.
          </p>
        </section>

        <section id="changes">
          <h2>방침의 변경</h2>
          <p>
            이 방침은 시행일부터 적용됩니다. 내용이 변경되면 서비스 화면에 변경
            내용과 시행일을 게시합니다. 이용자 권리에 중대한 변경이 있는 경우
            시행일 7일 전부터 알립니다. 다만 법령이나 서비스 구조상 즉시 적용이
            필요한 경우에는 그 사유를 함께 안내합니다.
          </p>
        </section>
      </PolicyDocument>
    </PolicyShell>
  );
}

import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { Page, PageMain } from '../../../components/ui/page';

const sections = [
  ['1. 처리하는 개인정보', '계정 정보, 로그인 및 접속 기록, 운동 기록, 신체 정보, 캘린더 연동 상태, SMS 인증 처리 결과 등 서비스 제공에 필요한 정보를 처리합니다.'],
  ['2. 처리 목적', '회원가입, 로그인, 본인 확인, 운동 기록 관리, 통계 제공, 알림 발송, 보안 사고 대응과 서비스 개선을 위해 사용합니다.'],
  ['3. 보관 기간', '개인정보는 계정 유지 기간 동안 보관하며, 탈퇴 또는 삭제 요청 시 법령상 보관 의무가 있는 정보를 제외하고 지체 없이 삭제합니다.'],
  ['4. 제3자 제공 및 위탁', '인증, 문자 발송, 캘린더 연동, 호스팅, 데이터베이스 운영 등 서비스 제공에 필요한 범위에서 업무를 위탁할 수 있습니다.'],
  ['5. 이용자의 권리', '이용자는 개인정보 열람, 정정, 삭제, 처리 정지, 동의 철회, 데이터 내보내기를 요청할 수 있습니다.'],
  ['6. 외부 연동 안내', 'Google Calendar 연동, OAuth 로그인, SMS 인증은 각 제공자 정책의 영향을 받으며, 연동 해제 후에도 제공자 계정에서 별도 관리가 필요할 수 있습니다.'],
  ['7. 보호 조치', 'FitMate는 HttpOnly 인증 쿠키, CSRF 보호, 권한 검증, 보안 로그, 운영 환경별 CORS 제한 등 기술적 보호 조치를 적용합니다.'],
  ['8. 문의', '개인정보 보호 관련 문의는 서비스 운영자가 안내하는 고객지원 채널로 접수할 수 있습니다.'],
];

export default function PrivacyPage() {
  return (
    <Page>
      <PageMain className="max-w-4xl py-8">
        <Card className="border-white/80 bg-white shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <p className="text-sm font-bold text-muted-foreground">시행일: 2026년 5월 9일</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950">FitMate 개인정보 처리방침</h1>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              FitMate는 계정 운영, 운동 기록 관리, 알림, 캘린더 연동, 보안 관리를 위해 필요한 개인정보를 처리합니다.
            </p>

            <div className="mt-8 grid gap-6">
              {sections.map(([title, body]) => (
                <section key={title} className="border-t border-border pt-6">
                  <h2 className="text-lg font-black text-slate-950">{title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{body}</p>
                </section>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
              <Link className="text-primary hover:underline" to="/terms">이용약관</Link>
              <Link className="text-primary hover:underline" to="/data-rights">데이터 및 계정 권리 요청</Link>
              <Link className="text-primary hover:underline" to="/signup">회원가입으로 돌아가기</Link>
            </div>
          </CardContent>
        </Card>
      </PageMain>
    </Page>
  );
}

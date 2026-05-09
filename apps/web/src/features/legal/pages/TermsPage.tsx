import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { Page, PageMain } from '../../../components/ui/page';

const sections = [
  ['1. 서비스의 성격', 'FitMate는 운동 기록, 생활 습관 관리, 일정 연동을 돕는 소프트웨어 서비스입니다. 제공되는 정보는 일반적인 참고 자료이며 의료 진단이나 처방을 대체하지 않습니다.'],
  ['2. 계정과 본인 확인', '사용자는 정확한 계정 정보를 제공해야 하며, 타인의 정보를 도용하거나 계정을 공유해 발생하는 문제에 책임이 있습니다.'],
  ['3. 운동 및 건강 관련 주의', '운동 프로그램과 자세 보조 기능은 사용자의 입력과 시스템 추정에 기반합니다. 통증이나 기저질환이 있다면 전문가와 상담한 뒤 이용해야 합니다.'],
  ['4. 외부 서비스 연동', 'Google OAuth, Google Calendar, SMS, 실시간 통신 기능은 각 제공자의 정책과 장애 상황에 영향을 받을 수 있습니다.'],
  ['5. 금지 행위', '비정상적인 자동화 요청, 인증 우회, 타인 정보 접근, 허위 정보 입력, 불법적 콘텐츠 전송은 금지됩니다.'],
  ['6. 서비스 변경과 중단', 'FitMate는 보안, 운영, 기능 개선을 위해 서비스를 변경하거나 일시 중단할 수 있습니다.'],
  ['7. 문의', '약관, 계정, 결제, 데이터 처리 관련 문의는 서비스 운영자가 안내하는 고객지원 채널로 접수할 수 있습니다.'],
];

export default function TermsPage() {
  return (
    <Page>
      <PageMain className="max-w-4xl py-8">
        <Card className="border-white/80 bg-white shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <p className="text-sm font-bold text-muted-foreground">시행일: 2026년 5월 9일</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950">FitMate 이용약관</h1>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              본 약관은 FitMate가 제공하는 운동 기록, 자세 분석, 운동 추천, 캘린더 연동, 알림 및 커뮤니케이션 기능의 이용 조건을 정합니다.
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
              <Link className="text-primary hover:underline" to="/privacy">개인정보 처리방침</Link>
              <Link className="text-primary hover:underline" to="/data-rights">데이터 및 계정 권리 요청</Link>
              <Link className="text-primary hover:underline" to="/signup">회원가입으로 돌아가기</Link>
            </div>
          </CardContent>
        </Card>
      </PageMain>
    </Page>
  );
}

import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { Page, PageMain } from '../../../components/ui/page';

const sections = [
  ['요청 가능 항목', '계정 삭제, 운동 기록 및 신체 정보 삭제, 개인정보 열람, 데이터 내보내기, 캘린더 연동 해제, SMS 수신 동의 철회를 요청할 수 있습니다.'],
  ['본인 확인', '계정 보호를 위해 로그인 상태, 가입 이메일, 인증된 휴대전화번호, 최근 접속 정보 등으로 본인 여부를 확인할 수 있습니다.'],
  ['처리 기준', '법령상 보관 의무가 있는 결제, 보안, 분쟁 대응 기록을 제외하고 확인된 요청은 지체 없이 처리합니다.'],
  ['데이터 내보내기 형식', '운동 기록, 신체 기록, 계정 기본 정보는 CSV 또는 JSON 형식으로 제공할 수 있습니다.'],
  ['외부 연동 데이터', 'Google Calendar, SMS, OAuth 제공자에 이미 전달된 정보는 각 제공자의 계정 설정에서도 별도로 해제하거나 삭제해야 할 수 있습니다.'],
  ['요청 채널', '앱 설정의 고객지원 또는 운영자가 안내하는 공식 지원 채널로 요청 유형, 계정 이메일, 연락 가능한 휴대전화번호를 함께 제출하세요.'],
];

export default function DataRightsPage() {
  return (
    <Page>
      <PageMain className="max-w-4xl py-8">
        <Card className="border-white/80 bg-white shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <p className="text-sm font-bold text-muted-foreground">시행일: 2026년 5월 9일</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950">데이터 및 계정 권리 요청</h1>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              FitMate 사용자는 본인의 개인정보, 운동 기록, 신체 정보, 외부 연동 상태에 대해 열람, 정정, 삭제, 내보내기, 동의 철회를 요청할 수 있습니다.
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
              <Link className="text-primary hover:underline" to="/settings">설정으로 돌아가기</Link>
            </div>
          </CardContent>
        </Card>
      </PageMain>
    </Page>
  );
}

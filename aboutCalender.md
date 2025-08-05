자바 빠른 시작

bookmark_border


Google Calendar API에 요청을 보내는 Java 명령줄 애플리케이션을 만듭니다.

빠른 시작에서는 Google Workspace API를 호출하는 앱을 설정하고 실행하는 방법을 설명합니다. 이 빠른 시작에서는 테스트 환경에 적합한 간소화된 인증 방식을 사용합니다. 프로덕션 환경의 경우 앱에 적합한 액세스 사용자 인증 정보 선택 전에 인증 및 승인에 대해 알아보는 것이 좋습니다.

이 빠른 시작에서는 Google Workspace의 권장 API 클라이언트 라이브러리를 사용하여 인증 및 승인 흐름의 일부 세부정보를 처리합니다.

목표
환경을 설정합니다.
샘플을 설정합니다.
샘플을 실행합니다.
기본 요건
Java 11 이상
Gradle 7.0 이상
Google Cloud 프로젝트.
Google 캘린더가 사용 설정된 Google 계정
환경 설정
이 빠른 시작을 완료하려면 환경을 설정하세요.

API 사용 설정
Google API를 사용하려면 먼저 Google Cloud 프로젝트에서 사용 설정해야 합니다. 단일 Google Cloud 프로젝트에서 하나 이상의 API를 사용 설정할 수 있습니다.
Google Cloud 콘솔에서 Google Calendar API를 사용 설정합니다.

API 사용 설정

OAuth 동의 화면 구성
새 Google Cloud 프로젝트를 사용하여 이 빠른 시작을 완료하는 경우 OAuth 동의 화면을 구성합니다. Cloud 프로젝트에서 이 단계를 이미 완료했다면 다음 섹션으로 건너뜁니다.

Google Cloud 콘솔에서 메뉴 menu > > 브랜딩으로 이동합니다.
브랜딩으로 이동

을 이미 구성한 경우 브랜딩, 잠재고객, 데이터 액세스에서 다음 OAuth 동의 화면 설정을 구성할 수 있습니다. 아직 구성되지 않음이라는 메시지가 표시되면 시작하기를 클릭합니다.
앱 정보의 앱 이름에 앱 이름을 입력합니다.
사용자 지원 이메일에서 사용자가 동의에 대해 문의할 수 있는 지원 이메일 주소를 선택합니다.
다음을 클릭합니다.
시청자층에서 내부를 선택합니다.
다음을 클릭합니다.
연락처 정보에서 프로젝트 변경사항에 대한 알림을 받을 수 있는 이메일 주소를 입력합니다.
다음을 클릭합니다.
완료에서 Google API 서비스 사용자 데이터 정책을 검토하고 동의하는 경우 Google API 서비스: 사용자 데이터 정책에 동의합니다를 선택합니다.
계속을 클릭합니다.
만들기를 클릭합니다.
지금은 범위를 추가하지 않아도 됩니다. 향후 Google Workspace 조직 외부에서 사용할 앱을 만들 때는 사용자 유형을 외부로 변경해야 합니다. 그런 다음 앱에 필요한 승인 범위를 추가합니다. 자세한 내용은 OAuth 동의 구성 가이드를 참고하세요.
데스크톱 애플리케이션의 사용자 인증 정보 승인
최종 사용자를 인증하고 앱에서 사용자 데이터에 액세스하려면 OAuth 2.0 클라이언트 ID를 하나 이상 만들어야 합니다. 클라이언트 ID는 Google OAuth 서버에서 단일 앱을 식별하는 데 사용됩니다. 앱이 여러 플랫폼에서 실행되는 경우 플랫폼별로 별도의 클라이언트 ID를 만들어야 합니다.
Google Cloud 콘솔에서 메뉴 menu > > 클라이언트로 이동합니다.
클라이언트로 이동

클라이언트 만들기를 클릭합니다.
애플리케이션 유형 > 데스크톱 앱을 클릭합니다.
이름 필드에 사용자 인증 정보의 이름을 입력합니다. 이 이름은 Google Cloud 콘솔에만 표시됩니다.
만들기를 클릭합니다.
새로 만든 사용자 인증 정보가 'OAuth 2.0 클라이언트 ID' 아래에 표시됩니다.

다운로드한 JSON 파일을 credentials.json로 저장하고 파일을 작업 디렉터리로 이동합니다.
작업공간 준비
작업 디렉터리에서 새 프로젝트 구조를 만듭니다.


gradle init --type basic
mkdir -p src/main/java src/main/resources 
src/main/resources/ 디렉터리에서 이전에 다운로드한 credentials.json 파일을 복사합니다.

기본 build.gradle 파일을 열고 콘텐츠를 다음 코드로 바꿉니다.


calendar/quickstart/build.gradleGitHub에서 보기

apply plugin: 'java'
apply plugin: 'application'

mainClassName = 'CalendarQuickstart'
sourceCompatibility = 11
targetCompatibility = 11
version = '1.0'

repositories {
    mavenCentral()
}

dependencies {
    implementation 'com.google.api-client:google-api-client:2.0.0'
    implementation 'com.google.oauth-client:google-oauth-client-jetty:1.34.1'
    implementation 'com.google.apis:google-api-services-calendar:v3-rev20220715-2.0.0'
}
샘플 설정
src/main/java/ 디렉터리에서 build.gradle 파일의 mainClassName 값과 일치하는 이름의 새 Java 파일을 만듭니다.

새 Java 파일에 다음 코드를 포함합니다.


calendar/quickstart/src/main/java/CalendarQuickstart.javaGitHub에서 보기

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.Events;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.List;

/* class to demonstrate use of Calendar events list API */
public class CalendarQuickstart {
  /**
   * Application name.
   */
  private static final String APPLICATION_NAME = "Google Calendar API Java Quickstart";
  /**
   * Global instance of the JSON factory.
   */
  private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
  /**
   * Directory to store authorization tokens for this application.
   */
  private static final String TOKENS_DIRECTORY_PATH = "tokens";

  /**
   * Global instance of the scopes required by this quickstart.
   * If modifying these scopes, delete your previously saved tokens/ folder.
   */
  private static final List<String> SCOPES =
      Collections.singletonList(CalendarScopes.CALENDAR_READONLY);
  private static final String CREDENTIALS_FILE_PATH = "/credentials.json";

  /**
   * Creates an authorized Credential object.
   *
   * @param HTTP_TRANSPORT The network HTTP Transport.
   * @return An authorized Credential object.
   * @throws IOException If the credentials.json file cannot be found.
   */
  private static Credential getCredentials(final NetHttpTransport HTTP_TRANSPORT)
      throws IOException {
    // Load client secrets.
    InputStream in = CalendarQuickstart.class.getResourceAsStream(CREDENTIALS_FILE_PATH);
    if (in == null) {
      throw new FileNotFoundException("Resource not found: " + CREDENTIALS_FILE_PATH);
    }
    GoogleClientSecrets clientSecrets =
        GoogleClientSecrets.load(JSON_FACTORY, new InputStreamReader(in));

    // Build flow and trigger user authorization request.
    GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
        HTTP_TRANSPORT, JSON_FACTORY, clientSecrets, SCOPES)
        .setDataStoreFactory(new FileDataStoreFactory(new java.io.File(TOKENS_DIRECTORY_PATH)))
        .setAccessType("offline")
        .build();
    LocalServerReceiver receiver = new LocalServerReceiver.Builder().setPort(8888).build();
    Credential credential = new AuthorizationCodeInstalledApp(flow, receiver).authorize("user");
    //returns an authorized Credential object.
    return credential;
  }

  public static void main(String... args) throws IOException, GeneralSecurityException {
    // Build a new authorized API client service.
    final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
    Calendar service =
        new Calendar.Builder(HTTP_TRANSPORT, JSON_FACTORY, getCredentials(HTTP_TRANSPORT))
            .setApplicationName(APPLICATION_NAME)
            .build();

    // List the next 10 events from the primary calendar.
    DateTime now = new DateTime(System.currentTimeMillis());
    Events events = service.events().list("primary")
        .setMaxResults(10)
        .setTimeMin(now)
        .setOrderBy("startTime")
        .setSingleEvents(true)
        .execute();
    List<Event> items = events.getItems();
    if (items.isEmpty()) {
      System.out.println("No upcoming events found.");
    } else {
      System.out.println("Upcoming events");
      for (Event event : items) {
        DateTime start = event.getStart().getDateTime();
        if (start == null) {
          start = event.getStart().getDate();
        }
        System.out.printf("%s (%s)\n", event.getSummary(), start);
      }
    }
  }
}
샘플 실행
샘플을 실행합니다.


gradle run
샘플을 처음 실행하면 액세스 권한을 승인하라는 메시지가 표시됩니다.
아직 Google 계정에 로그인하지 않았다면 메시지가 표시될 때 로그인합니다. 여러 계정에 로그인되어 있는 경우 승인에 사용할 계정을 하나 선택합니다.
수락을 클릭합니다.
Java 애플리케이션이 실행되고 Google Calendar API를 호출합니다.

승인 정보는 파일 시스템에 저장되므로 다음에 샘플 코드를 실행할 때는 승인 메시지가 표시되지 않습니다.

다음 단계
이벤트 만들기
인증 및 승인 문제 해결
Calendar API 참조 문서
Java용 Google API 클라이언트 문서
Google Calendar API Javadoc 문서
도움이 되었나요?

의견 보내기

이벤트 만들기

bookmark_border

사용자가 가장 좋은 하이킹 경로를 찾는 데 도움이 되는 앱을 예로 들어 보겠습니다. 하이킹 계획을 캘린더 일정으로 추가하면 사용자가 자동으로 정리된 상태를 유지하는 데 많은 도움이 됩니다. Google Calendar를 사용하면 계획을 공유하고 알림을 받을 수 있으므로 스트레스 없이 준비할 수 있습니다. 또한 Google 제품이 원활하게 통합되어 Google Now에서 출발 시간에 관해 알려주고 Google 지도에서 약속 장소로 제때 안내합니다.

이 도움말에서는 캘린더 일정을 만들고 사용자의 캘린더에 추가하는 방법을 설명합니다.

일정 추가
이벤트를 만들려면 다음 매개변수 중 적어도 하나를 제공하여 events.insert() 메서드를 호출합니다.

calendarId는 캘린더 식별자이며 일정을 만들 캘린더의 이메일 주소이거나 로그인한 사용자의 기본 캘린더를 사용하는 특수 키워드 'primary'일 수 있습니다. 사용하려는 캘린더의 이메일 주소를 모르는 경우 Google Calendar 웹 UI의 캘린더 설정('Calendar Address' 섹션)에서 확인하거나 calendarList.list() 호출 결과에서 확인할 수 있습니다.
event는 시작 및 종료와 같은 모든 필수 세부정보가 포함된 이벤트입니다. start 및 end 시간만 필수 입력란입니다. 전체 이벤트 필드는 event 참조를 참고하세요.
start.dateTime 및 end.dateTime 필드를 사용하여 시간 설정된 이벤트를 지정합니다. 종일 일정의 경우 start.date 및 end.date를 대신 사용하세요.
이벤트를 만들려면 다음을 실행해야 합니다.

사용자의 캘린더에 대한 수정 액세스 권한을 갖도록 OAuth 범위를 https://www.googleapis.com/auth/calendar로 설정합니다.
인증된 사용자에게 제공한 calendarId로 캘린더에 대한 쓰기 액세스 권한이 있는지 확인합니다 (예: calendarId에 대해 calendarList.get()를 호출하고 accessRole를 확인).
이벤트 메타데이터 추가
캘린더 일정을 만들 때 원하는 경우 이벤트 메타데이터를 추가할 수 있습니다. 만들 때 메타데이터를 추가하지 않으려면 events.update()를 사용하여 여러 필드를 업데이트하면 됩니다. 하지만 이벤트 ID와 같은 일부 필드는 events.insert() 작업 중에만 설정할 수 있습니다.

위치
위치 입력란에 주소를 추가하면 '출발 시간' 또는 경로가 포함된 지도 표시와 같은 기능을 사용할 수 있습니다.
이벤트 ID
이벤트를 만들 때 Google의 형식 요구사항을 준수하는 자체 이벤트 ID를 생성하도록 선택할 수 있습니다. 이렇게 하면 로컬 데이터베이스의 항목을 Google Calendar의 일정과 동기화할 수 있습니다. 또한 Calendar 백엔드에서 작업이 성공적으로 실행된 후 어느 시점에서 작업이 실패하면 중복 일정이 생성되는 것을 방지합니다. 이벤트 ID를 제공하지 않으면 서버에서 ID를 자동으로 생성합니다. 자세한 내용은 이벤트 ID 참조를 참고하세요.
참석자
내가 만든 일정은 동일한 일정 ID로 포함된 참석자의 모든 기본 Google Calendar에 표시됩니다. 삽입 요청에서 sendUpdates를 "all" 또는 "externalOnly"로 설정하면 해당 참석자에게 일정에 대한 이메일 알림이 전송됩니다. 자세한 내용은 참석자가 여러 명인 이벤트를 참고하세요.
다음 예는 이벤트를 만들고 메타데이터를 설정하는 방법을 보여줍니다.

Go
자바
자바스크립트
Node.js
PHP
Python
Ruby

// Refer to the Go quickstart on how to setup the environment:
// https://developers.google.com/workspace/calendar/quickstart/go
// Change the scope to calendar.CalendarScope and delete any stored credentials.

event := &calendar.Event{
  Summary: "Google I/O 2015",
  Location: "800 Howard St., San Francisco, CA 94103",
  Description: "A chance to hear more about Google's developer products.",
  Start: &calendar.EventDateTime{
    DateTime: "2015-05-28T09:00:00-07:00",
    TimeZone: "America/Los_Angeles",
  },
  End: &calendar.EventDateTime{
    DateTime: "2015-05-28T17:00:00-07:00",
    TimeZone: "America/Los_Angeles",
  },
  Recurrence: []string{"RRULE:FREQ=DAILY;COUNT=2"},
  Attendees: []*calendar.EventAttendee{
    &calendar.EventAttendee{Email:"lpage@example.com"},
    &calendar.EventAttendee{Email:"sbrin@example.com"},
  },
}

calendarId := "primary"
event, err = srv.Events.Insert(calendarId, event).Do()
if err != nil {
  log.Fatalf("Unable to create event. %v\n", err)
}
fmt.Printf("Event created: %s\n", event.HtmlLink)

일정에 Drive 첨부파일 추가하기
Docs의 회의 메모, Sheets의 예산, Slides의 프레젠테이션 또는 기타 관련 Google Drive 파일과 같은 Google Drive 파일을 캘린더 일정에 첨부할 수 있습니다. events.patch()와 같은 업데이트의 일부로 events.insert() 이상 버전으로 이벤트를 만들 때 첨부파일을 추가할 수 있습니다.

Google Drive 파일을 일정에 첨부하는 방법은 다음과 같습니다.

일반적으로 files.get() 메서드를 사용하여 Drive API 파일 리소스에서 파일 alternateLink URL, title, mimeType를 가져옵니다.
요청 본문에 attachments 필드를 설정하고 supportsAttachments 매개변수를 true로 설정하여 이벤트를 만들거나 업데이트합니다.
다음 코드 예는 기존 이벤트를 업데이트하여 첨부파일을 추가하는 방법을 보여줍니다.

자바
PHP
Python

public static void addAttachment(Calendar calendarService, Drive driveService, String calendarId,
    String eventId, String fileId) throws IOException {
  File file = driveService.files().get(fileId).execute();
  Event event = calendarService.events().get(calendarId, eventId).execute();

  List<EventAttachment> attachments = event.getAttachments();
  if (attachments == null) {
    attachments = new ArrayList<EventAttachment>();
  }
  attachments.add(new EventAttachment()
      .setFileUrl(file.getAlternateLink())
      .setMimeType(file.getMimeType())
      .setTitle(file.getTitle()));

  Event changes = new Event()
      .setAttachments(attachments);
  calendarService.events().patch(calendarId, eventId, changes)
      .setSupportsAttachments(true)
      .execute();
}

중요: 로컬에 이벤트를 저장하는 기존 앱에 첨부파일 지원을 추가할 때 이벤트 수정을 위해 supportsAttachments 매개변수를 사용 설정하기 전에 모든 이벤트의 전체 동기화를 실행해야 합니다. 먼저 동기화하지 않으면 사용자의 일정에서 기존 첨부파일이 실수로 삭제될 수 있습니다.
일정에 화상 회의 및 전화 회의 추가
일정을 행아웃 및 Google Meet 회의와 연결하여 사용자가 전화 통화나 영상 통화를 통해 원격으로 회의할 수 있도록 허용할 수 있습니다.

conferenceData 필드는 기존 회의 세부정보를 읽고, 복사하고, 지우는 데 사용할 수 있습니다. 새 회의 생성을 요청하는 데도 사용할 수 있습니다. 회의 세부정보를 만들고 수정할 수 있도록 하려면 conferenceDataVersion 요청 매개변수를 1로 설정하세요.

현재 지원되는 conferenceData 유형은 세 가지이며 conferenceData.conferenceSolution.key.type로 표시됩니다.

소비자용 행아웃 (eventHangout)
Google Workspace 사용자를 위한 기존 행아웃(지원 중단됨, eventNamedHangout)
Google Meet (hangoutsMeet)
calendars 및 calendarList 컬렉션의 conferenceProperties.allowedConferenceSolutionTypes를 확인하여 사용자의 특정 캘린더에서 지원되는 회의 유형을 확인할 수 있습니다. settings 컬렉션에서 autoAddHangouts 설정을 확인하여 사용자가 새로 만든 모든 일정에 대해 행아웃을 만들지 여부도 알 수 있습니다.

type 외에도 conferenceSolution는 아래와 같이 회의 솔루션을 나타내는 데 사용할 수 있는 name 및 iconUri 필드를 제공합니다.

자바스크립트

const solution = event.conferenceData.conferenceSolution;

const content = document.getElementById("content");
const text = document.createTextNode("Join " + solution.name);
const icon = document.createElement("img");
icon.src = solution.iconUri;

content.appendChild(icon);
content.appendChild(text);

임의의 string일 수 있는 새로 생성된 requestId를 사용하여 createRequest에 이벤트의 새 회의를 만들 수 있습니다. 회의는 비동기식으로 생성되지만 언제든지 요청 상태를 확인하여 사용자에게 진행 상황을 알릴 수 있습니다.

예를 들어 기존 이벤트에 대한 회의 생성을 요청하려면 다음 단계를 따르세요.

자바스크립트

const eventPatch = {
  conferenceData: {
    createRequest: {requestId: "7qxalsvy0e"}
  }
};

gapi.client.calendar.events.patch({
  calendarId: "primary",
  eventId: "7cbh8rpc10lrc0ckih9tafss99",
  resource: eventPatch,
  sendUpdates: "all",
  conferenceDataVersion: 1
}).execute(function(event) {
  console.log("Conference created for event: %s", event.htmlLink);
});

이 호출에 대한 즉각적인 응답에는 아직 완전히 채워진 conferenceData가 포함되지 않을 수 있습니다. 이는 상태 필드의 상태 코드 pending로 표시됩니다. 회의 정보가 채워지면 상태 코드가 success로 변경됩니다. entryPoints 필드에는 사용자가 전화를 걸 수 있는 동영상 및 전화 URI에 관한 정보가 포함됩니다.

동일한 회의 세부정보로 여러 개의 Calendar 일정을 예약하려면 한 일정에서 다른 일정으로 전체 conferenceData를 복사하면 됩니다.

복사는 특정 상황에서 유용합니다. 예를 들어 후보자와 인터뷰자를 위해 별도의 이벤트를 설정하는 채용 애플리케이션을 개발하고 있다고 가정해 보겠습니다. 인터뷰자의 신원을 보호하고자 하지만 모든 참석자가 동일한 회의 통화에 참여하도록 하려 합니다.

중요: 회의 데이터 지원을 사용 설정하기 전에 (이벤트 수정을 위해 conferenceDataVersion 요청 매개변수를 1로 설정) 모든 이벤트의 전체 동기화를 실행해야 합니다. 이는 회의를 로컬에 저장하는 기존 앱에 회의 지원을 추가할 때 적용됩니다. 먼저 동기화하지 않으면 사용자의 일정에서 기존 회의가 실수로 삭제될 수 있습니다.

인증 및 승인 문제 해결

bookmark_border
이 페이지에서는 인증 및 승인과 관련하여 발생할 수 있는 몇 가지 일반적인 문제를 설명합니다.

This app isn't verified
OAuth 동의 화면에 '이 앱은 확인되지 않았습니다'라는 경고가 표시되면 앱에서 민감한 사용자 데이터에 대한 액세스를 제공하는 범위를 요청하고 있는 것입니다. 애플리케이션에서 민감한 범위를 사용하는 경우 앱은 인증 절차를 거쳐야 경고 및 기타 제한사항을 삭제할 수 있습니다. 개발 단계에서는 고급 > {Project Name}(안전하지 않음)으로 이동을 선택하여 이 경고를 무시하고 계속 진행할 수 있습니다.

File not found error for credentials.json
코드 샘플을 실행할 때 credentials.json과 관련하여 '파일을 찾을 수 없음' 또는 '파일이 없음' 오류 메시지가 표시될 수 있습니다.

이 오류는 데스크톱 애플리케이션 사용자 인증 정보를 승인하지 않은 경우에 발생합니다. 데스크톱 애플리케이션의 사용자 인증 정보를 만드는 방법을 알아보려면 사용자 인증 정보 만들기를 참고하세요.

사용자 인증 정보를 만든 후 다운로드한 JSON 파일이 credentials.json로 저장되었는지 확인합니다. 그런 다음 파일을 작업 디렉터리로 이동합니다.

Token has been expired or revoked
코드 샘플을 실행하면 '토큰이 만료되었습니다' 또는 '토큰이 취소되었습니다' 오류 메시지가 표시될 수 있습니다.

이 오류는 Google 승인 서버의 액세스 토큰이 만료되었거나 취소되었을 때 발생합니다. 가능한 원인 및 해결 방법에 관한 자세한 내용은 갱신 토큰 만료를 참고하세요.

JavaScript 오류
다음은 몇 가지 일반적인 JavaScript 오류입니다.

Error: origin_mismatch
웹페이지를 제공하는 데 사용된 호스트 및 포트가 Google Cloud 콘솔 프로젝트에서 허용된 JavaScript 출처와 일치하지 않으면 승인 흐름 중에 이 오류가 발생합니다. 승인된 JavaScript 출처를 설정했는지, 브라우저의 URL이 출처 URL과 일치하는지 확인합니다.

idpiframe_initialization_failed: Failed to read the 'localStorage' property from 'Window'
이 오류는 브라우저에서 서드 파티 쿠키 및 데이터 저장소가 사용 설정되지 않은 경우 발생합니다. 이 옵션은 Google 로그인 라이브러리에 필요합니다. 자세한 내용은 서드 파티 쿠키 및 데이터 저장소를 참고하세요.

참고: 자체 앱에서는 사용자에게 서드 파티 쿠키 및 데이터 저장소를 사용 설정하거나 accounts.google.com에 대한 예외를 추가하라는 메시지를 표시해야 합니다.
idpiframe_initialization_failed: Not a valid origin for the client
등록된 도메인이 웹페이지 호스팅에 사용되는 도메인과 일치하지 않을 때 이 오류가 발생합니다. 등록한 출처가 브라우저의 URL과 일치하는지 확인합니다.

API Reference

bookmark_border


이 API 참조는 리소스 유형을 기준으로 구성되어 있습니다. 각 리소스 유형은 하나 이상의 데이터 표현 및 하나 이상의 메소드를 갖습니다.

리소스 유형
Acl 
Acl 리소스에 대한 자세한 내용은 리소스 표현 페이지를 참고하세요.

메서드	HTTP 요청	설명
별도로 명시하지 않는 한 URI는 https://www.googleapis.com/calendar/v3을 기준으로 합니다.
삭제	DELETE  /calendars/calendarId/acl/ruleId	액세스 제어 규칙을 삭제합니다.
get	GET  /calendars/calendarId/acl/ruleId	액세스 제어 규칙을 반환합니다.
insert	POST  /calendars/calendarId/acl	액세스 제어 규칙을 만듭니다.
list	GET  /calendars/calendarId/acl	캘린더의 액세스 제어 목록에 있는 규칙을 반환합니다.
patch	PATCH  /calendars/calendarId/acl/ruleId	액세스 제어 규칙을 업데이트합니다. 이 메소드는 패치 의미 체계를 지원합니다. 각 패치 요청은 3개의 할당량 단위를 사용합니다. get 뒤에 update을 사용하는 것이 좋습니다. 지정하는 필드 값은 기존 값을 대체합니다. 요청에 지정하지 않은 필드는 변경되지 않고 유지됩니다. 배열 필드(지정된 경우)는 기존 배열을 덮어씁니다. 이렇게 하면 이전 배열 요소가 삭제됩니다.
업데이트	PUT  /calendars/calendarId/acl/ruleId	액세스 제어 규칙을 업데이트합니다.
시청	POST  /calendars/calendarId/acl/watch	ACL 리소스의 변경사항을 확인합니다.
CalendarList 
CalendarList 리소스에 대한 자세한 내용은 리소스 표현 페이지를 참고하세요.

메서드	HTTP 요청	설명
별도로 명시하지 않는 한, URI는 https://www.googleapis.com/calendar/v3을 기준으로 합니다.
삭제	DELETE  /users/me/calendarList/calendarId	사용자의 캘린더 목록에서 캘린더를 삭제합니다.
get	GET  /users/me/calendarList/calendarId	사용자의 캘린더 목록에서 캘린더를 반환합니다.
insert	POST  /users/me/calendarList	사용자의 캘린더 목록에 기존 캘린더를 삽입합니다.
list	GET  /users/me/calendarList	사용자의 캘린더 목록에 있는 캘린더를 반환합니다.
patch	PATCH  /users/me/calendarList/calendarId	사용자의 캘린더 목록에서 기존 캘린더를 업데이트합니다. 이 메소드는 패치 의미 체계를 지원합니다. 각 패치 요청은 3개의 할당량 단위를 사용합니다. get 뒤에 update을 사용하는 것이 좋습니다. 지정하는 필드 값은 기존 값을 대체합니다. 요청에 지정하지 않은 필드는 변경되지 않고 유지됩니다. 배열 필드(지정된 경우)는 기존 배열을 덮어씁니다. 이렇게 하면 이전 배열 요소가 삭제됩니다.
업데이트	PUT  /users/me/calendarList/calendarId	사용자의 캘린더 목록에서 기존 캘린더를 업데이트합니다.
시청	POST  /users/me/calendarList/watch	CalendarList 리소스의 변경사항을 확인합니다.
캘린더 
Calendars 리소스에 대한 자세한 내용은 리소스 표현 페이지를 참고하세요.

메서드	HTTP 요청	설명
별도로 명시하지 않는 한, URI는 https://www.googleapis.com/calendar/v3을 기준으로 합니다.
지우기	POST  /calendars/calendarId/clear	기본 캘린더를 삭제합니다. 이 작업을 수행하면 계정의 기본 캘린더와 연결된 모든 일정이 삭제됩니다.
삭제	DELETE  /calendars/calendarId	보조 캘린더를 삭제합니다. 기본 캘린더의 모든 일정을 삭제하려면 calendars.clear를 사용하세요.
get	GET  /calendars/calendarId	캘린더의 메타데이터를 반환합니다.
insert	POST  /calendars	보조 캘린더를 만듭니다.
patch	PATCH  /calendars/calendarId	캘린더의 메타데이터를 업데이트합니다. 이 메소드는 패치 의미 체계를 지원합니다. 각 패치 요청은 3개의 할당량 단위를 사용합니다. get 뒤에 update을 사용하는 것이 좋습니다. 지정하는 필드 값은 기존 값을 대체합니다. 요청에 지정하지 않은 필드는 변경되지 않고 유지됩니다. 배열 필드(지정된 경우)는 기존 배열을 덮어씁니다. 이렇게 하면 이전 배열 요소가 삭제됩니다.
업데이트	PUT  /calendars/calendarId	캘린더의 메타데이터를 업데이트합니다.
채널 
채널 리소스에 대한 자세한 내용은 리소스 표현 페이지를 참고하세요.

메서드	HTTP 요청	설명
별도로 명시하지 않는 한, URI는 https://www.googleapis.com/calendar/v3을 기준으로 합니다.
stop	POST  /channels/stop	이 채널을 통해 리소스를 시청하지 마세요.
색상 
Colors 리소스에 대한 자세한 내용은 리소스 표현 페이지를 참고하세요.

메서드	HTTP 요청	설명
별도로 명시하지 않는 한, URI는 https://www.googleapis.com/calendar/v3을 기준으로 합니다.
get	GET  /colors	캘린더 및 일정의 색상 정의를 반환합니다.
이벤트 
Events 리소스에 대한 자세한 내용은 리소스 표현 페이지를 참고하세요.

메서드	HTTP 요청	설명
별도로 명시하지 않는 한, URI는 https://www.googleapis.com/calendar/v3을 기준으로 합니다.
삭제	DELETE  /calendars/calendarId/events/eventId	일정을 삭제합니다.
get	GET  /calendars/calendarId/events/eventId	Google Calendar ID를 기반으로 일정을 반환합니다. iCalendar ID를 사용하여 일정을 검색하려면 iCalUID 매개변수를 사용하여 events.list 메서드를 호출합니다.
import	POST  /calendars/calendarId/events/import	일정을 가져옵니다. 이 작업은 기존 일정의 비공개 사본을 캘린더에 추가하는 데 사용됩니다. eventType이 default인 이벤트만 가져올 수 있습니다.
지원 중단된 동작: default가 아닌 이벤트를 가져오면 유형이 default로 변경되고 이벤트 유형별 속성이 있는 경우 모두 삭제됩니다.

insert	POST  /calendars/calendarId/events	일정을 만듭니다.
인스턴스	GET  /calendars/calendarId/events/eventId/instances	지정된 반복 일정의 인스턴스를 반환합니다.
list	GET  /calendars/calendarId/events	지정된 캘린더의 일정을 반환합니다.
이동	POST  /calendars/calendarId/events/eventId/move	일정을 다른 캘린더로 이동합니다. 즉, 일정의 주최자를 변경합니다. default 이벤트만 이동할 수 있습니다. birthday, focusTime, fromGmail, outOfOffice, workingLocation 이벤트는 이동할 수 없습니다.
필수 쿼리 매개변수: destination

patch	PATCH  /calendars/calendarId/events/eventId	일정을 업데이트합니다. 이 메소드는 패치 의미 체계를 지원합니다. 각 패치 요청은 3개의 할당량 단위를 사용합니다. get 뒤에 update을 사용하는 것이 좋습니다. 지정하는 필드 값은 기존 값을 대체합니다. 요청에 지정하지 않은 필드는 변경되지 않고 유지됩니다. 배열 필드(지정된 경우)는 기존 배열을 덮어씁니다. 이렇게 하면 이전 배열 요소가 모두 삭제됩니다.
quickAdd	POST  /calendars/calendarId/events/quickAdd	간단한 텍스트 문자열을 기반으로 이벤트를 만듭니다.
필수 쿼리 매개변수: text

업데이트	PUT  /calendars/calendarId/events/eventId	일정을 업데이트합니다. 이 메서드는 패치 시맨틱스를 지원하지 않으며 항상 전체 이벤트 리소스를 업데이트합니다. 부분 업데이트를 수행하려면 get 다음에 etag를 사용하여 update를 실행하여 원자성을 보장합니다.
시청	POST  /calendars/calendarId/events/watch	이벤트 리소스의 변경사항을 확인합니다.
한가함/바쁨 
Freebusy 리소스에 대한 자세한 내용은 리소스 표현 페이지를 참고하세요.

메서드	HTTP 요청	설명
별도로 명시하지 않는 한, URI는 https://www.googleapis.com/calendar/v3을 기준으로 합니다.
query	POST  /freeBusy	캘린더 세트의 한가함/바쁨 정보를 반환합니다.
설정 
Settings 리소스에 대한 자세한 내용은 리소스 표현 페이지를 참고하세요.

메서드	HTTP 요청	설명
별도로 명시하지 않는 한, URI는 https://www.googleapis.com/calendar/v3을 기준으로 합니다.
get	GET  /users/me/settings/setting	단일 사용자 설정을 반환합니다.
list	GET  /users/me/settings	인증된 사용자의 모든 사용자 설정을 반환합니다.
시청	POST  /users/me/settings/watch	설정 리소스의 변경사항을 확인합니다.

Java에서 Google API에 쉽게 액세스

자바용 Google API 클라이언트 라이브러리는 모든 Google API에 공통적인 기능(예: HTTP 전송, 오류 처리, 인증, JSON 파싱, 미디어 다운로드/업로드, 일괄 처리)을 제공합니다. 라이브러리에는 일관된 인터페이스를 갖춘 강력한 OAuth 2.0 라이브러리, 모든 데이터 스키마를 지원하는 가볍고 효율적인 XML 및 JSON 데이터 모델, 프로토콜 버퍼가 지원됩니다.

자바용 Google 클라이언트 클라이언트를 사용하여 Google API를 호출하려면 액세스하는 Google API에 생성된 자바 라이브러리가 필요합니다. 생성된 라이브러리에는 핵심 google-api-java-client 라이브러리와 함께 루트 URL과 같은 API 관련 정보가 포함됩니다. 또한 API 컨텍스트에서 항목을 나타내고 JSON 객체와 자바 객체 간에 변환하는 데 유용한 클래스도 포함됩니다.
베타 기능
클래스 또는 메서드 수준에서 @Beta로 표시된 기능은 변경될 수 있습니다. 주요 버전에서 수정되거나 삭제될 수 있습니다. 코드가 라이브러리 자체인 경우 (즉, 제어할 수 없는 사용자의 CLASSPATH에서 코드가 사용되는 경우) 베타 기능을 사용하지 마세요.
지원이 중단된 기능
지원 중단된 비 베타 기능은 처음 지원 중단된 출시로부터 18개월 후에 삭제됩니다. 그 전에 사용 설정을 수정해야 합니다. 그러지 않으면 모든 유형의 손상이 발생할 수 있으며 컴파일 오류가 보장되지 않습니다.
Java용 Google API 클라이언트 라이브러리의 주요 사항
Google API를 호출하는 것은 간단합니다.
Java용 Google API 클라이언트 라이브러리와 함께 Google 서비스별로 생성된 라이브러리를 사용하여 Google API를 호출할 수 있습니다. Google API용으로 생성된 클라이언트 라이브러리를 찾으려면 지원되는 Google API 목록을 참고하세요. 다음은 Java용 Calendar API 클라이언트 라이브러리를 사용하여 Google Calendar API를 호출하는 예입니다.

 // Show events on user's calendar.
 View.header("Show Calendars");
 CalendarList feed = client.calendarList().list().execute();
 View.display(feed);

라이브러리를 사용하면 더 쉽게 일괄 처리 및 미디어 업로드/다운로드를 할 수 있습니다.
라이브러리는 일괄 처리, 미디어 업로드, 미디어 다운로드를 위한 도우미 클래스를 제공합니다.
라이브러리를 사용하면 인증이 더 쉬워집니다.
이 라이브러리에는 OAuth 2.0을 처리하는 데 필요한 코드의 양을 줄일 수 있는 강력한 인증 라이브러리가 포함되어 있습니다. 몇 줄만으로도 충분한 경우도 있습니다. 예:

 /** Authorizes the installed application to access user's protected data. */
 private static Credential authorize() throws Exception {
   // load client secrets
   GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(JSON_FACTORY,
       new InputStreamReader(CalendarSample.class.getResourceAsStream("/client_secrets.json")));
   // set up authorization code flow
   GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
       httpTransport, JSON_FACTORY, clientSecrets,
       Collections.singleton(CalendarScopes.CALENDAR)).setDataStoreFactory(dataStoreFactory)
      .build();
   // authorize
   return new AuthorizationCodeInstalledApp(flow, new LocalServerReceiver()).authorize("user");
}
라이브러리는 Google App Engine에서 실행됩니다.
App Engine용 도우미를 사용하면 인증된 API 호출을 빠르게 처리할 수 있으며 코드를 토큰으로 교환하는 데 대해 걱정할 필요가 없습니다.

예:

 @Override
 protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
   AppIdentityCredential credential =
       new AppIdentityCredential(Arrays.asList(UrlshortenerScopes.URLSHORTENER));
   Urlshortener shortener =
       new Urlshortener.Builder(new UrlFetchTransport(), new JacksonFactory(), credential)
       .build();
   UrlHistory history = shortener.URL().list().execute();
   ...
 }
라이브러리는 Android 4.4 이상에서 실행됩니다.
Java용 Google 클라이언트 라이브러리의 Android용 도우미 클래스는 Android AccountManager와 잘 통합되어 있습니다. 예를 들면 다음과 같습니다.

 @Override
 public void onCreate(Bundle savedInstanceState) {
   super.onCreate(savedInstanceState);
   // Google Accounts
   credential =
       GoogleAccountCredential.usingOAuth2(this, Collections.singleton(TasksScopes.TASKS));
   SharedPreferences settings = getPreferences(Context.MODE_PRIVATE);
   credential.setSelectedAccountName(settings.getString(PREF_ACCOUNT_NAME, null));
   // Tasks client
   service =
       new com.google.api.services.tasks.Tasks.Builder(httpTransport, jsonFactory, credential)
           .setApplicationName("Google-TasksAndroidSample/1.0").build();
 }
간단한 설치
생성된 라이브러리를 사용하지 않는 경우 다운로드 페이지에서 Java용 Google API 클라이언트 라이브러리의 바이너리를 직접 다운로드하거나 Maven 또는 Gradle을 사용할 수 있습니다. Maven을 사용하려면 pom.xml 파일에 다음 줄을 추가합니다.

 <project>
  <dependencies>
   <dependency>
     <groupId>com.google.api-client</groupId>
     <artifactId>google-api-client</artifactId>
     <version>1.32.1</version>
   </dependency>
  </dependencies>
 </project>

Gradle을 사용하려면 build.gradle 파일에 다음 줄을 추가합니다.

 repositories {
      mavenCentral()
  }
  dependencies {
      compile 'com.google.api-client:google-api-client:1.32.1'
  }
Java용 Google API 클라이언트 라이브러리 설치 및 설정에 관한 자세한 내용은 다운로드 및 설정 안내를 참고하세요.
지원되는 환경
Java용 Google API 클라이언트 라이브러리는 다음과 같은 Java 환경을 지원합니다.
자바 7 이상, 표준 (SE), 엔터프라이즈 (EE)
Google App Engine
Android 4.4 이상 — 필요한 Google 서비스에서 Google Play 서비스 라이브러리를 사용할 수 있는 경우 이 라이브러리 대신 해당 라이브러리를 사용하세요. Google Play 라이브러리는 최상의 성능과 환경을 제공합니다.
지원되지 않음: Google Web Toolkit (GWT), Java 모바일 (ME), Java 6 (또는 이전).
종속 항목
Java용 Google API 클라이언트 라이브러리 (google-api-java-client)는 Google에서 만든 두 가지 공통 라이브러리를 기반으로 하며 웹의 모든 HTTP 서비스와 함께 작동하도록 설계되었습니다.
Java용 Google HTTP 클라이언트 라이브러리
Java용 Google OAuth 클라이언트 라이브러리
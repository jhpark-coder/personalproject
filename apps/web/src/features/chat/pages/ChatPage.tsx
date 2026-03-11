import ChatPage from '../../../components/ChatPage';

export default function ChatPageRoute() {
  return <ChatPage onClose={() => window.history.back()} isModal={false} />;
}

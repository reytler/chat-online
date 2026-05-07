import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Chat } from './pages/Chat';
import { Invite } from './pages/Invite';
import { Login } from './pages/Login';
import { PrivateChatRoom } from './pages/PrivateChatRoom';
import { AppProviders, useSession } from './Contexts';
import { NotificationContainer } from './Components/Notification';

function ProtectedChatRoute() {
  const { user } = useSession();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Chat />;
}

function App() {
  

  return (
    <BrowserRouter>
      <AppProviders>
        <NotificationContainer />
        <Routes>
          <Route path="/chat" element={<ProtectedChatRoute/>} />
          <Route path="/chat/private/:roomId" element={<PrivateChatRoom/>} />
          <Route path="/invite/:token" element={<Invite/>} />
          <Route path="/" element={<Login/>} />
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
export default App;

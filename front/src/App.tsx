import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Chat } from './pages/Chat';
import { Login } from './pages/Login';
import { MainProvider, useMain } from './Contexts';
import { NotificationContainer } from './Components/Notification';

function ProtectedChatRoute() {
  const { user } = useMain();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Chat />;
}

function App() {
  

  return (
    <BrowserRouter>
      <MainProvider>
        <NotificationContainer />
        <Routes>
          <Route path="/chat" element={<ProtectedChatRoute/>} />
          <Route path="/" element={<Login/>} />
        </Routes>
      </MainProvider>
    </BrowserRouter>
  );
}
export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Chat } from './pages/Chat';
import { Login } from './pages/Login';
import { MainProvider } from './Contexts';

function App() {
  

  return (
    <BrowserRouter>
      <MainProvider>
        <Routes>
          <Route path="/chat" element={<Chat/>} />
          <Route path="/" element={<Login/>} />
        </Routes>
      </MainProvider>
    </BrowserRouter>
  );
}
export default App;

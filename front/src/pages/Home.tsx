import HomeComponent from "../Components/HomeComponent";

export default function HomePage() {
  return (
    <>
      <header className="w-[100%] flex justify-center mt-2 text-3xl h-[0.5vh]">
        <h1>Chat Online</h1>
      </header>
      <main>
        <HomeComponent/>
      </main>
      {/* <footer className="fixed bottom-0 left-0 w-full text-center bg-gray-200 py-2 text-xs">
        © 2025 Rmss
      </footer> */}
    </>
  );
}

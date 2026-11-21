import { AppLayout } from './components/index.js';
import {
  ConsentScreen,
  HomeScreen,
  ListeningScreen,
  AskingScreen,
  SummaryScreen,
  ShowingScreen,
  CrisisScreen,
  ErrorScreen,
} from './screens/index.js';
import { StateProvider, useAppState } from './state/index.js';

function MainRouter() {
  const { state } = useAppState();

  const renderScreen = () => {
    switch (state.screen) {
      case 'consent':
        return <ConsentScreen />;
      case 'home':
        return <HomeScreen />;
      case 'listening':
        return <ListeningScreen />;
      case 'asking':
        return <AskingScreen />;
      case 'summary':
        return <SummaryScreen />;
      case 'showing':
        return <ShowingScreen />;
      case 'crisis':
        return <CrisisScreen />;
      case 'error':
        return <ErrorScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return <AppLayout>{renderScreen()}</AppLayout>;
}

export default function App() {
  return (
    <StateProvider>
      <MainRouter />
    </StateProvider>
  );
}

import ReactDOM from 'react-dom/client';
import './index.css';
import Notch from './Notch';
import SettingsPage from './Settings';

// Satu bundle, dua jendela: jendela pengaturan dibuka dengan hash #settings
const isSettings = window.location.hash === '#settings';
ReactDOM.createRoot(document.getElementById('root')!).render(isSettings ? <SettingsPage /> : <Notch />);

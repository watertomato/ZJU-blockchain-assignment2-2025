import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store } from './store';
import MainLayout from './components/Layout/MainLayout';
import ProjectsPage from './pages/ProjectsPage';
import CreateProjectPage from './pages/CreateProjectPage';
import MarketPage from './pages/MarketPage';
import './App.css';

const App: React.FC = () => {
  const [selectedPage, setSelectedPage] = useState('projects');

  const renderContent = () => {
    if (selectedPage === 'create-project') {
      return (
        <CreateProjectPage
          onBack={() => setSelectedPage('projects')}
          onSuccess={(projectId: string) => {
            setSelectedPage('projects');
          }}
        />
      );
    }

    switch (selectedPage) {
      case 'projects':
        return (
          <ProjectsPage 
            onCreateProject={() => setSelectedPage('create-project')}
          />
        );
      case 'market':
        return <MarketPage />;
      case 'my-tickets':
        return <MarketPage defaultTab="myTickets" />;
      case 'notary':
        return <div>公证人面板开发中...</div>;
      default:
        return (
          <ProjectsPage 
            onCreateProject={() => setSelectedPage('create-project')}
          />
        );
    }
  };

  return (
    <Provider store={store}>
      <ConfigProvider locale={zhCN}>
        <MainLayout 
          selectedKey={selectedPage} 
          onMenuSelect={setSelectedPage}
        >
          {renderContent()}
        </MainLayout>
      </ConfigProvider>
    </Provider>
  );
};

export default App;

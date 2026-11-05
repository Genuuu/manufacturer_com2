import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { CommunicationView } from './components/CommunicationView';
import { ManufacturerView } from './components/ManufacturerView';
import { AccessView } from './components/AccessView';
import { LoginView } from './components/LoginView';
import { CommunicationModal } from './components/CommunicationModal';
import { ManufacturerModal } from './components/ManufacturerModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { CommunicationEntry, Manufacturer } from './types';

const MainLayout: React.FC = () => {
  const { activeTab, isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Modal States
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [commStartWithAi, setCommStartWithAi] = useState(false);
  const [editingComm, setEditingComm] = useState<CommunicationEntry | null>(null);
  const [commPreselectedMId, setCommPreselectedMId] = useState<string | null>(null);

  const [mModalOpen, setMModalOpen] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [previewDocName, setPreviewDocName] = useState('');
  const [previewDocTitle, setPreviewDocTitle] = useState('');

  // Handlers
  const handleOpenNewComm = () => {
    setEditingComm(null);
    setCommPreselectedMId(null);
    setCommStartWithAi(false);
    setCommModalOpen(true);
  };

  const handleOpenAiComm = () => {
    setEditingComm(null);
    setCommPreselectedMId(null);
    setCommStartWithAi(true);
    setCommModalOpen(true);
  };

  const handleOpenEditComm = (entry?: CommunicationEntry) => {
    setEditingComm(entry || null);
    setCommPreselectedMId(null);
    setCommStartWithAi(false);
    setCommModalOpen(true);
  };

  const handleOpenCommForManufacturer = (mId: string) => {
    setEditingComm(null);
    setCommPreselectedMId(mId);
    setCommStartWithAi(false);
    setCommModalOpen(true);
  };

  const handleOpenNewManufacturer = () => {
    setEditingManufacturer(null);
    setMModalOpen(true);
  };

  const handleOpenEditManufacturer = (m?: Manufacturer) => {
    setEditingManufacturer(m || null);
    setMModalOpen(true);
  };

  const handlePreviewDoc = (filename: string, title: string) => {
    setPreviewDocName(filename);
    setPreviewDocTitle(title);
    setDocModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Clean Top Navbar */}
      <Navbar
        onOpenCommModal={handleOpenNewComm}
        onOpenAiCommModal={handleOpenAiComm}
        onOpenManufacturerModal={handleOpenNewManufacturer}
      />

      {/* Main Single-Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
        {activeTab === 'overview' && (
          <OverviewView
            onOpenCommModalWithManufacturer={handleOpenCommForManufacturer}
            onPreviewDoc={handlePreviewDoc}
          />
        )}

        {activeTab === 'communications' && (
          <CommunicationView
            onOpenCommModal={handleOpenEditComm}
            onPreviewDoc={handlePreviewDoc}
          />
        )}

        {activeTab === 'manufacturers' && (
          <ManufacturerView
            onOpenManufacturerModal={handleOpenEditManufacturer}
            onOpenCommModalWithManufacturer={handleOpenCommForManufacturer}
            onPreviewDoc={handlePreviewDoc}
          />
        )}

        {activeTab === 'permissions' && <AccessView />}
      </main>

      {/* Modals */}
      <CommunicationModal
        isOpen={commModalOpen}
        onClose={() => setCommModalOpen(false)}
        initialEntry={editingComm}
        preselectedManufacturerId={commPreselectedMId}
        startWithAiOpen={commStartWithAi}
      />

      <ManufacturerModal
        isOpen={mModalOpen}
        onClose={() => setMModalOpen(false)}
        manufacturer={editingManufacturer}
      />

      <DocumentPreviewModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        filename={previewDocName}
        title={previewDocTitle}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

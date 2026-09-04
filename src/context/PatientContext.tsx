import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Patient, Doctor, PatientStatus, TimelineItem } from '../types';
import {
  fetchPatients,
  fetchDoctors,
  createPatient as createPatientService,
  updatePatient as updatePatientService,
  deletePatient as deletePatientService,
  addTimelineItem as addTimelineItemService,
  toggleConfirmTimelineItem as toggleConfirmTimelineItemService,
  deleteTimelineItem as deleteTimelineItemService,
  fetchTimeline as fetchTimelineService,
} from '../services/patientService';
import { INITIAL_DOCTORS } from '../services/seedData';
import { useAuth } from './AuthContext';

interface PatientContextType {
  patients: Patient[];
  doctors: Doctor[];
  loading: boolean;
  refreshPatients: () => Promise<void>;
  createPatient: (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'archived' | 'unreadCount'>) => Promise<Patient>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  updatePatientDoctor: (patientId: string, doctorId: string, doctorName: string) => Promise<void>;
  updatePatientStatus: (patientId: string, status: PatientStatus) => Promise<void>;
  archivePatient: (patientId: string) => Promise<void>;
  deletePatient: (patientId: string) => Promise<void>;
  getTimeline: (patientId: string) => Promise<TimelineItem[]>;
  addTimelineItem: (
    patientId: string,
    item: Omit<TimelineItem, 'id' | 'patientId' | 'createdAt' | 'updatedAt' | 'confirmedBy'>,
    currentStatus: PatientStatus
  ) => Promise<TimelineItem>;
  toggleConfirm: (patientId: string, timelineId: string) => Promise<TimelineItem[]>;
  deleteTimelineItem: (patientId: string, timelineId: string) => Promise<TimelineItem[]>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, pts] = await Promise.all([
        fetchDoctors(),
        fetchPatients(user?.role, user?.doctorId),
      ]);
      setDoctors(docs);
      setPatients(pts);
    } catch (e) {
      console.error('Failed to load patient data:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const createPatient = async (
    data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'archived' | 'unreadCount'>
  ) => {
    const newPt = await createPatientService(data);
    await loadData();
    return newPt;
  };

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    await updatePatientService(id, updates);
    await loadData();
  };

  const updatePatientDoctor = async (patientId: string, doctorId: string, doctorName: string) => {
    await updatePatientService(patientId, {
      assignedDoctorId: doctorId,
      assignedDoctorName: doctorName,
    });
    await loadData();
  };

  const updatePatientStatus = async (patientId: string, status: PatientStatus) => {
    await updatePatientService(patientId, { status });
    await loadData();
  };

  const archivePatient = async (patientId: string) => {
    await updatePatientService(patientId, { archived: true, status: 'archived' });
    await loadData();
  };

  const deletePatient = async (patientId: string) => {
    await deletePatientService(patientId);
    await loadData();
  };

  const getTimeline = async (patientId: string) => {
    return await fetchTimelineService(patientId);
  };

  const addTimelineItem = async (
    patientId: string,
    item: Omit<TimelineItem, 'id' | 'patientId' | 'createdAt' | 'updatedAt' | 'confirmedBy'>,
    currentStatus: PatientStatus
  ) => {
    const newItem = await addTimelineItemService(patientId, item, currentStatus);
    await loadData();
    return newItem;
  };

  const toggleConfirm = async (patientId: string, timelineId: string) => {
    if (!user) return [];
    const updatedList = await toggleConfirmTimelineItemService(patientId, timelineId, user);
    await loadData();
    return updatedList;
  };

  const deleteTimelineItem = async (patientId: string, timelineId: string) => {
    const updatedList = await deleteTimelineItemService(patientId, timelineId);
    await loadData();
    return updatedList;
  };

  return (
    <PatientContext.Provider
      value={{
        patients,
        doctors,
        loading,
        refreshPatients: loadData,
        createPatient,
        updatePatient,
        updatePatientDoctor,
        updatePatientStatus,
        archivePatient,
        deletePatient,
        getTimeline,
        addTimelineItem,
        toggleConfirm,
        deleteTimelineItem,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = (): PatientContextType => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};

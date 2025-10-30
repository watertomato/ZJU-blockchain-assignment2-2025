import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BettingProject } from '../../types';

interface ProjectsState {
  projects: BettingProject[];
  loading: boolean;
  error: string | null;
  selectedProject: BettingProject | null;
}

const initialState: ProjectsState = {
  projects: [],
  loading: false,
  error: null,
  selectedProject: null,
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setProjects: (state, action: PayloadAction<BettingProject[]>) => {
      state.projects = action.payload;
      state.loading = false;
      state.error = null;
    },
    addProject: (state, action: PayloadAction<BettingProject>) => {
      state.projects.push(action.payload);
    },
    updateProject: (state, action: PayloadAction<BettingProject>) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
    },
    setSelectedProject: (state, action: PayloadAction<BettingProject | null>) => {
      state.selectedProject = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setLoading,
  setProjects,
  addProject,
  updateProject,
  setSelectedProject,
  setError,
} = projectsSlice.actions;

export default projectsSlice.reducer;
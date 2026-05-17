import { create } from 'zustand';

export type AnnotationType = 'rectangle' | 'polygon' | 'circle' | 'freehand' | 'line';

export interface Annotation {
  id: string;
  type: AnnotationType;
  points: number[]; // Flat array: [x1, y1, x2, y2, ...]
  label: string;
  color: string;
  opacity: number;
  strokeWidth: number;
  filled: boolean;
  createdAt: number;
  metadata: Record<string, string>;
}

export interface DrawingState {
  isDrawing: boolean;
  currentType: AnnotationType | null;
  currentPoints: number[];
  currentColor: string;
  currentStrokeWidth: number;
  currentOpacity: number;
  currentFilled: boolean;
}

interface AnnotationStore {
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  drawingState: DrawingState;
  labels: string[];

  // Annotation management
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  selectAnnotation: (id: string | null) => void;
  clearAnnotations: () => void;
  setAnnotations: (annotations: Annotation[]) => void;

  // Drawing state
  startDrawing: (type: AnnotationType, x: number, y: number) => void;
  continueDrawing: (x: number, y: number) => void;
  finishDrawing: (label: string) => Annotation | null;
  cancelDrawing: () => void;
  setDrawingColor: (color: string) => void;
  setDrawingStrokeWidth: (width: number) => void;
  setDrawingOpacity: (opacity: number) => void;
  setDrawingFilled: (filled: boolean) => void;

  // Label management
  addLabel: (label: string) => void;
  removeLabel: (label: string) => void;
  setLabels: (labels: string[]) => void;
}

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  annotations: [],
  selectedAnnotationId: null,
  drawingState: {
    isDrawing: false,
    currentType: null,
    currentPoints: [],
    currentColor: '#FF0000',
    currentStrokeWidth: 2,
    currentOpacity: 1,
    currentFilled: false,
  },
  labels: ['Object', 'Person', 'Vehicle', 'Animal', 'Building'],

  // Annotation management
  addAnnotation: (annotation) => {
    set((state) => ({
      annotations: [...state.annotations, annotation],
    }));
  },

  removeAnnotation: (id) => {
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    }));
  },

  updateAnnotation: (id, updates) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  },

  selectAnnotation: (id) => {
    set({ selectedAnnotationId: id });
  },

  clearAnnotations: () => {
    set({
      annotations: [],
      selectedAnnotationId: null,
    });
  },

  setAnnotations: (annotations) => {
    set({ annotations });
  },

  // Drawing state
  startDrawing: (type, x, y) => {
    set((state) => ({
      drawingState: {
        ...state.drawingState,
        isDrawing: true,
        currentType: type,
        currentPoints: [x, y],
      },
    }));
  },

  continueDrawing: (x, y) => {
    set((state) => {
      const { currentType, currentPoints } = state.drawingState;

      if (!currentType) return state;

      let newPoints = [...currentPoints];

      if (currentType === 'rectangle') {
        // For rectangle, keep start point and update end point
        newPoints = [currentPoints[0], currentPoints[1], x, y];
      } else if (currentType === 'circle') {
        // For circle, keep center and update radius point
        newPoints = [currentPoints[0], currentPoints[1], x, y];
      } else if (currentType === 'line') {
        // For line, keep start and update end
        newPoints = [currentPoints[0], currentPoints[1], x, y];
      } else if (currentType === 'freehand' || currentType === 'polygon') {
        // For freehand and polygon, add new points
        newPoints = [...currentPoints, x, y];
      }

      return {
        drawingState: {
          ...state.drawingState,
          currentPoints: newPoints,
        },
      };
    });
  },

  finishDrawing: (label) => {
    const state = get();
    const { currentType, currentPoints, currentColor, currentStrokeWidth, currentOpacity, currentFilled } = state.drawingState;

    if (!currentType || currentPoints.length < 2) {
      set((state) => ({
        drawingState: {
          ...state.drawingState,
          isDrawing: false,
          currentType: null,
          currentPoints: [],
        },
      }));
      return null;
    }

    const annotation: Annotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: currentType,
      points: currentPoints,
      label,
      color: currentColor,
      opacity: currentOpacity,
      strokeWidth: currentStrokeWidth,
      filled: currentFilled,
      createdAt: Date.now(),
      metadata: {},
    };

    set((state) => ({
      annotations: [...state.annotations, annotation],
      drawingState: {
        ...state.drawingState,
        isDrawing: false,
        currentType: null,
        currentPoints: [],
      },
    }));

    return annotation;
  },

  cancelDrawing: () => {
    set((state) => ({
      drawingState: {
        ...state.drawingState,
        isDrawing: false,
        currentType: null,
        currentPoints: [],
      },
    }));
  },

  setDrawingColor: (color) => {
    set((state) => ({
      drawingState: {
        ...state.drawingState,
        currentColor: color,
      },
    }));
  },

  setDrawingStrokeWidth: (width) => {
    set((state) => ({
      drawingState: {
        ...state.drawingState,
        currentStrokeWidth: width,
      },
    }));
  },

  setDrawingOpacity: (opacity) => {
    set((state) => ({
      drawingState: {
        ...state.drawingState,
        currentOpacity: opacity,
      },
    }));
  },

  setDrawingFilled: (filled) => {
    set((state) => ({
      drawingState: {
        ...state.drawingState,
        currentFilled: filled,
      },
    }));
  },

  // Label management
  addLabel: (label) => {
    set((state) => {
      if (state.labels.includes(label)) return state;
      return {
        labels: [...state.labels, label],
      };
    });
  },

  removeLabel: (label) => {
    set((state) => ({
      labels: state.labels.filter((l) => l !== label),
    }));
  },

  setLabels: (labels) => {
    set({ labels });
  },
}));

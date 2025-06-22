import { Class } from "./class.model";
import { Exercise } from "./exrecice.model";
import { Subject } from "./subject.model";
import { User } from "./user.model";

export interface StudentProgress {
  _id?: string;
  student: User | string;
  exercise: Exercise | string;
  subject: Subject | string;
  class: Class | string;
  qcmAnswers?: QCMAnswer[];
  fillBlankAnswers?: FillBlankAnswer[];
  totalPointsEarned: number;
  maxPossiblePoints: number;
  accuracyPercentage: number;
  startedAt: Date;
  completedAt: Date;
  timeSpent: number;
  attemptNumber: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QCMAnswer {
  questionIndex: number;
  selectedOption: string;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface FillBlankAnswer {
  questionIndex: number;
  blankAnswers: {
    blankIndex: number;
    studentAnswer: string;
    isCorrect: boolean;
  }[];
  pointsEarned: number;
}

export interface ProgressStatistics {
  totalExercises: number;
  averageAccuracy: number;
  totalTimeSpent: number;
  exercisesByType: {
    qcm: number;
    fill_blanks: number;
  };
  exercisesByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  subjectPerformance: { [key: string]: SubjectPerformance };
}

export interface SubjectPerformance {
  totalExercises: number;
  totalAccuracy: number;
  averageAccuracy: number;
}